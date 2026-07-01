// استخراج القيم الغذائية من صورة جدول الحقائق الغذائية عبر OCR (tesseract.js — Apache-2.0،
// استخدام تجاري مسموح). يُحمَّل عند الطلب فقط (import() ديناميكي) حتى لا يُضاف لحزمة الدخول
// الأساسية — نفس أسلوب تحميل ماسح الباركود (@zxing) في src/features/barcode.
// النتائج تقديرية بحتة (best-effort) والشاشة تُلزم المستخدم بمراجعتها/تصحيحها قبل الحفظ.

export interface OcrExtraction {
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  /** النص الخام المُتعرَّف عليه — للتشخيص فقط، لا يُعرض للمستخدم عادة. */
  rawText: string
}

/** يحوّل الأرقام العربية-الهندية (٠-٩) إلى لاتينية حتى تعمل عليها الأنماط الرقمية. */
function normalizeDigits(text: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩'
  return text.replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
}

function firstNumberAfter(text: string, labels: RegExp): number | undefined {
  const match = labels.exec(text)
  if (!match) return undefined
  const n = Number(match[1].replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/**
 * يبحث عن السعرات/البروتين/الكارب/الدهون في نص جدول غذائي (عربي أو إنجليزي).
 * best-effort: يعيد undefined لأي قيمة لم يجدها بثقة، بدل تخمين رقم خاطئ.
 */
export function parseNutritionText(rawText: string): OcrExtraction {
  const text = normalizeDigits(rawText)
  return {
    kcal: firstNumberAfter(text, /(?:سعرات\s*حرارية|سعرات|kcal|calories?)\D{0,12}?([0-9]+(?:[.,][0-9]+)?)/i),
    protein: firstNumberAfter(text, /(?:بروتين|protein)\D{0,12}?([0-9]+(?:[.,][0-9]+)?)/i),
    carbs: firstNumberAfter(text, /(?:كربوهيدرات|carbohydrates?|carbs)\D{0,12}?([0-9]+(?:[.,][0-9]+)?)/i),
    fat: firstNumberAfter(text, /(?:دهون|دهن|fat)\D{0,12}?([0-9]+(?:[.,][0-9]+)?)/i),
    rawText,
  }
}

/**
 * يشغّل OCR على صورة (data URL) بالعربية+الإنجليزية ويستخرج القيم الغذائية best-effort.
 * يُحمِّل tesseract.js ديناميكيًا عند أول استدعاء فقط.
 */
export async function extractNutritionFromImage(
  imageDataUrl: string,
  onProgress?: (progress: number) => void,
): Promise<OcrExtraction> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['ara', 'eng'], undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') onProgress?.(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(imageDataUrl)
    return parseNutritionText(data.text ?? '')
  } finally {
    await worker.terminate()
  }
}
