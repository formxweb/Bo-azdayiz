/**
 * Keyframe tracks over absolute scroll position. The camera (water state) is a
 * pure function of scroll: no competing tweens, jumping anywhere is exact.
 */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  /** slow start, then the camera commits */
  camera: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
};

interface Key {
  y: number;
  v: number;
  e: Ease;
}

export class Track {
  private keys: Key[] = [];
  constructor(private readonly fallback: number) {}

  clear() {
    this.keys.length = 0;
    return this;
  }

  /** value v reached at scroll y, arriving with easing e from the previous key */
  key(y: number, v: number, e: Ease = ease.inOut) {
    this.keys.push({ y, v, e });
    this.keys.sort((a, b) => a.y - b.y);
    return this;
  }

  at(y: number): number {
    const k = this.keys;
    if (!k.length) return this.fallback;
    if (y <= k[0].y) return k[0].v;
    const last = k[k.length - 1];
    if (y >= last.y) return last.v;
    for (let i = 1; i < k.length; i++) {
      if (y <= k[i].y) {
        const a = k[i - 1];
        const b = k[i];
        const span = b.y - a.y || 1;
        return a.v + (b.v - a.v) * b.e((y - a.y) / span);
      }
    }
    return last.v;
  }
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a || 1));
