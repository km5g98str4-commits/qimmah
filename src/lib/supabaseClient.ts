// عميل Supabase اختياري — يعمل التطبيق بدونه (Guest Mode).
//
// إن وُجد متغيّرا البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY نُنشئ العميل،
// وإلا نُعيد null دون أن ينهار التطبيق. أي استدعاء سحابي يجب أن يتحقّق أولًا
// عبر isSupabaseConfigured() أو getSupabase().

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** هل تمّ ضبط مزامنة Supabase في هذه النسخة؟ */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

let client: SupabaseClient | null = null

if (isSupabaseConfigured()) {
  try {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'qimmah:supabase-auth:v1',
      },
    })
  } catch {
    // لا نُسقط التطبيق إن فشل الإنشاء — نبقى في الوضع المحلي.
    client = null
  }
}

/** يعيد عميل Supabase أو null إن لم يُضبط. لا يرمي استثناء أبدًا. */
export function getSupabase(): SupabaseClient | null {
  return client
}

/** وصف حالة الضبط لعرضها في الواجهة. */
export type SupabaseConfigState = 'configured' | 'missing'

export function supabaseConfigState(): SupabaseConfigState {
  return isSupabaseConfigured() ? 'configured' : 'missing'
}
