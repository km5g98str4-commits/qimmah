import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { build } from 'esbuild'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const BASELINE_COMMIT = 'cc60adfc0da0f893b101230269d4847d33490429'
export const LIBRARY_AUDIT_PATH = resolve(ROOT, 'data/exercise-production/library-audit.json')
export const LIBRARY_SOURCE_FILES = [
  'src/data/exercises.ts',
  'src/lib/exerciseGuidance.ts',
]

const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced'])
const ALLOWED_ENVIRONMENTS = new Set(['gym', 'home', 'both'])
const ALLOWED_PATTERNS = new Set(['push', 'pull', 'squat', 'hinge', 'lunge', 'isolation', 'carry', 'core', 'cardio', 'mobility'])
const LANGS = ['ar', 'en']
const AUTHORING_FIELDS = ['description', 'instructions', 'cues', 'commonMistakes', 'breathingCue', 'safetyNotes']

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const nonEmptyText = (value) => typeof value === 'string' && value.trim().length > 0
const nonEmptyList = (value) => Array.isArray(value) && value.length > 0 && value.every(nonEmptyText)

function assertBaselineSources() {
  const result = spawnSync('git', ['diff', '--quiet', BASELINE_COMMIT, '--', ...LIBRARY_SOURCE_FILES], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (result.status === 1) throw new Error(`LIBRARY_SOURCE_DRIFT: authoritative sources differ from ${BASELINE_COMMIT}`)
  if (result.status !== 0) throw new Error(`LIBRARY_SOURCE_CHECK: git diff failed (${result.status}): ${result.stderr.trim()}`)
}

function sourceInventory() {
  const sourceFiles = LIBRARY_SOURCE_FILES.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(ROOT, path))),
  }))
  const sourceFingerprint = sha256(sourceFiles.map(({ path, sha256: digest }) => `${path}\0${digest}\n`).join(''))
  return { sourceFiles, sourceFingerprint }
}

async function loadCatalogWithAuthoringInputs() {
  const exercisePath = resolve(ROOT, 'src/data/exercises.ts')
  const original = readFileSync(exercisePath, 'utf8')
  const marker = 'function ex(p: ExInput): Exercise {'
  if (!original.includes(marker)) throw new Error('LIBRARY_SOURCE_IDENTITY: exercise constructor marker is missing')
  const instrumented = original.replace(
    marker,
    `const __exerciseAuthoringInputs = new Map<string, ExInput>()\n\n${marker}\n  __exerciseAuthoringInputs.set(p.id, p)`,
  ) + '\nexport { __exerciseAuthoringInputs }\n'

  const result = await build({
    stdin: {
      contents: `export { exercises, LEGACY_EXERCISE_ID_MAP, __exerciseAuthoringInputs } from '@/data/exercises'`,
      loader: 'ts',
      resolveDir: ROOT,
    },
    absWorkingDir: ROOT,
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(ROOT, 'src') },
    define: {
      'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }),
    },
    plugins: [{
      name: 'capture-exercise-authoring-inputs',
      setup(context) {
        context.onLoad({ filter: /src[\\/]data[\\/]exercises\.ts$/ }, (args) => {
          if (resolve(args.path) !== exercisePath) return undefined
          return { contents: instrumented, loader: 'ts' }
        })
      },
    }],
    logLevel: 'silent',
  })
  const source = result.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

function authoredString(raw, field) {
  return hasOwn(raw, field) && typeof raw[field] === 'string' ? raw[field] : null
}

function authoredList(raw, field) {
  return hasOwn(raw, field) && Array.isArray(raw[field]) ? [...raw[field]] : []
}

function authoredContent(raw) {
  return {
    description: { ar: authoredString(raw, 'notesAr'), en: authoredString(raw, 'notesEn') },
    instructions: { ar: [], en: authoredList(raw, 'howToEn') },
    cues: { ar: authoredList(raw, 'techniqueTipsAr'), en: authoredList(raw, 'techniqueTipsEn') },
    commonMistakes: { ar: authoredList(raw, 'commonMistakesAr'), en: authoredList(raw, 'commonMistakesEn') },
    breathingCue: { ar: null, en: null },
    safetyNotes: { ar: authoredList(raw, 'safetyNotesAr'), en: authoredList(raw, 'safetyNotesEn') },
  }
}

function coreMetadata(exercise) {
  return {
    name: { ar: exercise.nameAr, en: exercise.nameEn },
    primaryMuscle: exercise.primaryMuscle,
    muscles: {
      primary: [...exercise.primaryMusclesDetailed],
      secondary: [...exercise.secondaryMusclesDetailed],
      secondaryCoarse: [...exercise.secondaryMuscles],
    },
    equipment: [...exercise.equipment],
    difficulty: exercise.level,
    movementPattern: exercise.movementPattern,
    environment: exercise.environment,
    defaults: {
      sets: exercise.defaultSets,
      reps: exercise.defaultReps,
      restSec: exercise.defaultRestSec,
    },
  }
}

function coreGaps(core) {
  const missing = []
  if (!nonEmptyText(core.name.ar)) missing.push('core.name.ar')
  if (!nonEmptyText(core.name.en)) missing.push('core.name.en')
  if (!nonEmptyText(core.primaryMuscle)) missing.push('core.primaryMuscle')
  if (core.primaryMuscle !== 'cardio' && !nonEmptyList(core.muscles.primary)) missing.push('core.muscles.primary')
  if (!nonEmptyList(core.equipment)) missing.push('core.equipment')
  if (!ALLOWED_LEVELS.has(core.difficulty)) missing.push('core.difficulty')
  if (!ALLOWED_PATTERNS.has(core.movementPattern)) missing.push('core.movementPattern')
  if (!ALLOWED_ENVIRONMENTS.has(core.environment)) missing.push('core.environment')
  return missing
}

function authoredFieldReady(field, value) {
  if (field === 'description' || field === 'breathingCue') return nonEmptyText(value)
  if (field === 'instructions') return nonEmptyList(value) && value.length >= 3 && value.length <= 7
  if (field === 'cues') return nonEmptyList(value) && value.length >= 2 && value.length <= 5
  return nonEmptyList(value)
}

function bilingualGaps(authored) {
  const missing = []
  for (const field of AUTHORING_FIELDS) {
    for (const lang of LANGS) {
      if (!authoredFieldReady(field, authored[field][lang])) missing.push(`authored.${field}.${lang}`)
    }
  }
  return missing
}

function summarize(records, canonicalIds) {
  const readyByField = Object.fromEntries(AUTHORING_FIELDS.map((field) => [
    field,
    Object.fromEntries(LANGS.map((lang) => [lang, records.filter((record) => authoredFieldReady(field, record.authored[field][lang])).length])),
  ]))
  let invalidReferences = 0
  let selfReferences = 0
  let totalReferences = 0
  for (const record of records) {
    totalReferences += record.substitutions.length
    invalidReferences += record.substitutions.filter((id) => !canonicalIds.has(id)).length
    selfReferences += record.substitutions.filter((id) => id === record.exerciseId).length
  }
  return {
    catalogTotal: records.length,
    uniqueExerciseIds: new Set(records.map((record) => record.exerciseId)).size,
    core: {
      complete: records.filter((record) => record.completeness.coreMetadataComplete).length,
      gaps: records.filter((record) => !record.completeness.coreMetadataComplete).length,
    },
    bilingualAuthored: {
      complete: records.filter((record) => record.completeness.bilingualAuthoredComplete).length,
      gaps: records.filter((record) => !record.completeness.bilingualAuthoredComplete).length,
      readyByField,
    },
    substitutions: {
      withExplicit: records.filter((record) => record.substitutions.length > 0).length,
      gaps: records.filter((record) => record.substitutions.length === 0).length,
      totalReferences,
      invalidReferences,
      selfReferences,
    },
  }
}

export async function buildLibraryAudit() {
  assertBaselineSources()
  const [{ exercises, LEGACY_EXERCISE_ID_MAP, __exerciseAuthoringInputs }, baseline] = await Promise.all([
    loadCatalogWithAuthoringInputs(),
    Promise.resolve(sourceInventory()),
  ])
  const ids = exercises.map((exercise) => exercise.id)
  const canonicalIds = new Set(ids)
  if (canonicalIds.size !== ids.length) throw new Error('LIBRARY_UNIQUE_IDS: duplicate canonical exercise IDs in source')
  if (__exerciseAuthoringInputs.size !== exercises.length) throw new Error('LIBRARY_COVERAGE: raw authoring inputs do not cover the canonical catalog')

  const aliasesByCanonical = new Map(ids.map((id) => [id, []]))
  for (const [alias, canonicalId] of Object.entries(LEGACY_EXERCISE_ID_MAP)) {
    if (!canonicalIds.has(canonicalId)) throw new Error(`LIBRARY_SOURCE_IDENTITY: alias target is not canonical: ${alias} -> ${canonicalId}`)
    aliasesByCanonical.get(canonicalId).push(alias)
  }

  const records = [...exercises]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((exercise) => {
      const raw = __exerciseAuthoringInputs.get(exercise.id)
      if (!raw) throw new Error(`LIBRARY_COVERAGE: missing raw authoring input for ${exercise.id}`)
      const core = coreMetadata(exercise)
      const authored = authoredContent(raw)
      const substitutions = authoredList(raw, 'alternatives')
      const missingCore = coreGaps(core)
      const missingBilingual = bilingualGaps(authored)
      const invalidSubstitutions = substitutions.filter((id) => !canonicalIds.has(id) || id === exercise.id)
      return {
        exerciseId: exercise.id,
        aliases: [...aliasesByCanonical.get(exercise.id)].sort(),
        core,
        authored,
        substitutions,
        completeness: {
          coreMetadataComplete: missingCore.length === 0,
          bilingualAuthoredComplete: missingBilingual.length === 0,
          substitutionStatus: substitutions.length === 0 ? 'MISSING_EXPLICIT' : (invalidSubstitutions.length ? 'INVALID' : 'PRESENT_VALID'),
          missing: {
            core: missingCore,
            bilingualAuthored: missingBilingual,
            substitutions: substitutions.length === 0 ? ['substitutions'] : invalidSubstitutions.map((id) => `substitutions.${id}`),
          },
        },
      }
    })

  return {
    schemaVersion: 1,
    version: 1,
    auditId: 'EX-LIB-1',
    baseline: {
      commit: BASELINE_COMMIT,
      sourceFingerprint: baseline.sourceFingerprint,
      sourceFiles: baseline.sourceFiles,
    },
    grain: 'one-record-per-canonical-exercise-id',
    policy: {
      authoredTextOnly: true,
      fallbackCountsAsAuthored: false,
      translationOrGeneration: false,
    },
    summary: summarize(records, canonicalIds),
    records,
  }
}

function issue(issues, code, message) {
  issues.push({ code, message })
}

function exactKeys(value, expectedKeys, path, issues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issue(issues, 'LIBRARY_SCHEMA', `${path} must be an object`)
    return
  }
  const keys = Object.keys(value)
  for (const key of keys.filter((key) => !expectedKeys.includes(key))) issue(issues, 'LIBRARY_UNKNOWN_FIELD', `${path}.${key}`)
  for (const key of expectedKeys.filter((key) => !keys.includes(key))) issue(issues, 'LIBRARY_SCHEMA', `${path}.${key} is missing`)
}

function valueHasContent(value) {
  return Array.isArray(value) ? value.length > 0 : nonEmptyText(value)
}

export async function validateLibraryAudit(candidate) {
  const expected = await buildLibraryAudit()
  const issues = []
  exactKeys(candidate, ['schemaVersion', 'version', 'auditId', 'baseline', 'grain', 'policy', 'summary', 'records'], 'audit', issues)
  exactKeys(candidate?.baseline, ['commit', 'sourceFingerprint', 'sourceFiles'], 'audit.baseline', issues)
  exactKeys(candidate?.policy, ['authoredTextOnly', 'fallbackCountsAsAuthored', 'translationOrGeneration'], 'audit.policy', issues)
  exactKeys(candidate?.summary, ['catalogTotal', 'uniqueExerciseIds', 'core', 'bilingualAuthored', 'substitutions'], 'audit.summary', issues)
  exactKeys(candidate?.summary?.core, ['complete', 'gaps'], 'audit.summary.core', issues)
  exactKeys(candidate?.summary?.bilingualAuthored, ['complete', 'gaps', 'readyByField'], 'audit.summary.bilingualAuthored', issues)
  exactKeys(candidate?.summary?.bilingualAuthored?.readyByField, AUTHORING_FIELDS, 'audit.summary.bilingualAuthored.readyByField', issues)
  exactKeys(candidate?.summary?.substitutions, ['withExplicit', 'gaps', 'totalReferences', 'invalidReferences', 'selfReferences'], 'audit.summary.substitutions', issues)
  for (const field of AUTHORING_FIELDS) exactKeys(candidate?.summary?.bilingualAuthored?.readyByField?.[field], LANGS, `audit.summary.bilingualAuthored.readyByField.${field}`, issues)

  if (candidate?.schemaVersion !== 1 || candidate?.version !== 1 || candidate?.auditId !== 'EX-LIB-1' || candidate?.grain !== expected.grain) {
    issue(issues, 'LIBRARY_SCHEMA', 'audit envelope does not match EX-LIB-1')
  }
  const candidateSources = Array.isArray(candidate?.baseline?.sourceFiles) ? candidate.baseline.sourceFiles : []
  for (const [index, source] of candidateSources.entries()) exactKeys(source, ['path', 'sha256'], `audit.baseline.sourceFiles[${index}]`, issues)
  if (
    candidate?.baseline?.commit !== expected.baseline.commit ||
    !isDeepStrictEqual(candidateSources.map((source) => source?.path), expected.baseline.sourceFiles.map((source) => source.path))
  ) {
    issue(issues, 'LIBRARY_SOURCE_IDENTITY', 'baseline commit or ordered source paths differ from the approved cc60adf sources')
  }
  if (
    candidate?.baseline?.sourceFingerprint !== expected.baseline.sourceFingerprint ||
    !isDeepStrictEqual(candidateSources.map((source) => source?.sha256), expected.baseline.sourceFiles.map((source) => source.sha256))
  ) {
    issue(issues, 'LIBRARY_SOURCE_FINGERPRINT', 'source fingerprint or file digests differ from the approved sources')
  }
  if (!isDeepStrictEqual(candidate?.policy, expected.policy)) {
    issue(issues, 'LIBRARY_AUDIT_POLICY', 'authored-only/no-generation policy changed')
  }

  const records = Array.isArray(candidate?.records) ? candidate.records : []
  if (!Array.isArray(candidate?.records)) issue(issues, 'LIBRARY_SCHEMA', 'audit.records must be an array')
  const expectedById = new Map(expected.records.map((record) => [record.exerciseId, record]))
  const byId = new Map()
  for (const record of records) {
    const rows = byId.get(record?.exerciseId) ?? []
    rows.push(record)
    byId.set(record?.exerciseId, rows)
  }
  for (const id of expectedById.keys()) {
    if (!byId.has(id)) issue(issues, 'LIBRARY_COVERAGE', `missing canonical library row: ${id}`)
    if ((byId.get(id)?.length ?? 0) > 1) issue(issues, 'LIBRARY_UNIQUE_IDS', `duplicate canonical library row: ${id}`)
  }
  for (const id of byId.keys()) if (!expectedById.has(id)) issue(issues, 'LIBRARY_COVERAGE', `noncanonical library row: ${id}`)

  for (const record of records.filter((row) => expectedById.has(row?.exerciseId))) {
    const expectedRecord = expectedById.get(record.exerciseId)
    exactKeys(record, ['exerciseId', 'aliases', 'core', 'authored', 'substitutions', 'completeness'], `record.${record.exerciseId}`, issues)
    exactKeys(record.core, ['name', 'primaryMuscle', 'muscles', 'equipment', 'difficulty', 'movementPattern', 'environment', 'defaults'], `record.${record.exerciseId}.core`, issues)
    exactKeys(record.core?.name, LANGS, `record.${record.exerciseId}.core.name`, issues)
    exactKeys(record.core?.muscles, ['primary', 'secondary', 'secondaryCoarse'], `record.${record.exerciseId}.core.muscles`, issues)
    exactKeys(record.core?.defaults, ['sets', 'reps', 'restSec'], `record.${record.exerciseId}.core.defaults`, issues)
    exactKeys(record.authored, AUTHORING_FIELDS, `record.${record.exerciseId}.authored`, issues)
    for (const field of AUTHORING_FIELDS) exactKeys(record.authored?.[field], LANGS, `record.${record.exerciseId}.authored.${field}`, issues)
    exactKeys(record.completeness, ['coreMetadataComplete', 'bilingualAuthoredComplete', 'substitutionStatus', 'missing'], `record.${record.exerciseId}.completeness`, issues)
    exactKeys(record.completeness?.missing, ['core', 'bilingualAuthored', 'substitutions'], `record.${record.exerciseId}.completeness.missing`, issues)

    if (!isDeepStrictEqual(record.aliases, expectedRecord.aliases)) issue(issues, 'LIBRARY_SOURCE_IDENTITY', `alias provenance drift for ${record.exerciseId}`)
    if (!isDeepStrictEqual(record.core, expectedRecord.core)) issue(issues, 'LIBRARY_CORE_INTEGRITY', `core metadata drift for ${record.exerciseId}`)

    for (const field of AUTHORING_FIELDS) {
      for (const lang of LANGS) {
        const actualValue = record.authored?.[field]?.[lang]
        const expectedValue = expectedRecord.authored[field][lang]
        if (isDeepStrictEqual(actualValue, expectedValue)) continue
        if (lang === 'en' && !valueHasContent(expectedValue) && valueHasContent(actualValue)) {
          issue(issues, 'LIBRARY_MISSING_ENGLISH_VISIBILITY', `missing English was filled for ${record.exerciseId}.${field}`)
        } else if (lang === 'ar' && !valueHasContent(expectedValue) && valueHasContent(actualValue)) {
          issue(issues, 'LIBRARY_FALLBACK_IS_NOT_AUTHORED', `non-authored Arabic fallback was placed in ${record.exerciseId}.${field}`)
        } else {
          issue(issues, 'LIBRARY_AUTHORED_TEXT_INTEGRITY', `authored text drift for ${record.exerciseId}.${field}.${lang}`)
        }
      }
    }

    const substitutionsValid = Array.isArray(record.substitutions) && record.substitutions.every((id) => expectedById.has(id) && id !== record.exerciseId)
    if (!substitutionsValid || !isDeepStrictEqual(record.substitutions, expectedRecord.substitutions)) {
      issue(issues, 'LIBRARY_SUBSTITUTION_INTEGRITY', `substitution drift or invalid target for ${record.exerciseId}`)
    }
    if (!isDeepStrictEqual(record.completeness, expectedRecord.completeness)) {
      issue(issues, 'LIBRARY_COMPLETENESS_DRIFT', `computed gaps drift for ${record.exerciseId}`)
    }
  }

  if (!isDeepStrictEqual(candidate?.summary, expected.summary)) issue(issues, 'LIBRARY_COUNT_DRIFT', 'summary differs from deterministic record counts')
  return { issues, computedSummary: expected.summary }
}

export function serializeLibraryAudit(candidate) {
  return `${JSON.stringify(candidate, null, 2)}\n`
}
