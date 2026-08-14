import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDefaultCustomization } from '@/lib/customization'
import { buildProfileV2Model } from '@/lib/profileV2Model'

declare const __QIMMAH_ROOT__: string
const read = (path: string) => readFileSync(resolve(__QIMMAH_ROOT__, path), 'utf8')
let passed = 0
function check(label: string, condition: unknown): void {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① حقيقة الحساب لا تختلط ببيانات الجهاز')
const customization = getDefaultCustomization()
const guest = buildProfileV2Model(customization, { displayName: null, email: null, signedIn: false }, 'ar')
const account = buildProfileV2Model(customization, { displayName: 'زياد', email: 'z@example.com', signedIn: true }, 'ar')
check('الضيف لا يعلن قابلية حذف حساب غير موجود', guest.privacy.deleteAccountAvailable === false)
check('الحساب المسجّل يعلن قابلية الحذف القانونية', account.privacy.deleteAccountAvailable === true)
check('بريد الحساب لا يتسرّب إلى نموذج الضيف', guest.user.email === null && account.user.email === 'z@example.com')

console.log('\n② Profile يعيد استخدام المالك القانوني ويحفظ سياق الرجوع')
const profile = read('src/views/ProfileV2.tsx')
const model = read('src/lib/profileV2Model.ts')
const notifications = read('src/views/NotificationsSettingsV2.tsx')
const nativeSettings = read('src/components/NativeSettingsPanel.tsx')

function assertProfileSource(source: string): void {
  assert.match(source, /<DataManagementPanel lang=\{lang\} uid=\{uid\}/, 'canonical-data-panel: يجب استخدام مالك النقل القانوني')
  assert.doesNotMatch(source, /buildExportBundle|parseImportFile|applyImport|new FileReader|JSON\.parse\(String\(reader\.result\)\)/, 'duplicate-data-path: ممنوع مسار نقل ثانٍ')
  assert.match(source, /screen === 'data-privacy'[\s\S]*?onBack=\{\(\) => setScreen\('privacy'\)\}/, 'privacy-return: بيانات الخصوصية يجب أن تعود للخصوصية')
  assert.match(source, /model\.user\.signedIn \? t\('حذف الحساب نهائيًا'/, 'guest-truth: وصف حذف الحساب مشروط بوجود الحساب')
  assert.match(source, /\{model\.user\.signedIn && \([\s\S]*?t\('تسجيل الخروج · حذف الحساب'/, 'guest-settings-truth: إجراءات الحساب الداخلية مشروطة بوجود الحساب')
}

assertProfileSource(profile)
check('لوحة النقل المحصّنة هي التنفيذ الوحيد داخل Profile', true)
check('البيانات تملك رجوعًا مستقلًا من Settings ومن Privacy', /data-settings/.test(profile) && /data-privacy/.test(profile))
check('العودة من Settings القانونية تستعيد شاشة Profile السابقة', /PROFILE_RETURN_SCREEN_STATE/.test(profile) && /history\.replaceState\(\{ \.\.\.current, \[PROFILE_RETURN_SCREEN_STATE\]: returnScreen \}/.test(profile))
check('سياق الرجوع مرتبط بمدخل التاريخ لا بمخزن بيانات جديد', !/sessionStorage\.(?:setItem|getItem)\(PROFILE_RETURN_SCREEN/.test(profile) && /takeProfileReturnScreen/.test(profile))
check('مدخل اللغة والوحدات والأرقام زر فعلي إلى Settings القانونية', /testId="profile-canonical-settings"[\s\S]{0,220}?onClick=\{onCanonicalSettings\}/.test(profile))
check('النموذج لم يعد يملك نسخة ثانية من حقائق إعدادات العرض', !/settings:\s*\{\s*language:/.test(model) && !/model\.settings/.test(profile))
check('الأرقام الديناميكية تمر عبر منسّق العرض المركزي', /formatNumber\(n, lang\)/.test(profile) && !/toLocaleString\(/.test(profile))
check('ملخّص الملف يحمل اسمًا متاحًا من القاموس', /aria-label=\{profileCopy\.summaryAria\}/.test(profile))
check('Profile وشاشة التذكيرات تتركان h1 لقشرة المسار', !/<h1\b/.test(profile) && !/ScreenHeader/.test(profile) && !/<h1\b/.test(notifications))

console.log('\n③ أهداف اللمس في الشاشات التي يكشفها Profile')
check('زر رجوع Profile الفرعي 44×44', /aria-label=\{ar \? 'رجوع' : 'Back'\}[\s\S]{0,180}?h-11 w-11/.test(profile))
check('مفتاح جدولة السمة يملك هدف 44×44', /aria-label=\{t\('جدولة حسب الغروب'[\s\S]{0,220}?h-11 w-11/.test(profile))
check('زر رجوع التذكيرات 44×44', /aria-label=\{ar \? 'رجوع' : 'Back'\}[\s\S]{0,180}?h-11 w-11/.test(notifications))
check('مفتاح التذكيرات الرئيسي يملك هدف 44×44', /id="notif-master"[\s\S]{0,320}?h-11 w-11/.test(notifications))
check('كل مفتاح فرعي يستخدم غلاف 44×44', /function ToggleSwitch[\s\S]*?className="grid h-11 w-11/.test(notifications))
check('مفتاح الاهتزاز يملك هدف 44×44', /aria-label=\{copy\.hapticsToggle\}[\s\S]{0,180}?h-11 w-11/.test(nativeSettings))

console.log('\n④ محاكاة الالتفاف')
assert.throws(
  () => assertProfileSource(profile.replace('<DataManagementPanel lang={lang}', '<LegacyDataPanel lang={lang}')),
  /canonical-data-panel/,
)
check('التفاف فصل لوحة النقل القانونية يسقط بفحص مسمّى', true)
assert.throws(
  () => assertProfileSource(profile.replace("setScreen('privacy')", "setScreen('settings')")),
  /privacy-return/,
)
check('التفاف إعادة بيانات الخصوصية إلى Settings يسقط بفحص مسمّى', true)
assert.throws(
  () => assertProfileSource(profile.replace("model.user.signedIn ? t('حذف الحساب نهائيًا'", "true ? t('حذف الحساب نهائيًا'")),
  /guest-truth/,
)
check('التفاف إظهار حذف الحساب للضيف يسقط بفحص مسمّى', true)
assert.throws(
  () => assertProfileSource(profile.replace('{model.user.signedIn && (', '{true && (')),
  /guest-settings-truth/,
)
check('التفاف إظهار صفوف الحساب في إعدادات الضيف يسقط بفحص مسمّى', true)

console.log(`\n✅ موثوقية Profile: ${passed} فحصًا، 0 فشل.`)
