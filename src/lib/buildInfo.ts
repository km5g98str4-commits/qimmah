// معرّف البناء — يُحقن وقت البناء عبر vite define (انظر vite.config.ts).
// يساعد على التحقق من أن Cloudflare Pages نشر النسخة الصحيحة (في الـ console والفوتر).

import { APP_ENV } from '@/lib/appEnv'

declare const __APP_VERSION__: string
declare const __BUILD_COMMIT__: string

export const BUILD_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

export const BUILD_COMMIT: string =
  typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev'

/**
 * تسمية مختصرة مثل: `v1.0.0·a1b2c3d` — وفي بناء المعاينة تُذيَّل بالبيئة:
 * `v1.0.0·a1b2c3d·founder_preview`.
 *
 * [FOUNDER-QA-PREVIEW-SAFETY] الإنتاج **لم يتغيّر**: بلا `VITE_APP_ENV` تبقى
 * التسمية كما كانت حرفًا بحرف. والذيل يجيب سؤال المراجع الأول — «هل ما أمامي
 * إنتاج؟» — من الشاشة نفسها بلا أدوات مطوّر.
 */
export const BUILD_LABEL =
  APP_ENV === 'founder_preview'
    ? `v${BUILD_VERSION}·${BUILD_COMMIT}·founder_preview`
    : `v${BUILD_VERSION}·${BUILD_COMMIT}`

/** Sentry release name follows docs/release/VERSIONING.md: marketing version + build. */
export const BUILD_RELEASE = `${BUILD_VERSION}+${BUILD_COMMIT}`
