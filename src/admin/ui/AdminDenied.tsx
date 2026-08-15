/**
 * شاشة المنع — ما يراه **كل** من ليس مؤسسًا، بمن فيهم مستخدم مسجّل دخول تمامًا.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ ثلاثة قيود ═══
 * ١) **لا تسريب بالمنع.** لا تذكر أي مقياس ولا اسم مستخدم ولا وجود بيانات.
 *    شاشة منع ثرثارة تكشف بنية اللوحة لمن لا يحقّ له رؤيتها.
 * ٢) **السبب يُعرض ولا يُبتلع.** المؤسس نفسه قد يصل هنا لأن الدور لم يُزوَّد
 *    بعد، فرسالة صامتة تجعله يظنّ عطلًا ويبحث في المكان الخطأ.
 * ٣) **لا زرّ «حاول مجددًا» ولا مسار التفاف.** لا يوجد فعل في المتصفّح يغيّر
 *    الجواب — والزرّ الذي لا يفعل شيئًا وعدٌ كاذب.
 */

import { Icon } from '@/components/Icon'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import type { AdminRoleDecision, DenialReason } from '../auth/adminRole'
import { adminRoleProvisioning } from '../auth/adminRole'

const REASON_KEY: Record<DenialReason, keyof (typeof adminStrings)['ar']['denied']> = {
  'no-session': 'reasonNoSession',
  'no-role-claim': 'reasonNoRoleClaim',
  'unknown-role': 'reasonUnknownRole',
  'forged-claim': 'reasonForgedClaim',
  'not-resolved': 'reasonNotResolved',
}

export function AdminDenied({ decision }: { decision: AdminRoleDecision }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const reason = decision.reason ? t.denied[REASON_KEY[decision.reason]] : t.denied.reasonNotResolved

  return (
    <main className="container-page section" data-admin-denied="true">
      <div className="card mx-auto max-w-lg p-6 text-start">
        <Icon name="Lock" className="h-8 w-8 text-ink-500" />
        <h1 className="heading mt-3">{t.denied.title}</h1>
        <p className="subheading">{t.denied.body}</p>

        <p className="mt-4 rounded-xl border border-line bg-beige p-3 text-sm font-bold text-ink-700">{reason}</p>

        {adminRoleProvisioning() === 'not-provisioned' ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-400">{t.denied.provisioningNote}</p>
        ) : null}
      </div>
    </main>
  )
}
