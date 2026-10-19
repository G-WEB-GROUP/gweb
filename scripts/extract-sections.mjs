// Convert a GoDaddy content block (by data-aid) from a saved page into Markdown.
// Usage: node scripts/extract-sections.mjs <file.html> <DATA_AID> [<DATA_AID> ...]
import { load } from 'cheerio';
import TurndownService from 'turndown';
import { readFileSync } from 'node:fs';

const [file, ...aids] = process.argv.slice(2);
const $ = load(readFileSync(file, 'utf8'));
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
for (const aid of aids) {
  const el = $(`[data-aid="${aid}"]`).first();
  if (!el.length) { console.error('not found', aid); continue; }
  const tag = el.get(0).tagName;
  console.log(`<!-- ${aid} (${tag}) -->`);
  console.log(td.turndown($.html(el)).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').trim(), '\n');
}
