# bakedinweston.com

Website of Baked in Weston (sourdough microbakery, Weston CT), moved from GoDaddy Website Builder to a
static site on our own server. Same pages and URLs, same texts, new design. Ordering stays on
Simply Bread (`app.simply-bread.co/bakedinweston`).

## Status

- [x] Content inventory — `content/inventory.md`
- [x] Site: home, All Products, FAQ, Privacy Policy, Terms and Conditions, Return Policy, 404, sitemap
- [x] Contact form endpoint (Node) with honeypot + rate limit
- [x] Nginx configs, deploy script, DNS checklist (`docs/dns-cutover.md`)
- [ ] Deploy to the test address (waiting for server access)
- [ ] DNS switch (only after the owner approves)

## Project layout

```
content/            texts, photos, SEO data  ← edit here
  home.json           home page texts (hero, About, contacts, social)
  blocks/why-sourdough.md   "Why Sourdough?" split into sections + the 4 benefit cards
  gallery.json        home gallery: photo files and alt texts, in order
  products.json       /all-products: name, ingredients, photo
  faq.json            /faq questions and answers
  pages/*.md          Privacy Policy, Terms and Conditions, Return Policy (Markdown)
  seo.json            <title> and meta description per page
  images/original/    photos (any of jpg/png/webp), referenced by file name without extension
  inventory.md        what was moved from GoDaddy, decisions, open issues
  source/             saved GoDaddy pages (reference only)
src/                Astro site code
  lib/site.ts         phone, email, address, Storefront links, menu items
  styles/global.css   colors, fonts, buttons
server/             contact form endpoint (Node, POST /api/contact)
deploy/             nginx configs, systemd unit, env example
scripts/deploy.sh   build + upload + switch release
docs/               DNS checklist, screenshots, Lighthouse reports
```

## Editing content

1. Change text in the files under `content/` (JSON or Markdown). Keep the JSON quotes and commas.
2. **Photos:** put the file into `content/images/original/` and reference it by name.
   - Gallery: add `{ "file": "my-photo.jpg", "alt": "What is in the photo" }` to `content/gallery.json`.
   - Product photo: set `"imageFile": "my-photo.jpg"` and `"alt"` for the product in `content/products.json`.
   - About / hero photos: file names in `content/home.json` (`unnamed-3` = hero, `0` = Why Sourdough,
     `unnamed` = My Story, `0-1` = Enjoying…, `unnamed-1` = delivery banner). Replace the file with the same name.
   - Missing photos are simply not shown. Large originals are fine: the build makes AVIF/WebP/JPEG in several sizes.
3. Phone, email, Storefront links: `src/lib/site.ts`.
4. Check locally (`npm run dev`), then deploy (`./scripts/deploy.sh`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
```

## How it works

- **Astro**, static HTML; no client framework. Small scripts only for the menu, gallery viewer, cookie
  banner and form.
- **URLs are the same as on GoDaddy**: `/`, `/all-products`, `/faq`, `/privacy-policy`,
  `/terms-and-conditions`, `/return-policy` (built as `faq.html` etc., served by nginx without `.html`).
  `/faq.html` and `/faq/` redirect to `/faq`. Old GoDaddy store pages `/shop*` and `/m/*` show the 404 page (redirects prepared but off, see `bakedinweston-site.inc`).
- **SEO:** title/description from the old site, canonical, Open Graph/Twitter tags, `google-site-verification`
  on every page, `sitemap.xml`, `robots.txt`, JSON-LD `Bakery` on `/` and `FAQPage` on `/faq`.
- **Images:** AVIF + WebP + JPEG with `srcset`; lazy-loaded except the hero.
- **Fonts:** Fraunces (headings) + Source Sans 3 (text), Google Fonts self-hosted via Fontsource, `font-display: swap`.
- **Colors:** brand orange `#ed6a29`. White on orange fails contrast (3.1:1), so buttons have dark text (5.5:1);
  orange text on cream uses `#b4461a` (5.1:1).
- **Storefront links open in the same tab:** ordering is the visitor's goal and the Back button keeps working on phones.
  Nothing from Simply Bread is copied or embedded.
- **Analytics:** GA4 `G-BF2FDR6KMM` loads only after **Accept** in the cookie banner ("Cookie settings" in the footer reopens it).
- **Contact form:** `server/contact-server.mjs` sends the message (and an optional attachment ≤ 5 MB:
  JPG/PNG/WebP/HEIC/PDF) to `inna@bakedinweston.com` over SMTP. Spam protection instead of reCAPTCHA: hidden
  honeypot field, minimum fill time (3 s), 5 messages per IP per 10 min (plus an nginx limit). Works without
  JavaScript too. Test: `cd server && npm install && npm test`.

## Server setup (Ubuntu 22.04/24.04, once)

```bash
# packages (Node 20+ for the form service)
sudo apt update && sudo apt install -y nginx certbot rsync
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
# optional: brotli  -> sudo apt install -y libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
#                      and uncomment the brotli lines in deploy/nginx/bakedinweston-site.inc

# deploy user (SSH key login) with rights on the site folders and to restart the form service
sudo adduser --disabled-password deploy
sudo mkdir -p /var/www/bakedinweston/releases /var/www/letsencrypt /opt/bakedinweston-contact /etc/bakedinweston
sudo chown -R deploy:deploy /var/www/bakedinweston /opt/bakedinweston-contact
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart bakedinweston-contact' | sudo tee /etc/sudoers.d/deploy-contact

# nginx: shared snippets + the TEST config first (plain HTTP on the server IP, noindex)
sudo cp deploy/nginx/*.inc /etc/nginx/snippets/
sed 's/TEST_HOST/<server-ip>/' deploy/nginx/bakedinweston-test.conf | sudo tee /etc/nginx/sites-available/bakedinweston-test.conf
sudo cp deploy/nginx/bakedinweston.conf deploy/nginx/bakedinweston-http.conf /etc/nginx/sites-available/
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/bakedinweston-test.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# contact form service
sudo cp deploy/contact.env.example /etc/bakedinweston/contact.env && sudo chmod 600 /etc/bakedinweston/contact.env
sudoedit /etc/bakedinweston/contact.env          # SMTP settings
sudo cp deploy/bakedinweston-contact.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable bakedinweston-contact
```

Only one of `bakedinweston-test.conf` / `bakedinweston-http.conf` / `bakedinweston.conf` is enabled at a time.
HTTPS (certbot) and the switch to the production config are part of `docs/dns-cutover.md`.

## Deploy

```bash
DEPLOY_HOST=<server-ip> DEPLOY_USER=deploy ./scripts/deploy.sh          # site + form service
DEPLOY_HOST=<server-ip> DEPLOY_USER=deploy ./scripts/deploy.sh --site   # site only
DEPLOY_HOST=<server-ip> DEPLOY_USER=deploy ./scripts/deploy.sh --rollback
```

The script runs `npm ci && npm run build`, uploads `dist/` to `/var/www/bakedinweston/releases/<time>/` with
rsync and then switches the `current` symlink, so a deploy is atomic and the last 5 releases are kept for rollback.

Nginx: gzip (brotli optional), `Cache-Control: immutable` for a year on hashed files in `/_astro/`,
`no-cache` on HTML, security headers, `www` → no-`www` and `http` → `https` redirects (as on GoDaddy,
whose `og:url` has no `www`).

## Staging (temporary preview on a shared server)

Preview at **https://bakedinweston.g-web.group** on the server that hosts horpyna.g-web.group
(`91.192.105.75`). Everything runs from GitHub Actions.

That server runs nginx **in Docker** (`scb-proxy-nginx-1`, ports 80/443, configs in `/opt/scb/proxy/conf.d`,
certificates in the `scb-proxy_letsencrypt` volume). The setup adds, without touching Horpyna:

- `/opt/scb/proxy/conf.d/bakedinweston.conf` — `bakedinweston.g-web.group` → container `biw-web`
  (checked with `nginx -t` before reload; restored if the check fails; the upstream is resolved per request,
  so the proxy starts even when our containers are down);
- container `biw-web` (`nginx:1.27-alpine`, same site rules as `deploy/nginx/*.inc`, serves `/var/www/bakedinweston`);
- container `biw-contact` (`node:22-alpine`, the form endpoint; settings in `/etc/bakedinweston/contact.env`);
- Let's Encrypt certificate via the `certbot/certbot` image + weekly renewal in `/etc/cron.d/bakedinweston-cert`.

On a server with nginx installed directly, the same script sets up a normal vhost + systemd service instead.

Steps:
1. DNS of `g-web.group`: `A  bakedinweston  91.192.105.75`.
2. GitHub secrets: `STAGING_HOST` (`horpyna.g-web.group`), `STAGING_USER`, `STAGING_SSH_KEY`
   (private key whose `.pub` is in that user's `~/.ssh/authorized_keys`; the server accepts keys only),
   `STAGING_PASSWORD` (for sudo, if needed).
3. Actions → **Setup staging server** → Run workflow (once; safe to repeat).
4. Actions → **Deploy staging** → Run workflow → `all`. After that every push to the work branch deploys the site.

To remove the staging site: `rm /opt/scb/proxy/conf.d/bakedinweston.conf && docker exec scb-proxy-nginx-1 nginx -s reload`,
then `docker rm -f biw-web biw-contact` and `rm /etc/cron.d/bakedinweston-cert`.

## DNS switch

See **`docs/dns-cutover.md`**: only `A @` (and `AAAA @`) and `CNAME www` change; MX, TXT/SPF, DKIM, DMARC stay,
so email keeps working. Includes checks and rollback. DNS is not changed without the owner's approval.

## Content import (history)

The texts were imported once from saved GoDaddy pages (`content/source/`) with `npm run content`
(`scripts/build-content.mjs`; it keeps existing files unless `--force`). `npm run scrape` crawls the live
site and `npm run images` downloads original photos listed in `content/images.json`, when the network allows.
