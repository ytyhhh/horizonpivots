module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!url || !key || !clerkKey) {
    response.statusCode = 503
    response.end(JSON.stringify({ ok: false, configured: false, message: 'Clerk or Supabase environment variables are missing' }))
    return
  }
  try {
    const result = await fetch(`${url.replace(/\/$/, '')}/rest/v1/cuhksz_courses?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    response.statusCode = result.ok ? 200 : 502
    response.end(JSON.stringify({ ok: result.ok, configured: true, supabaseStatus: result.status }))
  } catch (error) {
    response.statusCode = 502
    response.end(JSON.stringify({ ok: false, configured: true, message: error.message }))
  }
}
