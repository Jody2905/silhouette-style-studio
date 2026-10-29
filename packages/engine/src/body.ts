import { CM_PER_IN, type Profile } from "./types";

export const BODY_SHAPES = ["hourglass", "top-hourglass", "bottom-hourglass", "spoon", "rectangle", "triangle", "inverted-triangle", "oval"] as const;
export type BodyShape = (typeof BODY_SHAPES)[number];

export const BODY_SHAPE_LABEL: Record<BodyShape, string> = {
  hourglass: "Hourglass",
  "top-hourglass": "Top hourglass",
  "bottom-hourglass": "Bottom hourglass",
  spoon: "Spoon",
  rectangle: "Rectangle",
  triangle: "Triangle (pear)",
  "inverted-triangle": "Inverted triangle",
  oval: "Oval (fuller middle)",
};

export const BODY_SHAPE_SUMMARY: Record<BodyShape, string> = {
  hourglass: "Bust and hips about equal, with a clearly narrower waist.",
  "top-hourglass": "Bust or chest slightly fuller than hips, with a defined waist.",
  "bottom-hourglass": "Hips slightly fuller than bust, with a defined waist.",
  spoon: "Hips fuller than bust, with a shelf-like high hip and a defined waist.",
  rectangle: "Bust or chest, waist and hips fairly similar; a straight, athletic line.",
  triangle: "Hips noticeably wider than bust or shoulders, with less waist definition.",
  "inverted-triangle": "Shoulders or chest noticeably wider than hips.",
  oval: "Most volume through the middle; waist is as wide as or wider than bust and hips.",
};

export interface BodyResult {
  shape: BodyShape;
  /** How the shape was worked out. */
  method: "measurements" | "photo" | "none";
  heightClass: "petite" | "average" | "tall";
  legs: "shorter" | "balanced" | "longer" | "unknown";
  /** Front-view widths in cm used to draw the avatar. */
  silhouette: { shoulder: number; bust: number; waist: number; hip: number; legRatio: number };
}

/**
 * Female Figure Identification Technique (Simmons, Istook & Devarajan 2004; formulas as published by
 * Lee et al. 2007), with the plus-size adjustment for a fuller abdomen (Sokolowski & Bettencourt Silva).
 * Inputs are circumferences in inches. Applied to everyone, using chest for bust.
 */
export function ffit(bust: number, waist: number, hip: number, highHip: number | null): BodyShape {
  const bh = bust - hip;
  const hb = hip - bust;
  const bw = bust - waist;
  const hw = hip - waist;
  const hhw = highHip ? highHip / waist : 1; // unknown high hip: treat as no "shelf"
  if (waist >= bust && waist >= hip) return "oval";
  if (bh <= 1 && hb < 3.6 && (bw >= 9 || hw >= 10)) return "hourglass";
  if (hb >= 3.6 && hb < 10 && hw >= 9 && hhw < 1.193) return "bottom-hourglass";
  if (bh > 1 && bh < 10 && bw >= 9) return "top-hourglass";
  if (hb > 2 && hw >= 7 && hhw >= 1.193) return "spoon";
  if (hb < 3.6 && bh < 3.6 && bw < 9 && hw < 10) return "rectangle";
  if (hb >= 3.6 && hw < 9) return "triangle";
  if (bh >= 3.6 && bw < 9) return "inverted-triangle";
  return hb > 0 ? "triangle" : "inverted-triangle";
}

/** Shape from front-view photo widths (relative to hip width). Less precise than a tape measure. */
export function shapeFromPhoto(shoulder: number, waist: number, hip = 1): BodyShape {
  const top = shoulder / hip;
  const widest = Math.max(top, 1);
  const defined = waist / widest <= 0.8;
  if (waist / widest >= 0.95) return "oval";
  if (top >= 1.15) return defined ? "top-hourglass" : "inverted-triangle";
  if (top <= 0.92) return defined ? "bottom-hourglass" : "triangle";
  return defined ? "hourglass" : "rectangle";
}

function heightClass(p: Profile): BodyResult["heightClass"] {
  const [petite, tall] = p.wardrobe === "menswear" ? [170, 185] : p.wardrobe === "womenswear" ? [160, 175] : [163, 180];
  return p.heightCm < petite ? "petite" : p.heightCm > tall ? "tall" : "average";
}

export function analyseBody(p: Profile): BodyResult {
  const m = p.measurements;
  const inch = (cm: number) => cm / CM_PER_IN;
  let shape: BodyShape = "rectangle";
  let method: BodyResult["method"] = "none";
  if (m.bust && m.waist && m.hip) {
    shape = ffit(inch(m.bust), inch(m.waist), inch(m.hip), m.highHip ? inch(m.highHip) : null);
    method = "measurements";
  } else if (p.photoBody) {
    shape = shapeFromPhoto(p.photoBody.shoulder, p.photoBody.waist, p.photoBody.hip);
    method = "photo";
  }

  // Leg length: inseam/height averages about 0.45; photo hip-joint-to-heel/height about 0.51.
  let legs: BodyResult["legs"] = "unknown";
  let legRatio = 0.5;
  if (m.inseam) {
    const r = m.inseam / p.heightCm;
    legs = r < 0.44 ? "shorter" : r > 0.47 ? "longer" : "balanced";
    legRatio = r + 0.05;
  } else if (p.photoBody?.legRatio) {
    const r = p.photoBody.legRatio;
    legs = r < 0.49 ? "shorter" : r > 0.53 ? "longer" : "balanced";
    legRatio = r;
  }

  // Front-view widths for the avatar. Circumference ÷ ~2.9–3.0 approximates front width.
  let silhouette: BodyResult["silhouette"];
  if (m.bust && m.waist && m.hip) {
    const bust = m.bust / 3;
    silhouette = {
      shoulder: m.shoulder ?? bust * (p.wardrobe === "menswear" ? 1.2 : 1.08),
      bust,
      waist: m.waist / 3,
      hip: m.hip / 2.9,
      legRatio,
    };
  } else {
    const hip = p.heightCm * 0.21;
    const pb = p.photoBody ?? { shoulder: p.wardrobe === "menswear" ? 1.2 : 1.05, waist: 0.82, hip: 1 };
    silhouette = { shoulder: hip * pb.shoulder, bust: hip * ((pb.shoulder + 1) / 2) * 0.95, waist: hip * pb.waist, hip, legRatio };
  }

  return { shape, method, heightClass: heightClass(p), legs, silhouette };
}
