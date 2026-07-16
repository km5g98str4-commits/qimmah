import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initMonitoring, scrubMonitoringBreadcrumb, scrubMonitoringEvent } from '@/lib/monitoring'

async function main(): Promise<void> {
  let sdkLoads = 0
  const started = await initMonitoring({
    dsn: '',
    loadSdk: async () => {
      sdkLoads += 1
      throw new Error('SDK loader must remain inert without a DSN')
    },
  })
  assert.equal(started, false)
  assert.equal(sdkLoads, 0, 'Sentry SDK was imported without a DSN')

  const boundary = new ErrorBoundary({ children: null })
  boundary.state = { hasError: true }
  const fallback = renderToStaticMarkup(boundary.render())
  assert.match(fallback, /حدث خطأ غير متوقع|صار خلل بسيط/)
  assert.match(fallback, /حدّث الصفحة|أعد المحاولة/)

  const planted = {
  message: 'Failure for person@example.com localStorage qimmah:history:v1',
  user: { id: 'real-user-42', email: 'person@example.com', username: 'Person' },
  request: {
    url: 'https://qimmah.app/#/profile?email=person@example.com',
    data: { weight: 90 },
    headers: { authorization: 'Bearer secret' },
  },
  extra: {
    ownerId: 'owner-9',
    payload: JSON.stringify({ health: 'private' }),
    note: 'contact person@example.com for 123e4567-e89b-42d3-a456-426614174000',
  },
  }
  const scrubbed = scrubMonitoringEvent(planted)
  const serialized = JSON.stringify(scrubbed)
  assert.doesNotMatch(serialized, /person@example\.com|real-user-42|owner-9|Bearer secret|private|qimmah:history|123e4567/)
  assert.equal('user' in scrubbed, false)
  assert.equal('data' in (scrubbed.request as Record<string, unknown>), false)
  assert.equal(scrubMonitoringBreadcrumb({ category: 'console', message: 'private' }), null)
  assert.deepEqual(
    scrubMonitoringBreadcrumb({ category: 'navigation', data: { from: '/a?email=person@example.com', to: '/b#private' } }),
    { category: 'navigation', data: { from: '/a', to: '/b' } },
  )

  console.log('✅ observability proof: inert SDK, rendered fallback, PII/storage scrubber')
}

void main()
