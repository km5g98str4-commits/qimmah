// دفعات صكوك الشراء — نصوص السطح التشغيلي للمؤسس.
// [WAVE2-PURCHASE-OPS]
//
// ═══ لماذا قاموس مستقلّ ═══
// الميثاق §1.4/٢: كل حارة تنشئ قاموسها ولا تعدّل قاموسًا مشتركًا. و`admin.ts`
// قاموس مشترك ضخم تلمسه حارات أخرى.
//
// ═══ الصدق المفروض على هذه النصوص ═══
// «غير مستردّ» **لا يعني «متبقٍ في سلة»**. بلا webhook لا تعلم قِمّة أين الصكّ:
// أفي مخزون سلة، أم بيد مشترٍ لم يفعّل، أم نُسخ، أم انكشف. فالتسمية تقول ما
// نعلمه (لم يُستردّ عندنا) ولا تدّعي ما لا نعلمه (مكانه).

export interface PurchaseBatchStrings {
  heading: string
  note: string
  /** الحدّ الخادمي — يُقرأ ولا يُخترع أعلى منه. */
  serverLimitNote: string

  issueHeading: string
  labelLabel: string
  labelPlaceholder: string
  labelRequired: string
  countLabel: string
  countHint: (max: number) => string
  countOutOfRange: (max: number) => string
  reasonLabel: string
  reasonPlaceholder: string
  reasonRequired: string
  expiresLabel: string
  expiresHint: string
  issueButton: string
  issuing: string

  /** الظهور الواحد — أخطر لحظة في الشاشة، فنصّها صريح لا مخفَّف. */
  issuedHeading: (count: number, label: string) => string
  issuedWarning: string
  copyAll: string
  copied: string
  downloadCsv: string
  downloadTxt: string
  dismiss: string
  dismissConfirm: string

  inventoryHeading: string
  colLabel: string
  colIssued: string
  colRedeemed: string
  colUnredeemed: string
  colDisabled: string
  colExpired: string
  colLastIssued: string
  colLastRedeemed: string
  /** التحذير الحاكم على العمود — يُعرض في الشاشة لا في تعليق. */
  unredeemedMeaning: string
  empty: string
  loading: string
  gap: (why: string) => string

  /** مِفتاح الإطفاء — المفرد قائم، والدفعيّ صار قائمًا. */
  killHeading: string
  killNote: string

  /** [WAVE3] إطفاء الدفعة — فعل هدّام يتطلّب سببًا وتأكيدًا. */
  batchDisableCta: string
  batchDisableTitle: (label: string) => string
  batchDisableBody: string
  /** الحقيقة التي لا تُترك للاستنتاج: منح المشترين قائمة. */
  batchDisableNotRevoked: string
  batchDisableReasonLabel: string
  batchDisableReasonPlaceholder: string
  batchDisableReasonRequired: string
  batchDisableConfirm: string
  batchDisableCancel: string
  batchDisableWorking: string
  batchDisableDone: (count: number, label: string) => string
  batchDisableFailed: (why: string) => string
}

export const purchaseBatchStrings: Record<'ar' | 'en', PurchaseBatchStrings> = {
  ar: {
    heading: 'صكوك الشراء',
    note: 'مخزون الصكوك التي تُسلَّم للمشتري بعد الدفع. الصكّ يفتح Premium دائمًا، ويُستهلك مرّة واحدة.',
    serverLimitNote: 'الحدّ الأقصى ٥٠٠ صكّ في النداء الواحد — حدٌّ خادميّ.',

    issueHeading: 'إصدار دفعة',
    labelLabel: 'الوسم (إلزامي)',
    labelPlaceholder: 'SALLA-LAUNCH-001',
    labelRequired: 'لازم وسم — مخزون بلا اسم ما ينقدر يُدقَّق.',
    countLabel: 'العدد',
    countHint: (max) => `من ١ إلى ${max}`,
    countOutOfRange: (max) => `العدد لازم بين ١ و${max}.`,
    reasonLabel: 'السبب (للسجلّ)',
    reasonPlaceholder: 'مخزون إطلاق سلة',
    reasonRequired: 'اكتب سببًا — يُحفظ في أثر التدقيق.',
    expiresLabel: 'انتهاء صلاحية الصكّ (اختياري)',
    expiresHint: 'يخصّ الصكّ نفسه لا المنحة: Premium بعد الاسترداد دائم بلا انتهاء.',
    issueButton: 'أصدر الدفعة',
    issuing: 'جارٍ الإصدار…',

    issuedHeading: (n, label) => `صدرت ${n} صكًّا تحت الوسم «${label}»`,
    issuedWarning: '⚠️ هذي المرّة الوحيدة اللي تشوف فيها النصوص. القاعدة تحفظ بصمات فقط — إذا أغلقت الشاشة ما نقدر نستعيدها. انسخها أو نزّلها الحين.',
    copyAll: 'انسخ الكل',
    copied: 'تم النسخ',
    downloadCsv: 'نزّل CSV',
    downloadTxt: 'نزّل TXT',
    dismiss: 'أغلق نهائيًا',
    dismissConfirm: 'متأكّد؟ النصوص ما تُستعاد بعد الإغلاق.',

    inventoryHeading: 'المخزون بالوسم',
    colLabel: 'الوسم',
    colIssued: 'صادر',
    colRedeemed: 'مستردّ',
    colUnredeemed: 'غير مستردّ',
    colDisabled: 'معطَّل غير مستردّ',
    colExpired: 'منتهٍ غير مستردّ',
    colLastIssued: 'آخر إصدار',
    colLastRedeemed: 'آخر استرداد',
    unredeemedMeaning: '«غير مستردّ» = ما استُهلك عندنا. ما يقول وين الصكّ: ممكن يكون في مخزون سلة، أو وصل مشترٍ ما فعّله بعد، أو انكشف. بلا webhook ما نعرف.',
    empty: 'ما فيه دفعات بعد.',
    loading: 'جارٍ التحميل…',
    gap: (why) => `ما قدرنا نقرأ المخزون — ${why}`,

    killHeading: 'إطفاء صكّ',
    killNote: 'تعطيل صكّ واحد يتمّ من «أكواد الوصول» — ابحث بالوسم وعطّله. ولإطفاء دفعة كاملة تسرّبت: زرّ «أطفئ غير المستردّ» على صفّ الدفعة نفسه.',

    batchDisableCta: 'أطفئ غير المستردّ',
    batchDisableTitle: (label) => `إطفاء غير المستردّ في «${label}»`,
    batchDisableBody: 'كل صكّ ما استُردّ بعد في هذي الدفعة بيُرفض من اللحظة — ما يفتح Premium لأحد. الإطفاء ما يرجع من الشاشة.',
    batchDisableNotRevoked: 'تفعيلات Premium القائمة ما تنسحب — اللي اشترى وفعّل، وصوله باقٍ.',
    batchDisableReasonLabel: 'السبب (إلزامي — يُحفظ في سجلّ التدقيق)',
    batchDisableReasonPlaceholder: 'مثال: تسرّب ملفّ التصدير قبل الرفع',
    batchDisableReasonRequired: 'اكتب سببًا — بدونه ما ننفّذ.',
    batchDisableConfirm: 'أطفئ الآن',
    batchDisableCancel: 'تراجع',
    batchDisableWorking: 'جارٍ الإطفاء…',
    batchDisableDone: (count, label) => `تمّ — أُطفئ ${count} صكًّا غير مستردّ في «${label}». تفعيلات Premium القائمة ما انمست.`,
    batchDisableFailed: (why) => `ما نُفّذ الإطفاء — ${why}`,
  },
  en: {
    heading: 'Purchase codes',
    note: 'Inventory of codes handed to a buyer after payment. A code unlocks permanent Premium and is consumed once.',
    serverLimitNote: 'Maximum 500 codes per call — a server-side limit.',

    issueHeading: 'Issue a batch',
    labelLabel: 'Label (required)',
    labelPlaceholder: 'SALLA-LAUNCH-001',
    labelRequired: 'A label is required — unnamed inventory cannot be audited.',
    countLabel: 'Count',
    countHint: (max) => `1 to ${max}`,
    countOutOfRange: (max) => `Count must be between 1 and ${max}.`,
    reasonLabel: 'Reason (for the record)',
    reasonPlaceholder: 'Salla launch inventory',
    reasonRequired: 'Write a reason — it is kept in the audit trail.',
    expiresLabel: 'Code expiry (optional)',
    expiresHint: 'Applies to the code itself, not the grant: Premium after redemption has no expiry.',
    issueButton: 'Issue batch',
    issuing: 'Issuing…',

    issuedHeading: (n, label) => `Issued ${n} codes under label "${label}"`,
    issuedWarning: '⚠️ This is the only time you will see these codes. The database stores salted fingerprints only — once you close this, they cannot be recovered. Copy or download them now.',
    copyAll: 'Copy all',
    copied: 'Copied',
    downloadCsv: 'Download CSV',
    downloadTxt: 'Download TXT',
    dismiss: 'Close permanently',
    dismissConfirm: 'Are you sure? The codes cannot be recovered after closing.',

    inventoryHeading: 'Inventory by label',
    colLabel: 'Label',
    colIssued: 'Issued',
    colRedeemed: 'Redeemed',
    colUnredeemed: 'Unredeemed',
    colDisabled: 'Disabled, unredeemed',
    colExpired: 'Expired, unredeemed',
    colLastIssued: 'Last issued',
    colLastRedeemed: 'Last redeemed',
    unredeemedMeaning: '"Unredeemed" = not consumed on our side. It does not say where the code is: it may sit in Salla inventory, may have reached a buyer who has not activated it, or may have leaked. Without a webhook we do not know.',
    empty: 'No batches yet.',
    loading: 'Loading…',
    gap: (why) => `Could not read inventory — ${why}`,

    killHeading: 'Disabling a code',
    killNote: 'Disable a single code from "Access codes" — search by label and disable it. For a whole leaked batch: the "Disable unredeemed" button on the batch row itself.',

    batchDisableCta: 'Disable unredeemed',
    batchDisableTitle: (label) => `Disable unredeemed codes in "${label}"`,
    batchDisableBody: 'Every code in this batch not yet redeemed will be refused from this moment — it unlocks Premium for no one. This cannot be undone from this screen.',
    batchDisableNotRevoked: 'Existing Premium activations are not revoked — whoever bought and activated keeps their access.',
    batchDisableReasonLabel: 'Reason (required — kept in the audit trail)',
    batchDisableReasonPlaceholder: 'e.g. export file leaked before upload',
    batchDisableReasonRequired: 'Write a reason — we will not proceed without one.',
    batchDisableConfirm: 'Disable now',
    batchDisableCancel: 'Cancel',
    batchDisableWorking: 'Disabling…',
    batchDisableDone: (count, label) => `Done — disabled ${count} unredeemed codes in "${label}". Existing Premium activations are untouched.`,
    batchDisableFailed: (why) => `Disable did not run — ${why}`,
  },
}
