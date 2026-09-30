import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { measureHorizon } from './hero';
import { layout } from '../director';

/** 23:30. The shores that opened at 19:30 close again into one word. */
export function returnScene(opts: { aerial: boolean; reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#donus')!;
  const a = section.querySelector<HTMLElement>('[data-return-a]')!;
  const b = section.querySelector<HTMLElement>('[data-return-b]')!;
  const lines = section.querySelectorAll<HTMLElement>('.donus__line span');
  const stamp = section.querySelector<HTMLElement>('.donus__stamp');

  // joined position: the pair centred on the frame
  const place = () => {
    const wa = a.getBoundingClientRect().width;
    const wb = b.getBoundingClientRect().width;
    const left = (window.innerWidth - wa - wb) / 2;
    gsap.set(a, { left });
    gsap.set(b, { left: left + wa });
  };
  place();
  ScrollTrigger.addEventListener('refreshInit', () => gsap.set([a, b], { x: 0 }));
  ScrollTrigger.addEventListener('refresh', place);

  // the return horizon is wherever these words stand
  const measure = () => {
    if (!opts.aerial) layout.returnHorizon = measureHorizon(section, '[data-return-a]');
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  if (opts.reduced) {
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.fromTo(a, { x: () => -window.innerWidth * 0.75 }, { x: 0, ease: 'power3.out', duration: 0.6 }, 0)
    .fromTo(b, { x: () => window.innerWidth * 0.75 }, { x: 0, ease: 'power3.out', duration: 0.6 }, 0)
    .fromTo(stamp, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.2)
    .fromTo(lines, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.2, ease: 'power2.out' }, 0.62)
    .to({}, { duration: 0.2 });

  return ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${window.innerHeight * 1.0}`,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
  });
}
