// طبقة المصادقة — Supabase email/password. الحساب مطلوب للدخول (لا وضع ضيف داخل التطبيق).
//
// إن لم يُضبط Supabase تبقى الحالة user = null, configured = false ولا تنهار الواجهة،
// وتَعرض شاشة الحساب أنّ المزامنة غير مفعّلة. كل الدوال آمنة عند غياب العميل.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getLanguage } from './appPreferences'
import { wipeUserData, setLastUser } from './accountScope'
import { miscStrings } from '@/i18n/dict/misc'

export interface AuthResult {
  ok: boolean
  /** رسالة خطأ جاهزة للعرض باللغة الحالية (عربي/إنجليزي)، إن وُجدت. */
  error?: string
  /** هل يحتاج المستخدم لتأكيد بريده (sign up)؟ */
  needsConfirmation?: boolean
}

export interface DeleteAccountResult {
  /**
   * هل اكتمل الحذف فعليًا؟ للحساب السحابي = تأكيد حذف مستخدم المصادقة (authUserDeleted).
   * للوضع المحلي/الضيف (لا سحابة) = صحيح (لا شيء على الخادم). المستدعي يُكمل التنظيف المحلي
   * ويعيد التحميل فقط عند ok=true — وإلا يعرض حالة فشل صادقة بلا ادّعاء نجاح.
   */
  ok: boolean
  /**
   * هل حُذف صفّ مستخدم المصادقة (auth.users) فعليًا من الخادم؟
   * يتطلّب دالة Postgres آمنة (security definer) اسمها delete_own_account — بلا service role في العميل.
   * false إن لم تُنشَر تلك الدالة بعد؛ عندها تبقى الجلسة قائمة لإعادة المحاولة (لا نُنهيها كذبًا).
   */
  authUserDeleted: boolean
  /** رسالة الخطأ الخادمي إن تعذّر حذف مستخدم المصادقة. */
  error?: string
}

export interface AuthContextValue {
  /** هل المزامنة السحابية مضبوطة في هذه النسخة؟ */
  configured: boolean
  /** المستخدم الحالي أو null في وضع الضيف. */
  user: User | null
  /** جلسة المصادقة الحالية. */
  session: Session | null
  /** ما زالت حالة المصادقة قيد التحميل (أول إقلاع). */
  loading: boolean
  /** الاسم المعروض للمستخدم (من user_metadata) أو البريد كبديل، أو null كضيف. */
  displayName: string | null
  /**
   * هل بريد الحساب مؤكَّد؟ (دفاع عميق ضد الوصول الكامل بحساب غير مؤكَّد.)
   * true للضيف/غير المسجّل بالبريد. false فقط لحساب ببريد لم يُؤكَّد بعد (email_confirmed_at غائب).
   */
  emailVerified: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** يعيد إرسال رسالة تأكيد البريد. */
  resendConfirmation: (email: string) => Promise<AuthResult>
  /** يرسل رابط استعادة كلمة المرور للبريد (Sprint UI 1 — إضافة فقط، لا تغيّر تدفّقات المصادقة القائمة). */
  resetPassword: (email: string) => Promise<AuthResult>
  /**
   * يضبط كلمة مرور جديدة للجلسة الحالية (Sprint A — استكمال الاستعادة بعد فتح رابط البريد).
   * يعمل على جلسة الاستعادة التي أنشأها Supabase من رابط البريد، أو أي جلسة مسجّلة.
   */
  updatePassword: (password: string) => Promise<AuthResult>
  /**
   * يستكمل جلسة الاستعادة من رابط البريد (H1 fallback). إن لم يلتقط detectSessionInUrl الرمز
   * تلقائيًا — مثلًا حين يقع code داخل hash التوجيه (#/reset?code=…) — نستخرجه يدويًا ونبادله
   * بجلسة عبر exchangeCodeForSession. يعيد true إن توفّرت جلسة صالحة بعدها. آمن عند غياب رمز.
   */
  completeRecovery: () => Promise<boolean>
  /** يعيد جلب المستخدم من الخادم لالتقاط تأكيد البريد بعد الضغط على الرابط. */
  refreshUser: () => Promise<void>
  /**
   * يحذف حساب المستخدم وبياناته السحابية (best-effort) ويُنهي الجلسة.
   * لا يمسّ التخزين المحلي — المستدعي يتكفّل به (resetQimmah) ليضمن مسحًا كاملًا حتى عند غياب السحابة.
   */
  deleteAccount: () => Promise<DeleteAccountResult>
}

/**
 * لقطة عنوان الصفحة وقت تحميل الوحدة (قبل أول رسم React). هذا حاسم لتدفّق الاستعادة:
 * توجيه التطبيق يعيد كتابة الـ hash إلى «#/reset» بعد الإقلاع (يطمس الـ fragment الثاني
 * «#access_token=…»)، فلو قرأنا الرموز من window.location لحظة الاستكمال لوجدناها مطموسة.
 * الوحدة تُقيَّم عند الاستيراد الساكن (main.tsx) قبل أي effect، فالعنوان هنا سليم. لا نطبع أبدًا.
 */
const INITIAL_URL: string = typeof window !== 'undefined' ? `${window.location.hash}&${window.location.search}` : ''

/**
 * فكّ ترميز URI آمن: ترميز percent مشوّه (مثل «%zz» في رابط مُصطنع) يجعل decodeURIComponent
 * يرمي URIError — فيعلق ResetPasswordView على «جارٍ التحقّق». نعيد null بدل الرمي؛
 * المستدعي يعامل null كغياب المؤشّر فتظهر حالة «الرابط منتهٍ» الهادئة.
 */
function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/**
 * يستخرج رمز استعادة PKCE من عنوان الصفحة أينما وقع (H1): من query (?code=)، أو من داخل
 * hash التوجيه (#/reset?code=…) حين لا يجده detectSessionInUrl. يعيد null إن لم يوجد رمز.
 * يقرأ من لقطة الإقلاع لا من العنوان الحالي (الذي قد يكون طُمس بعد التوجيه).
 */
function extractRecoveryCode(): string | null {
  if (!INITIAL_URL) return null
  const m = INITIAL_URL.match(/[?&#]code=([^&#]+)/)
  return m ? safeDecode(m[1]) : null
}

/**
 * يستخرج رموز التدفّق الضمني (implicit) من العنوان أينما وقعت: access_token + refresh_token.
 * GoTrue الافتراضي يعيدها في fragment ثانٍ (#/reset#access_token=…&refresh_token=…) الذي لا
 * يلتقطه detectSessionInUrl مع توجيه hash. يعيد null إن نقص أحدهما. لا يطبع أي رمز إطلاقًا.
 * يقرأ من لقطة الإقلاع لا من العنوان الحالي (الذي قد يكون طُمس بعد التوجيه).
 */
function extractImplicitTokens(): { access_token: string; refresh_token: string } | null {
  if (!INITIAL_URL) return null
  const at = INITIAL_URL.match(/[#?&]access_token=([^&#]+)/)
  const rt = INITIAL_URL.match(/[#?&]refresh_token=([^&#]+)/)
  if (!at || !rt) return null
  const access_token = safeDecode(at[1])
  const refresh_token = safeDecode(rt[1])
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token }
}

/** هل بريد هذا المستخدم مؤكَّد؟ ضيف/بلا بريد = مؤكَّد ضمنيًا (لا يُحبَس). */
function isEmailVerified(user: User | null): boolean {
  if (!user || !user.email) return true
  return Boolean(user.email_confirmed_at || user.confirmed_at)
}

/** يستخرج الاسم المعروض من بيانات المستخدم (metadata) مع البريد كبديل. */
function userDisplayName(user: User | null): string | null {
  if (!user) return null
  const meta = user.user_metadata as { display_name?: unknown } | undefined
  const name = typeof meta?.display_name === 'string' ? meta.display_name.trim() : ''
  return name || user.email || null
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** رسالة الخطأ المحلية غير المفعّلة (المزامنة السحابية) — حسب اللغة الحالية. */
function cloudDisabledError(): string {
  return miscStrings[getLanguage()].authCloudDisabled
}

/**
 * يحوّل رسالة خطأ Supabase (بالإنجليزية) إلى رسالة واضحة باللغة الحالية للمستخدم.
 * منطق المطابقة ثابت؛ فقط النص المُرجَع صار ثنائي اللغة.
 */
function localizedAuthError(message: string | undefined): string {
  const t = miscStrings[getLanguage()]
  const m = (message ?? '').toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return t.authInvalidCredentials
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already'))
    return t.authAlreadyRegistered
  if (m.includes('email not confirmed')) return t.authEmailNotConfirmed
  if (m.includes('password') && (m.includes('6') || m.includes('short') || m.includes('weak') || m.includes('least')))
    return t.authWeakPassword
  if (m.includes('email') && m.includes('valid')) return t.authInvalidEmail
  if (m.includes('rate limit') || m.includes('too many')) return t.authRateLimit
  if (m.includes('network') || m.includes('failed to fetch') || m.includes('fetch')) return t.authNetwork
  return message || t.authGeneric
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(configured)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let active = true
    let unsubscribe: (() => void) | null = null
    // فشل آمن: مهما تعذّر وصول الشبكة (جلسة مُعلَّقة لا تُحسم)، لا نُبقي بوّابة الإقلاع
    // عالقة أبدًا — نرفع التحميل بعد مهلة قصيرة فيدخل المستخدم بدل شاشة تحميل دائمة.
    const failsafe = window.setTimeout(() => {
      if (active) setLoading(false)
    }, 8000)
    // getSupabase() كسول (P11.5): المكتبة تُحمَّل هنا بعد الرسم الأول، لا في حزمة الإقلاع.
    getSupabase().then((supabase) => {
      if (!active || !supabase) {
        if (active) setLoading(false)
        return
      }
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!active) return
          setSession(data.session)
          setUser(data.session?.user ?? null)
          setLoading(false)
        })
        .catch(() => {
          if (active) setLoading(false)
        })

      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!active) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })
    return () => {
      active = false
      window.clearTimeout(failsafe)
      unsubscribe?.()
    }
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      session,
      loading,
      displayName: userDisplayName(user),
      emailVerified: isEmailVerified(user),
      async signUp(email, password, displayName) {
        const supabase = await getSupabase()
        if (!supabase) return { ok: false, error: cloudDisabledError() }
        const name = displayName?.trim()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // الاسم يُخزَّن في user_metadata؛ trigger المنصّة يقرأ display_name لإنشاء صف profile.
          options: name ? { data: { display_name: name } } : undefined,
        })
        if (error) return { ok: false, error: localizedAuthError(error.message) }
        // إن لم تُرجع جلسة فالأرجح أنّ تأكيد البريد مطلوب.
        return { ok: true, needsConfirmation: !data.session }
      },
      async signIn(email, password) {
        const supabase = await getSupabase()
        if (!supabase) return { ok: false, error: cloudDisabledError() }
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) return { ok: false, error: localizedAuthError(error.message) }
        return { ok: true }
      },
      async signOut() {
        const supabase = await getSupabase()
        if (!supabase) return
        await supabase.auth.signOut()
        // عزل الحساب: امسح كل بيانات المستخدم على الجهاز عند الخروج (لا تبقى بقايا
        // يقرؤها المستخدم التالي)، وثبّت المالك على «ضيف» فلا يُعيد التوفيق المسح مجددًا.
        wipeUserData()
        setLastUser(null)
        // امسح رمز الجلسة صراحةً: wipeUserData يُبقيه (كي لا يُطرد مستخدم أثناء تبديل)،
        // لكن الخروج يجب أن يُنهي الجلسة حتى لو تعذّر نداء signOut الشبكي (فلا يُستعاد الحساب عند إعادة التحميل).
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('qimmah:supabase-auth:v1')
          } catch {
            /* تجاهل */
          }
        }
        setSession(null)
        setUser(null)
      },
      async resendConfirmation(email) {
        const supabase = await getSupabase()
        if (!supabase) return { ok: false, error: cloudDisabledError() }
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
        if (error) return { ok: false, error: localizedAuthError(error.message) }
        return { ok: true }
      },
      async resetPassword(email) {
        const supabase = await getSupabase()
        if (!supabase) return { ok: false, error: cloudDisabledError() }
        // رابط استعادة عبر البريد — دالة Supabase قياسية، لا تكشف وجود الحساب من عدمه.
        // redirectTo يعيد المستخدم لشاشة تعيين كلمة مرور جديدة داخل التطبيق (#/reset) على
        // نفس أصل النشر الحالي — لا رابط localhost مثبّت. تدفّق PKCE يضع الرمز في query
        // فيبقى hash المسار (#/reset) سليمًا. يجب أن يسمح Supabase بهذا الأصل في Redirect URLs.
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}#/reset`
            : undefined
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          redirectTo ? { redirectTo } : undefined,
        )
        if (error) return { ok: false, error: localizedAuthError(error.message) }
        return { ok: true }
      },
      async updatePassword(password) {
        const supabase = await getSupabase()
        if (!supabase) return { ok: false, error: cloudDisabledError() }
        // يعمل على جلسة الاستعادة (أو أي جلسة نشطة). لا يكشف وجود الحساب — يتطلّب جلسة صالحة.
        const { error } = await supabase.auth.updateUser({ password })
        if (error) return { ok: false, error: localizedAuthError(error.message) }
        return { ok: true }
      },
      async completeRecovery() {
        const supabase = await getSupabase()
        if (!supabase) return false
        // جلسة قائمة أصلًا (نجح detectSessionInUrl، أو مستخدم مسجّل) → لا حاجة للتبادل.
        const { data: cur } = await supabase.auth.getSession()
        if (cur.session) return true

        // مؤشّرات الاستعادة في الرابط: implicit (access_token+refresh_token) أو PKCE (code).
        const implicit = extractImplicitTokens()
        const code = extractRecoveryCode()
        // لا مؤشّر إطلاقًا → رابط منتهٍ/زيارة مباشرة؛ نعود فورًا (بلا انتظار) لعرض حالة «منتهٍ».
        if (!implicit && !code) return false

        // Codex M1: مؤشّر موجود — نمنح detectSessionInUrl فرصة (حتى ~3s) لإنشاء الجلسة تلقائيًا
        // قبل أي تبادل يدوي، تفاديًا للتسابق على رمز أحادي الاستخدام (فشل زائف = «منتهٍ»).
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 250))
          const { data } = await supabase.auth.getSession()
          if (data.session) return true
        }

        // (أ) التدفّق الضمني: الرموز في الـ fragment مباشرة — نضبط الجلسة بها. لا نطبع أي رمز.
        if (implicit) {
          try {
            const { data, error } = await supabase.auth.setSession(implicit)
            if (!error && data.session) {
              setSession(data.session)
              setUser(data.session.user)
              return true
            }
          } catch {
            /* نتابع لمحاولة PKCE */
          }
        }

        // (ب) تدفّق PKCE: نبادل الرمز بجلسة.
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error && data.session) {
              setSession(data.session)
              setUser(data.session.user)
              return true
            }
          } catch {
            /* تجاهل */
          }
        }

        // لا PKCE ولا implicit نجح → تُعرض حالة الرابط المنتهي الهادئة.
        return false
      },
      async refreshUser() {
        const supabase = await getSupabase()
        if (!supabase) return
        const { data } = await supabase.auth.getUser()
        if (data.user) setUser(data.user)
      },
      async deleteAccount() {
        const supabase = await getSupabase()
        const uid = user?.id
        // لا سحابة/لا مستخدم — لا شيء على الخادم؛ المستدعي يُكمل التنظيف المحلي.
        if (!supabase || !uid) return { ok: true, authUserDeleted: false }

        let authUserDeleted = false
        let error: string | undefined
        // 1) النمط الآمن لحذف الحساب ذاتيًا: دالة Postgres security-definer تحذف auth.uid()
        //    (delete_own_account) — لا تكشف مفتاح service role في العميل إطلاقًا.
        try {
          const { error: rpcErr } = await supabase.rpc('delete_own_account')
          if (!rpcErr) authUserDeleted = true
          else error = rpcErr.message
        } catch (e) {
          error = e instanceof Error ? e.message : String(e)
        }
        // فشل حذف مستخدم المصادقة (مثلًا لم تُنشَر دالة delete_own_account) → لا نحذف أي صفّ
        // بيانات ولا نُنهي الجلسة، فيبقى الحساب سليمًا تمامًا لإعادة المحاولة/التواصل، ولا ندّعي
        // نجاحًا كاذبًا. (يمنع حالة الحذف الجزئي: صفوف محذوفة ومستخدم مصادقة باقٍ.)
        if (!authUserDeleted) {
          return { ok: false, authUserDeleted: false, error }
        }
        // 2) بعد تأكيد حذف مستخدم المصادقة: best-effort تنظيف صفوف بيانات المستخدم من الجداول
        //    السحابية (حذف ذاتي عبر RLS) في حال لم تُضبط سلسلة الحذف المتتالي (cascade) على الخادم.
        //    كلها مفهرسة بعمود user_id (لا id). لا يُفشل العملية — الحذف الأساسي تمّ فعلًا.
        const USER_OWNED_TABLES = [
          'profiles',
          'workout_sessions',
          'exercise_history',
          'measurement_logs',
          'daily_logs',
        ] as const
        for (const table of USER_OWNED_TABLES) {
          try {
            await supabase.from(table).delete().eq('user_id', uid)
          } catch {
            /* تجاهل — قد لا تسمح السياسة أو الجدول غير موجود */
          }
        }
        // 3) إنهاء الجلسة وتنظيف الحالة في الذاكرة.
        try {
          await supabase.auth.signOut()
        } catch {
          /* تجاهل — سنُعيد التحميل على أي حال */
        }
        setSession(null)
        setUser(null)
        // ok يعكس اكتمال الحذف فعليًا: وصلنا هنا فقط بعد إزالة مستخدم المصادقة من الخادم.
        return { ok: true, authUserDeleted: true }
      },
    }),
    [configured, user, session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** هوك الوصول لحالة المصادقة. آمن: يعيد وضع ضيف إن لم يُلفّ بالمزوّد. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx) return ctx
  return {
    configured: false,
    user: null,
    session: null,
    loading: false,
    displayName: null,
    emailVerified: true,
    async signUp() {
      return { ok: false, error: cloudDisabledError() }
    },
    async signIn() {
      return { ok: false, error: cloudDisabledError() }
    },
    async signOut() {},
    async resendConfirmation() {
      return { ok: false, error: cloudDisabledError() }
    },
    async resetPassword() {
      return { ok: false, error: cloudDisabledError() }
    },
    async updatePassword() {
      return { ok: false, error: cloudDisabledError() }
    },
    async completeRecovery() {
      return false
    },
    async refreshUser() {},
    async deleteAccount() {
      return { ok: true, authUserDeleted: false }
    },
  }
}
