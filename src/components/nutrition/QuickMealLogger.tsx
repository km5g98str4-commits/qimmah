import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { type FoodItem, type FoodSize } from '@/data/foodItems'
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
  /** خانة الوجبة التي تُسجَّل تحتها الإضافات (افتراضيًا سناك). */
  defaultMeal?: MealSlot
  /** وضع مضمّن داخل قسم وجبة: يُظهر لوحة الإضافة فقط (بلا تقدّم/سجل/تنويه). */
  embedded?: boolean
  /** يُستدعى بعد إضافة عنصر للسجل (لإغلاق اللوحة في الوضع المضمّن). */
  onLogged?: () => void
}

type Tab = 'search' | 'custom'

function round(n: number): number {
  return Math.round(n)
}

/** مسجّل وجبات سريع — بحث في قاعدة الأطعمة أو إضافة سعرات/بروتين مخصّصة، مع تقدّم يومي. */
export function QuickMealLogger({ lang, targetCalories, targetProtein, defaultMeal, embedded = false, onLogged }: QuickMealLoggerProps) {
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
  const baseCarb = activeSize?.carbs ?? selected?.carbs ?? 0
  const baseFat = activeSize?.fat ?? selected?.fat ?? 0
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
      carbs: round(baseCarb * factor),
      fat: round(baseFat * factor),
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
  const cal = parseSafeNumber(cCal, { min: 0, max: NUM_LIMITS.quickCalories.max })
  const prot = parseSafeNumber(cProt, { min: 0, max: NUM_LIMITS.quickProtein.max })
  const canAddCustom = cal > 0 || prot > 0

  const addCustom = guard('nutrition.quickAdd', () => {
    if (!canAddCustom) return
    const saved = addLog({
      label: cName.trim() || d.quickAddLabel,
      servings: 1,
      unit: 'serving',
      calories: round(cal),
      protein: round(prot),
      carbs: round(parseSafeNumber(cCarb, { min: 0, max: NUM_LIMITS.quickMacro.max })),
      fat: round(parseSafeNumber(cFat, { min: 0, max: NUM_LIMITS.quickMacro.max })),
      meal: defaultMeal,
      note: cName.trim() || undefined,
    })
    if (!saved) {
      setSaveError(true)
      return
    }
    // نفس الحدث ٩ — الإضافة السريعة/المخصّصة تسجيل وجبة أيضًا، ولو بلا عنصر من القاعدة.
    trackLocal('meal_entry_logged', { slot: defaultMeal ?? 'unspecified' })
    setCName('')
    setCCal('')
    setCProt('')
    setCCarb('')
    setCFat('')
    setSaveError(false)
    onLogged?.()
  })

  return (
    <div className={embedded ? '' : 'card p-5'}>
      {!embedded && (
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
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); setSizeId(null) }}
                    placeholder={t.searchFood}
                    className="min-h-[44px] w-full rounded-lg border border-line bg-surface py-2 ps-9 pe-3 text-sm text-ink-900 outline-none focus:border-primary-c"
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

              {!selected && query.trim() && (
                <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {/* ═══ [COMMISSIONING §7] الحلقة الراجعة تبدأ من هنا ═══
                      البحث الفاشل كان يُسجَّل محلّيًا فقط: يعرف به الجهاز ولا
                      يعرفه أحد. فالمستخدم يفقد وجبته، والمؤسس لا يعرف أنّ أحدًا
                      بحث عنها. الآن يصل البلاغ طابور مراجعة.

                      ولا يُرسَل إلا **نصّ ما بحث عنه** — لا سعرات ولا تخمين
                      (التكليف: «لا تختلق قيمًا غذائية»). والنصّ لا يَعِد بموعد:
                      «نراجعه ونضيفه لو ضبط» لا «بنضيفه». */}
                  {results.length === 0 && (
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
                        className="min-h-[44px] w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-primary-c"
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
                    <Stat label={t.carbs} value={`${round(baseCarb * factor)}${t.gramsUnit}`} />
                    <Stat label={t.fat} value={`${round(baseFat * factor)}${t.gramsUnit}`} />
                  </div>
                  <button type="button" onClick={addSelected} className="btn-primary mt-3 min-h-[44px] w-full justify-center py-2 text-xs">
                    <Icon name="Plus" className="h-4 w-4" />
                    {t.addToLog}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="qml-custom-name" className="text-xs text-ink-500">{t.foodName} — {t.optional}</label>
                <input
                  id="qml-custom-name"
                  type="text"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder={d.foodNameExample}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
                />
              </div>
              <Field label={`${t.calories} (0–${NUM_LIMITS.quickCalories.max})`} value={cCal} onChange={setCCal} max={NUM_LIMITS.quickCalories.max} placeholder="0" />
              <Field label={`${t.protein} (${t.gramsUnit})`} value={cProt} onChange={setCProt} max={NUM_LIMITS.quickProtein.max} placeholder="0" />
              <Field label={`${t.carbs} (${t.gramsUnit}) — ${t.optional}`} value={cCarb} onChange={setCCarb} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              <Field label={`${t.fat} (${t.gramsUnit}) — ${t.optional}`} value={cFat} onChange={setCFat} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              <button type="button" onClick={addCustom} disabled={!canAddCustom} className="btn-primary col-span-2 min-h-[44px] justify-center py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                <Icon name="Plus" className="h-4 w-4" />
                {t.addToLog}
              </button>
              {!canAddCustom && (
                <p className="col-span-2 text-[11px] text-ink-400">{t.quickAddHint}</p>
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

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
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
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value, { max }))}
        placeholder={placeholder}
        className="mt-1 min-h-[44px] w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
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
