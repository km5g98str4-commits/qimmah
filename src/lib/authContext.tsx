// طبقة المصادقة — Supabase email/password. الحساب مطلوب للدخول (لا وضع ضيف داخل التطبيق).
//
// إن لم يُضبط Supabase تبقى الحالة user = null, configured = false ولا تنهار الواجهة،
// وتَعرض شاشة الحساب أنّ المزامنة غير مفعّلة. كل الدوال آمنة عند غياب العميل.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getLanguage } from './appPreferences'
import { miscStrings } from '@/i18n/dict/misc'

export interface AuthResult {
  ok: boolean
  /** رسالة خطأ جاهزة للعرض باللغة الحالية (عربي/إنجليزي)، إن وُجدت. */
  error?: string
  /** هل يحتاج المستخدم لتأكيد بريده (sign up)؟ */
  needsConfirmation?: boolean
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
  /** يعيد جلب المستخدم من الخادم لالتقاط تأكيد البريد بعد الضغط على الرابط. */
  refreshUser: () => Promise<void>
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
      async refreshUser() {
        const supabase = await getSupabase()
        if (!supabase) return
        const { data } = await supabase.auth.getUser()
        if (data.user) setUser(data.user)
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
    async refreshUser() {},
  }
}
