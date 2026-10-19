// Photos live in content/images/original/. They are looked up by file name without
// extension, so "unnamed-3.jpg" from content/images.json matches unnamed-3.webp or .jpg.
// A missing photo returns undefined and the page shows a neutral placeholder instead.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../../content/images/original/*.{jpg,jpeg,JPG,JPEG,png,webp,avif}',
  { eager: true },
);

const byStem = new Map<string, ImageMetadata>();
for (const [p, mod] of Object.entries(files)) {
  const stem = p.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  byStem.set(stem, mod.default);
}

export function photo(file: string | null | undefined): ImageMetadata | undefined {
  if (!file) return undefined;
  const stem = file.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase();
  return byStem.get(stem) ?? byStem.get(stem.replace(/[^\w.-]+/g, '-'));
}
