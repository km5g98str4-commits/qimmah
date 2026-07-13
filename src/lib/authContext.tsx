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
import { parseRecoveryParams, implicitTokens } from './recoveryState'
import { fullSync, startSyncLifecycle } from './syncService'
import { isSyncEnabled, setSyncRuntime } from './syncQueue'

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
  /**
   * هل نحن في تدفّق استعادة كلمة المرور؟ مصدر الحقيقة للتوجيه: يصبح true عند حدث
   * PASSWORD_RECOVERY من Supabase، أو إن حمل عنوان الإقلاع مؤشّر استعادة. عند true
   * يجب أن يهبط المستخدم على شاشة «كلمة مرور جديدة» ولا يُقذف أبدًا لتسجيل الدخول/الأسئلة.
   */
  recoveryActive: boolean
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
  /** يُنهي وضع الاستعادة صراحةً (عند مغادرة الشاشة بعد النجاح أو من حالة الرابط المنتهي). */
  endRecovery: () => void
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

/** مؤشّرات الاستعادة المُلتقطة من عنوان الإقلاع مرّة واحدة (قبل أن يطمس التوجيه الـ fragment). */
const INITIAL_RECOVERY = parseRecoveryParams(INITIAL_URL)

/** رمز استعادة PKCE من لقطة الإقلاع (يقرأ من اللقطة لا من العنوان الحالي المطموس بعد التوجيه). */
function extractRecoveryCode(): string | null {
  return INITIAL_RECOVERY.code
}

/** زوج رموز التدفّق الضمني من لقطة الإقلاع (access_token + refresh_token) أو null إن نقص أحدهما. */
function extractImplicitTokens(): { access_token: string; refresh_token: string } | null {
  return implicitTokens(INITIAL_RECOVERY)
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
  // يبدأ من مؤشّر عنوان الإقلاع (يلتقط الحالة قبل أن يحسم Supabase الحدث)، ثم يُرفع أيضًا
  // عند حدث PASSWORD_RECOVERY. لا يُخفَض تلقائيًا — الشاشة نفسها تُنهيه بعد النجاح/العودة.
  const [recoveryActive, setRecoveryActive] = useState<boolean>(() => INITIAL_RECOVERY.hasRecovery)

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

      const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!active) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        // مصدر الحقيقة للاستعادة: حين يكتشف Supabase رابط الاستعادة (ويب أو Deep Link) يُطلق
        // PASSWORD_RECOVERY مع جلسة مؤقتة — نرفع العلم فيُثبَّت المستخدم على شاشة كلمة المرور
        // الجديدة فوق كل البوّابات، ولا يُقذف لتسجيل الدخول ولو لم يكن hash هو #/reset.
        if (event === 'PASSWORD_RECOVERY') {
          setSyncRuntime(newSession?.user.id ?? null, true)
          setRecoveryActive(true)
        }
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })
    return () => {
      active = false
      window.clearTimeout(failsafe)
      unsubscribe?.()
    }
  }, [configured])

  useEffect(() => {
    const userId = user?.id ?? null
    setSyncRuntime(userId, recoveryActive)
    if (!isSyncEnabled() || !userId || recoveryActive || loading) return
    // Login/session restoration hydrates once; lifecycle covers connectivity and foreground retries.
    void fullSync()
    return startSyncLifecycle()
  }, [user?.id, recoveryActive, loading])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      session,
      loading,
      recoveryActive,
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
        try {
          await supabase.auth.signOut()
        } catch {
          /* Local owner isolation must complete even when the network is unavailable. */
        }
        // عزل الحساب: امسح كل بيانات المستخدم على الجهاز عند الخروج (لا تبقى بقايا
        // يقرؤها المستخدم التالي)، وثبّت المالك على «ضيف» فلا يُعيد التوفيق المسح مجددًا.
        wipeUserData(user?.id)
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
        // انتهى أي تدفّق استعادة بمجرّد الخروج (نجاح إعادة التعيين يُنهي الجلسة أيضًا).
        setRecoveryActive(false)
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
        // redirectTo يعيد المستخدم لشاشة تعيين كلمة مرور جديدة داخل التطبيق (#/reset).
        //
        // الويب: أصل النشر الحالي + #/reset (لا localhost مثبّت). تدفّق PKCE يضع الرمز في
        // query فيبقى hash المسار سليمًا. يجب أن يسمح Supabase بهذا الأصل في Redirect URLs.
        //
        // iOS الأصلي: window.location.origin هو capacitor://localhost — غير صالح كوجهة بريد.
        // يُضبط VITE_RESET_REDIRECT_URL لرابط عميق مُهيّأ (نطاق Universal Link مثل
        // https://qimmah.app/#/reset، أو مخطّط مخصّص com.qimmah.mobile://reset) ويُضاف لقائمة
        // Redirect URLs في Supabase. مستمع appUrlOpen (deepLinkRecovery) يلتقطه على الجهاز.
        const configuredRedirect = import.meta.env.VITE_RESET_REDIRECT_URL?.trim()
        const redirectTo =
          configuredRedirect ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}#/reset`
            : undefined)
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
      endRecovery() {
        setRecoveryActive(false)
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
    [configured, user, session, loading, recoveryActive],
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
    recoveryActive: false,
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
    endRecovery() {},
    async refreshUser() {},
    async deleteAccount() {
      return { ok: true, authUserDeleted: false }
    },
  }
}
