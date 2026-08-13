import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !serviceKey) {
  throw new Error('请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。该密钥仅用于本地导入，绝不能配置到 Vercel 或浏览器。')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const input = String(text).replace(/^\uFEFF/, '')
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index += 1 }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); if (row.some((value) => value.trim())) rows.push(row); row = []; field = '' }
    else if (char !== '\r') field += char
  }
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  const headers = rows.shift() || []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] || '').trim()])))
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha1').update(String(value).toLowerCase()).digest('hex').slice(0, 22)}`
}

async function readRows(file) {
  return parseCsv(await fs.readFile(path.join(root, 'data-cleaned', file), 'utf8'))
}

async function upsert(table, rows, conflict) {
  if (!rows.length) return
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw new Error(`${table} 导入失败 (${response.status})：${await response.text()}`)
}

const courseRows = await readRows('courses.csv')
const offeringRows = await readRows('offerings.csv')
const firstOfferingByCode = new Map()
for (const offering of offeringRows) {
  if (!firstOfferingByCode.has(offering.courseCode)) firstOfferingByCode.set(offering.courseCode, offering)
}

await upsert('cuhksz_courses', courseRows.map((row) => {
  const offering = firstOfferingByCode.get(row.code)
  return {
    id: `cuhksz_course_${row.code.toLowerCase()}`,
    code: row.code.toUpperCase(),
    name: row.name,
    name_en: row.nameEn || '',
    school: row.school || '学院待确认',
    instructor: offering?.instructor || '教师待补充',
    term: offering?.term || '学期待补充',
    tags: row.tags ? row.tags.split('|').filter(Boolean) : [],
    rating: 0,
    review_count: 0,
    active: true,
  }
}), 'code')

await upsert('cuhksz_course_offerings', offeringRows.map((row) => ({
  id: stableId('cuhksz_offering', `${row.courseCode}|${row.instructor}|${row.term}`),
  course_id: `cuhksz_course_${row.courseCode.toLowerCase()}`,
  course_code: row.courseCode.toUpperCase(),
  instructor: row.instructor,
  term: row.term,
  school: row.school || '学院待确认',
  rating: 0,
  review_count: 0,
  active: true,
})), 'course_code,instructor,term')

console.log(JSON.stringify({ courses: courseRows.length, offerings: offeringRows.length, imported: true }, null, 2))
