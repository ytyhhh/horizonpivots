const baseUrl = 'https://www.cuhk.edu.cn'
const sourcePath = '/zh-hans/course'
const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1] || fallback
}
const offset = Number(arg('--offset', '0'))
const limit = Number(arg('--limit', '25'))
const concurrency = Math.min(3, Math.max(1, Number(arg('--concurrency', '3'))))

function textFromHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value) => String.fromCodePoint(value[0].toLowerCase() === 'x' ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

function firstMatch(html, expression) {
  return textFromHtml((html.match(expression) || [, ''])[1])
}

function courseField(html, label) {
  return firstMatch(html, new RegExp(`<span class="bold">${label}</span>[\\s\\S]*?</td>[\\s\\S]*?<td>[\\s\\S]*?<span>([\\s\\S]*?)</span>`, 'i'))
}

async function getCourses() {
  const response = await fetch(`${baseUrl}${sourcePath}`, { headers: { 'User-Agent': 'HorizonPivotsCourseImporter/1.0 (+https://cuhksz.horizonpivots.com)' } })
  if (!response.ok) throw new Error(`课程索引请求失败：${response.status}`)
  const html = await response.text()
  const matches = [...html.matchAll(/href="(\/zh-hans\/course\/\d+)"[^>]*>\s*([A-Z]{2,8})-(\d{4}[A-Z]?)\s*<\/a>/g)]
  return [...new Map(matches.map((match) => [match[1], `${match[2]}${match[3]}`])).entries()]
}

async function getCourse([path, code]) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { 'User-Agent': 'HorizonPivotsCourseImporter/1.0 (+https://cuhksz.horizonpivots.com)' } })
  if (!response.ok) throw new Error(`${code} 请求失败：${response.status}`)
  const html = await response.text()
  return {
    code,
    name: firstMatch(html, /<h1>([\s\S]*?)<\/h1>/i),
    school: courseField(html, '开课学院'),
    term: courseField(html, '学期'),
    description: firstMatch(html, /<h3>描述<\/h3>[\s\S]*?<div class="content">([\s\S]*?)<\/div>/i),
    officialUrl: `${baseUrl}${path}`,
  }
}

const courses = await getCourses()
const selected = courses.slice(offset, offset + limit)
const results = []
let cursor = 0

async function worker() {
  while (cursor < selected.length) {
    const index = cursor++
    if (index) await new Promise((resolve) => setTimeout(resolve, 400))
    results[index] = await getCourse(selected[index])
  }
}

await Promise.all(Array.from({ length: concurrency }, worker))
console.log(JSON.stringify({ total: courses.length, offset, courses: results }))
