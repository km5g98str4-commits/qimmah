import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { type FoodItem, type FoodSize, provenanceDisclosure } from '@/data/foodItems'
import { getAppCatalog, isOffDerived } from '@/lib/food/catalog/appCatalog'
import type { RankedHit } from '@/lib/food/catalog/rank'
import { mergeUnified, rankCurated, rankPackaged } from '@/lib/food/unifiedSearch'
import { dataAttributionStrings } from '@/i18n/dict/dataAttribution'
import { useNutritionToday, type MealSlot } from '@/lib/nutritionTracking'
import { NUM_LIMITS, parseSafeNumber, sanitizeNumericInput } from '@/lib/validation'
import { getStrings } from '@/config/strings'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import type { Lang } from '@/lib/appPreferences'
import { trackLocal } from '@/lib/tracking'
import { reportMissingFood, type MissingFoodOutcome } from '@/lib/missingFoodReport'
import {
  deletePersonalFood,
  listPersonalFoodsByRecency,
  markPersonalFoodUsed,
  personalFoodPortion,
  savePersonalFood,
  searchPersonalFoods,
  type PersonalFood,
} from '@/lib/nutritionHistory'

/**
 * نتيجة البلاغ ⇒ نصّها. **لكل حالة نصّها** — لا رسالة عامّة تُخفي السبب،
 * ولا `default` يبتلع حالةً جديدة بصمت (المترجم يحرس الاكتمال بـ`never`).
 */
function reportOutcomeText(
  state: MissingFoodOutcome,
  d: { reportQueued: string; reportAlreadyQueued: string; reportRateLimited: string
       reportNeedsAccount: string; reportNoBackend: string; reportFailed: string },
): string {
  switch (state) {
    case 'queued': return d.reportQueued
    case 'already_queued': return d.reportAlreadyQueued
    case 'rate_limited': return d.reportRateLimited
    case 'not_authenticated': return d.reportNeedsAccount
    case 'backend_unconfigured': return d.reportNoBackend
    case 'invalid':
    case 'service_error': return d.reportFailed
  }
}
import { cn } from '@/lib/cn'
import { useAccess } from '@/lib/access/useAccess'

// يُحمَّل عند الحاجة فقط — مكتبة مسح الباركود ثقيلة ولا يلزم تحميلها إلا عند فتح الماسح.
const ScanFoodPanel = lazy(() => import('@/features/barcode/ScanFoodPanel').then((m) => ({ default: m.ScanFoodPanel })))

interface QuickMealLoggerProps {
  lang: Lang
  targetCalories: number
  targetProtein: number
  /** إخفاء وصفة الأهداف مع بقاء التسجيل الغذائي متاحًا. */
  showTargets?: boolean
  /** خانة الوجبة التي تُسجَّل تحتها الإضافات (افتراضيًا سناك). */
  defaultMeal?: MealSlot
  /** وضع مضمّن داخل قسم وجبة: يُظهر لوحة الإضافة فقط (بلا تقدّم/سجل/تنويه). */
  embedded?: boolean
  /** يُستدعى بعد إضافة عنصر للسجل (لإغلاق اللوحة في الوضع المضمّن). */
  onLogged?: () => void
}

/** [FOOD-UX-001] «أكلاتي» تبويب ثالث: الأطعمة المخصّصة المحفوظة تُسجَّل وتُعدَّل وتُحذف منه. */
type Tab = 'search' | 'custom' | 'mine'

/** تقريب حصة المستخدم: خانة عشرية واحدة (300.5 تبقى 300.5 لا 301). */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round(n: number): number {
  return Math.round(n)
}

/** مسجّل وجبات سريع — بحث في قاعدة الأطعمة أو إضافة سعرات/بروتين مخصّصة، مع تقدّم يومي. */
export function QuickMealLogger({ lang, targetCalories, targetProtein, showTargets = true, defaultMeal, embedded = false, onLogged }: QuickMealLoggerProps) {
  const t = getStrings(lang).nutrition
  const d = nutritionScreenStrings[lang]
  const { state, totals, addLog, removeLog: rawRemoveLog } = useNutritionToday()
  const { guard } = useAccess()

  const [open, setOpen] = useState(embedded)
  const [tab, setTab] = useState<Tab>('search')
  const [scanOpen, setScanOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** حالة بلاغ الصنف الناقص. `idle` ⇒ لم يُرسَل بعد. */
  const [reportState, setReportState] = useState<'idle' | 'sending' | MissingFoodOutcome>('idle')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  /** الحجم المختار (صغير/وسط/كبير) عندما يملك العنصر أحجامًا — يقود الماكروز الأساسية. */
  const [sizeId, setSizeId] = useState<string | null>(null)
  /** الكمية بالغرام (الإدخال الأساسي) — تبدأ من غرامات الحصة المرجعية للعنصر. */
  const [grams, setGrams] = useState('')
  /**
   * [CTO-009/WP-4] وحدة الإدخال المعروضة. **الغرام يبقى وحدة الحساب الوحيدة**:
   * الحصة مدخل عرضٍ يُحوَّل إلى غرام قبل أي حساب ماكروز، فلا يوجد مساران
   * للحقيقة ولا تقريب فوق تقريب.
   */
  const [unit, setUnit] = useState<'g' | 'serv'>('g')
  const [servingsInput, setServingsInput] = useState('')
  const [saveError, setSaveError] = useState(false)
  const removeLog = guard('nutrition.removeFood', (id: string) => {
    if (rawRemoveLog(id)) setSaveError(false)
    else setSaveError(true)
  })

  // إضافة سريعة / طعام مخصّص
  const [cName, setCName] = useState('')
  const [cCal, setCCal] = useState('')
  const [cProt, setCProt] = useState('')
  const [cCarb, setCCarb] = useState('')
  const [cFat, setCFat] = useState('')
  /** [FOOD-UX-001] الحفظ في «أكلاتي» — افتراضيًا نعم: ما يُسجَّل مرّة يُطلب غدًا. */
  const [saveToMine, setSaveToMine] = useState(true)
  /** معرّف الأكلة قيد التعديل (من تبويب «أكلاتي») — الحفظ حينها تعديل لا تسجيل. */
  const [editingId, setEditingId] = useState<string | null>(null)
  /** نسخة قائمة «أكلاتي» — تُرفع بعد كل كتابة لتُعاد القراءة من المخزن (مصدر واحد). */
  const [mineVersion, setMineVersion] = useState(0)
  const [mineMsg, setMineMsg] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  /** أكلة شخصية مختارة للتسجيل بمضاعف حصص. */
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalFood | null>(null)
  const [pServings, setPServings] = useState('1')
  const [mineList, setMineList] = useState<PersonalFood[]>(() => listPersonalFoodsByRecency())
  /** مطابقات «أكلاتي» لاستعلام البحث نفسه — تظهر فوق نتائج القاعدة بشارة. */
  const [personalHits, setPersonalHits] = useState<PersonalFood[]>([])
  useEffect(() => {
    setMineList(listPersonalFoodsByRecency())
    setPersonalHits(query.trim().length >= 1 ? searchPersonalFoods(query) : [])
  }, [query, mineVersion])

  /**
   * المصدر المنسَّق (٦٤١ صنفًا: شاورما · كبسة · مندي · برجر بسلاسلها السعودية) —
   * **متزامن وفوري** كما كان: لا ينتظر المستخدم شبكة ليرى أكله. الفرق أنه يمرّ
   * الآن بطبقة الاتحاد، فتُحسب **قوّة** مطابقته على السلّم نفسه الذي يُقاس به
   * المعبّأ — بدل قصٍّ أعمى عند ١٠ يُسقِط تطابقًا قويًّا بلا مقارنة.
   */
  const curatedResults = useMemo(() => rankCurated(query), [query])

  /**
   * مرشّحو الكتالوج المعبّأ (الطقم الساخن — سلع باركود).
   *
   * مؤجَّلون ٢٥٠ ملّي وغير متزامنين: المنسَّق يظهر فورًا والمعبّأ يلحق. وبلا
   * التأجيل يتحوّل كل حرف إلى استعلام، وهو ما تمنعه هذه الحزمة أصلًا.
   * تُحفظ **الرتبة** لا السجل المجرّد، لأن الدمج المرتَّب يحتاجها.
   *
   * ═══ الذيل الطويل يصل من هنا — بلا `deepShards` ═══
   * `rankPackaged` يشعل حزم البحث افتراضيًا. الشاشة **لا تسمّي شريحة ولا تعرف
   * واحدة**، وهذا هو المقصود: الشرائح موزَّعة بالـGTIN ومن يكتب اسمًا لا يملكه.
   * الكلمة تعرف حزمتها، فالطلب واحد ومخبّأ.
   *
   * **وكتابة حرف إضافي لا تكلّف طلبًا:** «kin» و«kind» و«kinde» حزمةٌ واحدة
   * (`kin`) — أوّل ثلاثة محارف هي المفتاح. فالتأجيل ٢٥٠ ملّي يحمي أوّل حرف،
   * والذاكرة المؤقتة تحمي كل ما بعده.
   */
  const [packagedHits, setPackagedHits] = useState<RankedHit[]>([])
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setPackagedHits([]); return }
    let alive = true
    const timer = setTimeout(async () => {
      const cat = await getAppCatalog()
      if (!cat || !alive) return
      const hits = await rankPackaged(cat, q)
      if (alive) setPackagedHits(hits)
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [query])

  /** قائمة **واحدة** مرتّبة بقوّة المطابقة — لا لصق مصدرٍ فوق مصدر. */
  const unified = useMemo(
    () => mergeUnified(curatedResults, packagedHits, lang),
    [curatedResults, packagedHits, lang],
  )
  const results = useMemo(() => unified.map((r) => r.item), [unified])
  /** النسب يظهر **فقط** حين تظهر نتائج مشتقّة من OFF — لا على الأصناف المحلية. */
  const showsOffResults = useMemo(() => results.some((r) => isOffDerived(r.id)), [results])

  // [CTO-68] الحدث ٨ — بحث طعام بلا نتيجة، بنصّ الاستعلام: فجوة مباشرة في قاعدة الطعام.
  //
  // مؤجَّل ٧٠٠ ملّي: بلا تأجيل يُسجَّل كل حرف أثناء الكتابة («ك» ثم «كب» ثم «كبس»)
  // فيمتلئ المخزن الدوّار بضجيج ويطرد أحداثًا حقيقية. التأجيل يجعل المسجَّل ما
  // **استقرّ** عليه المستخدم، وحارس التكرار يمنع تسجيل نفس الاستعلام مرّتين.
  const lastReportedQuery = useRef('')
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || results.length > 0) return
    if (lastReportedQuery.current === q) return
    const timer = setTimeout(() => {
      lastReportedQuery.current = q
      trackLocal('food_search_no_result', { query: q })
    }, 700)
    return () => clearTimeout(timer)
  }, [query, results.length])

  const eatenCal = round(totals.calories)
  const eatenProt = round(totals.protein)
  const remCal = Math.max(0, targetCalories - eatenCal)
  const remProt = Math.max(0, targetProtein - eatenProt)

  // الحجم المختار (إن وُجد) والقيم الأساسية الفعّالة: من الحجم المختار وإلا من العنصر نفسه.
  const activeSize = selected?.sizes?.find((s) => s.id === sizeId) ?? null
  const baseCal = activeSize?.calories ?? selected?.calories ?? 0
  const baseProt = activeSize?.protein ?? selected?.protein ?? 0
  // [PARTIAL-NUTRITION-001] الكارب/الدهون قد تكون غير متوفّرة في المصدر — تبقى undefined (تُعرض «غير متوفّر» ولا تُسجَّل صفرًا).
  const baseCarb: number | undefined = activeSize?.carbs ?? selected?.carbs
  const baseFat: number | undefined = activeSize?.fat ?? selected?.fat
  const baseServingLabel = activeSize?.servingLabelAr ?? selected?.servingLabelAr ?? ''
  // غرامات الحصة المرجعية للقيم الفعّالة (أساس التحويل لكل غرام).
  const baseGrams = activeSize
    ? activeSize.servingGrams
    : (selected?.servingGrams && selected.servingGrams > 0 ? selected.servingGrams : 100)
  // الكمية الحالية بالغرام والعامل النسبي مقابل الحصة المرجعية.
  // [CTO-009/WP-4] مدخل الحصة **يمرّ من هنا** ويتحوّل إلى غرام قبل أي حساب:
  // نقطة تحويل واحدة ⇒ الماكروز والتسمية والتخزين كلها تقرأ الرقم نفسه.
  const gramsNum =
    unit === 'serv'
      ? Math.min(3000, Math.max(1, Math.round(parseSafeNumber(servingsInput, { min: 0.25, max: 20, fallback: 1 }) * baseGrams)))
      : parseSafeNumber(grams, { min: 1, max: 3000, fallback: baseGrams })
  const factor = gramsNum / baseGrams

  // اختيار عنصر من النتائج: يضبط الحجم الافتراضي (وسط إن وُجد) والغرامات المطابقة له.
  const selectItem = (f: FoodItem) => {
    setSelected(f)
    const defSize = f.sizes ? (f.sizes.find((s) => s.labelAr === 'وسط') ?? f.sizes[0]) : null
    setSizeId(defSize?.id ?? null)
    const g = defSize ? defSize.servingGrams : (f.servingGrams && f.servingGrams > 0 ? f.servingGrams : 100)
    setGrams(String(g))
  }

  // اختيار حجم: يحدّث القيم الأساسية والغرامات المرجعية لذلك الحجم.
  const pickSize = (s: FoodSize) => {
    setSizeId(s.id)
    setGrams(String(s.servingGrams))
  }

  const addSelected = guard('nutrition.addFood', () => {
    if (!selected) return
    const name = lang === 'en' ? selected.nameEn : selected.nameAr
    const sizeLabel = activeSize ? ` (${lang === 'en' ? activeSize.labelEn : activeSize.labelAr})` : ''
    const saved = addLog({
      label: `${name}${sizeLabel}`,
      servings: factor,
      grams: gramsNum,
      foodId: selected.id,
      unit: unit === 'serv' ? 'serving' : 'g',
      calories: round(baseCal * factor),
      protein: round(baseProt * factor),
      ...(typeof baseCarb === 'number' ? { carbs: round(baseCarb * factor) } : {}),
      ...(typeof baseFat === 'number' ? { fat: round(baseFat * factor) } : {}),
      meal: defaultMeal,
    })
    if (!saved) {
      setSaveError(true)
      return
    }
    // [CTO-68] الحدث ٩ — تسجيل وجبة، بعد الإضافة الفعلية لسجلّ اليوم.
    trackLocal('meal_entry_logged', { slot: defaultMeal ?? 'unspecified' })
    setSelected(null)
    setSizeId(null)
    setQuery('')
    setGrams('')
    setSaveError(false)
    onLogged?.()
  })

  // سعرات/بروتين الإضافة الحالية (محصورة ضمن الحدود — لا قيم سالبة أو مستحيلة)
  // [FOOD-UX-001] القيم بكسورها: 300.5 سعرة و27.5 غ بروتين تُحفظ كما كُتبت (خانة عشرية).
  const cal = round1(parseSafeNumber(cCal, { min: 0, max: NUM_LIMITS.quickCalories.max }))
  const prot = round1(parseSafeNumber(cProt, { min: 0, max: NUM_LIMITS.quickProtein.max }))
  const carbVal: number | undefined = cCarb.trim() ? round1(parseSafeNumber(cCarb, { min: 0, max: NUM_LIMITS.quickMacro.max })) : undefined
  const fatVal: number | undefined = cFat.trim() ? round1(parseSafeNumber(cFat, { min: 0, max: NUM_LIMITS.quickMacro.max })) : undefined
  const canAddCustom = cal > 0 || prot > 0
  const customName = cName.trim()

  const resetCustomForm = () => {
    setCName('')
    setCCal('')
    setCProt('')
    setCCarb('')
    setCFat('')
    setEditingId(null)
  }

  /** يفتح نموذج المخصّص بقيم أكلة محفوظة — الحفظ بعدها تعديلٌ لا تسجيل. */
  const startEditPersonal = (f: PersonalFood) => {
    setCName(f.nameAr)
    setCCal(String(f.calories))
    setCProt(String(f.protein))
    setCCarb(typeof f.carbs === 'number' ? String(f.carbs) : '')
    setCFat(typeof f.fat === 'number' ? String(f.fat) : '')
    setEditingId(f.id)
    setMineMsg(null)
    setSelectedPersonal(null)
    setTab('custom')
  }

  const addCustom = guard('nutrition.quickAdd', () => {
    if (!canAddCustom) return
    const input = { nameAr: customName, calories: cal, protein: prot, ...(carbVal !== undefined ? { carbs: carbVal } : {}), ...(fatVal !== undefined ? { fat: fatVal } : {}) }
    // وضع التعديل: يُحدَّث السجل الشخصي فقط — لا يُسجَّل لليوم شيء لم يطلبه المستخدم.
    if (editingId) {
      const res = savePersonalFood(input, editingId)
      if (res.status !== 'ok') { setSaveError(true); return }
      setSaveError(false)
      setMineVersion((v) => v + 1)
      setMineMsg(d.mineUpdated)
      resetCustomForm()
      setTab('mine')
      return
    }
    const saved = addLog({
      label: customName || d.quickAddLabel,
      servings: 1,
      unit: 'serving',
      calories: cal,
      protein: prot,
      // الحقلان اختياريان: الفارغ يبقى غير معروف لا صفرًا.
      ...(carbVal !== undefined ? { carbs: carbVal } : {}),
      ...(fatVal !== undefined ? { fat: fatVal } : {}),
      meal: defaultMeal,
      note: customName || undefined,
    })
    if (!saved) {
      setSaveError(true)
      return
    }
    // نفس الحدث ٩ — الإضافة السريعة/المخصّصة تسجيل وجبة أيضًا، ولو بلا عنصر من القاعدة.
    trackLocal('meal_entry_logged', { slot: defaultMeal ?? 'unspecified' })
    // الحفظ في «أكلاتي» بعد نجاح التسجيل: اسم موجود ⇒ يُحدَّث لا يُكرَّر. فشل الحفظ
    // لا يُخفي نجاح التسجيل ولا يدّعي حفظًا — يُعرض كخطأ حفظ مسمّى.
    if (saveToMine && customName) {
      const res = savePersonalFood(input)
      if (res.status === 'ok') { setMineVersion((v) => v + 1); setMineMsg(d.mineSaved) }
      else if (res.status === 'storage') { setSaveError(true); return }
    }
    resetCustomForm()
    setSaveError(false)
    onLogged?.()
  })

  /** تسجيل أكلة شخصية بمضاعف حصص — الحساب في `personalFoodPortion` لا هنا. */
  const pServingsNum = parseSafeNumber(pServings, { min: 0.25, max: 20, fallback: 1 })
  const addPersonal = guard('nutrition.addFood', () => {
    if (!selectedPersonal) return
    const portion = personalFoodPortion(selectedPersonal, pServingsNum)
    const saved = addLog({
      label: selectedPersonal.nameAr,
      servings: portion.servings,
      unit: 'serving',
      foodId: `personal:${selectedPersonal.id}`,
      calories: portion.calories,
      protein: portion.protein,
      ...(portion.carbs !== undefined ? { carbs: portion.carbs } : {}),
      ...(portion.fat !== undefined ? { fat: portion.fat } : {}),
      ...(portion.grams !== undefined ? { grams: portion.grams } : {}),
      meal: defaultMeal,
    })
    if (!saved) { setSaveError(true); return }
    trackLocal('meal_entry_logged', { slot: defaultMeal ?? 'unspecified' })
    markPersonalFoodUsed(selectedPersonal.id)
    setMineVersion((v) => v + 1)
    setSelectedPersonal(null)
    setPServings('1')
    setQuery('')
    setSaveError(false)
    onLogged?.()
  })

  const removePersonal = (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    const ok = deletePersonalFood(id)
    setConfirmDeleteId(null)
    setMineMsg(ok ? null : d.mineDeleteFailed)
    if (ok && editingId === id) resetCustomForm()
    setMineVersion((v) => v + 1)
  }

  return (
    <div className={embedded ? '' : 'card p-5'}>
      {!embedded && showTargets && (
        <>
          {/* التقدّم اليومي */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink-700">{t.calories}</span>
                <span className="text-ink-500">
                  <span className="font-bold text-ink-900">{eatenCal}</span> / {targetCalories}
                </span>
              </div>
              <ProgressBar current={eatenCal} target={targetCalories || 1} color="bg-orange-500" className="mt-2" />
              <p className="mt-1 text-[11px] text-ink-400">{t.remainingCalories}: <span className="font-bold text-ink-700">{remCal}</span></p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink-700">{t.protein}</span>
                <span className="text-ink-500">
                  <span className="font-bold text-ink-900">{eatenProt}</span> / {targetProtein}{t.gramsUnit}
                </span>
              </div>
              <ProgressBar current={eatenProt} target={targetProtein || 1} color="bg-brand-500" className="mt-2" />
              <p className="mt-1 text-[11px] text-ink-400">{t.remainingProtein}: <span className="font-bold text-ink-700">{remProt}{t.gramsUnit}</span></p>
            </div>
          </div>

          {/* أزرار الفتح */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setOpen((v) => !v); setTab('search') }}
              className="btn-primary min-h-[44px] px-4 py-2 text-xs"
            >
              <Icon name="Utensils" className="h-4 w-4" />
              {t.logMeal}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(true); setTab('custom') }}
              className="btn-ghost min-h-[44px] px-4 py-2 text-xs"
            >
              <Icon name="Plus" className="h-4 w-4" />
              {t.quickAdd}
            </button>
          </div>
        </>
      )}

      {saveError && <p role="alert" className="v2-error-panel mt-3 rounded-xl border px-3 py-2 text-xs font-bold text-ink-900">{d.saveFailed}</p>}

      {open && (
        <div className="mt-4 rounded-xl border border-line bg-page p-4">
          {/* تبويبات */}
          <div className="mb-3 flex gap-2">
            <TabBtn active={tab === 'search'} onClick={() => setTab('search')} label={t.searchFood} />
            <TabBtn active={tab === 'custom'} onClick={() => setTab('custom')} label={t.customQuickAdd} />
            <TabBtn active={tab === 'mine'} onClick={() => { setTab('mine'); setMineMsg(null) }} label={d.tabMine} testId="tab-mine" />
          </div>

          {tab === 'search' ? (
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Icon name="Search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 ms-3" />
                  <input
                    type="text"
                    aria-label={t.searchFood}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); setSizeId(null); setSelectedPersonal(null) }}
                    placeholder={t.searchFood}
                    className="min-h-[44px] w-full rounded-lg border border-line bg-surface py-2 ps-9 pe-3 text-base text-ink-900 outline-none focus:border-primary-c"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="btn-ghost min-h-[44px] shrink-0 px-3 py-2 text-xs"
                >
                  <Icon name="Camera" className="h-4 w-4" />
                  {d.scanBarcode}
                </button>
              </div>

              {!selected && !selectedPersonal && query.trim() && (
                <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {/* [FOOD-UX-001] أكلات المستخدم المحفوظة أوّلًا — بشارة تميّزها عن القاعدة. */}
                  {personalHits.map((f) => (
                    <li key={`pf-${f.id}`}>
                      <button
                        type="button"
                        data-testid="personal-hit"
                        onClick={() => { setSelectedPersonal(f); setPServings('1') }}
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 p-3 text-start hover:bg-beige"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-ink-900"><bdi>{f.nameAr}</bdi></span>
                            <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary-c">{d.mineBadge}</span>
                          </span>
                          <span className="block text-[11px] text-ink-400">{d.perServing}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-orange-300">{f.calories} · {f.protein}{t.gramsUnit}</span>
                      </button>
                    </li>
                  ))}
                  {/* ═══ [COMMISSIONING §7] الحلقة الراجعة تبدأ من هنا ═══
                      البحث الفاشل كان يُسجَّل محلّيًا فقط: يعرف به الجهاز ولا
                      يعرفه أحد. فالمستخدم يفقد وجبته، والمؤسس لا يعرف أنّ أحدًا
                      بحث عنها. الآن يصل البلاغ طابور مراجعة.

                      ولا يُرسَل إلا **نصّ ما بحث عنه** — لا سعرات ولا تخمين
                      (التكليف: «لا تختلق قيمًا غذائية»). والنصّ لا يَعِد بموعد:
                      «نراجعه ونضيفه لو ضبط» لا «بنضيفه». */}
                  {results.length === 0 && personalHits.length === 0 && (
                    <li className="p-3 text-xs text-ink-400">
                      <span>{d.noResults}</span>
                      {reportState === 'idle' ? (
                        <button
                          type="button"
                          data-testid="report-missing-food"
                          onClick={() => {
                            const q = query.trim()
                            if (!q) return
                            setReportState('sending')
                            void reportMissingFood({ query: q, lang }).then(setReportState)
                          }}
                          className="btn-ghost ms-2 min-h-[36px] px-2.5 py-1 text-[11px] font-bold"
                        >
                          {d.reportMissing}
                        </button>
                      ) : (
                        <span
                          role="status"
                          data-testid="report-missing-result"
                          data-report-state={reportState}
                          className="ms-2 font-bold text-ink-700"
                        >
                          {reportState === 'sending' ? '…' : reportOutcomeText(reportState, d)}
                        </span>
                      )}
                      {reportState === 'idle' ? (
                        <span className="mt-1 block text-[10px] text-ink-400">{d.reportMissingHint}</span>
                      ) : null}
                    </li>
                  )}
                  {results.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => selectItem(f)}
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 p-3 text-start hover:bg-beige"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? f.nameEn : f.nameAr}</span>
                            {f.sizes && (
                              <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary-c">
                                {lang === 'en' ? `${f.sizes.length} sizes` : `${f.sizes.length} أحجام`}
                              </span>
                            )}
                          </span>
                          {/* عزل اتجاه: تسمية الحصة عربية دائمًا وقد تُعرض داخل واجهة إنجليزية (LTR). */}
                        <span className="block text-[11px] text-ink-400"><bdi>{f.servingLabelAr}</bdi> · {f.category}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-orange-300">{f.calories} · {f.protein}{t.gramsUnit}</span>
                      </button>
                    </li>
                  ))}
                  {/*
                    نسب ODbL — يظهر **فقط** حين تتضمّن النتائج سجلًا مشتقًّا من OFF.
                    إظهاره دائمًا كان سينسب أصناف قِمّة المنسَّقة إلى مصدر لم تأتِ منه.
                  */}
                  {showsOffResults && (
                    <li
                      data-testid="off-attribution-search"
                      className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-ink-400"
                    >
                      {dataAttributionStrings[lang].packagedFood}
                    </li>
                  )}
                </ul>
              )}

              {selectedPersonal && (
                <PersonalPortionPanel
                  food={selectedPersonal}
                  servings={pServings}
                  onServings={setPServings}
                  portion={personalFoodPortion(selectedPersonal, pServingsNum)}
                  onAdd={addPersonal}
                  onEdit={() => startEditPersonal(selectedPersonal)}
                  t={t}
                  d={d}
                />
              )}

              {selected && (
                <div className="mt-3 rounded-lg border border-line bg-surface p-3">
                  {/* عزل اتجاه: منتجات الباركود قد تحمل اسمًا عربيًا حتى في الوضع الإنجليزي. */}
                  <p className="text-sm font-bold text-ink-900"><bdi>{lang === 'en' ? selected.nameEn : selected.nameAr}</bdi></p>

                  {/* اختيار الحجم (صغير/وسط/كبير) — كل حجم بسعراته الخاصة */}
                  {selected.sizes && (
                    <div className="mt-2">
                      <p className="mb-1.5 text-[11px] font-bold text-ink-500">{lang === 'en' ? 'Size' : 'الحجم'}</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.sizes.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => pickSize(s)}
                            className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                              sizeId === s.id ? 'bg-primary text-white' : 'bg-beige text-ink-600 hover:text-ink-900'
                            }`}
                          >
                            {lang === 'en' ? s.labelEn : s.labelAr}
                            <span className={`ms-1 text-[10px] font-normal ${sizeId === s.id ? 'text-white/80' : 'text-ink-400'}`}>{s.calories}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* عرض واضح: لكل حصة + لكل 100غ */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink-400">
                    <span>{t.perPortion} (<bdi>{baseServingLabel}</bdi>): <span className="font-bold text-ink-600">{baseCal} {t.calories} · {baseProt}{t.gramsUnit} {t.protein}</span></span>
                    <span>{t.per100g}: <span className="font-bold text-ink-600">{round(baseCal * 100 / baseGrams)} {t.calories} · {round(baseProt * 100 / baseGrams)}{t.gramsUnit} {t.protein}</span></span>
                  </div>
                  {/* [CTO-009/WP-4] الكمية: غرام **أو** حصة.
                      الغرام يبقى وحدة الحساب الوحيدة داخليًا — الحصة تُحوَّل إليه
                      عند الإدخال (`حصص × غرامات الحصة`) ولا تُخزَّن كمسار حساب
                      ثانٍ. فلا سلطتان على الماكروز، ولا تقريب مركّب.
                      ولا تُخترع حصة حين لا توجد: كل الأصناف (٥٥٩) تحمل
                      `servingGrams`، وإن غاب يومًا يسقط الخيار من تلقائه. */}
                  <div className="mt-3 space-y-2">
                    <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="group" aria-label={t.gramsAmount}>
                      {(['g', 'serv'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          aria-pressed={unit === u}
                          onClick={() => setUnit(u)}
                          className={cn(
                            'min-h-[44px] rounded-lg px-3 text-[11px] font-bold transition-colors',
                            unit === u ? 'bg-primary text-white' : 'text-ink-700 hover:bg-beige',
                          )}
                        >
                          {u === 'g' ? d.unitGrams : d.unitServings}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="qml-amount" className="text-xs text-ink-500">{t.gramsAmount}</label>
                      <input
                        id="qml-amount"
                        type="number"
                        inputMode="decimal"
                        min={unit === 'g' ? 1 : 0.25}
                        max={unit === 'g' ? 3000 : 20}
                        step={unit === 'g' ? 10 : 0.25}
                        value={unit === 'g' ? grams : servingsInput}
                        onChange={(e) =>
                          unit === 'g'
                            ? setGrams(sanitizeNumericInput(e.target.value, { max: 3000 }))
                            : setServingsInput(sanitizeNumericInput(e.target.value, { max: 20, decimal: true }))
                        }
                        className="min-h-[44px] w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-base text-ink-900 outline-none focus:border-primary-c"
                      />
                      <span className="text-xs text-ink-400">{unit === 'g' ? t.gramsUnit : d.servingsUnit}</span>
                    </div>
                    {/* المكافئ معروض دائمًا — المستخدم يرى ما سيُسجَّل فعلًا لا ما كتبه. */}
                    <p className="text-[11px] text-ink-400">
                      {d.equalsApprox}{' '}
                      <span className="font-bold text-ink-600">
                        {unit === 'g'
                          ? `${round(gramsNum / baseGrams * 100) / 100} ${d.servingsUnit}`
                          : `${gramsNum}${t.gramsUnit}`}
                      </span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                    <Stat label={t.calories} value={round(baseCal * factor)} />
                    <Stat label={t.protein} value={`${round(baseProt * factor)}${t.gramsUnit}`} />
                    <Stat label={t.carbs} value={typeof baseCarb === 'number' ? `${round(baseCarb * factor)}${t.gramsUnit}` : t.nutrientUnknown} />
                    <Stat label={t.fat} value={typeof baseFat === 'number' ? `${round(baseFat * factor)}${t.gramsUnit}` : t.nutrientUnknown} />
                  </div>
                  {/* [PARTIAL-NUTRITION-001] إفصاح المصدر سطرًا واحدًا — الأجنبي «بيانات مرجعية»، الوكيل «أقرب سجلّ». */}
                  {selected && provenanceDisclosure(selected.provenance, lang) && (
                    <p data-testid="food-provenance" className="mt-2 text-[11px] text-ink-400">{provenanceDisclosure(selected.provenance, lang)}</p>
                  )}
                  <button type="button" onClick={addSelected} className="btn-primary mt-3 min-h-[44px] w-full justify-center py-2 text-xs">
                    <Icon name="Plus" className="h-4 w-4" />
                    {t.addToLog}
                  </button>
                </div>
              )}
            </div>
          ) : tab === 'custom' ? (
            <div className="grid grid-cols-2 gap-3" data-testid="custom-food-form" data-editing={editingId ?? undefined}>
              {editingId && (
                <p className="col-span-2 flex items-center justify-between text-xs font-bold text-ink-700">
                  <span>{d.mineEditing}</span>
                  <button type="button" onClick={resetCustomForm} className="btn-ghost min-h-[36px] px-2.5 py-1 text-[11px]">{d.cancelEdit}</button>
                </p>
              )}
              <div className="col-span-2">
                <label htmlFor="qml-custom-name" className="text-xs text-ink-500">{t.foodName}{editingId ? '' : ` — ${t.optional}`}</label>
                <input
                  id="qml-custom-name"
                  type="text"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder={d.foodNameExample}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink-900 outline-none focus:border-primary-c"
                />
              </div>
              <Field label={`${t.calories} (0–${NUM_LIMITS.quickCalories.max})`} value={cCal} onChange={setCCal} max={NUM_LIMITS.quickCalories.max} placeholder="0" />
              <Field label={`${t.protein} (${t.gramsUnit})`} value={cProt} onChange={setCProt} max={NUM_LIMITS.quickProtein.max} placeholder="0" />
              <Field label={`${t.carbs} (${t.gramsUnit}) — ${t.optional}`} value={cCarb} onChange={setCCarb} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              <Field label={`${t.fat} (${t.gramsUnit}) — ${t.optional}`} value={cFat} onChange={setCFat} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              {!editingId && (
                <label className="col-span-2 flex min-h-[44px] items-center gap-2 text-xs text-ink-700">
                  <input type="checkbox" data-testid="save-to-mine" checked={saveToMine} onChange={(e) => setSaveToMine(e.target.checked)} className="h-5 w-5 accent-primary" />
                  {d.saveToMine}
                </label>
              )}
              <button type="button" data-testid="custom-submit" onClick={addCustom} disabled={!canAddCustom || (!!editingId && !customName)} className="btn-primary col-span-2 min-h-[44px] justify-center py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                <Icon name={editingId ? 'Check' : 'Plus'} className="h-4 w-4" />
                {editingId ? d.saveEdit : saveToMine && customName ? d.logAndSave : t.addToLog}
              </button>
              {!canAddCustom && (
                <p className="col-span-2 text-[11px] text-ink-400">{t.quickAddHint}</p>
              )}
              {canAddCustom && !editingId && saveToMine && !customName && (
                <p className="col-span-2 text-[11px] text-ink-400">{d.saveNeedsName}</p>
              )}
            </div>
          ) : (
            <div data-testid="mine-list">
              {mineMsg && <p role="status" data-testid="mine-message" className="mb-2 text-xs font-bold text-ink-700">{mineMsg}</p>}
              {selectedPersonal && (
                <PersonalPortionPanel
                  food={selectedPersonal}
                  servings={pServings}
                  onServings={setPServings}
                  portion={personalFoodPortion(selectedPersonal, pServingsNum)}
                  onAdd={addPersonal}
                  onEdit={() => startEditPersonal(selectedPersonal)}
                  t={t}
                  d={d}
                />
              )}
              {mineList.length === 0 ? (
                <p className="text-xs text-ink-400" data-testid="mine-empty">{d.mineEmpty}</p>
              ) : (
                <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {mineList.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 p-2" data-testid="mine-row">
                      <button
                        type="button"
                        onClick={() => { setSelectedPersonal(f); setPServings('1') }}
                        className="min-h-[44px] min-w-0 flex-1 text-start"
                        aria-label={`${d.mineLog}: ${f.nameAr}`}
                      >
                        <span className="block truncate text-sm font-bold text-ink-900"><bdi>{f.nameAr}</bdi></span>
                        <span className="block text-[11px] text-ink-400">
                          {f.calories} {d.caloriesUnit} · {f.protein}{t.gramsUnit} {t.protein}
                          {typeof f.carbs === 'number' ? ` · ${f.carbs}${t.gramsUnit} ${t.carbs}` : ''}
                          {typeof f.fat === 'number' ? ` · ${f.fat}${t.gramsUnit} ${t.fat}` : ''}
                          {' · '}{d.perServing}
                        </span>
                      </button>
                      <button type="button" onClick={() => startEditPersonal(f)} aria-label={`${d.mineEdit}: ${f.nameAr}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-beige hover:text-ink-900">
                        <Icon name="Edit3" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePersonal(f.id)}
                        aria-label={`${confirmDeleteId === f.id ? d.mineConfirmDelete : d.mineDelete}: ${f.nameAr}`}
                        data-testid={confirmDeleteId === f.id ? 'mine-delete-confirm' : 'mine-delete'}
                        className={cn('flex h-11 shrink-0 items-center justify-center rounded-lg px-2 text-ink-400 hover:bg-beige hover:text-danger', confirmDeleteId === f.id && 'bg-danger/10 text-danger text-[11px] font-bold')}
                      >
                        {confirmDeleteId === f.id ? d.mineConfirmDelete : <Icon name="Trash2" className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!embedded && (
        <>
          {/* سجل اليوم */}
          <div className="mt-4">
            <p className="text-xs font-bold text-ink-700">{t.todayLog}</p>
            {state.log.length === 0 ? (
              <p className="mt-2 text-xs text-ink-400">{t.emptyLog}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {state.log.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      {/* عزل اتجاه: تسمية السجل تحمل اسم الطعام (عربي/مدخل من المستخدم) وقد تُعرض في الاتجاه المعاكس. */}
                      <span className="block truncate text-sm text-ink-900"><bdi>{e.label}</bdi></span>
                      <span className="block text-[11px] text-ink-400">{e.calories} {d.caloriesUnit} · {e.protein}{t.gramsUnit} {d.caloriesDotProteinG}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLog(e.id)}
                      aria-label={`${t.removeEntry}: ${e.label}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-beige hover:text-danger"
                    >
                      <Icon name="Trash2" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-400">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.estimateNote}
          </p>
        </>
      )}

      {scanOpen && (
        <Suspense fallback={null}>
          <ScanFoodPanel
            lang={lang}
            onClose={() => setScanOpen(false)}
            onResolved={(item) => {
              setScanOpen(false)
              setTab('search')
              selectItem(item)
            }}
            onManualFallback={() => {
              setScanOpen(false)
              setTab('custom')
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, label, testId }: { active: boolean; onClick: () => void; label: string; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? 'bg-primary text-white' : 'bg-beige text-ink-500 hover:text-ink-900'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <label className="block text-xs text-ink-500">
      {label}
      {/* [FOOD-UX-001] عشري: لوحة مفاتيح عشرية على الجوال + step="any" فلا يرفض المتصفّح 27.5 + تعقيم يقبل النقطة والفاصلة و«٫». */}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={max}
        step="any"
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value, { max, decimal: true }))}
        placeholder={placeholder}
        className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink-900 outline-none focus:border-primary-c"
      />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-ink-900">{value}</span>
      <span>{label}</span>
    </span>
  )
}

/** لوحة تسجيل أكلة شخصية: الحصة × مضاعف — تعرض ما سيُسجَّل فعلًا قبل الضغط. */
function PersonalPortionPanel({ food, servings, onServings, portion, onAdd, onEdit, t, d }: {
  food: PersonalFood
  servings: string
  onServings: (v: string) => void
  portion: ReturnType<typeof personalFoodPortion>
  onAdd: () => void
  onEdit: () => void
  t: ReturnType<typeof getStrings>['nutrition']
  d: (typeof nutritionScreenStrings)['ar']
}) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-3" data-testid="personal-portion">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-ink-900"><bdi>{food.nameAr}</bdi></p>
        <button type="button" onClick={onEdit} className="btn-ghost min-h-[36px] shrink-0 px-2.5 py-1 text-[11px]">{d.mineEdit}</button>
      </div>
      <p className="mt-1 text-[11px] text-ink-400">
        {d.perServing}: <span className="font-bold text-ink-600">{food.calories} {t.calories} · {food.protein}{t.gramsUnit} {t.protein}</span>
        {typeof food.grams === 'number' ? <span> · {food.grams}{t.gramsUnit}</span> : null}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="qml-personal-servings" className="text-xs text-ink-500">{d.servingsLabel}</label>
        <input
          id="qml-personal-servings"
          type="number"
          inputMode="decimal"
          min={0.25}
          max={20}
          step="any"
          value={servings}
          onChange={(e) => onServings(sanitizeNumericInput(e.target.value, { max: 20, decimal: true }))}
          className="min-h-[44px] w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-base text-ink-900 outline-none focus:border-primary-c"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
        <Stat label={t.calories} value={portion.calories} />
        <Stat label={t.protein} value={`${portion.protein}${t.gramsUnit}`} />
        <Stat label={t.carbs} value={typeof portion.carbs === 'number' ? `${portion.carbs}${t.gramsUnit}` : t.nutrientUnknown} />
        <Stat label={t.fat} value={typeof portion.fat === 'number' ? `${portion.fat}${t.gramsUnit}` : t.nutrientUnknown} />
      </div>
      <button type="button" data-testid="personal-add" onClick={onAdd} className="btn-primary mt-3 min-h-[44px] w-full justify-center py-2 text-xs">
        <Icon name="Plus" className="h-4 w-4" />
        {t.addToLog}
      </button>
    </div>
  )
}
