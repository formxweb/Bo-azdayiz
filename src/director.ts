import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { water, SHIP_FOCUS, type WaterRenderer } from './gl/water';
import { Track, ease, clamp, range } from './lib/track';
import { fmtTime, schedule } from './content/brand';

/**
 * The director turns one number — how far into the night you have scrolled —
 * into the camera, the time on the clock and the colour of the night.
 */
export interface Marks {
  hero: ScrollTrigger;
  strait: ScrollTrigger;
  vessel: ScrollTrigger;
  sofra: ScrollTrigger;
  stage: ScrollTrigger;
  ret: ScrollTrigger;
  reserve: ScrollTrigger;
}

type Listener = (y: number) => void;

/** Measured from the DOM by the scenes: where the words actually stand. */
export const layout = { heroHorizon: 0.38, returnHorizon: 0.42, clothClosed: 0 };

const t = {
  horizon: new Track(0.38),
  fwd: new Track(0),
  zoom: new Track(1),
  bridgeA: new Track(0),
  bridgeV: new Track(1),
  typeOn: new Track(1),
  shipOn: new Track(0),
  shipX: new Track(1.6),
  shipY: new Track(0.3),
  shipLogS: new Track(0),
  warm: new Track(0),
  clock: new Track(schedule.boarding),
  active: new Track(1),
};

// aerial strait centre line (mirrors straitCenter() in the shader)
const straitCenter = (y: number) => 0.1 * Math.sin(y * 1.25 + 0.6) + 0.045 * Math.sin(y * 2.9 + 2.0);

export class Director {
  private marks: Marks | null = null;
  private listeners: Listener[] = [];
  private lastY = -1;
  private readonly clockEl = document.querySelector<HTMLElement>('[data-clock]');
  private readonly chrome = document.querySelector<HTMLElement>('[data-chrome]');
  private readonly hull = document.querySelector<HTMLElement>('[data-hull]');
  private base = { L: 0.9, H: 0.2, focusY: 0.35 };
  minutes: number = schedule.boarding;

  constructor(
    private readonly renderer: WaterRenderer | null,
    private readonly opts: { aerial: boolean; reduced: boolean },
  ) {
    water.aerial = opts.aerial ? 1 : 0;
    Track.stepped = opts.reduced;
  }

  onUpdate(fn: Listener) {
    this.listeners.push(fn);
  }

  setMarks(m: Marks) {
    this.marks = m;
    this.build();
  }

  /** Rebuild every track from where the scenes actually landed after layout. */
  build() {
    const m = this.marks;
    if (!m) return;
    const vh = window.innerHeight;
    const asp = window.innerWidth / vh;
    for (const k of Object.values(t)) k.clear();

    const H0 = m.hero.start;
    const H1 = m.hero.end;
    const S1 = m.strait.end;
    const V0 = m.vessel.start;
    const V1 = m.vessel.end;
    const VL = V1 - V0;
    const zoomStart = V0 + VL * 0.5;
    const zoomEnd = V0 + VL * 0.96;
    const F0 = m.sofra.start;
    const A0 = m.stage.start;
    const D0 = m.ret.start;
    const D1 = m.ret.end;
    const heroLen = H1 - H0;

    // time of night (clock drives colour)
    t.clock
      .key(H0, schedule.boarding)
      .key(V0, schedule.boarding + 30, ease.linear)
      .key(zoomStart, schedule.departure, ease.linear)
      .key(F0, schedule.dinner, ease.linear)
      .key(A0, schedule.stage, ease.linear)
      .key(D0, schedule.return, ease.linear);

    // where the canvas is covered by opaque scenes it stops drawing
    const cloth = F0 + 2;
    t.active.key(cloth - 1, 1, ease.linear).key(cloth, 0, ease.linear).key(D0 - vh - 2, 0, ease.linear).key(D0 - vh - 1, 1, ease.linear);

    if (this.opts.aerial) {
      this.base = { L: 0.3, H: 0.085, focusY: 0.27 };
      t.zoom
        .key(H0, 1)
        .key(H1, 2.3, ease.camera)
        .key(S1, 2.3)
        .key(V0, 1.15, ease.inOut)
        .key(D0 - vh, 1.15)
        .key(D0 + (D1 - D0) * 0.6, 0.9, ease.inOut);
      t.fwd
        .key(H0, 0)
        .key(H1, 1.3, ease.inOut)
        .key(S1, 3.3, ease.linear)
        .key(V0 + VL * 0.4, 3.9, ease.out)
        .key(D0 - vh, 5.2, ease.linear)
        .key(D1, 0.6, ease.inOut); // the ride home runs south
      t.typeOn.key(0, 0);
      t.bridgeV.key(0, 1);
      t.shipOn.key(V0 - vh * 0.6, 0).key(V0, 1).key(F0, 1).key(F0 + 1, 0);
      t.shipY.key(V0 - vh * 0.6, -0.35).key(V0 + VL * 0.4, this.base.focusY, ease.out).key(zoomStart, this.base.focusY).key(zoomEnd, 0.5);
      t.shipX.key(0, 0.5);
    } else {
      this.base = { L: Math.min(0.94, 1.5 / asp), H: 0, focusY: 0 };
      this.base.H = (this.base.L * asp) / 6.2;
      const hV = 0.43;
      const waterline = hV - 0.075;
      this.base.focusY = waterline + SHIP_FOCUS.v * this.base.H;

      t.horizon
        .key(H0, layout.heroHorizon)
        .key(H0 + heroLen * 0.5, layout.heroHorizon, ease.linear)
        .key(H1, 0.9, ease.camera)
        .key(V0 - vh, 0.9)
        .key(V0, hV, ease.inOut)
        .key(D0 - vh, layout.returnHorizon)
        .key(D0, layout.returnHorizon);
      t.fwd
        .key(H0, 0)
        .key(H1, 1.1, ease.in)
        .key(S1, 2.6, ease.linear)
        .key(V1, 3.2, ease.linear)
        .key(D0 - vh, 3.2)
        .key(D1 + vh * 2, 3.9, ease.linear);
      t.bridgeA
        .key(H0, 0)
        .key(H0 + heroLen * 0.55, 0.3, ease.in)
        .key(H1, 1.0, ease.in)
        .key(V0 - vh, 1.0, ease.linear)
        .key(V0 - vh + 1, 0.0, ease.linear);
      t.bridgeV.key(H1 - 1, 1, ease.linear).key(H1, 0, ease.linear).key(V0 - vh * 0.5, 0, ease.linear).key(V0, 1, ease.linear);
      t.typeOn.key(H0, 1).key(H1 - heroLen * 0.1, 0.9).key(H1, 0).key(D0 - vh, 0, ease.linear).key(D0 - vh + 1, 1, ease.linear);

      t.shipOn.key(V0 - vh * 0.5, 0, ease.linear).key(V0 - vh * 0.45, 1, ease.linear).key(F0, 1).key(F0 + 1, 0);
      t.shipX.key(V0 - vh * 0.45, 1.62).key(V0 + VL * 0.3, 0.5, ease.out);
      t.shipY.key(V0, this.base.focusY).key(zoomStart, this.base.focusY).key(zoomEnd, 0.5, ease.inOut);
    }
    // zoom through the window: exponential so the approach feels like a steady dolly
    const zoomTo = this.opts.aerial ? Math.log(22) : Math.log(78);
    t.shipLogS.key(zoomStart, 0).key(zoomEnd, zoomTo, (x) => x * x * (3 - 2 * x));
    t.warm.key(zoomStart + (zoomEnd - zoomStart) * 0.82, 0, ease.linear).key(zoomEnd, 1, ease.in).key(F0 + 1, 1).key(F0 + 2, 0);

    this.lastY = -1;
    this.update(window.scrollY);
  }

  update(y: number) {
    if (!this.marks || y === this.lastY) return;
    this.lastY = y;
    const minutes = t.clock.at(y);
    this.minutes = minutes;
    water.night = clamp((minutes - schedule.boarding) / (schedule.return - schedule.boarding));
    if (!this.opts.aerial) water.horizon = t.horizon.at(y);
    water.fwd = t.fwd.at(y);
    water.zoom = t.zoom.at(y);
    water.bridgeApproach = t.bridgeA.at(y);
    water.bridgeVis = t.bridgeV.at(y);
    water.typeOn = t.typeOn.at(y);
    water.shipOn = t.shipOn.at(y);
    water.warm = t.warm.at(y);
    const s = Math.exp(t.shipLogS.at(y));
    water.shipL = this.base.L * s;
    water.shipH = this.base.H * s;
    water.shipY = t.shipY.at(y);
    water.shipX = t.shipX.at(y);
    if (this.opts.aerial) {
      // ride the strait's centre line
      const asp = window.innerWidth / window.innerHeight;
      const scale = 1.35 / water.zoom;
      const wy = (water.shipY - 0.5) * scale + water.fwd;
      water.shipX = 0.5 + straitCenter(wy) / (asp * scale);
    }

    if (this.renderer) {
      this.renderer.active = t.active.at(y) > 0.5;
      this.renderer.invalidate();
    }
    if (this.clockEl) this.clockEl.textContent = fmtTime(minutes);
    this.syncHull();
    const light = this.windowCovers() || (this.clothOnTop(y) && layout.clothClosed < 0.55);
    this.chrome?.setAttribute('data-tone', light ? 'light' : 'dark');
    for (const fn of this.listeners) fn(y);
  }

  private clothOnTop(y: number) {
    const m = this.marks!;
    // the linen is under the header until the spotlight has closed most of the way
    return y >= m.sofra.start - 40 && y < m.sofra.end;
  }

  /** true once the boarding window's light fills the frame */
  private windowCovers() {
    if (water.shipOn < 0.5) return false;
    if (water.warm > 0.5) return true;
    if (this.opts.aerial) return water.shipL / this.base.L > 8;
    const halfW = 0.0286 * 0.42 * water.shipL;
    const halfH = 0.09 * water.shipH;
    return Math.abs(water.shipX - 0.5) + 0.5 < halfW && Math.abs(water.shipY - 0.5) + 0.5 < halfH;
  }

  /** Painted name on the hull follows the ship, including through the zoom. */
  private syncHull() {
    const el = this.hull;
    if (!el) return;
    if (water.shipOn < 0.5 || this.opts.aerial) {
      el.style.opacity = '0';
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const u = 0.575;
    const v = 0.27;
    const x = (water.shipX + (u - SHIP_FOCUS.u) * water.shipL) * vw;
    const yTop = (1 - (water.shipY + (v - SHIP_FOCUS.v) * water.shipH)) * vh;
    const k = (water.shipH * vh * 0.19) / 40;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${yTop.toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    el.style.opacity = String(1 - range(water.warm, 0, 0.4));
  }
}
