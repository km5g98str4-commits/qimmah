// QAE local-date arithmetic (NUMERIC-CONTRACT §4).
// The domain never touches Calendar/locale/timezone APIs: localDate is pure
// integer arithmetic over {epochMs, tzOffsetMinutes} captured by the host.
// Civil-date conversion: proleptic Gregorian (Howard Hinnant's algorithm),
// identically implementable in Swift — golden-tested in both languages.

import { assertSafeInt, floorDiv } from './numeric'

const MS_PER_DAY = 86_400_000
const MS_PER_MINUTE = 60_000

export interface CivilDate {
  year: number
  month: number
  day: number
}

/** Days since 1970-01-01 → proleptic Gregorian civil date. */
export function civilFromDays(daysSinceEpoch: number): CivilDate {
  assertSafeInt(daysSinceEpoch, 'civilFromDays.days')
  const z = daysSinceEpoch + 719_468
  const era = floorDiv(z, 146_097)
  const doe = z - era * 146_097
  const yoe = floorDiv(doe - floorDiv(doe, 1_460) + floorDiv(doe, 36_524) - floorDiv(doe, 146_096), 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100))
  const mp = floorDiv(5 * doy + 2, 153)
  const day = doy - floorDiv(153 * mp + 2, 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: month <= 2 ? y + 1 : y, month, day }
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))
const pad4 = (n: number): string => String(n).padStart(4, '0')

/**
 * Inverse of civilFromDays (Hinnant days-from-civil). Additive migration under the
 * [CTO-QAE-003] architecture lock — golden-neutral, verified by harness re-run.
 */
export function daysFromCivil(year: number, month: number, day: number): number {
  assertSafeInt(year, 'daysFromCivil.year')
  const y = month <= 2 ? year - 1 : year
  const era = floorDiv(y, 400)
  const yoe = y - era * 400
  const mp = month > 2 ? month - 3 : month + 9
  const doy = floorDiv(153 * mp + 2, 5) + day - 1
  const doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy
  return era * 146_097 + doe - 719_468
}

/** Parse canonical YYYY-MM-DD to days-since-epoch. Rejects malformed input by name. */
export function localDateToDays(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) throw new Error(`QAE-TIME-VIOLATION: malformed local date ${date}`)
  return daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** Canonical YYYY-MM-DD from a host-captured instant. Pure arithmetic — no Date/Calendar. */
export function localDate(epochMs: number, tzOffsetMinutes: number): string {
  assertSafeInt(epochMs, 'localDate.epochMs')
  assertSafeInt(tzOffsetMinutes, 'localDate.tzOffsetMinutes')
  if (tzOffsetMinutes < -840 || tzOffsetMinutes > 840) {
    throw new Error('QAE-TIME-VIOLATION: tzOffsetMinutes out of range [-840, 840]')
  }
  const days = floorDiv(epochMs + tzOffsetMinutes * MS_PER_MINUTE, MS_PER_DAY)
  const { year, month, day } = civilFromDays(days)
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`
}
