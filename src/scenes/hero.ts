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
  const metas = q('[data-city-ui]', section);

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
    // the camera lowers onto the water: both banks slide out of frame
    tl.to(a, { x: () => -window.innerWidth * 0.55, ease: 'power2.in', duration: 0.8 }, 0)
      .to(b, { x: () => window.innerWidth * 0.55, ease: 'power2.in', duration: 0.8 }, 0)
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

/**
 * Arrival. The water comes up out of the dark, the two shores rise from it
 * (their reflections rising with them), then the quiet details settle in.
 */
export function heroIntro(opts: { reduced: boolean; invalidate: () => void }) {
  const root = document.documentElement;
  const section = q('#aksam');
  const words = [q('[data-word-a]', section), q('[data-word-b]', section)];
  const details = [...document.querySelectorAll<HTMLElement>('#aksam [data-intro]')];
  const chrome = q('[data-chrome]');
  if (opts.reduced) {
    root.classList.remove('intro');
    return;
  }
  const reveal = { p: 0 };
  water.exposure = 0;
  water.typeReveal = 0;
  const clip = (p: number) => `inset(${((1 - p) * 100).toFixed(2)}% -12% -4% -12%)`;
  gsap.set(words, { clipPath: clip(0), yPercent: 14 });
  gsap.set(chrome, { opacity: 0 });
  root.classList.remove('intro');
  gsap.set(details, { opacity: 0, y: 14 });

  gsap.timeline({ defaults: { overwrite: 'auto' } })
    .to(water, { exposure: 1, duration: 2.6, ease: 'sine.inOut', onUpdate: opts.invalidate }, 0)
    .to(reveal, {
      p: 1,
      duration: 1.9,
      ease: 'expo.out',
      onUpdate: () => {
        const p = reveal.p;
        water.typeReveal = p * 1.2;
        opts.invalidate();
        words.forEach((w) => (w.style.clipPath = clip(p * 1.15)));
      },
      onComplete: () => {
        water.typeReveal = 1.2;
        gsap.set(words, { clearProps: 'clipPath' });
      },
    }, 0.55)
    .to(words, { yPercent: 0, duration: 2, ease: 'expo.out', stagger: 0.08 }, 0.55)
    .to(chrome, { opacity: 1, duration: 1.2, ease: 'power2.out', clearProps: 'opacity' }, 1.2)
    .to(details, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, clearProps: 'transform,opacity' }, 1.35);
}
