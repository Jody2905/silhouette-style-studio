import type { BodyShape } from "./body";
import { ITEM, type Outfit } from "./catalog";
import { deltaE } from "./color";
import type { Vibe } from "./types";

export interface Trend {
  id: string;
  name: string;
  season: string;
  what: string;
  /** How to wear it if it suits you, or how to adapt it if it's harder for your shape. */
  howTo: string;
  vibes: Vibe[];
  /** Body shapes that can wear it as-is; others get an adapted suggestion. */
  easyFor?: BodyShape[];
  /** Detects the trend in an outfit. */
  matches: (o: Outfit) => boolean;
  /** Starter look for "Try this trend" in the studio. */
  starter: Outfit;
}

const has = (o: Outfit, trend: string) => Object.values(o).some((w) => w && ITEM[w.id]?.trends?.includes(trend));
// Only clothing counts for colour trends (not lipstick or shoes alone).
const colorNear = (o: Outfit, hex: string, max = 16) =>
  (["top", "bottom", "dress", "outer"] as const).some((s) => o[s] && deltaE(o[s]!.color, hex) < max);
const patterned = (o: Outfit, p: string) => Object.values(o).some((w) => w && w.pattern === p);

/** Autumn/Winter 2026 runway trends, summarised from the trend reports listed in SOURCES. */
export const TRENDS: Trend[] = [
  {
    id: "tomato-red",
    name: "Tomato red",
    season: "AW26",
    what: "A fiery orange-red worn head to toe or as one bold piece, carried over from spring.",
    howTo: "Warm undertones can wear it near the face; cool undertones should pick a blue-red or keep tomato red to shoes, bags or trousers.",
    vibes: ["glam", "edgy", "classic"],
    matches: (o) => colorNear(o, "#e23b2a", 10),
    starter: { top: { id: "top-turtleneck", color: "#e23b2a", pattern: "solid" }, bottom: { id: "bottom-wide-trousers", color: "#e23b2a", pattern: "solid" }, shoes: { id: "shoes-loafers", color: "#2a1d16", pattern: "solid" } },
  },
  {
    id: "pink-fever",
    name: "Pink fever",
    season: "AW26",
    what: "Saturated fuchsia and bubblegum pinks, worn head to toe or as a jolt of colour.",
    howTo: "Cool and bright colourings suit fuchsia best; warm colourings can try a warmer coral-pink.",
    vibes: ["glam", "romantic", "streetwear"],
    matches: (o) => colorNear(o, "#e0218a", 18),
    starter: { top: { id: "top-crop", color: "#e0218a", pattern: "solid" }, bottom: { id: "bottom-slip", color: "#e0218a", pattern: "solid" }, outer: { id: "outer-blazer", color: "#e0218a", pattern: "solid" } },
  },
  {
    id: "checks",
    name: "Checks & tartan",
    season: "AW26",
    what: "Checks and tartans everywhere, from preppy and equestrian to grunge, on knits, skirts and outerwear.",
    howTo: "Keep a big check to the area you want to highlight and pair it with a solid. Small checks are the easiest to wear.",
    vibes: ["preppy", "edgy", "classic"],
    matches: (o) => patterned(o, "check") || has(o, "checks"),
    starter: { top: { id: "top-turtleneck", color: "#111111", pattern: "solid" }, bottom: { id: "bottom-pleated", color: "#6b1c2a", pattern: "check" }, shoes: { id: "shoes-loafers", color: "#2a1d16", pattern: "solid" } },
  },
  {
    id: "preppy",
    name: "School's out (preppy)",
    season: "AW26",
    what: "Rugby shirts, polos, cricket jumpers, rowing blazers, pleated skirts and loafers, mixed loosely.",
    howTo: "Pick one or two preppy pieces and keep the rest simple so it looks current, not costume.",
    vibes: ["preppy", "classic", "sporty"],
    matches: (o) => has(o, "preppy"),
    starter: { top: { id: "top-rugby", color: "#1b2a4a", pattern: "h-stripe" }, bottom: { id: "bottom-straight-jeans", color: "#3d5a80", pattern: "solid" }, shoes: { id: "shoes-loafers", color: "#2a1d16", pattern: "solid" } },
  },
  {
    id: "power-suiting",
    name: "Sharp power suiting",
    season: "AW26",
    what: "Pinstripes, double-breasted blazers, slate-grey tailoring and pointed shoes with oxblood accents.",
    howTo: "Tailoring suits every shape when it fits at the shoulder. Petite frames do best with a shorter blazer and full-length trousers in one colour.",
    vibes: ["classic", "glam", "edgy"],
    easyFor: ["rectangle", "inverted-triangle", "hourglass", "top-hourglass"],
    matches: (o) => has(o, "power-suiting"),
    starter: { outer: { id: "outer-db-blazer", color: "#36393f", pattern: "v-stripe" }, top: { id: "top-v-tee", color: "#f2f1ec", pattern: "solid" }, bottom: { id: "bottom-pinstripe", color: "#36393f", pattern: "v-stripe" }, shoes: { id: "shoes-pumps", color: "#6b1c2a", pattern: "solid" } },
  },
  {
    id: "boho-revival",
    name: "Dark boho revival",
    season: "AW26",
    what: "A moodier boho with ruffles, capes, mega-maxi hems, suede and deeper colours.",
    howTo: "Balance volume: a flowing maxi with a fitted top, or balloon trousers with a slim knit.",
    vibes: ["boho", "romantic"],
    easyFor: ["triangle", "bottom-hourglass", "spoon", "rectangle", "hourglass"],
    matches: (o) => has(o, "boho-revival"),
    starter: { top: { id: "top-puff", color: "#4f2d48", pattern: "solid" }, bottom: { id: "bottom-maxi", color: "#4a2f23", pattern: "floral" }, shoes: { id: "shoes-boots", color: "#4a2f23", pattern: "solid" } },
  },
  {
    id: "sheer",
    name: "Sheer layering",
    season: "AW26",
    what: "Sheer and mesh layers over heavier pieces, so the outfit underneath shows through.",
    howTo: "Layer a sheer top under a blazer or over a fitted knit for a wearable version.",
    vibes: ["edgy", "glam", "minimal"],
    matches: (o) => has(o, "sheer"),
    starter: { top: { id: "top-sheer", color: "#36393f", pattern: "solid" }, outer: { id: "outer-blazer", color: "#111111", pattern: "solid" }, bottom: { id: "bottom-wide-trousers", color: "#111111", pattern: "solid" } },
  },
  {
    id: "oversized-outerwear",
    name: "Big outerwear & shearling",
    season: "AW26",
    what: "Cocoon coats, huge puffers and sculptural shearling with dramatic shoulders and collars.",
    howTo: "Keep everything underneath slim. Petite frames can try a cropped puffer instead of a long cocoon.",
    vibes: ["edgy", "minimal", "streetwear"],
    easyFor: ["rectangle", "triangle", "bottom-hourglass", "spoon"],
    matches: (o) => has(o, "oversized-outerwear"),
    starter: { outer: { id: "outer-shearling", color: "#d8b892", pattern: "solid" }, top: { id: "top-turtleneck", color: "#4a2f23", pattern: "solid" }, bottom: { id: "bottom-straight-jeans", color: "#22252b", pattern: "solid" }, shoes: { id: "shoes-chelsea", color: "#4a2f23", pattern: "solid" } },
  },
  {
    id: "polka-dots",
    name: "Moody polka dots",
    season: "AW26",
    what: "Sharp black-and-white dots on sheer layers, oversized spots and tailoring.",
    howTo: "Small dots read as texture and are easiest; large dots draw the eye, so put them where you want attention.",
    vibes: ["romantic", "classic", "edgy"],
    matches: (o) => patterned(o, "dots"),
    starter: { dress: { id: "dress-wrap", color: "#111111", pattern: "dots" }, shoes: { id: "shoes-pumps", color: "#111111", pattern: "solid" } },
  },
  {
    id: "decorative-belt",
    name: "The decorative belt",
    season: "AW26",
    what: "Belts worn loosely at the hip, cinched at the waist or layered over knits and coats.",
    howTo: "A waist belt defines curves; a hip belt adds width at the hips, so it suits straighter or top-heavy shapes best.",
    vibes: ["boho", "edgy", "classic"],
    easyFor: ["rectangle", "inverted-triangle", "top-hourglass"],
    matches: (o) => has(o, "decorative-belt") || !!o.belt,
    starter: { top: { id: "top-cable-knit", color: "#efe3c8", pattern: "solid" }, belt: { id: "belt-hip", color: "#c8a02c", pattern: "solid" }, bottom: { id: "bottom-straight-jeans", color: "#3d5a80", pattern: "solid" } },
  },
  {
    id: "grandpa-knit",
    name: "Grandpa knits",
    season: "AW26",
    what: "Vintage-style cable knits, Fair Isle, vests and cardigans.",
    howTo: "Chunky knits add bulk, so balance them with slim bottoms or tuck the front into high-rise trousers.",
    vibes: ["preppy", "classic", "boho"],
    matches: (o) => has(o, "grandpa-knit"),
    starter: { top: { id: "top-cable-knit", color: "#efe3c8", pattern: "solid" }, bottom: { id: "bottom-chinos", color: "#8f8456", pattern: "solid" }, shoes: { id: "shoes-brogues", color: "#6b3f24", pattern: "solid" } },
  },
  {
    id: "roaring-twenties",
    name: "Roaring Twenties",
    season: "AW26",
    what: "Drop-waist dresses, long pearls, fringe and beading in loose, androgynous shapes.",
    howTo: "Drop waists are easiest on straighter shapes; curvier figures can get the mood with pearls, fringe or a bob instead.",
    vibes: ["glam", "romantic"],
    easyFor: ["rectangle", "inverted-triangle"],
    matches: (o) => has(o, "roaring-twenties"),
    starter: { dress: { id: "dress-drop-waist", color: "#efe3c8", pattern: "solid" }, earrings: { id: "ear-pearls", color: "#f2efe6", pattern: "solid" }, hair: { id: "hair-bob", color: "#1d1410", pattern: "solid" } },
  },
  {
    id: "capes",
    name: "Drama capes",
    season: "AW26",
    what: "Capes and ponchos from sequinned evening versions to cosy knits.",
    howTo: "Capes widen the shoulders, so they balance hips well. Broad-shouldered frames should pick a soft, draped cape.",
    vibes: ["glam", "boho"],
    easyFor: ["triangle", "bottom-hourglass", "spoon", "rectangle"],
    matches: (o) => has(o, "capes"),
    starter: { outer: { id: "outer-cape", color: "#6b1c2a", pattern: "solid" }, top: { id: "top-turtleneck", color: "#111111", pattern: "solid" }, bottom: { id: "bottom-skinny", color: "#111111", pattern: "solid" }, shoes: { id: "shoes-boots", color: "#111111", pattern: "solid" } },
  },
  {
    id: "statement-shoes",
    name: "Statement shoes",
    season: "AW26",
    what: "Shoes as wearable art: embellished heels, jewelled sandals and feathered boots.",
    howTo: "Let the shoes lead and keep the rest of the outfit simple.",
    vibes: ["glam", "edgy"],
    matches: (o) => has(o, "statement-shoes"),
    starter: { dress: { id: "dress-sheath", color: "#111111", pattern: "solid" }, shoes: { id: "shoes-statement", color: "#c8102e", pattern: "solid" } },
  },
  {
    id: "fully-loaded",
    name: "Fully loaded texture",
    season: "AW26",
    what: "Feathers, beads, sequins, fringe and pearls, often several at once.",
    howTo: "Pick one heavily textured piece per outfit unless you're going all in for an event.",
    vibes: ["glam"],
    matches: (o) => has(o, "fully-loaded"),
    starter: { dress: { id: "dress-drop-waist", color: "#c8a02c", pattern: "solid" }, shoes: { id: "shoes-statement", color: "#d4af37", pattern: "solid" } },
  },
  {
    id: "functional-outerwear",
    name: "Functional outerwear",
    season: "AW26",
    what: "Belted trenches, utility rain jackets and macs with practical closures.",
    howTo: "Belt a trench at the waist to keep your shape; leave it open to add a long vertical line.",
    vibes: ["classic", "minimal"],
    matches: (o) => has(o, "functional-outerwear"),
    starter: { outer: { id: "outer-trench", color: "#c19a6b", pattern: "solid" }, top: { id: "top-tee", color: "#f2f1ec", pattern: "solid" }, bottom: { id: "bottom-straight-jeans", color: "#3d5a80", pattern: "solid" }, shoes: { id: "shoes-sneakers", color: "#f6f6f4", pattern: "solid" } },
  },
];
