// ═══════════════════════════════════════════════════════════════════════════
//  مزوّدات المرشد — [SOVEREIGN-COACH-001].
//
//  ═══ مزوّدان، وواحد فقط موصول ═══
//  ① `localDeterministicProvider` — محرّك القواعد. **متاح دائمًا**، بلا إعداد
//     ولا اتصال، ويُفصح أن الجواب من بيانات المستخدم نفسه.
//  ② `externalModelProvider` — واجهة **معلَنة وغير موصولة في هذا البناء**.
//     `isConfigured()` تعيد `false` عن ثابت بناء لا عن قراءة إعداد، ونداء
//     `answer` يرمي `CoachProviderUnavailableError` **باسمه** — لا يعيد نصًّا
//     مصنوعًا ولا يسقط بصمت إلى المحلّي داخل نفسه. الاختيار يحدث في
//     `resolveCoachProvider` **فوق** المزوّدين، ظاهرًا في مكان واحد.
//
//  ═══ لا سرّ في العميل — أبدًا ═══
//  كل ما يصل المتصفّح مكشوف (`.claude/rules/security.md`). فلا يُشحن سرّ مزوّد
//  في هذه الحزمة بأي شكل، ولا تُقرأ منها إعدادات بناء عامّة لهذا الغرض. وأي
//  مزوّد خارجي قادم **يمرّ عبر خادم وسيط يحمل السرّ ويطبّق حدّ الاستهلاك**؛
//  العميل يخاطب ذلك الخادم فقط. ويحرس هذا الملفَّ وأخواته إثباتٌ يمسح شجرة
//  المرشد كلّها بحثًا عن أي نداء شبكة أو قراءة إعداد بناء.
// ═══════════════════════════════════════════════════════════════════════════

import type { CoachContext } from './context'
import { buildCoachAnswer, type CoachAnswerOptions } from './rules'
import type { CoachAnswer, CoachAnswerSubject, CoachDisclosure, CoachProviderId } from './types'

export type CoachProviderErrorCode = 'not-configured'

export class CoachProviderUnavailableError extends Error {
  readonly code: CoachProviderErrorCode
  readonly providerId: CoachProviderId
  constructor(providerId: CoachProviderId, code: CoachProviderErrorCode) {
    super(`CoachProviderUnavailableError[${code}]: ${providerId}`)
    this.name = 'CoachProviderUnavailableError'
    this.code = code
    this.providerId = providerId
  }
}

export interface CoachProvider {
  readonly id: CoachProviderId
  readonly disclosure: CoachDisclosure
  /** هل هذا المزوّد صالح للاستعمال في هذا البناء؟ */
  isConfigured(): boolean
  answer(subject: CoachAnswerSubject, ctx: CoachContext, options?: CoachAnswerOptions): CoachAnswer
}

export const localDeterministicProvider: CoachProvider = {
  id: 'local-deterministic',
  disclosure: 'localData',
  isConfigured: () => true,
  answer: (subject, ctx, options) => buildCoachAnswer(subject, ctx, options),
}

/**
 * **ثابت بناء، لا قراءة إعداد.** لو كان شرطًا وقت التشغيل لصار «غير موصول»
 * ادّعاءً يعتمد على بيئة قد تتغيّر تحت أرجل الإثبات؛ وهو الآن حقيقة يقرأها
 * الحارس في الشيفرة نفسها.
 */
export const EXTERNAL_PROVIDER_WIRED = false

export const externalModelProvider: CoachProvider = {
  id: 'external-model',
  disclosure: 'externalModel',
  isConfigured: () => EXTERNAL_PROVIDER_WIRED,
  answer: (): CoachAnswer => {
    throw new CoachProviderUnavailableError('external-model', 'not-configured')
  },
}

/** ترتيب الأفضلية — والمحلّي آخر السلسلة فلا يبقى المستخدم بلا جواب. */
export const COACH_PROVIDERS: readonly CoachProvider[] = [externalModelProvider, localDeterministicProvider]

/** أول مزوّد مُعَدّ فعلًا. في هذا البناء: المحلّي حتمًا. */
export function resolveCoachProvider(providers: readonly CoachProvider[] = COACH_PROVIDERS): CoachProvider {
  const found = providers.find((p) => p.isConfigured())
  if (found) return found
  return localDeterministicProvider
}
