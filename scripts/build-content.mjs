#!/usr/bin/env node
// Turn the saved GoDaddy pages in content/source/ into editable content files:
//   content/pages/<slug>.md   legal pages (frontmatter + Markdown, text verbatim)
//   content/faq.json          FAQ questions and answers
//   content/products.json     /all-products gallery: name, ingredients, image, alt
//   content/seo.json          title / description / OG / Twitter per page
// Usage: node scripts/build-content.mjs

import { load } from 'cheerio';
import TurndownService from 'turndown';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'content/source');
const OUT = path.join(ROOT, 'content');
mkdirSync(path.join(OUT, 'pages'), { recursive: true });

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
const clean = (t) => (t || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const original = (src) => {
  let s = (src || '').trim().split(/\s+/)[0];
  if (s.startsWith('//')) s = 'https:' + s;
  return s.replace(/\/:\/.*$/, '');
};
const page = (slug) => load(readFileSync(path.join(SRC, `${slug}.html`), 'utf8'));
const decode = (s) => load(`<p>${s ?? ''}</p>`)('p').text();

// ---------- SEO ----------
const seo = {};
for (const slug of ['home', 'faq', 'all-products', 'privacy-policy', 'terms-and-conditions', 'return-policy']) {
  if (!existsSync(path.join(SRC, `${slug}.html`))) continue;
  const $ = page(slug);
  const m = (k) => {
    const v = $(`meta[name="${k}"], meta[property="${k}"]`).first().attr('content');
    return v == null ? null : decode(v);
  };
  seo[slug] = {
    title: clean($('head > title').text()),
    description: m('description'),
    ogUrl: m('og:url'),
    ogTitle: m('og:title'),
    ogDescription: m('og:description'),
    ogImage: m('og:image'),
    twitterCard: m('twitter:card'),
    twitterTitle: m('twitter:title'),
    twitterDescription: m('twitter:description'),
    twitterImage: m('twitter:image'),
    twitterImageAlt: m('twitter:image:alt'),
    themeColor: m('theme-color'),
    googleSiteVerification: m('google-site-verification'),
    h1: clean($('h1').first().text()) || null,
  };
}
writeFileSync(path.join(OUT, 'seo.json'), JSON.stringify(seo, null, 2) + '\n');

// ---------- Legal pages ----------
function toMarkdown($, aids, { boldTo = '##', special = {} } = {}) {
  let md = aids
    .map((aid) => td.turndown($.html($(`[data-aid="${aid}"]`).first())))
    .join('\n\n');
  md = md
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => {
      let l = line.replace(/^(\s*)-\s+/, '$1- ').replace(/(\S) {2,}(?=\S)/g, '$1 ').replace(/\s+$/, '');
      const bold = l.match(/^\*\*(.+?)\*\*$/);
      if (bold) return `\n${special[bold[1].trim()] ?? boldTo} ${bold[1].trim()}\n`;
      for (const [re, level] of special.patterns ?? []) if (re.test(l)) return `\n${level} ${l}\n`;
      return l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return md;
}

function frontmatter(slug, extra = {}) {
  const s = seo[slug];
  const fm = {
    path: `/${slug}`,
    title: s.title,
    description: s.description,
    h1: extra.h1 ?? s.h1,
    ...extra,
  };
  return (
    '---\n' +
    Object.entries(fm)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n') +
    '\n---\n\n'
  );
}

{
  const $ = page('privacy-policy');
  const sub = Object.fromEntries(
    [
      'Information We Collect Directly from You',
      'Information We Collect about Your Usage',
      'Category',
      'Categories of Recipients',
      'Category of Personal Information',
    ].map((t) => [t, '###']),
  );
  const body = toMarkdown($, ['PRIVACY_CONTENT_RENDERED'], { special: sub });
  writeFileSync(path.join(OUT, 'pages/privacy-policy.md'), frontmatter('privacy-policy') + body + '\n');
}
{
  // On GoDaddy the Return Policy page reuses the "privacy" widget.
  const $ = page('return-policy');
  const h1 = clean($('[data-aid="PRIVACY_SECTION_TITLE_RENDERED"]').text());
  const body = toMarkdown($, ['PRIVACY_CONTENT_RENDERED']);
  writeFileSync(path.join(OUT, 'pages/return-policy.md'), frontmatter('return-policy', { h1 }) + body + '\n');
}
{
  const $ = page('terms-and-conditions');
  const h1 = clean($('[data-aid="TERMS_SECTION_TITLE_RENDERED"]').text());
  const terms = toMarkdown($, ['TERMS_CONTENT_RENDERED'], {
    boldTo: '###',
    special: {
      'Terms of service': '##',
      patterns: [[/^(OVERVIEW|SECTION \d+ - .+|SMS\/MMS MOBILE MESSAGE MARKETING PROGRAM TERMS AND CONDITIONS)$/, '###']],
    },
  });
  // The Return Policy copy that GoDaddy appends here is dropped (owner's decision):
  // it lives on /return-policy.
  writeFileSync(path.join(OUT, 'pages/terms-and-conditions.md'), frontmatter('terms-and-conditions', { h1 }) + terms + '\n');
}

// ---------- FAQ ----------
{
  const $ = page('faq');
  const h1El = $('[data-aid="CONTENT_WELCOME_TITLE_RENDERED"]');
  const section = h1El.closest('section');
  const paras = section
    .find('p')
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean);
  const items = [];
  for (let i = 0; i < paras.length; i++) {
    if (paras[i].endsWith('?') && paras[i + 1] && !paras[i + 1].endsWith('?')) {
      items.push({ question: paras[i], answer: paras[i + 1] });
      i++;
    }
  }
  const cta = section.find('[data-aid="CONTENT_CTA_BTN_RENDERED"]');
  writeFileSync(
    path.join(OUT, 'faq.json'),
    JSON.stringify(
      {
        h1: clean(h1El.text()),
        items,
        cta: { text: clean(cta.text()), originalHref: cta.attr('href') ?? null },
      },
      null,
      2,
    ) + '\n',
  );
}

// ---------- Products ----------
{
  const $ = page('all-products');
  const products = [];
  $('picture').each((_, el) => {
    const $p = $(el);
    const url = original($p.find('source').first().attr('srcset'));
    if (!/wsimg\.com/.test(url)) return;
    let n = $p;
    let caption = '';
    for (let k = 0; k < 8 && !caption; k++) {
      n = n.parent();
      const ps = n.find('p').map((_, x) => clean($(x).text())).get().filter(Boolean);
      if (ps.length === 1) caption = ps[0];
      else if (ps.length > 1) break;
    }
    const dot = caption.indexOf('. ');
    products.push({
      name: dot > 0 ? caption.slice(0, dot) : caption,
      ingredients: dot > 0 ? caption.slice(dot + 2) : '',
      caption,
      image: url,
      imageFile: decodeURIComponent(url.split('/').pop()),
      alt: clean($p.find('img').attr('alt')),
    });
  });
  writeFileSync(
    path.join(OUT, 'products.json'),
    JSON.stringify(
      {
        h1: clean($('[data-aid="GALLERY_SECTION_TITLE_RENDERED"]').text()),
        products,
      },
      null,
      2,
    ) + '\n',
  );
}

console.log('Wrote content/seo.json, faq.json, products.json, pages/*.md');
