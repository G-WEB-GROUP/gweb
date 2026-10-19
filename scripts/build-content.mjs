#!/usr/bin/env node
// Turn the saved GoDaddy pages in content/source/ into editable content files:
//   content/pages/<slug>.md   legal pages (frontmatter + Markdown, text verbatim)
//   content/faq.json          FAQ questions and answers
//   content/products.json     /all-products gallery: name, ingredients, image, alt
//   content/seo.json          title / description / OG / Twitter per page
// Usage: node scripts/build-content.mjs

import { load } from 'cheerio';
import TurndownService from 'turndown';
import { readFileSync, writeFileSync as fsWrite, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'content/source');
const OUT = path.join(ROOT, 'content');
mkdirSync(path.join(OUT, 'pages'), { recursive: true });

// This is a one-time import from the GoDaddy pages. After that the files in content/ are
// edited by hand, so existing files are kept unless --force is given.
const FORCE = process.argv.includes('--force');
const _write = fsWrite;
function writeFileSync(file, data) {
  if (existsSync(file) && !FORCE && !String(file).endsWith('images.json')) {
    console.log('keep', path.relative(ROOT, String(file)), '(use --force to overwrite)');
    return;
  }
  _write(file, data);
}

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
    // GoDaddy gave Terms the generic site title; it gets its own.
    title: slug === 'terms-and-conditions' && s.title === 'Baked in Weston' ? 'Terms and Conditions - Baked in Weston' : s.title,
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

// ---------- Home ----------
{
  const $ = page('home');
  const txt = (aid) => clean($(`[data-aid="${aid}"]`).first().text());
  const href = (aid) => $(`[data-aid="${aid}"]`).first().attr('href') ?? null;
  const md = (aid) =>
    td
      .turndown($.html($(`[data-aid="${aid}"]`).first()))
      .replace(/ /g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  // Original image URL of an <img>: lazy attributes, own srcset, or the parent <picture>'s first <source>.
  const lazy = (el) => {
    const $e = $(el);
    for (const v of [
      $e.attr('data-srclazy'),
      $e.attr('data-srcsetlazy'),
      $e.attr('srcset'),
      $e.closest('picture').find('source').first().attr('srcset'),
      $e.attr('src'),
    ]) {
      const u = original(v || '');
      if (/wsimg\.com\/isteam\/ip\/(?!static)/.test(u)) return u;
    }
    return '';
  };
  // The main photo of a block = the first <img> that has alt text (skips the logo).
  const imageIn = (sel) => {
    const all = $(sel).find('img').toArray();
    const imgs = all.filter((e) => clean($(e).attr('alt'))).concat(all);
    const url = imgs.map(lazy).find((u) => /wsimg\.com/.test(u)) ?? null;
    const alt = imgs.map((e) => clean($(e).attr('alt'))).find(Boolean) ?? '';
    return { url, file: url ? decodeURIComponent(url.split('/').pop()) : null, alt };
  };
  const sections = $('section').filter((_, s) => !$(s).parents('section').length);
  const sectionOf = (aid) => sections.filter((_, s) => $(s).find(`[data-aid="${aid}"]`).length > 0).first();

  // About items: headline, description (Markdown), CTA, image.
  const aboutSection = sections.filter((_, s) => $(s).find('[data-aid="ABOUT_HEADLINE_RENDERED3"]').length > 0).first();
  const aboutItems = [];
  for (let i = 0; i < 10; i++) {
    const h = aboutSection.find(`[data-aid="ABOUT_HEADLINE_RENDERED${i}"]`).last();
    if (!h.length) break;
    let box = h;
    for (let k = 0; k < 8; k++) {
      box = box.parent();
      if (box.find(`[data-aid="ABOUT_IMAGE_RENDERED${i}"]`).length) break;
    }
    const desc = box.find(`[data-aid="ABOUT_DESCRIPTION_RENDERED${i}"]`).first();
    const cta = box.find('[data-aid^="ABOUT_CTA_BTN_RENDERED"]').first();
    const imgs = box.find(`[data-aid="ABOUT_IMAGE_RENDERED${i}"] img, img`).toArray();
    const url = imgs.map(lazy).find((u) => /wsimg\.com/.test(u)) ?? null;
    aboutItems.push({
      headline: clean(h.text()),
      bodyMarkdown: desc.length
        ? td.turndown($.html(desc)).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
        : null,
      cta: cta.length ? { text: clean(cta.text()), href: cta.attr('href') } : null,
      image: { url, file: url ? decodeURIComponent(url.split('/').pop()) : null, alt: imgs.map((e) => clean($(e).attr('alt'))).find(Boolean) ?? '' },
    });
  }

  // Gallery: 33 slides on GoDaddy; the saved page only keeps original URLs for a few.
  const gallerySection = sectionOf('THUMBNAIL_NAV_LIST');
  const known = {};
  gallerySection.find('[data-aid^="GALLERY_IMAGE"]').each((_, e) => {
    const n = Number($(e).attr('data-aid').match(/\d+/)[0]);
    const img = $(e).is('img') ? e : $(e).find('img').get(0);
    // GoDaddy sometimes puts the image URL into alt when no alt text was set.
    const altUrl = original(clean($(img).attr('alt')));
    const url = img ? lazy(img) || (/wsimg\.com/.test(altUrl) ? altUrl : '') : '';
    if (url) known[n] = url;
  });
  const gallery = gallerySection
    .find('[data-aid="THUMBNAIL_NAV_LIST"] li')
    .toArray()
    .map((li, i) => {
      const alt = clean($(li).find('img').attr('alt'));
      const url = known[i] ?? null;
      return { index: i, url, file: url ? decodeURIComponent(url.split('/').pop()) : null, alt: /^image\d+$/.test(alt) ? '' : alt };
    });

  const ld = $('script[type="application/ld+json"]').map((_, e) => JSON.parse($(e).text())).get();
  const home = {
    hero: {
      h1: txt('HEADER_TAGLINE_RENDERED'),
      subtitle: txt('HEADER_TAGLINE2_RENDERED'),
      phoneLine: txt('HEADER_PHONE_RENDERED'),
      cta: { text: txt('HEADER_CTA_BTN'), href: href('HEADER_CTA_BTN') },
      backgroundImage: imageIn('[data-aid="HEADER_SECTION"]'),
    },
    difference: {
      title: clean(sectionOf('ABOUT_IMAGE_RENDERED0').first().find('[data-aid="ABOUT_SECTION_TITLE_RENDERED"]').text()),
      text: clean(sections.eq(sections.index(sectionOf('ABOUT_IMAGE_RENDERED0'))).find('[data-aid="ABOUT_HEADLINE_RENDERED0"]').first().text()),
      image: imageIn(sectionOf('ABOUT_IMAGE_RENDERED0').first()),
    },
    marquee: txt('CONTENT_SECTION_TITLE_RENDERED'),
    gallery: { title: clean(gallerySection.find('[data-aid="GALLERY_SECTION_TITLE_RENDERED"]').text()), slides: gallery },
    about: { title: clean(aboutSection.find('[data-aid="ABOUT_SECTION_TITLE_RENDERED"]').first().text()), items: aboutItems },
    banner: clean(sections.filter((_, s) => /EAT REAL BREAD/.test($(s).text())).find('h2').text()),
    contact: {
      title: txt('CONTACT_SECTION_TITLE_REND'),
      formTitle: txt('CONTACT_FORM_TITLE_REND'),
      formFields: ['Name', 'Email*', 'Message', 'Attach Files'],
      submit: txt('CONTACT_SUBMIT_BUTTON_REND'),
      introHeading: txt('CONTACT_INTRO_HEADING_REND'),
      introText: txt('CONTACT_INTRO_DESC_REND'),
      whatsapp: { text: txt('CONTACT_INFO_WHATS_APP_REND'), href: href('CONTACT_INFO_WHATS_APP_REND') },
      businessName: txt('CONTACT_INFO_BIZ_NAME_REND'),
      address: txt('CONTACT_INFO_ADDRESS_REND'),
      phone: { text: txt('CONTACT_INFO_PHONE_REND'), href: href('CONTACT_INFO_PHONE_REND') },
      email: { text: txt('CONTACT_INFO_EMAIL_REND'), href: href('CONTACT_INFO_EMAIL_REND') },
      hoursTitle: txt('CONTACT_HOURS_TITLE_REND'),
      hoursText: clean(sectionOf('CONTACT_HOURS_TITLE_REND').find('[data-aid="CONTACT_HOURS_TITLE_REND"]').parent().text()).replace(txt('CONTACT_HOURS_TITLE_REND'), '').trim(),
    },
    social: {
      title: clean(sectionOf('SOCIAL_SOCIAL_LINKS').find('h2').text()),
      facebook: href('SOCIAL_FACEBOOK_LINK'),
      instagram: href('SOCIAL_INSTAGRAM_LINK'),
    },
    footer: { copyright: txt('FOOTER_COPYRIGHT_RENDERED') },
    jsonLd: ld,
  };
  writeFileSync(path.join(OUT, 'home.json'), JSON.stringify(home, null, 2) + '\n');
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

// ---------- Image list ----------
{
  const read = (f) => JSON.parse(readFileSync(path.join(OUT, f), 'utf8'));
  const home = read('home.json');
  const { products } = read('products.json');
  const list = new Map();
  const add = (url, usedIn, alt) => {
    if (!url) return;
    const file = decodeURIComponent(url.split('/').pop()).replace(/[^\w.-]+/g, '-').toLowerCase();
    const cur = list.get(url) ?? { url, file, alt: '', usedIn: [] };
    if (!cur.alt && alt) cur.alt = alt;
    cur.usedIn.push(usedIn);
    list.set(url, cur);
  };
  const logo = 'https://img1.wsimg.com/isteam/ip/32e560b8-239c-4e88-bfc4-1cf69e9d7d19/cff40c3e-27dc-404b-a8a9-a13fc06cf318.jpeg';
  add(logo, 'logo + favicon', 'Baked in Weston');
  add(home.hero.backgroundImage.url, 'home: hero + og:image', home.hero.backgroundImage.alt);
  add(home.difference.image.url, 'home: Discover the Difference', home.difference.image.alt);
  home.about.items.forEach((i) => add(i.image.url, `home: About / ${i.headline}`, i.image.alt));
  home.gallery.slides.forEach((g) => add(g.url, `home: gallery #${g.index + 1}`, g.alt));
  products.forEach((p) => add(p.image, `products: ${p.name}`, p.alt));
  const missing = home.gallery.slides
    .filter((g) => !g.url)
    .map((g) => ({ usedIn: `home: gallery #${g.index + 1}`, alt: g.alt }));
  writeFileSync(
    path.join(OUT, 'images.json'),
    JSON.stringify({ images: [...list.values()], missing }, null, 2) + '\n',
  );
}

console.log('Wrote content/seo.json, images.json, home.json, faq.json, products.json, pages/*.md');
