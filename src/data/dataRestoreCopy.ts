import type { Lang } from '@/lib/appPreferences'
import type { DataImportErrorCode, DataImportPreview } from '@/lib/dataPortability'

export function dataRestoreCopy(lang: Lang) {
  const ar = lang !== 'en'
  return {
    title: ar ? 'استعادة نسخة بيانات' : 'Restore a data copy',
    description: ar ? 'اختر ملفًا صدّرته قِمّة. سنعرض ملخصه قبل تغيير أي بيانات.' : 'Choose a file exported by Qimmah. We will preview it before changing any data.',
    choose: ar ? 'اختر ملف JSON' : 'Choose JSON file',
    reading: ar ? 'يتم فحص الملف…' : 'Checking file…',
    previewTitle: ar ? 'راجع النسخة' : 'Review this copy',
    exportedAt: ar ? 'تاريخ النسخة' : 'Exported',
    owner: ar ? 'الحساب' : 'Account',
    currentAccount: ar ? 'الحساب الحالي' : 'Current account',
    sessions: ar ? 'جلسات' : 'sessions',
    measurements: ar ? 'قياسات' : 'measurements',
    nutritionDays: ar ? 'أيام تغذية' : 'nutrition days',
    stepDays: ar ? 'أيام خطوات' : 'step days',
    todos: ar ? 'مهام' : 'todos',
    confirmation: ar ? 'أفهم أن الاستعادة ستستبدل بيانات هذا الحساب بعد حفظ نسخة احتياطية محلية.' : 'I understand this restore replaces this account’s data after saving a local backup.',
    apply: ar ? 'استعد البيانات' : 'Restore data',
    applying: ar ? 'تتم الاستعادة…' : 'Restoring…',
    cancel: ar ? 'إلغاء' : 'Cancel',
    success: ar ? 'تمت الاستعادة، وحُفظت نسخة احتياطية من بياناتك السابقة.' : 'Restore complete. A backup of your previous data was saved.',
    reload: ar ? 'افتح البيانات المستعادة' : 'Open restored data',
    safety: ar ? 'لا تشارك ملف النسخة؛ قد يحتوي على بيانات صحية شخصية.' : 'Do not share this file; it may contain personal health data.',
    previewSummary: (preview: DataImportPreview) => [
      `${preview.workoutSessions} ${ar ? 'جلسات' : 'sessions'}`,
      `${preview.measurements} ${ar ? 'قياسات' : 'measurements'}`,
      `${preview.nutritionDays} ${ar ? 'أيام تغذية' : 'nutrition days'}`,
      `${preview.stepDays} ${ar ? 'أيام خطوات' : 'step days'}`,
      `${preview.todos} ${ar ? 'مهام' : 'todos'}`,
    ],
    errors: {
      'invalid-json': ar ? 'الملف ليس JSON صالحًا.' : 'This is not valid JSON.',
      'invalid-format': ar ? 'الملف ليس نسخة بيانات صادرة من قِمّة.' : 'This is not a Qimmah data export.',
      'unsupported-version': ar ? 'إصدار النسخة غير مدعوم في هذا البناء.' : 'This export version is not supported by this build.',
      'invalid-data': ar ? 'بنية البيانات غير صالحة أو تتجاوز الحدود الآمنة.' : 'The data structure is invalid or exceeds safe limits.',
      'dangerous-key': ar ? 'رُفض الملف لأنه يحتوي على بنية غير آمنة.' : 'The file was rejected because it contains an unsafe structure.',
      'owner-mismatch': ar ? 'هذه النسخة تخص حسابًا آخر، لذلك لم تُطبّق.' : 'This copy belongs to another account and was not applied.',
      'recovery-active': ar ? 'لا يمكن استعادة البيانات أثناء استعادة كلمة المرور.' : 'Data cannot be restored during password recovery.',
      'too-large': ar ? 'حجم الملف يتجاوز 10 ميجابايت.' : 'The file is larger than 10 MB.',
      unavailable: ar ? 'الاستعادة غير متاحة في هذه البيئة.' : 'Restore is unavailable in this environment.',
      'apply-failed': ar ? 'تعذّرت الاستعادة. أُعيدت بياناتك السابقة وحُفظت نسخة احتياطية.' : 'Restore failed. Your previous data was rolled back and backed up.',
    } satisfies Record<DataImportErrorCode, string>,
  }
}
