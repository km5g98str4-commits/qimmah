export interface LegalLaunchConfig {
  ready: boolean
  unresolved: string[]
  controllerNameAr: string
  controllerNameEn: string
  contactEmail: string
  effectiveDate: string
  governingVenueAr: string
  governingVenueEn: string
  dataRegionAr: string
  dataRegionEn: string
  legalReviewId: string
}

type Env = Record<string, string | undefined>

const fields = {
  controllerNameAr: 'VITE_LEGAL_CONTROLLER_NAME_AR',
  controllerNameEn: 'VITE_LEGAL_CONTROLLER_NAME_EN',
  contactEmail: 'VITE_LEGAL_CONTACT_EMAIL',
  effectiveDate: 'VITE_LEGAL_EFFECTIVE_DATE',
  governingVenueAr: 'VITE_LEGAL_GOVERNING_VENUE_AR',
  governingVenueEn: 'VITE_LEGAL_GOVERNING_VENUE_EN',
  dataRegionAr: 'VITE_LEGAL_DATA_REGION_AR',
  dataRegionEn: 'VITE_LEGAL_DATA_REGION_EN',
  legalReviewId: 'VITE_LEGAL_REVIEW_ID',
} as const

export function resolveLegalLaunchConfig(env: Env): LegalLaunchConfig {
  const unresolved: string[] = []
  const values = Object.fromEntries(Object.entries(fields).map(([key, envName]) => {
    const value = env[envName]?.trim() ?? ''
    if (!value) unresolved.push(envName)
    return [key, value]
  })) as Omit<LegalLaunchConfig, 'ready' | 'unresolved'>
  if (env.VITE_LEGAL_REVIEW_APPROVED !== 'true') unresolved.push('VITE_LEGAL_REVIEW_APPROVED=true')
  return { ...values, unresolved, ready: unresolved.length === 0 }
}

/** يمنع فرع Cloudflare الإنتاجي من البناء قبل اكتمال حقول المالك واعتماد المراجعة. */
export function assertProductionLegalReady(env: Env, config = resolveLegalLaunchConfig(env)): void {
  if (env.CF_PAGES_BRANCH === 'main' && !config.ready) {
    throw new Error(`LEGAL_LAUNCH_BLOCKED: ${config.unresolved.join(', ')}`)
  }
}
