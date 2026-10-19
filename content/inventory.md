# Content inventory — bakedinweston.com

Source: pages saved from the live GoDaddy site (Website Builder 8.0) on 2026-10-19,
stored in `content/source/`. All 6 pages are collected. Direct crawling is blocked in the build
environment, so **photos are listed but not downloaded yet** (see section 7).

Status legend: ✅ collected verbatim · ⏳ missing · ⚠️ issue on the current site

## 1. Pages

| URL | Status | `<title>` | H1 | Content file |
|---|---|---|---|---|
| `/` | ✅ | Weston Bakery - Artisanal Sourdough & Baked Goods | Weston Bakery: Fresh Sourdough Breads and Baked Goods | `content/home.json` |
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
| `google-site-verification` | `bRz9ujVaVlrNNjrMt3HXZ5Q4lJN0pYNC_gyUgZ6YP2A` — on `/` only ✅ (keep on `/`; harmless on every page) |
| canonical | none on any page ⚠️ |
| JSON-LD | `/` only: `LocalBusiness` (name, image unnamed-3.jpg, address 24 Farrell Rd, Weston, CT 06883). ⚠️ `url` has no scheme, `@id` is a fake GoDaddy domain → replace with `Bakery` |
| Analytics | Google Analytics 4 `G-BF2FDR6KMM`, connected through GoDaddy's commerce integration |
| Fonts | League Spartan (headings) |

Meta descriptions:

| Page | description |
|---|---|
| `/` | Explore Weston Bakery for fresh artisanal sourdough breads and baked goods. Order online now for local delivery! |
| `/faq` | Explore our sourdough bread FAQ to learn about gluten-friendly, vegan options and how to best preserve your artisanal breads. |
| `/all-products` | Explore our artisan baked sourdough products, including breads and bagels, crafted with passion in Weston, CT. |
| `/privacy-policy` | Discover Baked in Weston's sourdough bakery privacy policy, emphasizing our commitment to data protection and personal information security. |
| `/terms-and-conditions` | Weston bakery offering artisanal sourdough breads, sourdough bagels, and vegan bread. Freshly baked goods delivered to your door. (GoDaddy site default) |
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

## 4. Home (`/`) — verbatim in `content/home.json`

GoDaddy repeats several headings 4–6 times (carousel/marquee copies); listed once here.

| # | Block | Content |
|---|---|---|
| 1 | Hero (bg photo `unnamed-3.jpg`) | phone line: "For delicious bagels and a variety of breads, including sourdough and vegan bread made without preservatives, call Weston's Bakery at 1.914.523.9904." · **H1** "Weston Bakery: Fresh Sourdough Breads and Baked Goods" · subtitle "Weston's bakery, a charming microbakery in Weston, CT, specializes in …" · button **Order Here** → `https://app.simply-bread.co/bakedinweston/signup` |
| 2 | Discover the Baked in Weston Difference (photo `image_123650291.JPG`) | "I handcraft and bake artisanal sourdough bread (white, country, whole wheat and rye varieties), bagels and sourdough vegan scones." |
| 3 | Marquee strip | "Baked with love and always fresh!" |
| 4 | Gallery "SOURDOUGH BREADS AND BAKED GOODS: A Visual of Baked in Weston" | carousel, **33 slides** (see section 7) |
| 5 | About Baked in Weston | **Why Sourdough?** (1 long paragraph, photo `0.jpg`, button **View My Menu** → Storefront) · **My Story** (4 paragraphs + Dan Woog link, photo `unnamed.jpg` — Inna) · **Enjoying Artisanal Handcrafted Sourdough** (1 paragraph, photo `0-1.jpg`, **View My Menu**) · **WEEKLY CUSTOMERS ENJOY FREE LOCAL DELIVERY** (no text, photo `unnamed-1.jpg`, button **Call Your Baker** → `tel:914-523-9904`) |
| 6 | Banner | "EAT REAL BREAD. SUPPORT YOUR LOCAL BAKER. Experience best nutrition and flavor bread can offer." (a gallery section with no photos) |
| 7 | Contact the baker | form "Drop me a line!": Name, Email*, Message, Attach Files, [Send], reCAPTCHA notice · "Better yet, see me in person!" + "I would love to meet my customers in person, so feel free to visit Weston's Bakery during normal business hours …" · **Message us on WhatsApp** → `https://wa.me/19145239904` · Baked in Weston, 24 Farrell Road, Weston, Connecticut 06883, United States · Phone 1.914.523.9904 (`tel:19145239904`) · Email sales@bakedinweston.com · **By Appointment** — "Please make an appointment before you visit. Open 7 days a week." |
| 8 | Connect With Me | Facebook `https://www.facebook.com/428263420363860` · Instagram `https://www.instagram.com/bakedinweston` |
| 9 | Hidden HTML embeds | 3 "custom HTML" blocks (iframes, 1 px high). Their code was not saved; likely tracking/widgets. ⚠️ check in the GoDaddy editor if anything there matters |

Dan Woog article: https://06880danwoog.com/2025/02/07/baked-in-weston-innas-nutritious-delicious-sourdough/

## 5. FAQ (`/faq`) — 8 Q&A, verbatim in `content/faq.json`

1. Is My Bread Vegan?
2. Is My Bread Gluten Friendly?
3. Is My Bread Always Fresh?
4. Does My Bread Contain Oil?
5. What Are The Ingredients in My Sourdough Bread?
6. What is Leaven (Also Referred to as Starter)?
7. How Can I Preserve Sourdough Bread in the Best Possible Way?
8. Can I Store Sourdough Bread In The Refrigerator?

CTA button "Order Bread" → `/shop/olsPage=all` ⚠️ dead GoDaddy store link → new site: Storefront.

## 6. Products (`/all-products`) — 15 items, verbatim in `content/products.json`

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

## 7. Legal pages — verbatim Markdown in `content/pages/`

- **Privacy Policy** — "Last updated: August 21, 2025"; 19 sections (Changes…, How We Collect…, Cookies,
  Your Rights, Contact…). Contact: inna@bakedinweston.com, 24 Farrell Rd, Weston, CT, 06883, United States.
  ⚠️ The Cookies section says the site is "powered … with GoDaddy and our store with Simply Bread" — after
  migration this sentence is no longer accurate (owner's decision; text not changed).
- **Terms and Conditions** — "Terms of service": Overview + Sections 1–20 + "SMS/MMS Mobile Message
  Marketing Program Terms and Conditions" (13 points), followed by a full copy of the Return Policy.
  Contact: inna@bakedinweston.com. The duplicated Return Policy at the end is **dropped** (decision 5).
- **Return Policy** — cancellation/refund rules, "Damages and issues", "Exceptions / non-returnable items",
  "Refunds". Contact: inna@bakedinweston.com.

Headings: GoDaddy shows sub-headings as bold paragraphs; in Markdown they are real `##`/`###` headings.
Text is unchanged (checked word-by-word against the source).

## 8. Images — list in `content/images.json`, download with `npm run images`

All images live under `https://img1.wsimg.com/isteam/ip/32e560b8-239c-4e88-bfc4-1cf69e9d7d19/`.
Original quality = URL with the `/:/…` transform suffix removed.

**20 photos with known original URLs** (logo, hero, Difference, 4 About photos, 3 + 2 gallery slides,
products). `npm run images` saves them to `content/images/original/`; files already there are skipped,
so photos can also be put there by hand under the same name.

**28 gallery slides (#4–#31) have no URL** — the saved page loads them only when the carousel scrolls.
Their alt texts are known for #4–#10 (scones, oat loaf, rye with coriander, chocolate bread…);
#11–#31 have no alt on GoDaddy. They need to be supplied as files.

Other image issues:
- logo `cff40c3e-….jpeg` (also favicon) has empty alt ⚠️
- gallery slides #32–#33 have the image URL as their alt text ⚠️ (GoDaddy bug)
- Walnut Cranberry and Whole Wheat use the wrong photos ⚠️ (correct ones exist — decision 3)

⏳ **Not downloaded yet**: `img1.wsimg.com` is blocked in the build environment.

## 9. Contacts

| | Value | Source |
|---|---|---|
| Address | 24 Farrell Road, Weston, Connecticut 06883, United States (legal pages: 24 Farrell Rd, Weston, CT, 06883) | home, privacy |
| Phone | 1.914.523.9904 (`tel:19145239904`; About button uses `tel:914-523-9904`) | home |
| WhatsApp | https://wa.me/19145239904 | home |
| Email shown on home | sales@bakedinweston.com | home |
| Email in legal texts / form recipient | inna@bakedinweston.com | legal pages, decision 1 |
| Hours | By Appointment — "Please make an appointment before you visit. Open 7 days a week." | home |
| Facebook | https://www.facebook.com/428263420363860 | home |
| Instagram | https://www.instagram.com/bakedinweston | home |

## 10. Decisions (2026-10-19)

| # | Question | Decision |
|---|---|---|
| 1 | Contact form recipient | **inna@bakedinweston.com** |
| 2 | Ingredient lists ending with "leaven," | keep verbatim |
| 3 | Wrong photos for Walnut Cranberry and Whole Wheat | correct photos exist — ⏳ waiting for the files |
| 4 | FAQ "Order Bread" button | → Storefront |
| 5 | Return Policy duplicated inside Terms | removed from Terms; stays on `/return-policy` |
| 6 | GA4 `G-BF2FDR6KMM` | keep (owner has access); cookie banner with Accept/Decline, GA loads only after Accept |
| 7 | Privacy Policy mentions GoDaddy | keep text as is for now |
| 8 | Missing gallery photos | owner/agency will insert the files if they can't be downloaded |
| 9 | Photos | 5 photos supplied by the owner (hero, Difference, Why Sourdough, My Story, Chocolate) |
| 10 | Logo | supplied by the owner (round badge) — header, footer, favicon |
| 11 | Design of home v1 | approved ("everything else OK") |

## 11. Original questions / issues found

1. Form recipient: **sales@** (brief) or **inna@** (used in all legal texts)? Legal texts keep inna@ unless told otherwise.
2. Ingredient lists ending with "leaven," (items 2, 3, 8, 9, 15) — were they cut off on GoDaddy? Keep as is or end with "leaven."?
3. Walnut Cranberry has the Cinnamon Raisin photo, Whole Wheat has a generic one — is there a correct photo?
4. Terms page duplicates the full Return Policy — keep the duplicate or link to `/return-policy`?
5. GA4 `G-BF2FDR6KMM` — is this the owner's own GA property (do we have access)? If we keep analytics, the
   cookie banner with Accept/Decline is needed; if not, no banner.
6. Privacy Policy mentions GoDaddy in "Cookies" — update the wording after migration?
7. `/terms-and-conditions` has the generic title "Baked in Weston" — give it "Terms and Conditions - Baked in Weston"?
