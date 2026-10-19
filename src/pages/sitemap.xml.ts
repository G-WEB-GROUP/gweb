import type { APIRoute } from 'astro';

// Same URLs as on the GoDaddy site.
const PAGES = ['/', '/all-products', '/faq', '/privacy-policy', '/terms-and-conditions', '/return-policy'];

export const GET: APIRoute = ({ site }) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(
    (p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${today}</lastmod></url>`,
  ).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
