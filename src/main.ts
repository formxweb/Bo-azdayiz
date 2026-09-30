import './styles/base.css';
import './styles/chrome.css';
import './styles/ui.css';
import './styles/scenes.css';
import './styles/dish.css';
import './styles/media.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { WaterRenderer, water } from './gl/water';
import { Director } from './director';
import { heroScene, heroWords, followHorizon, heroIntro } from './scenes/hero';
import { timelineScene } from './scenes/timeline';
import { vesselScene } from './scenes/vessel';
import { sofraScene } from './scenes/sofra';
import { stageScene } from './scenes/stage';
import { returnScene } from './scenes/return';
import { route } from './ui/route';
import { reserveForm } from './ui/reserve';
import { mountMedia } from './ui/media';
import { dishDialog } from './ui/dish';
import { reveals, dock } from './ui/reveal';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const aerialQuery = '(max-aspect-ratio: 4/5)';

const fontsReady = () =>
  Promise.race([
    Promise.all([
      document.fonts.load('800 100px "Anybody Hero"', 'BOĞAZDAYIZ'),
      document.fonts.load('800 100px Anybody', 'BOĞAZ 19:30'),
      document.fonts.load('italic 300 40px Newsreader', 'Bu gece Boğazdayız'),
    ]).then(() => document.fonts.ready),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

async function boot() {
  await fontsReady();

  let renderer: WaterRenderer | null = null;
  try {
    renderer = new WaterRenderer(document.body, { still: reducedQuery.matches });
    root.classList.add('has-gl');
  } catch {
    root.classList.add('no-gl');
  }

  // smooth scroll on wheel/trackpad only; touch keeps native momentum
  let lenis: Lenis | null = null;
  if (!reducedQuery.matches) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis!.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // scroll speed, smoothed and decaying: the stage acts listen to it
  let velocity = 0;
  let lastY = window.scrollY;
  gsap.ticker.add((_t, dt) => {
    const y = window.scrollY;
    const inst = ((y - lastY) / Math.max(dt, 1)) * 1000;
    lastY = y;
    velocity += (inst - velocity) * 0.18;
  });

  let director: Director | null = null;
  const words = heroWords();

  const mm = gsap.matchMedia();
  // 'all' keeps the context alive when neither condition matches (plain desktop)
  mm.add({ all: 'all', aerial: aerialQuery, reduced: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const { aerial, reduced } = ctx.conditions as { aerial: boolean; reduced: boolean };
    root.classList.toggle('is-aerial', aerial);
    root.classList.toggle('is-reduced', reduced);
    const opts = { aerial, reduced };

    const d = new Director(renderer, opts);
    director = d;

    // scenes in document order so pin spacing resolves top-down
    const hero = heroScene(opts);
    const strait = timelineScene(opts);
    const vessel = vesselScene(opts);
    const sofra = sofraScene(opts);
    const stage = stageScene({ reduced, velocity: () => velocity });
    const ret = returnScene(opts);
    const reserve = ScrollTrigger.create({ trigger: '#bu-gece', start: 'top bottom', end: 'bottom bottom' });

    const marks = { hero, strait, vessel, sofra, stage, ret, reserve };
    const onRefresh = () => d.setMarks(marks);
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => d.update(window.scrollY) });
    if (!aerial && !reduced) d.onUpdate(followHorizon());
    // the timeline is its own clock: the small one steps aside while it is read
    const clock = document.querySelector('[data-clock-wrap]');
    d.onUpdate((y) => {
      const vh = window.innerHeight;
      clock?.classList.toggle('is-hidden', y > strait.start + vh * 0.8 && y < strait.end - vh * 0.6);
    });

    renderer?.setWords(words.texts, 'Anybody Hero', words.source);
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      director = null;
    };
  });

  const lock = (locked: boolean) => {
    if (lenis) locked ? lenis.stop() : lenis.start();
    root.style.overflow = locked ? 'hidden' : '';
  };
  const scrollTo = (target: HTMLElement) => {
    // pinned scenes live inside spacers: aim for the spacer's top
    const st = ScrollTrigger.getAll().find((s) => s.trigger === target && s.pin);
    const y = st ? st.start : target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 2.4, easing: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2) });
    else window.scrollTo({ top: y, behavior: 'auto' });
  };

  route({ reduced: reducedQuery.matches, minutes: () => director?.minutes ?? 0, lock, scrollTo });
  reserveForm();
  dishDialog({
    reduced: reducedQuery.matches,
    lock,
    reserve: (choice) => {
      if (choice) {
        const radio = document.querySelector<HTMLInputElement>(`input[name="main"][value="${choice}"]`);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      scrollTo(document.querySelector<HTMLElement>('#bu-gece')!);
    },
  });
  reveals(reducedQuery.matches);
  dock();
  mountMedia().then((mounted) => mounted && ScrollTrigger.refresh());

  renderer?.start_();
  heroIntro({ reduced: reducedQuery.matches, invalidate: () => renderer?.invalidate() });
  root.classList.add('is-ready');
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('qa')) {
    Object.assign(window, { __water: water, __st: ScrollTrigger, __director: () => director });
  }
}

boot();
