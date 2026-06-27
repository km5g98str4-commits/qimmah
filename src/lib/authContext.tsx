// طبقة المصادقة — Supabase email/password مع بقاء Guest Mode ممكنًا دائمًا.
//
// إن لم يُضبط Supabase تبقى الحالة «ضيف» (user = null, configured = false)
// ولا تنهار الواجهة. كل الدوال آمنة عند غياب العميل.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export interface AuthResult {
  ok: boolean
  /** رسالة خطأ جاهزة للعرض بالعربية، إن وُجدت. */
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
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function arabicAuthError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase()
  if (m.includes('invalid login')) return 'البريد أو كلمة المرور غير صحيحة.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'هذا البريد مسجّل مسبقًا. سجّل الدخول بدلًا من ذلك.'
  if (m.includes('password') && m.includes('6')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
  if (m.includes('email') && m.includes('valid')) return 'البريد الإلكتروني غير صالح.'
  if (m.includes('network') || m.includes('failed to fetch')) return 'تعذّر الاتصال بالخادم. تحقّق من الإنترنت.'
  return message || 'حدث خطأ غير متوقع. حاول مجددًا.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const supabase = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(configured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
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
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      session,
      loading,
      async signUp(email, password) {
        if (!supabase) return { ok: false, error: 'المزامنة السحابية غير مفعّلة في هذه النسخة.' }
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) return { ok: false, error: arabicAuthError(error.message) }
        // إن لم تُرجع جلسة فالأرجح أنّ تأكيد البريد مطلوب.
        return { ok: true, needsConfirmation: !data.session }
      },
      async signIn(email, password) {
        if (!supabase) return { ok: false, error: 'المزامنة السحابية غير مفعّلة في هذه النسخة.' }
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) return { ok: false, error: arabicAuthError(error.message) }
        return { ok: true }
      },
      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
      },
    }),
    [configured, user, session, loading, supabase],
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
    async signUp() {
      return { ok: false, error: 'المزامنة السحابية غير مفعّلة في هذه النسخة.' }
    },
    async signIn() {
      return { ok: false, error: 'المزامنة السحابية غير مفعّلة في هذه النسخة.' }
    },
    async signOut() {},
  }
}
