 (async () => {
  let data = window.CUHK_REVIEW_DATA
  let config = window.CUHK_WEB_CONFIG
  const runtime = window.CUHK_SUPABASE
  const storageKey = 'cuhksz-review-web-v1'
  const persisted = JSON.parse(localStorage.getItem(storageKey) || '{}')
  const state = {
    route: location.hash.replace('#', '') || 'home',
    verified: false,
    email: '',
    favorites: new Set(persisted.favorites || []),
    userReviews: persisted.userReviews || [],
    courseQuery: '',
    school: '全部学院',
    term: '全部学期',
    courseSort: 'rating',
    courseInitial: '全部',
    expandedSubjects: new Set(),
    diningQuery: '',
    profileTab: 'reviews',
    detail: null,
    reviewTarget: null,
    reviewRating: 0,
    pendingReviewTarget: null
  }

  let snapshot = null
  if (runtime) {
    snapshot = await runtime.initialize(data)
    config = { ...config, ...(runtime.config || {}) }
    if (snapshot.live) {
      data = snapshot.data
      state.verified = Boolean(snapshot.session?.user)
      state.email = snapshot.session?.user?.email || ''
      state.userReviews = snapshot.mine || []
      state.favorites = new Set(snapshot.favorites || [])
    }
  }
  const runtimeNote = document.querySelector('#auth-runtime-note')
  if (runtimeNote) runtimeNote.textContent = runtime?.isLive()
    ? '登录后可提交待审核评价和同步收藏。账号由 Horizon Pivots 统一管理。'
    : '服务配置尚未完成。你仍可浏览随附的公开目录。'

  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))
  const ratingLabel = (rating) => rating == null ? '未评分' : rating
  const stars = (rating) => rating == null
    ? '<span class="stars" aria-label="未评分">未评分</span>'
    : `<span class="stars" aria-label="${rating} 星">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>`
  const save = () => localStorage.setItem(storageKey, JSON.stringify({ favorites: [...state.favorites], userReviews: state.userReviews }))
  const keyFor = (type, id) => `${type}:${id}`
  const maskedEmail = () => state.email ? `${state.email.slice(0, 2)}••••@${state.email.split('@')[1]}` : ''
  const allReviews = () => [...state.userReviews, ...data.reviews]
  const subjectCode = (course) => (course.code.match(/^[A-Za-z]+/)?.[0] || course.code.charAt(0)).toUpperCase()
  const courseInitial = (course) => subjectCode(course).charAt(0)

  function toast(message) {
    const node = $('#toast')
    node.textContent = message
    node.classList.add('show')
    clearTimeout(toast.timer)
    toast.timer = setTimeout(() => node.classList.remove('show'), 2200)
  }

  function reviewCard(review) {
    return `<article class="review-card">
      <div class="review-top"><div><div class="review-target">${escapeHTML(review.target)}</div><div class="review-context">匿名同学 · 校内认证<br>${escapeHTML(review.context)}</div></div>${stars(review.rating)}</div>
      <p>${escapeHTML(review.content)}</p><div class="review-date">${escapeHTML(review.date)}</div>
    </article>`
  }

  function dishCard(dish) {
    return `<article class="dish-card" data-open-type="dish" data-id="${dish.id}" tabindex="0" role="button" aria-label="查看${escapeHTML(dish.name)}评价">
      <div class="dish-photo"><img src="${dish.image}" style="object-position:${dish.position}" alt="${escapeHTML(dish.name)}校园餐饮照片"></div>
      <div class="dish-card-copy"><h3>${escapeHTML(dish.name)}</h3><div class="dish-sub">${escapeHTML(dish.hall)} · ${escapeHTML(dish.stall)}</div><div class="tag-row">${dish.tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div><div class="dish-foot"><span>¥${dish.price}</span><span>★ ${dish.rating} · ${dish.reviews} 条</span></div></div>
    </article>`
  }

  function renderHome() {
    const featured = data.courses[0]
    $('#page-home').innerHTML = `
      <div class="hero">
        <div class="hero-copy"><div class="hero-kicker">CUHK–SHENZHEN · STUDENT VOICE</div><h1 id="home-title">选好课，<br><em>吃好饭。</em></h1><p>港中深同学匿名分享的课程与食堂体验。具体、克制，也真正有用。</p><form class="hero-search" data-home-search><input type="search" aria-label="搜索课程或菜品" placeholder="课程代码、老师或菜品"><button type="submit">搜索</button></form></div>
        <div class="hero-image"><img src="assets/campus-dining-hero.jpg" alt="紫金色餐盘上的三份校园餐饮"><div class="hero-badge"><b>4.6</b><span>本周菜品<br>平均推荐度</span></div></div>
      </div>
      <div class="section-heading"><div><h2>这周，同学们在看</h2><p>评价不是结论，而是选课前多一个可靠视角。</p></div><button class="text-action" data-route="courses">浏览全部课程 →</button></div>
      <div class="home-grid">
        <article class="course-feature"><div class="course-feature-copy"><div class="course-code">${featured.code}</div><h3>${featured.name}</h3><div class="english-name">${featured.nameEn}</div><div class="meta-line"><span>${featured.school}</span><span>${featured.instructor}</span><span>${featured.term}</span></div><div class="tag-row">${featured.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div><button class="text-action" data-open-type="course" data-id="${featured.id}">查看老师与学期评价 →</button></div><div class="feature-score"><strong>${ratingLabel(featured.rating)}</strong><span>${featured.rating == null ? '暂无评分' : '★'} ${featured.reviews} 条评价</span></div></article>
        <div class="review-rail">${allReviews().slice(0, 2).map(reviewCard).join('')}</div>
      </div>
      <div class="section-heading"><div><h2>今天吃什么</h2><p>从食堂逛到档口，找到一道值得排队的菜。</p></div><button class="text-action" data-route="dining">查看食堂地图 →</button></div>
      <div class="dish-strip">${data.dishes.slice(0, 3).map(dishCard).join('')}</div>`
  }

  function filteredCourses() {
    const query = state.courseQuery.trim().toLowerCase()
    return data.courses
      .filter((course) => !query || `${course.code}${course.name}${course.nameEn}${course.instructor}`.toLowerCase().includes(query))
      .filter((course) => state.school === '全部学院' || course.school === state.school)
      .filter((course) => state.term === '全部学期' || course.term === state.term)
      .filter((course) => state.courseInitial === '全部' || courseInitial(course) === state.courseInitial)
      .sort((a, b) => state.courseSort === 'reviews' ? b.reviews - a.reviews : (b.rating ?? -1) - (a.rating ?? -1))
  }

  function courseRow(course) {
    return `<article class="course-row" data-open-type="course" data-id="${course.id}" tabindex="0" role="button"><div class="course-code">${course.code}</div><div><h3>${escapeHTML(course.name)}</h3><div class="english-name">${escapeHTML(course.nameEn)}</div></div><div class="instructor"><b>${escapeHTML(course.instructor)}</b>${escapeHTML(course.term)}</div><div class="row-tags">${course.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div><div class="row-rating"><strong>${ratingLabel(course.rating)}</strong><span>${course.reviews} 条评价</span></div></article>`
  }

  function groupedCourses(courses) {
    const groups = new Map()
    courses.forEach((course) => {
      const code = subjectCode(course)
      groups.set(code, [...(groups.get(code) || []), course])
    })
    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, items]) => ({ code, items }))
  }

  function renderCourses() {
    const courses = filteredCourses()
    const schools = ['全部学院', ...new Set(data.courses.map((course) => course.school))]
    const terms = ['全部学期', ...new Set(data.courses.map((course) => course.term))]
    const groups = groupedCourses(courses)
    const availableInitials = new Set(data.courses.map(courseInitial))
    const courseIndex = ['全部', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'0123456789']
    $('#page-courses').innerHTML = `
      <header class="page-heading"><div><h1 id="courses-title">课程评价</h1><p>每条评价都归档到具体老师和学期。先理解差异，再决定哪一门课适合你。</p></div><div class="heading-image"><img src="assets/course-study.jpg" alt="学生在图书馆共同复习课程"></div></header>
      <div class="filter-bar"><label class="search-input"><span>⌕</span><input id="course-search" type="search" value="${escapeHTML(state.courseQuery)}" placeholder="课程代码、名称或老师" aria-label="搜索课程"></label><label class="select-wrap"><select id="school-filter" aria-label="按学院筛选">${schools.map((value) => `<option ${value === state.school ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="select-wrap"><select id="term-filter" aria-label="按学期筛选">${terms.map((value) => `<option ${value === state.term ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div>
      <section class="course-index" aria-label="按课程编号首字母筛选"><div class="course-index-heading"><div><b>课程编号索引</b><span>按首字母快速定位学科</span></div><span>${state.courseInitial === '全部' ? '全部代码' : `已选 ${state.courseInitial}`}</span></div><div class="course-index-grid">${courseIndex.map((value) => { const unavailable = value !== '全部' && !availableInitials.has(value); return `<button type="button" class="course-index-button ${state.courseInitial === value ? 'active' : ''}" data-course-initial="${value}" ${unavailable ? 'disabled aria-disabled="true"' : ''}>${value}</button>` }).join('')}</div></section>
      <div class="results-meta"><span>找到 ${courses.length} 门课程</span><div class="sort-buttons"><button data-course-sort="rating" class="${state.courseSort === 'rating' ? 'active' : ''}">评分</button><button data-course-sort="reviews" class="${state.courseSort === 'reviews' ? 'active' : ''}">热度</button></div></div>
      ${courses.length ? `<div class="course-catalog-actions"><span>点击学科代码展开课程</span><div><button type="button" data-collapse-subjects>全部收起</button><button type="button" data-expand-subjects>全部展开</button></div></div><div class="subject-list">${groups.map(({ code, items }) => { const expanded = state.expandedSubjects.has(code); return `<section class="subject-group"><button type="button" class="subject-group-trigger" data-subject-toggle="${code}" aria-expanded="${expanded}"><span class="subject-group-chevron" aria-hidden="true">${expanded ? '−' : '+'}</span><span><b>${code}</b><small>以 ${code} 开头的课程</small></span><em>${items.length} 门</em></button>${expanded ? `<div class="subject-course-list">${items.map(courseRow).join('')}</div>` : ''}</section>` }).join('')}</div>` : `<div class="empty-state"><div><b>没有找到相符课程</b><p>试试课程代码、名称或老师姓名。</p><button class="text-action" data-clear-courses>清除筛选</button></div></div>`}`
  }

  function filteredDishes() {
    const query = state.diningQuery.trim().toLowerCase()
    return data.dishes.filter((dish) => !query || `${dish.name}${dish.stall}${dish.hall}`.toLowerCase().includes(query))
  }

  function renderDining() {
    const dishes = filteredDishes()
    $('#page-dining').innerHTML = `
      <div class="dining-lead"><div class="dining-lead-copy"><h1 id="dining-title">今天，<br>吃点好的。</h1><p>按食堂、档口和菜品查看真实评价，少踩一次雷，多吃一顿好饭。</p><form class="hero-search" data-dining-search><input type="search" value="${escapeHTML(state.diningQuery)}" placeholder="食堂、档口或菜品" aria-label="搜索食堂"><button type="submit">搜索</button></form></div><div class="dining-lead-image"><img src="assets/campus-dining-hero.jpg" alt="校园食堂餐盘和饭菜"></div></div>
      <div class="section-heading"><div><h2>按食堂浏览</h2><p>营业时间与档口数量仅作参考，以现场信息为准。</p></div></div>
      <div class="hall-grid">${data.halls.map((hall, index) => `<article class="hall-card ${hall.tone}" data-open-type="hall" data-id="${hall.id}" tabindex="0" role="button"><div class="hall-number">0${index + 1} / DINING HALL</div><h3>${hall.name}</h3><p>${hall.location}</p><footer><span>${hall.hours}</span><span>★ ${hall.rating} · ${hall.stalls} 个档口</span></footer></article>`).join('')}</div>
      <div class="section-heading"><div><h2>${state.diningQuery ? '搜索到的菜品' : '本周高分菜品'}</h2><p>${dishes.length} 道菜品，价格和供应情况可能随档口调整。</p></div></div>
      ${dishes.length ? `<div class="dish-strip">${dishes.map(dishCard).join('')}</div>` : `<div class="empty-state"><div><b>没有找到相符菜品</b><p>换个菜名、食堂或档口试试。</p><button class="text-action" data-clear-dining>清除搜索</button></div></div>`}`
  }

  function savedItems() {
    return [...state.favorites].map((key) => {
      const [type, id] = key.split(':')
      const source = type === 'course' ? data.courses : type === 'dish' ? data.dishes : data.halls
      const item = source.find((entry) => entry.id === id)
      return item ? { type, item } : null
    }).filter(Boolean)
  }

  function renderProfileContent() {
    const content = $('#profile-tab-content')
    if (!content) return
    if (state.profileTab === 'favorites') {
      const items = savedItems()
      content.innerHTML = items.length ? `<div class="saved-list">${items.map(({ type, item }) => `<article class="saved-item"><div><h3>${escapeHTML(item.name)}</h3><p>${type === 'course' ? `${item.code} · ${item.instructor}` : item.location || `${item.hall} · ${item.stall}`}</p></div><button class="text-action" data-open-type="${type}" data-id="${item.id}">查看 →</button></article>`).join('')}</div>` : `<div class="empty-state"><div><b>还没有收藏</b><p>遇到感兴趣的课程或菜品，点一下收藏就能在这里找到。</p><button class="text-action" data-route="courses">浏览课程 →</button></div></div>`
    } else {
      content.innerHTML = state.userReviews.length ? `<div class="review-rail">${state.userReviews.map(reviewCard).join('')}</div>` : `<div class="empty-state"><div><b>还没有发布评价</b><p>登录后，可以匿名分享课程和食堂体验。</p><button class="text-action" data-route="courses">去写第一条 →</button></div></div>`
    }
  }

  function renderProfile() {
    $('#page-profile').innerHTML = `<header class="page-heading"><div><h1 id="profile-title">我的</h1><p>管理自己的匿名评价与收藏。公开页面不会展示账号信息。</p></div></header><div class="profile-layout"><aside class="profile-card"><div class="profile-avatar">${state.verified ? '深' : '访'}</div><h2>${state.verified ? '已登录 Horizon Pivots' : '游客模式'}</h2><p>${state.verified ? `${maskedEmail()}<br>账号与其他 Horizon Pivots 产品共用` : '浏览无需登录，发布评价与收藏需要登录。'}</p>${state.verified ? '<button class="auth-button verify-inline" data-sign-out>退出登录</button>' : '<button class="auth-button verify-inline" data-open-auth>登录后管理收藏</button>'}<div class="profile-stats"><div><strong>${state.userReviews.length}</strong><span>我的评价</span></div><div><strong>${state.favorites.size}</strong><span>收藏</span></div><div><strong>${state.verified ? 1 : 0}</strong><span>登录状态</span></div></div></aside><section class="profile-content"><nav class="profile-tabs"><button data-profile-tab="reviews" class="${state.profileTab === 'reviews' ? 'active' : ''}">我的评价</button><button data-profile-tab="favorites" class="${state.profileTab === 'favorites' ? 'active' : ''}">我的收藏</button></nav><div id="profile-tab-content"></div></section></div>`
    renderProfileContent()
  }

  function renderRoute() {
    const valid = ['home', 'courses', 'dining', 'profile']
    if (!valid.includes(state.route)) state.route = 'home'
    $$('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${state.route}`))
    $$('[data-route]').forEach((button) => button.classList.toggle('active', button.dataset.route === state.route && (button.closest('nav') || button.matches('.brand'))))
    if (state.route === 'home') renderHome()
    if (state.route === 'courses') renderCourses()
    if (state.route === 'dining') renderDining()
    if (state.route === 'profile') renderProfile()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigate(route) {
    state.route = route
    history.pushState(null, '', `#${route}`)
    renderRoute()
  }

  function findItem(type, id) {
    if (type === 'course') return data.courses.find((item) => item.id === id)
    if (type === 'dish') return data.dishes.find((item) => item.id === id)
    return data.halls.find((item) => item.id === id)
  }

  function openDetail(type, id) {
    const item = findItem(type, id)
    if (!item) return
    state.detail = { type, id }
    const isFavorite = state.favorites.has(keyFor(type, id))
    const itemReviews = allReviews().filter((review) => review.targetId === id)
    const subtitle = type === 'course' ? `${item.code} · ${item.instructor} · ${item.term}` : type === 'dish' ? `${item.hall} · ${item.stall} · ¥${item.price}` : `${item.location} · ${item.hours}`
    const scores = item.scores || { 口味: item.rating, 价格: 4.2, 分量: 4.4, 环境: 4.3 }
    $('#detail-content').innerHTML = `${type === 'dish' ? `<div class="detail-visual"><img src="${item.image}" style="object-position:${item.position}" alt="${escapeHTML(item.name)}"></div>` : ''}<div class="detail-kicker">${type === 'course' ? 'COURSE REVIEW' : type === 'dish' ? 'DISH REVIEW' : 'DINING HALL'}</div><h2 id="detail-title">${escapeHTML(item.name)}</h2><p class="detail-subtitle">${escapeHTML(subtitle)}</p><div class="detail-rating"><strong>${ratingLabel(item.rating)}</strong><div>${stars(item.rating)}<br><span>${item.reviews} 条认证评价</span></div></div><div class="score-grid">${Object.entries(scores).map(([label, score]) => `<div class="score-cell"><b>${score}</b><span>${label}</span></div>`).join('')}</div><div class="detail-actions"><button class="primary-action" data-write-review data-type="${type}" data-id="${id}">写匿名评价</button><button class="favorite-button" data-favorite data-type="${type}" data-id="${id}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? '取消收藏' : '收藏'}">${isFavorite ? '♥' : '♡'}</button></div><div class="detail-reviews"><h3>同学评价</h3>${itemReviews.length ? itemReviews.map(reviewCard).join('') : '<div class="empty-state"><div><b>还没有评价</b><p>来写第一条吧。</p></div></div>'}</div>`
    $('#detail-overlay').hidden = false
    document.body.style.overflow = 'hidden'
    $('.close-button', $('#detail-overlay')).focus()
  }

  function closeDetail() {
    $('#detail-overlay').hidden = true
    document.body.style.overflow = ''
    state.detail = null
  }

  async function toggleFavorite(type, id) {
    if (!state.verified) {
      openAuth()
      toast('登录后即可收藏')
      return
    }
    const key = keyFor(type, id)
    if (runtime?.isLive()) {
      try {
        const result = await runtime.toggleFavorite(type, id)
        result.favorite ? state.favorites.add(key) : state.favorites.delete(key)
      } catch (error) {
        toast(error.message || '收藏失败')
        return
      }
    }
    save()
    openDetail(type, id)
    toast(state.favorites.has(key) ? '已加入收藏' : '已取消收藏')
  }

  function openReview(type, id) {
    if (!state.verified) {
      state.pendingReviewTarget = { type, id }
      openAuth()
      toast('发布评价前需要登录')
      return
    }
    const item = findItem(type, id)
    state.reviewTarget = { type, id }
    state.reviewRating = 0
    $('#review-target-label').textContent = type === 'course' ? `${item.code} · ${item.name}` : item.name
    $('#review-content').value = ''
    $('#review-count').textContent = '0'
    $('#rating-error').textContent = ''
    $('#content-error').textContent = ''
    renderRatingPicker()
    $('#review-modal').hidden = false
    document.body.style.overflow = 'hidden'
  }

  function renderRatingPicker() {
    $('#rating-picker').innerHTML = [1,2,3,4,5].map((value) => `<button type="button" data-rating="${value}" class="${value <= state.reviewRating ? 'active' : ''}" aria-label="${value} 星">★</button>`).join('')
  }

  function closeReview() { $('#review-modal').hidden = true; document.body.style.overflow = ''; state.reviewTarget = null }
  function openAuth() {
    if (runtime?.isLive()) { runtime.signIn(); return }
    $('#auth-modal').hidden = false
    document.body.style.overflow = 'hidden'
  }
  function closeAuth() { $('#auth-modal').hidden = true; document.body.style.overflow = '' }

  function updateAuthUI() {
    const button = $('#header-auth')
    button.textContent = state.verified ? '我的账号' : '登录'
    button.classList.toggle('verified', state.verified)
  }

  function openSearch(initial = '') {
    $('#search-dialog').hidden = false
    $('#global-search').value = initial
    document.body.style.overflow = 'hidden'
    renderSearchResults(initial)
    setTimeout(() => $('#global-search').focus(), 30)
  }
  function closeSearch() { $('#search-dialog').hidden = true; document.body.style.overflow = '' }
  function renderSearchResults(query) {
    const key = query.trim().toLowerCase()
    const courses = data.courses.filter((item) => !key || `${item.code}${item.name}${item.instructor}`.toLowerCase().includes(key)).slice(0, 5)
    const dishes = data.dishes.filter((item) => !key || `${item.name}${item.stall}${item.hall}`.toLowerCase().includes(key)).slice(0, 5)
    $('#search-results').innerHTML = `<div class="search-group"><h3>课程</h3>${courses.map((item) => `<button class="search-result" data-open-type="course" data-id="${item.id}"><span><b>${item.code} · ${item.name}</b><span>${item.instructor} · ${item.term}</span></span><em>${item.rating == null ? '未评分' : `${item.rating} ★`}</em></button>`).join('') || '<div class="review-context">没有匹配课程</div>'}</div><div class="search-group"><h3>菜品</h3>${dishes.map((item) => `<button class="search-result" data-open-type="dish" data-id="${item.id}"><span><b>${item.name}</b><span>${item.hall} · ${item.stall}</span></span><em>${item.rating} ★</em></button>`).join('') || '<div class="review-context">没有匹配菜品</div>'}</div>`
  }

  document.addEventListener('click', (event) => {
    const route = event.target.closest('[data-route]')
    if (route) { event.preventDefault(); navigate(route.dataset.route); return }
    const open = event.target.closest('[data-open-type]')
    if (open) { closeSearch(); openDetail(open.dataset.openType, open.dataset.id); return }
    if (event.target.closest('[data-close-overlay]')) closeDetail()
    if (event.target.closest('[data-close-modal]')) closeReview()
    if (event.target.closest('[data-close-auth]')) closeAuth()
    if (event.target.closest('[data-close-search]')) closeSearch()
    if (event.target.closest('#global-search-trigger')) openSearch()
    if (event.target.closest('#header-auth') || event.target.closest('[data-open-auth]')) state.verified ? navigate('profile') : openAuth()
    if (event.target.closest('[data-start-sign-in]')) runtime?.signIn()
    if (event.target.closest('[data-sign-out]')) {
      void runtime?.signOut().then(() => {
        state.verified = false
        state.email = ''
        state.favorites = new Set()
        state.userReviews = []
        updateAuthUI()
        renderRoute()
        toast('已退出登录')
      })
    }
    const favorite = event.target.closest('[data-favorite]')
    if (favorite) toggleFavorite(favorite.dataset.type, favorite.dataset.id)
    const write = event.target.closest('[data-write-review]')
    if (write) openReview(write.dataset.type, write.dataset.id)
    const rating = event.target.closest('[data-rating]')
    if (rating) { state.reviewRating = Number(rating.dataset.rating); renderRatingPicker(); $('#rating-error').textContent = '' }
    const sort = event.target.closest('[data-course-sort]')
    if (sort) { state.courseSort = sort.dataset.courseSort; renderCourses() }
    const initial = event.target.closest('[data-course-initial]')
    if (initial) { state.courseInitial = initial.dataset.courseInitial; state.expandedSubjects = new Set(); renderCourses() }
    const subject = event.target.closest('[data-subject-toggle]')
    if (subject) {
      const code = subject.dataset.subjectToggle
      const expanded = new Set(state.expandedSubjects)
      expanded.has(code) ? expanded.delete(code) : expanded.add(code)
      state.expandedSubjects = expanded
      renderCourses()
    }
    if (event.target.closest('[data-expand-subjects]')) { state.expandedSubjects = new Set(groupedCourses(filteredCourses()).map(({ code }) => code)); renderCourses() }
    if (event.target.closest('[data-collapse-subjects]')) { state.expandedSubjects = new Set(); renderCourses() }
    const profileTab = event.target.closest('[data-profile-tab]')
    if (profileTab) { state.profileTab = profileTab.dataset.profileTab; renderProfile() }
    if (event.target.closest('[data-clear-courses]')) { state.courseQuery = ''; state.school = '全部学院'; state.term = '全部学期'; state.courseInitial = '全部'; state.expandedSubjects = new Set(); renderCourses() }
    if (event.target.closest('[data-clear-dining]')) { state.diningQuery = ''; renderDining() }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeDetail(); closeReview(); closeAuth(); closeSearch() }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-type]')) event.target.click()
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch() }
  })

  document.addEventListener('input', (event) => {
    if (event.target.id === 'course-search') { state.courseQuery = event.target.value; renderCourses(); requestAnimationFrame(() => { const input = $('#course-search'); input.focus(); input.setSelectionRange(input.value.length, input.value.length) }) }
    if (event.target.id === 'review-content') { $('#review-count').textContent = event.target.value.length; $('#content-error').textContent = '' }
    if (event.target.id === 'global-search') renderSearchResults(event.target.value)
  })

  document.addEventListener('change', (event) => {
    if (event.target.id === 'school-filter') { state.school = event.target.value; renderCourses() }
    if (event.target.id === 'term-filter') { state.term = event.target.value; renderCourses() }
  })

  document.addEventListener('submit', (event) => {
    if (event.target.matches('[data-home-search]')) { event.preventDefault(); const query = $('input', event.target).value.trim(); if (query) openSearch(query) }
    if (event.target.matches('[data-dining-search]')) { event.preventDefault(); state.diningQuery = $('input', event.target).value; renderDining() }
  })

  $('#review-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const content = $('#review-content').value.trim()
    let valid = true
    if (!state.reviewRating) { $('#rating-error').textContent = '请选择总体评分'; valid = false }
    if (content.length < 10) { $('#content-error').textContent = '请至少写 10 个字'; valid = false }
    if (!valid) return
    const { type, id } = state.reviewTarget
    const item = findItem(type, id)
    if (!runtime?.isLive()) { $('#content-error').textContent = '服务配置尚未完成'; return }
    try {
      const result = await runtime.createReview({ type, id, rating: state.reviewRating, content, item })
      if (result.review) state.userReviews.unshift(result.review)
      save(); closeReview(); closeDetail(); renderRoute(); toast(result.status === 'pending' ? '评价已提交，等待审核' : '评价已匿名发布')
    } catch (error) {
      $('#content-error').textContent = error.message || '评价提交失败'
    }
  })

  if (runtime?.isLive()) {
    runtime.subscribeAuth((session) => {
      state.verified = Boolean(session?.user)
      state.email = session?.user?.email || ''
      save()
      updateAuthUI()
      if (state.verified) { closeAuth(); renderRoute(); toast('登录成功') }
    })
  }

  window.addEventListener('popstate', () => { state.route = location.hash.replace('#', '') || 'home'; renderRoute() })

  renderHome(); renderCourses(); renderDining(); renderProfile(); updateAuthUI(); renderRoute()
})()
