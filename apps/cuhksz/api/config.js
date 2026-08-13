module.exports = (request, response) => {
  if (request.method !== 'GET') {
    response.statusCode = 405
    response.setHeader('Allow', 'GET')
    response.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.statusCode = 200
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  response.end(JSON.stringify({
    mode: supabaseUrl && supabasePublishableKey && clerkPublishableKey ? 'live' : 'setup-required',
    supabaseUrl,
    supabasePublishableKey,
    clerkPublishableKey,
    platformUrl: process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://horizonpivots.com',
  }))
}
