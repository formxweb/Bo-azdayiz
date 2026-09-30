import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** 21:30. The programme is still; the whirl turns only as you read past it. */
export function stageScene(opts: { reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#sahne')!;
  const outer = section.querySelector<SVGGElement>('[data-whirl-outer]')!;
  const inner = section.querySelector<SVGGElement>('[data-whirl-inner]')!;
  return ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: opts.reduced
      ? undefined
      : (st) => {
          const s = st.progress * 160;
          outer.style.transform = `rotate(${s.toFixed(2)}deg)`;
          inner.style.transform = `rotate(${(-s * 1.4).toFixed(2)}deg)`;
        },
  });
}
