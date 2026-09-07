// [RR-003] المسار الحقيقي: persistOnboardingToProfile بمزامنة مطفأة (كما في الإنتاج) ⇒ صفّ profiles الفعلي.
// عميل Supabase يُستبدل بمسجِّل عبر مُحلِّل esbuild (scripts/run-rr003-consent-upload-proof.mjs) — لا منفذ اختبار في src.
import { persistOnboardingToProfile } from '@/lib/onboardingSync'
import { setCloudSyncConsent, setSensitiveHealthConsent } from '@/lib/syncConsent'
import { upserts } from './rr003-stub-supabase'
import type { OnboardingProfile } from '@/types/onboarding'
let pass = 0
const check = (label: string, ok: boolean) => { if (!ok) { console.error(`✗ FAIL: ${label}`); process.exit(1) } pass++; console.log(`  ✓ ${label}`) }
const USER = '00000000-0000-4000-8000-0000000000aa'
const profile = { _meta: { completed: true, updatedAt: '2026-09-07T00:00:00.000Z' }, goal: { type: 'fat_loss' }, bodyMetrics: { currentWeightKg: 80, heightCm: 175 },
  limitations: { injuries: ['knee'], notes: 'ألم في الركبة اليسرى' }, wellnessTracking: { mode: 'both', medications: ['metformin'], supplements: ['creatine'] },
  foodPreferences: { dietPattern: 'balanced', allergies: ['peanut'] }, consents: { healthData: { accepted: false } } } as unknown as OnboardingProfile
const SENSITIVE = ['knee', 'الركبة', 'metformin', 'creatine', 'peanut']
console.log('① بلا موافقة صحّية (الإنتاج: المزامنة مطفأة)')
await persistOnboardingToProfile(USER, profile)
const off = upserts.find((u) => u.table === 'profiles'); const offText = JSON.stringify(off?.row ?? {})
check('كُتب صفّ profiles واحد', upserts.length === 1 && off !== undefined)
for (const s of SENSITIVE) check(`لا «${s}» في الصفّ المرفوع`, !offText.includes(s))
check('بوّابة الإكمال وصلت (_meta.completed · goal · bodyMetrics)', /"completed":true/.test(offText) && /"fat_loss"/.test(offText) && /"currentWeightKg":80/.test(offText))
console.log('② بالموافقتين (الأولى شرط الثانية)')
upserts.length = 0
setCloudSyncConsent(USER, true); setSensitiveHealthConsent(USER, true)
await persistOnboardingToProfile(USER, profile)
const onText = JSON.stringify(upserts.find((u) => u.table === 'profiles')?.row ?? {})
check('الحقول الحسّاسة تُرفع بالموافقة الصريحة', /metformin/.test(onText) && /knee/.test(onText) && /peanut/.test(onText))
console.log(`\n✅ RR-003 مسار الرفع الحقيقي: ${pass} فحصًا، 0 فشل.`)
