// طلب الموقع عند-الحاجة فقط (لجدولة الغروب، شاشة 66). لا يُستدعى إلا بعد شرح
// الفائدة وموافقة المستخدم بتفعيل الجدولة. عند الرفض/التعذّر يعيد null فيلجأ
// المستدعي للبديل اليدوي (اختيار مدينة) — لا حجب.

export interface Coordinates {
  lat: number
  lon: number
}

/**
 * Ask the OS for a one-shot location. Resolves null on denial, timeout, or when
 * geolocation is unavailable — the caller then offers the manual city picker.
 */
export function requestGeolocation(timeoutMs = 8000): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 3_600_000, enableHighAccuracy: false },
    )
  })
}
