// تحقّق الإدخال اليدوي للباركود — رقم GTIN بطول 8/12/13 مع فحص خانة التحقق (mod-10).
// يقبل الأرقام العربية الشرقية (٠-٩ و ۰-۹) وينسّقها لأرقام ASCII قبل الفحص — دعم ثنائي اللغة حقيقي.

import { lookupBarcode, type LookupResult, type OffLookupDeps } from './openFoodFacts'
import { foldDigits } from '@/lib/numberFormat'

export type ManualBarcodeFormat = 'ean_13' | 'upc_a' | 'ean_8' | 'upc_e'

export type BarcodeValidationFailure = 'empty' | 'non-digits' | 'length' | 'checksum'

export type BarcodeValidation =
  | {
      ok: true
      /** الأرقام كما أدخلت (بعد التنسيق) — للعرض. */
      normalized: string
      /** الكود المُرسل للبحث — موسَّع إلى UPC-A للـ UPC-E، وإلا يطابق normalized. */
      lookupCode: string
      format: ManualBarcodeFormat
    }
  | { ok: false; reason: BarcodeValidationFailure }

/**
 * يحذف الفواصل الشائعة (مسافات/شرطات) ويحوّل الأرقام العربية الشرقية إلى ASCII.
 *
 * الطيّ نفسه **مفوَّض إلى `foldDigits`** — الطبقة الرقمية القانونية الوحيدة.
 * كانت هنا نسخة ثالثة قريبة الشبه لا تعرف `٫` ولا `٬`، وهما ما يُصدره
 * `formatNumber` نفسه؛ فبقيت النسخ تشيخ متفرّقة.
 */
export function normalizeDigits(input: string): string {
  let out = ''
  for (const ch of foldDigits(input.trim())) {
    if (/\s/.test(ch) || ch === '-') continue
    out += ch
  }
  return out
}

/** فحص خانة تحقق GTIN القياسي (mod-10 بأوزان 3/1) — يصلح لأطوال 8/12/13/14. */
export function gtinCheckDigitValid(code: string): boolean {
  if (!/^\d+$/.test(code) || code.length < 2) return false
  const digits = code.split('').map(Number)
  const check = digits.pop() as number
  let sum = 0
  let weight = 3 // الرقم الملاصق لخانة التحقق وزنه 3 دائمًا في GTIN
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight
    weight = 4 - weight
  }
  return (10 - (sum % 10)) % 10 === check
}

/**
 * توسيع UPC-E (8 خانات مضغوطة) إلى UPC-A (12 خانة) بقواعد GS1 القياسية.
 * يعيد null إذا لم يكن الشكل قابلًا للتوسيع (رقم نظام غير 0/1 أو طول خاطئ).
 */
export function expandUpcE(code8: string): string | null {
  if (!/^\d{8}$/.test(code8)) return null
  const numberSystem = code8[0]
  if (numberSystem !== '0' && numberSystem !== '1') return null
  const d = code8.slice(1, 7)
  const check = code8[7]
  const last = d[5]
  let body: string
  if (last === '0' || last === '1' || last === '2') {
    body = d.slice(0, 2) + last + '0000' + d.slice(2, 5)
  } else if (last === '3') {
    body = d.slice(0, 3) + '00000' + d.slice(3, 5)
  } else if (last === '4') {
    body = d.slice(0, 4) + '00000' + d[4]
  } else {
    body = d.slice(0, 5) + '0000' + last
  }
  return numberSystem + body + check
}

/**
 * يتحقق من باركود مُدخل يدويًا: تنسيق → طول → خانة تحقق.
 * 8 خانات تُقبل كـ EAN-8 (بخانة تحققه) أو كـ UPC-E (بخانة تحقق شكله الموسَّع).
 */
export function validateBarcode(raw: string): BarcodeValidation {
  const normalized = normalizeDigits(raw)
  if (normalized.length === 0) return { ok: false, reason: 'empty' }
  if (!/^\d+$/.test(normalized)) return { ok: false, reason: 'non-digits' }

  if (normalized.length === 13) {
    return gtinCheckDigitValid(normalized)
      ? { ok: true, normalized, lookupCode: normalized, format: 'ean_13' }
      : { ok: false, reason: 'checksum' }
  }
  if (normalized.length === 12) {
    return gtinCheckDigitValid(normalized)
      ? { ok: true, normalized, lookupCode: normalized, format: 'upc_a' }
      : { ok: false, reason: 'checksum' }
  }
  if (normalized.length === 8) {
    if (gtinCheckDigitValid(normalized)) {
      return { ok: true, normalized, lookupCode: normalized, format: 'ean_8' }
    }
    const expanded = expandUpcE(normalized)
    if (expanded && gtinCheckDigitValid(expanded)) {
      return { ok: true, normalized, lookupCode: expanded, format: 'upc_e' }
    }
    return { ok: false, reason: 'checksum' }
  }
  return { ok: false, reason: 'length' }
}

export type ManualLookupResult = LookupResult | { status: 'invalid'; reason: BarcodeValidationFailure }

/**
 * واجهة الإدخال اليدوي الكاملة: تحقّق → بحث Open Food Facts (بالكود الموسَّع للـ UPC-E).
 * «invalid» يعني أن الإدخال نفسه غير صالح — قبل أي اتصال بالشبكة.
 */
export async function lookupManualBarcode(raw: string, deps?: OffLookupDeps): Promise<ManualLookupResult> {
  const validation = validateBarcode(raw)
  if (!validation.ok) return { status: 'invalid', reason: validation.reason }
  return lookupBarcode(validation.lookupCode, deps)
}
