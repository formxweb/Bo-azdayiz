interface NavOpts {
  reduced: boolean;
  scrollTo: (target: HTMLElement) => void;
  lock: (locked: boolean) => void;
  /** scroll position where the hero (and its own call to action) has left the screen */
  heroEnd: () => number;
}

const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;

/**
 * Header and small-screen navigation.
 * The header stays out of the way over the hero, steps aside while reading down,
 * returns on the way up, and gains a surface once content runs beneath it.
 */
export function nav(opts: NavOpts) {
  const root = document.documentElement;
  const header = q('[data-chrome]');
  const panel = q('[data-nav]');
  const toggle = q<HTMLButtonElement>('[data-nav-toggle]');
  const toggleLabel = q('[data-nav-toggle-label]');
  let open = false;
  let lastFocus: HTMLElement | null = null;

  // ── header state on scroll
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const past = y > opts.heroEnd() - window.innerHeight * 0.25;
    header.classList.toggle('is-solid', y > window.innerHeight * 0.6);
    header.classList.toggle('has-cta', past);
    const down = y > lastY + 4;
    const up = y < lastY - 4;
    if (!open && past && down) header.classList.add('is-away');
    else if (up || !past) header.classList.remove('is-away');
    lastY = y;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
  // keyboard users always find the header
  header.addEventListener('focusin', () => header.classList.remove('is-away'));

  // ── small-screen sheet
  const links = () => [...panel.querySelectorAll<HTMLAnchorElement>('a')];
  const setOpen = (next: boolean, then?: () => void) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(next));
    toggleLabel.textContent = next ? 'Gezinmeyi kapat' : 'Gezinmeyi aç';
    root.classList.toggle('nav-open', next);
    if (next) {
      lastFocus = document.activeElement as HTMLElement;
      panel.hidden = false;
      opts.lock(true);
      requestAnimationFrame(() => panel.classList.add('is-in'));
      links()[0]?.focus({ preventScroll: true });
    } else {
      panel.classList.remove('is-in');
      const done = () => {
        panel.hidden = true;
        opts.lock(false);
        if (then) then();
        else lastFocus?.focus({ preventScroll: true });
      };
      if (opts.reduced) done();
      else window.setTimeout(done, 260);
    }
  };
  toggle.addEventListener('click', () => setOpen(!open));
  panel.addEventListener('click', (e) => {
    if (e.target === panel) setOpen(false);
  });

  // ── every in-page link moves the same way, and lands focus on its target
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-dish-reserve])').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      const go = () => {
        opts.scrollTo(target);
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      };
      if (open) setOpen(false, go);
      else go();
    }),
  );

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      const ring = [toggle, ...links()];
      const i = ring.indexOf(document.activeElement as HTMLAnchorElement);
      e.preventDefault();
      const n = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : i === ring.length - 1 ? 0 : i + 1;
      ring[n].focus();
    }
  });

  // closing on resize to desktop keeps the page usable
  matchMedia('(min-width: 901px)').addEventListener('change', (m) => m.matches && open && setOpen(false));
}
