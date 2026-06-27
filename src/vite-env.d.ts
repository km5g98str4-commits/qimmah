/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_CONTACT_URL?: string
  readonly VITE_CHECKOUT_URL?: string
  // مزامنة سحابية اختيارية (Supabase) — قيم عامة آمنة للحقن في الحزمة.
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
