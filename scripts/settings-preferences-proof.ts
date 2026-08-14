import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatNumber } from '@/lib/numberFormat'

let passed = 0
function check(label: string, condition: unknown): void {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① سياسة أرقام واحدة عند حدّ العرض')
check('العربية تعرض أرقامًا عربية', formatNumber(1234, 'ar') === '١٬٢٣٤')
check('الإنجليزية تعرض أرقامًا لاتينية', formatNumber(1234, 'en') === '1,234')
check('الكسر العربي يحتفظ بقيمته', formatNumber(25.5, 'ar', { maximumFractionDigits: 1 }) === '٢٥٫٥')
const storedValue = 25.5
void formatNumber(storedValue, 'ar')
check('التنسيق لا يغيّر القيمة العددية المخزّنة', storedValue === 25.5 && typeof storedValue === 'number')

console.log('\n② الإعدادات تصل التنفيذ الحقيقي ولا توهم بقدرات غير موجودة')
const settings = readFileSync('src/views/SettingsView.tsx', 'utf8')
const preferences = readFileSync('src/i18n/dict/settingsPreferences.ts', 'utf8')
const panel = readFileSync('src/components/DataManagementPanel.tsx', 'utf8')

function assertSettingsSource(source: string): void {
  assert.match(source, /<DataManagementPanel lang=\{lang\}/, 'secure-panel: يجب أن تصل الصفحة لوحة النقل المحصّنة')
  assert.doesNotMatch(source, /new FileReader\(|JSON\.parse\(String\(reader\.result\)\)|interface QimmahExport/, 'legacy-import: مستورد JSON اليدوي ممنوع')
  assert.match(source, /testId="settings-group-data" collapsible/, 'data-disclosure: مجموعة البيانات قابلة للفتح بلوحة مفاتيح')
  assert.match(source, /data-testid="settings-units-policy"/, 'units-truth: سياسة الوحدات ظاهرة')
  assert.match(source, /data-testid="settings-numbers-policy"/, 'numbers-policy: سياسة الأرقام ظاهرة')
}

assertSettingsSource(settings)
check('صفحة الإعدادات تصل لوحة النقل المحصّنة بلا مستورد يدوي', true)
check('الوحدات المترية وحدها معلنة', /metric units|الوحدات المترية/i.test(preferences) && !/imperial|رطل|قدم/i.test(preferences))
check('معاينة الاستيراد تستخدم منسّق الأرقام نفسه', /formatNumber\(l\.count, lang\)/.test(panel))
const undoClasses = [...panel.matchAll(/data-testid="settings-import-undo"[\s\S]*?className="([^"]+)"/g)].map((match) => match[1])
check('كل أزرار التراجع عن الاستيراد تحقق هدف لمس 44px', undoClasses.length === 2 && undoClasses.every((classes) => classes.includes('btn-ghost') || classes.includes('min-h-[44px]')))

console.log('\n③ أسطح Layer 3 الحرجة تتبع السياسة نفسها')
for (const path of [
  'src/views/NutritionV2.tsx',
  'src/views/TodayV2.tsx',
  'src/views/WorkoutV2.tsx',
  'src/views/ProgressV2.tsx',
  'src/lib/progressV2Model.ts',
]) {
  const source = readFileSync(path, 'utf8')
  check(`${path} يستعمل منسّق العرض المركزي`, source.includes('formatNumber'))
}
check('التغذية لا تفرض أرقام en-US داخل العربية', !readFileSync('src/views/NutritionV2.tsx', 'utf8').includes("toLocaleString('en-US')"))
check('Today لا يفرض أرقام en-US داخل العربية', !readFileSync('src/views/TodayV2.tsx', 'utf8').includes("toLocaleString('en-US')"))

console.log('\n④ محاكاة الالتفاف')
assert.throws(
  () => assertSettingsSource(settings.replace('<DataManagementPanel lang={lang}', '<LegacyImporter lang={lang}')),
  /secure-panel/,
)
check('التفاف فصل اللوحة المحصّنة يسقط بفحص مسمّى', true)
assert.throws(
  () => assertSettingsSource(settings.replace('data-testid="settings-units-policy"', 'data-testid="fake-units"')),
  /units-truth/,
)
check('التفاف إخفاء صدق الوحدات يسقط بفحص مسمّى', true)

console.log(`\n✅ الإعدادات/الأرقام/الوحدات: ${passed} فحوص، 0 فشل.`)
