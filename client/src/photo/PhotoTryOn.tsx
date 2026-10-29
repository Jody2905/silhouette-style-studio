// Free, on-device photo try-on: draws the current look onto the user's own photo.
// Garments are built from a per-pixel body map of the photo (torso, arms, legs, feet), so they follow the real body.
// They take their folds and shadows from the photo; hair is recoloured inside the hair mask; makeup follows the
// face landmarks. Nothing leaves the browser.
import { HAIR_HEX, ITEM, type Outfit, type Pattern, type Profile, type Worn } from "@silhouette/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { shade } from "../avatar/geometry";
import type { PhotoScene } from "../vision/analyse";
import { buildBodyMap, outfitLayers, type BodyMap, type Mask } from "./bodyMap";

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

/** Where clothes may go: the person's outline from the photo, minus their hair and face. */
function bodyCanvas(scene: PhotoScene): HTMLCanvasElement | null {
  if (!scene.person) return null;
  const c = canvasOf(scene.W, scene.H);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(scene.person, 0, 0);
  g.globalCompositeOperation = "destination-out";
  if (scene.hair) g.drawImage(scene.hair, 0, 0);
  if (scene.faceSkin) g.drawImage(scene.faceSkin, 0, 0);
  const f = scene.face;
  if (f) {
    const cx = (f[234].x + f[454].x) / 2, cy = (f[10].y + f[152].y) / 2;
    g.beginPath();
    g.ellipse(cx, cy, Math.abs(f[454].x - f[234].x) * 0.52, Math.abs(f[152].y - f[10].y) * 0.53, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** A one-byte mask as a softly anti-aliased alpha canvas. */
function maskToCanvas(W: number, H: number, mask: Mask): HTMLCanvasElement {
  const raw = canvasOf(W, H);
  const r = raw.getContext("2d")!;
  const img = r.createImageData(W, H);
  for (let i = 0; i < mask.length; i++) img.data[i * 4 + 3] = mask[i];
  r.putImageData(img, 0, 0);
  const out = canvasOf(W, H);
  const o = out.getContext("2d")!;
  o.filter = "blur(0.7px)";
  o.drawImage(raw, 0, 0);
  return out;
}

/** Fills a mask with a colour or print, multiplies in the photo's folds, and adds a soft shadow at the edges. */
function paintMask(ctx: CanvasRenderingContext2D, scene: PhotoScene, map: BodyMap, mask: Mask, color: string, pattern: Pattern = "solid", opacity = 1, rim = 0.28) {
  const { W, H } = scene;
  const shape = maskToCanvas(W, H, mask);
  const layer = canvasOf(W, H);
  const g = layer.getContext("2d")!;
  if (pattern === "solid") g.fillStyle = color;
  else {
    const p = g.createPattern(patternTile(color, pattern), "repeat")!;
    const k = Math.max(0.6, map.S / 70); // prints scale with the body
    p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    g.fillStyle = p;
  }
  g.fillRect(0, 0, W, H);
  if (scene.shade) {
    g.globalCompositeOperation = "multiply";
    g.drawImage(scene.shade, 0, 0);
  }
  g.globalCompositeOperation = "destination-in";
  g.drawImage(shape, 0, 0);
  if (rim > 0) {
    const soft = canvasOf(W, H);
    const sg = soft.getContext("2d")!;
    sg.filter = `blur(${Math.max(2, map.S / 14)}px)`;
    sg.drawImage(shape, 0, 0);
    const edge = canvasOf(W, H);
    const e = edge.getContext("2d")!;
    e.fillStyle = "#000";
    e.fillRect(0, 0, W, H);
    e.globalCompositeOperation = "destination-out";
    e.drawImage(soft, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = rim;
    g.drawImage(edge, 0, 0);
    g.globalAlpha = 1;
  }
  ctx.globalAlpha = opacity;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 1;
}

/**
 * Paints skin over the clothes already in the photo, in the zones the new look takes over, so a V-neck,
 * short sleeve or short skirt shows skin rather than the old outfit. New garments then go on top.
 */
function uncover(ctx: CanvasRenderingContext2D, scene: PhotoScene, map: BodyMap, zone: Mask, skin: string) {
  if (!scene.clothes) return;
  const { W, H } = scene;
  const layer = canvasOf(W, H);
  const g = layer.getContext("2d")!;
  g.fillStyle = skin;
  g.fillRect(0, 0, W, H);
  if (scene.shade) {
    g.globalCompositeOperation = "multiply";
    g.drawImage(scene.shade, 0, 0);
  }
  g.globalCompositeOperation = "destination-in";
  g.drawImage(scene.clothes, 0, 0);
  g.drawImage(maskToCanvas(W, H, zone), 0, 0);
  void map;
  ctx.drawImage(layer, 0, 0);
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

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function PhotoTryOn({ scene, profile, outfit }: { scene: PhotoScene; profile: Profile; outfit: Outfit }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [compare, setCompare] = useState(false);
  const map = useMemo(() => {
    const b = bodyCanvas(scene);
    return b ? buildBodyMap(scene, b) : null;
  }, [scene]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(scene.photo, 0, 0);
    if (compare) return;
    const hair = outfit.hair;
    if (hair && hair.color.toLowerCase() !== HAIR_HEX[profile.hairColor].toLowerCase()) recolourHair(ctx, scene, hair.color);
    if (map) {
      const { layers, zone } = outfitLayers(map, outfit);
      if (zone) uncover(ctx, scene, map, zone, profile.skinHex ?? "#b07a55");
      for (const l of layers) {
        const worn = outfit[l.slot]!;
        const isShoe = l.slot === "shoes" || l.slot === "belt";
        paintMask(ctx, scene, map, l.mask, worn.color, isShoe ? "solid" : worn.pattern, l.sheer ? 0.55 : 1, isShoe ? 0.18 : 0.28);
      }
    }
    paintFace(ctx, scene, outfit);
  }, [scene, map, outfit, profile.hairColor, profile.skinHex, compare]);

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
        {!map
          ? "Your shoulders and hips weren't clear in this photo, so clothes can't be placed. Hair colour and makeup still work. Try a full-length, front-facing photo."
          : !map.legsVisible
            ? "Your legs aren't fully in the photo, so shoes and the lower half of bottoms can't be shown."
            : "Clothes are fitted to your body in the photo and take their folds and shadows from it. Hair changes colour; hairstyle shapes can't be changed on a photo."}
        {!scene.hair && " Hair recolouring needs the hair model, which didn't load."}
      </p>
    </div>
  );
}
