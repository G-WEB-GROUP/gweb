# bakedinweston.com

Migration of bakedinweston.com from GoDaddy Website Builder to a static site on our own server.

## Status

- [x] Step 1: content inventory (`content/inventory.md`) — all 6 pages; photos listed, download pending
- [~] Step 2–3: Astro site + design — home page v1 ready for review (`docs/preview/`, Lighthouse in `docs/lighthouse/`)
- [ ] Other pages, contact form backend, deploy

## Site (Astro)

Static site built with [Astro](https://astro.build). No client framework; a few small scripts
(menu, gallery viewer, cookie consent, form).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # -> dist/
npm run preview
```

| What | Where |
|---|---|
| Page texts | `content/home.json`, `content/faq.json`, `content/products.json`, `content/pages/*.md` |
| "Why Sourdough?" layout (sub-headings, 4 cards) | `content/blocks/why-sourdough.md` |
| Gallery (order, alt texts) | `content/gallery.json` |
| Titles / descriptions | `content/seo.json` |
| Photos | `content/images/original/` — referenced by file name without extension; missing photos are skipped |
| Phone, email, Storefront links, menu | `src/lib/site.ts` |
| Colors, fonts | `src/styles/global.css` (`:root` tokens) |

Photos are converted at build time to AVIF + WebP + JPEG in several widths (`srcset`), lazy-loaded except the hero.
Fonts (Fraunces + Source Sans 3, both Google Fonts) are self-hosted via Fontsource with `font-display: swap`:
no request to Google, faster first paint.

### Design notes

- Brand orange `#ed6a29` is kept. White text on it fails contrast (3.1:1), so buttons use dark text (5.5:1);
  orange text on cream uses the darker `#b4461a` (5.1:1).
- Storefront links open in the **same tab**: ordering is the visitor's goal, and same-tab keeps the Back button
  working on phones. Nothing from Simply Bread is embedded.
- Google Analytics (`G-BF2FDR6KMM`) loads only after "Accept" in the cookie banner.

## Step 1: collect content from the current site

```bash
npm install
npm run scrape            # crawl pages and download original images
npm run scrape -- --no-images
```

The script crawls `/`, `/faq`, `/privacy-policy`, `/terms-and-conditions`,
`/all-products`, `/return-policy` and any other internal pages it finds. It skips the
GoDaddy store leftovers (`/shop*`, `/m/*`) and external links such as the Simply Bread storefront.

Output:

| Path | What |
|---|---|
| `content/raw/<page>.html` | original HTML |
| `content/raw/<page>.json` | title, meta description, OG/Twitter tags, theme-color, google-site-verification, JSON-LD, deduplicated text, links, images with alt |
| `content/images/original/` | images in original quality (GoDaddy `/:/rs=...` transforms removed) |
| `content/images/manifest.json` | image URL → local file → alt |
| `content/inventory.draft.md` | generated draft, reviewed by hand into `content/inventory.md` |

To parse a saved page offline: `node scripts/scrape.mjs --file page.html --url https://bakedinweston.com/faq`.

## Content from saved pages

When the site can't be crawled, save each page in the browser (Ctrl+S) into `content/source/<slug>.html`
(`home`, `faq`, `all-products`, `privacy-policy`, `terms-and-conditions`, `return-policy`), then run:

```bash
npm run content   # saved HTML -> content/*.json, content/pages/*.md
npm run images    # download original photos listed in content/images.json
```

It writes the editable content files (text kept verbatim):

| File | What |
|---|---|
| `content/seo.json` | title, description, OG/Twitter, theme-color per page |
| `content/home.json` | home page: hero, Difference, gallery, About, banner, contacts, social |
| `content/images.json` | every photo: original URL, local file name, alt, where it is used; slides still missing |
| `content/faq.json` | FAQ questions and answers |
| `content/products.json` | products: name, ingredients, image URL, alt |
| `content/pages/*.md` | Privacy Policy, Terms and Conditions, Return Policy |

`scripts/extract-sections.mjs <file> <DATA_AID>…` prints any GoDaddy block as Markdown.
