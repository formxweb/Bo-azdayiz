import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { layout } from '../director';

/**
 * 21:00. The menu, set on linen. It ends when the lights are dimmed:
 * the cloth closes into a spotlight and the stage takes over.
 */
export function sofraScene(opts: { reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#sofra')!;
  const cloth = section.querySelector<HTMLElement>('[data-cloth]')!;
  const plates = section.querySelector<HTMLElement>('[data-plates]')!;
  const dim = section.querySelector<HTMLElement>('.course--dim')!;
  const dimLine = dim.querySelector<HTMLElement>('.dimline')!;

  plates.querySelectorAll<HTMLElement>('.plate-slot').forEach((el, i) => el.style.setProperty('--i', String(i)));

  // created after the spotlight pin below, so its end includes that pin's spacing
  const makeRange = () => ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  if (opts.reduced) return makeRange();

  /** spotlight centre, relative to the cloth box */
  const spot = () => {
    const c = cloth.getBoundingClientRect();
    const d = dimLine.getBoundingClientRect();
    return { x: d.left - c.left + d.width * 0.3, y: d.top - c.top + d.height * 0.5 };
  };
  const shrink = gsap.parseEase('power2.in');
  ScrollTrigger.create({
    trigger: dim,
    start: 'top top',
    end: () => `+=${innerHeight * 0.6}`,
    pin: true,
    invalidateOnRefresh: true,
    onUpdate: (st) => {
      layout.clothClosed = st.progress;
      if (st.progress <= 0.001) {
        cloth.style.clipPath = 'none';
        return;
      }
      const p = spot();
      const r = gsap.utils.interpolate(150, 0, shrink(st.progress));
      cloth.style.clipPath = `circle(${r.toFixed(2)}vmax at ${p.x.toFixed(1)}px ${p.y.toFixed(1)}px)`;
    },
    onLeaveBack: () => {
      cloth.style.clipPath = 'none';
      layout.clothClosed = 0;
    },
  });
  return makeRange();
}
