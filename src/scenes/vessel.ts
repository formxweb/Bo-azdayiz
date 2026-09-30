import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** The vessel: she slides into frame, holds, and the camera walks into a lit window. */
export function vesselScene(opts: { aerial: boolean; reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#iskele')!;
  const caption = section.querySelector<HTMLElement>('[data-vessel-caption]')!;
  const welcome = section.querySelector<HTMLElement>('[data-welcome]')!;

  if (opts.reduced) {
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.fromTo(caption.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.18, ease: 'power3.out' }, 0.04)
    // hold: the vessel, still
    .to(caption, { opacity: 0, y: () => -innerHeight * 0.06, duration: 0.14, ease: 'power2.in' }, 0.5)
    .fromTo(welcome, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.1, ease: 'power2.out' }, 0.88);

  return ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${innerHeight * (opts.aerial ? 1.8 : 2.0)}`,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
  });
}
