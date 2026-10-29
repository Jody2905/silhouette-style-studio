import type { FaceShape, Vibe } from "./types";

export const SLOTS = ["hair", "top", "bottom", "dress", "outer", "shoes", "bag", "belt", "necklace", "earrings", "scarf", "wrist", "glasses", "hat", "lips", "eyes", "blush", "beard"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<Slot, string> = {
  hair: "Hair",
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses & jumpsuits",
  outer: "Outerwear",
  shoes: "Shoes",
  bag: "Bags",
  belt: "Belts",
  necklace: "Necklaces",
  earrings: "Earrings",
  scarf: "Scarves",
  wrist: "Watches & bracelets",
  glasses: "Glasses",
  hat: "Hats",
  lips: "Lips",
  eyes: "Eyes",
  blush: "Blush",
  beard: "Beard",
};

export const PATTERNS = ["solid", "v-stripe", "h-stripe", "dots", "check", "floral"] as const;
export type Pattern = (typeof PATTERNS)[number];
export const PATTERN_LABEL: Record<Pattern, string> = {
  solid: "Solid",
  "v-stripe": "Vertical stripes",
  "h-stripe": "Horizontal stripes",
  dots: "Polka dots",
  check: "Check",
  floral: "Floral",
};

/** w = womenswear, m = menswear. Items with both are unisex. */
export type Line = "w" | "m";

export type Neckline = "v" | "scoop" | "crew" | "boat" | "turtle" | "square" | "collar" | "sweetheart" | "halter" | "cowl";

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  lines: Line[];
  color: string;
  /** Whether a print/pattern can be applied. */
  patternable?: boolean;
  vibes: Vibe[];
  /** Trend ids this piece belongs to (see trends.ts). */
  trends?: string[];
  attrs: {
    neckline?: Neckline;
    fit?: "fitted" | "relaxed" | "oversized";
    length?: "crop" | "waist" | "hip" | "tunic" | "long" | "mini" | "knee" | "midi" | "maxi" | "cropped" | "full" | "short" | "medium";
    sleeve?: "none" | "short" | "long" | "puff";
    shoulderDetail?: boolean;
    kind?: string;
    rise?: "high" | "mid" | "low";
    leg?: "skinny" | "straight" | "wide" | "flare" | "bootcut" | "tapered" | "balloon";
    skirt?: "a-line" | "pencil" | "pleated" | "slip" | "wrap" | "fit-flare" | "sheath" | "shift";
    waist?: "defined" | "drop" | "empire" | "none";
    structure?: "structured" | "soft";
    heel?: "flat" | "block" | "heel";
    sheer?: boolean;
    /** Hair, glasses, earrings and beards: face shapes they suit and ones to be careful with. */
    goodFor?: FaceShape[];
    carefulWith?: FaceShape[];
    /** Hair only. */
    volume?: "top" | "sides" | "even";
    fringe?: boolean;
    makeup?: "natural" | "bold";
    /** Bags: overall size, and where the strap makes it sit. */
    size?: "mini" | "small" | "medium" | "large";
    carry?: "hand" | "shoulder" | "crossbody" | "back";
    /** Jewellery: a statement piece draws the eye. */
    statement?: boolean;
  };
}

const W: Line[] = ["w"];
const M: Line[] = ["m"];
const U: Line[] = ["w", "m"];

export const CATALOG: Item[] = [
  /* ---------------- hair ---------------- */
  { id: "hair-pixie", slot: "hair", name: "Pixie cut", lines: W, color: "#3b2a20", vibes: ["edgy", "minimal"], attrs: { length: "short", volume: "top", goodFor: ["oval", "heart", "diamond"], carefulWith: ["round"] } },
  { id: "hair-bob", slot: "hair", name: "Chin-length bob", lines: W, color: "#3b2a20", vibes: ["classic", "minimal"], trends: ["roaring-twenties"], attrs: { length: "short", volume: "sides", goodFor: ["oval", "oblong", "heart", "diamond"], carefulWith: ["round", "square"] } },
  { id: "hair-lob", slot: "hair", name: "Lob (long bob)", lines: W, color: "#3b2a20", vibes: ["classic", "minimal", "preppy"], attrs: { length: "medium", volume: "even", goodFor: ["round", "square", "oval", "heart"] } },
  { id: "hair-curtain", slot: "hair", name: "Curtain bangs & layers", lines: W, color: "#3b2a20", vibes: ["boho", "romantic"], attrs: { length: "long", volume: "sides", fringe: true, goodFor: ["oblong", "heart", "square", "oval"], carefulWith: ["round"] } },
  { id: "hair-long-layers", slot: "hair", name: "Long layers", lines: W, color: "#3b2a20", vibes: ["romantic", "classic", "glam"], attrs: { length: "long", volume: "even", goodFor: ["round", "square", "oval", "heart", "diamond"], carefulWith: ["oblong"] } },
  { id: "hair-curls", slot: "hair", name: "Defined curls", lines: U, color: "#2a1d16", vibes: ["boho", "romantic", "glam"], attrs: { length: "medium", volume: "sides", goodFor: ["oblong", "diamond", "oval", "heart"], carefulWith: ["round"] } },
  { id: "hair-afro", slot: "hair", name: "Rounded afro", lines: U, color: "#1d1410", vibes: ["glam", "edgy", "boho"], attrs: { length: "medium", volume: "even", goodFor: ["oval", "oblong", "heart", "diamond", "square"] } },
  { id: "hair-braids", slot: "hair", name: "Long box braids", lines: U, color: "#1d1410", vibes: ["streetwear", "boho", "glam"], attrs: { length: "long", volume: "even", goodFor: ["oval", "round", "square", "heart", "diamond", "triangle", "oblong"] } },
  { id: "hair-locs", slot: "hair", name: "Locs", lines: U, color: "#1d1410", vibes: ["boho", "streetwear", "edgy"], attrs: { length: "long", volume: "even", goodFor: ["oval", "round", "square", "heart", "diamond", "triangle", "oblong"] } },
  { id: "hair-high-bun", slot: "hair", name: "High bun", lines: W, color: "#3b2a20", vibes: ["minimal", "sporty", "glam"], attrs: { length: "long", volume: "top", goodFor: ["oval", "heart", "diamond", "round"], carefulWith: ["oblong"] } },
  { id: "hair-buzz", slot: "hair", name: "Buzz cut", lines: U, color: "#2a1d16", vibes: ["minimal", "sporty", "edgy"], attrs: { length: "short", volume: "even", goodFor: ["oval", "square", "diamond"], carefulWith: ["round", "oblong"] } },
  { id: "hair-crop", slot: "hair", name: "Textured crop", lines: M, color: "#2a1d16", vibes: ["streetwear", "minimal"], attrs: { length: "short", volume: "top", fringe: true, goodFor: ["round", "oblong", "square", "oval"] } },
  { id: "hair-quiff", slot: "hair", name: "Quiff", lines: M, color: "#2a1d16", vibes: ["classic", "glam", "preppy"], attrs: { length: "short", volume: "top", goodFor: ["round", "square", "oval", "heart"], carefulWith: ["oblong"] } },
  { id: "hair-side-part", slot: "hair", name: "Classic side part", lines: M, color: "#2a1d16", vibes: ["classic", "preppy"], attrs: { length: "short", volume: "even", goodFor: ["oval", "oblong", "square", "diamond"] } },
  { id: "hair-curly-top", slot: "hair", name: "Curly top with fade", lines: M, color: "#1d1410", vibes: ["streetwear", "sporty"], attrs: { length: "short", volume: "top", goodFor: ["round", "oval", "heart", "square"], carefulWith: ["oblong"] } },
  { id: "hair-man-bun", slot: "hair", name: "Long hair, half-up", lines: M, color: "#2a1d16", vibes: ["boho", "edgy"], attrs: { length: "long", volume: "even", goodFor: ["square", "oval", "diamond", "triangle"], carefulWith: ["round"] } },

  /* ---------------- tops ---------------- */
  { id: "top-tee", slot: "top", name: "Crew-neck tee", lines: U, color: "#f2f1ec", patternable: true, vibes: ["minimal", "streetwear", "sporty", "classic"], attrs: { neckline: "crew", fit: "relaxed", length: "hip", sleeve: "short" } },
  { id: "top-v-tee", slot: "top", name: "V-neck tee", lines: U, color: "#36393f", patternable: true, vibes: ["minimal", "classic"], attrs: { neckline: "v", fit: "fitted", length: "hip", sleeve: "short" } },
  { id: "top-shirt", slot: "top", name: "Button-up shirt", lines: U, color: "#9bb8d8", patternable: true, vibes: ["classic", "preppy"], attrs: { neckline: "collar", fit: "relaxed", length: "hip", sleeve: "long" } },
  { id: "top-rugby", slot: "top", name: "Striped rugby shirt", lines: U, color: "#1b2a4a", patternable: true, vibes: ["preppy", "sporty"], trends: ["preppy"], attrs: { neckline: "collar", fit: "relaxed", length: "hip", sleeve: "long" } },
  { id: "top-turtleneck", slot: "top", name: "Fine-knit turtleneck", lines: U, color: "#111111", vibes: ["minimal", "classic", "edgy"], attrs: { neckline: "turtle", fit: "fitted", length: "hip", sleeve: "long" } },
  { id: "top-cable-knit", slot: "top", name: "Chunky cable-knit sweater", lines: U, color: "#efe3c8", vibes: ["classic", "preppy", "boho"], trends: ["grandpa-knit"], attrs: { neckline: "crew", fit: "oversized", length: "hip", sleeve: "long" } },
  { id: "top-wrap", slot: "top", name: "Wrap blouse", lines: W, color: "#b6406a", patternable: true, vibes: ["romantic", "classic"], attrs: { neckline: "v", fit: "fitted", length: "waist", sleeve: "long" } },
  { id: "top-boat", slot: "top", name: "Boat-neck top", lines: W, color: "#1b2a4a", patternable: true, vibes: ["classic", "minimal", "preppy"], attrs: { neckline: "boat", fit: "fitted", length: "hip", sleeve: "long" } },
  { id: "top-square", slot: "top", name: "Square-neck bodysuit", lines: W, color: "#f2734f", vibes: ["minimal", "glam"], attrs: { neckline: "square", fit: "fitted", length: "waist", sleeve: "none" } },
  { id: "top-puff", slot: "top", name: "Puff-sleeve blouse", lines: W, color: "#f6efdc", patternable: true, vibes: ["romantic", "boho"], attrs: { neckline: "scoop", fit: "relaxed", length: "waist", sleeve: "puff", shoulderDetail: true } },
  { id: "top-halter", slot: "top", name: "Halter top", lines: W, color: "#c8102e", vibes: ["glam", "edgy"], attrs: { neckline: "halter", fit: "fitted", length: "crop", sleeve: "none" } },
  { id: "top-cowl", slot: "top", name: "Satin cowl-neck cami", lines: W, color: "#a77b98", vibes: ["glam", "romantic", "minimal"], attrs: { neckline: "cowl", fit: "relaxed", length: "waist", sleeve: "none" } },
  { id: "top-sheer", slot: "top", name: "Sheer mesh layer", lines: U, color: "#36393f", vibes: ["edgy", "glam"], trends: ["sheer"], attrs: { neckline: "crew", fit: "fitted", length: "hip", sleeve: "long", sheer: true } },
  { id: "top-polo", slot: "top", name: "Knit polo", lines: U, color: "#2f5a3a", vibes: ["preppy", "classic"], trends: ["preppy"], attrs: { neckline: "collar", fit: "fitted", length: "hip", sleeve: "short" } },
  { id: "top-hoodie", slot: "top", name: "Oversized hoodie", lines: U, color: "#7b8ea3", vibes: ["streetwear", "sporty"], attrs: { neckline: "crew", fit: "oversized", length: "hip", sleeve: "long" } },
  { id: "top-crop", slot: "top", name: "Cropped knit", lines: W, color: "#f27a9a", vibes: ["streetwear", "glam"], attrs: { neckline: "scoop", fit: "fitted", length: "crop", sleeve: "long" } },

  /* ---------------- bottoms ---------------- */
  { id: "bottom-wide-trousers", slot: "bottom", name: "High-rise wide-leg trousers", lines: U, color: "#c19a6b", patternable: true, vibes: ["classic", "minimal", "glam"], attrs: { kind: "trousers", rise: "high", leg: "wide", length: "full" } },
  { id: "bottom-straight-jeans", slot: "bottom", name: "Straight-leg jeans", lines: U, color: "#3d5a80", vibes: ["classic", "streetwear", "minimal"], attrs: { kind: "jeans", rise: "mid", leg: "straight", length: "full" } },
  { id: "bottom-skinny", slot: "bottom", name: "Skinny jeans", lines: U, color: "#22252b", vibes: ["edgy", "streetwear"], attrs: { kind: "jeans", rise: "mid", leg: "skinny", length: "full" } },
  { id: "bottom-flare", slot: "bottom", name: "High-rise flares", lines: W, color: "#3d5a80", vibes: ["boho", "glam"], attrs: { kind: "jeans", rise: "high", leg: "flare", length: "full" } },
  { id: "bottom-bootcut", slot: "bottom", name: "Bootcut jeans", lines: U, color: "#3d5a80", vibes: ["classic", "boho"], attrs: { kind: "jeans", rise: "mid", leg: "bootcut", length: "full" } },
  { id: "bottom-chinos", slot: "bottom", name: "Tapered chinos", lines: M, color: "#8f8456", patternable: true, vibes: ["preppy", "classic"], attrs: { kind: "trousers", rise: "mid", leg: "tapered", length: "full" } },
  { id: "bottom-pinstripe", slot: "bottom", name: "Pinstripe suit trousers", lines: U, color: "#36393f", vibes: ["classic", "glam", "edgy"], trends: ["power-suiting"], attrs: { kind: "trousers", rise: "high", leg: "straight", length: "full" } },
  { id: "bottom-balloon", slot: "bottom", name: "Balloon trousers", lines: U, color: "#efe3c8", vibes: ["boho", "edgy", "streetwear"], trends: ["boho-revival"], attrs: { kind: "trousers", rise: "high", leg: "balloon", length: "cropped" } },
  { id: "bottom-cargo", slot: "bottom", name: "Relaxed cargo pants", lines: U, color: "#6b6b2e", vibes: ["streetwear", "sporty"], attrs: { kind: "trousers", rise: "mid", leg: "wide", length: "full" } },
  { id: "bottom-a-line", slot: "bottom", name: "A-line midi skirt", lines: W, color: "#2f5a3a", patternable: true, vibes: ["classic", "romantic", "preppy"], attrs: { kind: "skirt", rise: "high", skirt: "a-line", length: "midi" } },
  { id: "bottom-pencil", slot: "bottom", name: "Pencil skirt", lines: W, color: "#111111", vibes: ["classic", "glam"], trends: ["power-suiting"], attrs: { kind: "skirt", rise: "high", skirt: "pencil", length: "knee" } },
  { id: "bottom-pleated", slot: "bottom", name: "Pleated check skirt", lines: W, color: "#6b1c2a", patternable: true, vibes: ["preppy", "edgy"], trends: ["checks", "preppy"], attrs: { kind: "skirt", rise: "high", skirt: "pleated", length: "mini" } },
  { id: "bottom-slip", slot: "bottom", name: "Satin slip skirt", lines: W, color: "#c98a96", vibes: ["minimal", "romantic", "glam"], attrs: { kind: "skirt", rise: "mid", skirt: "slip", length: "midi" } },
  { id: "bottom-maxi", slot: "bottom", name: "Tiered maxi skirt", lines: W, color: "#4f2d48", patternable: true, vibes: ["boho", "romantic"], trends: ["boho-revival"], attrs: { kind: "skirt", rise: "mid", skirt: "a-line", length: "maxi" } },
  { id: "bottom-shorts", slot: "bottom", name: "Tailored shorts", lines: U, color: "#c19a6b", patternable: true, vibes: ["preppy", "sporty"], attrs: { kind: "shorts", rise: "high", leg: "straight", length: "short" } },

  /* ---------------- dresses ---------------- */
  { id: "dress-wrap", slot: "dress", name: "Wrap dress", lines: W, color: "#b4532a", patternable: true, vibes: ["classic", "romantic"], attrs: { neckline: "v", waist: "defined", skirt: "wrap", length: "midi", sleeve: "long" } },
  { id: "dress-fit-flare", slot: "dress", name: "Fit-and-flare dress", lines: W, color: "#2643a8", patternable: true, vibes: ["romantic", "preppy", "classic"], attrs: { neckline: "scoop", waist: "defined", skirt: "fit-flare", length: "knee", sleeve: "short" } },
  { id: "dress-sheath", slot: "dress", name: "Sheath dress", lines: W, color: "#111111", vibes: ["classic", "minimal", "glam"], attrs: { neckline: "boat", waist: "defined", skirt: "sheath", length: "knee", sleeve: "none" } },
  { id: "dress-slip", slot: "dress", name: "Slip dress", lines: W, color: "#c98a96", vibes: ["minimal", "romantic", "glam"], attrs: { neckline: "cowl", waist: "none", skirt: "slip", length: "midi", sleeve: "none" } },
  { id: "dress-shift", slot: "dress", name: "Shift dress", lines: W, color: "#f2b632", patternable: true, vibes: ["minimal", "classic"], attrs: { neckline: "crew", waist: "none", skirt: "shift", length: "knee", sleeve: "short" } },
  { id: "dress-empire", slot: "dress", name: "Empire-waist maxi", lines: W, color: "#5f9ea0", patternable: true, vibes: ["boho", "romantic"], attrs: { neckline: "v", waist: "empire", skirt: "a-line", length: "maxi", sleeve: "short" } },
  { id: "dress-drop-waist", slot: "dress", name: "Drop-waist fringe dress", lines: W, color: "#efe3c8", vibes: ["glam", "romantic"], trends: ["roaring-twenties", "fully-loaded"], attrs: { neckline: "scoop", waist: "drop", skirt: "shift", length: "knee", sleeve: "none" } },
  { id: "dress-jumpsuit", slot: "dress", name: "Belted jumpsuit", lines: U, color: "#6b6b2e", vibes: ["minimal", "edgy", "classic"], attrs: { neckline: "collar", waist: "defined", leg: "wide", length: "full", sleeve: "long" } },

  /* ---------------- outerwear ---------------- */
  { id: "outer-blazer", slot: "outer", name: "Tailored blazer", lines: U, color: "#1b2a4a", patternable: true, vibes: ["classic", "preppy", "minimal"], attrs: { kind: "blazer", length: "hip", structure: "structured", fit: "fitted", shoulderDetail: true } },
  { id: "outer-db-blazer", slot: "outer", name: "Double-breasted pinstripe blazer", lines: U, color: "#36393f", vibes: ["classic", "glam", "edgy"], trends: ["power-suiting"], attrs: { kind: "blazer", length: "hip", structure: "structured", fit: "relaxed", shoulderDetail: true } },
  { id: "outer-trench", slot: "outer", name: "Belted trench coat", lines: U, color: "#c19a6b", vibes: ["classic", "minimal"], trends: ["functional-outerwear"], attrs: { kind: "trench", length: "long", structure: "structured", fit: "relaxed" } },
  { id: "outer-cocoon", slot: "outer", name: "Oversized cocoon coat", lines: U, color: "#9c8f88", vibes: ["minimal", "edgy"], trends: ["oversized-outerwear"], attrs: { kind: "cocoon", length: "long", structure: "soft", fit: "oversized" } },
  { id: "outer-shearling", slot: "outer", name: "Shearling coat", lines: U, color: "#d8b892", vibes: ["boho", "glam"], trends: ["oversized-outerwear"], attrs: { kind: "shearling", length: "long", structure: "soft", fit: "oversized", shoulderDetail: true } },
  { id: "outer-puffer", slot: "outer", name: "Cropped puffer", lines: U, color: "#111111", vibes: ["streetwear", "sporty"], trends: ["oversized-outerwear"], attrs: { kind: "puffer", length: "crop", structure: "soft", fit: "oversized", shoulderDetail: true } },
  { id: "outer-leather", slot: "outer", name: "Leather jacket", lines: U, color: "#111111", vibes: ["edgy", "streetwear"], attrs: { kind: "leather", length: "crop", structure: "structured", fit: "fitted" } },
  { id: "outer-cardigan", slot: "outer", name: "Long cardigan", lines: U, color: "#a3b49a", vibes: ["boho", "classic", "romantic"], trends: ["grandpa-knit"], attrs: { kind: "cardigan", length: "long", structure: "soft", fit: "relaxed" } },
  { id: "outer-cape", slot: "outer", name: "Wool cape", lines: W, color: "#6b1c2a", vibes: ["glam", "boho", "classic"], trends: ["capes"], attrs: { kind: "cape", length: "hip", structure: "soft", fit: "oversized", shoulderDetail: true } },

  /* ---------------- shoes ---------------- */
  { id: "shoes-sneakers", slot: "shoes", name: "White sneakers", lines: U, color: "#f6f6f4", vibes: ["minimal", "streetwear", "sporty"], attrs: { kind: "sneaker", heel: "flat" } },
  { id: "shoes-loafers", slot: "shoes", name: "Chunky loafers", lines: U, color: "#2a1d16", vibes: ["preppy", "classic"], trends: ["preppy"], attrs: { kind: "loafer", heel: "block" } },
  { id: "shoes-boots", slot: "shoes", name: "Knee-high boots", lines: W, color: "#4a2f23", vibes: ["boho", "classic", "edgy"], attrs: { kind: "boot", heel: "block" } },
  { id: "shoes-chelsea", slot: "shoes", name: "Chelsea boots", lines: U, color: "#4a2f23", vibes: ["classic", "edgy"], attrs: { kind: "boot", heel: "block" } },
  { id: "shoes-pumps", slot: "shoes", name: "Pointed pumps", lines: W, color: "#111111", vibes: ["classic", "glam"], trends: ["power-suiting"], attrs: { kind: "pump", heel: "heel" } },
  { id: "shoes-statement", slot: "shoes", name: "Embellished heels", lines: W, color: "#c8102e", vibes: ["glam"], trends: ["statement-shoes", "fully-loaded"], attrs: { kind: "pump", heel: "heel" } },
  { id: "shoes-brogues", slot: "shoes", name: "Brogues", lines: U, color: "#6b3f24", vibes: ["classic", "preppy"], attrs: { kind: "brogue", heel: "flat" } },
  { id: "shoes-sandals", slot: "shoes", name: "Strappy flat sandals", lines: U, color: "#c19a6b", vibes: ["boho", "minimal"], attrs: { kind: "sandal", heel: "flat" } },

  /* ---------------- accessories ---------------- */
  { id: "belt-waist", slot: "belt", name: "Belt at the waist", lines: U, color: "#4a2f23", vibes: ["classic", "romantic"], attrs: { kind: "waist" } },
  { id: "belt-hip", slot: "belt", name: "Slouchy hip belt", lines: W, color: "#c8a02c", vibes: ["boho", "edgy"], trends: ["decorative-belt"], attrs: { kind: "hip" } },
  { id: "ear-studs", slot: "earrings", name: "Studs", lines: U, color: "#d4af37", vibes: ["minimal", "classic"], attrs: { kind: "studs", goodFor: ["oblong", "heart", "diamond", "oval"] } },
  { id: "ear-hoops", slot: "earrings", name: "Hoops", lines: U, color: "#d4af37", vibes: ["streetwear", "glam", "boho"], attrs: { kind: "hoops", goodFor: ["square", "oblong", "diamond", "oval"], carefulWith: ["round"] } },
  { id: "ear-drops", slot: "earrings", name: "Long drops", lines: W, color: "#d4af37", vibes: ["glam", "romantic"], attrs: { kind: "drop", goodFor: ["round", "heart", "square", "oval"], carefulWith: ["oblong"] } },
  { id: "ear-pearls", slot: "earrings", name: "Pearl drops", lines: W, color: "#f2efe6", vibes: ["classic", "romantic"], trends: ["roaring-twenties"], attrs: { kind: "drop", goodFor: ["round", "heart", "square", "oval"], carefulWith: ["oblong"] } },
  { id: "glasses-round", slot: "glasses", name: "Round frames", lines: U, color: "#2a1d16", vibes: ["boho", "classic"], attrs: { kind: "round", goodFor: ["square", "triangle", "oblong", "oval", "heart"], carefulWith: ["round"] } },
  { id: "glasses-square", slot: "glasses", name: "Square frames", lines: U, color: "#111111", vibes: ["minimal", "edgy", "classic"], attrs: { kind: "square", goodFor: ["round", "oval", "heart"], carefulWith: ["square"] } },
  { id: "glasses-cat-eye", slot: "glasses", name: "Cat-eye frames", lines: W, color: "#6b1c2a", vibes: ["glam", "romantic", "classic"], attrs: { kind: "cat-eye", goodFor: ["diamond", "triangle", "round", "oval"], carefulWith: ["heart"] } },
  { id: "glasses-aviator", slot: "glasses", name: "Aviators", lines: U, color: "#d4af37", vibes: ["classic", "edgy", "sporty"], attrs: { kind: "aviator", goodFor: ["heart", "oblong", "square", "oval"], carefulWith: ["triangle"] } },
  { id: "hat-beanie", slot: "hat", name: "Beanie", lines: U, color: "#6b1c2a", vibes: ["streetwear", "sporty"], attrs: { kind: "beanie" } },
  { id: "hat-fedora", slot: "hat", name: "Wide-brim fedora", lines: U, color: "#4a2f23", vibes: ["boho", "classic"], attrs: { kind: "fedora" } },
  { id: "hat-trapper", slot: "hat", name: "Faux-fur trapper hat", lines: U, color: "#d8b892", vibes: ["edgy", "glam"], trends: ["oversized-outerwear"], attrs: { kind: "trapper" } },
  { id: "hat-cap", slot: "hat", name: "Baseball cap", lines: U, color: "#1b2a4a", vibes: ["sporty", "streetwear"], attrs: { kind: "cap" } },

  /* ---------------- bags ---------------- */
  { id: "bag-tote", slot: "bag", name: "Leather tote", lines: U, color: "#c19a6b", vibes: ["classic", "minimal"], attrs: { kind: "tote", size: "large", carry: "shoulder", structure: "soft" } },
  { id: "bag-top-handle", slot: "bag", name: "Structured top-handle bag", lines: W, color: "#6b1c2a", vibes: ["classic", "preppy", "glam"], trends: ["preppy"], attrs: { kind: "top-handle", size: "medium", carry: "hand", structure: "structured" } },
  { id: "bag-baguette", slot: "bag", name: "Shoulder baguette", lines: W, color: "#111111", vibes: ["glam", "minimal", "edgy"], trends: ["roaring-twenties"], attrs: { kind: "baguette", size: "small", carry: "shoulder", structure: "structured" } },
  { id: "bag-crossbody", slot: "bag", name: "Mini crossbody", lines: U, color: "#2a1d16", vibes: ["streetwear", "minimal", "sporty"], attrs: { kind: "crossbody", size: "mini", carry: "crossbody", structure: "structured" } },
  { id: "bag-hobo", slot: "bag", name: "Slouchy hobo bag", lines: W, color: "#8a6040", vibes: ["boho", "romantic"], trends: ["boho-revival"], attrs: { kind: "hobo", size: "large", carry: "shoulder", structure: "soft" } },
  { id: "bag-clutch", slot: "bag", name: "Evening clutch", lines: W, color: "#d4af37", vibes: ["glam"], trends: ["fully-loaded"], attrs: { kind: "clutch", size: "small", carry: "hand", structure: "structured" } },
  { id: "bag-backpack", slot: "bag", name: "Minimal backpack", lines: U, color: "#111111", vibes: ["sporty", "streetwear", "minimal"], attrs: { kind: "backpack", size: "medium", carry: "back", structure: "soft" } },
  { id: "bag-messenger", slot: "bag", name: "Leather messenger bag", lines: M, color: "#4a2f23", vibes: ["classic", "preppy"], attrs: { kind: "messenger", size: "medium", carry: "crossbody", structure: "structured" } },
  { id: "bag-bucket", slot: "bag", name: "Drawstring bucket bag", lines: W, color: "#a3b49a", vibes: ["boho", "minimal"], attrs: { kind: "bucket", size: "medium", carry: "shoulder", structure: "soft" } },

  /* ---------------- necklaces ---------------- */
  { id: "neck-pendant", slot: "necklace", name: "Long pendant", lines: W, color: "#d4af37", vibes: ["boho", "minimal", "classic"], attrs: { kind: "pendant", length: "long", goodFor: ["round", "square", "heart", "oval"], carefulWith: ["oblong"] } },
  { id: "neck-fine-chain", slot: "necklace", name: "Fine short chain", lines: U, color: "#d4af37", vibes: ["minimal", "classic", "streetwear"], attrs: { kind: "chain", length: "short", goodFor: ["oblong", "diamond", "triangle", "oval", "heart"] } },
  { id: "neck-choker", slot: "necklace", name: "Choker", lines: W, color: "#111111", vibes: ["edgy", "glam"], attrs: { kind: "choker", length: "short", goodFor: ["oblong", "diamond", "oval"], carefulWith: ["round", "square"] } },
  { id: "neck-pearls", slot: "necklace", name: "Pearl strand", lines: W, color: "#f2efe6", vibes: ["classic", "romantic", "preppy"], trends: ["roaring-twenties"], attrs: { kind: "pearls", length: "medium", goodFor: ["oval", "heart", "oblong", "diamond", "triangle"] } },
  { id: "neck-layered", slot: "necklace", name: "Layered chains", lines: W, color: "#d4af37", vibes: ["boho", "glam", "streetwear"], trends: ["fully-loaded"], attrs: { kind: "layered", length: "medium", statement: true, goodFor: ["round", "square", "oval", "heart"] } },
  { id: "neck-statement", slot: "necklace", name: "Statement bib necklace", lines: W, color: "#d4af37", vibes: ["glam", "edgy"], trends: ["fully-loaded"], attrs: { kind: "bib", length: "short", statement: true, goodFor: ["oblong", "heart", "triangle", "oval"], carefulWith: ["round"] } },
  { id: "neck-cuban", slot: "necklace", name: "Curb chain", lines: M, color: "#c0c0c0", vibes: ["streetwear", "edgy"], attrs: { kind: "chain", length: "short", goodFor: ["oblong", "diamond", "oval", "triangle"] } },

  /* ---------------- scarves ---------------- */
  { id: "scarf-silk", slot: "scarf", name: "Silk neck scarf", lines: W, color: "#b6406a", patternable: true, vibes: ["classic", "preppy", "romantic"], trends: ["preppy"], attrs: { kind: "neckerchief", length: "short" } },
  { id: "scarf-long", slot: "scarf", name: "Long knit scarf", lines: U, color: "#9c8f88", patternable: true, vibes: ["minimal", "classic", "streetwear"], attrs: { kind: "long", length: "long" } },
  { id: "scarf-blanket", slot: "scarf", name: "Chunky blanket scarf", lines: U, color: "#6b1c2a", patternable: true, vibes: ["boho", "streetwear"], trends: ["checks"], attrs: { kind: "blanket", length: "medium" } },
  { id: "scarf-bandana", slot: "scarf", name: "Bandana", lines: U, color: "#c8102e", patternable: true, vibes: ["boho", "edgy", "streetwear"], attrs: { kind: "bandana", length: "short" } },

  /* ---------------- watches & bracelets ---------------- */
  { id: "wrist-watch", slot: "wrist", name: "Classic watch", lines: U, color: "#c0c0c0", vibes: ["classic", "minimal", "preppy"], attrs: { kind: "watch" } },
  { id: "wrist-sport-watch", slot: "wrist", name: "Sport watch", lines: U, color: "#111111", vibes: ["sporty", "streetwear"], attrs: { kind: "watch" } },
  { id: "wrist-bangles", slot: "wrist", name: "Stacked bangles", lines: W, color: "#d4af37", vibes: ["boho", "glam"], trends: ["fully-loaded"], attrs: { kind: "bangles", statement: true } },
  { id: "wrist-cuff", slot: "wrist", name: "Sculptural cuff", lines: W, color: "#d4af37", vibes: ["glam", "edgy", "minimal"], attrs: { kind: "cuff", statement: true } },
  { id: "wrist-beaded", slot: "wrist", name: "Beaded bracelets", lines: U, color: "#8a6040", vibes: ["boho", "streetwear"], trends: ["boho-revival"], attrs: { kind: "beads" } },

  /* ---------------- makeup & grooming ---------------- */
  { id: "lips-sheer", slot: "lips", name: "Tinted balm", lines: U, color: "#c98a7a", vibes: ["minimal", "sporty", "classic"], attrs: { makeup: "natural" } },
  { id: "lips-nude", slot: "lips", name: "Your-lips-but-better nude", lines: W, color: "#b07a68", vibes: ["minimal", "classic"], attrs: { makeup: "natural" } },
  { id: "lips-red", slot: "lips", name: "Classic red", lines: W, color: "#c8102e", vibes: ["glam", "classic", "edgy"], attrs: { makeup: "bold" } },
  { id: "lips-berry", slot: "lips", name: "Deep berry", lines: W, color: "#8e1f4f", vibes: ["glam", "edgy"], attrs: { makeup: "bold" } },
  { id: "lips-coral", slot: "lips", name: "Coral", lines: W, color: "#e2654d", vibes: ["boho", "romantic"], attrs: { makeup: "bold" } },
  { id: "eyes-natural", slot: "eyes", name: "Mascara & brushed brows", lines: U, color: "#2a1d16", vibes: ["minimal", "classic", "sporty"], attrs: { makeup: "natural" } },
  { id: "eyes-winged", slot: "eyes", name: "Winged liner", lines: W, color: "#111111", vibes: ["glam", "edgy", "classic"], trends: ["roaring-twenties"], attrs: { makeup: "bold" } },
  { id: "eyes-smoky", slot: "eyes", name: "Smoky eye", lines: W, color: "#3a2f3a", vibes: ["glam", "edgy"], attrs: { makeup: "bold" } },
  { id: "blush-apples", slot: "blush", name: "Blush on the apples", lines: W, color: "#e58f8f", vibes: ["romantic", "boho"], attrs: { kind: "apples" } },
  { id: "blush-sculpt", slot: "blush", name: "Lifted cheekbone blush", lines: W, color: "#c97a6a", vibes: ["glam", "classic"], attrs: { kind: "cheekbones" } },
  { id: "beard-stubble", slot: "beard", name: "Designer stubble", lines: M, color: "#2a1d16", vibes: ["classic", "edgy", "minimal"], attrs: { kind: "stubble", goodFor: ["oval", "oblong", "square", "diamond"] } },
  { id: "beard-boxed", slot: "beard", name: "Short boxed beard", lines: M, color: "#2a1d16", vibes: ["classic", "preppy"], attrs: { kind: "boxed", goodFor: ["round", "oval", "heart", "triangle"] } },
  { id: "beard-full", slot: "beard", name: "Full rounded beard", lines: M, color: "#2a1d16", vibes: ["boho", "edgy"], attrs: { kind: "full", goodFor: ["oblong", "heart", "diamond", "square"], carefulWith: ["round"] } },
  { id: "beard-goatee", slot: "beard", name: "Goatee", lines: M, color: "#2a1d16", vibes: ["edgy", "streetwear"], attrs: { kind: "goatee", goodFor: ["round", "square"], carefulWith: ["oblong"] } },
];

export const ITEM: Record<string, Item> = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

/** One chosen piece in a look. Colour and pattern can be changed from the item's defaults. */
export interface Worn {
  id: string;
  color: string;
  pattern: Pattern;
}
export type Outfit = Partial<Record<Slot, Worn>>;

export function wear(id: string, color?: string, pattern: Pattern = "solid"): Worn {
  return { id, color: color ?? ITEM[id].color, pattern };
}

/** Items visible for the user's wardrobe choice. */
export function catalogFor(wardrobe: "womenswear" | "menswear" | "all"): Item[] {
  if (wardrobe === "all") return CATALOG;
  const line: Line = wardrobe === "womenswear" ? "w" : "m";
  return CATALOG.filter((i) => i.lines.includes(line));
}
