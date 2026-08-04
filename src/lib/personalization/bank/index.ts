// بنك الأسئلة — التجميع والفهرسة.
//
// البنك **بيانات فقط**: لا شرط يُقيَّم هنا، ولا نص. مقصده أن يكون كبيرًا
// (١٥٠+ سؤالًا) بينما المسار الفعلي قصير (١٥–٢٠) — والاختيار مسؤولية `engine.ts`.
//
// **التحقّق البنيوي يقع عند الاستيراد** (`assertBankIntegrity`): معرّف مكرّر أو
// مفتاح مكرّر أو `affects` فارغة تُسقط البناء في الإثبات بفحص مسمّى، لا تمرّ
// إلى وقت التشغيل. سؤال بلا أثر مُعلَن هو بالضبط ما تمنعه القاعدة الذهبية.

import { CORE_QUESTIONS } from './core'
import { GOAL_QUESTIONS } from './goals'
import { LOGISTICS_QUESTIONS } from './logistics'
import { HEALTH_QUESTIONS } from './health'
import { PREFERENCE_QUESTIONS } from './preferences'
import { ADVANCED_QUESTIONS } from './advanced'
import { CLARIFY_QUESTIONS } from './clarify'
import type { QuestionCategory, QuestionDef, QuestionId } from '../types'

/** البنك كاملًا بترتيب فئاته. */
export const QUESTION_BANK: readonly QuestionDef[] = [
  ...CORE_QUESTIONS,
  ...GOAL_QUESTIONS,
  ...LOGISTICS_QUESTIONS,
  ...HEALTH_QUESTIONS,
  ...PREFERENCE_QUESTIONS,
  ...ADVANCED_QUESTIONS,
  ...CLARIFY_QUESTIONS,
]

export const QUESTION_BY_ID: Readonly<Record<QuestionId, QuestionDef>> = Object.fromEntries(
  QUESTION_BANK.map((x) => [x.id, x]),
)

export const QUESTION_BY_KEY: Readonly<Record<string, QuestionDef>> = Object.fromEntries(
  QUESTION_BANK.map((x) => [x.key, x]),
)

export function questionsInCategory(cat: QuestionCategory): QuestionDef[] {
  return QUESTION_BANK.filter((x) => x.category === cat)
}

export function getQuestion(id: QuestionId): QuestionDef | undefined {
  return QUESTION_BY_ID[id]
}

export interface BankProblem {
  kind: 'duplicate_id' | 'duplicate_key' | 'empty_affects' | 'unknown_followup' | 'bad_priority' | 'missing_options'
  id: QuestionId
  detail: string
}

/**
 * يفحص سلامة البنك بنيويًا. يعيد قائمة المشاكل — **لا يرمي**، حتى يستطيع
 * الإثبات طباعتها كلّها دفعةً واحدة بدل الوقوف على أوّلها.
 */
export function checkBankIntegrity(bank: readonly QuestionDef[] = QUESTION_BANK): BankProblem[] {
  const problems: BankProblem[] = []
  const ids = new Set<string>()
  const keys = new Set<string>()
  const allIds = new Set(bank.map((x) => x.id))

  for (const x of bank) {
    if (ids.has(x.id)) problems.push({ kind: 'duplicate_id', id: x.id, detail: 'معرّف مكرّر' })
    ids.add(x.id)
    if (keys.has(x.key)) problems.push({ kind: 'duplicate_key', id: x.id, detail: `مفتاح مكرّر: ${x.key}` })
    keys.add(x.key)
    if (!x.affects.length) problems.push({ kind: 'empty_affects', id: x.id, detail: 'سؤال بلا أثر مُعلَن' })
    if (x.priority < 0 || x.priority > 100) problems.push({ kind: 'bad_priority', id: x.id, detail: `أولوية خارج 0..100: ${x.priority}` })
    if ((x.answer === 'single' || x.answer === 'multi') && !x.options?.length) {
      problems.push({ kind: 'missing_options', id: x.id, detail: 'سؤال اختياري بلا خيارات' })
    }
    for (const f of x.followUps ?? []) {
      for (const target of f.ask) {
        if (!allIds.has(target)) problems.push({ kind: 'unknown_followup', id: x.id, detail: `متابعة لسؤال غير موجود: ${target}` })
      }
    }
  }
  return problems
}

export { CORE_QUESTIONS, GOAL_QUESTIONS, LOGISTICS_QUESTIONS, HEALTH_QUESTIONS, PREFERENCE_QUESTIONS, ADVANCED_QUESTIONS, CLARIFY_QUESTIONS }
