// نقطة دخول موحّدة لعميل Supabase وأنواعه (barrel).
//
// المنطق الفعلي في `supabaseClient.ts` (المستورَد عبر التطبيق تاريخيًا)؛ هذا الملف
// يعيد تصديره بالاسم القياسي `@/lib/supabase` لسهولة الاكتشاف. استخدم أيًّا منهما.

export {
  getSupabase,
  isSupabaseConfigured,
  supabaseConfigState,
  type SupabaseConfigState,
  type TypedSupabaseClient,
  type Database,
  type ProfileRow,
} from './supabaseClient'
