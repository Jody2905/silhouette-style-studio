import type { FaceRatios, FaceShape, Profile } from "./types";

export const FACE_SHAPE_LABEL: Record<FaceShape, string> = {
  oval: "Oval",
  round: "Round",
  square: "Square",
  oblong: "Oblong",
  heart: "Heart",
  diamond: "Diamond",
  triangle: "Triangle",
};

export const FACE_SHAPE_SUMMARY: Record<FaceShape, string> = {
  oval: "Longer than wide, with a forehead a little wider than a gently rounded jaw.",
  round: "About as wide as long, with full cheeks and a soft jaw.",
  square: "About as wide as long, with a strong, angular jaw.",
  oblong: "Noticeably longer than wide, with similar widths top to bottom.",
  heart: "Wider forehead and cheekbones, narrowing to a slim chin.",
  diamond: "Cheekbones are the widest point; forehead and jaw are narrower.",
  triangle: "Jaw is the widest point; forehead is narrower.",
};

/** MediaPipe Face Mesh landmark indices used for measuring. */
export const FACE_POINTS = {
  top: 10, // top of forehead (mesh edge, close to the hairline)
  chin: 152,
  cheekL: 234,
  cheekR: 454,
  foreheadL: 54,
  foreheadR: 284,
  jawL: 172,
  jawR: 397,
  /** Points along the jaw used for the angle: ear-level jaw, jaw corner, chin side. */
  jawUpper: 132,
  jawCorner: 172,
  chinSide: 148,
} as const;

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Turns face landmarks (normalised x/y, with image aspect applied) into ratios relative to cheekbone width. */
export function faceRatiosFromLandmarks(lm: Pt[]): FaceRatios {
  const P = FACE_POINTS;
  const cheek = dist(lm[P.cheekL], lm[P.cheekR]);
  // Mesh top sits below the true hairline; add ~8% of length to estimate the full face.
  const length = (dist(lm[P.top], lm[P.chin]) * 1.08) / cheek;
  const forehead = dist(lm[P.foreheadL], lm[P.foreheadR]) / cheek;
  const jaw = dist(lm[P.jawL], lm[P.jawR]) / cheek;
  // Angle at the jaw corner: ~180° is a straight (rounded) line, smaller is more angular.
  const a = lm[P.jawUpper], b = lm[P.jawCorner], c = lm[P.chinSide];
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
  const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const jawAngle = Math.max(0, Math.min(1, (165 - deg) / 45)); // 165°+ → 0 (round), 120° → 1 (angular)
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return { length: clamp(length, 0.6, 2.2), forehead: clamp(forehead, 0.4, 1.4), jaw: clamp(jaw, 0.4, 1.4), jawAngle };
}

/** Classifies face shape from ratios. Rule of thumb used by stylists; there is no scientific standard. */
export function classifyFace(r: FaceRatios): FaceShape {
  const { length, forehead, jaw, jawAngle } = r;
  if (jaw > forehead + 0.06 && jaw > 0.9) return "triangle";
  if (forehead < 0.86 && jaw < 0.8) return "diamond";
  if (forehead - jaw > 0.12 && jaw < 0.82) return "heart";
  if (length >= 1.5) return "oblong";
  if (length < 1.3) return jawAngle > 0.45 || jaw > 0.86 ? "square" : "round";
  if (jawAngle > 0.55 && jaw > 0.84) return "square";
  return "oval";
}

export function faceShapeOf(p: Profile): { shape: FaceShape | null; method: "chosen" | "photo" | "none" } {
  if (p.faceShape) return { shape: p.faceShape, method: "chosen" };
  if (p.faceRatios) return { shape: classifyFace(p.faceRatios), method: "photo" };
  return { shape: null, method: "none" };
}
