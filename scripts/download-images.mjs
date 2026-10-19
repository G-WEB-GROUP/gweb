#!/usr/bin/env node
// Download original-quality photos listed in content/images.json
// into content/images/original/<file>. Files already there are skipped,
// so photos can also be dropped into that folder by hand under the same name.
// Usage: npm run images
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'content/images/original');
mkdirSync(DIR, { recursive: true });

if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const { setGlobalDispatcher, ProxyAgent } = await import('undici');
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY || process.env.https_proxy));
}

const { images, missing } = JSON.parse(readFileSync(path.join(ROOT, 'content/images.json'), 'utf8'));
let ok = 0;
const failed = [];
for (const img of images) {
  const out = path.join(DIR, img.file);
  if (existsSync(out)) { ok++; continue; }
  try {
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    ok++;
    console.log('saved', img.file);
  } catch (e) {
    failed.push(`${img.file}: ${e.cause?.code || e.message}`);
  }
}
console.log(`\n${ok}/${images.length} images in content/images/original/`);
if (failed.length) console.log('Failed:\n  ' + failed.join('\n  '));
if (missing.length) console.log(`${missing.length} gallery photos have no known URL (see "missing" in content/images.json).`);
