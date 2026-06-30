// وضع الواجهة: «بسيط» افتراضيًا للمبتدئ، مع إمكانية كشف «وضع متقدّم».
//
// المبدأ (شكوى التعقيد رقم 1): لا نُغرق المستخدم بالخيارات بعد الإعداد.
// الأسئلة محلّها الإعداد؛ وما بعده يكون مبنيًّا مسبقًا وبسيطًا بالافتراض.
//
// مصدر الوضع:
//  - تفضيل صريح محفوظ من المستخدم (إن وُجد) له الأولوية دائمًا.
//  - وإلا يُشتقّ من مستوى الخبرة: مبتدئ/مستجد ⇒ بسيط، متوسّط/متقدّم ⇒ متقدّم.

import { useCallback, useState } from 'react'
import type { ExperienceLevel } from '@/types/profile'

export type UiMode = 'simple' | 'advanced'

export const UI_MODE_KEY = 'qimmah:uiMode:v1'

/** الوضع الافتراضي المشتقّ من الخبرة (قبل أي تفضيل صريح). */
export function defaultUiMode(experience: ExperienceLevel | undefined): UiMode {
  if (experience === 'intermediate' || experience === 'advanced') return 'advanced'
  // مبتدئ / مستجد / غير معروف ⇒ بسيط بالافتراض.
  return 'simple'
}

/** يقرأ التفضيل الصريح المحفوظ (إن وُجد) — آمن ضد القيم التالفة. */
function loadOverride(): UiMode | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(UI_MODE_KEY)
    return v === 'simple' || v === 'advanced' ? v : null
  } catch {
    return null
  }
}

function saveOverride(mode: UiMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(UI_MODE_KEY, mode)
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

export interface UiModeState {
  mode: UiMode
  isSimple: boolean
  isAdvanced: boolean
  /** يثبّت تفضيلًا صريحًا (يتجاوز الاشتقاق من الخبرة). */
  setMode: (mode: UiMode) => void
  /** يبدّل بين البسيط والمتقدّم ويحفظ الاختيار. */
  toggle: () => void
}

/**
 * هوك وضع الواجهة — يدمج التفضيل الصريح مع الافتراضي المشتقّ من الخبرة.
 * التفضيل الصريح يفوز دائمًا حتى لو تغيّرت الخبرة لاحقًا.
 */
export function useUiMode(experience: ExperienceLevel | undefined): UiModeState {
  const [override, setOverride] = useState<UiMode | null>(() => loadOverride())
  const mode: UiMode = override ?? defaultUiMode(experience)

  const setMode = useCallback((m: UiMode) => {
    setOverride(m)
    saveOverride(m)
  }, [])

  const toggle = useCallback(() => {
    setMode(mode === 'simple' ? 'advanced' : 'simple')
  }, [mode, setMode])

  return { mode, isSimple: mode === 'simple', isAdvanced: mode === 'advanced', setMode, toggle }
}
