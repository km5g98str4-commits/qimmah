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

// ملاحظة أداء (P11.5): مكتبة supabase-js تُحمَّل كسولًا (dynamic import) كي لا تدخل
// حزمة الإقلاع (~55KB gzip) — الرسم الأول لا يحتاجها، وgetSupabase() صارت async.
import type { SupabaseClient } from '@supabase/supabase-js'

// — القيم العامة المدمجة (fallback). عامّة وآمنة، محميّة بـ RLS. —
const DEFAULT_SUPABASE_URL = 'https://ledlypcyrtnzvjvhykwz.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZGx5cGN5cnRuenZqdmh5a3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjQ5MTAsImV4cCI6MjA5ODUwMDkxMH0.-wTD9w2vyDLaTjNJI_h_Bhjs2tqZ0bnNJHOUemCiKxo'

/**
 * ⚠️ **الشكل هنا مقصود ومقيس: `(x || '')` لا `x?.trim()`.**
 *
 * Vite يستبدل `import.meta.env.VITE_SUPABASE_URL` بنصّ حرفي وقت البناء. ومع
 * `?.` يبقى للمُصغِّر استدعاءُ توابعَ على قيمةٍ اختيارية فلا يطوي الشرط
 * أدناه، فتبقى ثوابت الإنتاج **محمولة في أرتيفكت يشير إلى مشروع آخر**.
 *
 * مقيسٌ لا مُستنتَج: بناءٌ بعنوان تجريبي صريح كان يحمل عنوان الإنتاج في ملف
 * واحد من الحزمة. وبهذا الشكل ينطوي الشرط إلى ثابت ويُهزّ الاحتياط خارج
 * الحزمة — نفس الآلية التي يقوم عليها أمان معاينة المؤسس، مطبَّقةً على
 * المخرج الصريح كذلك. ويحرسه `test:branch-preview-safety`.
 */
const explicitUrl = import.meta.env.VITE_SUPABASE_URL || ''
const explicitAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
/**
 * الاحتياط المخبوز يسري في الإنتاج وحده — [FOUNDER-QA-PREVIEW-SAFETY].
 *
 * كان `|| DEFAULT_…` غير مشروط، فصار **غياب الضبط يعني «استعمل الإنتاج»**.
 * وكل كاتب خطير يسأل `isSupabaseConfigured()` وحدها، فبناء المعاينة كان يملك
 * سلطة كتابة كاملة على قاعدة الإنتاج: تجربة حقيقية · استهلاك كود حقيقي ·
 * إنشاء مستخدم · إرسال بريد.
 *
 * الآن: في `founder_preview` بلا ضبط صريح ⇒ لا عنوان ولا مفتاح ⇒
 * `isSupabaseConfigured()` كاذبة ⇒ كل كاتب يفشل **مغلقًا** بحالته الصادقة
 * القائمة (`offline` · `none` · وضع الضيف). **سلوك الإنتاج لم يتغيّر حرفًا**:
 * بلا `VITE_APP_ENV=founder_preview` يبقى الاحتياط كما كان.
 */
/**
 * ⚠️ `import.meta.env.VITE_APP_ENV` يُقرأ **هنا مباشرةً** لا عبر `APP_ENV`
 * المستورد — والفرق أمني لا أسلوبي.
 *
 * Vite يستبدل `import.meta.env.VITE_APP_ENV` بنصّ حرفي وقت البناء، فيصير
 * الشرط ثابتًا يطويه المُصغِّر، ويُحذف `DEFAULT_SUPABASE_*` من حزمة المعاينة
 * **بالكامل** (هزّ الأشجار). أما استدعاء دالّة من وحدة أخرى فلا يُطوى، فتبقى
 * بيانات الاعتماد داخل الحزمة ولا يمنع استعمالها إلا قيمة منطقية وقت التشغيل.
 *
 * الفرق: «الاعتماد غير موجود في الأرتيفكت» أقوى من «موجود ولا يُستعمل». وقيس
 * عليه: `grep` على `dist/assets/*.js` في بناء المعاينة يجب ألّا يجد العنوان.
 */
const IS_FOUNDER_PREVIEW = import.meta.env.VITE_APP_ENV === 'founder_preview'
// ⚠️ **التشذيب بعد الاختيار لا قبله** — والفرق مقيس في الأرتيفكت لا مُستنتَج.
// كان `VITE_SUPABASE_URL?.trim()` يسبق الاختيار، والمُصغِّر **لا يطوي
// `.trim()` على نصّ حرفي** (لأنّ تابع النموذج قد يُستبدَل نظريًّا). فيبقى
// المخرج الصريح قيمةً غير معروفة وقت البناء، فلا ينطوي `||`، فتبقى ثوابت
// الإنتاج محمولةً في أرتيفكتٍ يشير إلى مشروع آخر.
// مقيسٌ: بناءٌ بعنوان تجريبي كان يحمل `ledlypcyrtnzvjvhykwz` في ملف من الحزمة.
// وبهذا الترتيب ينطوي `||` إلى النصّ التجريبي، ويُهزّ الاحتياط خارج الحزمة.
const url = (explicitUrl || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_URL)).trim()
const anonKey = (explicitAnonKey || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_ANON_KEY)).trim()
// المخرج الصريح محفوظ: تمرير `VITE_SUPABASE_URL`+`ANON_KEY` وقت البناء يتقدّم
// على كل ما سبق، فمن أراد توجيه المعاينة لمشروع تجريبي فعل ذلك **بإعلان**.

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
