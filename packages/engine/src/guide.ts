import { analyseBody, BODY_SHAPE_LABEL, BODY_SHAPE_SUMMARY, type BodyResult, type BodyShape } from "./body";
import { catalogFor, type Item, type Outfit, type Slot } from "./catalog";
import { analyseColor, type ColorResult } from "./color";
import { FACE_SHAPE_LABEL, FACE_SHAPE_SUMMARY, faceShapeOf } from "./face";
import { scoreLook } from "./scoring";
import { TRENDS, type Trend } from "./trends";
import { HAIR_HEX, type FaceShape, type Profile, type Tip } from "./types";

const HIP_SHAPES: BodyShape[] = ["triangle", "bottom-hourglass", "spoon"];
const TOP_SHAPES: BodyShape[] = ["inverted-triangle", "top-hourglass"];

const BODY_TIPS: Record<BodyShape, { wear: string[]; careful: string[] }> = {
  hourglass: {
    wear: ["Wrap dresses and wrap tops", "Belts at the natural waist", "High-rise trousers with tucked-in tops", "Fitted knits and tailored blazers that nip in"],
    careful: ["Boxy, unbelted oversized pieces that hide the waist", "Drop waists"],
  },
  "top-hourglass": {
    wear: ["V and scoop necklines", "Defined waists", "A-line skirts and wide-leg trousers", "Single-breasted blazers"],
    careful: ["Puff sleeves and heavy shoulder detail", "High, closed necklines with a lot of texture"],
  },
  "bottom-hourglass": {
    wear: ["Boat, square and collared necklines", "Defined waists", "A-line, wrap and fit-and-flare skirts", "Straight, wide and bootcut trousers"],
    careful: ["Heavy detail at the hips", "Very skinny bottoms with a plain top"],
  },
  spoon: {
    wear: ["Structured shoulders and statement sleeves", "Waist definition", "A-line and flared skirts", "Mid- to high-rise wide trousers"],
    careful: ["Hip belts and pockets on the hips", "Pencil skirts with plain tops"],
  },
  rectangle: {
    wear: ["Belts and wrap shapes to create a waist", "Peplums and layered textures", "Straight and wide trousers", "Tailoring and shift dresses"],
    careful: ["Very clingy, single-layer pieces with no shape"],
  },
  triangle: {
    wear: ["Boat, square and cowl necklines", "Statement sleeves, capes and structured jackets", "A-line skirts and wide or bootcut trousers", "Darker or plainer colours on the bottom"],
    careful: ["Skinny jeans and pencil skirts with plain tops", "Hip belts"],
  },
  "inverted-triangle": {
    wear: ["V and scoop necklines", "Wide-leg trousers, flares and A-line skirts", "Hip belts and detail on the bottom half", "Soft, unstructured shoulders"],
    careful: ["Puff sleeves, boat necks and shoulder pads", "Halter necks"],
  },
  oval: {
    wear: ["V-necks and open collars", "Empire waists", "Long layers worn open", "Straight, structured jackets and one-colour outfits"],
    careful: ["Tight belts at the natural waist", "Clingy fabrics through the middle"],
  },
};

const HAIR_BY_FACE: Record<FaceShape, string> = {
  oval: "Almost any cut works. Show off your balance with a sleek bob, a buzz cut or long layers.",
  round: "Add height and length: long layers, a lob past the chin, a quiff or a textured crop with height on top.",
  square: "Soften the jaw with waves, long layers and side-swept or curtain bangs.",
  oblong: "Add width, not height: bobs, curtain bangs, curls and volume at the sides.",
  heart: "Balance a wider forehead with chin-length bobs, side bangs and volume at jaw level.",
  diamond: "Show off cheekbones: side-swept fringe, chin-length cuts and fuller styles at the forehead and jaw.",
  triangle: "Add width at the temples: volume on top and at the sides, longer layers past the jaw.",
};
const GLASSES_BY_FACE: Record<FaceShape, string> = {
  oval: "Most frames suit you. Choose frames about as wide as your face.",
  round: "Angular square and rectangle frames.",
  square: "Round and oval frames to soften angles.",
  oblong: "Deep frames, aviators or bold oversized shapes to break up length.",
  heart: "Aviators, round and light rimless frames.",
  diamond: "Cat-eye and oval frames.",
  triangle: "Cat-eye and frames that are bold along the top.",
};
const BEARD_BY_FACE: Record<FaceShape, string> = {
  oval: "Stubble or a short boxed beard.",
  round: "A boxed beard or goatee that adds length at the chin; keep the sides short.",
  square: "A fuller beard rounded at the chin to soften the jaw.",
  oblong: "A full beard with fuller sides; avoid extra length at the chin.",
  heart: "A fuller beard to add width at the jaw.",
  diamond: "A full beard to add width at the chin and forehead balance.",
  triangle: "Light stubble; keep volume low along the jaw.",
};

export interface StyleGuide {
  body: BodyResult & { label: string; summary: string; wear: string[]; careful: string[] };
  face: { shape: FaceShape | null; method: string; label: string; summary: string; hair: string; glasses: string; beard: string };
  color: ColorResult;
  proportion: Tip[];
  makeup: Tip[];
  accessories: Tip[];
  trends: { trend: Trend; fit: "easy" | "adapt" }[];
  shopping: string[];
}

export function buildGuide(p: Profile): StyleGuide {
  const body = analyseBody(p);
  const color = analyseColor(p);
  const { shape: face, method } = faceShapeOf(p);

  const proportion: Tip[] = [];
  if (body.heightClass === "petite")
    proportion.push(
      { text: "Cropped jackets, high-rise bottoms and one-colour outfits lengthen your frame.", evidence: "stylist" },
      { text: "Matching shoes to your trousers or skin tone extends the leg line.", evidence: "stylist" },
    );
  if (body.heightClass === "tall") proportion.push({ text: "You can carry long coats, maxi hems, wide legs and oversized shapes easily.", evidence: "stylist" });
  if (body.legs === "shorter")
    proportion.push({ text: "High-rise waistbands, nude or matching shoes and a little heel make your legs look longer.", evidence: "research", source: "legs" });
  if (body.legs === "longer") proportion.push({ text: "Mid-rise bottoms, belts and tucked tops balance a shorter torso.", evidence: "stylist" });
  proportion.push({
    text: "Horizontal stripes are fine. In controlled tests they made figures look taller and slimmer, not wider.",
    evidence: "myth",
    source: "stripes",
  });
  proportion.push({ text: "One unbroken column of colour from shoulder to hem reads as longer and leaner.", evidence: "stylist" });

  const makeup: Tip[] =
    color.contrast === "high"
      ? [
          { text: `Your hair, eyes and skin are high contrast, so bold lips (${color.palette.lips.map((l) => l.name.toLowerCase()).join(", ")}) and defined liner look natural on you.`, evidence: "research", source: "contrast" },
          { text: "Cosmetics work largely by increasing facial contrast, so you can wear more without looking made-up.", evidence: "research", source: "contrast" },
        ]
      : color.contrast === "medium"
        ? [
            { text: `Pick one feature to emphasise: a ${color.palette.lips[0].name.toLowerCase()} lip or a defined eye.`, evidence: "research", source: "contrast" },
            { text: "Brown or soft black liner gives definition without harshness.", evidence: "stylist" },
          ]
        : [
            { text: `Soft, blended looks and sheer lip colour (${color.palette.lips[2]?.name.toLowerCase() ?? "soft rose"}) keep your features in balance.`, evidence: "research", source: "contrast" },
            { text: "Choose brown mascara and liner over jet black.", evidence: "stylist" },
          ];

  const metalsWarm = /gold|bronze|copper|brass/i.test(color.palette.metals.split(",")[0]);
  const accessories: Tip[] = [
    { text: `Best metals: ${color.palette.metals}. ${metalsWarm ? "Warm gold tones echo your colouring." : "Cool silver tones echo your colouring."}`, evidence: "stylist" },
    body.heightClass === "petite"
      ? { text: "Keep bags small to medium and jewellery fine, so accessories stay in proportion with your frame.", evidence: "stylist" }
      : body.heightClass === "tall"
        ? { text: "You can carry larger totes and bolder jewellery; tiny pieces can look lost on you.", evidence: "stylist" }
        : { text: "Medium bags and mid-weight jewellery are in proportion with your frame.", evidence: "stylist" },
  ];
  if (HIP_SHAPES.includes(body.shape)) accessories.push({ text: "Carry bags on a short strap at the waist, not at the hips, and use necklaces and scarves to draw the eye up.", evidence: "stylist" });
  if (TOP_SHAPES.includes(body.shape)) accessories.push({ text: "Crossbody or hand-held bags add interest lower down; skip chunky scarves and bib necklaces that widen the shoulders.", evidence: "stylist" });
  if (face === "round" || face === "square") accessories.push({ text: "Long pendants and V-shaped necklaces lengthen your face; avoid tight chokers.", evidence: "stylist" });
  if (face === "oblong" || face === "diamond") accessories.push({ text: "Short chains, chokers and pearls at the collarbone add width and balance a longer face.", evidence: "stylist" });
  accessories.push({ text: "Match the necklace to the neckline: pendants for V and scoop necks, short chains for crew and boat necks, long pendants over turtlenecks.", evidence: "stylist" });
  accessories.push({ text: "Pick one statement piece near the face: a bold necklace, drop earrings or a big scarf, not all three.", evidence: "stylist" });

  const trends = TRENDS.map((t) => ({ trend: t, fit: (!t.easyFor || t.easyFor.includes(body.shape) ? "easy" : "adapt") as "easy" | "adapt" }))
    .sort((a, b) => {
      const v = (t: Trend) => t.vibes.filter((x) => p.vibes.includes(x)).length;
      return (b.fit === "easy" ? 1 : 0) - (a.fit === "easy" ? 1 : 0) || v(b.trend) - v(a.trend);
    });

  const best = color.palette.best;
  const neutral = color.palette.neutrals;
  const tips = BODY_TIPS[body.shape];
  const shopping = [
    `${tips.wear[0]} in ${best[0].name.toLowerCase()}`,
    `${tips.wear[2] ?? tips.wear[1]} in ${neutral[1].name.toLowerCase()}`,
    `A ${neutral[0].name.toLowerCase()} layer: ${body.heightClass === "petite" ? "a cropped jacket" : "a tailored blazer or trench"}`,
    `A top in ${best[1].name.toLowerCase()} with a ${face ? (["round", "oval", "heart", "top-hourglass"].includes(face) ? "V" : "scoop") : "V"} neckline`,
    `${color.palette.metals.split(",")[0]} jewellery`,
    `A ${color.palette.lips[0].name.toLowerCase()} lip colour`,
    `One trend piece: ${trends[0].trend.name.toLowerCase()}`,
  ];
  if (p.wardrobe === "menswear" && face) shopping.push(`Beard: ${BEARD_BY_FACE[face].toLowerCase()}`);

  return {
    body: { ...body, label: BODY_SHAPE_LABEL[body.shape], summary: BODY_SHAPE_SUMMARY[body.shape], ...tips },
    face: {
      shape: face,
      method,
      label: face ? FACE_SHAPE_LABEL[face] : "Not measured yet",
      summary: face ? FACE_SHAPE_SUMMARY[face] : "Add a front-facing photo or pick your face shape to get hair, glasses and neckline advice.",
      hair: face ? HAIR_BY_FACE[face] : "",
      glasses: face ? GLASSES_BY_FACE[face] : "",
      beard: face ? BEARD_BY_FACE[face] : "",
    },
    color,
    proportion,
    makeup,
    accessories,
    trends,
    shopping,
  };
}

/**
 * Builds a complete look by trying every item (and your best colours for pieces near the face) slot by slot,
 * keeping whichever scores highest. `seed` varies the result.
 */
export function styleMe(p: Profile, opts: { seed?: number; base?: Outfit; trend?: string } = {}): Outfit {
  const items = catalogFor(p.wardrobe);
  const palette = analyseColor(p).palette;
  const seed = opts.seed ?? 0;
  const trend = opts.trend ? TRENDS.find((t) => t.id === opts.trend) : undefined;
  const allowed = new Set(items.map((i) => i.id));
  // Keep only starter pieces from the user's wardrobe; the rest get filled in below.
  let outfit: Outfit = Object.fromEntries(Object.entries(trend?.starter ?? opts.base ?? {}).filter(([, w]) => w && allowed.has(w.id)));
  const useDress = !outfit.top && !outfit.bottom && (outfit.dress || (p.wardrobe !== "menswear" && seed % 3 === 2));
  const order: Slot[] = useDress
    ? ["dress", "shoes", "outer", "hair", "bag", "necklace", "earrings", "lips", "eyes"]
    : ["top", "bottom", "shoes", "outer", "hair", "belt", "bag", "necklace", "earrings", "wrist", "lips", "beard"];
  for (const slot of order) {
    if (outfit[slot]) continue;
    if (slot === "beard" && p.wardrobe !== "menswear") continue;
    if ((slot === "lips" || slot === "eyes") && p.wardrobe === "menswear") continue;
    const options = items.filter((i) => i.slot === slot);
    const colors = (i: Item) =>
      slot === "hair" || slot === "beard" ? [HAIR_HEX[p.hairColor]] : ["top", "dress", "outer"].includes(slot) ? [i.color, ...palette.best.slice(0, 4).map((c) => c.hex), ...palette.neutrals.slice(0, 2).map((c) => c.hex)] : [i.color];
    const baseScore = scoreLook(p, outfit).score;
    const optional = ["outer", "belt", "bag", "necklace", "earrings", "wrist", "eyes", "beard"].includes(slot);
    const tried: { s: number; o: Outfit }[] = [];
    for (const item of options)
      for (const c of colors(item)) {
        const trial = { ...outfit, [slot]: { id: item.id, color: c, pattern: "solid" as const } };
        tried.push({ s: scoreLook(p, trial).score, o: trial });
      }
    if (!tried.length) continue;
    const top = Math.max(...tried.map((t) => t.s));
    if (optional && top <= baseScore) continue; // only add extras that improve the look
    // Pick among the near-best options so each "Style me" press gives a different look.
    const pool = tried.filter((t) => t.s >= top - 3).sort((a, b) => b.s - a.s);
    outfit = pool[(seed * 7 + order.indexOf(slot) * 3) % pool.length].o;
  }
  return outfit;
}


