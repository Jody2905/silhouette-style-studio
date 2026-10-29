// Turns the photo's person outline + skeleton into a per-pixel body map (torso, arms, legs, feet), then builds
// garment masks from it. Everything comes from the photo itself, so clothes can only land on the real body.
import { ITEM, type Outfit } from "@silhouette/engine";
import type { PhotoScene } from "../vision/analyse";

export const enum Part {
  None = 0,
  Neck = 1,
  Torso = 2,
  UpperArm = 3,
  Forearm = 4,
  Hand = 5,
  Thigh = 6,
  Shin = 7,
  Foot = 8,
}

type P = { x: number; y: number };

export interface BodyMap {
  W: number;
  H: number;
  /** Body coverage 0–255 (person minus hair and face). */
  alpha: Uint8ClampedArray;
  part: Uint8Array;
  /** Position down the torso axis: 0 at the shoulders, 1 at the hip joints (defined for every pixel). */
  v: Float32Array;
  /** Sideways position across the torso: 0 at the centre line, ±1 at the torso's edges. */
  u: Float32Array;
  /** Position along the limb a pixel belongs to: 0 at its top joint, 1 at its bottom joint. */
  t: Float32Array;
  /** Key levels, in photo y. */
  y: { shoulder: number; hip: number; knee: number; ankle: number };
  /** Half the shoulder width in pixels (a scale for everything else). */
  S: number;
  legsVisible: boolean;
}

const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Builds the body map once per photo. Returns null if the shoulders and hips weren't found. */
export function buildBodyMap(scene: PhotoScene, bodyCanvas: HTMLCanvasElement): BodyMap | null {
  const p = scene.pose;
  if (!p) return null;
  const vis = (i: number) => p[i].v > 0.5;
  if (![11, 12, 23, 24].every(vis)) return null;
  const { W, H } = scene;
  const alpha = bodyCanvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;

  const sh = mid(p[11], p[12]);
  const hp = mid(p[23], p[24]);
  const ax = hp.x - sh.x, ay = hp.y - sh.y;
  const L2 = ax * ax + ay * ay;
  const L = Math.sqrt(L2);
  const S = Math.max(8, Math.hypot(p[11].x - p[12].x, p[11].y - p[12].y) / 2);
  // Hip joints sit well inside the hips; the outer hip is ~1.6x their spacing.
  const hipHalf = Math.max(S * 0.75, (Math.hypot(p[23].x - p[24].x, p[23].y - p[24].y) / 2) * 1.6);
  const legsVisible = [25, 26, 27, 28].every(vis);

  // Limb segments: [from, to, part, radius].
  const ext = (a: P, b: P, k: number): P => ({ x: b.x + (b.x - a.x) * k, y: b.y + (b.y - a.y) * k });
  const segs: { a: P; b: P; part: Part; r: number }[] = [];
  for (const [s, e, w] of [[11, 13, 15], [12, 14, 16]]) {
    segs.push({ a: p[s], b: p[e], part: Part.UpperArm, r: S * 0.32 });
    segs.push({ a: p[e], b: p[w], part: Part.Forearm, r: S * 0.26 });
    segs.push({ a: p[w], b: ext(p[e], p[w], 0.4), part: Part.Hand, r: S * 0.22 });
  }
  for (const [h, k, a, toe] of [[23, 25, 27, 31], [24, 26, 28, 32]]) {
    segs.push({ a: p[h], b: p[k], part: Part.Thigh, r: S * 0.42 });
    segs.push({ a: p[k], b: p[a], part: Part.Shin, r: S * 0.3 });
    segs.push({ a: p[a], b: p[toe], part: Part.Foot, r: S * 0.26 });
  }

  // Ankle height on each side, by which half of the image the pixel is in.
  const ankleMidX = (p[27].x + p[28].x) / 2;
  const leftAnkle = p[27].x < p[28].x ? p[27] : p[28], rightAnkle = p[27].x < p[28].x ? p[28] : p[27];
  const ankleY = (x: number) => (x < ankleMidX ? leftAnkle.y : rightAnkle.y);
  const n = W * H;
  const part = new Uint8Array(n);
  const v = new Float32Array(n);
  const u = new Float32Array(n);
  const t = new Float32Array(n);
  for (let yy = 0; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      const i = yy * W + xx;
      const dx = xx - sh.x, dy = yy - sh.y;
      const vv = (dx * ax + dy * ay) / L2;
      const perp = (dx * ay - dy * ax) / L; // signed sideways distance
      const half = S + (hipHalf - S) * Math.min(1, Math.max(0, vv));
      const uu = perp / half;
      v[i] = vv;
      u[i] = uu;
      if (alpha[i * 4 + 3] < 100) continue;

      // Torso: inside the shoulder-to-hip band.
      const outV = Math.max(0, -vv, vv - 1.08) * L;
      const outU = Math.max(0, Math.abs(uu) - 1) * half;
      let best = Math.hypot(outV, outU) / (S * 0.3);
      // Above the shoulders only the neck counts; the head (and hair) is never clothed.
      const neckTop = -Math.min(0.32, (S * 0.55) / L);
      let bestPart: Part = vv < 0 && Math.abs(perp) < S * 0.42 ? (vv > neckTop ? Part.Neck : Part.None) : vv < -0.12 ? Part.None : Part.Torso;
      if (bestPart === Part.Neck) best = 0;
      if (bestPart === Part.None) best = 1.5; // only a limb clearly in reach (raised arm) can claim it
      let bestT = 0;
      for (const s of segs) {
        const sx = s.b.x - s.a.x, sy = s.b.y - s.a.y;
        const len2 = sx * sx + sy * sy || 1;
        const tt = Math.min(1.25, Math.max(-0.1, ((xx - s.a.x) * sx + (yy - s.a.y) * sy) / len2));
        const tc = Math.min(1, Math.max(0, tt));
        const d = Math.hypot(xx - (s.a.x + sx * tc), yy - (s.a.y + sy * tc)) / s.r;
        // Arms hanging beside the waist can sit inside the torso band: an arm wins there if the pixel is well within it.
        const isArm = s.part === Part.UpperArm || s.part === Part.Forearm || s.part === Part.Hand;
        const beats = best > 0 ? d < best : isArm && d < 0.85 && Math.abs(uu) > 0.55;
        if (beats) {
          best = d;
          bestPart = s.part;
          bestT = tt;
        }
      }
      if (best > 3.2 || bestPart === Part.None) continue; // head, or a stray blob that isn't part of this body
      // The foot starts at the ankle: anything above it is still the shin (often a trouser hem).
      if (bestPart === Part.Foot && yy < ankleY(xx) - S * 0.05) {
        bestPart = Part.Shin;
        bestT = 1;
      }
      part[i] = bestPart;
      t[i] = bestT;
    }
  }
  const lv = (a: number, b: number) => (p[a].y + p[b].y) / 2;
  return {
    W, H, alpha, part, v, u, t, S, legsVisible,
    y: { shoulder: sh.y, hip: hp.y, knee: lv(25, 26), ankle: lv(27, 28) },
  };
}

/* ------------------------------------------------------------------ */
/* Garment masks                                                        */
/* ------------------------------------------------------------------ */

export type Mask = Uint8ClampedArray; // one byte per pixel, 0–255

const SLEEVE: Record<string, [number, number]> = {
  // [upper-arm reach, forearm reach] as fractions along each segment
  none: [0, 0],
  short: [0.5, 0],
  puff: [0.55, 0],
  elbow: [1.05, 0],
  long: [1.3, 1.02],
};

/** Neckline depth (in torso units, 0 = shoulder line) at sideways position u. Negative = no cut there. */
function necklineDepth(neck: string | undefined, u: number): number {
  const a = Math.abs(u);
  switch (neck) {
    case "v": return a < 0.42 ? 0.34 * (1 - a / 0.42) + 0.02 : -1;
    case "scoop": return a < 0.5 ? 0.22 * (1 - (a / 0.5) ** 2) + 0.02 : -1;
    case "square": return a < 0.44 ? 0.2 : -1;
    case "sweetheart": return a < 0.5 ? 0.24 - 0.06 * Math.cos((a / 0.5) * Math.PI * 2) : -1;
    case "boat": return a < 0.72 ? 0.04 : -1;
    case "cowl": return a < 0.5 ? 0.16 * (1 - (a / 0.5) ** 2) + 0.02 : -1;
    case "halter": return a > 0.5 ? 0.3 : 0.18 * (1 - a / 0.5) + 0.03;
    case "collar": return a < 0.16 ? 0.12 : a < 0.4 ? 0.04 : -1;
    case "turtle": return -1;
    default: return a < 0.42 ? 0.08 * (1 - (a / 0.42) ** 2) + 0.02 : -1; // crew
  }
}

export interface UpperSpec {
  neckline?: string;
  sleeve?: string;
  /** Hem position on the torso axis (1 = hip joints). */
  hemV: number;
  /** Open front (jackets, cardigans): no fabric within this |u| below the collar. */
  openFront?: number;
}

/** Torso + sleeves, from the neckline down to the hem. */
export function upperMask(m: BodyMap, s: UpperSpec): Mask {
  const out = new Uint8ClampedArray(m.W * m.H);
  const [ua, fa] = SLEEVE[s.sleeve ?? "short"] ?? SLEEVE.short;
  for (let i = 0; i < out.length; i++) {
    const pt = m.part[i];
    if (!pt) continue;
    const vv = m.v[i], uu = m.u[i];
    let on = false;
    if (pt === Part.Torso || pt === Part.Thigh || pt === Part.Neck) {
      if (pt === Part.Neck) on = s.neckline === "turtle";
      else on = vv <= s.hemV && vv >= Math.max(-0.1, necklineDepth(s.neckline, uu));
      if (on && s.openFront && Math.abs(uu) < s.openFront * Math.min(1, Math.max(0.15, vv / 0.35))) on = false;
    } else if (pt === Part.UpperArm) on = m.t[i] <= ua && m.v[i] <= s.hemV + 0.2;
    else if (pt === Part.Forearm) on = m.t[i] <= fa;
    if (on) out[i] = m.alpha[i * 4 + 3];
  }
  return out;
}

/** Trousers and shorts: hips from the rise down, both legs to the given reach along the leg. */
export function trouserMask(m: BodyMap, riseV: number, reach: { thigh: number; shin: number }): Mask {
  const out = new Uint8ClampedArray(m.W * m.H);
  for (let i = 0; i < out.length; i++) {
    const pt = m.part[i];
    let on = false;
    if (pt === Part.Torso) on = m.v[i] >= riseV;
    else if (pt === Part.Thigh) on = m.v[i] >= riseV && m.t[i] <= reach.thigh;
    else if (pt === Part.Shin) on = m.t[i] <= reach.shin;
    if (on) out[i] = m.alpha[i * 4 + 3];
  }
  return out;
}

/**
 * Skirts (and a dress's skirt): from the rise down to the hem, filled across each row from the outer edge of one leg
 * to the other, so it hangs across the gap between the legs. Arms and hands in front stay visible.
 */
export function skirtMask(m: BodyMap, riseV: number, hemY: number, flare: number): Mask {
  const { W, H } = m;
  const out = new Uint8ClampedArray(W * H);
  let topY = H;
  for (let i = 0; i < out.length; i++) {
    const pt = m.part[i];
    if ((pt === Part.Torso || pt === Part.Thigh) && m.v[i] >= riseV) topY = Math.min(topY, Math.floor(i / W));
  }
  for (let yy = Math.max(0, topY); yy < Math.min(H, Math.round(hemY)); yy++) {
    let lo = W, hi = -1;
    for (let xx = 0; xx < W; xx++) {
      const i = yy * W + xx;
      const pt = m.part[i];
      if ((pt === Part.Torso || pt === Part.Thigh || pt === Part.Shin) && m.v[i] >= riseV) {
        if (xx < lo) lo = xx;
        hi = xx;
      }
    }
    if (hi < 0) continue;
    const grow = Math.max(0, yy - m.y.hip) * flare;
    for (let xx = Math.max(0, Math.round(lo - grow)); xx <= Math.min(W - 1, Math.round(hi + grow)); xx++) {
      const i = yy * W + xx;
      const pt = m.part[i];
      if ((pt === Part.Hand || pt === Part.Forearm) && m.alpha[i * 4 + 3] > 100) continue; // arm in front
      if (m.v[i] < riseV) continue;
      out[i] = 255;
    }
  }
  return out;
}

export function beltMask(m: BodyMap, from: number, to: number): Mask {
  const out = new Uint8ClampedArray(m.W * m.H);
  for (let i = 0; i < out.length; i++) if (m.part[i] === Part.Torso && m.v[i] >= from && m.v[i] <= to) out[i] = m.alpha[i * 4 + 3];
  return out;
}

/** Feet, plus the lower shin for boots (shaft = fraction of the shin covered). */
export function shoeMask(m: BodyMap, shaft: number): Mask {
  const out = new Uint8ClampedArray(m.W * m.H);
  for (let i = 0; i < out.length; i++) {
    const pt = m.part[i];
    if (pt === Part.Foot || (pt === Part.Shin && m.t[i] >= 1 - shaft)) out[i] = m.alpha[i * 4 + 3];
  }
  return out;
}

/** Pixels where the new look takes over from the old outfit (upper body, legs). */
export function zoneMask(m: BodyMap, upperToV: number | null, lowerFromV: number | null): Mask {
  const out = new Uint8ClampedArray(m.W * m.H);
  for (let i = 0; i < out.length; i++) {
    const pt = m.part[i];
    if (!pt || pt === Part.Hand || pt === Part.Foot) continue;
    const upper = upperToV != null && (pt === Part.UpperArm || pt === Part.Forearm || pt === Part.Neck || (pt === Part.Torso && m.v[i] <= upperToV));
    const lower = lowerFromV != null && (pt === Part.Thigh || pt === Part.Shin || (pt === Part.Torso && m.v[i] >= lowerFromV));
    if (upper || lower) out[i] = 255;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Outfit → masks                                                       */
/* ------------------------------------------------------------------ */

const TOP_HEM: Record<string, number> = { crop: 0.62, waist: 0.82, hip: 1.08, tunic: 1.3, long: 1.3 };
const RISE: Record<string, number> = { high: 0.72, mid: 0.86, low: 0.98 };

/** y of a hem given as a garment length, measured down the legs. */
function hemY(m: BodyMap, length: string | undefined): number {
  const { hip, knee, ankle } = m.y;
  switch (length) {
    case "mini": return hip + (knee - hip) * 0.45;
    case "short": return hip + (knee - hip) * 0.35;
    case "knee": return knee + (ankle - knee) * 0.06;
    case "midi": return knee + (ankle - knee) * 0.55;
    case "maxi": case "full": case "long": return ankle + (ankle - knee) * 0.08;
    default: return knee;
  }
}

const LEG_REACH: Record<string, { thigh: number; shin: number }> = {
  short: { thigh: 0.4, shin: 0 },
  cropped: { thigh: 1.3, shin: 0.82 },
  full: { thigh: 1.3, shin: 1.1 },
};

export interface Layer {
  slot: "bottom" | "top" | "dress" | "outer" | "belt" | "shoes";
  mask: Mask;
  sheer?: boolean;
}

/** Every garment in the look as a mask, in the order they're worn (inner layers first). */
export function outfitLayers(m: BodyMap, outfit: Outfit): { layers: Layer[]; zone: Mask | null } {
  const it = (s: keyof Outfit) => (outfit[s] ? ITEM[outfit[s]!.id] : undefined);
  const top = it("top"), bottom = it("bottom"), dress = it("dress"), outer = it("outer"), belt = it("belt"), shoes = it("shoes");
  const layers: Layer[] = [];

  let bottomLayer: Layer | null = null;
  let riseV: number | null = null;
  if (bottom) {
    const a = bottom.attrs;
    riseV = RISE[a.rise ?? "mid"];
    const mask = a.kind === "skirt"
      ? skirtMask(m, riseV, hemY(m, a.length), a.skirt === "a-line" || a.skirt === "pleated" ? 0.12 : a.skirt === "pencil" ? -0.03 : 0.05)
      : trouserMask(m, riseV, LEG_REACH[a.length ?? "full"] ?? LEG_REACH.full);
    bottomLayer = { slot: "bottom", mask };
  }
  if (dress) {
    const a = dress.attrs;
    const waistV = a.waist === "empire" ? 0.48 : a.waist === "drop" ? 1.0 : 0.8;
    const bodice = upperMask(m, { neckline: a.neckline, sleeve: a.sleeve, hemV: waistV + 0.05 });
    const lower = a.leg ? trouserMask(m, waistV, LEG_REACH[a.length ?? "full"] ?? LEG_REACH.full) : skirtMask(m, waistV, hemY(m, a.length), a.skirt === "a-line" || a.skirt === "fit-flare" || a.skirt === "wrap" ? 0.1 : 0.03);
    for (let i = 0; i < bodice.length; i++) if (lower[i] > bodice[i]) bodice[i] = lower[i];
    layers.push({ slot: "dress", mask: bodice });
    riseV = waistV;
  } else {
    const a = top?.attrs;
    const tucked = !!(top && bottom && bottom.attrs.rise === "high" && a!.fit !== "oversized" && a!.length !== "crop");
    const topLayer: Layer | null = top
      ? { slot: "top", sheer: !!a!.sheer, mask: upperMask(m, { neckline: a!.neckline, sleeve: a!.sleeve, hemV: tucked ? riseV! + 0.04 : TOP_HEM[a!.length ?? "hip"] ?? 1.08 }) }
      : null;
    // Tucked tops go under the waistband; untucked tops hang over it.
    if (tucked) {
      if (topLayer) layers.push(topLayer);
      if (bottomLayer) layers.push(bottomLayer);
    } else {
      if (bottomLayer) layers.push(bottomLayer);
      if (topLayer) layers.push(topLayer);
    }
  }
  if (dress && bottomLayer) layers.unshift(bottomLayer);

  if (outer) {
    const a = outer.attrs;
    const long = a.length === "long";
    const hem = a.length === "crop" ? 0.78 : 1.12;
    const sleeves = a.kind === "cape" ? "elbow" : "long";
    const mask = upperMask(m, { neckline: a.kind === "puffer" || a.kind === "cape" ? "crew" : "collar", sleeve: sleeves, hemV: long ? 1.3 : hem, openFront: a.kind === "puffer" ? 0 : 0.2 });
    if (long) {
      // Long coats fall from the hips to the knees, open at the front.
      const skirt = skirtMask(m, 1.0, hemY(m, "knee"), a.fit === "oversized" ? 0.08 : 0.04);
      for (let i = 0; i < mask.length; i++) if (skirt[i] && Math.abs(m.u[i]) >= 0.2) mask[i] = Math.max(mask[i], skirt[i]);
    }
    layers.push({ slot: "outer", mask });
  }
  if (belt) {
    const hip = belt.attrs.kind === "hip";
    layers.push({ slot: "belt", mask: beltMask(m, hip ? 0.98 : 0.78, hip ? 1.06 : 0.85) });
  }
  if (shoes && m.legsVisible) {
    const a = shoes.attrs;
    const shaft = a.kind === "boot" ? (shoes.id === "shoes-boots" ? 0.8 : 0.28) : a.kind === "sneaker" || a.kind === "loafer" || a.kind === "brogue" ? 0.06 : 0;
    const fullLegs = !!(bottom && bottom.attrs.length === "full" && bottom.attrs.kind !== "skirt") || !!dress?.attrs.leg;
    const layer: Layer = { slot: "shoes", mask: shoeMask(m, shaft) };
    // Full-length trousers fall over shoes; otherwise shoes go on last.
    if (fullLegs) {
      const idx = layers.findIndex((l) => l.slot === "bottom" || l.slot === "dress");
      layers.splice(Math.max(0, idx), 0, layer);
    } else layers.push(layer);
  }

  const wearsUpper = !!(top || dress || outer);
  const wearsLower = !!(bottom || dress);
  const zone = wearsUpper || wearsLower ? zoneMask(m, wearsUpper ? (riseV ?? 0.82) : null, wearsLower ? (riseV ?? 0.86) : null) : null;
  return { layers, zone };
}
