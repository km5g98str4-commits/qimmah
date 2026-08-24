/**
 * سطر حالة الوصول — [COMMISSIONING §1]
 *
 * ═══ لماذا وُجد ═══
 * `useAccessSummary` مكتوب ومختبَر منذ `[SOVEREIGN-COMMERCE-001]`، **وبلا أي
 * مستهلك**. ولذلك أثران حقيقيّان لا واحد:
 *
 *   ① **المستخدم لا يرى تجربته.** يبدأ ٧٢ ساعة ثم لا يجد في التطبيق كلّه سطرًا
 *      يقول «باقي كذا». والتكليف يطلب أن يعرف المؤسس — ومستخدمه — «كيف تعمل
 *      التجربة المجانية»؛ ومعرفةٌ لا تظهر على شاشة ليست معرفة.
 *   ② **مؤقّت الانتهاء لا يُسلَّح أصلًا.** جدولة إعادة الحسم عند لحظة الانتهاء
 *      تعيش **داخل الهوك**، فبلا تركيبه تبقى الجلسة `active` في المتصفّح بعد
 *      انقضاء المدّة حتى يوقظها تحديثُ رمزٍ بعد نحو ساعة. في تلك النافذة تنجح
 *      الكتابة محلّيًا على استحقاق منتهٍ — ولا يُمنح شيء على الخادم، لكن
 *      الواجهة تكذب. فتركيب هذا السطر **يُصلح الصدق قبل أن يُجمّل الشاشة**.
 *
 * ═══ ولماذا سطرٌ لا بطاقة ═══
 * التصميم مجمَّد. فهذا **ليس سطحًا جديدًا** بل شريطٌ نحيف يظهر **فقط حين يكون
 * لديه ما يقوله**: تجربة جارية · تجربة تقارب الانتهاء · تجربة انتهت · وصول
 * موقوف. ومن يملك Premium بلا انتهاء لا يرى شيئًا — لا سطر يزفّ خبرًا لا جديد
 * فيه، ولا شارة دائمة تشغل مساحة.
 *
 * ═══ والنبرة إخبار لا ضغط (§6/١) ═══
 * «باقي ٥ ساعات» لا «سارع قبل الفوات». النصوص كلّها من `accessSummary` الذي
 * يملك القرار، فلا صياغة ثانية هنا تتباعد عنه.
 */
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { useAccessSummary } from '@/lib/access/useAccessSummary'

export interface AccessStatusLineProps {
  lang: Lang
  /** بلا حساب لا استحقاق ولا عدّاد — ولا سطر. */
  signedIn: boolean
}

/**
 * الحالات التي **لها خبر**. وما عداها يُخفى:
 *   `premium`/`special` — وصولٌ قائم بلا عدّاد، فلا جديد يُقال كل شاشة.
 *   `preview`/`unknown`/`checking` — لا خبر بعد، وإعلان اللاشيء ضجيج.
 */
const SPEAKS: ReadonlySet<string> = new Set(['trial', 'trialExpired', 'revoked'])

export function AccessStatusLine({ lang, signedIn }: AccessStatusLineProps) {
  // ⚠️ الهوك يُستدعى **دائمًا** قبل أي خروج مبكّر — وهذا ليس أسلوبًا بل شرط
  // صحّة: مؤقّت إعادة الحسم يعيش داخله، فتخطّيه شرطيًّا يُطفئ الصدق نفسه
  // الذي رُكّب هذا المكوّن لأجله.
  const summary = useAccessSummary(lang)

  if (!signedIn) return null
  if (!SPEAKS.has(summary.kind)) return null
  if (!summary.label) return null

  return (
    <p
      data-testid="access-status-line"
      data-access-kind={summary.kind}
      role="status"
      className={cn(
        'mx-auto mt-2 flex w-full max-w-3xl items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold leading-relaxed',
        summary.tone === 'ending' ? 'border-warning/40 bg-warning/[0.07] text-ink-700'
          : summary.tone === 'blocked' ? 'border-danger/40 bg-danger/[0.07] text-ink-700'
          : 'border-line bg-surface text-ink-700',
      )}
    >
      <Icon
        name={summary.tone === 'blocked' ? 'ShieldOff' : summary.tone === 'ending' ? 'Clock' : 'Sparkles'}
        className={cn('h-4 w-4 shrink-0', summary.tone === 'ending' ? 'text-warning' : 'text-ink-500')}
      />
      <span>{summary.label}</span>
    </p>
  )
}
