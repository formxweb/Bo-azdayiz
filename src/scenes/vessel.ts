import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function vesselScene(opts: { aerial: boolean; reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#iskele')!;
  const times = section.querySelectorAll<HTMLElement>('.board time');
  const rows = section.querySelectorAll<HTMLElement>('.board__row');
  const kicker = section.querySelector('.vessel__kicker');
  const where = section.querySelector('.board__where');
  const welcome = section.querySelector<HTMLElement>('[data-welcome]')!;

  if (opts.reduced) {
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  // numerals surface from their rule, like timetable numbers turning over
  tl.fromTo(times, { yPercent: 105 }, { yPercent: 0, stagger: 0.06, duration: 0.2, ease: 'power3.out' }, 0.02)
    .fromTo([kicker, where], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.1)
    // hold: the board and the vessel, still
    .to([rows, kicker, where], { autoAlpha: 0, y: () => -window.innerHeight * 0.08, duration: 0.14, ease: 'power2.in' }, 0.52)
    .fromTo(welcome, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.1, ease: 'power2.out' }, 0.88);

  return ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${window.innerHeight * (opts.aerial ? 2.4 : 2.9)}`,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
  });
}
