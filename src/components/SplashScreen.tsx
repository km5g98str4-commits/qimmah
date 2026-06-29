import { useEffect, useState } from 'react'
import { product } from '@/config/product'
import { Icon } from './Icon'

const VISIBLE_MS = 1700
const FADE_MS = 450

/**
 * شاشة افتتاحية للعلامة عند تحميل التطبيق.
 * طبقة بصرية عند جذر التركيب فقط — لا تعطّل منطق الدخول/الإعداد:
 * التطبيق يُركَّب أسفلها مباشرة وتختفي بعد مهلة قصيرة.
 * تحترم prefers-reduced-motion (تتخطّى الحركة والتلاشي).
 */
export function SplashScreen() {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const visibleTimer = window.setTimeout(() => {
      if (reduceMotion) {
        setGone(true)
      } else {
        setLeaving(true)
      }
    }, VISIBLE_MS)
    return () => window.clearTimeout(visibleTimer)
  }, [reduceMotion])

  useEffect(() => {
    if (!leaving) return
    const fadeTimer = window.setTimeout(() => setGone(true), FADE_MS)
    return () => window.clearTimeout(fadeTimer)
  }, [leaving])

  if (gone) return null

  return (
    <div
      role="status"
      aria-label={product.name}
      className={[
        'fixed inset-0 z-[100] grid place-items-center bg-page',
        reduceMotion ? '' : 'transition-opacity ease-out',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      style={reduceMotion ? undefined : { transitionDuration: `${FADE_MS}ms` }}
    >
      <div className={reduceMotion ? 'text-center' : 'text-center animate-fade-up'}>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary text-white shadow-glow">
          <Icon name="Dumbbell" className="h-10 w-10" strokeWidth={2.5} />
        </span>
        <p className="mt-5 text-2xl font-black tracking-tight text-ink-900">{product.name}</p>
        <p className="mt-1 text-sm font-medium text-ink-500">{product.tagline}</p>
      </div>
    </div>
  )
}
