# bakedinweston.com

Migration of bakedinweston.com from GoDaddy Website Builder to a static site on our own server.

## Status

- [ ] Step 1: content inventory (`content/inventory.md`)
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
