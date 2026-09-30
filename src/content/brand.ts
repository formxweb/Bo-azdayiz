/**
 * Single source of truth for brand facts used by scripts.
 * Everything here was cross-checked against bogazdayiz.com (via search index),
 * the @bogazdayizcom Instagram profile and ticketing listings for
 * "Bu Gece Boğazdayız". See README → "İçerik kaynakları" before changing values.
 * The static HTML in index.html carries the same facts for SEO / no-JS.
 */
export const brand = {
  name: 'Boğazdayız',
  line: 'Bu gece Boğazdayız.',
  vessel: 'Tosun Paşa',
  pier: 'Kabataş Vapur İskelesi',
  address: 'Ömer Avni Mah., Meclis-i Mebusan Cd., Kabataş Vapur İskelesi, 34427 Beyoğlu / İstanbul',
  phoneDisplay: '+90 540 002 53 34',
  phoneE164: '+905400025334',
  whatsapp: 'https://wa.me/905400025334',
  email: 'rezervasyon@bogazdayiz.com',
  instagram: 'https://www.instagram.com/bogazdayizcom/',
  reservationUrl: 'https://bogazdayiz.com/reservation/',
} as const;

/** The real evening, in minutes after midnight. */
export const schedule = {
  boarding: 19 * 60 + 30,
  departure: 20 * 60 + 30,
  dinner: 21 * 60,
  stage: 21 * 60 + 30,
  return: 23 * 60 + 30,
} as const;

export const mains = [
  { id: 'izgara', label: 'Karışık Izgara Tabağı' },
  { id: 'balik', label: 'Izgara Balık' },
] as const;

export const fmtTime = (m: number): string => {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
