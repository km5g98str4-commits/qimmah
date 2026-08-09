// MovementRequirements — what a training slot ASKS FOR ([CTO-QAE-007] §D/§E).
// The characterized legacy slot vocabulary (planGenerator SLOTS), engine-neutral:
// a requirement names muscles/patterns/mechanics, never an exercise.

import type { Mechanics, MovementPattern } from '../Catalog/model'

export interface MovementRequirement {
  /** coarse muscle groups the slot serves (any-of) */
  muscles: string[]
  /** required mechanics, or 'any' */
  role: Mechanics | 'any'
  /** preferred movement patterns — soft: pattern matches outrank, non-matches remain eligible (characterized pickForSlot) */
  patterns?: MovementPattern[]
}

export type DayKind = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'arms' | 'core'

/** Characterized verbatim from src/lib/planGenerator.ts SLOTS (P12 final). */
export const DAY_SLOTS: Readonly<Record<DayKind, readonly MovementRequirement[]>> = {
  full: [
    { muscles: ['quads'], role: 'compound', patterns: ['squat', 'lunge'] },
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['hamstrings', 'glutes'], role: 'compound', patterns: ['hinge'] },
    { muscles: ['calves'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
  ],
  upper: [
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['chest'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
  ],
  lower: [
    { muscles: ['quads'], role: 'compound', patterns: ['squat'] },
    { muscles: ['hamstrings', 'glutes'], role: 'compound', patterns: ['hinge'] },
    { muscles: ['quads'], role: 'any' },
    { muscles: ['glutes'], role: 'any' },
    { muscles: ['hamstrings'], role: 'isolation' },
    { muscles: ['calves'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  push: [
    { muscles: ['chest'], role: 'compound', patterns: ['push'] },
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['chest'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  pull: [
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['back'], role: 'compound', patterns: ['pull'] },
    { muscles: ['back'], role: 'any' },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['core'], role: 'any' },
  ],
  arms: [
    { muscles: ['shoulders'], role: 'compound', patterns: ['push'] },
    { muscles: ['shoulders'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
    { muscles: ['biceps'], role: 'isolation' },
    { muscles: ['triceps'], role: 'isolation' },
  ],
  core: [
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
    { muscles: ['core'], role: 'any' },
  ],
}
