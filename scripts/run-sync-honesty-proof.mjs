// إثبات صدق المزامنة (RC v1.2.0).
//
// الخلفية: `VITE_SYNC_ENABLED` مطفأة افتراضيًا (syncQueue.ts: «Default: OFF»),
// ومع ذلك كانت SettingsView تعرض لكل مستخدم مسجّل نصًّا ثابتًا يقول إن بياناته
// «محفوظة على هذا الجهاز وعلى حسابك السحابي» — وهذا كذب في تهيئة الشحن الافتراضية.
// getSyncUiState() كان موجودًا في syncService.ts بلا مستدعٍ واحد.
//
// هذا الإثبات ساكن (لا متصفّح): يتحقّق أن الواجهة تقرأ الحالة الحقيقية، وأن
// وعد «السحابة» مربوط حصريًا بحالة synced، وأن كل حالة لها نصّها في اللغتين.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

console.log('════════ إثبات صدق المزامنة — قِمّة ════════')

const settings = read('src/views/SettingsView.tsx')
const strings = read('src/config/strings.ts')
const service = read('src/lib/syncService.ts')
const queue = read('src/lib/syncQueue.ts')

// ── 1) الواجهة تقرأ الحالة الحقيقية ──
check('SettingsView يستورد getSyncUiState', /import \{[^}]*getSyncUiState[^}]*\} from '@\/lib\/syncService'/.test(settings))
check('SettingsView يستدعي getSyncUiState فعليًا', settings.includes('getSyncUiState()'))

// ── 2) لا وعد سحابي غير مشروط ──
// النمط المعطوب: auth.user ? t.auth.cloudNote : ... (وعد ثابت لكل مسجّل دخول).
check(
  'حالة الحساب لا تُسند cloudNote مباشرةً لمجرّد وجود مستخدم',
  !/auth\.user\s*\n?\s*\?\s*t\.auth\.cloudNote/.test(settings),
)
check('حالة الحساب تمرّ عبر مُحوّل syncNote', /syncNote\(t,\s*getSyncUiState\(\)\)/.test(settings))

// ── 3) وعد «السحابة» محصور بحالة synced ──
const noteFn = settings.slice(settings.indexOf('function syncNote'), settings.indexOf('interface SettingsViewProps'))
check('syncNote موجود', noteFn.length > 0)
check(
  "cloudNote (الوعد السحابي) لا يُرجَع إلا عند state === 'synced'",
  /if \(sync\.state === 'synced'\) return t\.auth\.cloudNote/.test(noteFn) &&
    noteFn.split('t.auth.cloudNote\n').length - 1 <= 1 &&
    (noteFn.match(/return t\.auth\.cloudNote\b(?!\w)/g) || []).length === 1,
)
check("حالة sync-disabled تُرجع نص «الجهاز فقط»", /sync\.reason === 'sync-disabled'/.test(noteFn) && noteFn.includes('cloudNoteLocalOnly'))
check('حالة attention لها نصّها', noteFn.includes('cloudNoteAttention'))
check('حالة syncing لها نصّها', noteFn.includes('cloudNotePending'))
check('الحالة المحلّية بلا مزامنة سابقة لها نصّها', noteFn.includes('cloudNoteNeverSynced'))

// ── 4) النصوص موجودة في اللغتين ──
for (const key of ['cloudNoteLocalOnly', 'cloudNoteNeverSynced', 'cloudNotePending', 'cloudNoteAttention']) {
  const uses = (strings.match(new RegExp(`\\b${key}:`, 'g')) || []).length
  // مرّة في الواجهة (type) + مرّة عربي + مرّة إنجليزي
  check(`«${key}» معرّف في النوع والعربية والإنجليزية`, uses === 3)
}
check(
  'نص «الجهاز فقط» العربي لا يعد بسحابة',
  /cloudNoteLocalOnly: 'بياناتك محفوظة على هذا الجهاز فقط/.test(strings),
)

// ── 5) الافتراض الذي يقوم عليه كل ما سبق ما زال صحيحًا ──
check("المزامنة ما زالت مطفأة افتراضيًا (لا تُفعَّل إلا بالنص 'true')", /VITE_SYNC_ENABLED === 'true'/.test(queue))
check(
  "getSyncUiState يُرجع reason: 'sync-disabled' عند الإطفاء",
  /if \(!isSyncEnabled\(\)\) return \{ state: 'local'[^}]*reason: 'sync-disabled' \}/.test(service),
)
check(
  "getSyncUiState لا يقول 'synced' قبل نجاح مزامنة فعلية",
  /if \(lastSyncedAt\) return \{ state: 'synced'/.test(service) &&
    /lastSyncedAt = meta\.lastResult === 'success'/.test(service),
)

console.log(`\n✅ إثبات صدق المزامنة: ${pass} فحصًا، 0 فشل.`)
