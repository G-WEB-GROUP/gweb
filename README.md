# bakedinweston.com

Migration of bakedinweston.com from GoDaddy Website Builder to a static site on our own server.

## Status

- [~] Step 1: content inventory (`content/inventory.md`) — 5 of 6 pages done; home page and images pending
- [ ] Step 2+: Astro site, design, deploy

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
node scripts/build-content.mjs
```

It writes the editable content files (text kept verbatim):

| File | What |
|---|---|
| `content/seo.json` | title, description, OG/Twitter, theme-color per page |
| `content/faq.json` | FAQ questions and answers |
| `content/products.json` | products: name, ingredients, image URL, alt |
| `content/pages/*.md` | Privacy Policy, Terms and Conditions, Return Policy |

`scripts/extract-sections.mjs <file> <DATA_AID>…` prints any GoDaddy block as Markdown.
