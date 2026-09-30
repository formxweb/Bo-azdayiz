import { slots, type ManifestEntry } from '../content/media';

/**
 * Layers the brand's real photographs into their scenes, if any exist.
 * `?media=preview` shows empty, labelled frames so the team can see placement.
 */
export async function mountMedia(): Promise<boolean> {
  const preview = new URLSearchParams(location.search).get('media') === 'preview';
  let manifest: Record<string, ManifestEntry> = {};
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
      fig.innerHTML = `<picture>
        <source type="image/avif" srcset="${entry.avif}" sizes="${slot.sizes}">
        <source type="image/webp" srcset="${entry.webp}" sizes="${slot.sizes}">
        <img src="${entry.fallback}" width="${entry.w}" height="${entry.h}" loading="lazy" decoding="async" alt="">
      </picture>`;
      fig.querySelector('img')!.alt = entry.alt ?? slot.alt;
    } else {
      fig.classList.add('shot--preview');
      fig.setAttribute('aria-hidden', 'true');
      fig.innerHTML = `<figcaption class="meta">${key}</figcaption>`;
    }
    anchor.appendChild(fig);
    mounted = true;
  }
  document.documentElement.classList.toggle('has-photos', mounted);
  return mounted;
}
