import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { layout } from '../director';
import { water } from '../gl/water';

const q = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;

/** Range rects are the text's content box: the same box the atlas is drawn in. */
const textRect = (el: HTMLElement): DOMRect | null => {
  const node = el.firstChild;
  if (!node) return null;
  const r = document.createRange();
  r.selectNodeContents(el);
  const rect = r.getBoundingClientRect();
  return rect.width ? rect : null;
};

export function heroWords() {
  const a = q('[data-word-a]');
  const b = q('[data-word-b]');
  const ra = q('[data-return-a]');
  const rb = q('[data-return-b]');
  return {
    texts: [a.textContent!.toLocaleUpperCase('tr'), b.textContent!.toLocaleUpperCase('tr')] as [string, string],
    /** reflections follow whichever pair is on screen */
    source: () => {
      const inReturn = ra.getBoundingClientRect().bottom > 0 && ra.getBoundingClientRect().top < window.innerHeight;
      return inReturn ? { a: textRect(ra), b: textRect(rb) } : { a: textRect(a), b: textRect(b) };
    },
  };
}

/**
 * The horizon is wherever the words' baseline actually landed. DOM leads, GL follows.
 * Measured on an untransformed clone so scroll state never skews it.
 */
export function measureHorizon(section: HTMLElement, wordSel: string) {
  const word = q(wordSel, section);
  const clone = word.cloneNode(true) as HTMLElement;
  clone.removeAttribute('style');
  for (const attr of [...clone.attributes]) if (attr.name.startsWith('data-')) clone.removeAttribute(attr.name);
  clone.style.visibility = 'hidden';
  clone.setAttribute('aria-hidden', 'true');
  const probe = document.createElement('i');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  clone.appendChild(probe);
  word.parentElement!.appendChild(clone);
  const base = probe.getBoundingClientRect().top - section.getBoundingClientRect().top;
  clone.remove();
  return 1 - base / window.innerHeight;
}

export function heroScene(opts: { aerial: boolean; reduced: boolean }) {
  const section = q('#aksam');
  const a = q('[data-word-a]', section);
  const b = q('[data-word-b]', section);
  const pre = q('.hero__pre', section);
  const metas = section.querySelectorAll('.shore, .city__where, .city__when, .city__cue');

  const measure = () => {
    if (!opts.aerial) layout.heroHorizon = measureHorizon(section, '[data-word-a]');
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  if (opts.reduced) {
    return ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom top' });
  }

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  if (opts.aerial) {
    tl.to(a, { xPercent: -130, ease: 'power2.in', duration: 0.8 }, 0)
      .to(b, { xPercent: 130, ease: 'power2.in', duration: 0.8 }, 0)
      .to(pre, { autoAlpha: 0, duration: 0.3 }, 0.05)
      .to(metas, { autoAlpha: 0, duration: 0.25 }, 0);
  } else {
    // the shores open: Europe drifts left, Asia right, the camera moves north between them
    tl.to(a, { x: () => -window.innerWidth * 0.62, scale: 1.16, transformOrigin: '100% 100%', ease: 'power2.in', duration: 0.62 }, 0)
      .to(b, { x: () => window.innerWidth * 0.62, scale: 1.16, transformOrigin: '0% 100%', ease: 'power2.in', duration: 0.62 }, 0)
      .to(pre, { autoAlpha: 0, y: -30, duration: 0.25 }, 0.04)
      .to(metas, { autoAlpha: 0, duration: 0.2 }, 0)
      .to({}, { duration: 0.38 });
  }

  return ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${window.innerHeight * (opts.aerial ? 1.3 : 1.7)}`,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
  });
}

/** The words stand on the horizon: when the camera tilts, they ride it. */
export function followHorizon() {
  const a = q('[data-word-a]');
  const b = q('[data-word-b]');
  let last = NaN;
  return () => {
    const y = (layout.heroHorizon - water.horizon) * window.innerHeight;
    if (Math.abs(y - last) < 0.05) return;
    last = y;
    gsap.set([a, b], { y });
  };
}
