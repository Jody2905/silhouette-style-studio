import { ITEM } from "@silhouette/engine";
import { curve, mirrored, type Figure, type Pt } from "./geometry";

/* Garment and limb outlines shared by the avatar and the photo try-on. All paths use figure coordinates. */

export const f1 = (n: number) => n.toFixed(1);

/** Half-width of the body at a given height, interpolated between measured points. */
export function bodyHalf(F: Figure, y: number): number {
  const stops: [number, number][] = [
    [F.y.neck, F.w.neck],
    [F.y.shoulder + 10, F.w.shoulder],
    [F.y.bust, F.w.bust],
    [F.y.waist, F.w.waist],
    [F.y.hip, F.w.hip],
    [F.y.crotch, F.w.hip * 0.96],
  ];
  if (y <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, w0] = stops[i];
    const [y1, w1] = stops[i + 1];
    if (y <= y1) return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
  }
  return stops[stops.length - 1][1];
}

/** Arm centreline and widths for one side (-1 left, +1 right). */
export function armLine(F: Figure, side: -1 | 1): { pts: Pt[]; widths: number[] } {
  if (F.arms) return F.arms[side === -1 ? "left" : "right"];
  const { cx, y, w } = F;
  const shoulderX = cx + side * (w.shoulder - 7);
  const elbow: Pt = [cx + side * (Math.max(w.waist, w.bust * 0.9) + 20), y.waist - 6];
  const wrist: Pt = [cx + side * (w.hip + 22), y.crotch + F.H * 0.015];
  const base = F.masc ? 15 : 13;
  return { pts: [[shoulderX, y.shoulder + 14], elbow, wrist], widths: [base, base * 0.75, base * 0.55] };
}

/** Outline of a limb (or sleeve) along a centreline, from the start to fraction `upto`, with extra width. */
export function limb(line: { pts: Pt[]; widths: number[] }, upto = 1, extra = 0, flare = 0): string {
  const { pts, widths } = line;
  const segs = pts.length - 1;
  const samples = 10;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * upto;
    const s = Math.min(segs - 1e-6, t * segs);
    const k = Math.floor(s);
    const u = s - k;
    const a = pts[k], b = pts[k + 1];
    const x = a[0] + (b[0] - a[0]) * u;
    const yy = a[1] + (b[1] - a[1]) * u;
    const wd = widths[k] + (widths[k + 1] - widths[k]) * u + extra + flare * (i / samples);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    left.push([x + nx * wd, yy + ny * wd]);
    right.push([x - nx * wd, yy - ny * wd]);
  }
  const back = right.reverse();
  return `M${f1(left[0][0])},${f1(left[0][1])}${curve(left)} L${f1(back[0][0])},${f1(back[0][1])}${curve(back)} Z`;
}

export type Neck = NonNullable<(typeof ITEM)[string]["attrs"]["neckline"]>;

/** Upper-body garment outline: sides, hem and neckline. */
export function bodicePath(F: Figure, opts: { neckline?: Neck; fit: "fitted" | "relaxed" | "oversized"; hemY: number; sleeveless: boolean; ease?: number }): string {
  const { cx, y, w } = F;
  const e = opts.ease ?? (opts.fit === "fitted" ? 2 : opts.fit === "relaxed" ? 7 : 16);
  const boxy = opts.fit === "oversized" ? Math.max(w.shoulder, w.bust, w.hip) * 0.98 + e : 0;
  const side = (yy: number) => Math.max(boxy, opts.fit === "relaxed" ? Math.max(bodyHalf(F, yy), w.bust * 0.94) + e : bodyHalf(F, yy) + e);
  const halter = opts.neckline === "halter";
  const shoulderX = opts.fit === "oversized" ? w.shoulder + 12 : w.shoulder + 2;
  const nl = opts.neckline ?? "crew";
  const neckW = { crew: w.neck + 3, v: w.neck + 5, scoop: w.neck + 13, square: w.neck + 14, sweetheart: w.neck + 15, boat: w.shoulder * 0.74, turtle: w.neck + 1, collar: w.neck + 4, halter: w.neck + 1, cowl: w.neck + 12 }[nl];
  const neckY = nl === "turtle" ? y.neck - 18 : nl === "boat" ? y.neck + 5 : y.neck;

  const left: Pt[] = [[cx - neckW, neckY]];
  if (halter) left.push([cx - w.bust * 0.7, y.bust - 16]);
  else if (opts.sleeveless) left.push([cx - w.shoulder * 0.72, y.shoulder + 2], [cx - side(y.bust) + 3, y.bust - 8]);
  else left.push([cx - shoulderX * 0.7, y.shoulder - 1], [cx - shoulderX, y.shoulder + (opts.fit === "oversized" ? 22 : 14)]);
  for (const yy of [y.bust, y.waist, y.hip, y.crotch]) if (yy < opts.hemY - 4) left.push([cx - side(yy), yy]);
  left.push([cx - side(opts.hemY), opts.hemY]);

  const right = [...left].reverse().map(([x, yy]) => [2 * cx - x, yy] as Pt);
  const neckSeg = (() => {
    const L = left[0], R = right[right.length - 1];
    switch (nl) {
      case "v":
        return ` L${cx},${y.neck + F.H * 0.085} L${L[0]},${L[1]}`;
      case "scoop":
      case "cowl":
        return ` Q${cx},${y.neck + F.H * 0.1} ${L[0]},${L[1]}`;
      case "square":
        return ` L${R[0]},${y.neck + F.H * 0.06} L${L[0]},${y.neck + F.H * 0.06} L${L[0]},${L[1]}`;
      case "sweetheart":
        return ` Q${cx + neckW * 0.6},${y.neck + F.H * 0.1} ${cx},${y.neck + F.H * 0.075} Q${cx - neckW * 0.6},${y.neck + F.H * 0.1} ${L[0]},${L[1]}`;
      case "boat":
        return ` Q${cx},${neckY + 9} ${L[0]},${L[1]}`;
      case "halter":
        return ` L${L[0]},${L[1]}`;
      default:
        return ` Q${cx},${neckY + 12} ${L[0]},${L[1]}`;
    }
  })();
  return `M${f1(left[0][0])},${f1(left[0][1])}${curve(left, 0.35)} L${f1(right[0][0])},${f1(right[0][1])}${curve(right, 0.35)}${neckSeg} Z`;
}

export function sleeves(F: Figure, sleeve: string | undefined, fit: string | undefined): string[] {
  if (!sleeve || sleeve === "none") return [];
  const extra = fit === "oversized" ? 7 : fit === "relaxed" ? 3 : 1.5;
  const upto = sleeve === "short" ? 0.3 : sleeve === "puff" ? 0.28 : 0.97;
  return [-1, 1].map((s) => limb(armLine(F, s as -1 | 1), upto, extra + (sleeve === "puff" ? 6 : 0), sleeve === "puff" ? 4 : 0));
}

export function hemFor(F: Figure, length?: string): number {
  const { y, H } = F;
  switch (length) {
    case "crop":
      return (y.underbust + y.waist) / 2;
    case "waist":
      return y.waist + 6;
    case "tunic":
      return y.crotch + 22;
    case "long":
      return y.knee + 22;
    default:
      return y.hip + H * 0.012;
  }
}

export function skirtHem(F: Figure, length?: string): number {
  const { y, H } = F;
  return length === "mini" ? y.crotch + H * 0.06 : length === "knee" ? y.knee + 6 : length === "midi" ? y.calf + 14 : length === "maxi" ? y.ankle + 6 : y.knee;
}

export function skirtPath(F: Figure, topY: number, kind: string | undefined, length: string | undefined): string {
  const { cx, y, w } = F;
  const hemY = skirtHem(F, length);
  const drop = hemY - y.hip;
  const top = bodyHalf(F, topY) + 2;
  let hip = w.hip + 5;
  let hem = w.hip + drop * 0.26;
  if (kind === "pencil" || kind === "sheath") { hip = w.hip + 3; hem = w.hip * 0.86; }
  if (kind === "slip") { hip = w.hip + 5; hem = w.hip + 10 + drop * 0.06; }
  if (kind === "shift") { hip = Math.max(w.hip, w.bust) + 7; hem = hip + 4; }
  if (kind === "fit-flare") { hip = w.hip + 14; hem = w.hip + 12 + drop * 0.38; }
  if (kind === "pleated") { hip = w.hip + 7; hem = w.hip + drop * 0.32; }
  const pts: Pt[] = [[cx - top, topY]];
  if (topY < y.hip - 6) pts.push([cx - hip, y.hip]);
  pts.push([cx - hem, hemY]);
  return mirrored(cx, pts, 0.4);
}

export function trouserPath(F: Figure, topY: number, leg: string | undefined, length: string | undefined): string {
  const { cx, y, w, legX, H } = F;
  const hemY = length === "short" ? y.crotch + H * 0.075 : length === "cropped" ? y.calf + 16 : leg === "wide" || leg === "flare" || leg === "bootcut" ? y.floor - 4 : y.ankle + 6;
  const L = cx - legX;
  const t = w.thigh;
  const half = {
    skinny: [t + 3, w.knee + 4, w.ankle + 5],
    straight: [t + 5, t * 0.8, t * 0.74],
    wide: [t + 9, t + 9, t + 18],
    flare: [t + 3, w.knee + 5, t + 14],
    bootcut: [t + 4, w.knee + 8, w.knee + 15],
    tapered: [t + 6, w.knee + 9, w.ankle + 9],
    balloon: [t + 9, t + 16, w.ankle + 12],
  }[leg ?? "straight"] ?? [t + 5, t * 0.8, t * 0.74];
  const kneeY = Math.min(y.knee, hemY - 4);
  const pts: Pt[] = [
    [cx - bodyHalf(F, topY) - 2, topY],
    [cx - w.hip - 4, y.hip],
    [L - half[0], y.crotch + H * 0.06],
  ];
  if (hemY > kneeY + 10) pts.push([L - half[1], kneeY]);
  const hemHalf = length === "short" ? half[0] + 2 : hemY < kneeY + 10 ? half[1] : half[2];
  pts.push([L - hemHalf, hemY], [Math.min(cx - 3, L + hemHalf), hemY]);
  if (hemY > kneeY + 10) pts.push([Math.min(cx - 3, L + half[1] * 0.85), kneeY]);
  pts.push([cx, y.crotch + 6]);
  return mirrored(cx, pts, 0.32);
}

export function outerPanels(F: Figure, kind: string | undefined, length: string | undefined, fit: string | undefined, structured: boolean): string[] {
  const { cx, y, w, H } = F;
  const hemY = length === "crop" ? y.waist + 8 : length === "long" ? y.knee + 26 : y.hip + H * 0.03;
  const e = fit === "oversized" ? 22 : fit === "relaxed" ? 12 : 7;
  const shoulder = w.shoulder + (structured ? 8 : 4) + (fit === "oversized" ? 10 : 0);
  const side = (yy: number) => Math.max(bodyHalf(F, yy) + e, fit === "oversized" ? Math.max(w.bust, w.hip) + e : 0);
  if (kind === "cape") {
    const pts: Pt[] = [[cx - w.neck - 2, y.neck - 2], [cx - shoulder - 6, y.shoulder + 16], [cx - w.hip - 46, hemY], [cx - 14, hemY + 4], [cx - 12, y.neck + 20]];
    return [`M${pts[0][0]},${pts[0][1]}${curve(pts, 0.3)} Z`, `M${2 * cx - pts[0][0]},${pts[0][1]}${curve(pts.map(([x, yy]) => [2 * cx - x, yy] as Pt), 0.3)} Z`];
  }
  const left: Pt[] = [[cx - w.neck - 3, y.neck - 3], [cx - shoulder * 0.7, y.shoulder - 2], [cx - shoulder, y.shoulder + 14]];
  for (const yy of [y.bust, y.waist, y.hip, y.crotch, y.knee]) if (yy < hemY - 6) left.push([cx - side(yy), yy]);
  left.push([cx - side(hemY) - (length === "long" ? 8 : 0), hemY]);
  const inner = kind === "puffer" || kind === "leather" ? 2 : 13;
  left.push([cx - inner, hemY], [cx - inner, y.bust + 18], [cx - w.neck - 1, y.neck + 26]);
  const path = (pts: Pt[]) => `M${f1(pts[0][0])},${f1(pts[0][1])}${curve(pts, 0.25)} Z`;
  return [path(left), path(left.map(([x, yy]) => [2 * cx - x, yy] as Pt))];
}
