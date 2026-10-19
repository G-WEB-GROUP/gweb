// Quick self-test: starts the server without SMTP (messages are only logged) and checks responses.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 8799;
const srv = spawn(process.execPath, ['contact-server.mjs'], { env: { ...process.env, PORT: String(PORT), SMTP_HOST: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
let log = '';
srv.stdout.on('data', (d) => (log += d));
await new Promise((r) => setTimeout(r, 500));

const url = `http://127.0.0.1:${PORT}/api/contact`;
const post = async (fields, { ip = '1.1.1.1', file } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append('attachment', file.blob, file.name);
  const r = await fetch(url, { method: 'POST', body: fd, headers: { Accept: 'application/json', 'X-Real-IP': ip } });
  return { status: r.status, body: await r.json() };
};
const old = String(Date.now() - 10_000);

try {
  let r = await post({ name: 'Test', email: 'a@b.com', message: 'Hi\nthere', ts: old });
  assert.equal(r.status, 200); assert.ok(log.includes('sent from a@b.com'));

  r = await post({ email: 'a@b.com', website: 'spam', ts: old }, { ip: '2.2.2.2' });
  assert.equal(r.status, 200); assert.ok(log.includes('dropped as spam'));

  r = await post({ email: 'a@b.com', ts: String(Date.now()) }, { ip: '3.3.3.3' });
  assert.equal(r.status, 200);

  r = await post({ email: 'not-an-email', ts: old }, { ip: '4.4.4.4' });
  assert.equal(r.status, 422);

  r = await post({ email: 'a@b.com', ts: old }, { ip: '5.5.5.5', file: { name: 'big.pdf', blob: new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'application/pdf' }) } });
  assert.equal(r.status, 413);

  r = await post({ email: 'a@b.com', ts: old }, { ip: '6.6.6.6', file: { name: 'x.exe', blob: new Blob(['MZ'], { type: 'application/x-msdownload' }) } });
  assert.equal(r.status, 415);

  r = await post({ email: 'a@b.com', ts: old }, { ip: '7.7.7.7', file: { name: 'photo.jpg', blob: new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }) } });
  assert.equal(r.status, 200); assert.ok(log.includes('with attachment'));

  for (let i = 0; i < 5; i++) await post({ email: 'a@b.com', ts: old }, { ip: '9.9.9.9' });
  r = await post({ email: 'a@b.com', ts: old }, { ip: '9.9.9.9' });
  assert.equal(r.status, 429);

  const noJs = await fetch(url, { method: 'POST', body: new URLSearchParams({ email: 'a@b.com', ts: old }), headers: { 'X-Real-IP': '8.8.8.8' }, redirect: 'manual' });
  assert.equal(noJs.status, 303); assert.equal(noJs.headers.get('location'), '/?sent=1#contact');

  console.log('All contact form checks passed');
} finally {
  srv.kill();
}
