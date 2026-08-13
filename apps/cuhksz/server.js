const http = require('http')
const fs = require('fs')
const path = require('path')

const root = __dirname
const port = Number(process.env.PORT || 4173)
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' }
const apiHandlers = {
  '/api/config': require('./api/config'),
  '/api/health': require('./api/health'),
}

http.createServer((request, response) => {
  const urlPath = decodeURIComponent(request.url.split('?')[0])
  const apiHandler = apiHandlers[urlPath]
  if (apiHandler) {
    Promise.resolve(apiHandler(request, response)).catch((error) => {
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ error: error.message || 'API error' }))
    })
    return
  }
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
  const file = path.resolve(root, relative)
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); return }
    response.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    response.end(content)
  })
}).listen(port, '127.0.0.1', () => console.log(`港中深课饭评网页版：http://127.0.0.1:${port}`))
