/**
 * The Tosun Paşa evening menu, exactly as listed on bogazdayiz.com/menu.
 * The menu is a fixed set: dishes carry no individual prices, so every detail
 * view shows the set price. No ingredient or allergen facts are invented:
 * `ingredients` holds only what the menu itself states, and allergens are not
 * published, so the dialog says so and points guests to the team.
 */
export type CourseId = 'meze' | 'ara' | 'ana' | 'tatli' | 'icecek';
export type Vessel = 'plate' | 'bowl' | 'oval' | 'glass';

export interface Dish {
  id: string;
  course: CourseId;
  name: string;
  /** description as published; omitted when the menu gives none */
  description?: string;
  /** only components the menu itself lists */
  ingredients?: string[];
  vessel: Vessel;
  /** value used by the reservation form, for mains */
  choice?: string;
}

export const courses: Record<CourseId, { no: string; title: string }> = {
  meze: { no: 'I', title: 'Başlangıç ve mezeler' },
  ara: { no: 'II', title: 'Ara sıcak' },
  ana: { no: 'III', title: 'Ana yemek · birini seçin' },
  tatli: { no: 'IV', title: 'Tatlı' },
  icecek: { no: '—', title: 'İçecek' },
};

export const price = {
  label: 'Alkolsüz menü',
  amount: '1.750 TL + KDV',
  includes: 'Sınırsız meşrubat dahil',
  note: 'bogazdayiz.com’da listelenen fiyattır; güncel fiyatı rezervasyonda teyit edin.',
};

export const allergenNote = 'Alerjen bilgisi menüde yayımlanmamıştır. Alerjiniz ya da diyet tercihiniz varsa rezervasyon sırasında ekibe iletin.';

export const dishes: Dish[] = [
  { id: 'haydari', course: 'meze', name: 'Peynirli haydari', vessel: 'bowl' },
  { id: 'kisir', course: 'meze', name: 'Nar ekşili cevizli kısır', vessel: 'plate' },
  { id: 'fava', course: 'meze', name: 'Bakla fava', vessel: 'oval' },
  { id: 'borulce', course: 'meze', name: 'Börülce salatası', vessel: 'plate' },
  { id: 'tarator', course: 'meze', name: 'Dereotlu havuç tarator', vessel: 'bowl' },
  { id: 'enginar', course: 'meze', name: 'Enginar yatağında taze fasulye', vessel: 'plate' },
  { id: 'peynir', course: 'meze', name: 'Ezine beyaz peynir', vessel: 'oval' },
  { id: 'domates', course: 'meze', name: 'Domates söğüş', vessel: 'plate' },
  { id: 'salatalik', course: 'meze', name: 'Salatalık söğüş', vessel: 'plate' },
  { id: 'patates', course: 'meze', name: 'Hardal soslu patates salatası', vessel: 'bowl' },
  { id: 'deniz', course: 'meze', name: 'Deniz mahsulleri salatası', vessel: 'plate' },
  { id: 'kalamar', course: 'ara', name: 'Kalamar', description: 'Dip sosla.', ingredients: ['kalamar', 'dip sos'], vessel: 'plate' },
  { id: 'borek', course: 'ara', name: 'Üç peynirli sebzeli Çin böreği', vessel: 'oval' },
  {
    id: 'izgara',
    course: 'ana',
    name: 'Karışık Izgara Tabağı',
    ingredients: ['180 gr tavuk pirzola', '120 gr kasap köfte', 'patates püresi', 'ızgara domates ve biber', 'sebzeli meyhane pilavı'],
    vessel: 'plate',
    choice: 'Karışık Izgara Tabağı',
  },
  {
    id: 'balik',
    course: 'ana',
    name: 'Izgara Balık',
    description: 'Mevsimine göre levrek, çupra ya da somon.',
    ingredients: ['levrek, çupra ya da somon (mevsimine göre)', 'roka', 'limon', 'soğan', 'dip sos', 'soğan halkaları'],
    vessel: 'oval',
    choice: 'Izgara Balık',
  },
  { id: 'baklava', course: 'tatli', name: 'Baklava', description: 'Tatlıda baklava ya da mevsim meyveleri.', vessel: 'plate' },
  { id: 'meyve', course: 'tatli', name: 'Mevsim meyveleri', description: 'Tatlıda baklava ya da mevsim meyveleri.', vessel: 'plate' },
  { id: 'mesrubat', course: 'icecek', name: 'Sınırsız meşrubat', description: 'Alkolsüz menüye dahil.', vessel: 'glass' },
];

export const dishById = (id: string) => dishes.find((d) => d.id === id);
