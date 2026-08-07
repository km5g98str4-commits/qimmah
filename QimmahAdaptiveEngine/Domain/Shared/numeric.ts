// QAE canonical integer arithmetic (NUMERIC-CONTRACT §2).
// All domain math runs on safe integers; every division declares its rounding mode.

export function assertSafeInt(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`QAE-NUMERIC-VIOLATION: ${label} must be a safe integer, got ${value}`)
  }
  return value
}

/** Euclidean-style floor division on integers. */
export function floorDiv(numerator: number, denominator: number): number {
  assertSafeInt(numerator, 'floorDiv.numerator')
  assertSafeInt(denominator, 'floorDiv.denominator')
  if (denominator === 0) throw new Error('QAE-NUMERIC-VIOLATION: division by zero')
  return Math.floor(numerator / denominator)
}

/** Integer division rounding half away from zero — the contract default (NUMERIC-CONTRACT §2.4). */
export function divRoundHalfAwayFromZero(numerator: number, denominator: number): number {
  assertSafeInt(numerator, 'divRound.numerator')
  assertSafeInt(denominator, 'divRound.denominator')
  if (denominator === 0) throw new Error('QAE-NUMERIC-VIOLATION: division by zero')
  const sign = Math.sign(numerator / denominator) || 1
  const absNum = Math.abs(numerator)
  const absDen = Math.abs(denominator)
  return sign * Math.floor((absNum + Math.floor(absDen / 2)) / absDen)
}

/** Quantize to a step (e.g. kcal to 50), half away from zero. */
export function quantize(value: number, step: number): number {
  assertSafeInt(value, 'quantize.value')
  assertSafeInt(step, 'quantize.step')
  if (step <= 0) throw new Error('QAE-NUMERIC-VIOLATION: step must be positive')
  return divRoundHalfAwayFromZero(value, step) * step
}

export function clampInt(value: number, lo: number, hi: number): number {
  assertSafeInt(value, 'clampInt.value')
  return Math.max(lo, Math.min(hi, value))
}

/**
 * Deterministic ordinal (byte/code-unit) comparison — replaces legacy
 * locale-dependent `localeCompare` tie-breaks (LEGACY_DEFECT_REGISTER L-GEN-1).
 */
export function ordinalCompare(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
