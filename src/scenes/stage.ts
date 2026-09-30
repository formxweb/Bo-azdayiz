import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap } from 'gsap';

/** 21:30. The program is still; only the whirl turns, slowly, a little faster when you scroll. */
export function stageScene(opts: { reduced: boolean; velocity: () => number }) {
  const section = document.querySelector<HTMLElement>('#sahne')!;
  const outer = section.querySelector<SVGGElement>('[data-whirl-outer]')!;
  const inner = section.querySelector<SVGGElement>('[data-whirl-inner]')!;
  const range = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top' });
  if (opts.reduced) return range;

  let spin = 0;
  let visible = false;
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: (st) => (visible = st.isActive) });
  gsap.ticker.add((_t, dt) => {
    if (!visible) return;
    const k = Math.min(dt, 50) / 16.7;
    spin += (0.05 + Math.min(Math.abs(opts.velocity()) * 0.00025, 0.35)) * k;
    const s = range.progress * 120;
    outer.style.transform = `rotate(${(s + spin).toFixed(3)}deg)`;
    inner.style.transform = `rotate(${(-s * 1.3 - spin * 1.6).toFixed(3)}deg)`;
  });
  return range;
}
