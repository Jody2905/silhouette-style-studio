import type { Profile } from "./types";

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonPalette {
  season: Season;
  label: string;
  summary: string;
  best: { name: string; hex: string }[];
  neutrals: { name: string; hex: string }[];
  avoid: { name: string; hex: string }[];
  metals: string;
  lips: { name: string; hex: string }[];
}

export const PALETTES: Record<Season, SeasonPalette> = {
  spring: {
    season: "spring",
    label: "Warm & bright (Spring)",
    summary: "Warm undertone with light to medium depth. Clear, warm, fresh colours keep you looking lively.",
    best: [
      { name: "Coral", hex: "#f2734f" },
      { name: "Warm turquoise", hex: "#2bb3a3" },
      { name: "Golden yellow", hex: "#f2b632" },
      { name: "Peach", hex: "#f7a684" },
      { name: "Apple green", hex: "#7cbf4a" },
      { name: "Tomato red", hex: "#e23b2a" },
      { name: "Periwinkle", hex: "#7f8fd8" },
      { name: "Warm pink", hex: "#f27a9a" },
    ],
    neutrals: [
      { name: "Camel", hex: "#c19a6b" },
      { name: "Ivory", hex: "#f6efdc" },
      { name: "Warm navy", hex: "#2c3a5a" },
      { name: "Light tan", hex: "#d8b892" },
    ],
    avoid: [
      { name: "Black", hex: "#111111" },
      { name: "Icy grey", hex: "#c8ccd2" },
      { name: "Burgundy", hex: "#6b1c2a" },
    ],
    metals: "Gold, rose gold, brass",
    lips: [
      { name: "Coral", hex: "#e2654d" },
      { name: "Peachy nude", hex: "#d58a74" },
      { name: "Warm red", hex: "#d1352a" },
    ],
  },
  summer: {
    season: "summer",
    label: "Cool & soft (Summer)",
    summary: "Cool undertone with light to medium depth and softer contrast. Muted, cool colours look harmonious.",
    best: [
      { name: "Dusty rose", hex: "#c98a96" },
      { name: "Powder blue", hex: "#9bb8d8" },
      { name: "Lavender", hex: "#b2a2d4" },
      { name: "Soft teal", hex: "#5f9ea0" },
      { name: "Raspberry", hex: "#b6406a" },
      { name: "Sage", hex: "#a3b49a" },
      { name: "Cornflower", hex: "#6f8fcf" },
      { name: "Mauve", hex: "#a77b98" },
    ],
    neutrals: [
      { name: "Soft white", hex: "#f2f1ec" },
      { name: "Grey-blue", hex: "#7b8ea3" },
      { name: "Taupe", hex: "#9c8f88" },
      { name: "Soft navy", hex: "#3d4f6e" },
    ],
    avoid: [
      { name: "Orange", hex: "#f07a1a" },
      { name: "Mustard", hex: "#c8a02c" },
      { name: "Pure black", hex: "#0a0a0a" },
    ],
    metals: "Silver, white gold, pewter",
    lips: [
      { name: "Rose", hex: "#b8687a" },
      { name: "Berry", hex: "#9c3a5e" },
      { name: "Soft pink", hex: "#d08e9c" },
    ],
  },
  autumn: {
    season: "autumn",
    label: "Warm & deep (Autumn)",
    summary: "Warm or olive undertone with medium to deep depth. Rich, earthy colours bring out warmth.",
    best: [
      { name: "Rust", hex: "#b4532a" },
      { name: "Olive", hex: "#6b6b2e" },
      { name: "Mustard", hex: "#c8a02c" },
      { name: "Teal", hex: "#1f6f6f" },
      { name: "Terracotta", hex: "#c0623f" },
      { name: "Forest green", hex: "#2f5a3a" },
      { name: "Burnt orange", hex: "#cc5a1f" },
      { name: "Aubergine", hex: "#4f2d48" },
    ],
    neutrals: [
      { name: "Chocolate", hex: "#4a2f23" },
      { name: "Camel", hex: "#c19a6b" },
      { name: "Cream", hex: "#efe3c8" },
      { name: "Khaki", hex: "#8f8456" },
    ],
    avoid: [
      { name: "Icy pastels", hex: "#d8e6f2" },
      { name: "Fuchsia", hex: "#e0218a" },
      { name: "Stark white", hex: "#ffffff" },
    ],
    metals: "Gold, bronze, copper",
    lips: [
      { name: "Brick", hex: "#9c3b2b" },
      { name: "Terracotta", hex: "#b45a40" },
      { name: "Warm brown", hex: "#7a4535" },
    ],
  },
  winter: {
    season: "winter",
    label: "Cool & bold (Winter)",
    summary: "Cool undertone with high contrast between skin, hair and eyes. Clear, saturated and icy colours stand up to your contrast.",
    best: [
      { name: "True red", hex: "#c8102e" },
      { name: "Royal blue", hex: "#2643a8" },
      { name: "Emerald", hex: "#0f7b5b" },
      { name: "Fuchsia", hex: "#d1267a" },
      { name: "Icy pink", hex: "#f4cfe0" },
      { name: "Cobalt", hex: "#0047ab" },
      { name: "Plum", hex: "#6a2459" },
      { name: "Icy blue", hex: "#cfe4f5" },
    ],
    neutrals: [
      { name: "Black", hex: "#111111" },
      { name: "Pure white", hex: "#ffffff" },
      { name: "Charcoal", hex: "#36393f" },
      { name: "Navy", hex: "#1b2a4a" },
    ],
    avoid: [
      { name: "Camel", hex: "#c19a6b" },
      { name: "Orange", hex: "#f07a1a" },
      { name: "Muted olive", hex: "#7d7a4f" },
    ],
    metals: "Silver, platinum, white gold",
    lips: [
      { name: "Blue-red", hex: "#b3142d" },
      { name: "Berry", hex: "#8e1f4f" },
      { name: "Fuchsia", hex: "#c22a74" },
    ],
  },
};

const SKIN_DEPTH = { fair: 1, light: 2, medium: 3, tan: 4, deep: 5 } as const;
const HAIR_DEPTH = { "silver-white": 1, blonde: 1, red: 2, grey: 2, "light-brown": 2, brown: 3, "dark-brown": 4, black: 5 } as const;
const WARM_HAIR = new Set(["red", "blonde", "light-brown"]);

export interface ColorResult {
  season: Season;
  palette: SeasonPalette;
  /** Difference in lightness between hair and skin, 0–4. Higher means bolder contrasts suit you. */
  contrast: "low" | "medium" | "high";
}

export function analyseColor(p: Profile): ColorResult {
  const skin = SKIN_DEPTH[p.skinDepth];
  const hair = HAIR_DEPTH[p.hairColor];
  const diff = Math.abs(hair - skin) + (p.eyeColor === "blue" || p.eyeColor === "green" ? (skin <= 2 ? 0.5 : 1) : 0);
  const contrast = diff >= 2.5 ? "high" : diff >= 1.5 ? "medium" : "low";
  const warm = p.undertone === "warm" || p.undertone === "olive" || (p.undertone === "neutral" && WARM_HAIR.has(p.hairColor));
  const deep = skin >= 4 || hair >= 4;
  let season: Season;
  if (warm) season = deep || p.undertone === "olive" ? "autumn" : "spring";
  else season = contrast === "high" || skin >= 4 ? "winter" : "summer";
  return { season, palette: PALETTES[season], contrast };
}

/* ---------------- colour maths ---------------- */

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB → CIELAB (D65). */
export function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a));
  const [l2, a2, b2] = rgbToLab(hexToRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** How well a colour sits in a palette: "great", "ok" or "clash". */
export function paletteFit(hex: string, palette: SeasonPalette): "great" | "ok" | "clash" {
  const near = (list: { hex: string }[]) => Math.min(...list.map((c) => deltaE(hex, c.hex)));
  if (near(palette.avoid) < 14) return "clash";
  const best = Math.min(near(palette.best), near(palette.neutrals));
  return best < 18 ? "great" : best < 32 ? "ok" : "clash";
}

/**
 * Estimates skin depth and undertone from an average skin colour (sampled from the cheeks in a photo).
 * Lighting changes this a lot, so the app shows it as a starting point the user can correct.
 */
export function skinFromHex(hex: string): { depth: Profile["skinDepth"]; undertone: Profile["undertone"] } {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const depth = L > 76 ? "fair" : L > 66 ? "light" : L > 55 ? "medium" : L > 42 ? "tan" : "deep";
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  const undertone = a < 10 && b > 14 && L < 70 ? "olive" : hue > 60 ? "warm" : hue < 48 ? "cool" : "neutral";
  return { depth, undertone };
}
