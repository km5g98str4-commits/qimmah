/**
 * نصوص المركز التنفيذي — عربي وإنجليزي معًا (الميثاق §6).
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * قاموس **خاصّ بهذه الحارة**: لا يعدّل قاموسًا مشتركًا ولا قاموس غيره (§1.4/٢).
 *
 * ═══ النبرة هنا ═══
 * سطح تشغيلي للمؤسس، فاللغة **مباشرة وقصيرة** — لا فصحى كتب، ولا نبرة تسويق.
 * والثابت الأهمّ من §6 يحكم كل سطر: **الصدق قبل الطمأنينة**. فأسباب اللاإتاحة
 * تقول ما ينقص بالضبط ومن يملكه، ولا تعتذر ولا تُلطّف.
 *
 * ⚠️ **وقاعدة تسمية ملزمة:** الرقم المبني على `last_sign_in_at` اسمه المعروض
 * «سجّلوا دخول» **لا** «نشطين». الجلسة تُجدَّد تلقائيًا فقد لا يسجّل مستخدم
 * يوميّ أي دخول جديد — والاسم الثاني يجعل رقمًا يقلّل التقدير بنيويًا يبدو
 * قياسًا للنشاط. يحرس التسمية `test:admin-dashboard`.
 */

import type { Lang } from '@/lib/appPreferences'

export interface AdminAttentionCopy {
  title: string
  detail: string
}

export interface AdminStrings {
  shell: {
    title: string
    subtitle: string
    navOverview: string
    navUsers: string
    navCharts: string
    navAttention: string
    refresh: string
    asOf: string
    /** شريط علوي دائم يعلن حالة التوصيل — لا يُخفى ولا يُطوى. */
    wiringBanner: string
  }
  /**
   * نصّ شريط القراءة الحيّة لكل حالة.
   * مفاتيحها = `LiveReadState`، فأي حالة تُضاف في الكود بلا نصّ **لا تُترجم**.
   */
  live: {
    'no-backend': string
    'not-founder': string
    'rpc-missing': string
    'denied-by-server': string
    failed: string
    live: string
  }
  /** عناوين أقسام النظرة العامّة. */
  sections: {
    growth: string
    entitlement: string
    commerce: string
    funnel: string
    errors: string
    product: string
  }
  denied: {
    title: string
    body: string
    reasonNoSession: string
    reasonNoRoleClaim: string
    reasonUnknownRole: string
    reasonForgedClaim: string
    reasonNotResolved: string
    /** ملاحظة التزويد لكل حالة — `provisioningNote` هي حالة «لا ادّعاء». */
    provisioningNote: string
    provisioningNoSession: string
    provisioningRejected: string
    provisioningUnresolved: string
    provisioningPresent: string
  }
  availability: {
    AVAILABLE_NOW: string
    NEEDS_BACKEND: string
    IMPOSSIBLE_WITHOUT_CONSENT_CHANGE: string
  }
  states: {
    loading: string
    empty: string
    error: string
    unavailable: string
    owner: string
    ownerBackend: string
    ownerProduct: string
    ownerClient: string
  }
  /** مفاتيحها = `labelKey` في سجلّ المقاييس. */
  labels: Record<string, string>
  /** مفاتيحها = `unavailableReasonKey`. */
  reasons: Record<string, string>
  filters: Record<string, string>
  funnel: Record<string, string>
  attention: Record<string, AdminAttentionCopy>
  table: {
    heading: string
    colUser: string
    colEmail: string
    colCreated: string
    colLastSignIn: string
    colEntitlement: string
    colOnboarding: string
    searchLabel: string
    searchPlaceholder: string
    sortBy: string
    sortAsc: string
    sortDesc: string
    page: string
    of: string
    prev: string
    next: string
    rows: string
    noRows: string
    filterDisabled: string
    open: string
    noName: string
    noSignIn: string
  }
  detail: {
    heading: string
    back: string
    account: string
    entitlement: string
    activation: string
    onboarding: string
    plan: string
    workouts: string
    nutrition: string
    measurements: string
    lastActive: string
    support: string
    sensitiveExcluded: string
  }
  entitlementView: {
    premium: string
    trial: string
    code: string
    preview: string
    unknown: string
  }
  onboardingView: {
    complete: string
    incomplete: string
    unknown: string
  }
  charts: {
    heading: string
    growth: string
    active: string
    conversion: string
    activationFunnel: string
    onboardingFunnel: string
    retention: string
    workoutTrend: string
    nutritionTrend: string
  }
  attentionPanel: {
    heading: string
    detected: string
    blind: string
    blindNote: string
    allClear: string
  }
  roadmap: {
    heading: string
    note: string
  }
}

const arLabels: Record<string, string> = {
  'platform.buildLabel': 'الإصدار المنشور',
  'platform.syncPipeline': 'خطّ المزامنة',
  'platform.entitlementSource': 'مصدر الاستحقاق',
  'platform.backendConfigured': 'إعداد الخادم',
  'users.total': 'إجمالي الحسابات',
  'users.newToday': 'حسابات جديدة اليوم',
  'users.new7d': 'جديدة — ٧ أيام',
  'users.new30d': 'جديدة — ٣٠ يوم',
  'users.verified': 'حسابات موثّقة البريد',
  'users.growthSeries': 'نمو الحسابات',
  'activity.signedIn7d': 'سجّلوا دخول — ٧ أيام',
  'activity.signedIn30d': 'سجّلوا دخول — ٣٠ يوم',
  'activity.dormant30d': 'بلا دخول من ٣٠ يوم+',
  'activity.productActive7d': 'استخدموا التطبيق — ٧ أيام',
  'activity.workoutsCompleted7d': 'تمارين مكتملة — ٧ أيام',
  'activity.nutritionLogged7d': 'أيام فيها تسجيل أكل — ٧ أيام',
  'activity.measurementsLogged30d': 'مرّات تسجيل قياس — ٣٠ يوم',
  'activity.activeSeries': 'اتجاه الاستخدام',
  'activity.retentionCohorts': 'البقاء حسب أسبوع التسجيل',
  'entitlement.premiumActive': 'مشتركو Premium',
  'entitlement.trialExpired': 'انتهت تجربتهم بلا شراء',
  'commerce.ordersSeen': 'أوامر وصلتنا من سلة',
  'commerce.ordersPaid': 'أوامر مدفوعة ومُنِحت',
  'commerce.ordersFailed': 'أوامر فشلت أو رُفضت',
  'commerce.codesIssued': 'أكواد أنشأناها',
  'commerce.codesRedeemed': 'أكواد استُخدمت',
  'commerce.codesUnused': 'أكواد فعّالة ما استُخدمت',
  'commerce.redemptionFailures24h': 'محاولات كود مرفوضة — ٢٤ ساعة',
  'commerce.revokedActive': 'حسابات موقوفة الآن',
  'errors.clientErrors24h': 'أخطاء التطبيق — ٢٤ ساعة',
  'errors.rpcFailures24h': 'فشل نداءات الخادم — ٢٤ ساعة',
  'entitlement.trialActive': 'داخل التجربة الآن',
  'entitlement.previewOnly': 'على المعاينة فقط',
  'entitlement.activationRedeemed': 'أكواد مستبدَلة',
  'entitlement.activationPending': 'أكواد صادرة بانتظار الاستبدال',
  'entitlement.activationFailed24h': 'محاولات تفعيل مرفوضة — ٢٤ ساعة',
  'entitlement.conversionOfAccounts': 'Premium من إجمالي الحسابات',
  'onboarding.completionRate': 'نسبة إكمال التخصيص',
  'onboarding.stuckCount': 'حسابات وقفت في التخصيص',
}

const enLabels: Record<string, string> = {
  'platform.buildLabel': 'Deployed build',
  'platform.syncPipeline': 'Sync pipeline',
  'platform.entitlementSource': 'Entitlement source',
  'platform.backendConfigured': 'Backend config',
  'users.total': 'Total accounts',
  'users.newToday': 'New accounts today',
  'users.new7d': 'New — 7 days',
  'users.new30d': 'New — 30 days',
  'users.verified': 'Email-verified accounts',
  'users.growthSeries': 'Account growth',
  'activity.signedIn7d': 'Signed in — 7 days',
  'activity.signedIn30d': 'Signed in — 30 days',
  'activity.dormant30d': 'No sign-in for 30+ days',
  'activity.productActive7d': 'Used the app — 7 days',
  'activity.workoutsCompleted7d': 'Workouts finished — 7 days',
  'activity.nutritionLogged7d': 'Days with food logged — 7 days',
  'activity.measurementsLogged30d': 'Measurement entries — 30 days',
  'activity.activeSeries': 'Usage trend',
  'activity.retentionCohorts': 'Retention by signup week',
  'entitlement.premiumActive': 'Premium subscribers',
  'entitlement.trialExpired': 'Trial ended without buying',
  'commerce.ordersSeen': 'Orders received from Salla',
  'commerce.ordersPaid': 'Orders paid and granted',
  'commerce.ordersFailed': 'Orders failed or rejected',
  'commerce.codesIssued': 'Codes we created',
  'commerce.codesRedeemed': 'Codes redeemed',
  'commerce.codesUnused': 'Live codes never used',
  'commerce.redemptionFailures24h': 'Rejected code attempts — 24h',
  'commerce.revokedActive': 'Accounts revoked right now',
  'errors.clientErrors24h': 'App errors — 24h',
  'errors.rpcFailures24h': 'Server call failures — 24h',
  'entitlement.trialActive': 'In trial right now',
  'entitlement.previewOnly': 'Preview only',
  'entitlement.activationRedeemed': 'Codes redeemed',
  'entitlement.activationPending': 'Codes issued, not redeemed',
  'entitlement.activationFailed24h': 'Rejected activation attempts — 24h',
  'entitlement.conversionOfAccounts': 'Premium of all accounts',
  'onboarding.completionRate': 'Onboarding completion rate',
  'onboarding.stuckCount': 'Accounts stalled in onboarding',
}

const arReasons: Record<string, string> = {
  'reason.none': '',
  'reason.migrationPending':
    'المصدر موجود والدالة اللي تقرأه مكتوبة في المستودع — بس ما انطبقت على القاعدة بعد. أول ما تنطبق الهجرة يطلع الرقم هنا بدون أي تغيير في الكود. المالك: Backend.',
  'reason.noErrorPipeline':
    'ما فيه مسار يوصل أخطاء التطبيق للخادم أصلًا. القسم يبقى ظاهر عشان ما يُقرأ فراغه «ما فيه أخطاء». المالك: Backend.',
  'reason.noAdminRead':
    'ما فيه مسار قراءة للمسؤول. سياسات قاعدة البيانات تعطي كل حساب صفوفه هو بس — ولا فيه دور مسؤول أصلًا. المالك: Backend.',
  'reason.authSchemaClosed':
    'الرقم في جدول المصادقة، وما ينقرأ من المتصفّح مباشرة. يحتاج دالة خادم تقرأه خلف فحص دور. المالك: Backend.',
  'reason.consentBias':
    'الرقم راح يكون ناقص وما نعرف كم. المزامنة اختيارية، واللي ما وافق عليها ما يظهر في أي جدول — فالعدد حدّ أدنى مو رقم. يحتاج قرار منتج.',
  'reason.noEntitlementSystem':
    'ما فيه نظام استحقاق أصلًا — لا جدول ولا صفّ. والبناء المنشور ما يقدر يعطي Premium لأحد. المالك: Backend.',
  'reason.noAuditLog':
    'ما فيه سجلّ لمحاولات التفعيل المرفوضة. ولو انبنى: يتخزّن مجمّع بالوقت بس، بدون الكود المُدخَل. المالك: Backend.',
  'reason.onboardingBias':
    'المقام كامل بس البسط ناقص: علامة الإكمال ما توصل الخادم إلا بمزامنة موافَق عليها. يعني اللي أكمل وما وافق يُحسب «ما أكمل» — والرقم يطلع أسوأ من الواقع باتجاه ثابت. يحتاج قرار منتج.',
}

const enReasons: Record<string, string> = {
  'reason.none': '',
  'reason.migrationPending':
    'The source exists and the function that reads it is written in the repo — it just has not been applied to the database yet. The moment the migration lands, the number appears here with no code change. Owner: Backend.',
  'reason.noErrorPipeline':
    'There is no path carrying app errors to the server at all. The section stays visible so its emptiness is not read as "no errors". Owner: Backend.',
  'reason.noAdminRead':
    'No admin read path exists. Database policies give every account only its own rows, and there is no admin role at all. Owner: Backend.',
  'reason.authSchemaClosed':
    'This lives in the auth schema and cannot be read from the browser. It needs a server function behind a role check. Owner: Backend.',
  'reason.consentBias':
    'The number would be incomplete by an unknown margin. Sync is optional, and anyone who declined it never appears in any table — so the count is a floor, not a measurement. Needs a product decision.',
  'reason.noEntitlementSystem':
    'There is no entitlement system — no table, no rows. The deployed build cannot grant Premium to anyone. Owner: Backend.',
  'reason.noAuditLog':
    'There is no log of rejected activation attempts. If built, it stores time-bucketed counts only — never the submitted code. Owner: Backend.',
  'reason.onboardingBias':
    'The denominator is complete but the numerator is not: the completion flag only reaches the server through consented sync. Someone who finished but declined sync counts as "did not finish" — the number is wrong in one fixed direction. Needs a product decision.',
}

const arFilters: Record<string, string> = {
  'filter.all': 'الكل',
  'filter.premium': 'Premium',
  'filter.trial': 'داخل التجربة',
  'filter.preview': 'معاينة',
  'filter.pendingActivation': 'تفعيل معلّق',
  'filter.newToday': 'جدد اليوم',
  'filter.inactive7d': 'بلا دخول ٧ أيام+',
  'filter.inactive30d': 'بلا دخول ٣٠ يوم+',
  'filter.onboardingIncomplete': 'تخصيص ناقص',
  'filter.highlyActive': 'الأكثر استخدامًا',
}

const enFilters: Record<string, string> = {
  'filter.all': 'All',
  'filter.premium': 'Premium',
  'filter.trial': 'In trial',
  'filter.preview': 'Preview',
  'filter.pendingActivation': 'Activation pending',
  'filter.newToday': 'New today',
  'filter.inactive7d': 'No sign-in 7d+',
  'filter.inactive30d': 'No sign-in 30d+',
  'filter.onboardingIncomplete': 'Onboarding incomplete',
  'filter.highlyActive': 'Most active',
}

const arFunnel: Record<string, string> = {
  'funnel.issued': 'أكواد صادرة',
  'funnel.redeemed': 'استُبدلت',
  'funnel.active': 'استحقاق ساري',
  'funnel.signedUp': 'أنشأوا حساب',
  'funnel.started': 'بدأوا التخصيص',
  'funnel.completed': 'أكملوا التخصيص',
}

const enFunnel: Record<string, string> = {
  'funnel.issued': 'Codes issued',
  'funnel.redeemed': 'Redeemed',
  'funnel.active': 'Entitlement active',
  'funnel.signedUp': 'Created an account',
  'funnel.started': 'Started onboarding',
  'funnel.completed': 'Finished onboarding',
}

const arAttention: Record<string, AdminAttentionCopy> = {
  'attn.entitlementSourceMissing': {
    title: 'ما أحد يقدر يشتري',
    detail: 'مصدر الاستحقاق في هذا البناء = none. يعني حتى لو دفع أحد، ما فيه شي يفتح له الوصول.',
  },
  'attn.syncPipelineDown': {
    title: 'المزامنة مطفأة',
    detail: 'VITE_SYNC_ENABLED مو "true"، فما يُرفع ولا صفّ. كل أرقام النشاط تحتها راح تظل فاضية.',
  },
  'attn.backendUnconfigured': {
    title: 'الخادم مو مضبوط',
    detail: 'عنوان Supabase أو المفتاح العام ناقص في هذا البناء.',
  },
  'attn.activationFailureSpike': {
    title: 'ارتفاع فشل التفعيل',
    detail: 'ما نقدر نراقبه — ما فيه سجلّ لمحاولات التفعيل.',
  },
  'attn.errorRateChange': {
    title: 'تغيّر معدّل الأخطاء',
    detail: 'ما نقدر نراقبه — ما فيه مسار أخطاء يوصلنا.',
  },
  'attn.stuckOnboarding': {
    title: 'حسابات واقفة في التخصيص',
    detail: 'ما نقدر نراقبه بصدق — القائمة راح تمتلئ باللي ما وافقوا على المزامنة بس.',
  },
  'attn.inactivity': {
    title: 'خمول تجاوز الحد',
    detail: 'ما نقدر نراقبه — يحتاج قراءة آخر دخول من جدول المصادقة.',
  },
  'attn.foodIngestFailure': {
    title: 'فشل استيراد بيانات الأغذية',
    detail: 'ما نقدر نراقبه — ما فيه مهمّة استيراد ولا تقرير عنها.',
  },
  'attn.exerciseMediaMissing': {
    title: 'تمارين بلا وسائط',
    detail: 'ينفحص وقت البناء عبر media:audit، مو من هذي الشاشة.',
  },
  'attn.launchBlockers': {
    title: 'موانع إطلاق',
    detail: 'قائمة يدوية اليوم — ما فيها مصدر آلي.',
  },
}

const enAttention: Record<string, AdminAttentionCopy> = {
  'attn.entitlementSourceMissing': {
    title: 'Nobody can buy',
    detail: 'Entitlement source in this build is none. Even if someone paid, nothing would unlock for them.',
  },
  'attn.syncPipelineDown': {
    title: 'Sync is off',
    detail: 'VITE_SYNC_ENABLED is not "true", so not a single row is uploaded. Every activity number below stays empty.',
  },
  'attn.backendUnconfigured': {
    title: 'Backend not configured',
    detail: 'The Supabase URL or public key is missing in this build.',
  },
  'attn.activationFailureSpike': {
    title: 'Activation failure spike',
    detail: 'Cannot be watched — there is no activation attempt log.',
  },
  'attn.errorRateChange': {
    title: 'Error rate change',
    detail: 'Cannot be watched — no error stream reaches us.',
  },
  'attn.stuckOnboarding': {
    title: 'Accounts stalled in onboarding',
    detail: 'Cannot be watched honestly — the list would fill up with people who simply declined sync.',
  },
  'attn.inactivity': {
    title: 'Inactivity past threshold',
    detail: 'Cannot be watched — needs last-sign-in from the auth schema.',
  },
  'attn.foodIngestFailure': {
    title: 'Food data ingest failure',
    detail: 'Cannot be watched — there is no ingest job and no report from one.',
  },
  'attn.exerciseMediaMissing': {
    title: 'Exercises missing media',
    detail: 'Checked at build time via media:audit, not from this screen.',
  },
  'attn.launchBlockers': {
    title: 'Launch blockers',
    detail: 'A manual list today — no automated source.',
  },
}

export const adminStrings: Record<Lang, AdminStrings> = {
  ar: {
    shell: {
      title: 'مركز قِمّة التنفيذي',
      subtitle: 'شاشة وحدة تقول لك حال المنتج.',
      navOverview: 'نظرة عامة',
      navUsers: 'المستخدمون',
      navCharts: 'الاتجاهات',
      navAttention: 'يحتاج انتباهك',
      refresh: 'حدّث',
      asOf: 'آخر قياس',
      wiringBanner:
        'ما فيه ولا رقم مستخدم متاح اليوم. الواجهة والعقد جاهزين، والتوصيل موقوف على Backend — كل بطاقة تحت تقول لك السبب.',
    },
    live: {
      'no-backend': 'الخادم مو مضبوط في هذا البناء، فما فيه من وين نجيب الأرقام.',
      'not-founder': 'ما انطلب ولا رقم — الدور ما انحسم مؤسسًا.',
      'rpc-missing':
        'الأرقام موصولة في الكود، بس دالة القراءة ما انطبقت على القاعدة بعد. أول ما تنطبق الهجرة تضوي الشاشة بدون تغيير كود.',
      'denied-by-server': 'القاعدة رفضت الطلب: جلستك ما تحمل دور المؤسس على الخادم.',
      failed: 'ما وصلنا رد صالح من الخادم. الأرقام تحت تبقى «غير متاح» — ما نعرضها أصفارًا.',
      live: 'الأرقام تحت جاية من الخادم الآن.',
    },
    sections: {
      growth: 'نمو الحسابات',
      entitlement: 'الاستحقاق',
      commerce: 'الطلبات والأكواد',
      funnel: 'القمع',
      errors: 'الأخطاء',
      product: 'استخدام المنتج',
    },
    denied: {
      title: 'هذي الشاشة للمؤسس',
      body: 'تسجيل الدخول وحده ما يكفي — لازم دور مسؤول صريح من الخادم.',
      reasonNoSession: 'ما فيه جلسة.',
      reasonNoRoleClaim: 'الجلسة سليمة بس ما فيها دور مسؤول.',
      reasonUnknownRole: 'الدور في الجلسة مو معروف.',
      reasonForgedClaim: 'الدور جاي من مصدر يكتبه المستخدم نفسه — مرفوض.',
      reasonNotResolved: 'ما انحسم الدور بعد.',
      provisioningNote:
        'ملاحظة: حسابك ما يحمل الدور. المنح يصير من الخادم بمفتاح مميّز عبر admin_set_role — ما فيه طريقة تمنح نفسك، وهذا مقصود.',
      provisioningNoSession: 'ملاحظة: ما فيه جلسة أصلًا. سجّل دخول أولًا، والدور ينحسم بعدها من الخادم.',
      provisioningRejected:
        'ملاحظة: وصلنا ادّعاء دور من مصدر ما يصلح — إمّا يكتبه المستخدم بنفسه أو قيمته مو معروفة. انرفض بالاسم وانرصد.',
      provisioningUnresolved: 'ملاحظة: الدور ما انحسم بعد. الحالة الابتدائية منع، مو سماح مؤقّت.',
      provisioningPresent: 'ملاحظة: حسابك يحمل الدور فعلًا — لو وصلت هنا فالمشكلة في مكان ثاني.',
    },
    availability: {
      AVAILABLE_NOW: 'متاح الآن',
      NEEDS_BACKEND: 'يحتاج Backend',
      IMPOSSIBLE_WITHOUT_CONSENT_CHANGE: 'ما يصير بصدق مع الموافقة الحالية',
    },
    states: {
      loading: 'نجيب الرقم…',
      empty: 'ما فيه بيانات',
      error: 'ما قدرنا نجيبه',
      unavailable: 'غير متاح',
      owner: 'المالك',
      ownerBackend: 'Backend',
      ownerProduct: 'قرار منتج',
      ownerClient: 'التطبيق',
    },
    labels: arLabels,
    reasons: arReasons,
    filters: arFilters,
    funnel: arFunnel,
    attention: arAttention,
    table: {
      heading: 'المستخدمون',
      colUser: 'المستخدم',
      colEmail: 'البريد',
      colCreated: 'أنشأ الحساب',
      colLastSignIn: 'آخر دخول',
      colEntitlement: 'الاستحقاق',
      colOnboarding: 'التخصيص',
      searchLabel: 'ابحث في المستخدمين',
      searchPlaceholder: 'اسم أو معرّف…',
      sortBy: 'رتّب حسب',
      sortAsc: 'تصاعدي',
      sortDesc: 'تنازلي',
      page: 'صفحة',
      of: 'من',
      prev: 'السابق',
      next: 'التالي',
      rows: 'صفّ',
      noRows: 'ما فيه صفوف تطابق البحث.',
      filterDisabled: 'هذي المصفاة معطّلة',
      open: 'افتح',
      noName: 'بلا اسم',
      noSignIn: 'ما سجّل دخول',
    },
    detail: {
      heading: 'صفحة المستخدم',
      back: 'رجوع للجدول',
      account: 'الحساب',
      entitlement: 'الاستحقاق',
      activation: 'التفعيل',
      onboarding: 'التخصيص',
      plan: 'الخطة',
      workouts: 'آخر التمارين',
      nutrition: 'تسجيل الأكل',
      measurements: 'القياسات',
      lastActive: 'آخر نشاط',
      support: 'سياق الدعم',
      sensitiveExcluded:
        'الإصابات والأدوية والحساسيات وقيم القياسات ما تدخل هذي الشاشة إطلاقًا — ولا بأي دور.',
    },
    entitlementView: {
      premium: 'Premium',
      trial: 'تجربة',
      code: 'كود',
      preview: 'معاينة',
      unknown: 'غير معروف',
    },
    onboardingView: { complete: 'مكتمل', incomplete: 'ناقص', unknown: 'غير معروف' },
    charts: {
      heading: 'الاتجاهات',
      growth: 'نمو الحسابات',
      active: 'من سجّل دخول',
      conversion: 'التحوّل إلى Premium',
      activationFunnel: 'قمع التفعيل',
      onboardingFunnel: 'قمع التخصيص',
      retention: 'البقاء حسب أسبوع التسجيل',
      workoutTrend: 'اتجاه إكمال التمارين',
      nutritionTrend: 'اتجاه تسجيل الأكل',
    },
    attentionPanel: {
      heading: 'يحتاج انتباهك',
      detected: 'مكتشَف',
      blind: 'ما نقدر نراقبه بعد',
      blindNote: 'هذي مو «كل شي تمام» — هذي أشياء ما عندنا طريقة نشوفها أصلًا.',
      allClear: 'ما فيه شي مكتشَف الحين.',
    },
    roadmap: {
      heading: 'خارطة الطريق',
      note: 'الأفعال اللي ما لها قدرة خادم مُراجَعة تظهر هنا — ما تظهر أزرار تكذب.',
    },
  },
  en: {
    shell: {
      title: 'Qimmah Executive Center',
      subtitle: 'One screen that tells you how the product is doing.',
      navOverview: 'Overview',
      navUsers: 'Users',
      navCharts: 'Trends',
      navAttention: 'Needs you',
      refresh: 'Refresh',
      asOf: 'Measured',
      wiringBanner:
        'Not a single user metric is available today. The surface and the contract are ready; wiring is blocked on Backend — every card below tells you why.',
    },
    live: {
      'no-backend': 'The backend is not configured in this build, so there is nowhere to read numbers from.',
      'not-founder': 'Nothing was requested — the role was not resolved as founder.',
      'rpc-missing':
        'The numbers are wired in code, but the read function has not been applied to the database yet. The moment the migration lands, this screen lights up with no code change.',
      'denied-by-server': 'The database refused the request: your session does not carry the founder role on the server.',
      failed: 'No valid response came back. The numbers below stay "unavailable" — they are never shown as zeros.',
      live: 'The numbers below are coming from the server right now.',
    },
    sections: {
      growth: 'Account growth',
      entitlement: 'Entitlement',
      commerce: 'Orders and codes',
      funnel: 'Funnel',
      errors: 'Errors',
      product: 'Product usage',
    },
    denied: {
      title: 'This screen is founder-only',
      body: 'Being signed in is not enough — it needs an explicit admin role issued by the server.',
      reasonNoSession: 'No session.',
      reasonNoRoleClaim: 'Valid session, but no admin role on it.',
      reasonUnknownRole: 'The role on this session is not recognised.',
      reasonForgedClaim: 'The role came from a source the user can write. Rejected.',
      reasonNotResolved: 'Role not resolved yet.',
      provisioningNote:
        'Note: your account does not carry the role. It is granted server-side with a privileged key through admin_set_role — there is no way to grant it to yourself, and that is deliberate.',
      provisioningNoSession: 'Note: there is no session at all. Sign in first; the role is resolved server-side after that.',
      provisioningRejected:
        'Note: a role claim arrived from a source that does not count — either one the user writes themselves, or a value that is not recognised. It was rejected by name and recorded.',
      provisioningUnresolved: 'Note: the role is not resolved yet. The initial state is denial, not temporary access.',
      provisioningPresent: 'Note: your account does carry the role — if you landed here, the problem is elsewhere.',
    },
    availability: {
      AVAILABLE_NOW: 'Available now',
      NEEDS_BACKEND: 'Needs backend',
      IMPOSSIBLE_WITHOUT_CONSENT_CHANGE: 'Not honest under current consent',
    },
    states: {
      loading: 'Fetching…',
      empty: 'No data',
      error: 'Could not fetch it',
      unavailable: 'Unavailable',
      owner: 'Owner',
      ownerBackend: 'Backend',
      ownerProduct: 'Product decision',
      ownerClient: 'App',
    },
    labels: enLabels,
    reasons: enReasons,
    filters: enFilters,
    funnel: enFunnel,
    attention: enAttention,
    table: {
      heading: 'Users',
      colUser: 'User',
      colEmail: 'Email',
      colCreated: 'Created',
      colLastSignIn: 'Last sign-in',
      colEntitlement: 'Entitlement',
      colOnboarding: 'Onboarding',
      searchLabel: 'Search users',
      searchPlaceholder: 'Name or id…',
      sortBy: 'Sort by',
      sortAsc: 'Ascending',
      sortDesc: 'Descending',
      page: 'Page',
      of: 'of',
      prev: 'Previous',
      next: 'Next',
      rows: 'rows',
      noRows: 'No rows match this search.',
      filterDisabled: 'This filter is disabled',
      open: 'Open',
      noName: 'No name',
      noSignIn: 'Never signed in',
    },
    detail: {
      heading: 'User detail',
      back: 'Back to table',
      account: 'Account',
      entitlement: 'Entitlement',
      activation: 'Activation',
      onboarding: 'Onboarding',
      plan: 'Plan',
      workouts: 'Recent workouts',
      nutrition: 'Food logging',
      measurements: 'Measurements',
      lastActive: 'Last activity',
      support: 'Support context',
      sensitiveExcluded:
        'Injuries, medications, allergies and measurement values never enter this screen — under any role.',
    },
    entitlementView: {
      premium: 'Premium',
      trial: 'Trial',
      code: 'Code',
      preview: 'Preview',
      unknown: 'Unknown',
    },
    onboardingView: { complete: 'Complete', incomplete: 'Incomplete', unknown: 'Unknown' },
    charts: {
      heading: 'Trends',
      growth: 'Account growth',
      active: 'Signed in',
      conversion: 'Premium conversion',
      activationFunnel: 'Activation funnel',
      onboardingFunnel: 'Onboarding funnel',
      retention: 'Retention by signup week',
      workoutTrend: 'Workout completion trend',
      nutritionTrend: 'Food logging trend',
    },
    attentionPanel: {
      heading: 'Needs you',
      detected: 'Detected',
      blind: 'Cannot watch yet',
      blindNote: 'This is not "all clear" — these are things we have no way to see at all.',
      allClear: 'Nothing detected right now.',
    },
    roadmap: {
      heading: 'Roadmap',
      note: 'Actions with no reviewed backend capability appear here — no buttons that lie.',
    },
  },
}
