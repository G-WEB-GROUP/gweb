# Lighthouse (mobile) — 2026-10-19

Measured on a local copy of the production nginx config (HTTPS, HTTP/2, gzip, cache headers),
Lighthouse 12, mobile emulation. Will be re-measured on the test server.

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 99 | 100 | 100 | 100 | 2.0 s | 0 |
| `/all-products` | 100 | 100 | 100 | 100 | 1.4 s | 0 |
| `/faq` | 100 | 100 | 100 | 100 | 1.4 s | 0 |
| `/privacy-policy` | 100 | 100 | 100 | 100 | 1.4 s | 0 |
| `/terms-and-conditions` | 100 | 100 | 100 | 100 | 1.7 s | 0 |
| `/return-policy` | 100 | 100 | 100 | 100 | 1.4 s | 0 |

Target from the brief: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO 100.
Full reports: the `*-mobile.html` files in this folder.
