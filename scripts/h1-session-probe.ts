// ح-١ — مسبار الجلسة الجارية: يكشف دوال المتجر الحقيقية للمتصفح ليفحصها الإثبات.
// يُبنى داخل سكربت الإثبات فقط (IIFE) ولا يدخل حزمة الإنتاج إطلاقًا.

import {
  ACTIVE_WORKOUT_KEY,
  clearActiveWorkout,
  hasActiveWorkout,
  loadActiveWorkout,
  saveActiveWorkout,
} from '@/lib/activeWorkout'

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
