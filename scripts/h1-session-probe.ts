// ح-١ — مسبار الجلسة الجارية: يكشف دوال المتجر الحقيقية للمتصفح ليفحصها الإثبات.
// يُبنى داخل سكربت الإثبات فقط (IIFE) ولا يدخل حزمة الإنتاج إطلاقًا.

import {


  ACTIVE_WORKOUT_KEY,
  clearActiveWorkout,
  hasActiveWorkout,
  loadActiveWorkout,
  saveActiveWorkout,
} from '@/lib/activeWorkout'
// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


declare global {
  interface Window {
    __h1: {
      key: string
      loadActiveWorkout: typeof loadActiveWorkout
      saveActiveWorkout: typeof saveActiveWorkout
      clearActiveWorkout: typeof clearActiveWorkout
      hasActiveWorkout: typeof hasActiveWorkout
    }
  }
}

window.__h1 = {
  key: ACTIVE_WORKOUT_KEY,
  loadActiveWorkout,
  saveActiveWorkout,
  clearActiveWorkout,
  hasActiveWorkout,
}
