(() => {
  const fallbackConfig = window.CUHK_WEB_CONFIG || {}
  let config = { ...fallbackConfig }
  let client = null
  let authUnsubscribe = null

  const hasSupabaseSdk = () => Boolean(window.supabase && typeof window.supabase.createClient === 'function')
  const isLive = () => Boolean(client)
  const asNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
  const nullableNumber = (value) => value === null || value === undefined || value === '' ? null : asNumber(value)
  const arrayValue = (value) => Array.isArray(value) ? value : []
  const currentUser = () => window.CUHK_CLERK?.getUser() || null

  function courseView(row) {
    const instructors = arrayValue(row.instructors)
    const terms = arrayValue(row.terms)
    return {
      id: row.id || row._id || row.code,
      code: row.code,
      name: row.name,
      nameEn: row.name_en || row.nameEn || '',
      school: row.school || '学院待确认',
      instructor: row.instructor || instructors[0] || '教师待补充',
      term: row.term || terms[0] || '学期待补充',
      rating: asNumber(row.rating),
      reviews: asNumber(row.review_count ?? row.reviews),
      tags: arrayValue(row.tags),
      scores: row.scores || {},
    }
  }

  function hallView(row) {
    return {
      id: row.id || row._id,
      name: row.name,
      location: row.location || '',
      hours: row.hours || row.open_hours || '',
      rating: asNumber(row.rating),
      reviews: asNumber(row.review_count ?? row.reviews),
      stalls: asNumber(row.stall_count ?? row.stalls),
      tone: row.tone || row.cover_class || 'green',
    }
  }

  function dishView(row) {
    return {
      id: row.id || row._id,
      hallId: row.hall_id || row.hallId || '',
      name: row.name,
      stall: row.stall || row.stall_name || '',
      hall: row.hall || row.hall_name || '',
      price: asNumber(row.price),
      rating: asNumber(row.rating),
      reviews: asNumber(row.review_count ?? row.reviews),
      tags: arrayValue(row.tags),
      image: row.image || 'assets/campus-dining-hero.jpg',
      position: row.position || '50% 50%',
      scores: row.scores || {},
    }
  }

  function reviewView(row) {
    return {
      id: row.id || row._id,
      type: row.target_type || row.type || 'course',
      targetId: row.target_id || row.targetId,
      target: row.target || row.target_name || '',
      context: row.context || row.target_context || '',
      rating: nullableNumber(row.rating ?? row.overall),
      content: row.content || '',
      date: row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '刚刚',
      status: row.status || 'published',
    }
  }

  async function loadRemoteConfig() {
    try {
      const response = await fetch(`${config.apiBase || '/api'}/config`, { cache: 'no-store' })
      if (response.ok) config = { ...config, ...(await response.json()) }
    } catch (_) {
      // Local file previews can still show the bundled public data.
    }

    if (!hasSupabaseSdk() || !config.supabaseUrl || !config.supabasePublishableKey || !config.clerkPublishableKey) return config
    await window.CUHK_CLERK.initialize(config)
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      accessToken: () => window.CUHK_CLERK.getToken(),
    })
    return config
  }

  async function getSession() {
    const user = currentUser()
    return user ? { user: { id: user.id, email: user.primaryEmailAddress?.emailAddress || '' } } : null
  }

  async function readTable(table, query) {
    const { data, error } = await client.from(table).select(query || '*')
    if (error) throw error
    return data || []
  }

  async function loadData(fallback) {
    if (!client) return { data: fallback, live: false, session: null, mine: [], favorites: [] }
    try {
      const [courseRows, hallRows, dishRows, reviewRows, session] = await Promise.all([
        readTable('cuhksz_courses', '*'),
        readTable('cuhksz_dining_halls', '*'),
        readTable('cuhksz_dishes', '*'),
        client.from('cuhksz_reviews').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(200).then((result) => {
          if (result.error) throw result.error
          return result.data || []
        }),
        getSession(),
      ])
      let mine = []
      let favorites = []
      if (session?.user) {
        const [mineResult, favoriteResult] = await Promise.all([
          client.from('cuhksz_reviews').select('*').eq('author_id', session.user.id).order('created_at', { ascending: false }).limit(100),
          client.from('cuhksz_favorites').select('target_type,target_id').eq('user_id', session.user.id),
        ])
        if (mineResult.error) throw mineResult.error
        if (favoriteResult.error) throw favoriteResult.error
        mine = (mineResult.data || []).map(reviewView)
        favorites = (favoriteResult.data || []).map((row) => `${row.target_type}:${row.target_id}`)
      }
      return {
        live: true,
        session,
        mine,
        favorites,
        data: {
          courses: courseRows.map(courseView),
          halls: hallRows.map(hallView),
          dishes: dishRows.map(dishView),
          reviews: reviewRows.map(reviewView),
        },
      }
    } catch (error) {
      console.warn('[Supabase] 数据读取失败，使用随附的公开目录', error)
      return { data: fallback, live: false, session: null, mine: [], favorites: [], error }
    }
  }

  async function initialize(fallback) {
    await loadRemoteConfig()
    return loadData(fallback)
  }

  function subscribeAuth(callback) {
    if (authUnsubscribe) authUnsubscribe()
    authUnsubscribe = window.CUHK_CLERK?.subscribe(({ user }) => callback(user ? { user: { id: user.id, email: user.primaryEmailAddress?.emailAddress || '' } } : null)) || null
    return () => authUnsubscribe?.()
  }

  async function requireUser() {
    const session = await getSession()
    if (!session?.user) throw new Error('请先登录 Horizon Pivots 账号')
    return session.user
  }

  function signIn() {
    window.CUHK_CLERK.redirectToSignIn(window.location.href)
  }

  async function signOut() {
    await window.CUHK_CLERK.signOut()
  }

  async function toggleFavorite(type, id) {
    if (!client) throw new Error('服务配置尚未完成')
    const user = await requireUser()
    const targetType = type === 'course' ? 'course' : type
    const existing = await client.from('cuhksz_favorites').select('user_id').eq('user_id', user.id).eq('target_type', targetType).eq('target_id', id).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) {
      const result = await client.from('cuhksz_favorites').delete().eq('user_id', user.id).eq('target_type', targetType).eq('target_id', id)
      if (result.error) throw result.error
      return { favorite: false }
    }
    const result = await client.from('cuhksz_favorites').insert({ user_id: user.id, target_type: targetType, target_id: id })
    if (result.error) throw result.error
    return { favorite: true }
  }

  async function createReview({ type, id, rating, content, item }) {
    if (!client) throw new Error('服务配置尚未完成')
    const user = await requireUser()
    const targetType = type === 'course' ? 'course' : type
    const row = {
      author_id: user.id,
      target_type: targetType,
      target_id: id,
      target: type === 'course' ? `${item.code} · ${item.name}` : item.name,
      context: type === 'course' ? `${item.instructor} · ${item.term}` : item.location || `${item.hall} · ${item.stall}`,
      rating,
      content,
      status: 'pending',
    }
    const result = await client.from('cuhksz_reviews').upsert(row, { onConflict: 'author_id,target_type,target_id' }).select().single()
    if (result.error) throw result.error
    return { status: result.data.status, review: reviewView(result.data) }
  }

  window.CUHK_SUPABASE = {
    initialize,
    isLive,
    getSession,
    subscribeAuth,
    signIn,
    signOut,
    toggleFavorite,
    createReview,
    get config() { return config },
  }
})()
