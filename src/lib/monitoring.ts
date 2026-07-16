import { BUILD_RELEASE } from '@/lib/buildInfo'
import { getAnonId } from '@/lib/analytics'

type UnknownRecord = Record<string, unknown>

interface MonitoringSdk {
  init(options: UnknownRecord): void
  captureException(error: unknown, hint?: (scope: { setTag(key: string, value: string): void }) => void): string
  setUser(user: { id: string } | null): void
}

export interface MonitoringInitOptions {
  dsn?: string
  environment?: string
  loadSdk?: () => Promise<MonitoringSdk>
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
const STORAGE_PATTERN = /(?:localStorage|sessionStorage|qimmah:[\w:-]+)/i
const SENSITIVE_KEY_PATTERN =
  /(?:e-?mail|user.?id|account.?id|owner.?id|storage|payload|password|passcode|secret|token|authorization|cookie|session)/i
const HASHED_ANON_PATTERN = /^anon-[a-f0-9]{64}$/
const BREADCRUMB_ALLOWLIST = new Set(['navigation'])

let sdk: MonitoringSdk | null = null
let initialization: Promise<boolean> | null = null

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value, 'https://qimmah.invalid')
    const prefix = url.origin === 'https://qimmah.invalid' ? '' : url.origin
    return `${prefix}${url.pathname}`
  } catch {
    return value.split(/[?#]/, 1)[0]
  }
}

function sanitizeString(value: string, key = ''): string {
  if (STORAGE_PATTERN.test(value)) return '[REDACTED_STORAGE]'
  const withoutIdentifiers = value
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(UUID_PATTERN, '[REDACTED_USER_ID]')
  return /(?:url|from|to)$/i.test(key) ? sanitizeUrl(withoutIdentifiers) : withoutIdentifiers
}

function scrubValue(value: unknown, key = '', seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value === 'string') return sanitizeString(value, key)
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[REDACTED_CYCLE]'

  if (Array.isArray(value)) {
    const result: unknown[] = []
    seen.set(value, result)
    value.forEach((entry) => result.push(scrubValue(entry, key, seen)))
    return result
  }

  const result: UnknownRecord = {}
  seen.set(value, result)
  for (const [entryKey, entryValue] of Object.entries(value as UnknownRecord)) {
    result[entryKey] = SENSITIVE_KEY_PATTERN.test(entryKey)
      ? '[REDACTED]'
      : scrubValue(entryValue, entryKey, seen)
  }
  return result
}

/** Privacy boundary applied to every event before it can leave the device. */
export function scrubMonitoringEvent<T extends UnknownRecord>(event: T): T {
  const scrubbed = scrubValue(event) as T
  const rawUser = event.user
  const anonymousId =
    rawUser && typeof rawUser === 'object' && typeof (rawUser as UnknownRecord).id === 'string'
      ? String((rawUser as UnknownRecord).id)
      : ''

  if (HASHED_ANON_PATTERN.test(anonymousId)) {
    Object.assign(scrubbed, { user: { id: anonymousId } })
  } else {
    delete (scrubbed as UnknownRecord).user
  }

  if (scrubbed.request && typeof scrubbed.request === 'object') {
    const request = scrubbed.request as UnknownRecord
    delete request.data
    delete request.cookies
    delete request.headers
    delete request.query_string
  }
  return scrubbed
}

/** Breadcrumbs are deny-by-default; only query-free navigation paths survive. */
export function scrubMonitoringBreadcrumb<T extends UnknownRecord>(breadcrumb: T): T | null {
  if (!BREADCRUMB_ALLOWLIST.has(String(breadcrumb.category ?? ''))) return null
  return scrubValue(breadcrumb) as T
}

async function hashedAnonymousId(): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  const source = new TextEncoder().encode(getAnonId())
  const digest = await crypto.subtle.digest('SHA-256', source)
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `anon-${hex}`
}

/**
 * Starts monitoring only when an explicit DSN exists. With no DSN this returns
 * before importing the SDK, touching Sentry, or scheduling any network work.
 */
export function initMonitoring(options: MonitoringInitOptions = {}): Promise<boolean> {
  const dsn = (options.dsn ?? import.meta.env.VITE_SENTRY_DSN ?? '').trim()
  if (!dsn) return Promise.resolve(false)
  if (initialization) return initialization

  const loadSdk = options.loadSdk ?? (() => import('@sentry/react') as Promise<unknown> as Promise<MonitoringSdk>)
  initialization = loadSdk()
    .then(async (loadedSdk) => {
      loadedSdk.init({
        dsn,
        release: BUILD_RELEASE,
        environment: options.environment ?? import.meta.env.MODE,
        sendDefaultPii: false,
        maxBreadcrumbs: 20,
        beforeSend: (event: UnknownRecord) => scrubMonitoringEvent(event),
        beforeBreadcrumb: (breadcrumb: UnknownRecord) => scrubMonitoringBreadcrumb(breadcrumb),
      })
      sdk = loadedSdk
      const anonId = await hashedAnonymousId()
      loadedSdk.setUser(anonId ? { id: anonId } : null)
      return true
    })
    .catch(() => {
      sdk = null
      initialization = null
      return false
    })
  return initialization
}

export function captureMonitoringError(
  error: unknown,
  source: 'render' | 'route' | 'window' | 'promise',
): void {
  try {
    sdk?.captureException(error, (scope) => scope.setTag('qimmah.error_source', source))
  } catch {
    // Monitoring must never become an application failure.
  }
}
