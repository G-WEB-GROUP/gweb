#!/usr/bin/env node
// Step 1 of the migration: crawl the current GoDaddy site and save its content.
//
// Usage:
//   node scripts/scrape.mjs                 # crawl https://bakedinweston.com
//   node scripts/scrape.mjs --no-images     # skip image downloads
//   node scripts/scrape.mjs --file page.html --url https://bakedinweston.com/faq
//                                           # parse one saved HTML file (offline)
//
// Output:
//   content/raw/<slug>.html     original HTML of each page
//   content/raw/<slug>.json     extracted SEO data, text blocks, links, images
//   content/images/original/    images in original quality (no /:/ transforms)
//   content/inventory.draft.md  generated draft of content/inventory.md

import { load } from 'cheerio';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://bakedinweston.com';
const SEED_PATHS = [
  '/',
  '/faq',
  '/privacy-policy',
  '/terms-and-conditions',
  '/all-products',
  '/return-policy',
];
// GoDaddy store leftovers: recorded as links but never crawled or rebuilt.
const SKIP_PATH = /^\/(shop|m)(\/|$|\?)/;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW_DIR = path.join(ROOT, 'content/raw');
const IMG_DIR = path.join(ROOT, 'content/images/original');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// Node's fetch ignores HTTPS_PROXY; route through it when one is set.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const { setGlobalDispatcher, ProxyAgent } = await import('undici');
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY || process.env.https_proxy));
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return {
    finalUrl: res.url,
    status: res.status,
    type: res.headers.get('content-type') || '',
    body: asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text(),
  };
}

// "//img1.wsimg.com/isteam/ip/<id>/IMG_1.jpg/:/cr=.../rs=w:600" -> original file URL
export function originalImageUrl(src, base = ORIGIN) {
  if (!src) return null;
  let s = src.trim();
  if (s.startsWith('data:')) return null;
  if (s.startsWith('//')) s = 'https:' + s;
  let u;
  try {
    u = new URL(s, base);
  } catch {
    return null;
  }
  let p = u.pathname;
  const cut = p.indexOf('/:/');
  if (cut >= 0) p = p.slice(0, cut);
  return `${u.protocol}//${u.host}${p}`;
}

const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

function slugFor(urlPath) {
  const p = urlPath.replace(/\/+$/, '') || '/';
  return p === '/' ? 'home' : p.slice(1).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

export function parsePage(html, pageUrl) {
  const $ = load(html);
  const meta = {};
  $('meta').each((_, el) => {
    const key = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
    const val = $(el).attr('content');
    if (key && val != null) {
      if (meta[key] && meta[key] !== val) meta[key] = [].concat(meta[key], val);
      else meta[key] = val;
    }
  });

  const seo = {
    title: clean($('head > title').first().text()),
    description: meta.description ?? null,
    canonical: $('link[rel="canonical"]').attr('href') ?? null,
    robots: meta.robots ?? null,
    themeColor: meta['theme-color'] ?? null,
    googleSiteVerification: meta['google-site-verification'] ?? null,
    generator: meta.generator ?? null,
    lang: $('html').attr('lang') ?? null,
    og: Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith('og:'))),
    twitter: Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith('twitter:'))),
    favicons: $('link[rel*="icon"]')
      .map((_, el) => ({ rel: $(el).attr('rel'), href: $(el).attr('href'), sizes: $(el).attr('sizes') ?? null }))
      .get(),
    jsonLd: $('script[type="application/ld+json"]')
      .map((_, el) => {
        try {
          return JSON.parse($(el).text());
        } catch {
          return $(el).text();
        }
      })
      .get(),
  };

  // Images: src, lazy attributes, srcset and inline background-image urls.
  const images = new Map();
  const addImg = (raw, alt, where) => {
    const orig = originalImageUrl(raw, pageUrl);
    if (!orig || !/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(orig)) return;
    const cur = images.get(orig);
    if (!cur) images.set(orig, { url: orig, alt: alt || '', seenAs: [raw], where });
    else {
      if (!cur.alt && alt) cur.alt = alt;
      if (cur.seenAs.length < 3 && !cur.seenAs.includes(raw)) cur.seenAs.push(raw);
    }
  };
  $('img, source').each((_, el) => {
    const $el = $(el);
    const alt = clean($el.attr('alt'));
    const where = clean($el.closest('section, [data-aid], header, footer').attr('data-aid') || '');
    for (const a of ['src', 'data-src', 'data-srclazy', 'data-lazyimg']) addImg($el.attr(a), alt, where);
    for (const a of ['srcset', 'srcSet', 'data-srcset', 'data-srcsetlazy']) {
      const v = $el.attr(a);
      if (v) v.split(/,\s+/).forEach((part) => addImg(part.trim().split(/\s+/)[0], alt, where));
    }
  });
  $('[style*="url("]').each((_, el) => {
    const style = $(el).attr('style');
    for (const m of style.matchAll(/url\((['"]?)(.*?)\1\)/g)) addImg(m[2], '', 'background');
  });
  // GoDaddy also puts background images in <style> blocks.
  $('style').each((_, el) => {
    for (const m of $(el).text().matchAll(/url\((['"]?)(\/\/img1\.wsimg\.com[^)'"]+)\1\)/g)) addImg(m[2], '', 'css');
  });

  // Links
  const links = [];
  const seenLinks = new Set();
  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    let abs;
    try {
      abs = new URL(href, pageUrl).toString();
    } catch {
      abs = href;
    }
    const text = clean($a.text()) || clean($a.attr('aria-label')) || clean($a.attr('title'));
    const key = abs + '|' + text;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    links.push({ text, href: abs, target: $a.attr('target') ?? null, rel: $a.attr('rel') ?? null });
  });

  // Text blocks in document order, with duplicates removed (GoDaddy renders
  // the same heading several times for different breakpoints).
  $('script, style, noscript, svg, template').remove();
  const blocks = [];
  const seenText = new Set();
  $('body')
    .find('h1, h2, h3, h4, h5, h6, p, li, blockquote, label, button, figcaption, address, [data-aid$="_RENDERED"]')
    .each((_, el) => {
      const $el = $(el);
      // Skip containers whose text is fully covered by a matched child.
      if ($el.find('h1, h2, h3, h4, h5, h6, p, li').length && !/^h\d$/.test(el.tagName)) return;
      const text = clean($el.text());
      if (!text) return;
      const tag = el.tagName.toLowerCase();
      const key = text.toLowerCase();
      if (seenText.has(key)) return;
      seenText.add(key);
      blocks.push({ tag, text, aid: $el.attr('data-aid') ?? null });
    });

  // Is this page a GoDaddy Online Store catalogue?
  const lower = html.toLowerCase();
  const store = {
    looksLikeGoDaddyStore:
      // The cart link sits in every page's header, so look for product markup only.
      /data-aid="product|data-ux="product|productcard|ols-product|"@type":\s*"product"/.test(lower),
    priceStrings: [...new Set((html.match(/\$\s?\d+(?:[.,]\d{2})?/g) || []).slice(0, 50))],
  };

  return {
    url: pageUrl,
    seo,
    headings: blocks.filter((b) => /^h\d$/.test(b.tag)),
    blocks,
    links,
    images: [...images.values()],
    store,
  };
}

async function downloadImages(pages) {
  await mkdir(IMG_DIR, { recursive: true });
  const all = new Map();
  for (const p of pages) for (const img of p.images) if (!all.has(img.url)) all.set(img.url, img);
  const manifest = [];
  const usedNames = new Set();
  for (const img of all.values()) {
    const u = new URL(img.url);
    const parts = u.pathname.split('/').filter(Boolean);
    let name = decodeURIComponent(parts.at(-1)).replace(/[^\w.-]+/g, '_');
    // GoDaddy paths look like /isteam/ip/<site-id>/<file>; keep names unique.
    if (usedNames.has(name)) name = `${parts.at(-2)}-${name}`;
    usedNames.add(name);
    const file = path.join(IMG_DIR, name);
    const entry = { url: img.url, file: path.relative(ROOT, file), alt: img.alt };
    try {
      if (!existsSync(file)) {
        const r = await get(img.url, true);
        await writeFile(file, r.body);
        entry.bytes = r.body.length;
        entry.type = r.type;
      }
    } catch (e) {
      entry.error = String(e.message || e);
    }
    manifest.push(entry);
    process.stdout.write(entry.error ? 'x' : '.');
  }
  process.stdout.write('\n');
  await writeFile(path.join(IMG_DIR, '..', 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function inventoryDraft(pages, manifest) {
  const out = ['# Inventory draft (auto-generated)', '', `Crawled: ${new Date().toISOString()}`, ''];
  for (const p of pages) {
    out.push(`## ${p.url}`, '');
    out.push('| Field | Value |', '|---|---|');
    const row = (k, v) => out.push(`| ${k} | ${String(v ?? '—').replace(/\|/g, '\\|')} |`);
    row('title', p.seo.title);
    row('description', p.seo.description);
    row('canonical', p.seo.canonical);
    row('theme-color', p.seo.themeColor);
    row('google-site-verification', p.seo.googleSiteVerification);
    row('generator', p.seo.generator);
    for (const [k, v] of Object.entries({ ...p.seo.og, ...p.seo.twitter })) row(k, v);
    row('GoDaddy store markers', p.store.looksLikeGoDaddyStore ? 'yes' : 'no');
    row('price strings found', p.store.priceStrings.join(', ') || 'none');
    out.push('', '### Text (deduplicated, in page order)', '');
    for (const b of p.blocks) {
      const m = b.tag.match(/^h(\d)$/);
      out.push(m ? `${'#'.repeat(Math.min(6, Number(m[1]) + 3))} ${b.text}` : `- (${b.tag}) ${b.text}`);
    }
    out.push('', '### Links', '');
    for (const l of p.links) out.push(`- [${l.text || '(no text)'}](${l.href})${l.target ? ` target=${l.target}` : ''}`);
    out.push('', '### Images', '');
    for (const i of p.images) out.push(`- ${i.url} — alt: "${i.alt}"`);
    out.push('');
  }
  if (manifest) {
    out.push('## Downloaded images', '');
    for (const m of manifest) out.push(`- ${m.file}${m.error ? ` — ERROR ${m.error}` : ''} — alt: "${m.alt}"`);
  }
  return out.join('\n');
}

async function crawl() {
  await mkdir(RAW_DIR, { recursive: true });
  const queue = SEED_PATHS.map((p) => new URL(p, ORIGIN).toString());
  const done = new Set();
  const pages = [];
  const errors = [];
  while (queue.length) {
    const url = queue.shift();
    const key = url.replace(/[#?].*$/, '').replace(/\/+$/, '');
    if (done.has(key)) continue;
    done.add(key);
    try {
      console.log('GET', url);
      const r = await get(url);
      const page = parsePage(r.body, r.finalUrl);
      page.status = r.status;
      page.requestedUrl = url;
      const slug = slugFor(new URL(r.finalUrl).pathname);
      await writeFile(path.join(RAW_DIR, `${slug}.html`), r.body);
      await writeFile(path.join(RAW_DIR, `${slug}.json`), JSON.stringify(page, null, 2));
      pages.push(page);
      for (const l of page.links) {
        let u;
        try {
          u = new URL(l.href);
        } catch {
          continue;
        }
        if (u.hostname.replace(/^www\./, '') !== new URL(ORIGIN).hostname) continue;
        if (SKIP_PATH.test(u.pathname + u.search)) continue;
        if (/\.(pdf|jpe?g|png|zip)$/i.test(u.pathname)) continue;
        queue.push(u.origin + u.pathname);
      }
    } catch (e) {
      errors.push({ url, error: String(e.message || e) });
      console.error('FAIL', url, e.message || e);
    }
  }
  const manifest = flag('--no-images') ? null : await downloadImages(pages);
  await writeFile(path.join(ROOT, 'content/inventory.draft.md'), inventoryDraft(pages, manifest));
  await writeFile(path.join(RAW_DIR, '_errors.json'), JSON.stringify(errors, null, 2));
  console.log(`Pages: ${pages.length}, errors: ${errors.length}`);
}

const file = opt('--file');
if (file) {
  const page = parsePage(await readFile(file, 'utf8'), opt('--url') || ORIGIN + '/');
  console.log(JSON.stringify(page, null, 2));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  await crawl();
}
