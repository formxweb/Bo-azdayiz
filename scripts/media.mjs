/**
 * Turns the brand's own photographs into responsive AVIF/WebP sets.
 *
 *   media-source/<slot>.jpg|jpeg|png|webp   (slot names: see src/content/media.ts)
 *   media-source/alt.json                   optional { "<slot>": "alt text" }
 *
 * Output: public/media/<slot>-<w>.avif|webp + public/media/manifest.json
 * Only real photographs belong here — never stock or generated images.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'media-source');
const out = path.join(root, 'public/media');
const WIDTHS = [480, 800, 1200, 1800, 2400];
const SLOTS = new Set(['gemi', 'semazen', 'bogaz']);
const DISHES = new Set(['haydari', 'kisir', 'fava', 'borulce', 'tarator', 'enginar', 'peynir', 'domates', 'salatalik', 'patates', 'deniz', 'kalamar', 'borek', 'izgara', 'balik', 'baklava', 'meyve', 'mesrubat']);
const known = (slot) => SLOTS.has(slot) || (slot.startsWith('menu-') && DISHES.has(slot.slice(5)));

await mkdir(out, { recursive: true });
const alts = existsSync(path.join(src, 'alt.json')) ? JSON.parse(await readFile(path.join(src, 'alt.json'), 'utf8')) : {};
const files = existsSync(src) ? await readdir(src) : [];
const slots = {};

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const slot = path.basename(file, ext);
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
  if (!known(slot)) {
    console.warn(`skip ${file}: unknown slot "${slot}"`);
    continue;
  }
  const input = sharp(path.join(src, file)).rotate();
  const meta = await input.metadata();
  const widths = WIDTHS.filter((w) => w <= (meta.width ?? 0));
  if (!widths.length) widths.push(meta.width);
  const avif = [];
  const webp = [];
  for (const w of widths) {
    const base = `${slot}-${w}`;
    const resized = input.clone().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(out, `${base}.avif`));
    await resized.clone().webp({ quality: 74 }).toFile(path.join(out, `${base}.webp`));
    avif.push(`/media/${base}.avif ${w}w`);
    webp.push(`/media/${base}.webp ${w}w`);
  }
  const mid = widths[Math.min(1, widths.length - 1)];
  slots[slot] = {
    w: meta.width,
    h: meta.height,
    ...(alts[slot] ? { alt: alts[slot] } : {}),
    avif: avif.join(', '),
    webp: webp.join(', '),
    fallback: `/media/${slot}-${mid}.webp`,
  };
  console.log(`${slot}: ${widths.join(', ')}`);
}

await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ slots }, null, 2));
console.log(`manifest: ${Object.keys(slots).length} photograph(s)`);
