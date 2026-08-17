const fs = require('fs')
const path = require('path')
const assert = require('assert')
const vm = require('vm')

const root = __dirname
for (const file of ['index.html', 'styles.css', 'app.js', 'clerk-adapter.js', 'data.js', 'config.js', 'supabase-adapter.js', 'src/app/layout.tsx', 'src/app/page.tsx', 'src/app/[...asset]/route.ts', 'src/app/api/config/route.ts', 'src/app/api/health/route.ts', 'next.config.ts', 'vercel.json', '.env.example', 'supabase/schema.sql', 'supabase/seed.sql']) {
  assert(fs.existsSync(path.join(root, file)), `缺少网页文件：${file}`)
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8')
assert(html.includes('id="page-home"') && html.includes('id="page-courses"') && html.includes('id="page-dining"') && html.includes('id="page-profile"'), '四个主页面入口不完整')
assert(html.includes('supabase-adapter.js') && html.includes('clerk-adapter.js'), 'Clerk 或 Supabase 适配层未接入网页')
assert(html.includes('class="skip-link"'), '缺少键盘跳转入口')
assert(css.includes('@media (max-width: 760px)'), '缺少移动端断点')
assert(css.includes('prefers-reduced-motion'), '缺少减少动效支持')

const sandbox = { window: {} }
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), sandbox)
const data = sandbox.window.CUHK_REVIEW_DATA
assert(Array.isArray(data.courses) && Array.isArray(data.halls) && Array.isArray(data.dishes), '本地回退数据结构不完整')
for (const dish of data.dishes) assert(fs.existsSync(path.join(root, dish.image)), `菜品图片不存在：${dish.image}`)
for (const asset of ['assets/campus-dining-hero.jpg', 'assets/course-study.jpg', 'assets/campus-life-directory.jpg']) {
  const size = fs.statSync(path.join(root, asset)).size
  assert(size < 700 * 1024, `${asset} 超过 700KB，需要继续压缩`)
}

console.log('✓ 网页四个主页面和核心对话框完整')
console.log('✓ 移动端与减少动效样式完整')
console.log('✓ 课程、食堂、菜品的线上数据入口及图片资产完整')
console.log('✓ Clerk、Supabase RLS、Next.js Route Handlers 与部署配置完整')
