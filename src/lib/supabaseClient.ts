// عميل Supabase — يوفّر مصادقة سحابية (تسجيل دخول/حساب) مع بقاء Guest Mode ممكنًا دائمًا.
//
// المفاتيح أدناه عامّة بالكامل وآمنة للحقن في حزمة المتصفّح:
//   • عنوان المشروع (URL) عام.
//   • مفتاح anon مخصّص للعموم ومحميّ بسياسات RLS على الخادم — ليس سرًّا.
// يمكن تجاوزها عبر متغيّري البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
// (مثلًا للتوجيه لمشروع مختلف)، وإلا تُستخدم القيم العامة المدمجة أدناه.
//
// إن لم تتوفّر قيم صالحة إطلاقًا يبقى التطبيق يعمل محليًا (Guest Mode) دون أن ينهار؛
// أي استدعاء سحابي يجب أن يتحقّق أولًا عبر isSupabaseConfigured() أو getSupabase().

// ملاحظة أداء (P12): مكتبة supabase-js تُحمَّل كسولًا (dynamic import) كي لا تدخل
// حزمة الإقلاع (~55KB gzip) — الرسم الأول لا يحتاجها، وgetSupabase() صارت async.
import type { SupabaseClient } from '@supabase/supabase-js'

// — القيم العامة المدمجة (fallback). عامّة وآمنة، محميّة بـ RLS. —
const DEFAULT_SUPABASE_URL = 'https://ledlypcyrtnzvjvhykwz.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZGx5cGN5cnRuenZqdmh5a3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjQ5MTAsImV4cCI6MjA5ODUwMDkxMH0.-wTD9w2vyDLaTjNJI_h_Bhjs2tqZ0bnNJHOUemCiKxo'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_ANON_KEY

/** هل تمّ ضبط مزامنة Supabase في هذه النسخة؟ */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

// ============================================================================
// أنواع الجداول المساعِدة — profiles جاهز الآن؛ بقية الجداول تُضاف في جلسة
// المزامنة اللاحقة (seam). تُصدَّر كأنواع توثيقية للاستخدام اليدوي؛ لا نمرّرها
// إلى createClient<Database> بعد لأنّ طبقة المزامنة (syncService) ما زالت تستخدم
// أسماء جداول لم تُنمذَج بعد — التنميط الكامل يتم مع بناء المزامنة.
// ============================================================================
export interface ProfileRow {
  id: string
  user_id: string
  display_name: string | null
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          user_id: string
          display_name?: string | null
          data?: Record<string, unknown>
        }
        Update: Partial<ProfileRow>
      }
      // TODO(sync): weight_logs / food_logs / workout_logs / custom_foods
      // تُضاف أنواعها هنا عند بناء المزامنة السحابية (localStorage → cloud).
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type TypedSupabaseClient = SupabaseClient

let clientPromise: Promise<TypedSupabaseClient | null> | null = null

/**
 * يعيد عميل Supabase أو null إن لم يُضبط. لا يرمي استثناء أبدًا.
 * async: المكتبة تُحمَّل عند أول استدعاء فقط (خارج مسار الإقلاع الحرج).
 */
export function getSupabase(): Promise<TypedSupabaseClient | null> {
  if (!isSupabaseConfigured()) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // تبقى الجلسة محفوظة في localStorage — «سجّل مرّة، يتعرّف عليك الجهاز» عبر التحديثات.
            storageKey: 'qimmah:supabase-auth:v1',
          },
        }),
      )
      .catch(() => {
        // لا نُسقط التطبيق إن فشل التحميل/الإنشاء — نبقى في الوضع المحلي.
        return null
      })
  }
  return clientPromise
}

/** وصف حالة الضبط لعرضها في الواجهة. */
export type SupabaseConfigState = 'configured' | 'missing'

export function supabaseConfigState(): SupabaseConfigState {
  return isSupabaseConfigured() ? 'configured' : 'missing'
}
