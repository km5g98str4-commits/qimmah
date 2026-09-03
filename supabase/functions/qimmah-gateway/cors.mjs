// Browser transport policy for qimmah-gateway.
//
// Qimmah has no Edge Function origin allowlist contract today, and the same
// gateway is called by production, branch previews, localhost staging, and the
// native wrapper. Supabase's documented wildcard policy is therefore used
// deliberately. Credentials mode is not enabled; JWT and gateway authority
// remain enforced by the request handler and database.

export const GATEWAY_CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  // Supabase JS browser headers (including its retry header).
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count',
  // The gateway contract accepts POST only; OPTIONS is transport preflight.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})

const corsResponse = (response) => {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(GATEWAY_CORS_HEADERS)) headers.set(name, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const withBrowserCors = async (request, handler, onInternalError) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: GATEWAY_CORS_HEADERS })
  }

  try {
    return corsResponse(await handler(request))
  } catch (error) {
    return corsResponse(onInternalError(error))
  }
}
