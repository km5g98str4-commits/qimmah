// ============================================================================
// تقارب النسخ — [QIM-WEB-RELEASE-001] البند ٨
// ============================================================================
// **المشكلة التي يعالجها هذا الملف:** كان التسجيل سطرًا واحدًا —
// `navigator.serviceWorker.register('/sw.js')` — ثم لا شيء. لا `updatefound`
// ولا `controllerchange` ولا `registration.update()`.
//
// وعامل الخدمة يستدعي `skipWaiting()` عند التثبيت و`clients.claim()` عند
// التفعيل. فالنتيجة عند كل نشر جديد:
//
//   • العامل الجديد يُفعَّل فورًا ويحذف كاشات النسخة السابقة،
//   • ويستولي على الصفحة المفتوحة **وهي ما زالت تشغّل JS النسخة القديمة**،
//   • ولا شيء يُخبر الصفحة، ولا شيء يعيد تحميلها.
//
// فيبقى الجهاز على واجهة قديمة إلى أجل غير مسمّى، وأول حزمة كسولة يطلبها تكون
// قد حُذفت من الكاش وزالت من النشرة — وهذا هو ازدواج النسخ الذي رآه المؤسس:
// جهاز على بناء وجهاز على بناء آخر، بلا سبب ظاهر ولا طريقة للخروج غير مسح
// الكاش يدويًا.
//
// **الحلّ هنا:** تقارب حتمي مرّة واحدة، بثلاثة قيود صارمة —
//   ١) لا إعادة تحميل عند **أول** تثبيت (وإلّا فحلقة لا نهائية في كل زيارة أولى)،
//   ٢) إعادة تحميل **واحدة** كحدّ أقصى لكل تحميل صفحة،
//   ٣) لا نقطع مستخدمًا يكتب الآن — ننتظر أن يترك الحقل.
// ============================================================================

/** إعادة تحميل لا تقطع كتابةً جارية. */
function reloadWhenSafe(): void {
  const el = document.activeElement
  const isTyping =
    el instanceof HTMLElement &&
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

  if (!isTyping) {
    window.location.reload()
    return
  }

  // يكتب الآن: ننتظر أوّل لحظة يترك فيها الحقل. لا نُسقط ما كتبه بإعادة تحميل
  // مفاجئة — الصدق قبل السرعة، والفارق ثوانٍ لا أكثر.
  const onBlur = () => {
    window.removeEventListener('blur', onBlur, true)
    window.location.reload()
  }
  window.addEventListener('blur', onBlur, true)
}

/**
 * يسجّل عامل الخدمة **ويضمن تقارب التبويب إلى أحدث بناء منشور**.
 *
 * يُستدعى مرّة واحدة عند الإقلاع. آمن على المتصفّحات بلا دعم (يخرج صامتًا).
 */
export function registerServiceWorkerWithUpdates(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  // هل كان ثمّة عامل يتحكّم بالصفحة **لحظة الإقلاع**؟
  //
  // هذا هو الحارس الذي يمنع الحلقة اللانهائية: في أول زيارة لا يوجد متحكّم،
  // ثم يُطلق `clients.claim()` حدث `controllerchange` طبيعيًا — وإعادة التحميل
  // عنده تعني إعادة تحميل عند كل زيارة أولى إلى الأبد.
  const hadController = navigator.serviceWorker.controller !== null
  let reloadedOnce = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadedOnce) return
    reloadedOnce = true
    reloadWhenSafe()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // تبويب يبقى مفتوحًا أيامًا لا يسأل عن نسخة جديدة من تلقاء نفسه.
        // نسأل نحن عند كل عودة إلى الواجهة — وهي أكثر لحظة يعود فيها مستخدم
        // الجوال إلى التطبيق — بخنق دقيقة كي لا نُثقل الشبكة.
        let lastCheck = 0
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          const now = Date.now()
          if (now - lastCheck < 60_000) return
          lastCheck = now
          void registration.update().catch(() => undefined)
        })
      })
      .catch(() => {
        // فشل التسجيل لا يكسر التطبيق — يبقى يعمل أونلاين طبيعيًا.
      })
  })
}
