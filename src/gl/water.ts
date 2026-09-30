import frag from './water.frag.glsl?raw';
import vert from './water.vert.glsl?raw';

/**
 * The Bosphorus renderer. One fixed canvas behind every scene; scenes never own
 * pixels, they only steer this state (camera, time of night, the vessel).
 */
export interface WaterState {
  night: number;
  horizon: number;
  fwd: number;
  aerial: number;
  zoom: number;
  bridgeApproach: number;
  bridgeVis: number;
  typeOn: number;
  typeReveal: number;
  shipX: number;
  shipY: number;
  shipL: number;
  shipH: number;
  shipOn: number;
  exposure: number;
  warm: number;
}

export const water: WaterState = {
  night: 0,
  horizon: 0.38,
  fwd: 0,
  aerial: 0,
  zoom: 1,
  bridgeApproach: 0,
  bridgeVis: 1,
  typeOn: 1,
  typeReveal: 1.2,
  shipX: 1.6,
  shipY: 0.3,
  shipL: 0.7,
  shipH: 0.16,
  shipOn: 0,
  exposure: 1,
  warm: 0,
};

/** Ship-local point the camera zooms into (must match SHIP_FOCUS in the shader). */
export const SHIP_FOCUS = { u: 0.4933, v: 0.485 };

type WordSource = () => { a: DOMRect | null; b: DOMRect | null };

const MAX_RIPPLES = 6;

export class WaterRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog!: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private typeTex: WebGLTexture | null = null;
  private atlas = { a: [0, 0, 0, 0], b: [0, 0, 0, 0] };
  private words: WordSource | null = null;
  private ripples = new Float32Array(MAX_RIPPLES * 4);
  private rippleCursor = 0;
  private start = performance.now();
  private raf = 0;
  private running = false;
  private dirty = true;
  private scale = 1;
  private frameTimes: number[] = [];
  private lastPointer = { x: -1, y: -1, t: 0 };
  /** last scroll or pointer activity; when the page is idle the water runs at half rate */
  private lastActive = performance.now();
  private tick = 0;
  active = true;

  constructor(
    host: HTMLElement,
    private readonly opts: { still: boolean },
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bosphorus';
    this.canvas.setAttribute('aria-hidden', 'true');
    // after the CSS sky (the no-GL fallback) so the canvas paints over it
    const sky = host.querySelector('.sky');
    if (sky) sky.after(this.canvas);
    else host.prepend(this.canvas);
    const gl = this.canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('webgl-unavailable');
    this.gl = gl;
    this.build();
    this.scale = window.matchMedia('(pointer: coarse)').matches ? 0.6 : 0.85;
    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.build();
      this.dirty = true;
      this.start_();
    });
    if (!opts.still) {
      window.addEventListener('pointermove', this.onPointer, { passive: true });
      window.addEventListener('pointerdown', this.onTap, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start_();
    });
  }

  private build() {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      }
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    this.prog = p;
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const names = [
      'uRes', 'uTime', 'uNight', 'uHorizon', 'uFwd', 'uAerial', 'uZoom', 'uBridge', 'uType',
      'uWordA', 'uWordB', 'uAtlasA', 'uAtlasB', 'uTypeOn', 'uTypeReveal', 'uShip', 'uShipOn', 'uRip',
      'uExposure', 'uWarm',
    ];
    for (const n of names) this.u[n] = gl.getUniformLocation(p, n);
    this.typeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.typeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(this.u.uType, 0);
  }

  /**
   * Rasterises the hero words into a mip-mapped atlas so the water can reflect
   * them. The DOM keeps the upright, selectable words; the shader only ever
   * draws their reflections.
   */
  setWords(texts: [string, string], family: string, source: WordSource) {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const fontPx = 360;
    ctx.font = `800 ${fontPx}px "${family}"`;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    const rows = texts.map((t, i) => {
      const m = ctx.measureText(t);
      const asc = m.fontBoundingBoxAscent ?? fontPx * 0.95;
      const desc = m.fontBoundingBoxDescent ?? fontPx * 0.25;
      const top = i * (size / 2) + (size / 2 - (asc + desc)) / 2;
      const x = (size - m.width) / 2;
      ctx.fillText(t, x, top + asc);
      // atlas rect in GL uv (y up): x0, y0 (bottom), x1, y1 (top)
      return [x / size, 1 - (top + asc + desc) / size, (x + m.width) / size, 1 - top / size];
    });
    this.atlas.a = rows[0];
    this.atlas.b = rows[1];
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.typeTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.words = source;
    this.dirty = true;
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth * dpr * this.scale);
    const h = Math.round(window.innerHeight * dpr * this.scale);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.dirty = true;
  };

  private toUv(clientX: number, clientY: number) {
    return { x: clientX / window.innerWidth, y: 1 - clientY / window.innerHeight };
  }

  private addRipple(x: number, y: number, strength: number) {
    const i = this.rippleCursor * 4;
    this.ripples[i] = x;
    this.ripples[i + 1] = y;
    this.ripples[i + 2] = 0;
    this.ripples[i + 3] = strength;
    this.rippleCursor = (this.rippleCursor + 1) % MAX_RIPPLES;
  }

  private onWater(y: number) {
    return water.aerial > 0.5 || y < water.horizon;
  }

  private onPointer = (e: PointerEvent) => {
    this.lastActive = performance.now();
    if (!this.active || e.pointerType === 'touch') return;
    const p = this.toUv(e.clientX, e.clientY);
    if (!this.onWater(p.y)) return;
    const now = performance.now();
    const moved = Math.hypot(p.x - this.lastPointer.x, p.y - this.lastPointer.y);
    if (now - this.lastPointer.t > 140 && moved > 0.02) {
      this.addRipple(p.x, p.y, Math.min(0.5, moved * 6));
      this.lastPointer = { x: p.x, y: p.y, t: now };
    }
  };

  private onTap = (e: PointerEvent) => {
    if (!this.active) return;
    const p = this.toUv(e.clientX, e.clientY);
    if (this.onWater(p.y)) this.addRipple(p.x, p.y, 1);
  };

  invalidate() {
    this.dirty = true;
    this.lastActive = performance.now();
  }

  start_() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (!this.active) return;
    if (this.opts.still && !this.dirty) return;
    if (!this.dirty && now - this.lastActive > 2500 && this.tick++ % 2) return;
    const t0 = performance.now();
    this.draw(now);
    this.dirty = false;
    this.adapt(performance.now() - t0, now);
  };

  /** Drops internal resolution when frames get expensive; the water is soft enough to hide it. */
  private lastAdapt = 0;
  private adapt(cpu: number, now: number) {
    this.frameTimes.push(cpu);
    if (this.frameTimes.length < 40 || now - this.lastAdapt < 1500) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.lastAdapt = now;
    if (avg > 9 && this.scale > 0.45) {
      this.scale = Math.max(0.45, this.scale - 0.15);
      this.resize();
    }
  }

  private draw(now: number) {
    const gl = this.gl;
    const u = this.u;
    const s = water;
    const t = this.opts.still ? 12 : ((now - this.start) / 1000) % 1000;
    const dt = 1 / 60;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (this.ripples[i * 4 + 3] > 0) {
        this.ripples[i * 4 + 2] += dt;
        if (this.ripples[i * 4 + 2] > 4) this.ripples[i * 4 + 3] = 0;
      }
    }
    gl.useProgram(this.prog);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uNight, s.night);
    gl.uniform1f(u.uHorizon, s.horizon);
    gl.uniform1f(u.uFwd, s.fwd);
    gl.uniform1f(u.uAerial, s.aerial);
    gl.uniform1f(u.uZoom, s.zoom);
    gl.uniform2f(u.uBridge, s.bridgeApproach, s.bridgeVis);
    gl.uniform1f(u.uShipOn, s.shipOn);
    gl.uniform4f(u.uShip, s.shipX, s.shipY, s.shipL, s.shipH);
    gl.uniform1f(u.uExposure, s.exposure);
    gl.uniform1f(u.uWarm, s.warm);
    gl.uniform4fv(u.uRip, this.ripples);

    let typeOn = 0;
    if (this.words && s.typeOn > 0.001 && s.aerial < 0.5) {
      const { a, b } = this.words();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = (r: DOMRect) => [r.left / vw, 1 - r.bottom / vh, r.right / vw, 1 - r.top / vh];
      if (a && b) {
        gl.uniform4fv(u.uWordA, rect(a));
        gl.uniform4fv(u.uWordB, rect(b));
        gl.uniform4fv(u.uAtlasA, this.atlas.a);
        gl.uniform4fv(u.uAtlasB, this.atlas.b);
        typeOn = s.typeOn;
      }
    }
    gl.uniform1f(u.uTypeOn, typeOn);
    gl.uniform1f(u.uTypeReveal, s.typeReveal);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.typeTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
