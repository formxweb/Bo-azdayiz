import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The night in five moments. A line fills as you read down it, each stop lights
 * when you reach it, and the large time turns over like a departure board.
 */
export function timelineScene(opts: { reduced: boolean }) {
  const section = document.querySelector<HTMLElement>('#akis')!;
  const list = section.querySelector<HTMLElement>('[data-stops]')!;
  const stops = [...list.querySelectorAll<HTMLElement>('.stop')];
  const clock = section.querySelector<HTMLElement>('.akis__clock')!;
  let digits = section.querySelector<HTMLElement>('[data-akis-time]')!;

  const range = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top' });

  if (opts.reduced) {
    stops.forEach((s) => s.classList.add('is-on'));
    return range;
  }

  const fill = document.createElement('span');
  fill.className = 'stops__fill';
  fill.setAttribute('aria-hidden', 'true');
  list.prepend(fill);

  ScrollTrigger.create({
    trigger: list,
    start: 'top 62%',
    end: 'bottom 62%',
    onUpdate: (st) => fill.style.setProperty('--p', st.progress.toFixed(4)),
  });

  let shown = digits.textContent ?? '';
  const turnTo = (time: string, dir: number) => {
    if (time === shown) return;
    shown = time;
    const next = digits.cloneNode() as HTMLElement;
    next.textContent = time;
    clock.appendChild(next);
    const prev = digits;
    digits = next;
    gsap.fromTo(next, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.9, ease: 'expo.out' });
    gsap.to(prev, { yPercent: -100 * dir, duration: 0.9, ease: 'expo.out', onComplete: () => prev.remove() });
  };

  stops.forEach((stop, i) => {
    ScrollTrigger.create({
      trigger: stop,
      start: 'top 62%',
      onEnter: () => {
        stop.classList.add('is-on');
        turnTo(stop.dataset.time!, 1);
      },
      onLeaveBack: () => {
        stop.classList.remove('is-on');
        const back = stops[i - 1];
        if (back) turnTo(back.dataset.time!, -1);
      },
    });
  });

  return range;
}
