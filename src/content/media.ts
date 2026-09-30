/**
 * Photograph slots. The site is complete without them: every scene is built
 * from type, light and the rendered strait. When the brand's own photographs
 * are dropped into /media-source and `npm run media` is run, they appear here,
 * art-directed into the scenes. Nothing is ever filled with stock or generated imagery.
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
  gemi: { anchor: '#iskele .vessel__frame', sizes: '(max-aspect-ratio: 4/5) 60vw, 26vw', alt: 'Tosun Paşa, Kabataş İskelesi’nde gece' },
  meze: { anchor: '.course--meze', sizes: '(max-aspect-ratio: 4/5) 90vw, 34vw', alt: 'Tosun Paşa’da meze sofrası' },
  kalamar: { anchor: '.course--ara', sizes: '(max-aspect-ratio: 4/5) 70vw, 30vw', alt: 'Kalamar, dip sosla' },
  izgara: { anchor: '.dish--izgara', sizes: '(max-aspect-ratio: 4/5) 60vw, 22vw', alt: 'Karışık Izgara Tabağı' },
  balik: { anchor: '.dish--balik', sizes: '(max-aspect-ratio: 4/5) 60vw, 22vw', alt: 'Izgara balık' },
  baklava: { anchor: '.course--tatli', sizes: '(max-aspect-ratio: 4/5) 80vw, 38vw', alt: 'Baklava' },
  muzik: { anchor: '[data-act="muzik"]', sizes: '(max-aspect-ratio: 4/5) 70vw, 28vw', alt: 'Tosun Paşa’da canlı müzik' },
  oryantal: { anchor: '[data-act="oryantal"]', sizes: '(max-aspect-ratio: 4/5) 70vw, 26vw', alt: 'Oryantal gösteri' },
  semazen: { anchor: '[data-act="semazen"] .whirl', sizes: '(max-aspect-ratio: 4/5) 64vw, 34vmin', alt: 'Semazen gösterisi' },
  dj: { anchor: '[data-act="dj"]', sizes: '(max-aspect-ratio: 4/5) 70vw, 30vw', alt: 'DJ performansı' },
  bogaz: { anchor: '#donus', sizes: '(max-aspect-ratio: 4/5) 80vw, 30vw', alt: 'Tosun Paşa güvertesinden gece Boğaz' },
};

export interface ManifestEntry {
  w: number;
  h: number;
  alt?: string;
  avif: string;
  webp: string;
  fallback: string;
}
