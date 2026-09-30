/**
 * Photograph slots. The site is complete without them: every scene is built
 * from type, light and the rendered strait. When the brand's own photographs
 * are dropped into /media-source and `npm run media` is run, they appear here,
 * art-directed into the scenes. Nothing is ever filled with stock or generated imagery.
 *
 * Dish photographs use the slot name `menu-<dish id>` (ids in src/content/menu.ts):
 * they fill the plate on the menu and the image side of the dish dialog.
 */
export interface Slot {
  /** element the photograph is layered into */
  anchor: string;
  /** sizes attribute for responsive selection */
  sizes: string;
  /** default alt text; media-source/alt.json overrides it per photograph */
  alt: string;
}

export const slots: Record<string, Slot> = {
  gemi: { anchor: '#iskele .vessel__frame', sizes: '(max-aspect-ratio: 4/5) 60vw, 22vw', alt: 'Tosun Paşa, Kabataş İskelesi’nde gece' },
  semazen: { anchor: '.whirl', sizes: '(max-aspect-ratio: 4/5) 40vw, 20vw', alt: 'Tosun Paşa’da semazen gösterisi' },
  bogaz: { anchor: '#donus', sizes: '(max-aspect-ratio: 4/5) 70vw, 24vw', alt: 'Tosun Paşa güvertesinden gece Boğaz' },
};

export const dishSizes = '(max-width: 820px) 100vw, 50vw';

export interface ManifestEntry {
  w: number;
  h: number;
  alt?: string;
  avif: string;
  webp: string;
  fallback: string;
}
