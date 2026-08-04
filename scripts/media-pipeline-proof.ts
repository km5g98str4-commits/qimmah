// إثبات P10 — كتالوج وسائط التمارين: تغطية صادقة، حقوق لكل أصل، مقاسات مفحوصة،
// مسارات موجودة على القرص، لا روابط «بحث يوتيوب»، وتحميل مسبق «للتالي فقط».
// فحوص grep والانحراف عن المولّد تعمل في run-media-pipeline-proof.mjs قبل هذا الملف.

import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  exerciseMediaManifest,
  MEDIA_STILLS_COVERAGE,
  MEDIA_CATALOG_TOTAL,
  MEDIA_MISSING_IDS,
  type ExerciseMediaManifestEntry,
} from '@/data/exerciseMediaManifest.generated'
import {
  getMediaManifestEntry,
  exerciseStillPair,
  preloadNextExercise,
  getPreloadedExerciseId,
  preloadedImageCount,
  clearPreloadedExercise,
} from '@/lib/exerciseMediaPipeline'
import { exercises, LEGACY_EXERCISE_ID_MAP, PLACEHOLDER_ONLY_EXERCISE_IDS } from '@/data/exercises'

const PUBLIC_DIR = resolve(process.cwd(), 'public')

let passed = 0
function check(label: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  ✓ ${label}`)
  } catch (err) {
    console.error(`✗ FAIL: ${label}`)
    console.error(err)
    process.exit(1)
  }
}

const entries: ExerciseMediaManifestEntry[] = Object.values(exerciseMediaManifest)
const stills = entries.filter((e) => e.status === 'stills')

// ═══ 1) التغطية والاتساق ═══════════════════════════════════════════════════

check(`الكتالوج يغطي كل تمارين المكتبة (${MEDIA_CATALOG_TOTAL}) — سجلّ لكل تمرين، بلا حذف صامت`, () => {
  assert.equal(entries.length, MEDIA_CATALOG_TOTAL)
  assert.equal(exercises.length, MEDIA_CATALOG_TOTAL, 'إجمالي الكتالوج = مكتبة التمارين الحقيقية')
  for (const ex of exercises) {
    assert.ok(exerciseMediaManifest[ex.id], `تمرين ${ex.id} بلا سجلّ في الكتالوج`)
  }
  for (const [key, entry] of Object.entries(exerciseMediaManifest)) {
    assert.equal(entry.id, key, 'مفتاح السجلّ = معرّفه')
  }
})

check(`عدّاد التغطية صادق: ${MEDIA_STILLS_COVERAGE} تمرينًا بإطارات حقيقية`, () => {
  assert.equal(stills.length, MEDIA_STILLS_COVERAGE)
  assert.ok(MEDIA_STILLS_COVERAGE > 100, 'التغطية الفعلية ثلاثية الأرقام — انهيار مفاجئ يُكتشف')
})

check('قائمة الناقص صادقة: كل معرّف فيها حالته missing فعلًا، والعكس بالعكس', () => {
  const missing = entries.filter((e) => e.status === 'missing').map((e) => e.id)
  assert.deepEqual([...missing].sort(), [...MEDIA_MISSING_IDS].sort())
  const placeholderSet = new Set(PLACEHOLDER_ONLY_EXERCISE_IDS)
  for (const entry of entries) {
    if (placeholderSet.has(entry.id)) {
      assert.equal(entry.status, 'placeholder-only', `${entry.id}: بطاقة جهاز متعمّدة لا missing`)
    }
  }
})

// ═══ 2) الحقوق — لا أصل بلا مصدر/ترخيص، ولا ترخيص مُخترَع ═══════════════════

check('كل أصل مشحون يحمل source وlicense صريحَين (unverified مسموح كإعلان صادق، لا فراغ)', () => {
  for (const entry of stills) {
    assert.ok(entry.source && entry.source.length > 0, `${entry.id}: بلا مصدر`)
    assert.ok(entry.license && entry.license.length > 0, `${entry.id}: بلا ترخيص`)
  }
})

check('لا ترخيص مُخترَع: كل ترخيص إمّا من السجلّ المُراجَع أو unverified معلَن', () => {
  const reviewed = new Set(['Unlicense / public-domain dedication', 'unverified'])
  for (const entry of stills) {
    assert.ok(reviewed.has(entry.license as string), `${entry.id}: ترخيص غير معروف "${entry.license}"`)
  }
})

// ═══ 3) الصدق: gif/video = null، لا روابط بحث يوتيوب ═══════════════════════

check('gif وvideo = null في كل السجلّات — لا وسائط متحركة مُدّعاة بلا مصدر نظيف', () => {
  for (const entry of entries) {
    assert.equal(entry.gif, null, `${entry.id}: gif يجب أن يكون null`)
    assert.equal(entry.video, null, `${entry.id}: video يجب أن يكون null`)
  }
})

check('لا رابط يوتيوب/بحث في أي حقل من الكتالوج', () => {
  const raw = JSON.stringify(exerciseMediaManifest)
  assert.ok(!/youtube\.com|youtu\.be|results\?search_query/i.test(raw))
})

// ═══ 4) المسارات موجودة على القرص والمقاسات مفحوصة ═══════════════════════════

check('كل مسار مشحون موجود فعلًا تحت public/ ويبدأ بـ /exercise-images/', () => {
  for (const entry of stills) {
    for (const asset of [entry.stillStart, entry.stillEnd]) {
      assert.ok(asset, `${entry.id}: أصل مفقود`)
      assert.ok(asset!.path.startsWith('/exercise-images/'), `${entry.id}: مسار خارج exercise-images`)
      assert.ok(existsSync(join(PUBLIC_DIR, asset!.path.slice(1))), `${entry.id}: ${asset!.path} غير موجود على القرص`)
    }
  }
})

check('المقاسات حاضرة وحقيقية لكل أصل: عرض/ارتفاع/حجم > 0', () => {
  for (const entry of stills) {
    for (const asset of [entry.stillStart!, entry.stillEnd!]) {
      assert.ok(asset.width > 0 && asset.height > 0, `${entry.id}: مقاسات صفرية`)
      assert.ok(asset.bytes > 0, `${entry.id}: حجم ملف صفري`)
      assert.ok(asset.width <= 2000 && asset.height <= 2000, `${entry.id}: مقاس شاذ ${asset.width}x${asset.height}`)
    }
  }
})

check('سجلّات placeholder-only/missing كلها null الوسائط — لا نصف حالة', () => {
  for (const entry of entries) {
    if (entry.status === 'stills') continue
    assert.equal(entry.stillStart, null)
    assert.equal(entry.stillEnd, null)
    assert.equal(entry.source, null)
    assert.equal(entry.license, null)
  }
})

// ═══ 5) الواجهة المركّبة — زوج بداية/نهاية وحلّ المعرّفات القديمة ═══════════════

check('exerciseStillPair: زوج مركّب لتمرين مغطّى، وnull صادق لغير المغطّى', () => {
  const covered = stills[0]
  const pair = exerciseStillPair(covered.id)
  assert.ok(pair)
  assert.equal(pair!.start.path, covered.stillStart!.path)
  assert.equal(pair!.end.path, covered.stillEnd!.path)
  const uncovered = entries.find((e) => e.status !== 'stills')
  assert.ok(uncovered, 'يوجد غير مغطّى للاختبار')
  assert.equal(exerciseStillPair(uncovered!.id), null)
  assert.equal(exerciseStillPair('no-such-exercise'), null)
})

check('المعرّفات القديمة تُحلّ للقانونية (نفس سلوك مكوّن العرض)', () => {
  const legacyPair = Object.entries(LEGACY_EXERCISE_ID_MAP).find(
    ([, canonical]) => exerciseMediaManifest[canonical]?.status === 'stills',
  )
  assert.ok(legacyPair, 'يوجد معرّف قديم يقابل تمرينًا مغطّى')
  const [legacy, canonical] = legacyPair!
  const entry = getMediaManifestEntry(legacy)
  assert.ok(entry)
  assert.equal(entry!.id, canonical)
})

// ═══ 6) التحميل المسبق — «التالي فقط»، خانة واحدة، لا نموّ ═══════════════════

function imageFactory() {
  const created: { src: string }[] = []
  return {
    created,
    createImage: () => {
      const img = { src: '' }
      created.push(img)
      return img
    },
  }
}

check('preloadNextExercise يسخّن إطارَي التمرين المعطى فقط — لا أكثر', () => {
  clearPreloadedExercise()
  const factory = imageFactory()
  const target = stills[0]
  const paths = preloadNextExercise(target.id, { createImage: factory.createImage })
  assert.deepEqual(paths, [target.stillStart!.path, target.stillEnd!.path])
  assert.equal(factory.created.length, 2, 'صورتان فقط — لا تحميل جماعي')
  assert.deepEqual(
    factory.created.map((i) => i.src),
    [target.stillStart!.path, target.stillEnd!.path],
  )
  assert.equal(getPreloadedExerciseId(), target.id)
  assert.equal(preloadedImageCount(), 2)
})

check('استدعاء جديد يستبدل الخانة — الذاكرة محدودة بإطارين مهما تكرّر', () => {
  const factory = imageFactory()
  const [first, second, third] = stills
  preloadNextExercise(first.id, { createImage: factory.createImage })
  preloadNextExercise(second.id, { createImage: factory.createImage })
  preloadNextExercise(third.id, { createImage: factory.createImage })
  assert.equal(getPreloadedExerciseId(), third.id, 'الخانة للأخير فقط')
  assert.equal(preloadedImageCount(), 2, 'إطاران محجوزان لا ستة')
})

check('تمرين بلا وسائط أو مجهول: [] صادقة والخانة تُفرَّغ — لا استثناء', () => {
  const factory = imageFactory()
  preloadNextExercise(stills[0].id, { createImage: factory.createImage })
  const uncovered = entries.find((e) => e.status !== 'stills')!
  assert.deepEqual(preloadNextExercise(uncovered.id, { createImage: factory.createImage }), [])
  assert.equal(getPreloadedExerciseId(), null)
  assert.equal(preloadedImageCount(), 0)
  assert.deepEqual(preloadNextExercise('no-such-exercise', { createImage: factory.createImage }), [])
})

console.log(`\nبرهان كتالوج الوسائط: ${passed} فحصًا نجحت كلها ✓`)
