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

  /** مِفتاح الإطفاء — الموجود منه والغائب، كلاهما مُعلَن. */
  killHeading: string
  killNote: string
  killBatchAbsent: string
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
    killNote: 'تعطيل صكّ غير مستردّ يتمّ من «أكواد الوصول» — ابحث بالوسم وعطّل الصكّ. الصكّ المعطَّل يُرفض عند الاسترداد ولا يمنح شيئًا.',
    killBatchAbsent: 'ما فيه إطفاء لدفعة كاملة بنداء واحد في نموذج السلطة الحالي. الإطفاء صكًّا صكًّا. (بند مرفوع للمؤسس — ما اخترعناه هنا.)',
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
    killNote: 'Disable an unredeemed code from "Access codes" — search by label and disable it. A disabled code is refused at redemption and grants nothing.',
    killBatchAbsent: 'The current authority model has no single-call disable for a whole batch. Disabling is per code. (Raised for the founder — not invented here.)',
  },
}
