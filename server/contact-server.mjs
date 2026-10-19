// Contact form endpoint for bakedinweston.com.
// Nginx proxies POST /api/contact to this service (127.0.0.1:8787).
//
// Settings come from environment variables (see contact.env.example):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS  — outgoing mail server
//   MAIL_TO    — where messages go (inna@bakedinweston.com)
//   MAIL_FROM  — sender address the SMTP account may send as
//   PORT       — default 8787
//   HOST       — listen address, default 127.0.0.1 (0.0.0.0 inside a Docker container)
// Without SMTP_HOST the message is printed to the log instead of sent (for testing).
//
// Spam protection instead of reCAPTCHA: hidden "website" field, minimum fill time,
// and a per-IP rate limit.

import http from 'node:http';
import Busboy from 'busboy';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const MAIL_TO = process.env.MAIL_TO || 'inna@bakedinweston.com';
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'website@bakedinweston.com';
const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;
const MIN_FILL_MS = 3000;
const RATE = { max: 5, windowMs: 10 * 60 * 1000 };

const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

// ---- rate limit (in memory; fine for one small server) ----
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE.max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (list.every((t) => now - t >= RATE.windowMs)) hits.delete(ip);
}, 60_000).unref();

// ---- helpers ----
const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i;
const clean = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const oneLine = (s, max) => clean(s, max).replace(/[\r\n]+/g, ' ');

function reply(req, res, status, body) {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  if (wantsJson) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  } else {
    // Form posted without JavaScript: go back to the page.
    const q = status < 300 ? 'sent=1' : 'error=1';
    res.writeHead(303, { Location: `/?${q}#contact` });
    res.end();
  }
}

function parse(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let file = null;
    let tooBig = false;
    let badType = false;
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 1, fields: 10, fieldSize: 20_000 } });
    } catch (e) {
      return reject(e);
    }
    bb.on('field', (name, val) => (fields[name] = val));
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      if (!info.filename) return stream.resume();
      if (!ALLOWED_TYPES.test(info.mimeType)) {
        badType = true;
        return stream.resume();
      }
      stream.on('data', (c) => chunks.push(c));
      stream.on('limit', () => (tooBig = true));
      stream.on('end', () => {
        if (!tooBig) file = { filename: info.filename.slice(0, 120), contentType: info.mimeType, content: Buffer.concat(chunks) };
      });
    });
    bb.on('close', () => resolve({ fields, file, tooBig, badType }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (req.url !== '/api/contact' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end('{"error":"Not found"}');
  }

  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  if (limited(ip)) return reply(req, res, 429, { error: 'Too many messages. Please try again later or call us.' });

  let data;
  try {
    data = await parse(req);
  } catch {
    return reply(req, res, 400, { error: 'The form could not be read. Please try again.' });
  }
  const { fields, file, tooBig, badType } = data;

  // Bots: fake success so they don't retry.
  const ts = Number(fields.ts || 0);
  if (fields.website || (ts && Date.now() - ts < MIN_FILL_MS)) {
    console.log(`[contact] dropped as spam from ${ip}`);
    return reply(req, res, 200, { ok: true });
  }

  const name = oneLine(fields.name, 100);
  const email = oneLine(fields.email, 200);
  const message = clean(fields.message, 5000);
  if (!EMAIL_RE.test(email)) return reply(req, res, 422, { error: 'Please enter a valid email address.' });
  if (tooBig) return reply(req, res, 413, { error: 'The attachment is larger than 5 MB.' });
  if (badType) return reply(req, res, 415, { error: 'Attachments can be JPG, PNG, WebP, HEIC or PDF.' });

  const text = [
    `New message from the bakedinweston.com contact form`,
    ``,
    `Name: ${name || '(not given)'}`,
    `Email: ${email}`,
    ``,
    message || '(no message)',
    ``,
    `---`,
    `Sent ${new Date().toISOString()} from IP ${ip}`,
  ].join('\n');

  try {
    const info = await transport.sendMail({
      from: { name: 'Baked in Weston website', address: MAIL_FROM },
      to: MAIL_TO,
      replyTo: name ? { name, address: email } : email,
      subject: `Website message from ${name || email}`,
      text,
      attachments: file ? [file] : [],
    });
    if (!process.env.SMTP_HOST) console.log('[contact] (no SMTP_HOST, not sent)', info.message);
    console.log(`[contact] sent from ${email} (${ip})${file ? ' with attachment' : ''}`);
    return reply(req, res, 200, { ok: true });
  } catch (e) {
    console.error('[contact] send failed:', e.message);
    return reply(req, res, 502, { error: 'Sorry, the message could not be sent. Please call or email instead.' });
  }
});

server.listen(PORT, HOST, () => console.log(`[contact] listening on ${HOST}:${PORT}, mail to ${MAIL_TO}`));
