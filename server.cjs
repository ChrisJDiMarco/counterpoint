'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function allowed(name) {
  return ['index.html', 'styles.css', 'renderer.js'].includes(name)
    || /^(src|assets)\/[a-zA-Z0-9_./-]+$/.test(name)
    || /^node_modules\/three\/(build|examples\/jsm)\/[a-zA-Z0-9_./-]+\.js$/.test(name);
}
function csp(html = '') {
  const hashes = [...html.matchAll(/<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/g)]
    .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
  return `default-src 'none'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
}
async function createStaticServer(root = __dirname) {
  const realRoot = await fs.realpath(root);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', csp());
    const reject = (status) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(http.STATUS_CODES[status]); };
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) return reject(403);
      if (!['GET', 'HEAD'].includes(req.method)) return reject(405);
      const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (rawPath.includes('\\') || rawPath.includes('\0') || rawPath.split('/').includes('..')) return reject(403);
      const name = rawPath === '/' ? 'index.html' : rawPath.replace(/^\//, '');
      if (!allowed(name)) return reject(404);
      const candidate = path.resolve(realRoot, name);
      const actual = await fs.realpath(candidate);
      if (!actual.startsWith(realRoot + path.sep)) return reject(403);
      if (!allowed(path.relative(realRoot, actual).split(path.sep).join('/'))) return reject(403);
      const data = await fs.readFile(actual);
      const ext = path.extname(actual);
      if (!TYPES[ext]) return reject(404);
      if (ext === '.html') res.setHeader('Content-Security-Policy', csp(data.toString('utf8')));
      res.writeHead(200, { 'Content-Type': TYPES[ext], 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      reject(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : error instanceof URIError ? 400 : 500);
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
module.exports = { createStaticServer };
