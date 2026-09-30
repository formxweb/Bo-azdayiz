/**
 * One reveal for the whole site: a short rise out of nothing, once.
 * Groups ([data-plates]) reveal their children in sequence via CSS delays.
 */
export function reveals(reduced: boolean) {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-plates]');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  // siblings revealed together get a gentle stagger
  document.querySelectorAll<HTMLElement>('.acts [data-reveal]').forEach((el, i) => el.style.setProperty('--i', String(i % 5)));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  targets.forEach((el) => io.observe(el));
}

/** The small-screen booking dock: present between the hero and the reservation. */
export function dock() {
  const el = document.querySelector<HTMLElement>('[data-dock]');
  const hero = document.querySelector('#aksam');
  const reserve = document.querySelector('#bu-gece');
  const foot = document.querySelector('.colophon');
  if (!el || !hero || !reserve || !foot || !('IntersectionObserver' in window)) return;
  const link = el.querySelector<HTMLElement>('a');
  const seen = new Map<Element, boolean>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target, e.isIntersecting);
    const on = !seen.get(hero) && !seen.get(reserve) && !seen.get(foot);
    el.classList.toggle('is-on', on);
    link?.setAttribute('tabindex', on ? '0' : '-1');
  });
  [hero, reserve, foot].forEach((t) => io.observe(t));
}
