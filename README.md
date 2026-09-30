# Boğazdayız — Bu gece Boğazdayız.

A digital flagship for Boğazdayız / Tosun Paşa restoran gemisi, built as one night rather than a page:
**Kabataş 19:30 → Boğaz → Tosun Paşa → Sofra 21:00 → Sahne 21:30 → Dönüş 23:30 → Bu gece?**

## Running

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build to dist/
npm run preview
```

## How it is built

- **One WebGL pass** (`src/gl/water.frag.glsl`) renders the Bosphorus behind every scene. It has two cameras:
  eye level facing north on landscape screens, and an aerial view of the strait on portrait screens.
  The hero words are reflected in the water from a glyph atlas (`src/gl/water.ts`).
- **The director** (`src/director.ts`) maps scroll position to the camera, the clock (19:30 → 23:30) and the
  colour of the night. It uses keyframe tracks, so jumping to any point is exact.
- **Scenes** (`src/scenes/*`):
  - hero: an entrance sequence where the words rise out of the water, plus a minimal CTA;
  - timeline: five stops that light up on scroll, with a rolling clock;
  - vessel: the camera boards Tosun Paşa through a lit window;
  - menu: editorial, set on linen;
  - stage: a still programme with one slow motion;
  - return: 23:30, the shores rejoin;
  - reservation.
- **Menu** (`src/content/menu.ts`) is the single source for the dish dialog (`src/ui/dish.ts`). All 18 items open it.
  The clicked plate flies into the dialog, and ← → / Esc / the back button work.
  The menu is a fixed set, so every dish shows the set price. Ingredients appear only where the menu lists them,
  and allergens are not published, so the dialog says so and links to WhatsApp.
- **Navigation** (`src/ui/route.ts`): a full-screen "tide" that lists the night's stations. On small screens a
  quiet booking dock sits at the bottom (`src/ui/reveal.ts`).
- **Reservation** (`src/ui/reserve.ts`): builds a WhatsApp message for the real reservation line. It is not a
  checkout and shows no fake confirmation. From a main course's dialog, the form is pre-filled with that main.
- Content lives in static, semantic HTML (`index.html`, with JSON-LD `Restaurant` + `Menu`) for SEO and no-JS.
- Fonts: Anybody (variable width) and Newsreader, self-hosted and subset to Latin + Turkish (`scripts/fonts.py`).
- Honours `prefers-reduced-motion`: no pins, no glides, instant dialogs. Keyboard: skip link, focus-visible
  styles, focus-trapped dialogs.

## İçerik kaynakları

bogazdayiz.com and Instagram were not reachable from the build environment (egress policy), so facts were
cross-checked through search-indexed copies of bogazdayiz.com and ticketing listings for "Bu Gece Boğazdayız":

- Tosun Paşa restoran gemisi, Kabataş Vapur İskelesi; Ömer Avni Mah., Meclis-i Mebusan Cd., 34427 Beyoğlu/İstanbul
- Biniş 19:30 · Kalkış 20:30 · Dönüş 23:30, every night. Dinner 21:00 and shows 21:30 (secondary sources)
- +90 540 002 53 34 (phone/WhatsApp) · rezervasyon@bogazdayiz.com · @bogazdayizcom
- Menu (starters, hot starters, mains, desserts) exactly as listed on bogazdayiz.com/menu
- Alkolsüz menü 1.750 TL + KDV (shown with a "may change" note)
- Shows: live music, oriental dance, whirling dervish (semazen), darbuka, DJ. No per-act times are claimed.

Please verify the price and the dinner/show times with the team before launch.

## Photographs

No brand photographs were available, so no stock or generated images are used anywhere.
The scenes are complete without photos. To add the brand's own photographs, put them in `media-source/`
(file names = slots, see `media-source/README.md`) and run `npm run media` (sharp → AVIF/WebP at 480–2400w + manifest).
They are then placed into their scenes with lazy loading and `srcset`. Open the site with `?media=preview`
to see the placements without photos.
