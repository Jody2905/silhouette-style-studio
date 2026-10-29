import { analyseBody, faceShapeOf, type FaceShape, type Profile } from "@silhouette/engine";

export type Pt = [number, number];

/** Catmull-Rom spline through points, as an SVG path fragment (no leading M). */
export function curve(points: Pt[], tension = 0.5): string {
  if (points.length < 2) return "";
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Closed symmetric shape: left-side points top→bottom are mirrored to the right side. */
export function mirrored(cx: number, left: Pt[], tension = 0.5, closeBottom = true): string {
  const right = [...left].reverse().map(([x, y]) => [2 * cx - x, y] as Pt);
  const start = left[0];
  return `M${start[0].toFixed(1)},${start[1].toFixed(1)}${curve(left, tension)} L${right[0][0].toFixed(1)},${right[0][1].toFixed(1)}${curve(right, tension)}${closeBottom ? " Z" : ""}`;
}

/** The avatar's measured skeleton: key heights and half-widths, in SVG units. */
export interface Figure {
  cx: number;
  H: number;
  top: number;
  y: { headCy: number; chin: number; neck: number; shoulder: number; bust: number; underbust: number; waist: number; highHip: number; hip: number; crotch: number; knee: number; calf: number; ankle: number; floor: number };
  w: { head: number; neck: number; shoulder: number; bust: number; waist: number; hip: number; thigh: number; knee: number; calf: number; ankle: number };
  legX: number;
  armTop: Pt;
  wrist: Pt;
  headRx: number;
  headRy: number;
  face: FaceShape;
  masc: boolean;
  /** Real arm positions (photo mode); when absent arms are posed from the measurements. */
  arms?: { left: { pts: Pt[]; widths: number[] }; right: { pts: Pt[]; widths: number[] } };
}

export const VIEW_W = 400;
export const VIEW_H = 780;

export function buildFigure(p: Profile): Figure {
  const H = 700;
  const top = 34;
  const cx = VIEW_W / 2;
  const body = analyseBody(p);
  const s = body.silhouette;
  const k = H / p.heightCm;
  const legRatio = Math.max(0.46, Math.min(0.56, s.legRatio));
  const masc = p.wardrobe === "menswear";

  const headH = H / 7.6;
  const y = {
    headCy: top + headH / 2,
    chin: top + headH,
    neck: top + headH + H * 0.03,
    shoulder: top + H * 0.178,
    bust: 0,
    underbust: 0,
    waist: 0,
    highHip: 0,
    hip: 0,
    crotch: 0,
    knee: top + H * 0.73,
    calf: top + H * 0.82,
    ankle: top + H * 0.955,
    floor: top + H,
  };
  y.hip = top + H * (1 - legRatio);
  y.crotch = y.hip + H * 0.035;
  y.waist = y.hip - H * 0.115;
  y.highHip = y.waist + (y.hip - y.waist) * 0.55;
  y.bust = y.shoulder + (y.waist - y.shoulder) * 0.42;
  y.underbust = y.shoulder + (y.waist - y.shoulder) * 0.62;

  const clampW = (cm: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, (cm * k) / 2));
  const shoulder = clampW(s.shoulder, 58, 118);
  const hip = clampW(s.hip, 54, 120);
  const w = {
    head: (headH * 0.38),
    neck: masc ? 15 : 12,
    shoulder,
    bust: clampW(s.bust, 48, 120),
    waist: clampW(s.waist, 36, 125),
    hip,
    thigh: hip * 0.5,
    knee: H * 0.03,
    calf: H * 0.032,
    ankle: H * 0.016,
  };
  const face = faceShapeOf(p).shape ?? "oval";
  const headRx = headH * (face === "round" || face === "square" ? 0.4 : face === "oblong" ? 0.32 : 0.36);
  const headRy = headH * (face === "oblong" ? 0.55 : face === "round" ? 0.49 : 0.52);

  return {
    cx,
    H,
    top,
    y,
    w,
    legX: hip * 0.48,
    armTop: [cx - shoulder + 6, y.shoulder + 8],
    wrist: [cx - hip - 22, y.crotch + H * 0.02],
    headRx,
    headRy,
    face,
    masc,
  };
}

/** Darkens (negative) or lightens (positive) a hex colour by an amount from -1 to 1. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const SKIN_DEFAULT: Record<Profile["skinDepth"], string> = {
  fair: "#f3d7c6",
  light: "#e8bfa3",
  medium: "#c99572",
  tan: "#a4704d",
  deep: "#6b4430",
};

export { HAIR_HEX } from "@silhouette/engine";
