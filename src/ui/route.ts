import { gsap } from 'gsap';

interface RouteOpts {
  reduced: boolean;
  scrollTo: (target: HTMLElement) => void;
  lock: (locked: boolean) => void;
  minutes: () => number;
}

/**
 * The navigation is the tide: water rises over the page and the night's
 * stations surface on it. Esc, the toggle, or any station drains it.
 */
export function route(opts: RouteOpts) {
  const panel = document.querySelector<HTMLElement>('[data-route]')!;
  const toggle = document.querySelector<HTMLButtonElement>('[data-route-toggle]')!;
  const tide = panel.querySelector<SVGPathElement>('[data-tide]')!;
  const links = [...panel.querySelectorAll<HTMLAnchorElement>('a')];
  const stations = [...panel.querySelectorAll<HTMLAnchorElement>('.route__list a')];
  let open = false;
  let lastFocus: HTMLElement | null = null;

  const wave = { level: 100, amp: 0 };
  const draw = () => {
    const l = wave.level;
    const a = wave.amp;
    tide.setAttribute(
      'd',
      `M0 100 L0 ${l + a * 0.6} C 18 ${l - a}, 32 ${l + a}, 50 ${l} S 82 ${l - a * 1.2}, 100 ${l + a * 0.3} L100 100 Z`,
    );
  };

  const markCurrent = () => {
    const m = opts.minutes();
    let current = stations[0];
    for (const a of stations) {
      const t = a.querySelector('time')?.textContent ?? '';
      const [h, mm] = t.split(':').map(Number);
      if (!Number.isNaN(h) && h * 60 + mm <= m + 0.5) current = a;
    }
    stations.forEach((a) => a.setAttribute('aria-current', String(a === current)));
  };

  const setOpen = (next: boolean, then?: () => void) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(next));
    document.documentElement.classList.toggle('route-open', next);
    gsap.killTweensOf(wave);
    if (next) {
      lastFocus = document.activeElement as HTMLElement;
      markCurrent();
      panel.hidden = false;
      opts.lock(true);
      if (opts.reduced) {
        wave.level = -5;
        draw();
        panel.classList.add('is-in');
      } else {
        gsap.timeline()
          .to(wave, { level: -12, duration: 0.95, ease: 'power3.inOut', onUpdate: draw })
          .to(wave, { amp: 9, duration: 0.45, ease: 'sine.out', onUpdate: draw }, 0)
          .to(wave, { amp: 0, duration: 0.5, ease: 'sine.in', onUpdate: draw }, 0.45)
          .add(() => panel.classList.add('is-in'), 0.35);
      }
      (panel.querySelector('.route__list a') as HTMLElement | null)?.focus({ preventScroll: true });
    } else {
      panel.classList.remove('is-in');
      const done = () => {
        panel.hidden = true;
        opts.lock(false);
        then?.();
        if (!then) lastFocus?.focus({ preventScroll: true });
      };
      if (opts.reduced) {
        done();
      } else {
        gsap.timeline({ onComplete: done })
          .to(wave, { level: 100, duration: 0.8, ease: 'power3.inOut', onUpdate: draw })
          .to(wave, { amp: -7, duration: 0.4, ease: 'sine.out', onUpdate: draw }, 0)
          .to(wave, { amp: 0, duration: 0.4, ease: 'sine.in', onUpdate: draw }, 0.4);
      }
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#')) return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      setOpen(false, () => {
        opts.scrollTo(target);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    }),
  );

  // in-page links outside the panel use the same camera move
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-route] a)').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      opts.scrollTo(target);
    }),
  );

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const ring = [toggle, ...links];
      const i = ring.indexOf(document.activeElement as HTMLAnchorElement);
      const next = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : i === ring.length - 1 ? 0 : i + 1;
      e.preventDefault();
      ring[next].focus();
    }
  });
}
