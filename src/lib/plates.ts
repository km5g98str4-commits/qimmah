export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] as const
export const BAR_OPTIONS_KG = [20, 15, 10] as const

export type PlateLoadError = 'invalidTarget' | 'invalidBar' | 'belowBar' | 'noPlates'

export interface PlatePair {
  kg: number
  countPerSide: number
}

export type PlateLoadResult =
  | { status: 'error'; error: PlateLoadError }
  | {
      status: 'ready'
      exact: boolean
      targetKg: number
      loadedKg: number
      barKg: number
      differenceKg: number
      perSideKg: number
      pairs: PlatePair[]
    }

const UNIT = 0.25
const MAX_TOTAL_KG = 500
const toUnits = (kg: number) => Math.round(kg / UNIT)
const fromUnits = (units: number) => Math.round(units * UNIT * 100) / 100

/**
 * Finds the fewest plates per side at or below the requested load. Dynamic
 * programming is used instead of greedy selection so unusual enabled-plate
 * combinations (for example 15 + 15) still produce an exact answer.
 */
export function calculatePlateLoad(targetKg: number, barKg: number, availableKg: readonly number[] = DEFAULT_PLATES_KG): PlateLoadResult {
  if (!Number.isFinite(targetKg) || targetKg <= 0 || targetKg > MAX_TOTAL_KG) return { status: 'error', error: 'invalidTarget' }
  if (!Number.isFinite(barKg) || barKg <= 0 || barKg > 50) return { status: 'error', error: 'invalidBar' }
  if (targetKg < barKg) return { status: 'error', error: 'belowBar' }

  const plates = [...new Set(availableKg)]
    .filter((kg) => Number.isFinite(kg) && kg >= UNIT && kg <= 50)
    .sort((a, b) => b - a)
  if (plates.length === 0 && targetKg > barKg) return { status: 'error', error: 'noPlates' }

  const targetPerSideUnits = Math.max(0, Math.floor(((targetKg - barKg) / 2) / UNIT + 1e-8))
  const plateUnits = plates.map(toUnits)
  const unreachable = Number.POSITIVE_INFINITY
  const count = Array<number>(targetPerSideUnits + 1).fill(unreachable)
  const previous = Array<number>(targetPerSideUnits + 1).fill(-1)
  count[0] = 0

  for (let total = 1; total <= targetPerSideUnits; total += 1) {
    plateUnits.forEach((units, index) => {
      if (units <= total && count[total - units] + 1 < count[total]) {
        count[total] = count[total - units] + 1
        previous[total] = index
      }
    })
  }

  let loadedPerSideUnits = targetPerSideUnits
  while (loadedPerSideUnits > 0 && !Number.isFinite(count[loadedPerSideUnits])) loadedPerSideUnits -= 1
  const pairCounts = new Map<number, number>()
  for (let cursor = loadedPerSideUnits; cursor > 0;) {
    const plateIndex = previous[cursor]
    if (plateIndex < 0) break
    const kg = plates[plateIndex]
    pairCounts.set(kg, (pairCounts.get(kg) ?? 0) + 1)
    cursor -= plateUnits[plateIndex]
  }

  const perSideKg = fromUnits(loadedPerSideUnits)
  const loadedKg = Math.round((barKg + perSideKg * 2) * 100) / 100
  const differenceKg = Math.round((targetKg - loadedKg) * 100) / 100
  return {
    status: 'ready',
    exact: Math.abs(differenceKg) < 0.001,
    targetKg,
    loadedKg,
    barKg,
    differenceKg,
    perSideKg,
    pairs: plates.filter((kg) => pairCounts.has(kg)).map((kg) => ({ kg, countPerSide: pairCounts.get(kg) ?? 0 })),
  }
}
