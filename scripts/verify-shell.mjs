import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const { createStaticServer } = createRequire(import.meta.url)('../server.cjs');
const root = await mkdtemp(path.join(os.tmpdir(), 'counterpoint-shell-'));
let server;
try {
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'index.html'), '<script type="importmap">{"imports":{}}</script><h1>Counterpoint</h1>');
  await writeFile(path.join(root, 'main.cjs'), 'private');
  await writeFile(path.join(root, 'src', 'game.js'), 'export const works=true;');
  await symlink(path.join(root, 'main.cjs'), path.join(root, 'src', 'leak.js'));
  const service = await createStaticServer(root);
  server = service.server;
  const home = await fetch(service.origin);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self' 'sha256-/);
  assert.equal((await fetch(service.origin + '/src/game.js')).status, 200);
  assert.equal((await fetch(service.origin + '/main.cjs')).status, 404);
  assert.equal((await fetch(service.origin + '/src/leak.js')).status, 403);
  assert.equal((await fetch(service.origin, { method: 'POST' })).status, 405);
  const raw = (requestPath, host) => new Promise((resolve, reject) => {
    const req = http.get(service.origin, { path: requestPath, headers: host ? { Host: host } : {} }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
  });
  assert.equal(await raw('/src/%2e%2e/main.cjs'), 403);
  assert.equal(await raw('/%ZZ'), 400);
  assert.equal(await raw('/', 'evil.example'), 403);
  console.log('Shell checks passed: serving, CSP, method restriction, host validation, traversal and symlink protection.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
