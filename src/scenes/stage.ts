import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Splits a word into spans, keeping the accessible name on the heading. */
const split = (el: HTMLElement) => {
  const text = el.textContent ?? '';
  el.textContent = '';
  return [...text].map((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c;
    s.setAttribute('aria-hidden', 'true');
    el.appendChild(s);
    return s;
  });
};

/**
 * 21:30. Five acts, five kinds of motion:
 * a plucked string, a swaying width, a whirl, a beat in steps, light cut into bands.
 */
export function stageScene(opts: { reduced: boolean; velocity: () => number }) {
  const section = document.querySelector<HTMLElement>('#sahne')!;
  const trigger = ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom' });
  if (opts.reduced) return trigger;

  const inView = new Set<string>();
  const watch = (el: HTMLElement, key: string) =>
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (st) => (st.isActive ? inView.add(key) : inView.delete(key)),
    });

  // ── canlı müzik: the heading sits on a string that the scroll plucks
  const music = section.querySelector<HTMLElement>('[data-act="muzik"]')!;
  const stringPath = music.querySelector<SVGPathElement>('[data-string]')!;
  const stringSvg = music.querySelector<SVGSVGElement>('.string')!;
  const chars = split(music.querySelector<HTMLElement>('[data-string-word]')!);
  watch(music, 'muzik');
  let pluck = 0;
  let phase = 0;

  // ── oryantal: every letter breathes on the width axis, out of phase
  const oryantal = section.querySelector<HTMLElement>('[data-act="oryantal"]')!;
  const swayChars = split(oryantal.querySelector<HTMLElement>('[data-sway]')!);
  const swayST = watch(oryantal, 'oryantal');

  // ── semazen: rotation is scroll, plus a slow turn that never stops
  const sema = section.querySelector<HTMLElement>('[data-act="semazen"]')!;
  const outer = sema.querySelector<SVGGElement>('[data-whirl-outer]')!;
  const inner = sema.querySelector<SVGGElement>('[data-whirl-inner]')!;
  const semaST = watch(sema, 'semazen');
  let spin = 0;

  // ── darbuka: düm, tek — the scroll becomes a step sequencer
  const darbuka = section.querySelector<HTMLElement>('[data-act="darbuka"]')!;
  const beats = [...darbuka.querySelectorAll<HTMLElement>('.beat')];
  let lastBeat = -1;
  ScrollTrigger.create({
    trigger: darbuka,
    start: 'top 70%',
    end: 'bottom 30%',
    onUpdate: (st) => {
      const i = Math.floor(st.progress * beats.length * 2) % beats.length;
      if (i === lastBeat) return;
      lastBeat = i;
      beats.forEach((b, k) => b.classList.toggle('is-hit', k === i && !b.classList.contains('beat--rest')));
      const b = beats[i];
      if (!b.classList.contains('beat--rest')) {
        gsap.fromTo(b, { y: b.classList.contains('beat--dum') ? 18 : 8 }, { y: 0, duration: 0.35, ease: 'elastic.out(1.2, 0.4)', overwrite: true });
      }
    },
    onLeave: () => beats.forEach((b) => b.classList.remove('is-hit')),
    onLeaveBack: () => beats.forEach((b) => b.classList.remove('is-hit')),
  });

  // ── dj: bands of light slide with the speed of the scroll
  const dj = section.querySelector<HTMLElement>('[data-act="dj"]')!;
  const djTitle = dj.querySelector<HTMLElement>('[data-dj]')!;
  const djText = djTitle.textContent ?? '';
  const echoes = Array.from({ length: 5 }, () => {
    const e = document.createElement('span');
    e.className = 'echo';
    e.setAttribute('aria-hidden', 'true');
    e.textContent = djText;
    djTitle.appendChild(e);
    return e;
  });
  watch(dj, 'dj');
  let drag = 0;
  let beat = 0;

  gsap.ticker.add((_time, dt) => {
    if (!inView.size) return;
    const v = opts.velocity();
    const k = Math.min(dt, 50) / 16.7;

    if (inView.has('muzik')) {
      pluck += (Math.min(Math.abs(v) * 0.05, 60) - pluck) * 0.08 * k;
      phase += 0.42 * k;
      const amp = (pluck + 2.5) * Math.sin(phase);
      stringPath.setAttribute('d', `M0 100 Q500 ${100 + amp * 2} 1000 100`);
      const box = stringSvg.getBoundingClientRect();
      const unit = box.height / 200;
      chars.forEach((c) => {
        const r = c.offsetLeft + c.offsetWidth / 2;
        const f = Math.min(1, Math.max(0, r / box.width));
        c.style.transform = `translateY(${(amp * unit * 4 * f * (1 - f)).toFixed(2)}px)`;
      });
    }

    if (inView.has('oryantal')) {
      const p = swayST.progress * Math.PI * 4 + performance.now() / 900;
      swayChars.forEach((c, i) => {
        const w = 92 + 40 * Math.sin(p + i * 0.75);
        c.style.fontStretch = `${w.toFixed(1)}%`;
        c.style.transform = `translateY(${(Math.sin(p * 1.3 + i * 0.9) * 0.05).toFixed(3)}em) skewX(${(Math.sin(p + i) * 4).toFixed(2)}deg)`;
      });
    }

    if (inView.has('semazen')) {
      spin += (0.12 + Math.abs(v) * 0.0009) * k;
      const s = semaST.progress * 540;
      outer.style.transform = `rotate(${(s + spin).toFixed(2)}deg)`;
      inner.style.transform = `rotate(${(-s * 1.4 - spin * 1.8).toFixed(2)}deg)`;
    }

    if (inView.has('dj')) {
      // echoes trail the scroll, and pulse on a slow four-count when it is still
      drag += (Math.max(-900, Math.min(900, v)) * 0.05 - drag) * 0.12 * k;
      beat += 0.035 * k;
      const pulse = Math.pow(Math.max(0, Math.sin(beat * Math.PI)), 8) * 10;
      echoes.forEach((e, i) => {
        const n = i + 1;
        e.style.transform = `translate3d(${(n * (pulse * 0.6 + Math.abs(drag) * 0.35)).toFixed(1)}px, ${(n * drag).toFixed(1)}px, 0)`;
        e.style.opacity = String(Math.min(1, (pulse / 10) * 0.8 + Math.abs(drag) / 30) * (1 - i * 0.16));
      });
    }
  });

  return trigger;
}
