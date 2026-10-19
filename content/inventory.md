# Content inventory — bakedinweston.com

Source: pages saved from the live GoDaddy site (Website Builder 8.0) on 2026-10-19,
stored in `content/source/`. Direct crawling is blocked in the build environment, so
**the home page and images are not collected yet** (see "Missing" below).

Status legend: ✅ collected verbatim · ⏳ missing · ⚠️ issue on the current site

## 1. Pages

| URL | Status | `<title>` | H1 | Content file |
|---|---|---|---|---|
| `/` | ⏳ not saved yet | — | — | — |
| `/faq` | ✅ | Sourdough Bread FAQ - Your Questions Answered | Sourdough Bread FAQ | `content/faq.json` |
| `/all-products` | ✅ | Artisan Sourdough Products: Breads & Bagels for You! The Best Sourdough Products. | Sourdough Products: Artisan Baked Goods from Baked in Weston | `content/products.json` |
| `/privacy-policy` | ✅ | Sourdough Bakery Privacy Policy - Baked in Weston | Sourdough Bakery Privacy Policy | `content/pages/privacy-policy.md` |
| `/terms-and-conditions` | ✅ | Baked in Weston ⚠️ generic | Terms and Conditions | `content/pages/terms-and-conditions.md` |
| `/return-policy` | ✅ | Return Policy | Return Policy (H1 not rendered as H1 on GoDaddy) | `content/pages/return-policy.md` |
| Storefront → `https://app.simply-bread.co/bakedinweston` | external | — | — | link only (currently `target=_blank`) |
| `/shop?olsPage=cart`, `/shop/olsPage=all`, `/m/account`, `/m/create-account`, `/m/orders` | GoDaddy store leftovers | — | — | not rebuilt → 301 |

`/all-products` **is a static gallery section, not the GoDaddy Online Store catalogue**:
15 slides, each with a photo and a caption "Name. Ingredients". **No prices** anywhere on the site.

## 2. SEO data

All values per page are in `content/seo.json`.

| Field | Value |
|---|---|
| `lang` | en-US |
| `theme-color` | `#ed6a29` |
| `author` | Baked in Weston |
| `og:site_name` / `og:title` (same on every page) | Baked in Weston |
| `og:description` (same on every page) | Weston's bakery, a charming microbakery in Weston, CT, specializes in artisanal sourdough breads, delicious sourdough bagels, and a variety of other sourdough goods, including vegan bread and no preservatives bread. |
| `og:type` / `og:locale` | website / en_US |
| `og:image`, `twitter:image` | `https://img1.wsimg.com/isteam/ip/32e560b8-239c-4e88-bfc4-1cf69e9d7d19/unnamed-3.jpg` |
| `twitter:card` | summary |
| `twitter:title` / `twitter:description` / `twitter:image:alt` | Baked in Weston / Weston Bakery: Fresh Sourdough Breads and Baked Goods / Baked in Weston |
| `google-site-verification` | not present on inner pages (expected on `/` only — to confirm from the home page). Value from the brief: `bRz9ujVaVlrNNjrMt3HXZ5Q4lJN0pYNC_gyUgZ6YP2A` |
| canonical | none on any page ⚠️ |
| JSON-LD | none on any page ⚠️ |
| Analytics | Google Analytics 4 `G-BF2FDR6KMM`, connected through GoDaddy's commerce integration |
| Fonts | League Spartan (headings) |

Meta descriptions:

| Page | description |
|---|---|
| `/faq` | Explore our sourdough bread FAQ to learn about gluten-friendly, vegan options and how to best preserve your artisanal breads. |
| `/all-products` | Explore our artisan baked sourdough products, including breads and bagels, crafted with passion in Weston, CT. |
| `/privacy-policy` | Discover Baked in Weston's sourdough bakery privacy policy, emphasizing our commitment to data protection and personal information security. |
| `/terms-and-conditions` | Weston bakery offering artisanal sourdough breads, sourdough bagels, and vegan bread. Freshly baked goods delivered to your door. (likely the site default / home description) |
| `/return-policy` | Explore Baked in Weston's return policy for order cancellations, refunds, and the return process for your bakery purchases. ⚠️ on GoDaddy the apostrophe is double-encoded and shows as `&#39;` |

## 3. Navigation, header and footer

Header menu (same on all pages): Home · Storefront (`target=_blank`) · FAQ · Privacy Policy ·
Terms and Conditions · All Products · Return Policy.
GoDaddy extras to drop: search, cart icon, Sign In / Create Account / Orders / My Account, "Signed in as".

Footer: links Storefront · FAQ · Return Policy; `Copyright © 2026 Baked in Weston - All Rights Reserved.`;
"Powered by GoDaddy Airo" (drop).

Cookie banner (GoDaddy): "This website uses cookies." / "We use cookies to analyze website traffic and
optimize your website experience. By accepting our use of cookies, your data will be aggregated with all
other user data." / [Accept].

## 4. FAQ (`/faq`) — 8 Q&A, verbatim in `content/faq.json`

1. Is My Bread Vegan?
2. Is My Bread Gluten Friendly?
3. Is My Bread Always Fresh?
4. Does My Bread Contain Oil?
5. What Are The Ingredients in My Sourdough Bread?
6. What is Leaven (Also Referred to as Starter)?
7. How Can I Preserve Sourdough Bread in the Best Possible Way?
8. Can I Store Sourdough Bread In The Refrigerator?

CTA button "Order Bread" → `/shop/olsPage=all` ⚠️ dead GoDaddy store link → new site: Storefront.

## 5. Products (`/all-products`) — 15 items, verbatim in `content/products.json`

| # | Name | Photo (original file) | alt | Note |
|---|---|---|---|---|
| 1 | White Sourdough | `ols/image_123650291.JPG` | White Sourdough | |
| 2 | Whole Wheat Sourdough | `unnamed-3.jpg` | Two beautifully baked artisan sourdough loaves with decorative scoring. | ⚠️ generic photo (same as og:image); ingredients end with "leaven," |
| 3 | Country Sourdough | `ols/Classic.jpg` | Country Sourdough | ingredients end with "leaven," |
| 4 | Rye Sourdough | `ols/jewish_rye.jpg` | Rye Sourdough | |
| 5 | White Sandwich Sourdough | `ols/white_sandwich.jpg` | White Sandwich Sourdough | |
| 6 | Chocolate Sourdough | `ols/chocolate.jpg` | Chocolate Sourdough | |
| 7 | Walnut Cranberry Sourdough | `Cinnamon Raisin.jpg` | Close-up of a freshly baked artisan sourdough bread with a decorative crust. | ⚠️ uses the Cinnamon Raisin photo |
| 8 | Double Chocolate Espresso Sourdough | `ols/double chocolate espresso.jpg` | Double Chocolate Espresso Sourdough | ingredients end with "leaven," |
| 9 | Cinnamon Raisin Sourdough | `Cinnamon Raisin.jpg` | Cinnamon Raisin Sourdough | ingredients end with "leaven," |
| 10 | Borodinsky Rye Sourdough | `ols/borodinsky.jpg` | Borodinsky Rye Sourdough | |
| 11 | Sourdough Ciabatta Rolls (8) | `ciabatta rolls.jpg` | Sourdough Ciabatta Rolls | |
| 12 | Sourdough Vegan Scones with Tart Cherries | `tart cherry scones.jpg` | Sourdough Vegan Scones with Tart Cherries | |
| 13 | Sourdough Vegan Vanilla Scones | `vanilla scones.jpg` | Sourdough Vegan Vanilla Scones | |
| 14 | Sourdough Vegan Scones with Cranberries | `cranberry scones.jpg` | Sourdough Vegan Scones with Cranberries | |
| 15 | Sourdough Bagels | `bagels-85a777e.jpg` | Sourdough Bagels | ingredients end with "leaven," |

## 6. Legal pages — verbatim Markdown in `content/pages/`

- **Privacy Policy** — "Last updated: August 21, 2025"; 19 sections (Changes…, How We Collect…, Cookies,
  Your Rights, Contact…). Contact: inna@bakedinweston.com, 24 Farrell Rd, Weston, CT, 06883, United States.
  ⚠️ The Cookies section says the site is "powered … with GoDaddy and our store with Simply Bread" — after
  migration this sentence is no longer accurate (owner's decision; text not changed).
- **Terms and Conditions** — "Terms of service": Overview + Sections 1–20 + "SMS/MMS Mobile Message
  Marketing Program Terms and Conditions" (13 points), followed by a full copy of the Return Policy.
  Contact: inna@bakedinweston.com.
- **Return Policy** — cancellation/refund rules, "Damages and issues", "Exceptions / non-returnable items",
  "Refunds". Contact: inna@bakedinweston.com.

Headings: GoDaddy shows sub-headings as bold paragraphs; in Markdown they are real `##`/`###` headings.
Text is unchanged (checked word-by-word against the source).

## 7. Images

All images live under `https://img1.wsimg.com/isteam/ip/32e560b8-239c-4e88-bfc4-1cf69e9d7d19/`.
Original quality = URL with the `/:/…` transform suffix removed.

| File | Used for | alt on current site |
|---|---|---|
| `cff40c3e-27dc-404b-a8a9-a13fc06cf318.jpeg` | header logo (339×70 render) + favicon / apple-touch-icon | (empty) ⚠️ |
| `unnamed-3.jpg` | og:image, twitter:image, product #2 | see above |
| 13 product photos | see section 5 | see section 5 |
| home page photos (hero, gallery, About) | ⏳ | ⏳ |

⏳ **Not downloaded yet**: `img1.wsimg.com` is blocked in the build environment.

## 8. Contacts and facts (from the pages collected so far)

- Address: 24 Farrell Rd, Weston, CT, 06883, United States
- Email on legal pages: **inna@bakedinweston.com** (the brief names sales@bakedinweston.com for the form)
- Phone, WhatsApp, hours "By Appointment, 7 days a week", Facebook/Instagram URLs, Dan Woog article link,
  free-delivery banner — all on the home page ⏳

## 9. Missing — needed to finish step 1

1. **Home page** (`https://bakedinweston.com/`) — the file `Baked_in_Weston.html` turned out to be
   `/terms-and-conditions`. Save the home page the same way (Ctrl+S, "Webpage, HTML only" is fine),
   scrolling to the bottom first so the gallery loads.
2. **Images** — either allow `img1.wsimg.com` in the environment network settings, or save pages as
   "Webpage, Complete" and send the `_files` folders (those hold only resized copies, so the first option is better).

## 10. Questions for the owner / issues found

1. Form recipient: **sales@** (brief) or **inna@** (used in all legal texts)? Legal texts keep inna@ unless told otherwise.
2. Ingredient lists ending with "leaven," (items 2, 3, 8, 9, 15) — were they cut off on GoDaddy? Keep as is or end with "leaven."?
3. Walnut Cranberry has the Cinnamon Raisin photo, Whole Wheat has a generic one — is there a correct photo?
4. Terms page duplicates the full Return Policy — keep the duplicate or link to `/return-policy`?
5. GA4 `G-BF2FDR6KMM` — is this the owner's own GA property (do we have access)? If we keep analytics, the
   cookie banner with Accept/Decline is needed; if not, no banner.
6. Privacy Policy mentions GoDaddy in "Cookies" — update the wording after migration?
7. `/terms-and-conditions` has the generic title "Baked in Weston" — give it "Terms and Conditions - Baked in Weston"?
