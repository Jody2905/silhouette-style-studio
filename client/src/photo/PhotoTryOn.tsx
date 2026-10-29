// Free, on-device photo try-on: draws the current look onto the user's own photo.
// Clothing takes its folds and shadows from the photo itself; hair is recoloured inside the hair mask;
// makeup follows the face landmarks. Nothing leaves the browser.
import { HAIR_HEX, ITEM, faceShapeOf, type Outfit, type Pattern, type Profile, type Slot, type Worn } from "@silhouette/engine";
import { useEffect, useRef, useState } from "react";
import { bodicePath, bodyHalf, hemFor, outerPanels, skirtPath, sleeves, trouserPath } from "../avatar/garments";
import { shade, type Figure, type Pt } from "../avatar/geometry";
import type { PhotoScene } from "../vision/analyse";

/* ------------------------------------------------------------------ */
/* Photo → figure                                                       */
/* ------------------------------------------------------------------ */

interface PhotoFigure {
  F: Figure;
  /** Maps figure coordinates back to photo pixels. */
  k: number;
  ox: number;
  oy: number;
  legsVisible: boolean;
}

function alphaAt(data: Uint8ClampedArray, W: number, x: number, y: number) {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi * W + xi >= data.length / 4) return 0;
  return data[(yi * W + xi) * 4 + 3];
}

/** Half-width of the person region around x at row y (stops at gaps, so arms held away aren't counted). */
function halfWidth(data: Uint8ClampedArray, W: number, x: number, y: number): number | null {
  if (alphaAt(data, W, x, y) < 128) return null;
  let l = x, r = x;
  while (l > 0 && alphaAt(data, W, l - 1, y) >= 128) l--;
  while (r < W - 1 && alphaAt(data, W, r + 1, y) >= 128) r++;
  return (r - l) / 2;
}

export function figureFromScene(scene: PhotoScene, profile: Profile): PhotoFigure | null {
  const p = scene.pose;
  if (!p || !scene.person) return null;
  const vis = (i: number) => p[i].v > 0.5;
  if (![11, 12, 23, 24].every(vis)) return null;
  const mask = scene.person.getContext("2d")!.getImageData(0, 0, scene.W, scene.H).data;
  const avg = (a: number, b: number) => ({ x: (p[a].x + p[b].x) / 2, y: (p[a].y + p[b].y) / 2 });
  const sh = avg(11, 12), hipJ = avg(23, 24);
  const midX = (sh.x + hipJ.x) / 2;
  const span = hipJ.y - sh.y;
  const legsVisible = [25, 26, 27, 28].every(vis);

  // Top of head: scan up the mask from the nose.
  let topY = p[0].y;
  while (topY > 0 && alphaAt(mask, scene.W, p[0].x, topY - 1) >= 128) topY--;
  const feet = [29, 30, 31, 32].filter(vis).map((i) => p[i].y);
  const floorY = legsVisible && feet.length ? Math.max(...feet) : topY + span / 0.3;
  const k = 700 / (floorY - topY);
  const ox = midX - 200 / k;
  const oy = topY - 34 / k;
  const X = (x: number) => (x - midX) * k + 200;
  const Y = (y: number) => (y - topY) * k + 34;
  const hw = (y: number, x = midX, fallback = 0) => (halfWidth(mask, scene.W, x, y) ?? fallback / k) * k;

  const yShoulder = Y(sh.y);
  const yHipJ = Y(hipJ.y);
  const fspan = yHipJ - yShoulder;
  const face = scene.face;
  const chin = face ? Y(face[152].y) : Y(p[0].y) + fspan * 0.35;
  const headCy = face ? Y((face[10].y + face[152].y) / 2) : Y(p[0].y);
  const y = {
    headCy,
    chin,
    neck: chin + (yShoulder - chin) * 0.45,
    shoulder: yShoulder,
    bust: yShoulder + fspan * 0.62 * 0.42,
    underbust: yShoulder + fspan * 0.62 * 0.62,
    waist: yShoulder + fspan * 0.62,
    highHip: yShoulder + fspan * 0.82,
    hip: yHipJ + fspan * 0.08,
    crotch: yHipJ + fspan * 0.22,
    knee: legsVisible ? Y((p[25].y + p[26].y) / 2) : yHipJ + fspan * 1.25,
    calf: 0,
    ankle: legsVisible ? Y((p[27].y + p[28].y) / 2) : yHipJ + fspan * 2.1,
    floor: 734,
  };
  y.calf = y.knee + (y.ankle - y.knee) * 0.35;
  const px = (fy: number) => (fy - 34) / k + topY; // figure y → photo y
  // A little wider than measured so the new garment covers the shoulders of what's already worn.
  const shoulderHalf = Math.max(hw(px(y.shoulder + fspan * 0.08)), Math.abs(p[11].x - p[12].x) * 0.55 * k) * 1.07;
  const left = (a: number, b: number) => (p[a].x < p[b].x ? a : b);
  const right = (a: number, b: number) => (p[a].x < p[b].x ? b : a);
  const kneeL = p[left(25, 26)], kneeR = p[right(25, 26)];
  const w = {
    head: 0,
    neck: Math.max(8, hw(px(y.neck)) * 0.85),
    shoulder: shoulderHalf,
    bust: hw(px(y.bust), midX, shoulderHalf / k),
    waist: hw(px(y.waist), midX, (shoulderHalf * 0.8) / k),
    hip: hw(px(y.hip), midX, shoulderHalf / k),
    thigh: 0,
    knee: legsVisible ? hw(px(y.knee), kneeL.x, 20 / k) : 20,
    calf: legsVisible ? hw(px(y.calf), (kneeL.x + kneeR.x) / 2 - (kneeR.x - kneeL.x) / 2, 21 / k) : 21,
    ankle: 11,
  };
  w.thigh = w.hip * 0.5;
  // Keep widths sane if the mask was noisy.
  w.bust = Math.min(Math.max(w.bust, shoulderHalf * 0.7), shoulderHalf * 1.25);
  w.waist = Math.min(Math.max(w.waist, w.bust * 0.6), w.hip * 1.2);

  const arm = (s: "l" | "r") => {
    const pick = s === "l" ? left : right;
    const a = p[pick(11, 12)], e = p[pick(13, 14)], wr = p[pick(15, 16)];
    const base = shoulderHalf * 0.2;
    return { pts: [[X(a.x), Y(a.y) + 8], [X(e.x), Y(e.y)], [X(wr.x), Y(wr.y)]] as Pt[], widths: [base, base * 0.78, base * 0.6] };
  };
  const faceInfo = faceShapeOf(profile).shape ?? "oval";
  const F: Figure = {
    cx: 200,
    H: 700,
    top: 34,
    y,
    w,
    legX: Math.abs(p[23].x - p[24].x) * 0.5 * k,
    armTop: [0, 0],
    wrist: [0, 0],
    headRx: face ? (Math.abs(face[454].x - face[234].x) / 2) * k : 30,
    headRy: face ? (Math.abs(face[152].y - face[10].y) / 2) * 1.1 * k : 40,
    face: faceInfo,
    masc: profile.wardrobe === "menswear",
    arms: { left: arm("l"), right: arm("r") },
  };
  return { F, k, ox, oy, legsVisible };
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                      */
/* ------------------------------------------------------------------ */

const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });

function patternTile(color: string, pattern: Pattern): HTMLCanvasElement {
  const size = pattern === "floral" ? 22 : pattern === "dots" ? 16 : 12;
  const c = canvasOf(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, size, size);
  const ink = parseInt(color.slice(1), 16) > 0x888888 ? shade(color, -0.45) : shade(color, 0.7);
  g.fillStyle = ink;
  if (pattern === "v-stripe") g.fillRect(0, 0, 4, size);
  if (pattern === "h-stripe") g.fillRect(0, 0, size, 4);
  if (pattern === "dots") { g.beginPath(); g.arc(8, 8, 3.2, 0, Math.PI * 2); g.fill(); }
  if (pattern === "check") { g.globalAlpha = 0.45; g.fillRect(0, 0, 6, size); g.fillRect(0, 0, size, 6); }
  if (pattern === "floral") {
    for (let a = 0; a < 5; a++) {
      g.save(); g.translate(11, 11); g.rotate((a * 72 * Math.PI) / 180);
      g.beginPath(); g.ellipse(0, -4, 2.2, 3.4, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  return c;
}

/**
 * Paints garment shapes onto the photo: flat colour (or print), multiplied by the photo's own fold map so
 * creases and shadows show through, then trimmed back to the garment outline.
 */
function paintGarment(ctx: CanvasRenderingContext2D, scene: PhotoScene, pf: PhotoFigure, paths: string[], worn: Worn, opacity = 1) {
  const layer = canvasOf(scene.W, scene.H);
  const g = layer.getContext("2d")!;
  const toPhoto = () => g.setTransform(1 / pf.k, 0, 0, 1 / pf.k, pf.ox, pf.oy);
  toPhoto();
  // One combined outline, so trimming keeps every piece (body, sleeves, panels).
  const shape = new Path2D();
  for (const d of paths) shape.addPath(new Path2D(d));
  g.fillStyle = worn.pattern === "solid" ? worn.color : g.createPattern(patternTile(worn.color, worn.pattern), "repeat")!;
  g.fill(shape);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (scene.shade) {
    g.globalCompositeOperation = "multiply";
    g.drawImage(scene.shade, 0, 0);
  }
  // Trim back to the garment (the multiply also touched empty pixels).
  g.globalCompositeOperation = "destination-in";
  toPhoto();
  g.fillStyle = "#000";
  g.fill(shape);
  // A soft darker edge gives the garment definition against the photo.
  g.globalCompositeOperation = "source-atop";
  g.strokeStyle = shade(worn.color, -0.45);
  g.lineWidth = 2.5;
  g.globalAlpha = 0.5;
  for (const d of paths) g.stroke(new Path2D(d));
  ctx.globalAlpha = opacity;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 1;
}

function recolourHair(ctx: CanvasRenderingContext2D, scene: PhotoScene, color: string) {
  if (!scene.hair || !scene.hairShade) return;
  const layer = canvasOf(scene.W, scene.H);
  const g = layer.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, scene.W, scene.H);
  g.globalCompositeOperation = "multiply";
  g.drawImage(scene.hairShade, 0, 0);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(scene.hair, 0, 0);
  ctx.globalAlpha = 0.88;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 1;
}

const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
const EYE_UPPER = { l: [33, 246, 161, 160, 159, 158, 157, 173, 133], r: [263, 466, 388, 387, 386, 385, 384, 398, 362] };
const JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454];

function polyPath(pts: { x: number; y: number }[], idx: number[]) {
  const path = new Path2D();
  idx.forEach((i, n) => (n ? path.lineTo(pts[i].x, pts[i].y) : path.moveTo(pts[i].x, pts[i].y)));
  path.closePath();
  return path;
}

function paintFace(ctx: CanvasRenderingContext2D, scene: PhotoScene, outfit: Outfit) {
  const f = scene.face;
  if (!f) return;
  const faceW = Math.abs(f[454].x - f[234].x);
  const faceH = Math.abs(f[152].y - f[10].y);

  // Blush: soft colour on the cheeks.
  const blush = outfit.blush;
  if (blush) {
    const sculpt = ITEM[blush.id]?.attrs.kind === "cheekbones";
    for (const i of [50, 280]) {
      const cx = f[i].x + (sculpt ? (i === 50 ? -1 : 1) * faceW * 0.04 : 0);
      const cy = f[i].y - (sculpt ? faceH * 0.05 : 0);
      const r = faceW * (sculpt ? 0.16 : 0.13);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, blush.color);
      grad.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (sculpt ? 0.55 : 0.8), sculpt ? (i === 50 ? 0.4 : -0.4) : 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Eyes: smoky shadow, liner, wings.
  const eyes = outfit.eyes;
  if (eyes) {
    for (const side of ["l", "r"] as const) {
      const idx = EYE_UPPER[side];
      const outer = f[idx[0]], inner = f[idx[idx.length - 1]];
      const dir = outer.x < inner.x ? -1 : 1;
      if (eyes.id === "eyes-smoky") {
        const cx = (outer.x + inner.x) / 2, cy = f[idx[4]].y - faceH * 0.01;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, faceW * 0.14);
        grad.addColorStop(0, eyes.color);
        grad.addColorStop(1, "transparent");
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, faceW * 0.14, faceW * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = "#141010";
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(1.2, faceW * (eyes.id === "eyes-natural" ? 0.006 : 0.01));
      ctx.lineCap = "round";
      ctx.beginPath();
      idx.forEach((i, n) => (n ? ctx.lineTo(f[i].x, f[i].y) : ctx.moveTo(f[i].x, f[i].y)));
      if (eyes.id === "eyes-winged") ctx.moveTo(outer.x, outer.y), ctx.lineTo(outer.x + dir * faceW * 0.07, outer.y - faceH * 0.04);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Lips: colour multiplied into the real lip texture.
  const lips = outfit.lips;
  if (lips) {
    const path = polyPath(f, LIPS_OUTER);
    const inner = polyPath(f, LIPS_INNER);
    const both = new Path2D();
    both.addPath(path);
    both.addPath(inner);
    ctx.save();
    ctx.filter = "blur(0.6px)";
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = lips.color;
    ctx.fill(both, "evenodd");
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.5;
    ctx.fill(both, "evenodd");
    ctx.restore();
  }

  // Beard: fine noise in the beard colour over the lower face.
  const beard = outfit.beard;
  if (beard) {
    const kind = ITEM[beard.id]?.attrs.kind;
    const area = new Path2D();
    if (kind === "goatee") {
      area.ellipse(f[17].x, f[17].y + faceH * 0.08, faceW * 0.12, faceH * 0.1, 0, 0, Math.PI * 2);
    } else {
      const top = f[2].y + faceH * 0.02;
      const jaw = JAW.map((i) => f[i]).filter((pt) => pt.y >= top);
      const drop = kind === "full" ? faceH * 0.12 : kind === "boxed" ? faceH * 0.04 : 0;
      jaw.forEach((pt, n) => {
        const yy = pt.y + (Math.abs(pt.x - f[152].x) < faceW * 0.3 ? drop : drop * 0.4);
        n ? area.lineTo(pt.x, yy) : area.moveTo(pt.x, yy);
      });
      area.lineTo(f[291].x + faceW * 0.05, top);
      area.lineTo(f[61].x - faceW * 0.05, top);
      area.closePath();
    }
    const tile = canvasOf(24, 24);
    const tg = tile.getContext("2d")!;
    for (let i = 0; i < 90; i++) {
      tg.fillStyle = beard.color;
      tg.globalAlpha = 0.3 + Math.random() * 0.6;
      tg.fillRect(Math.random() * 24, Math.random() * 24, 1.2, 1.6 + Math.random() * 1.6);
    }
    ctx.save();
    ctx.clip(area);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = kind === "stubble" ? 0.45 : 0.85;
    ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
    ctx.fill(area);
    if (kind !== "stubble") {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = beard.color;
      ctx.fill(area);
    }
    ctx.restore();
  }

  // Accessories.
  const glasses = outfit.glasses;
  if (glasses && f[468] && f[473]) {
    const kind = ITEM[glasses.id]?.attrs.kind;
    const r = faceW * 0.115;
    ctx.save();
    ctx.strokeStyle = glasses.color;
    ctx.lineWidth = Math.max(2, faceW * 0.022);
    ctx.fillStyle = kind === "aviator" ? "rgba(40,40,40,0.28)" : "rgba(255,255,255,0.06)";
    for (const i of [468, 473]) {
      const { x, y } = f[i];
      ctx.beginPath();
      if (kind === "round") ctx.arc(x, y, r, 0, Math.PI * 2);
      else if (kind === "square") ctx.roundRect(x - r * 1.15, y - r * 0.8, r * 2.3, r * 1.6, r * 0.2);
      else if (kind === "cat-eye") ctx.ellipse(x, y, r * 1.15, r * 0.75, i === 468 ? 0.15 : -0.15, 0, Math.PI * 2);
      else ctx.ellipse(x, y + r * 0.15, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(f[468].x + r * 0.95, f[468].y - r * 0.2);
    ctx.quadraticCurveTo(f[168].x, f[168].y - r * 0.3, f[473].x - r * 0.95, f[473].y - r * 0.2);
    ctx.stroke();
    ctx.restore();
  }
  const ear = outfit.earrings;
  if (ear) {
    const kind = ITEM[ear.id]?.attrs.kind;
    for (const i of [234, 454]) {
      const x = f[i].x + (i === 234 ? faceW * 0.03 : -faceW * 0.03);
      const y = f[i].y + faceH * 0.16;
      ctx.save();
      ctx.fillStyle = ear.color;
      ctx.strokeStyle = ear.color;
      ctx.lineWidth = Math.max(1.5, faceW * 0.012);
      ctx.beginPath();
      if (kind === "studs") ctx.arc(x, y, faceW * 0.018, 0, Math.PI * 2), ctx.fill();
      else if (kind === "hoops") ctx.arc(x, y + faceW * 0.07, faceW * 0.07, 0, Math.PI * 2), ctx.stroke();
      else {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + faceH * 0.12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y + faceH * 0.14, faceW * 0.025, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  const hat = outfit.hat;
  if (hat) {
    const kind = ITEM[hat.id]?.attrs.kind;
    const cx = (f[234].x + f[454].x) / 2;
    const brow = f[10].y + faceH * 0.06;
    const top = f[10].y - faceH * 0.38;
    const hwid = faceW * 0.62;
    ctx.save();
    ctx.fillStyle = hat.color;
    ctx.strokeStyle = shade(hat.color, -0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (kind === "fedora") {
      ctx.ellipse(cx, brow, hwid * 1.9, faceH * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - hwid * 0.95, brow);
      ctx.lineTo(cx - hwid * 0.8, top);
      ctx.quadraticCurveTo(cx, top + faceH * 0.08, cx + hwid * 0.8, top);
      ctx.lineTo(cx + hwid * 0.95, brow);
    } else if (kind === "cap") {
      ctx.moveTo(cx - hwid, brow);
      ctx.quadraticCurveTo(cx, top - faceH * 0.05, cx + hwid, brow);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, brow + faceH * 0.01, hwid * 1.05, faceH * 0.05, 0, 0, Math.PI);
    } else {
      // beanie / trapper
      ctx.moveTo(cx - hwid * (kind === "trapper" ? 1.15 : 1.02), brow + (kind === "trapper" ? faceH * 0.35 : 0));
      ctx.lineTo(cx - hwid * 1.02, brow);
      ctx.quadraticCurveTo(cx - hwid, top - faceH * 0.08, cx, top - faceH * 0.1);
      ctx.quadraticCurveTo(cx + hwid, top - faceH * 0.08, cx + hwid * 1.02, brow);
      ctx.lineTo(cx + hwid * (kind === "trapper" ? 1.15 : 1.02), brow + (kind === "trapper" ? faceH * 0.35 : 0));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function paintShoes(ctx: CanvasRenderingContext2D, scene: PhotoScene, worn: Worn) {
  const p = scene.pose;
  if (!p) return;
  const kind = ITEM[worn.id]?.attrs.kind;
  for (const [heel, toe, ankle] of [[29, 31, 27], [30, 32, 28]]) {
    if (p[heel].v < 0.5 || p[toe].v < 0.5) continue;
    const h = p[heel], t = p[toe], a = p[ankle];
    const len = Math.hypot(t.x - h.x, t.y - h.y);
    const cx = (h.x + t.x) / 2, cy = (h.y + t.y) / 2;
    ctx.save();
    ctx.fillStyle = worn.color;
    ctx.strokeStyle = shade(worn.color, -0.4);
    ctx.lineWidth = 2;
    if (kind === "boot") {
      const topY = worn.id === "shoes-boots" ? a.y - len * 2.6 : a.y - len * 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x - len * 0.32, topY);
      ctx.lineTo(a.x + len * 0.32, topY);
      ctx.lineTo(cx + len * 0.55, cy + len * 0.1);
      ctx.quadraticCurveTo(cx, cy + len * 0.35, cx - len * 0.55, cy + len * 0.1);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, len * (kind === "pump" ? 0.62 : 0.68), len * 0.3, Math.atan2(t.y - h.y, t.x - h.x), 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    if (kind === "sneaker") {
      ctx.strokeStyle = "#e4e4e0";
      ctx.lineWidth = Math.max(2, len * 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, cy + len * 0.12, len * 0.62, len * 0.18, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** All garment outlines for a look, in figure coordinates, in the order they're layered. */
function garmentLayers(F: Figure, outfit: Outfit): { slot: Slot; paths: string[] }[] {
  const out: { slot: Slot; paths: string[] }[] = [];
  const item = (s: Slot) => (outfit[s] ? ITEM[outfit[s]!.id] : undefined);
  const { y } = F;
  const bottom = item("bottom"), dress = item("dress"), top = item("top"), outer = item("outer"), belt = item("belt");
  if (bottom) {
    const a = bottom.attrs;
    const riseY = a.rise === "high" ? y.waist - 2 : a.rise === "low" ? y.waist + F.H * 0.065 : y.waist + F.H * 0.032;
    out.push({ slot: "bottom", paths: [a.kind === "skirt" ? skirtPath(F, riseY, a.skirt, a.length) : trouserPath(F, riseY, a.leg, a.length)] });
  }
  if (dress) {
    const a = dress.attrs;
    const waistY = a.waist === "empire" ? y.underbust : a.waist === "drop" ? y.hip : y.waist;
    const lower = a.leg ? trouserPath(F, waistY - 2, a.leg, a.length) : a.waist === "none" ? skirtPath(F, y.bust, a.skirt, a.length) : skirtPath(F, waistY - 2, a.skirt, a.length);
    const bodice = bodicePath(F, { neckline: a.neckline, fit: "fitted", hemY: a.waist === "none" ? y.bust + 30 : waistY + 2, sleeveless: a.sleeve === "none" });
    out.push({ slot: "dress", paths: [lower, bodice, ...sleeves(F, a.sleeve, "fitted")] });
  }
  if (top && !dress) {
    const a = top.attrs;
    const tucked = bottom && bottom.attrs.rise === "high" && a.fit !== "oversized" && a.length !== "crop";
    const hemY = tucked ? y.waist + 2 : hemFor(F, a.length);
    out.push({ slot: "top", paths: [bodicePath(F, { neckline: a.neckline, fit: a.fit ?? "relaxed", hemY, sleeveless: a.sleeve === "none" }), ...sleeves(F, a.sleeve, a.fit)] });
  }
  if (belt) {
    const yy = belt.attrs.kind === "hip" ? y.highHip + 8 : y.waist;
    const hw = bodyHalf(F, yy) + 5;
    out.push({ slot: "belt", paths: [`M${F.cx - hw},${yy - 5} L${F.cx + hw},${yy - 5} L${F.cx + hw},${yy + 5} L${F.cx - hw},${yy + 5} Z`] });
  }
  if (outer) {
    const a = outer.attrs;
    out.push({ slot: "outer", paths: [...(a.kind !== "cape" ? sleeves(F, "long", a.fit === "oversized" ? "oversized" : "relaxed") : []), ...outerPanels(F, a.kind, a.length, a.fit, a.structure === "structured")] });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function PhotoTryOn({ scene, profile, outfit }: { scene: PhotoScene; profile: Profile; outfit: Outfit }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [compare, setCompare] = useState(false);
  const [pf] = useState(() => figureFromScene(scene, profile));

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(scene.photo, 0, 0);
    if (compare) return;
    const hair = outfit.hair;
    if (hair && hair.color.toLowerCase() !== HAIR_HEX[profile.hairColor].toLowerCase()) recolourHair(ctx, scene, hair.color);
    if (pf) {
      const layers = garmentLayers(pf.F, outfit);
      // Full-length trousers go over shoes; everything else goes under them.
      const fullLegs = (outfit.bottom && ITEM[outfit.bottom.id]?.attrs.length === "full" && ITEM[outfit.bottom.id]?.attrs.kind !== "skirt") || (outfit.dress && ITEM[outfit.dress.id]?.attrs.leg);
      if (outfit.shoes && fullLegs && pf.legsVisible) paintShoes(ctx, scene, outfit.shoes);
      for (const l of layers) {
        const sheer = l.slot === "top" && ITEM[outfit.top!.id]?.attrs.sheer;
        paintGarment(ctx, scene, pf, l.paths, outfit[l.slot]!, sheer ? 0.55 : 1);
      }
      if (outfit.shoes && !fullLegs && pf.legsVisible) paintShoes(ctx, scene, outfit.shoes);
    }
    paintFace(ctx, scene, outfit);
  }, [scene, pf, outfit, profile.hairColor, compare]);

  return (
    <div className="photo-tryon">
      <canvas ref={ref} width={scene.W} height={scene.H} aria-label="Your photo wearing the current look" role="img" />
      <div className="tryon-bar">
        <button
          type="button"
          className="btn ghost small"
          onPointerDown={() => setCompare(true)}
          onPointerUp={() => setCompare(false)}
          onPointerLeave={() => setCompare(false)}
          onKeyDown={(e) => e.key === " " && setCompare(true)}
          onKeyUp={() => setCompare(false)}
        >
          Hold to see original
        </button>
      </div>
      <p className="muted small">
        {!pf
          ? "Your shoulders and hips weren't clear in this photo, so clothes can't be placed. Hair colour and makeup still work. Try a full-length, front-facing photo."
          : !pf.legsVisible
            ? "Your legs aren't in the photo, so shoes and the lower half of bottoms can't be shown."
            : "Clothes take their folds and shadows from your photo. Hairstyle shapes show on the avatar; on your photo, hair changes colour only."}
        {!scene.hair && " Hair recolouring needs the hair model, which didn't load."}
      </p>
    </div>
  );
}
