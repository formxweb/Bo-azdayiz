// Boğaz — one fullscreen pass.
// Two cameras share this shader:
//   horizon view (uAerial = 0): eye level on the water, facing north up the strait.
//   aerial view  (uAerial = 1): portrait screens look straight down on the strait,
//                               the way Istanbul reads from above at night.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uNight;     // 0 = 19:30 blue hour … 1 = 23:30 deep night
uniform float uHorizon;   // uv.y of the horizon line
uniform float uFwd;       // distance travelled north
uniform float uAerial;
uniform float uZoom;     // aerial camera height (1 = default, >1 = lower, closer)
uniform vec2 uBridge;     // x: approach 0..1, y: visibility
uniform sampler2D uType;
uniform vec4 uWordA;      // screen rects of the hero words, uv (x0, y0 = baseline, x1, y1)
uniform vec4 uWordB;
uniform vec4 uAtlasA;     // same words inside the atlas texture
uniform vec4 uAtlasB;
uniform float uTypeOn;
uniform float uTypeReveal; // 0..1: how much of each word has risen from the water
uniform vec4 uShip;       // focus point on screen (uv x, y), ship length (uv x), ship height (uv y)
uniform float uShipOn;
uniform vec4 uRip[6];     // uv x, uv y, age (s), strength
uniform float uExposure;
uniform float uWarm;      // boarding: the window light swallows the frame

varying vec2 vUv;

const vec3 SODIUM = vec3(1.0, 0.56, 0.24);
const vec3 WARMW  = vec3(1.0, 0.84, 0.62);
const vec3 COOLW  = vec3(0.78, 0.86, 1.0);
const vec3 CREAM  = vec3(0.937, 0.910, 0.863);

// ship focus point, in ship-local units (u along length, v up from waterline)
const vec2 SHIP_FOCUS = vec2(0.4933, 0.485); // centre of lower-deck window 15

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}

vec3 lightTint(float r) {
  return r < 0.55 ? SODIUM : (r < 0.93 ? WARMW : COOLW);
}

// ───────────────────────────── horizon view ─────────────────────────────

// height of the far shore above the horizon, in uv.y
float landTop(float x) {
  float asp = uRes.x / uRes.y;
  float sides = pow(abs(x - 0.5) * 2.0, 2.2);
  return 0.010 + 0.022 * fbm(vec2(x * asp * 2.6 + 3.1, 0.5)) + 0.05 * sides;
}

// one layer of shore lights; q = pixels, origin on the horizon
vec3 lightLayer(vec2 q, float cell, float seed, float dens, float rad, float streak) {
  vec3 acc = vec3(0.0);
  vec2 id = floor(q / cell);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = id + vec2(float(i), float(j));
      float r = hash21(c + seed);
      if (r > dens) continue;
      vec2 o = hash22(c + seed * 1.7);
      vec2 pos = (c + 0.15 + 0.7 * o) * cell;
      float top = landTop(pos.x / uRes.x) * uRes.y;
      if (pos.y < 1.0 || pos.y > top) continue;
      vec2 d = q - pos;
      d.y /= streak;
      float k = dot(d, d);
      float b = 0.55 + 0.45 * fract(r * 13.7);
      b *= 0.85 + 0.15 * sin(uTime * (0.6 + 2.0 * o.x) + r * 40.0);
      acc += lightTint(fract(r * 7.3)) * b * (exp(-k / (rad * rad)) + 0.07 * exp(-k / (rad * rad * 16.0)));
    }
  }
  return acc;
}

vec3 skyColor(vec2 uv) {
  float h = uHorizon;
  float t = clamp((uv.y - h) / max(1.0 - h, 0.2), 0.0, 1.0);
  vec3 top = mix(vec3(0.070, 0.105, 0.185), vec3(0.010, 0.016, 0.030), uNight);
  vec3 low = mix(vec3(0.215, 0.210, 0.275), vec3(0.040, 0.046, 0.068), uNight);
  vec3 col = mix(low, top, pow(t, 0.55));
  // afterglow sits in the west: left of frame when facing north
  float glow = (1.0 - smoothstep(0.0, 0.45, uNight)) * exp(-t * 7.0) * smoothstep(1.1, 0.0, uv.x);
  col += vec3(0.62, 0.30, 0.15) * glow * 0.9;
  // the city's own sodium haze grows as the night deepens
  col += vec3(0.42, 0.22, 0.10) * exp(-t * 11.0) * (0.25 + 0.35 * uNight);
  return col;
}

// Suspension bridge seen from the water. Returns rgb (emissive) and a = silhouette.
vec4 bridgeLayer(vec2 uv) {
  float vis = uBridge.y;
  if (vis <= 0.001) return vec4(0.0);
  float a = uBridge.x;
  float h = uHorizon;
  float deckY = h + mix(0.030, 1.10, a * a);
  float hsp = mix(0.30, 1.9, a);
  float towerH = mix(0.075, 1.6, a * a);
  float x = (uv.x - 0.5) / hsp;
  float ax = abs(x);
  float px = 1.0 / uRes.y;
  float lw = px * (1.0 + a * 3.0);

  vec3 led = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.62, 0.36), smoothstep(0.2, 0.9, uNight));
  float run = 0.5 + 0.5 * sin(x * 6.0 - uTime * 0.7);
  led *= 0.65 + 0.5 * run;

  vec3 col = vec3(0.0);
  float sil = 0.0;

  // main cable: parabola between towers, side spans fall to the anchorages
  float cab = ax <= 1.0 ? deckY + towerH * (0.035 + 0.965 * x * x)
                        : deckY + towerH * max(0.0, 1.0 - (ax - 1.0) / 0.55);
  float cd = abs(uv.y - cab);
  float cable = smoothstep(lw * 1.4, 0.0, cd);
  float beads = smoothstep(0.35, 0.0, abs(fract(x * 22.0) - 0.5) * 2.0);
  col += led * cable * (0.35 + 0.9 * beads);
  col += led * exp(-cd / (lw * 6.0)) * 0.10;

  // hangers
  if (ax < 1.0 && uv.y > deckY && uv.y < cab) {
    float hg = smoothstep(0.08, 0.0, abs(fract(x * 22.0) - 0.5) * 2.0 - 0.86);
    sil = max(sil, hg * 0.5);
    col += led * hg * 0.06;
  }

  // deck
  float thick = mix(0.0025, 0.07, a * a);
  float inDeck = step(deckY - thick, uv.y) * step(uv.y, deckY) * step(ax, 1.6);
  sil = max(sil, inDeck);
  float edge = exp(-abs(uv.y - (deckY - thick)) / (lw * 1.5));
  float lamps = smoothstep(0.3, 0.0, abs(fract(x * 36.0) - 0.5) * 2.0);
  col += WARMW * edge * lamps * step(ax, 1.6) * 0.9;

  // towers
  float tw = mix(1.6, 42.0, a * a) / uRes.x;
  float twx = min(abs(uv.x - (0.5 - hsp)), abs(uv.x - (0.5 + hsp)));
  float inTower = step(twx, tw) * step(h - 0.01, uv.y) * step(uv.y, deckY + towerH);
  sil = max(sil, inTower);
  col += led * inTower * 0.05;
  // aviation lights
  float blink = step(0.5, fract(uTime * 0.5));
  vec2 tl = vec2(twx * uRes.x, (uv.y - deckY - towerH) * uRes.y);
  col += vec3(1.0, 0.12, 0.08) * exp(-dot(tl, tl) / (6.0 + 40.0 * a)) * (0.3 + 0.7 * blink) * 2.5;

  return vec4(col * vis, sil * vis);
}

// What is behind the glass: warm light, the bokeh of table lamps, someone crossing.
// Only resolved when the camera is close enough to see it.
vec3 interior(vec2 w, float id, float close) {
  vec3 col = mix(vec3(1.0, 0.60, 0.32), vec3(1.0, 0.80, 0.56), smoothstep(0.0, 0.95, w.y));
  col *= 1.35 + 0.4 * hash21(vec2(id, 3.0));
  if (close > 0.01) {
    vec3 b = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      vec2 hc = hash22(vec2(id * 7.0 + float(i), 11.0));
      vec2 c = vec2(hc.x, 0.28 + 0.62 * hc.y);
      float r = 0.05 + 0.12 * fract(hc.x * 9.1);
      float dd = length((w - c) * vec2(1.0, 1.25));
      b += mix(vec3(1.0, 0.92, 0.78), vec3(1.0, 0.62, 0.32), fract(hc.y * 5.3)) * smoothstep(r, r * 0.72, dd);
    }
    float table = smoothstep(0.035, 0.0, abs(w.y - 0.3));
    float fx = fract(hash21(vec2(id, 2.0)) + uTime * 0.012);
    float figure = smoothstep(0.09, 0.04, abs(w.x - fx)) * smoothstep(0.78, 0.6, w.y) * smoothstep(0.1, 0.3, w.y);
    col = col * (1.0 - close * (0.28 * table + 0.45 * figure)) + b * close * 0.9;
    // sheen on the pane
    col += vec3(0.9, 0.95, 1.0) * smoothstep(0.02, 0.0, abs(w.x - w.y * 0.35 - 0.62)) * 0.18 * close;
  }
  return col;
}

// Tosun Paşa, abstracted to what the eye keeps at night: a long body of warm windows.
// Returns rgb and alpha. p = uv.
vec4 shipLayer(vec2 p) {
  if (uShipOn <= 0.001) return vec4(0.0);
  float L = uShip.z, H = uShip.w;
  float u = (p.x - uShip.x) / L + SHIP_FOCUS.x;
  float v = (p.y - uShip.y) / H + SHIP_FOCUS.y;
  if (u < -0.03 || u > 1.06 || v < -0.02 || v > 1.35) return vec4(0.0);
  float pu = 1.0 / (uRes.x * L), pv = 1.0 / (uRes.y * H);
  float close = smoothstep(2.5, 16.0, L);

  vec3 hullC = mix(vec3(0.062, 0.070, 0.088), vec3(0.030, 0.034, 0.046), uNight);
  vec3 col = vec3(0.0);
  float al = 0.0;

  // hull: raked bow on the right, lit from its own deck
  float bowX = 0.935 + 0.065 * clamp(v / 0.34, 0.0, 1.0);
  float hull = smoothstep(-pu, pu, u - 0.01) * smoothstep(pu, -pu, u - bowX) * smoothstep(pv, -pv, v - 0.34);
  col = mix(col, mix(hullC * 0.8, hullC * 2.4, smoothstep(0.02, 0.34, v)), hull);
  al = max(al, hull);
  col += WARMW * 0.9 * hull * exp(-abs(v - 0.335) / (pv * 1.4)) * step(0.02, u) * step(u, 0.99);
  // portholes
  float kp = (u - 0.07) / 0.036;
  vec2 pd = vec2((fract(kp) - 0.5) * 0.036 / pu, (v - 0.2) / pv);
  float pr = 0.028 / pv;
  float port = smoothstep(pr + 1.0, pr - 1.0, length(pd)) * step(0.07, u) * step(u, 0.5);
  col = mix(col, WARMW * 1.5, port * hull);

  // main saloon: the long row of windows
  float cab1 = smoothstep(-pu, pu, u - 0.045) * smoothstep(pu, -pu, u - 0.905)
             * smoothstep(-pv, pv, v - 0.34) * smoothstep(pv, -pv, v - 0.63);
  col = mix(col, hullC * 1.3, cab1); al = max(al, cab1);
  float pitch1 = 0.0286;
  float k1 = (u - 0.05) / pitch1;
  float cu1 = 0.05 + (floor(k1) + 0.5) * pitch1;
  float hw1 = pitch1 * 0.42;
  float in1 = step(0.05, u) * step(u, 0.9);
  vec2 wd1 = vec2(max(abs(u - cu1) - hw1, 0.0) / pu, max(abs(v - 0.485) - 0.09, 0.0) / pv);
  float win1 = smoothstep(1.0, 0.0, max(wd1.x, wd1.y)) * in1;
  vec2 wl1 = vec2((u - cu1 + hw1) / (2.0 * hw1), (v - 0.395) / 0.18);
  vec3 inside1 = interior(wl1, floor(k1), close);
  float glow1 = exp(-length(wd1) / (5.0 + 40.0 * close)) * in1 * cab1;
  col += vec3(1.0, 0.62, 0.34) * glow1 * 0.45;
  col = mix(col, inside1, win1);

  // upper deck
  float cab2 = smoothstep(-pu, pu, u - 0.14) * smoothstep(pu, -pu, u - 0.79)
             * smoothstep(-pv, pv, v - 0.63) * smoothstep(pv, -pv, v - 0.86);
  col = mix(col, hullC * 1.15, cab2); al = max(al, cab2);
  float pitch2 = 0.041;
  float k2 = (u - 0.145) / pitch2;
  float cu2 = 0.145 + (floor(k2) + 0.5) * pitch2;
  float hw2 = pitch2 * 0.44;
  float in2 = step(0.145, u) * step(u, 0.785);
  vec2 wd2 = vec2(max(abs(u - cu2) - hw2, 0.0) / pu, max(abs(v - 0.745) - 0.075, 0.0) / pv);
  float win2 = smoothstep(1.0, 0.0, max(wd2.x, wd2.y)) * in2;
  float stage = 0.5 + 0.5 * sin(uTime * 0.9 + floor(k2) * 0.8);
  vec3 inside2 = mix(vec3(1.0, 0.66, 0.40), vec3(1.0, 0.46, 0.34), stage * (0.3 + 0.7 * uNight)) * (1.15 + 0.3 * hash21(vec2(floor(k2), 9.0)));
  col += vec3(1.0, 0.55, 0.35) * exp(-length(wd2) / 5.0) * in2 * cab2 * 0.35;
  col = mix(col, inside2, win2);

  // roof rail + festoon lights
  float rail = smoothstep(pv * 1.2, 0.0, abs(v - 0.875)) * step(0.12, u) * step(u, 0.81);
  col = mix(col, hullC * 1.8, rail); al = max(al, rail);
  float sag = 0.918 - 0.024 * sin(3.14159 * fract((u - 0.12) / 0.0725));
  vec2 fd = vec2((fract((u - 0.12) / 0.0145) - 0.5) * 0.0145 / pu, (v - sag) / pv);
  float fest = exp(-dot(fd, fd) / 4.0) * step(0.12, u) * step(u, 0.81);
  col += WARMW * fest * 2.2;
  al = max(al, fest);

  // wheelhouse + mast
  float wh = smoothstep(-pu, pu, u - 0.70) * smoothstep(pu, -pu, u - 0.785)
           * smoothstep(-pv, pv, v - 0.86) * smoothstep(pv, -pv, v - 1.0);
  col = mix(col, hullC * 1.2, wh); al = max(al, wh);
  float whw = wh * smoothstep(pv, -pv, abs(v - 0.94) - 0.022) * step(0.71, u) * step(u, 0.775);
  col = mix(col, vec3(0.50, 0.58, 0.66) * 0.4, whw);
  float mast = smoothstep(pu * 1.5, 0.0, abs(u - 0.742)) * step(1.0, v) * step(v, 1.24);
  col = mix(col, hullC * 1.5, mast); al = max(al, mast);
  vec2 md = vec2((u - 0.742) / pu, (v - 1.24) / pv);
  float mh = exp(-dot(md, md) / 10.0);
  col += vec3(1.0) * mh * 2.0;
  // starboard light: we are south of her, she is heading east
  vec2 sd = vec2((u - 0.79) / pu, (v - 0.9) / pv);
  float sl = exp(-dot(sd, sd) / 8.0);
  col += vec3(0.1, 1.0, 0.45) * sl * 1.6;
  al = max(al, clamp(mh + sl, 0.0, 1.0));

  return vec4(col, al * uShipOn);
}

// what stands above the water: sky, far shore, bridge, words, ship
vec3 above(vec2 uv, float streak, float blur, float withType) {
  float h = uHorizon;
  vec3 col = skyColor(uv);
  float lt = landTop(uv.x);
  float land = step(uv.y, h + lt);
  col = mix(col, mix(vec3(0.028, 0.033, 0.050), vec3(0.012, 0.014, 0.022), uNight), land * step(h, uv.y));

  vec4 br = bridgeLayer(uv);
  col = mix(col, vec3(0.02, 0.024, 0.035), br.a * 0.85);
  col += br.rgb;

  vec2 q = vec2(uv.x * uRes.x, (uv.y - h) * uRes.y);
  float night = 0.75 + 0.5 * uNight;
  col += lightLayer(q, 6.0, 1.0, 0.55, 0.9, streak) * 0.55 * night;
  col += lightLayer(q, 13.0, 7.0, 0.42, 1.25, streak) * 0.9 * night;

  // hero words, only ever seen as reflections (the DOM draws the upright ones)
  if (uTypeOn * withType > 0.001) {
    vec3 ink = CREAM * withType;
    vec2 la = (uv - uWordA.xy) / (uWordA.zw - uWordA.xy);
    if (la.x > 0.0 && la.x < 1.0 && la.y > 0.0 && la.y < 1.0) {
      float t = texture2D(uType, mix(uAtlasA.xy, uAtlasA.zw, la), blur).a;
      t *= 1.0 - smoothstep(uTypeReveal - 0.04, uTypeReveal, la.y);
      col = mix(col, ink, t * uTypeOn);
    }
    vec2 lb = (uv - uWordB.xy) / (uWordB.zw - uWordB.xy);
    if (lb.x > 0.0 && lb.x < 1.0 && lb.y > 0.0 && lb.y < 1.0) {
      float t = texture2D(uType, mix(uAtlasB.xy, uAtlasB.zw, lb), blur).a;
      t *= 1.0 - smoothstep(uTypeReveal - 0.04, uTypeReveal, lb.y);
      col = mix(col, ink, t * uTypeOn);
    }
  }
  return col;
}

vec2 waveGrad(vec2 w, float t, float detail) {
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(0.3, 1.0));
  vec2 d2 = normalize(vec2(-0.7, 1.0));
  vec2 d3 = normalize(vec2(1.0, 0.2));
  vec2 d4 = normalize(vec2(-0.2, -1.0));
  g += d1 * cos(dot(w, d1) * 9.0 + t * 1.3) * 0.050;
  g += d2 * cos(dot(w, d2) * 15.0 + t * 1.9) * 0.034;
  g += d3 * cos(dot(w, d3) * 27.0 - t * 2.4) * 0.020 * detail;
  g += d4 * cos(dot(w, d4) * 46.0 + t * 3.1) * 0.012 * detail;
  // the Bosphorus current runs south: chop drifts toward the viewer
  vec2 n = w * vec2(6.0, 4.0) + vec2(0.0, t * 0.45);
  float e = 0.05;
  float c = vnoise(n);
  g += vec2(vnoise(n + vec2(e, 0.0)) - c, vnoise(n + vec2(0.0, e)) - c) / e * 0.018 * detail;
  return g;
}

vec2 ripples(vec2 uv, float asp) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.0) continue;
    vec2 d = (uv - r.xy) * vec2(asp, 1.0);
    d.y *= 2.4; // foreshortened circles on a receding plane
    float dist = length(d);
    float front = r.z * 0.22;
    float env = exp(-pow((dist - front) * 14.0, 2.0)) * exp(-r.z * 1.1) * r.w;
    g += normalize(d + 1e-5) * sin((dist - front) * 90.0) * env * 0.22;
  }
  return g;
}

vec3 horizonView(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float h = uHorizon;
  vec4 ship = shipLayer(uv);

  if (uv.y >= h) {
    vec3 col = above(uv, 1.0, 0.0, 0.0);
    return mix(col, ship.rgb, ship.a);
  }

  float d = h - uv.y;
  float z = 0.06 / max(d, 0.0015);
  vec2 w = vec2((uv.x - 0.5) * asp * z, z + uFwd);
  float detail = smoothstep(0.0, 0.1, d);
  vec2 g = waveGrad(w, uTime, detail) * mix(0.4, 1.0, detail);
  g += ripples(uv, asp);

  // near the viewer every facet throws the reflection further: long, broken columns
  vec2 r = vec2(uv.x + g.x * (0.006 + 0.07 * d), h + d + g.y * (0.012 + 0.8 * d));
  float streak = 3.0 + d * 28.0;
  float typeK = (1.0 - smoothstep(0.0, 0.6, d)) * 0.62;
  vec3 refl = above(r, streak, 1.5 + d * 14.0, typeK);

  // the ship's own reflection is folded around her waterline, not the horizon
  if (uShipOn > 0.001) {
    float wl = uShip.y - SHIP_FOCUS.y * uShip.w;
    if (uv.y < wl) {
      float sd = wl - uv.y;
      vec2 rs = vec2(uv.x + g.x * (0.03 + 0.14 * sd), wl + sd + g.y * (0.06 + 1.4 * sd));
      vec4 sr = shipLayer(rs);
      refl = mix(refl, sr.rgb * 0.7, sr.a * 0.9);
    }
  }

  // between facets the water shows the dark sky instead: slivers
  float sl = sin(w.y * 3.1 + g.y * 38.0 + uTime * 0.6) + g.y * 9.0;
  float sliver = mix(1.0, smoothstep(-0.5, 0.6, sl), smoothstep(0.015, 0.18, d));
  refl *= mix(0.28, 1.0, sliver);

  float fres = mix(0.92, 0.26, smoothstep(0.0, 0.5, d));
  vec3 deep = mix(vec3(0.020, 0.032, 0.052), vec3(0.006, 0.010, 0.019), uNight);
  vec3 col = mix(deep, refl, fres);
  col += skyColor(vec2(uv.x, h + 0.02)) * 0.1 * (1.0 - smoothstep(0.0, 0.2, d));
  col = mix(col, ship.rgb, ship.a);
  return col;
}

// ───────────────────────────── aerial view ─────────────────────────────

float straitCenter(float y) {
  return 0.10 * sin(y * 1.25 + 0.6) + 0.045 * sin(y * 2.9 + 2.0);
}
float straitHalf(float y) {
  return 0.20 + 0.05 * sin(y * 1.9 + 1.3) + 0.02 * sin(y * 5.3);
}

vec3 cityGlow(vec2 w, float px, float dx) {
  // districts: dense cores, dark parks and ridges, a street grid that turns with the hills
  float dens = smoothstep(0.22, 0.68, fbm(w * 2.6 + 4.0)) * smoothstep(0.0, 0.02, dx);
  float ang = fbm(w * 0.9 + 11.0) * 2.4;
  vec2 gp = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * w * 150.0;
  vec2 gf = abs(fract(gp) - 0.5);
  // blocks shrink to a few pixels when the camera rises: fade the grid before it aliases
  float blockPx = 1.0 / (150.0 * px);
  float street = smoothstep(0.1, 0.0, min(gf.x, gf.y)) * dens * smoothstep(5.0, 12.0, blockPx);
  vec3 col = SODIUM * street * 0.34;
  col += SODIUM * dens * 0.07; // haze over the lit districts

  vec2 q = w / px;
  float cell = 5.0;
  vec2 id = floor(q / cell);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = id + vec2(float(i), float(j));
      float r = hash21(c);
      if (r > dens * 0.85) continue;
      vec2 o = hash22(c + 3.1);
      vec2 d = q - (c + 0.2 + 0.6 * o) * cell;
      col += lightTint(fract(r * 7.3)) * exp(-dot(d, d) / 1.1) * (0.45 + 0.8 * fract(r * 17.0));
    }
  }
  return col;
}

vec3 aerialView(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float scale = 1.35 / uZoom;
  vec2 w = vec2((uv.x - 0.5) * asp, uv.y - 0.5) * scale + vec2(0.0, uFwd);
  float cx = straitCenter(w.y);
  float hw = straitHalf(w.y);
  float dx = abs(w.x - cx) - hw; // < 0 water, > 0 land
  float px = scale / uRes.y;

  vec3 col;
  vec2 g = waveGrad(w * 2.2, uTime, 1.0) + ripples(uv, asp) * 0.6;
  if (dx < 0.0) {
    vec3 deep = mix(vec3(0.016, 0.026, 0.044), vec3(0.005, 0.009, 0.016), uNight);
    col = deep * (0.8 + 0.5 * (g.x + g.y));
    // the shore reflected: warm, trembling, fading into the channel
    float spill = exp(dx * 30.0);
    float tremble = 0.6 + 0.4 * sin(w.y * 120.0 + g.x * 40.0 + uTime);
    col += SODIUM * spill * 0.16 * tremble;
    // scattered glints where the chop catches the city
    float gl = pow(max(0.0, g.x * 0.6 + g.y * 0.8), 4.0) * 400.0;
    col += WARMW * gl * 0.04 * (0.3 + 0.7 * exp(dx * 8.0));
  } else {
    col = mix(vec3(0.030, 0.032, 0.042), vec3(0.013, 0.014, 0.020), uNight);
    col += cityGlow(w, px, dx) * (0.85 + 0.35 * uNight);
    // coastal road
    col += SODIUM * exp(-dx / (px * 2.2)) * 0.8 * (0.7 + 0.3 * step(0.5, fract(w.y * 180.0)));
  }

  // bridges crossing the strait
  for (int b = 0; b < 2; b++) {
    float by = b == 0 ? 1.55 : 4.4;
    float bd = (w.y - by) / px;
    float span = smoothstep(straitHalf(by) + 0.07, straitHalf(by) + 0.03, abs(w.x - straitCenter(by)));
    col = mix(col, vec3(0.015, 0.016, 0.02), exp(-bd * bd / 30.0) * span * 0.8);
    float lamps = smoothstep(0.35, 0.0, abs(fract(w.x * 90.0) - 0.5) * 2.0);
    col += WARMW * exp(-pow(abs(bd) - 3.5, 2.0) / 1.2) * (0.35 + 0.9 * lamps) * span * 1.2;
    col += WARMW * exp(-abs(bd) / 12.0) * span * 0.06;
  }

  // the vessel from above: long hull, bow to the north, a lit roof deck, a wake
  if (uShipOn > 0.001) {
    vec2 s = (uv - uShip.xy) * vec2(asp, 1.0);
    float L = uShip.z, W = uShip.w;
    vec2 k = vec2(s.x / (W * 0.5), s.y / (L * 0.5));
    float halfW = k.y < 0.35 ? 1.0 : sqrt(max(0.0, 1.0 - (k.y - 0.35) / 0.65));
    float edge = 1.5 / (uRes.y * W * 0.5);
    float body = smoothstep(edge, -edge, abs(k.x) - halfW) * smoothstep(-1.0 - edge, -1.0 + edge, k.y) * step(k.y, 1.0);
    float roof = smoothstep(edge, -edge, abs(k.x) - halfW * 0.78) * smoothstep(-0.86, -0.84, k.y) * step(k.y, 0.75);
    vec3 hullTop = vec3(0.05, 0.055, 0.065);
    float close = smoothstep(2.0, 10.0, L / 0.3);
    vec3 deck = mix(vec3(0.95, 0.60, 0.34), vec3(1.0, 0.82, 0.60), smoothstep(1.0, 0.0, length(k * vec2(1.0, 0.8))));
    deck *= 0.75 + 0.5 * close;
    // table lamps on deck
    vec2 tg = vec2(k.x * 3.0, k.y * 9.0);
    vec2 tf = (fract(tg) - 0.5) / vec2(3.0, 9.0) * vec2(W * 0.5, L * 0.5) * uRes.y;
    float lampPx = 1.6 + close * 30.0;
    float lamps = exp(-dot(tf, tf) / (lampPx * lampPx)) * roof;
    vec3 ship = mix(hullTop, deck, roof) + WARMW * lamps * 1.4;
    // perimeter festoon
    float rim = exp(-pow((abs(k.x) - halfW * 0.9) * W * 0.5 * uRes.y / 1.2, 2.0)) * step(-0.95, k.y) * step(k.y, 0.9);
    ship += WARMW * rim * 1.1;
    col = mix(col, ship, body * uShipOn);
    // wake: two arms spreading south of the stern
    float behind = -k.y - 1.0;
    if (behind > 0.0) {
      float spread = 0.9 + behind * 0.55;
      float arms = exp(-pow((abs(k.x) - spread) * 4.0, 2.0)) + 0.6 * exp(-pow(k.x * 2.2, 2.0));
      col += vec3(0.55, 0.62, 0.7) * arms * exp(-behind * 0.8) * 0.22 * uShipOn;
    }
    col += WARMW * exp(-max(length(k) - 1.0, 0.0) * 3.0) * 0.08 * uShipOn;
  }
  return col;
}

void main() {
  vec2 uv = vUv;
  vec3 col = uAerial > 0.5 ? aerialView(uv) : horizonView(uv);

  col *= uExposure;
  col = 1.0 - exp(-col * 1.35);
  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.55;
  // warm window light takes over while boarding; CREAM must match --cloth exactly
  col = mix(col, CREAM, uWarm);
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) / 255.0 * 1.5;
  gl_FragColor = vec4(col, 1.0);
}
