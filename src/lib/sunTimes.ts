// حساب الشروق/الغروب محليًا (معادلة الشروق القياسية — Wikipedia «Sunrise equation»).
// نقيّ وحتمي: يأخذ خط العرض/الطول والتاريخ ويعيد وقتي الشروق والغروب — لا شبكة،
// لا اختلاق وقت. الدقّة ~دقيقة، كافية تمامًا لتبديل الثيم.

const RAD = Math.PI / 180
const JULIAN_1970 = 2440587.5
const DAY_MS = 86_400_000

export type SunResult =
  | { sunrise: Date; sunset: Date; polar?: undefined }
  | { polar: 'day' | 'night'; sunrise?: undefined; sunset?: undefined }

/** Sunrise/sunset for the given local date at (lat, lon). Handles polar day/night. */
export function sunTimes(lat: number, lon: number, date: Date): SunResult {
  const jNow = date.getTime() / DAY_MS + JULIAN_1970
  const n = Math.round(jNow - 2451545.0 + 0.0008)
  const jStar = n - lon / 360 // mean solar noon (lon east-positive)
  const M = (357.5291 + 0.98560028 * jStar) % 360 // solar mean anomaly
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const lambda = (M + C + 180 + 102.9372) % 360 // ecliptic longitude
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD)
  const delta = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.44 * RAD)) // declination
  const cosOmega = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(delta)) / (Math.cos(lat * RAD) * Math.cos(delta))
  if (cosOmega < -1) return { polar: 'day' } // sun never sets
  if (cosOmega > 1) return { polar: 'night' } // sun never rises
  const omega = Math.acos(cosOmega) / RAD
  const toDate = (j: number) => new Date((j - JULIAN_1970) * DAY_MS)
  return { sunrise: toDate(jTransit - omega / 360), sunset: toDate(jTransit + omega / 360) }
}

/** True when the sun is up at `now` for (lat, lon) — the "light theme" window. */
export function isDaytime(lat: number, lon: number, now: Date = new Date()): boolean {
  const t = sunTimes(lat, lon, now)
  if (t.polar) return t.polar === 'day'
  return now.getTime() >= t.sunrise.getTime() && now.getTime() < t.sunset.getTime()
}
