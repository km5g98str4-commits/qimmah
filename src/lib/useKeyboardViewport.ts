import { useEffect, useState } from 'react'

/**
 * لوحة المفاتيح الافتراضية على الويب — [MOBILE-SHELL-001]
 *
 * ═══ العطل ═══
 * القشرة تعرف لوحة المفاتيح من جسر Capacitor وحده، فعلى الويب (Safari/Chrome على
 * الجوال) تفتح اللوحة **ولا يعرف التطبيق**: شريط التنقّل يبقى في مكانه فيجلس فوق
 * اللوحة على أندرويد، وعلى iOS تبقى القشرة بطول الشاشة كاملًا تحت اللوحة فيدفع
 * Safari الصفحة كلها لأعلى ليُظهر الحقل (pan) ثم تبقى فجوة بعد إغلاقها.
 *
 * ═══ المقياس الواحد ═══
 * `window.visualViewport` هو ما يراه المستخدم فعلًا. حين ينخفض ارتفاعه عن أقصى
 * ارتفاع مقيس لنفس العرض بأكثر من `KEYBOARD_MIN_PX` **وحقل نصّي مركَّز** ⇒ لوحة
 * مفاتيح. (المقارنة بأقصى ارتفاع لا بـ`innerHeight` لأن أندرويد يقلّص الاثنين معًا
 * فيصير الفرق صفرًا، وتغيّر العرض = تدوير الشاشة فيُعاد الأساس.)
 *
 * ═══ الأثر ═══
 *   • `--qimmah-vvh` على الجذر = الارتفاع المرئي؛ الأسطح ذات الطول الكامل تقرأه
 *     (`.app-viewport-h`) فتنكمش إلى ما فوق اللوحة بدل أن تختبئ تحتها.
 *   • `data-keyboard` على `<html>` للقياس.
 *   • الحقل المركَّز يُجلب إلى مرأى المتمرّر بعد الانكماش، وعند الإغلاق يُعاد
 *     الإزاحة البصرية (`scrollTo(0,0)`) فلا تبقى فجوة iOS.
 */
export const KEYBOARD_MIN_PX = 120
const VAR = '--qimmah-vvh'

const isTextEntry = (el: Element | null): boolean => {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(type)
  }
  return (el as HTMLElement).isContentEditable === true
}

export function useKeyboardViewport(): { keyboardOpen: boolean } {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let baselineWidth = vv.width
    let baselineHeight = vv.height
    let wasOpen = false
    let pendingBlur: number | undefined

    const measure = () => {
      if (Math.abs(vv.width - baselineWidth) > 1) {
        baselineWidth = vv.width
        baselineHeight = vv.height
      }
      baselineHeight = Math.max(baselineHeight, vv.height)
      const shrink = baselineHeight - vv.height
      // تكبير القرص (وصولية) يقلّص المنطقة المرئية أيضًا — وليس لوحة مفاتيح. لو
      // عاملناه كذلك لانكمشت القشرة مع كل تكبير وصارت الشاشة «غريبة» بعده.
      const pinchZoomed = vv.scale > 1.01
      const open = !pinchZoomed && shrink > KEYBOARD_MIN_PX && isTextEntry(document.activeElement)
      if (open) {
        root.style.setProperty(VAR, `${Math.round(vv.height)}px`)
        root.setAttribute('data-keyboard', 'open')
        if (vv.offsetTop > 0 || window.scrollY > 0) window.scrollTo(0, 0)
        const active = document.activeElement as HTMLElement | null
        window.requestAnimationFrame(() => active?.scrollIntoView?.({ block: 'center', behavior: 'auto' }))
      } else {
        root.style.removeProperty(VAR)
        root.removeAttribute('data-keyboard')
        if (wasOpen && (vv.offsetTop > 0 || window.scrollY > 0)) window.scrollTo(0, 0)
      }
      wasOpen = open
      setKeyboardOpen(open)
    }
    const onFocusOut = () => {
      window.clearTimeout(pendingBlur)
      pendingBlur = window.setTimeout(measure, 60)
    }
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
    document.addEventListener('focusin', measure)
    document.addEventListener('focusout', onFocusOut)
    measure()
    return () => {
      window.clearTimeout(pendingBlur)
      vv.removeEventListener('resize', measure)
      vv.removeEventListener('scroll', measure)
      document.removeEventListener('focusin', measure)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty(VAR)
      root.removeAttribute('data-keyboard')
    }
  }, [])

  return { keyboardOpen }
}
