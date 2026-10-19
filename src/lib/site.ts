// Site-wide data. Page texts live in /content (JSON / Markdown); edit them there.
import home from '../../content/home.json';
import seo from '../../content/seo.json';

export const SITE = {
  name: 'Baked in Weston',
  url: 'https://bakedinweston.com',
  themeColor: '#ed6a29',
  googleSiteVerification: 'bRz9ujVaVlrNNjrMt3HXZ5Q4lJN0pYNC_gyUgZ6YP2A',
  gaId: 'G-BF2FDR6KMM',
  ogDescription: seo.faq.ogDescription,
};

// Ordering happens on Simply Bread (external). Links open in the same tab:
// ordering is the visitor's goal, and a same-tab link keeps the Back button working on mobile.
export const STOREFRONT = {
  menu: 'https://app.simply-bread.co/bakedinweston',
  signup: home.hero.cta.href ?? 'https://app.simply-bread.co/bakedinweston/signup',
};

export const CONTACT = {
  phoneDisplay: home.contact.phone.text, // 1.914.523.9904
  phoneHref: 'tel:+19145239904',
  phoneE164: '+1-914-523-9904',
  whatsapp: home.contact.whatsapp.href ?? 'https://wa.me/19145239904',
  email: home.contact.email.text, // shown on the site
  address: home.contact.address,
  street: '24 Farrell Road',
  city: 'Weston',
  region: 'CT',
  zip: '06883',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=24+Farrell+Road,+Weston,+CT+06883',
  facebook: home.social.facebook ?? '',
  instagram: home.social.instagram ?? '',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/all-products', label: 'All Products' },
  { href: '/#about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/#contact', label: 'Contact' },
];

export const LEGAL_NAV = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms and Conditions' },
  { href: '/return-policy', label: 'Return Policy' },
];
