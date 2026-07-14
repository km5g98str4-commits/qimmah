// Small deterministic string hash (FNV-1a) — used for reproducible, seedable
// selection in the coaching engine. No Math.random, so picks are testable.
export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
