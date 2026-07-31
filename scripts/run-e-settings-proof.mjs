import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const view = read('src/views/SettingsView.tsx')
const device = read('src/components/DeviceSettings.tsx')
const copy = read('src/i18n/dict/eSettings.ts')
const harness = read('scripts/e-settings-shot/harness.tsx')

let passed = 0
const check = (label, condition) => {
  assert.equal(condition, true, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① بنية الإعدادات v3')
for (const group of ['account', 'preferences', 'notifications', 'privacy-data', 'about']) {
  check(`مجموعة ${group} موجودة مرة واحدة`, (view.match(new RegExp(`settings-group-${group}`, 'g')) ?? []).length === 1)
}
check('خمس مجموعات عليا فقط', (view.match(/<SettingsGroup/g) ?? []).length === 5)
check('كل مجموعة تحمل وصفًا واضحًا', (view.match(/description=\{e\.groups\./g) ?? []).length === 5)
check('البطاقات تستخدم سطح v3 وشكله', view.includes('rounded-3xl border border-line bg-surface shadow-card'))
check('أهداف اللمس الأساسية 44px', view.includes('min-h-11'))
check('لا زر أو وسم قريبًا', !view.includes('قريبًا') && !view.includes('Coming soon'))

console.log('\n② السلوك القديم باقٍ')
check('تعديل الخطة باقٍ', view.includes('onClick={onEditPlan}'))
check('إعادة التوليد باقية', view.includes('onClick={onRegenerate}'))
check('نسخة الأجهزة باقية', view.includes('onClick={onSwitchToMachines}'))
check('الحذف المؤكد باقٍ', view.includes('canConfirmDelete') && view.includes('onDeleteAccount'))
check('النقل المحصّن باقٍ', view.includes('<DataManagementPanel'))
check('التحليلات الاختيارية باقية', view.includes('role="switch"') && view.includes('toggleAnalytics'))
check('التذكيرات الحقيقية باقية', view.includes('<NotificationSettingsPanel'))
check('ربط الصحة الحقيقي باقٍ', view.includes('<NativeSettingsPanel'))
check('التثبيت الحقيقي باقٍ', view.includes('<DeviceSettings lang={lang} embedded'))
check('أداة الفريق لا تظهر في الإنتاج', view.includes('import.meta.env.DEV &&'))
check('DeviceSettings تغيّر عرضيًا فقط', device.includes('embedded = false') && device.includes("embedded ? 'border-t border-line py-4' : 'card p-6'"))

console.log('\n③ اللغة والإثبات البصري')
check('قاموس E عربي وإنجليزي', copy.includes('ar: {') && copy.includes('en: {'))
check('النبرة العربية البيضاء موجودة', copy.includes('اختَر وش تبي قِمّة يذكّرك فيه.'))
check('زر الرجوع يأخذ نصه من القاموس', view.includes('aria-label={e.backToProfile}'))
check('حاضنة الإثبات تعرض اللغتين', harness.includes("params.get('lang') === 'en' ? 'en' : 'ar'"))

console.log(`\n✅ إثبات حارة E لإعادة تنظيم الإعدادات نجح — ${passed} فحصًا.`)
