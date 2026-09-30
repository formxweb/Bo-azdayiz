import { slots, type ManifestEntry } from '../content/media';

/**
 * Layers the brand's real photographs into their scenes, if any exist.
 * `?media=preview` shows empty, labelled frames so the team can see placement.
 */
let manifest: Record<string, ManifestEntry> = {};

export const picture = (entry: ManifestEntry, sizes: string, alt: string, eager = false) => {
  const pic = document.createElement('picture');
  pic.innerHTML = `<source type="image/avif" srcset="${entry.avif}" sizes="${sizes}">
    <source type="image/webp" srcset="${entry.webp}" sizes="${sizes}">
    <img src="${entry.fallback}" width="${entry.w}" height="${entry.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" alt="">`;
  pic.querySelector('img')!.alt = entry.alt ?? alt;
  return pic;
};

/** real photograph of a dish, if the team has provided one */
export const dishPhoto = (id: string): ManifestEntry | undefined => manifest[`menu-${id}`];

export async function mountMedia(): Promise<boolean> {
  const preview = new URLSearchParams(location.search).get('media') === 'preview';
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}media/manifest.json`, { cache: 'no-cache' });
    if (res.ok) manifest = (await res.json()).slots ?? {};
  } catch {
    /* no photographs yet: the scenes stand on their own */
  }

  let mounted = false;
  for (const [key, slot] of Object.entries(slots)) {
    const anchor = document.querySelector<HTMLElement>(slot.anchor);
    if (!anchor) continue;
    const entry = manifest[key];
    if (!entry && !preview) continue;
    const fig = document.createElement('figure');
    fig.className = `shot shot--${key}`;
    if (entry) {
      fig.style.aspectRatio = `${entry.w} / ${entry.h}`;
      fig.appendChild(picture(entry, slot.sizes, slot.alt));
    } else {
      fig.classList.add('shot--preview');
      fig.setAttribute('aria-hidden', 'true');
      fig.innerHTML = `<figcaption class="meta">${key}</figcaption>`;
    }
    anchor.appendChild(fig);
    mounted = true;
  }

  // dish photographs sit inside their plates on the menu
  document.querySelectorAll<HTMLElement>('.plates .plate[data-dish]').forEach((plate) => {
    const entry = dishPhoto(plate.dataset.dish!);
    if (!entry) return;
    const wrap = document.createElement('span');
    wrap.className = 'shot-in';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(picture(entry, '(max-width: 820px) 45vw, 20vw', ''));
    plate.prepend(wrap);
    plate.classList.add('has-photo');
    mounted = true;
  });

  document.documentElement.classList.toggle('has-photos', mounted);
  return mounted;
}
