#!/usr/bin/env node

import {
  ContractValidationError,
  clone,
  generateFixtureBundle,
  loadFixtureSources,
  resolveFixtureAccess,
  runProviderIfAllowed,
  validateFixtureBundle,
} from './lib/contract-fixtures.mjs'

const sources = await loadFixtureSources()
const baseline = generateFixtureBundle(sources)
const summary = validateFixtureBundle(baseline, sources)

let assertions = 0

function check(name, condition) {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${name}`)
  assertions += 1
  console.log(`  ✓ ${name}`)
}

function scenario(bundle, state) {
  return bundle.scenarios.find((entry) => entry.state === state)
}

function chart(bundle, id) {
  return bundle.chartCases.find((entry) => entry.id === id)
}

const mutations = [
  {
    name: 'absence-to-zero',
    expectedCode: 'ABSENCE_IS_NOT_ZERO',
    mutate(bundle) {
      scenario(bundle, 'partial').data.metrics['workouts.completed7d'] = {
        metricName: 'workouts.completed7d',
        state: 'ready',
        value: 0,
        asOf: bundle.generatedAt,
        sourceVersion: bundle.sourceVersion,
        quality: { status: 'complete', coverageNumerator: 1, coverageDenominator: 1, caveats: [] },
      }
    },
  },
  {
    name: 'partial-without-missing-sections',
    expectedCode: 'PARTIAL_MISSING_SECTIONS',
    mutate(bundle) {
      scenario(bundle, 'partial').missingSections = []
    },
  },
  {
    name: 'stale-as-fresh',
    expectedCode: 'STALE_IS_NOT_FRESH',
    mutate(bundle) {
      bundle.metricCases.stale.state = 'ready'
      bundle.metricCases.stale.quality.status = 'complete'
    },
  },
  {
    name: 'active-series-in-workout',
    expectedCode: 'CHART_METRIC_IDENTITY',
    mutate(bundle) {
      chart(bundle, 'workoutCompletion').data.metricName = 'activity.signedInSeries'
    },
  },
  {
    name: 'active-series-in-retention',
    expectedCode: 'CHART_METRIC_IDENTITY',
    mutate(bundle) {
      chart(bundle, 'retention').data.metricName = 'activity.signedInSeries'
    },
  },
  {
    name: 'raw-email-field',
    expectedCode: 'RAW_EMAIL_FIELD',
    mutate(bundle) {
      bundle.userCases[0].email = 'raw-user@example.test'
    },
  },
  {
    name: 'health-field',
    expectedCode: 'HEALTH_FIELD',
    mutate(bundle) {
      bundle.userCases[0].weightKg = 82
    },
  },
  {
    name: 'forged-user-metadata-role',
    expectedCode: 'FORGED_USER_METADATA_ROLE',
    mutate(bundle) {
      const accepted = bundle.accessCases.find((entry) => entry.id === 'accepted-fixture-claim')
      const claimName = sources.contract.rolePolicy.fixture.claimName
      const role = sources.contract.rolePolicy.fixture.acceptedRole
      accepted.subject.app_metadata = {}
      accepted.subject.user_metadata = { [claimName]: role }
    },
  },
  {
    name: 'provider-call-in-denied',
    expectedCode: 'PROVIDER_CALLED_WHILE_DENIED',
    mutate(bundle) {
      scenario(bundle, 'denied').providerCalls = 1
    },
  },
  {
    name: 'provider-call-in-loading',
    expectedCode: 'PROVIDER_CALLED_WHILE_LOADING',
    mutate(bundle) {
      scenario(bundle, 'loading').providerCalls = 1
    },
  },
  {
    name: 'fake-control-capability',
    expectedCode: 'FAKE_CONTROL_CAPABILITY',
    mutate(bundle) {
      bundle.capabilities.refresh = false
    },
  },
]

console.log('Executive dashboard contract-fixture proof')
check('baseline bundle validates', summary.scenarios === 6)
check('schema/version/fingerprints are present', Boolean(summary.schemaVersion && summary.contractVersion && summary.sourceFingerprint && summary.bundleFingerprint))
check('all six top-level states exist', baseline.scenarios.map((entry) => entry.state).join(',') === 'denied,loading,empty,partial,error,ready')
check('metric datum cases cover ready/unavailable/stale', Object.keys(baseline.metricCases).join(',') === 'ready,unavailable,stale')
check('attention cases cover detected/clear/unmonitorable/error', baseline.attentionCases.map((entry) => entry.state).join(',') === 'detected,clear,unmonitorable,error')
check('production role policy remains ADM-001 with no assumed roles', sources.contract.rolePolicy.production.dependencyId === 'ADM-001' && sources.contract.rolePolicy.production.allowedRoles.length === 0)

const providerCounter = { calls: 0 }
const provider = async () => {
  providerCounter.calls += 1
  return { state: 'ready' }
}
await runProviderIfAllowed({ state: 'denied', reason: 'unauthorized' }, provider)
await runProviderIfAllowed({ state: 'loading', reason: 'auth-loading' }, provider)
check('runtime guard makes zero provider calls in denied/loading', providerCounter.calls === 0)

const fixtureRole = sources.contract.rolePolicy.fixture
const forgedDecision = resolveFixtureAccess(
  { id: 'mutated-user', app_metadata: {}, user_metadata: { [fixtureRole.claimName]: fixtureRole.acceptedRole } },
  fixtureRole,
)
check('runtime resolver rejects user_metadata role', forgedDecision.state === 'denied' && forgedDecision.reason === 'self-asserted-claim')

let killed = 0
for (const mutation of mutations) {
  const candidate = clone(baseline)
  mutation.mutate(candidate)
  try {
    validateFixtureBundle(candidate, sources)
    throw new Error(`MUTATION_SURVIVED: ${mutation.name}`)
  } catch (error) {
    if (!(error instanceof ContractValidationError)) throw error
    if (error.code !== mutation.expectedCode) {
      throw new Error(
        `WRONG_MUTATION_FAILURE: ${mutation.name} expected ${mutation.expectedCode}, received ${error.code}`,
      )
    }
    killed += 1
    console.log(`  ✓ [${mutation.name}] killed by ${error.code}`)
  }
}

check('all named mutations were killed', killed === mutations.length)
console.log(`PASS: ${assertions} positive assertions; ${killed} named mutations killed`)
