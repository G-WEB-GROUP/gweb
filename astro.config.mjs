import { defineConfig } from 'astro/config';

// Pages are built as /faq.html etc., so the URLs stay exactly as on GoDaddy
// (/faq, /all-products …) without a trailing slash. Nginx serves them with try_files.
export default defineConfig({
  site: 'https://bakedinweston.com',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  image: { responsiveStyles: false },
  compressHTML: true,
});
