// QAE canonical JSON serialization (NUMERIC-CONTRACT §3).
// UTF-8, object keys sorted lexically by code unit, no insignificant whitespace,
// integers only (a float anywhere is a contract violation), no undefined/NaN.
// Manifest/golden hashes are computed over exactly this serialization.

export function canonicalSerialize(value: unknown): string {
  if (value === null) return 'null'
  const t = typeof value
  if (t === 'boolean') return value ? 'true' : 'false'
  if (t === 'number') {
    const n = value as number
    if (!Number.isSafeInteger(n)) {
      throw new Error(`QAE-CANONICAL-VIOLATION: non-integer number in canonical payload: ${n}`)
    }
    return String(n)
  }
  if (t === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSerialize).join(',')}]`
  }
  if (t === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const parts: string[] = []
    for (const key of keys) {
      const v = record[key]
      if (v === undefined) continue
      parts.push(`${JSON.stringify(key)}:${canonicalSerialize(v)}`)
    }
    return `{${parts.join(',')}}`
  }
  throw new Error(`QAE-CANONICAL-VIOLATION: unsupported type ${t} in canonical payload`)
}
