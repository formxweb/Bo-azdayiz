import { gsap } from 'gsap';
import { dishes, dishById, courses, price, allergenNote, type Dish } from '../content/menu';
import { brand } from '../content/brand';
import { dishSizes } from '../content/media';
import { dishPhoto, picture } from './media';

interface DishOpts {
  reduced: boolean;
  lock: (locked: boolean) => void;
  /** close hands over to the reservation form, optionally with a main course chosen */
  reserve: (choice?: string) => void;
}

const q = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Dish detail. The plate you touch is lifted off the table and carried into the
 * sheet; closing sets it back down. Everything shown comes from content/menu.ts.
 */
export function dishDialog(opts: DishOpts) {
  const root = q('[data-dish-modal]');
  const backdrop = q('.dish__backdrop', root);
  const sheet = q('[data-dish-sheet]', root);
  const media = q('[data-dish-media]', root);
  const plate = q('[data-dish-plate]', root);
  const plateName = q('[data-dish-plate-name]', root);
  const body = q('[data-dish-body]', root);
  const courseEl = q('[data-dish-course]', root);
  const countEl = q('[data-dish-count]', root);
  const nameEl = q('[data-dish-name]', root);
  const descEl = q('[data-dish-desc]', root);
  const ingRow = q('[data-dish-ingredients-row]', root);
  const ingList = q('[data-dish-ingredients]', root);
  const priceEl = q('[data-dish-price]', root);
  const allergenEl = q('[data-dish-allergen]', root);
  const reserveBtn = q<HTMLAnchorElement>('[data-dish-reserve]', root);
  const reserveLabel = q('[data-dish-reserve-label]', root);
  const closeBtn = q<HTMLButtonElement>('.dish__close', root);
  const bodyParts = () => [...body.children] as HTMLElement[];

  let current: Dish | null = null;
  let source: HTMLElement | null = null;
  let isOpen = false;
  let busy = false;
  let lastFocus: HTMLElement | null = null;
  let pushed = false;

  const triggerFor = (id: string) => document.querySelector<HTMLElement>(`[data-dish="${id}"]:not([data-dish-modal] *)`);
  const isPlate = (el: HTMLElement | null) => !!el && el.classList.contains('plate');
  const onScreen = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;
  };

  const fill = (d: Dish) => {
    const i = dishes.indexOf(d);
    const c = courses[d.course];
    courseEl.textContent = d.course === 'icecek' ? c.title : `${c.no} — ${c.title}`;
    countEl.textContent = `${pad(i + 1)} / ${pad(dishes.length)}`;
    nameEl.textContent = d.name;
    descEl.textContent = d.description ?? '';

    ingRow.hidden = !d.ingredients?.length;
    ingList.replaceChildren(
      ...(d.ingredients ?? []).map((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        return li;
      }),
    );

    const rule = d.course === 'ana' ? ' Ana yemekte iki tabaktan biri seçilir.' : '';
    priceEl.replaceChildren(
      document.createTextNode(`Menüye dahil — ${price.label} ${price.amount}, ${price.includes.toLowerCase()}.${rule}`),
      Object.assign(document.createElement('small'), { textContent: price.note }),
    );

    const ask = `${brand.whatsapp}?text=${encodeURIComponent(`Merhaba, ${d.name} için alerjen bilgisi almak istiyorum.`)}`;
    const link = Object.assign(document.createElement('a'), { href: ask, target: '_blank', rel: 'noopener', textContent: 'WhatsApp’tan sorun' });
    allergenEl.replaceChildren(document.createTextNode(`${allergenNote} `), link);

    plate.className = `dish__plate plate plate--${d.vessel}`;
    plateName.textContent = d.name;
    media.querySelector('.dish__photo')?.remove();
    const photo = dishPhoto(d.id);
    if (photo) {
      const holder = document.createElement('div');
      holder.className = 'dish__photo';
      holder.appendChild(picture(photo, dishSizes, d.name, true));
      media.appendChild(holder);
    }
    reserveLabel.textContent = d.choice ? 'Bu tabakla rezervasyon' : 'Rezervasyon';
    current = d;
  };

  /** a free-flying copy of the plate, above everything, so nothing clips it */
  const flyer = (from: DOMRect, to: DOMRect) => {
    const f = plate.cloneNode(true) as HTMLElement;
    f.removeAttribute('data-dish-plate');
    f.classList.add('plate-flyer');
    const fs = getComputedStyle(plate.firstElementChild as HTMLElement).fontSize;
    Object.assign(f.style, {
      position: 'fixed',
      left: `${to.left}px`,
      top: `${to.top}px`,
      width: `${to.width}px`,
      height: `${to.height}px`,
      margin: '0',
      zIndex: '70',
      pointerEvents: 'none',
      transformOrigin: '50% 50%',
    });
    (f.firstElementChild as HTMLElement).style.fontSize = fs;
    document.body.appendChild(f);
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);
    return { el: f, x, y, s: from.width / to.width };
  };

  const open = (id: string, trigger: HTMLElement) => {
    const d = dishById(id);
    if (!d || busy) return;
    if (isOpen) return step(id);
    busy = true;
    isOpen = true;
    lastFocus = trigger;
    source = trigger;
    fill(d);
    root.hidden = false;
    document.documentElement.classList.add('dish-open');
    opts.lock(true);
    if (!pushed) {
      history.pushState({ dish: d.id }, '');
      pushed = true;
    }

    const done = () => {
      busy = false;
      closeBtn.focus({ preventScroll: true });
    };
    if (opts.reduced) {
      done();
      return;
    }

    const tl = gsap.timeline({ onComplete: done });
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
      .fromTo(sheet, { opacity: 0, clipPath: 'inset(5% 3% 5% 3%)' }, { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', clearProps: 'clipPath' }, 0.05)
      .fromTo(bodyParts(), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: 'expo.out', clearProps: 'transform' }, 0.35);

    if (isPlate(trigger) && onScreen(trigger)) {
      const f = flyer(trigger.getBoundingClientRect(), plate.getBoundingClientRect());
      trigger.classList.add('is-lifted');
      gsap.set(plate, { opacity: 0 });
      tl.fromTo(f.el, { x: f.x, y: f.y, scale: f.s }, { x: 0, y: 0, scale: 1, duration: 1.15, ease: 'expo.inOut' }, 0)
        .add(() => {
          gsap.set(plate, { opacity: 1 });
          f.el.remove();
        });
    } else {
      tl.fromTo(plate, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out' }, 0.15);
    }
  };

  const close = (fromHistory = false, then?: () => void) => {
    if (!isOpen || busy) return;
    busy = true;
    const src = source;
    const finish = () => {
      root.hidden = true;
      document.documentElement.classList.remove('dish-open');
      src?.classList.remove('is-lifted');
      gsap.set([backdrop, sheet, plate, ...bodyParts()], { clearProps: 'all' });
      opts.lock(false);
      isOpen = false;
      busy = false;
      if (!fromHistory && pushed) history.back();
      pushed = false;
      if (then) then();
      else lastFocus?.focus({ preventScroll: true });
    };
    if (opts.reduced) {
      finish();
      return;
    }
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(bodyParts(), { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(sheet, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 0.12)
      .to(backdrop, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0.15);
    if (isPlate(src) && src && onScreen(src)) {
      const f = flyer(src.getBoundingClientRect(), plate.getBoundingClientRect());
      gsap.set(plate, { opacity: 0 });
      tl.to(f.el, { x: f.x, y: f.y, scale: f.s, duration: 0.95, ease: 'expo.inOut' }, 0).add(() => {
        src.classList.remove('is-lifted');
        f.el.remove();
      });
    } else {
      tl.to(plate, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' }, 0);
    }
  };

  const step = (target: string | number) => {
    if (!current || busy) return;
    const i = dishes.indexOf(current);
    const next = typeof target === 'number' ? dishes[(i + target + dishes.length) % dishes.length] : dishById(target)!;
    busy = true;
    const dir = typeof target === 'number' ? Math.sign(target) : 1;
    const parts = bodyParts();
    const swap = () => {
      source?.classList.remove('is-lifted');
      source = triggerFor(next.id);
      fill(next);
    };
    if (opts.reduced) {
      swap();
      busy = false;
      return;
    }
    gsap.timeline({ onComplete: () => void (busy = false) })
      .to(plate, { opacity: 0, x: -40 * dir, duration: 0.35, ease: 'power2.in' }, 0)
      .to(parts, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .add(swap)
      .fromTo(plate, { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out' })
      .fromTo(parts, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', clearProps: 'transform' }, '<0.05');
  };

  document.querySelectorAll<HTMLElement>('[data-dish]').forEach((el) =>
    el.addEventListener('click', () => open(el.dataset.dish!, el)),
  );
  root.querySelectorAll('[data-dish-close]').forEach((el) => el.addEventListener('click', () => close()));
  q('[data-dish-prev]', root).addEventListener('click', () => step(-1));
  q('[data-dish-next]', root).addEventListener('click', () => step(1));
  reserveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const choice = current?.choice;
    close(false, () => opts.reserve(choice));
  });

  window.addEventListener('popstate', () => {
    if (isOpen) {
      pushed = false;
      busy = false;
      close(true);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight') {
      step(1);
    } else if (e.key === 'ArrowLeft') {
      step(-1);
    } else if (e.key === 'Tab') {
      const ring = [...sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null);
      const i = ring.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      const n = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : i === ring.length - 1 ? 0 : i + 1;
      ring[n]?.focus();
    }
  });
}
