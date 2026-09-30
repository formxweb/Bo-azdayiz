import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * 21:00. A long table, read sideways on landscape screens, downwards on portrait.
 * It ends when the lights are dimmed: the linen closes into a spotlight.
 */
export function sofraScene(opts: { aerial: boolean; reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#sofra')!;
  const cloth = section.querySelector<HTMLElement>('[data-cloth]')!;
  const track = section.querySelector<HTMLElement>('[data-track]')!;
  const closeup = section.querySelector<HTMLElement>('.closeup')!;
  const plates = section.querySelectorAll<HTMLElement>('.plate');
  const dim = section.querySelector<HTMLElement>('.course--dim')!;
  const dimLine = dim.querySelector<HTMLElement>('.dimline')!;
  section.style.background = 'var(--ink)';

  // a table lamp that leans toward the pointer
  if (!opts.reduced && matchMedia('(pointer: fine)').matches) {
    const lamp = { x: 50, y: 40 };
    const apply = () => {
      cloth.style.setProperty('--lamp-x', `${lamp.x.toFixed(2)}%`);
      cloth.style.setProperty('--lamp-y', `${lamp.y.toFixed(2)}%`);
    };
    const lx = gsap.quickTo(lamp, 'x', { duration: 1.6, ease: 'power3', onUpdate: apply });
    const ly = gsap.quickTo(lamp, 'y', { duration: 1.6, ease: 'power3', onUpdate: apply });
    cloth.addEventListener('pointermove', (e) => {
      const r = cloth.getBoundingClientRect();
      lx(((e.clientX - r.left) / r.width) * 100);
      ly(((e.clientY - r.top) / r.height) * 100);
    });
  }

  if (opts.reduced) {
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  /** spotlight centre, relative to the cloth box */
  const spot = () => {
    const c = cloth.getBoundingClientRect();
    const d = dimLine.getBoundingClientRect();
    return { x: d.left - c.left + d.width * 0.3, y: d.top - c.top + d.height * 0.5 };
  };

  if (opts.aerial) {
    ScrollTrigger.create({
      trigger: dim,
      start: 'top top',
      end: () => `+=${window.innerHeight * 0.9}`,
      pin: dim,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        if (st.progress <= 0) {
          cloth.style.clipPath = 'none';
          return;
        }
        const p = spot();
        const r = gsap.utils.interpolate(160, 0, gsap.parseEase('power2.in')(st.progress));
        cloth.style.clipPath = `circle(${r}vmax at ${p.x}px ${p.y}px)`;
      },
      onLeaveBack: () => (cloth.style.clipPath = 'none'),
    });
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  const distance = () => track.scrollWidth - window.innerWidth;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to(track, { x: () => -distance(), duration: 1 }, 0)
    // close-up words drift against the table: depth without a single image
    .fromTo(closeup, { xPercent: 8 }, { xPercent: -14, duration: 0.45 }, 0.2)
    .fromTo(plates, { rotate: -4 }, { rotate: 3, duration: 0.5, stagger: 0.01 }, 0)
    .to({}, { duration: 0.08 })
    .to(
      { r: 150 },
      {
        r: 0,
        duration: 0.34,
        ease: 'power2.in',
        onUpdate() {
          const r = (this.targets()[0] as { r: number }).r;
          if (r >= 149) {
            cloth.style.clipPath = 'none';
            return;
          }
          const p = spot();
          cloth.style.clipPath = `circle(${r}vmax at ${p.x}px ${p.y}px)`;
        },
      },
    );

  return ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${distance() + window.innerHeight * 0.9}`,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
    onLeaveBack: () => (cloth.style.clipPath = 'none'),
  });
}
