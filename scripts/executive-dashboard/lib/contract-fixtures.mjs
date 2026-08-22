import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const CONTRACT_URL = new URL('../../../data/executive-dashboard/contract.v1.json', import.meta.url)
const FIXTURE_SOURCE_URL = new URL('../../../data/executive-dashboard/fixture-source.v1.json', import.meta.url)

const CONTRACT_SCHEMA = 'qimmah.executive-dashboard.fixture-contract-source/v1'
const FIXTURE_SOURCE_SCHEMA = 'qimmah.executive-dashboard.fixture-source/v1'
const BUNDLE_SCHEMA = 'qimmah.executive-dashboard.fixture-bundle/v1'

export class ContractValidationError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`)
    this.name = 'ContractValidationError'
    this.code = code
  }
}

function fail(code, message) {
  throw new ContractValidationError(code, message)
}

function assert(condition, code, message) {
  if (!condition) fail(code, message)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isObject(value)) return value

  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((key) => [key, stableValue(value[key])]),
  )
}

export function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`
}

export function clone(value) {
  return structuredClone(value)
}

function withoutIntegrity(source, keys) {
  const copy = clone(source)
  for (const key of keys) delete copy[key]
  return copy
}

export function computeSourceFingerprint(sources) {
  return sha256({
    contract: withoutIntegrity(sources.contract, ['sourceFingerprint']),
    fixtureSource: withoutIntegrity(sources.fixtureSource, ['sourceFingerprint', 'expectedBundleFingerprint']),
  })
}

function assertExactSet(actual, expected, code, label) {
  const a = [...new Set(actual)].sort()
  const e = [...new Set(expected)].sort()
  assert(stableStringify(a) === stableStringify(e), code, `${label} must equal ${e.join(', ')}`)
}

function assertIso(value, code, label) {
  assert(typeof value === 'string' && Number.isFinite(Date.parse(value)), code, `${label} must be an ISO timestamp`)
}

function validateSourceShape(sources) {
  const { contract, fixtureSource } = sources
  assert(isObject(contract), 'CONTRACT_SOURCE_INVALID', 'contract source must be an object')
  assert(isObject(fixtureSource), 'FIXTURE_SOURCE_INVALID', 'fixture source must be an object')
  assert(contract.schemaVersion === CONTRACT_SCHEMA, 'SCHEMA_VERSION_MISMATCH', 'contract schema version is unsupported')
  assert(
    fixtureSource.schemaVersion === FIXTURE_SOURCE_SCHEMA,
    'SCHEMA_VERSION_MISMATCH',
    'fixture source schema version is unsupported',
  )
  assert(
    contract.contractVersion === fixtureSource.contractVersion,
    'CONTRACT_VERSION_MISMATCH',
    'contract and fixture source versions differ',
  )
  assert(contract.wiringState === 'EXTERNALLY_BLOCKED', 'LIVE_WIRING_FORBIDDEN', 'fixture package cannot claim live wiring')
  const productionRolePolicy = contract.rolePolicy?.production
  assert(
    isObject(productionRolePolicy) &&
      productionRolePolicy.state === 'dependency' &&
      productionRolePolicy.dependencyId === 'ADM-001' &&
      Array.isArray(productionRolePolicy.allowedRoles) &&
      productionRolePolicy.allowedRoles.length === 0,
    'ROLE_POLICY_ASSUMED',
    'production roles must remain unresolved behind ADM-001',
  )
  const fixtureRolePolicy = contract.rolePolicy?.fixture
  assert(
    isObject(fixtureRolePolicy) &&
      typeof fixtureRolePolicy.claimName === 'string' &&
      fixtureRolePolicy.acceptedRole === 'fixture-admin' &&
      fixtureRolePolicy.acceptedClaimPath === 'session.user.app_metadata' &&
      fixtureRolePolicy.rejectedClaimPath === 'session.user.user_metadata',
    'FIXTURE_ROLE_POLICY_INVALID',
    'fixture role must remain synthetic and use the session.user claim seam',
  )
  assert(Array.isArray(contract.topLevelStates), 'TOP_LEVEL_STATE_SET_INVALID', 'top-level states must be an array')
  assertExactSet(
    contract.topLevelStates,
    ['denied', 'loading', 'empty', 'partial', 'error', 'ready'],
    'TOP_LEVEL_STATE_SET_INVALID',
    'top-level states',
  )
  assert(Array.isArray(contract.metricDatumStates), 'METRIC_STATE_SET_INVALID', 'metric datum states must be an array')
  assertExactSet(
    contract.metricDatumStates,
    ['ready', 'unavailable', 'stale'],
    'METRIC_STATE_SET_INVALID',
    'metric datum states',
  )
  assert(Array.isArray(contract.attentionStates), 'ATTENTION_STATE_SET_INVALID', 'attention states must be an array')
  assertExactSet(
    contract.attentionStates,
    ['detected', 'clear', 'unmonitorable', 'error'],
    'ATTENTION_STATE_SET_INVALID',
    'attention states',
  )
  for (const field of ['userFieldAllowlist', 'rawEmailFields', 'healthFieldDenylist', 'sensitiveFieldDenylist', 'capabilities']) {
    assert(Array.isArray(contract[field]) && contract[field].length > 0, 'CONTRACT_ALLOWLIST_INVALID', `${field} must be a non-empty array`)
  }
  assert(isObject(contract.metricIdentity), 'CHART_IDENTITY_INVALID', 'metricIdentity must be an object')
  assert(Array.isArray(fixtureSource.users), 'FIXTURE_USERS_INVALID', 'users must be an array')
  assert(isObject(fixtureSource.series), 'FIXTURE_SERIES_INVALID', 'series must be an object')
  assert(Array.isArray(fixtureSource.retentionCohorts), 'FIXTURE_RETENTION_INVALID', 'retentionCohorts must be an array')
  assert(Array.isArray(fixtureSource.attention), 'FIXTURE_ATTENTION_INVALID', 'attention must be an array')
  assert(isObject(fixtureSource.capabilities), 'FIXTURE_CAPABILITIES_INVALID', 'capabilities must be an object')
  assertIso(fixtureSource.referenceTime, 'REFERENCE_TIME_INVALID', 'referenceTime')
  assert(
    typeof fixtureSource.sourceVersion === 'string' && fixtureSource.sourceVersion.length > 0,
    'SOURCE_VERSION_MISSING',
    'sourceVersion is required',
  )
}

export function validateSourceIntegrity(sources) {
  validateSourceShape(sources)
  const expected = computeSourceFingerprint(sources)
  assert(
    sources.contract.sourceFingerprint === expected,
    'SOURCE_FINGERPRINT_MISMATCH',
    `contract declares ${sources.contract.sourceFingerprint}; expected ${expected}`,
  )
  assert(
    sources.fixtureSource.sourceFingerprint === expected,
    'SOURCE_FINGERPRINT_MISMATCH',
    `fixture source declares ${sources.fixtureSource.sourceFingerprint}; expected ${expected}`,
  )
  return expected
}

export async function loadFixtureSources({ verifyIntegrity = true } = {}) {
  const [contractText, fixtureText] = await Promise.all([
    readFile(CONTRACT_URL, 'utf8'),
    readFile(FIXTURE_SOURCE_URL, 'utf8'),
  ])
  const sources = {
    contract: JSON.parse(contractText),
    fixtureSource: JSON.parse(fixtureText),
  }
  validateSourceShape(sources)
  if (verifyIntegrity) validateSourceIntegrity(sources)
  return sources
}

function quality(status = 'complete', caveats = []) {
  return {
    status,
    coverageNumerator: status === 'complete' ? 1 : null,
    coverageDenominator: status === 'complete' ? 1 : null,
    caveats,
  }
}

function readyMetric(metricName, value, asOf, sourceVersion) {
  return {
    metricName,
    state: 'ready',
    value,
    asOf,
    sourceVersion,
    quality: quality(),
  }
}

function unavailableMetric(metricName, reason, owner) {
  return {
    metricName,
    state: 'unavailable',
    reason,
    owner,
  }
}

function staleMetric(metricName, value, asOf, sourceVersion, maxAgeSeconds) {
  return {
    metricName,
    state: 'stale',
    value,
    asOf,
    sourceVersion,
    maxAgeSeconds,
    staleReason: 'age-exceeded',
    quality: quality('stale', ['Fixture timestamp intentionally exceeds maxAgeSeconds.']),
  }
}

function buildUsers(source, referenceTime, sourceVersion) {
  return source.users.map((user, index) => ({
    ...user,
    workoutsCountWindow: readyMetric('user.workoutsCountWindow', 4 + index, referenceTime, sourceVersion),
    lastWorkoutAt: readyMetric(
      'user.lastWorkoutAt',
      index === 0 ? '2026-08-21T17:20:00.000Z' : '2026-08-18T10:00:00.000Z',
      referenceTime,
      sourceVersion,
    ),
    nutritionActivity: readyMetric('user.nutritionActivity', 3 + index, referenceTime, sourceVersion),
    measurementActivity: readyMetric('user.measurementActivity', index, referenceTime, sourceVersion),
  }))
}

function buildCharts(contract, source, referenceTime) {
  const charts = []
  for (const [id, identity] of Object.entries(contract.metricIdentity)) {
    if (identity.kind === 'cohort-matrix') {
      charts.push({
        id,
        kind: identity.kind,
        data: {
          metricName: identity.metricName,
          definitionVersion: contract.contractVersion,
          cohorts: clone(source.retentionCohorts),
          asOf: referenceTime,
          sourceVersion: source.sourceVersion,
          quality: quality(),
        },
      })
      continue
    }

    charts.push({
      id,
      kind: identity.kind,
      data: {
        metricName: identity.metricName,
        definitionVersion: contract.contractVersion,
        points: source.series[identity.metricName].map(([bucketStart, value]) => ({ bucketStart, value })),
        asOf: referenceTime,
        sourceVersion: source.sourceVersion,
        quality: quality(),
      },
    })
  }
  return charts
}

export function resolveFixtureAccess(subject, fixtureRolePolicy) {
  if (!subject) return { state: 'denied', reason: 'no-session' }

  const claimName = fixtureRolePolicy.claimName
  const appClaim = subject.app_metadata?.[claimName]
  const userClaim = subject.user_metadata?.[claimName]
  if (appClaim === undefined && userClaim !== undefined) {
    return { state: 'denied', reason: 'self-asserted-claim' }
  }
  if (appClaim === undefined || appClaim === null) {
    return { state: 'denied', reason: 'missing-server-claim' }
  }
  if (appClaim !== fixtureRolePolicy.acceptedRole) {
    return { state: 'denied', reason: 'unaccepted-server-claim' }
  }
  return {
    state: 'allowed',
    role: fixtureRolePolicy.acceptedRole,
    source: 'verified-app-metadata',
  }
}

export async function runProviderIfAllowed(decision, provider) {
  if (decision.state !== 'allowed') return { called: false, result: null }
  return { called: true, result: await provider() }
}

function buildAccessCases(contract) {
  const rolePolicy = contract.rolePolicy.fixture
  const acceptedSubject = {
    id: 'fixture-admin-subject',
    app_metadata: { [rolePolicy.claimName]: rolePolicy.acceptedRole },
    user_metadata: {},
  }
  const forgedSubject = {
    id: 'fixture-forged-subject',
    app_metadata: {},
    user_metadata: { [rolePolicy.claimName]: rolePolicy.acceptedRole },
  }
  return [
    { id: 'no-session', subject: null, decision: resolveFixtureAccess(null, rolePolicy) },
    {
      id: 'forged-user-metadata',
      subject: forgedSubject,
      decision: resolveFixtureAccess(forgedSubject, rolePolicy),
    },
    {
      id: 'accepted-fixture-claim',
      subject: acceptedSubject,
      decision: resolveFixtureAccess(acceptedSubject, rolePolicy),
    },
  ]
}

function buildScenarioData({ metrics, charts, users, attention }) {
  return { metrics, charts, users, attention }
}

function buildScenarios(source, metrics, charts, users, attention) {
  const { referenceTime, sourceVersion } = source
  const partialMissing = ['charts.retention', 'charts.workoutCompletion']
  const partialCharts = charts.filter((chart) => !['retention', 'workoutCompletion'].includes(chart.id))

  return [
    {
      id: 'denied',
      state: 'denied',
      reason: 'unauthorized',
      providerCalls: 0,
      data: null,
    },
    {
      id: 'loading',
      state: 'loading',
      startedAt: referenceTime,
      providerCalls: 0,
      data: null,
    },
    {
      id: 'empty',
      state: 'empty',
      authoritative: true,
      asOf: referenceTime,
      sourceVersion,
      providerCalls: 1,
      data: buildScenarioData({
        metrics: { 'users.total': readyMetric('users.total', 0, referenceTime, sourceVersion) },
        charts: [],
        users: [],
        attention: [],
      }),
    },
    {
      id: 'partial',
      state: 'partial',
      asOf: referenceTime,
      sourceVersion,
      providerCalls: 1,
      missingSections: partialMissing,
      quality: quality('partial', ['Workout and retention chart sources are unavailable.']),
      data: buildScenarioData({
        metrics: {
          'users.total': readyMetric('users.total', 3, referenceTime, sourceVersion),
          'workouts.completed7d': clone(metrics.unavailable),
          'activity.signedIn7d': clone(metrics.stale),
        },
        charts: partialCharts,
        users: users.slice(0, 1),
        attention,
      }),
    },
    {
      id: 'error',
      state: 'error',
      code: 'FIXTURE_PROVIDER_UNAVAILABLE',
      retryable: true,
      occurredAt: referenceTime,
      providerCalls: 1,
      data: null,
    },
    {
      id: 'ready',
      state: 'ready',
      asOf: referenceTime,
      sourceVersion,
      providerCalls: 1,
      quality: quality(),
      data: buildScenarioData({
        metrics: {
          'users.total': readyMetric('users.total', 3, referenceTime, sourceVersion),
          'workouts.completed7d': readyMetric('workouts.completed7d', 9, referenceTime, sourceVersion),
          'activity.signedIn7d': readyMetric('activity.signedIn7d', 2, referenceTime, sourceVersion),
        },
        charts,
        users,
        attention: attention.filter((item) => ['detected', 'clear'].includes(item.state)),
      }),
    },
  ]
}

export function computeBundleFingerprint(bundle) {
  return sha256(withoutIntegrity(bundle, ['bundleFingerprint']))
}

export function generateFixtureBundle(sources) {
  validateSourceShape(sources)
  const { contract, fixtureSource } = sources
  const sourceFingerprint = computeSourceFingerprint(sources)
  const metrics = {
    ready: readyMetric('users.total', 3, fixtureSource.referenceTime, fixtureSource.sourceVersion),
    unavailable: unavailableMetric('workouts.completed7d', 'IMPOSSIBLE_WITH_CURRENT_CONSENT', 'product'),
    stale: staleMetric(
      'activity.signedIn7d',
      2,
      '2026-08-20T09:00:00.000Z',
      fixtureSource.sourceVersion,
      3600,
    ),
  }
  const charts = buildCharts(contract, fixtureSource, fixtureSource.referenceTime)
  const users = buildUsers(fixtureSource, fixtureSource.referenceTime, fixtureSource.sourceVersion)
  const attention = fixtureSource.attention.map((item) => ({
    ...item,
    sourceVersion: fixtureSource.sourceVersion,
    quality: quality(item.state === 'unmonitorable' || item.state === 'error' ? 'unknown' : 'complete'),
  }))
  const capabilities = clone(fixtureSource.capabilities)
  const controls = [
    { id: 'refresh', requiresCapability: 'refresh' },
    { id: 'openUser', requiresCapability: 'openUser' },
  ]

  const bundle = {
    schemaVersion: BUNDLE_SCHEMA,
    contractVersion: contract.contractVersion,
    sourceFingerprint,
    sourceVersion: fixtureSource.sourceVersion,
    generatedAt: fixtureSource.referenceTime,
    synthetic: true,
    liveReady: false,
    accessCases: buildAccessCases(contract),
    metricCases: metrics,
    chartCases: charts,
    userCases: users,
    attentionCases: attention,
    capabilities,
    controls,
    scenarios: buildScenarios(fixtureSource, metrics, charts, users, attention),
  }

  return { ...bundle, bundleFingerprint: computeBundleFingerprint(bundle) }
}

function validateQuality(value, code, label) {
  assert(isObject(value), code, `${label}.quality is required`)
  assert(
    ['complete', 'partial', 'stale', 'unknown'].includes(value.status),
    code,
    `${label}.quality.status is invalid`,
  )
  assert(Array.isArray(value.caveats), code, `${label}.quality.caveats must be an array`)
}

function validateMetricDatum(metric, referenceTime, label) {
  assert(isObject(metric), 'METRIC_DATUM_INVALID', `${label} must be an object`)
  assert(typeof metric.metricName === 'string' && metric.metricName.length > 0, 'METRIC_NAME_MISSING', `${label} needs metricName`)
  assert(['ready', 'unavailable', 'stale'].includes(metric.state), 'METRIC_STATE_INVALID', `${label} has invalid state`)

  if (metric.state === 'unavailable') {
    assert(!Object.hasOwn(metric, 'value'), 'ABSENCE_IS_NOT_ZERO', `${label} unavailable datum cannot carry a value`)
    assert(typeof metric.reason === 'string' && metric.reason.length > 0, 'UNAVAILABLE_REASON_MISSING', `${label} needs reason`)
    assert(typeof metric.owner === 'string' && metric.owner.length > 0, 'UNAVAILABLE_OWNER_MISSING', `${label} needs owner`)
    return
  }

  assert(Object.hasOwn(metric, 'value'), 'METRIC_VALUE_MISSING', `${label} needs value`)
  assertIso(metric.asOf, 'METRIC_AS_OF_INVALID', `${label}.asOf`)
  assert(typeof metric.sourceVersion === 'string' && metric.sourceVersion.length > 0, 'SOURCE_VERSION_MISSING', `${label} needs sourceVersion`)
  validateQuality(metric.quality, 'METRIC_QUALITY_INVALID', label)

  if (metric.state === 'stale') {
    assert(Number.isFinite(metric.maxAgeSeconds) && metric.maxAgeSeconds > 0, 'STALE_MAX_AGE_INVALID', `${label} needs maxAgeSeconds`)
    const ageMs = Date.parse(referenceTime) - Date.parse(metric.asOf)
    assert(ageMs > metric.maxAgeSeconds * 1000, 'STALE_IS_NOT_FRESH', `${label} does not exceed maxAgeSeconds`)
    assert(typeof metric.staleReason === 'string' && metric.staleReason.length > 0, 'STALE_REASON_MISSING', `${label} needs staleReason`)
  }
}

function validateCharts(bundle, contract) {
  const seen = new Set()
  for (const chart of bundle.chartCases) {
    const expected = contract.metricIdentity[chart.id]
    assert(expected, 'CHART_ID_UNKNOWN', `chart ${chart.id} is not declared`)
    assert(!seen.has(chart.id), 'CHART_ID_DUPLICATE', `chart ${chart.id} is duplicated`)
    seen.add(chart.id)
    assert(
      chart.kind === expected.kind && chart.data?.metricName === expected.metricName,
      'CHART_METRIC_IDENTITY',
      `${chart.id} must carry ${expected.kind}/${expected.metricName}`,
    )
    assert(chart.data.definitionVersion === bundle.contractVersion, 'CHART_DEFINITION_VERSION', `${chart.id} version drifted`)
    assertIso(chart.data.asOf, 'CHART_AS_OF_INVALID', `${chart.id}.asOf`)
    validateQuality(chart.data.quality, 'CHART_QUALITY_INVALID', chart.id)
  }
  assertExactSet(seen, Object.keys(contract.metricIdentity), 'CHART_SET_INVALID', 'chart identities')
}

function validateUsers(bundle, contract) {
  const allowed = new Set(contract.userFieldAllowlist)
  const rawEmailFields = new Set(contract.rawEmailFields)
  const healthFields = new Set(contract.healthFieldDenylist)
  const sensitiveFields = new Set(contract.sensitiveFieldDenylist)

  for (const [index, user] of bundle.userCases.entries()) {
    for (const key of Object.keys(user)) {
      if (rawEmailFields.has(key)) fail('RAW_EMAIL_FIELD', `userCases[${index}] contains ${key}`)
      if (healthFields.has(key)) fail('HEALTH_FIELD', `userCases[${index}] contains ${key}`)
      if (sensitiveFields.has(key)) fail('SENSITIVE_FIELD', `userCases[${index}] contains ${key}`)
      assert(allowed.has(key), 'USER_FIELD_ALLOWLIST', `userCases[${index}] contains undeclared ${key}`)
    }
    assertExactSet(Object.keys(user), contract.userFieldAllowlist, 'USER_FIELD_ALLOWLIST', `userCases[${index}] fields`)
    assert(
      typeof user.emailMasked === 'string' && user.emailMasked.includes('•') && user.emailMasked.endsWith('@example.test'),
      'RAW_EMAIL_FIELD',
      `userCases[${index}] email must remain synthetic and masked`,
    )
    for (const field of ['workoutsCountWindow', 'lastWorkoutAt', 'nutritionActivity', 'measurementActivity']) {
      validateMetricDatum(user[field], bundle.generatedAt, `userCases[${index}].${field}`)
    }
  }
}

function validateAttention(bundle, contract) {
  assertExactSet(
    bundle.attentionCases.map((item) => item.state),
    contract.attentionStates,
    'ATTENTION_STATE_SET_INVALID',
    'attention states',
  )
  for (const item of bundle.attentionCases) {
    for (const field of ['id', 'source', 'sourceVersion', 'owner', 'window', 'threshold', 'freshness']) {
      assert(typeof item[field] === 'string' && item[field].length > 0, 'ATTENTION_PROVENANCE_MISSING', `${item.id}.${field} is required`)
    }
    validateQuality(item.quality, 'ATTENTION_QUALITY_INVALID', item.id)
    if (item.state === 'detected' || item.state === 'clear') {
      assertIso(item.asOf, 'ATTENTION_AS_OF_INVALID', `${item.id}.asOf`)
    } else {
      assert(item.asOf === null, 'ATTENTION_AS_OF_INVALID', `${item.id}.asOf must be null when not measured`)
    }
  }
}

function validateAccessCases(bundle, contract) {
  const policy = contract.rolePolicy.fixture
  for (const accessCase of bundle.accessCases) {
    const userClaim = accessCase.subject?.user_metadata?.[policy.claimName]
    if (userClaim !== undefined && accessCase.decision.state === 'allowed') {
      fail('FORGED_USER_METADATA_ROLE', `${accessCase.id} accepted a self-asserted role`)
    }
    const expected = resolveFixtureAccess(accessCase.subject, policy)
    assert(
      stableStringify(accessCase.decision) === stableStringify(expected),
      'ACCESS_DECISION_MISMATCH',
      `${accessCase.id} decision does not match fail-closed resolution`,
    )
  }
}

function validateControls(bundle, contract) {
  assertExactSet(Object.keys(bundle.capabilities), contract.capabilities, 'CAPABILITY_SET_INVALID', 'capabilities')
  for (const control of bundle.controls) {
    assert(contract.capabilities.includes(control.requiresCapability), 'CONTROL_CAPABILITY_UNKNOWN', `${control.id} capability is unknown`)
    assert(
      bundle.capabilities[control.requiresCapability] === true,
      'FAKE_CONTROL_CAPABILITY',
      `${control.id} is present without ${control.requiresCapability}`,
    )
  }
}

function scenarioByState(bundle, state) {
  return bundle.scenarios.find((scenario) => scenario.state === state)
}

function validateScenarios(bundle, contract) {
  assertExactSet(
    bundle.scenarios.map((scenario) => scenario.state),
    contract.topLevelStates,
    'TOP_LEVEL_STATE_SET_INVALID',
    'scenario states',
  )
  for (const scenario of bundle.scenarios) {
    assert(scenario.id === scenario.state, 'SCENARIO_ID_STATE_DRIFT', `${scenario.id} must match ${scenario.state}`)
  }

  for (const state of ['denied', 'loading']) {
    const scenario = scenarioByState(bundle, state)
    const code = state === 'denied' ? 'PROVIDER_CALLED_WHILE_DENIED' : 'PROVIDER_CALLED_WHILE_LOADING'
    assert(scenario.providerCalls === 0, code, `${state} recorded ${scenario.providerCalls} provider calls`)
    assert(scenario.data === null, code, `${state} cannot carry provider data`)
  }

  const empty = scenarioByState(bundle, 'empty')
  assert(empty.authoritative === true, 'EMPTY_NOT_AUTHORITATIVE', 'empty must come from an authoritative response')
  const emptyTotal = empty.data?.metrics?.['users.total']
  assert(
    emptyTotal?.state === 'ready' && emptyTotal.value === 0,
    'EMPTY_ZERO_NOT_MEASURED',
    'empty users.total must be a measured ready zero',
  )

  const partial = scenarioByState(bundle, 'partial')
  assert(
    Array.isArray(partial.missingSections) && partial.missingSections.length > 0,
    'PARTIAL_MISSING_SECTIONS',
    'partial must name missing sections',
  )
  assert(
    partial.data?.metrics?.['workouts.completed7d']?.state === 'unavailable',
    'ABSENCE_IS_NOT_ZERO',
    'partial workout metric must remain unavailable',
  )
  assert(
    partial.data?.metrics?.['activity.signedIn7d']?.state === 'stale',
    'STALE_IS_NOT_FRESH',
    'partial signed-in metric must remain stale',
  )

  const error = scenarioByState(bundle, 'error')
  assert(error.data === null && typeof error.code === 'string', 'ERROR_STATE_INVALID', 'error cannot carry dashboard data')
  const ready = scenarioByState(bundle, 'ready')
  assert(ready.quality?.status === 'complete', 'READY_QUALITY_INVALID', 'ready must declare complete quality')

  for (const scenario of [empty, partial, ready]) {
    for (const [metricName, metric] of Object.entries(scenario.data.metrics)) {
      validateMetricDatum(metric, bundle.generatedAt, `${scenario.id}.metrics.${metricName}`)
    }
  }
}

export function validateFixtureBundle(bundle, sources) {
  validateSourceIntegrity(sources)
  const { contract, fixtureSource } = sources
  assert(bundle.schemaVersion === BUNDLE_SCHEMA, 'SCHEMA_VERSION_MISMATCH', 'bundle schema version is unsupported')
  assert(bundle.contractVersion === contract.contractVersion, 'CONTRACT_VERSION_MISMATCH', 'bundle contract version drifted')
  assert(bundle.sourceFingerprint === computeSourceFingerprint(sources), 'SOURCE_FINGERPRINT_MISMATCH', 'bundle source fingerprint drifted')
  assert(bundle.synthetic === true && bundle.liveReady === false, 'LIVE_READINESS_CLAIM', 'fixtures must stay synthetic and not live-ready')
  assertIso(bundle.generatedAt, 'GENERATED_AT_INVALID', 'generatedAt')
  assert(bundle.generatedAt === fixtureSource.referenceTime, 'NONDETERMINISTIC_TIME', 'generatedAt must equal fixed referenceTime')

  validateScenarios(bundle, contract)
  assert(bundle.metricCases.ready.state === 'ready', 'METRIC_READY_CASE_MISSING', 'ready metric case drifted')
  assert(bundle.metricCases.unavailable.state === 'unavailable', 'ABSENCE_IS_NOT_ZERO', 'unavailable metric case drifted')
  assert(bundle.metricCases.stale.state === 'stale', 'STALE_IS_NOT_FRESH', 'stale metric case drifted')
  for (const [name, metric] of Object.entries(bundle.metricCases)) {
    validateMetricDatum(metric, bundle.generatedAt, `metricCases.${name}`)
  }
  validateCharts(bundle, contract)
  validateUsers(bundle, contract)
  validateAttention(bundle, contract)
  validateAccessCases(bundle, contract)
  validateControls(bundle, contract)

  const computedBundleFingerprint = computeBundleFingerprint(bundle)
  assert(
    bundle.bundleFingerprint === computedBundleFingerprint,
    'BUNDLE_FINGERPRINT_MISMATCH',
    `bundle declares ${bundle.bundleFingerprint}; expected ${computedBundleFingerprint}`,
  )
  assert(
    fixtureSource.expectedBundleFingerprint === computedBundleFingerprint,
    'BUNDLE_FINGERPRINT_MISMATCH',
    `fixture source expects ${fixtureSource.expectedBundleFingerprint}; generated ${computedBundleFingerprint}`,
  )

  return {
    schemaVersion: bundle.schemaVersion,
    contractVersion: bundle.contractVersion,
    sourceFingerprint: bundle.sourceFingerprint,
    bundleFingerprint: bundle.bundleFingerprint,
    scenarios: bundle.scenarios.length,
    metricCases: Object.keys(bundle.metricCases).length,
    chartCases: bundle.chartCases.length,
    userCases: bundle.userCases.length,
    attentionCases: bundle.attentionCases.length,
  }
}
