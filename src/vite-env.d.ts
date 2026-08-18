/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_CONTACT_URL?: string
  /** بيئة البناء: 'founder_preview' يقطع سلطة الكتابة على الإنتاج. الغياب = إنتاج. */
  readonly VITE_APP_ENV?: 'production' | 'founder_preview'
  readonly VITE_CHECKOUT_URL?: string
  // مزامنة سحابية اختيارية (Supabase) — قيم عامة آمنة للحقن في الحزمة.
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  // وجهة التحليلات الاختيارية — عند ضبطها يُفعَّل مزوّد HTTP، وإلا لا يُرسَل شيء.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
