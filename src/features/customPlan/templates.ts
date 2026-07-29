// قوالب الجداول المسمّاة لكل مالك (P6) — تخزين فقط، بلا منطق بناء وبلا استيراد
// مكتبة التمارين (يبقى سجلّ النقل خفيفًا). نمط سجلّ customPlan/storage نفسه:
// سجلّ واحد مفتاحه معرّف المالك ('guest' للضيف)، مفتاحه مسجّل في userDataKeys
// ويُمسح عند تبديل الحساب (allowlist عزل الحسابات fail-safe).
//
// المزامنة (P12): القوالب تُزامَن لجدول plan_templates — صف لكل (حساب، قالب)
// بطابع updatedAt للـLWW، والحذف شاهد قبر بطابع (لا بعث لقالب محذوف). الرفع
// محروس بمطابقة مالك السجلّ لمالك جلسة المزامنة + بوابات syncQueue نفسها.
// العقد الكامل: docs/data/SYNC-COVERAGE.md.

import type { WorkoutPlan } from '@/types/workout'
import { enqueueSyncDelete, enqueueSyncOperation, getSyncRuntime } from '@/lib/syncQueue'
import type { BuilderError, PlanResult, TemplateResult } from './builder'

/** مفتاح قوالب الجداول المسمّاة — سجلّ واحد مفتاحه معرّف المالك. */
export const PLAN_TEMPLATES_KEY = 'qimmah:planTemplates:v1'

export const MAX_TEMPLATES = 20

export interface PlanTemplate {
  id: string
  nameAr: string
  nameEn?: string
  plan: WorkoutPlan
  createdAt: string
  updatedAt: string
}

type TemplateRegistry = Record<string, PlanTemplate[]>

function templatesOwnerKey(userId: string | null | undefined): string {
  return userId ?? 'guest'
}

function ls(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

/** تطبيع قالب واحد — localStorage يُعامل كمدخل معادٍ. */
function normalizeTemplate(raw: unknown): PlanTemplate | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Partial<PlanTemplate>
  if (typeof t.id !== 'string' || !t.id) return null
  if (typeof t.nameAr !== 'string' || !t.nameAr.trim()) return null
  const plan = t.plan as WorkoutPlan | undefined
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.days)) return null
  return {
    id: t.id,
    nameAr: t.nameAr,
    ...(typeof t.nameEn === 'string' && t.nameEn.trim() ? { nameEn: t.nameEn } : {}),
    plan,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : '',
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : '',
  }
}

function loadTemplateRegistry(): TemplateRegistry {
  const s = ls()
  if (!s) return {}
  try {
    const raw = s.getItem(PLAN_TEMPLATES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as TemplateRegistry) : {}
  } catch {
    return {}
  }
}

function saveTemplateRegistry(reg: TemplateRegistry): void {
  try {
    ls()?.setItem(PLAN_TEMPLATES_KEY, JSON.stringify(reg))
  } catch {
    /* امتلاء/حجب التخزين — لا نرمي */
  }
}

/** قوالب المالك الحالي (مطبَّعة؛ التالف يُسقط بصمت). */
export function listTemplates(userId: string | null | undefined): PlanTemplate[] {
  const list = loadTemplateRegistry()[templatesOwnerKey(userId)]
  if (!Array.isArray(list)) return []
  return list.map(normalizeTemplate).filter((t): t is PlanTemplate => t !== null)
}

const templateError = (code: BuilderError['code'], messageAr: string, messageEn: string): BuilderError => ({ code, messageAr, messageEn })

/**
 * يحفظ الخطة قالبًا مسمًّى للمالك. اسم فارغ أو خطة بلا أي تمرين تُرفض،
 * وMAX_TEMPLATES حدّ أقصى.
 */
export function saveTemplate(userId: string | null | undefined, name: { ar: string; en?: string }, plan: WorkoutPlan): TemplateResult {
  const nameAr = name.ar?.trim()
  if (!nameAr) {
    return { status: 'rejected', errors: [templateError('invalid-name', 'اسم القالب لا يمكن أن يكون فارغًا.', 'Template name cannot be empty.')] }
  }
  if (!plan.days.some((d) => d.exercises.length > 0)) {
    return { status: 'rejected', errors: [templateError('empty-template', 'لا يمكن حفظ قالب بلا أي تمرين.', 'Cannot save a template with no exercises.')] }
  }
  const existing = listTemplates(userId)
  if (existing.length >= MAX_TEMPLATES) {
    return { status: 'rejected', errors: [templateError('max-templates', `الحدّ الأقصى ${MAX_TEMPLATES} قالبًا.`, `At most ${MAX_TEMPLATES} templates.`)] }
  }
  const now = new Date().toISOString()
  const maxN = existing.reduce((m, t) => {
    const match = /^tpl-(\d+)$/.exec(t.id)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  const template: PlanTemplate = {
    id: `tpl-${maxN + 1}`,
    nameAr,
    ...(name.en?.trim() ? { nameEn: name.en.trim() } : {}),
    plan: JSON.parse(JSON.stringify(plan)) as WorkoutPlan,
    createdAt: now,
    updatedAt: now,
  }
  const reg = loadTemplateRegistry()
  reg[templatesOwnerKey(userId)] = [...existing, template]
  saveTemplateRegistry(reg)
  enqueueTemplateSync(userId, template)
  return { status: 'ok', template }
}

/** يرفع upsert قالب للطابور — فقط حين يطابق مالك السجلّ مالكَ جلسة المزامنة. */
function enqueueTemplateSync(userId: string | null | undefined, template: PlanTemplate): void {
  if (!userId || userId !== getSyncRuntime().userId) return
  enqueueSyncOperation('plan_templates', template.id, {
    local_id: template.id,
    data: template,
    updated_at: template.updatedAt || new Date().toISOString(),
    deleted_at: null,
  })
}

/**
 * كتابة قالب من مسار المزامنة (hydrate) بعد فوزه بالـLWW — إدراج/استبدال بمعرّفه
 * دون إعادة ختم ودون رفع (capture موقوف أثناء الترطيب).
 */
export function applyTemplateFromSync(userId: string | null | undefined, template: unknown): boolean {
  const normalized = normalizeTemplate(template)
  if (!normalized) return false
  const reg = loadTemplateRegistry()
  const key = templatesOwnerKey(userId)
  const rest = listTemplates(userId).filter((t) => t.id !== normalized.id)
  reg[key] = [...rest, normalized]
  saveTemplateRegistry(reg)
  return true
}

/** حذف قالب من مسار المزامنة (شاهد قبر سحابي فائز) — بلا رفع مضاد. */
export function removeTemplateFromSync(userId: string | null | undefined, templateId: string): void {
  const reg = loadTemplateRegistry()
  const key = templatesOwnerKey(userId)
  const next = listTemplates(userId).filter((t) => t.id !== templateId)
  if (next.length) reg[key] = next
  else delete reg[key]
  saveTemplateRegistry(reg)
}

/** يطبّق قالبًا: يُرجع نسخة عميقة من خطته (لا يكتب شيئًا — الحفظ عبر saveCustomPlan). */
export function applyTemplate(userId: string | null | undefined, templateId: string): PlanResult {
  const template = listTemplates(userId).find((t) => t.id === templateId)
  if (!template) {
    return {
      status: 'rejected',
      errors: [templateError('template-not-found', `القالب «${templateId}» غير موجود.`, `Template "${templateId}" was not found.`)],
    }
  }
  return { status: 'ok', plan: JSON.parse(JSON.stringify(template.plan)) as WorkoutPlan }
}

/** يحذف قالبًا للمالك الحالي. يعيد true إن وُجد وحُذف. */
export function deleteTemplate(userId: string | null | undefined, templateId: string): boolean {
  const reg = loadTemplateRegistry()
  const key = templatesOwnerKey(userId)
  const list = listTemplates(userId)
  const next = list.filter((t) => t.id !== templateId)
  if (next.length === list.length) return false
  if (next.length) reg[key] = next
  else delete reg[key]
  saveTemplateRegistry(reg)
  // شاهد قبر بطابع (P12): الحذف يصل الأجهزة الأخرى ولا يُبعث القالب من السحابة.
  if (userId && userId === getSyncRuntime().userId) enqueueSyncDelete('plan_templates', templateId)
  return true
}
