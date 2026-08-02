import type { Lang } from '@/lib/appPreferences'

/**
 * Stable, language-independent identifiers for every portability failure.
 *
 * Before this, each `throw new PortabilityError('…')` carried a hardcoded Arabic
 * sentence, so an English user saw Arabic on a failed import and nothing could be
 * matched on programmatically. The code is now the contract; the sentence is a
 * rendering of it.
 */
export type PortabilityErrorCode =
  // guard
  | 'RECOVERY_OR_NO_ACCOUNT'
  | 'ACCOUNT_CHANGED'
  // intake
  | 'FILE_TOO_LARGE'
  | 'NOT_JSON'
  | 'TOO_DEEP'
  | 'UNKNOWN_FORMAT'
  | 'NOT_A_QIMMAH_BACKUP'
  | 'UNSUPPORTED_VERSION'
  | 'INVALID_STORES'
  | 'UNSAFE_KEYS'
  | 'UNSAFE_STORE_ID'
  | 'UNKNOWN_STORE_IN_BACKUP'
  | 'UNKNOWN_STORE'
  | 'NEWER_VERSION'
  | 'INVALID_SHAPE'
  // apply
  | 'VERIFY_FAILED'
  | 'READBACK_FAILED'
  | 'IMPORT_FAILED'
  | 'UNDO_WRONG_OWNER'

/**
 * `{0}` is the single interpolation slot (a store id, or a store label).
 * Kept identical in both languages so one params array renders either.
 */
const MESSAGES: Record<PortabilityErrorCode, Record<Lang, string>> = {
  RECOVERY_OR_NO_ACCOUNT: {
    ar: 'لا يمكن نقل البيانات أثناء استعادة كلمة المرور أو بدون حساب.',
    en: 'You need to be signed in, and not in the middle of a password reset, to export or import your data.',
  },
  ACCOUNT_CHANGED: {
    ar: 'تغيّر الحساب. أعد فتح معاينة النسخة من الحساب الحالي.',
    en: 'The account changed. Reopen the backup preview from the current account.',
  },
  FILE_TOO_LARGE: {
    ar: 'الملفّ أكبر من الحدّ المسموح (٢٥ ميغابايت)',
    en: 'This file is larger than the 25 MB limit.',
  },
  NOT_JSON: {
    ar: 'الملفّ ليس JSON صالحًا',
    en: 'This file is not valid JSON.',
  },
  TOO_DEEP: {
    ar: 'بنية الملفّ معقّدة أكثر من الحدّ الآمن.',
    en: 'This file is nested more deeply than is safe to read.',
  },
  UNKNOWN_FORMAT: {
    ar: 'صيغة الملفّ غير معروفة',
    en: 'Unrecognised file format.',
  },
  NOT_A_QIMMAH_BACKUP: {
    ar: 'هذا الملفّ ليس نسخة بيانات قِمّة',
    en: 'This file is not a Qimmah data backup.',
  },
  // {0} = the backup's schema version, {1} = the version this build supports.
  UNSUPPORTED_VERSION: {
    ar: 'إصدار النسخة ({0}) غير متوافق مع هذا الإصدار ({1}).',
    en: 'This backup uses data format version {0}, but this app expects version {1}, so it cannot be imported.',
  },
  INVALID_STORES: {
    ar: 'محتوى النسخة غير صالح (stores)',
    en: 'The backup contents are invalid (stores).',
  },
  UNSAFE_KEYS: {
    ar: 'الملفّ يحتوي مفاتيح غير آمنة — رُفض',
    en: 'This file contains unsafe keys and was rejected.',
  },
  UNSAFE_STORE_ID: {
    ar: 'معرّف متجر غير آمن — رُفض',
    en: 'Unsafe data-store name; rejected.',
  },
  UNKNOWN_STORE_IN_BACKUP: {
    ar: 'متجر غير معروف في النسخة: «{0}»',
    en: 'Unknown data store in this backup: "{0}".',
  },
  UNKNOWN_STORE: {
    ar: 'متجر غير معروف: «{0}»',
    en: 'Unknown data store: "{0}".',
  },
  NEWER_VERSION: {
    ar: 'تحتوي النسخة بيانات من إصدار أحدث لا يمكن استيرادها بأمان.',
    en: 'This backup holds data from a newer version that cannot be imported safely.',
  },
  INVALID_SHAPE: {
    ar: 'الشكل غير صالح ({0})',
    en: 'Invalid format ({0}).',
  },
  VERIFY_FAILED: {
    ar: 'فشل التحقّق من النسخة.',
    en: 'The backup could not be verified.',
  },
  READBACK_FAILED: {
    ar: 'تعذّر قراءة «{0}» بعد الاستيراد — أُلغي كل شيء.',
    en: 'Could not read back "{0}" after importing, so everything was rolled back.',
  },
  IMPORT_FAILED: {
    ar: 'فشل الاستيراد — أُلغيت كل التغييرات.',
    en: 'Import failed, so every change was rolled back.',
  },
  UNDO_WRONG_OWNER: {
    ar: 'نسخة التراجع تخص حسابًا آخر — رُفضت.',
    en: 'The saved undo point does not match this account, so it was not used. Your data is unchanged.',
  },
}

function render(template: string, params: readonly string[]): string {
  return params.reduce<string>((out, value, i) => out.split(`{${i}}`).join(value), template)
}

/** The message for `code` in `lang`, with `{0}` filled from `params`. */
export function portabilityMessage(
  code: PortabilityErrorCode,
  lang: Lang = 'ar',
  params: readonly string[] = [],
): string {
  return render(MESSAGES[code][lang], params)
}

/** A validation failure carrying both languages (store `validate` implementations). */
export interface InvalidReason {
  ar: string
  en: string
}

export class PortabilityError extends Error {
  store?: string
  /** Stable identifier for this failure; drives localisation. */
  readonly code?: PortabilityErrorCode
  /** Values substituted into the `{0}` slot. */
  readonly params: readonly string[]
  /**
   * A ready-made English sentence that wins over the code catalogue.
   * Used where the reason is per-store and richer than one generic code — every
   * Arabic message stays byte-identical to what shipped before.
   */
  enMessage?: string

  /**
   * `message` stays the Arabic sentence, so every existing caller, log line and
   * test that reads `err.message` behaves exactly as before. Pass a `code` to make
   * the error localisable via `portabilityErrorText`.
   */
  constructor(message: string, store?: string, code?: PortabilityErrorCode, params: readonly string[] = []) {
    super(message)
    this.name = 'PortabilityError'
    this.store = store
    this.code = code
    this.params = params
  }
}

/** Build an error from its code — the Arabic message is generated, never hardcoded. */
export function portabilityError(
  code: PortabilityErrorCode,
  params: readonly string[] = [],
  store?: string,
): PortabilityError {
  return new PortabilityError(portabilityMessage(code, 'ar', params), store, code, params)
}

/**
 * A per-store shape rejection. Keeps the exact Arabic sentence the store already
 * produced, and carries its English twin, so no Arabic wording changes.
 */
export function invalidShapeError(reason: InvalidReason, store?: string): PortabilityError {
  const err = new PortabilityError(reason.ar, store, 'INVALID_SHAPE', store ? [store] : [])
  err.enMessage = reason.en
  return err
}

/**
 * User-facing text for any error in `lang`.
 *
 * Order: an explicit English sentence → the code catalogue → the raw message.
 * Falls back safely for errors thrown without a code and for non-portability
 * errors, so this is always safe to call.
 */
export function portabilityErrorText(err: unknown, lang: Lang = 'ar'): string {
  if (err instanceof PortabilityError) {
    if (lang === 'en' && err.enMessage) return err.enMessage
    if (lang === 'ar' && err.code !== 'INVALID_SHAPE' && err.code) return portabilityMessage(err.code, 'ar', err.params)
    if (err.code && lang === 'en') return portabilityMessage(err.code, 'en', err.params)
    return err.message
  }
  if (err instanceof Error) return err.message
  return portabilityMessage('IMPORT_FAILED', lang)
}
