# DNS cutover checklist — bakedinweston.com

Goal: point the website to the new server **without touching email**.
Only the website records change: `A @` (and `AAAA @` if present) and `CNAME www`.
**Do not change MX, TXT (SPF, DMARC, verification), DKIM CNAMEs, autodiscover, SRV records.**

Nothing in DNS is changed without the owner's go-ahead.

---

## 1. Before (1–2 days ahead)

- [ ] **Export / screenshot the whole DNS zone** in GoDaddy (Domain → DNS → Records). Save it next to this file.
      Write down the current values:
      - `A @` → `______________` (GoDaddy Website Builder IP — needed for rollback)
      - `AAAA @` → `______________` (if any)
      - `CNAME www` → `______________`
- [ ] Note who hosts email (MX records):
      `*.mail.protection.outlook.com` = Microsoft 365 via GoDaddy; `*.secureserver.net` = GoDaddy Workspace;
      `*.google.com` = Google Workspace. **These stay as they are.**
- [ ] Check **Domain → Forwarding** in GoDaddy: no forwarding should be set for the domain or `www`.
- [ ] **Lower TTL** of `A @` and `CNAME www` to **600 s** (10 min). Wait for the old TTL to expire (usually 1 h).
- [ ] New site is deployed on the test address and **approved by the owner** (pages, form, photos).
- [ ] Contact form: `/etc/bakedinweston/contact.env` has working SMTP settings; a test message from the
      test address arrived in `inna@bakedinweston.com`.
- [ ] Search Console: check how the property is verified (Settings → Ownership verification).
      The `google-site-verification` meta tag is on every page of the new site. If verification is by
      DNS TXT, that TXT record stays untouched.
- [ ] HTTPS certificate — choose one:
      - **A (recommended, no gap):** issue the certificate before the switch with a DNS challenge:
        `sudo certbot certonly --manual --preferred-challenges dns -d bakedinweston.com -d www.bakedinweston.com`.
        Certbot asks to **add** a TXT record `_acme-challenge` (a new record, nothing existing changes;
        delete it afterwards). Manual certificates don't renew by themselves, so after the switch run the
        webroot command from option B once with `--force-renewal` to move to automatic renewal.
      - **B (simpler, a few minutes without HTTPS):** at the switch enable `bakedinweston-http.conf`
        (site over HTTP), change DNS, wait until `dig` shows the new IP, then run
        `sudo certbot certonly --webroot -w /var/www/letsencrypt -d bakedinweston.com -d www.bakedinweston.com --deploy-hook "systemctl reload nginx"`
        and switch to `bakedinweston.conf`.

## 2. Switch (≈ 15 minutes)

- [ ] On the server: disable `bakedinweston-test.conf`; enable `bakedinweston.conf` (option A, certificate ready)
      or `bakedinweston-http.conf` (option B); `sudo nginx -t && sudo systemctl reload nginx`.
- [ ] GoDaddy DNS — edit **only**:
      - `A @` → **new server IP**
      - `AAAA @` → new IPv6, or delete it if the server has no IPv6
      - `CNAME www` → `bakedinweston.com.` (or `@`)
- [ ] Do **not** use "Disconnect domain" / "Connect to website" buttons in Website Builder — edit the records directly.

## 3. Check (right after, and again the next day)

- [ ] `dig +short bakedinweston.com` and `dig +short www.bakedinweston.com` show the new IP (try `@1.1.1.1` and `@8.8.8.8`).
- [ ] `dig +short MX bakedinweston.com` and `dig +short TXT bakedinweston.com` are **the same as in the saved zone**.
- [ ] `curl -I http://bakedinweston.com` → 301 to `https://bakedinweston.com/`;
      `curl -I https://www.bakedinweston.com` → 301 to `https://bakedinweston.com/`.
- [ ] All pages open: `/`, `/all-products`, `/faq`, `/privacy-policy`, `/terms-and-conditions`, `/return-policy`.
- [ ] Old URLs `/shop?olsPage=cart`, `/m/account` and unknown pages → styled 404 (no redirects, owner's decision).
- [ ] Storefront buttons open `app.simply-bread.co/bakedinweston`.
- [ ] **Email:** send a message from an outside address to `inna@` and `sales@bakedinweston.com` and reply from them — both directions work.
- [ ] Contact form on the live site → message arrives in `inna@bakedinweston.com`.
- [ ] Certificate valid (padlock in the browser; `sudo certbot renew --dry-run` passes).
- [ ] Google Analytics → Realtime shows a visit after clicking **Accept** in the cookie banner.
- [ ] Search Console: open the property (still verified), submit `https://bakedinweston.com/sitemap.xml`,
      run URL Inspection on the home page.

## 4. Rollback

- **Problem with the new site only (bug, wrong content):** `./scripts/deploy.sh --rollback` switches to the
  previous release in seconds. DNS stays.
- **Problem with the new server:** in GoDaddy DNS set `A @` (and `AAAA @`, `CNAME www`) back to the values
  saved in step 1. With TTL 600 most visitors are back on GoDaddy within ~10–30 minutes.
  The GoDaddy Website Builder site keeps working as long as its plan is active.
- Email is not affected by either rollback, because MX/TXT were never changed.

## 5. After 1–2 weeks of stable work

- [ ] Raise TTL of `A @` / `CNAME www` back to 1 hour.
- [ ] Turn on HSTS in `bakedinweston.conf` (uncomment `Strict-Transport-Security`), reload nginx.
- [ ] Check Search Console → Pages for new errors; check `/var/log/nginx/access.log` for frequent 404s.
- [ ] Only then cancel the GoDaddy **Website Builder** plan. **Keep** the domain and the email plan.
