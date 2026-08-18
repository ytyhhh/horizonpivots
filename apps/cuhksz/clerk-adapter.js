(() => {
  let clerk = null
  let settings = {}

  async function initialize(config) {
    settings = config || {}
    if (!settings.clerkPublishableKey) return null
    if (clerk) return clerk
    const { Clerk } = await import('https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/+esm')
    clerk = new Clerk(settings.clerkPublishableKey)
    await clerk.load()
    return clerk
  }

  function getUser() {
    return clerk?.user || null
  }

  async function getToken() {
    // Supabase validates Clerk's dedicated JWT template, not Clerk's default
    // browser session token. The template must be named `supabase` in Clerk.
    return clerk?.session?.getToken({ template: 'supabase' }) || null
  }

  function signInUrl(returnUrl = window.location.href) {
    const origin = settings.platformUrl || 'https://horizonpivots.com'
    const url = new URL('/login', origin)
    url.searchParams.set('redirect_url', returnUrl)
    return url.toString()
  }

  function redirectToSignIn(returnUrl) {
    window.location.assign(signInUrl(returnUrl))
  }

  async function signOut() {
    if (!clerk) return
    await clerk.signOut()
  }

  function subscribe(callback) {
    if (!clerk) return () => {}
    const unsubscribe = clerk.addListener(({ user, session }) => callback({ user, session }))
    return typeof unsubscribe === 'function' ? unsubscribe : () => {}
  }

  window.CUHK_CLERK = { initialize, getUser, getToken, redirectToSignIn, signInUrl, signOut, subscribe }
})()
