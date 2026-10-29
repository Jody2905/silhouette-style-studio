import { analyseBody, type BodyResult, type BodyShape } from "./body";
import { ITEM, type Item, type Neckline, type Outfit, type Slot, type Worn } from "./catalog";
import { analyseColor, deltaE, paletteFit, type ColorResult } from "./color";
import { faceShapeOf } from "./face";
import { TRENDS } from "./trends";
import type { Evidence, FaceShape, Profile } from "./types";

export interface Note {
  text: string;
  evidence: Evidence;
  source?: string;
  /** Points this note added or removed. */
  points: number;
}

export interface LookScore {
  score: number;
  label: string;
  works: Note[];
  tryThis: Note[];
  trends: string[];
  missing: string[];
}

const NECKLINE_FOR_FACE: Record<FaceShape, { good: Neckline[]; careful: Neckline[] }> = {
  oval: { good: ["v", "scoop", "crew", "boat", "square", "cowl", "sweetheart", "collar", "turtle", "halter"], careful: [] },
  round: { good: ["v", "collar", "square"], careful: ["crew", "turtle"] },
  square: { good: ["scoop", "cowl", "v", "sweetheart"], careful: ["square", "boat"] },
  oblong: { good: ["boat", "crew", "turtle", "cowl", "square"], careful: ["v"] },
  heart: { good: ["scoop", "sweetheart", "v", "cowl"], careful: ["halter", "boat"] },
  diamond: { good: ["scoop", "sweetheart", "boat", "cowl"], careful: ["halter"] },
  triangle: { good: ["boat", "cowl", "collar", "square"], careful: ["v", "halter"] },
};

const WAIST_SHAPES: BodyShape[] = ["hourglass", "top-hourglass", "bottom-hourglass", "spoon"];
const HIP_HEAVY: BodyShape[] = ["triangle", "bottom-hourglass", "spoon"];
const TOP_HEAVY: BodyShape[] = ["inverted-triangle", "top-hourglass"];

const get = (o: Outfit, s: Slot): { w: Worn; item: Item } | null => {
  const w = o[s];
  return w && ITEM[w.id] ? { w, item: ITEM[w.id] } : null;
};

/** Scores a look for a person and explains why. Starts at 40; each category can add a capped number of points. */
export function scoreLook(profile: Profile, outfit: Outfit): LookScore {
  const body: BodyResult = analyseBody(profile);
  const color: ColorResult = analyseColor(profile);
  const face = faceShapeOf(profile).shape;
  const notes: Note[] = [];
  // Each category can only add so many points, so a great look has to get several things right.
  const CAPS = { body: 14, proportion: 10, pattern: 4, face: 10, colour: 10, makeup: 6, accessories: 8, vibe: 6, trend: 4 };
  type Cat = keyof typeof CAPS;
  const used: Record<Cat, number> = { body: 0, proportion: 0, pattern: 0, face: 0, colour: 0, makeup: 0, accessories: 0, vibe: 0, trend: 0 };
  let cat: Cat = "body";
  const add = (points: number, text: string, evidence: Evidence = "stylist", source?: string) => {
    let pts = points;
    if (pts > 0) {
      pts = Math.min(pts, CAPS[cat] - used[cat]);
      used[cat] += pts;
    }
    notes.push({ points: pts, text, evidence, source });
  };

  const top = get(outfit, "top");
  const bottom = get(outfit, "bottom");
  const dress = get(outfit, "dress");
  const outer = get(outfit, "outer");
  const shoes = get(outfit, "shoes");
  const belt = get(outfit, "belt");

  const missing: string[] = [];
  if (!dress && !top) missing.push("a top or dress");
  if (!dress && !bottom) missing.push("bottoms or a dress");
  if (!shoes) missing.push("shoes");

  const shape = body.shape;
  const neckline = (dress ?? top)?.item.attrs.neckline;
  const waistDefined =
    dress?.item.attrs.waist === "defined" ||
    belt?.item.attrs.kind === "waist" ||
    (top && (top.item.attrs.length === "waist" || top.item.attrs.length === "crop") && bottom?.item.attrs.rise === "high") ||
    (top?.item.attrs.fit === "fitted" && top.item.attrs.length === "waist");
  const oversizedTop = top?.item.attrs.fit === "oversized" || outer?.item.attrs.fit === "oversized";
  const leg = bottom?.item.attrs.leg ?? dress?.item.attrs.leg;
  const skirt = bottom?.item.attrs.skirt ?? dress?.item.attrs.skirt;
  const shoulderVolume = top?.item.attrs.shoulderDetail || outer?.item.attrs.shoulderDetail || top?.item.attrs.neckline === "boat";

  /* ---------- body shape (stylist conventions) ---------- */
  cat = "body";
  if (WAIST_SHAPES.includes(shape)) {
    if (waistDefined) add(8, "Your waist is defined, which shows off the balance between your bust and hips.");
    else if (oversizedTop && !belt) add(-5, "Loose layers hide your waist. Try a belt, a tuck, or a wrap shape.");
  }
  if (shape === "rectangle") {
    if (waistDefined) add(6, "Defining the waist creates curve on a straighter frame.");
    if (outer?.item.attrs.structure === "structured" || top?.item.attrs.shoulderDetail) add(3, "Structure at the shoulder adds shape and polish.");
  }
  if (HIP_HEAVY.includes(shape)) {
    if (shoulderVolume || ["boat", "square", "collar", "cowl"].includes(neckline ?? "")) add(6, "Interest up top balances fuller hips.");
    if (leg && ["wide", "straight", "bootcut", "flare"].includes(leg)) add(6, "This leg shape skims the hips and balances your frame.");
    if (skirt && ["a-line", "wrap", "fit-flare", "pleated"].includes(skirt)) add(6, "A flared skirt skims the hips and highlights the waist.");
    if (leg === "skinny" || skirt === "pencil" || skirt === "sheath") add(-4, "Very fitted bottoms draw the eye to the hips. Balance them with volume or structure on top.");
    if (belt?.item.attrs.kind === "hip") add(-3, "A hip belt adds width where you're already fullest. Move it to the waist.");
  }
  if (TOP_HEAVY.includes(shape)) {
    if (neckline && ["v", "scoop", "cowl", "sweetheart"].includes(neckline)) add(6, "An open neckline breaks up the shoulder line.");
    if (top?.item.attrs.shoulderDetail || neckline === "boat") add(-6, "Puff sleeves and boat necks widen the shoulders even more.");
    if ((leg && ["wide", "flare", "bootcut", "balloon"].includes(leg)) || (skirt && ["a-line", "pleated", "fit-flare", "wrap"].includes(skirt)))
      add(6, "Volume on the bottom half balances broader shoulders.");
    if (belt?.item.attrs.kind === "hip") add(3, "A hip belt adds width low down, which balances your shoulders.");
  }
  if (shape === "oval") {
    if (neckline && ["v", "scoop", "cowl"].includes(neckline)) add(5, "An open neckline draws the eye up and lengthens the torso.");
    if (outer && (outer.item.attrs.length === "long" || outer.item.attrs.structure === "structured")) add(4, "A longer or structured layer worn open creates a strong vertical line.");
    if (dress?.item.attrs.waist === "empire") add(4, "An empire line defines the narrowest point under the bust.");
    if (belt?.item.attrs.kind === "waist") add(-5, "A tight belt at the natural waist cuts across your fullest point. Try an empire line or an open layer instead.");
  }

  /* ---------- proportion (research-informed) ---------- */
  cat = "proportion";
  const longLeg =
    (bottom?.item.attrs.rise === "high" && (bottom.item.attrs.length === "full" || leg === "wide" || leg === "flare")) ||
    dress?.item.attrs.waist === "empire" ||
    shoes?.item.attrs.heel === "heel";
  if (longLeg) {
    const boost = body.legs === "shorter" || body.heightClass === "petite" ? 8 : 4;
    add(boost, "A high waistline or heel lengthens your leg line. Studies across 27 countries found people prefer a slightly longer-than-average leg-to-body ratio.", "research", "legs");
  }
  if (body.heightClass === "petite") {
    if (outer?.item.attrs.fit === "oversized" && outer.item.attrs.length === "long") add(-4, "A long, oversized coat can swamp a petite frame. Try a cropped or hip-length layer.");
    if (bottom?.item.attrs.length === "midi" && shoes?.item.attrs.heel === "flat") add(-2, "A midi hem with flats can shorten the leg. Add a little heel or go longer or shorter.");
  }
  if (body.heightClass === "tall" && (oversizedTop || bottom?.item.attrs.length === "maxi" || dress?.item.attrs.length === "maxi"))
    add(3, "Your height carries volume and long lengths well.");
  if (top && bottom && deltaE(top.w.color, bottom.w.color) < 15) add(4, "Matching top and bottom colours create one unbroken column, which looks longer.");

  /* ---------- patterns ---------- */
  cat = "pattern";
  const worn = Object.values(outfit).filter(Boolean) as Worn[];
  const patterns = worn.filter((w) => w.pattern !== "solid");
  if (worn.some((w) => w.pattern === "h-stripe"))
    add(2, "Myth busted: horizontal stripes don't make you look wider. In tests they made figures look taller and slimmer.", "myth", "stripes");
  if (worn.some((w) => w.pattern === "v-stripe") && (shape === "oval" || HIP_HEAVY.includes(shape)))
    add(0, "Vertical stripes aren't the slimming trick people think; research found they can make a figure look slightly wider.", "myth", "stripes");
  if (patterns.length > 2) add(-4, "More than two prints compete for attention. Keep one and switch the others to solids.");

  /* ---------- face shape (stylist conventions) ---------- */
  cat = "face";
  if (face) {
    if (neckline) {
      const rule = NECKLINE_FOR_FACE[face];
      if (rule.good.includes(neckline) && face !== "oval") add(3, `This neckline flatters a ${face} face.`);
      if (rule.careful.includes(neckline)) add(-3, `This neckline echoes the shape of a ${face} face. Try a ${rule.good.slice(0, 2).join(" or ")} neckline.`);
    }
    for (const s of ["hair", "glasses", "earrings", "necklace", "beard"] as Slot[]) {
      const g = get(outfit, s);
      if (!g) continue;
      if (g.item.attrs.goodFor?.includes(face)) add(s === "hair" ? 6 : 3, `${g.item.name} suits a ${face} face.`);
      else if (g.item.attrs.carefulWith?.includes(face)) add(s === "hair" ? -5 : -3, `${g.item.name} can exaggerate a ${face} face shape.`);
    }
  }

  /* ---------- colour ---------- */
  cat = "colour";
  const nearFace = [dress ?? top, outer, get(outfit, "scarf"), get(outfit, "lips")].filter(Boolean) as { w: Worn; item: Item }[];
  for (const g of nearFace) {
    const fit = paletteFit(g.w.color, color.palette);
    if (fit === "great") {
      add(5, `${g.item.name} is in your ${color.palette.label} palette, so it brightens your face.`);
    } else if (fit === "clash") add(-4, `This shade of ${g.item.name.toLowerCase()} sits outside your palette and can look draining near the face. Try one of your best colours.`);
  }
  cat = "makeup";
  const isBold = (s: Slot) => get(outfit, s)?.item.attrs.makeup === "bold";
  const boldMakeup = isBold("lips") || isBold("eyes");
  if (color.contrast === "high" && boldMakeup)
    add(4, "Bold makeup matches your naturally high facial contrast. Research shows cosmetics work largely by increasing facial contrast.", "research", "contrast");
  if (color.contrast === "low" && isBold("lips") && isBold("eyes"))
    add(-3, "With soft natural contrast, a bold lip and a bold eye together can overpower your features. Pick one.", "research", "contrast");
  const darkLight = worn.some((w) => deltaE(w.color, "#111111") < 12) && worn.some((w) => deltaE(w.color, "#ffffff") < 12);
  if (darkLight && color.contrast === "high") add(3, "Black-and-white contrast echoes your own strong contrast.", "research", "contrast");
  if (darkLight && color.contrast === "low") add(-2, "Stark black and white can overpower soft colouring. Try charcoal and cream instead.", "research", "contrast");

  /* ---------- bags & accessories (stylist conventions) ---------- */
  cat = "accessories";
  const bag = get(outfit, "bag");
  if (bag) {
    const size = bag.item.attrs.size;
    if (body.heightClass === "petite" && size === "large") add(-3, "A large bag can overwhelm a petite frame. Scale accessories to your size: a small or medium bag keeps you in proportion.");
    else if (body.heightClass === "petite" && (size === "small" || size === "mini")) add(3, "A small bag is in proportion with your petite frame.");
    else if (body.heightClass === "tall" && size === "large") add(3, "Your height carries a larger bag easily.");
    else if (body.heightClass === "tall" && size === "mini") add(-1, "A mini bag can look lost on a tall frame. A medium or large bag balances your height.");
    else add(2, "This bag is a good size for your frame.");
    // Where the bag sits draws the eye there.
    const atHip = bag.item.attrs.carry === "crossbody" || bag.item.attrs.kind === "tote";
    if (HIP_HEAVY.includes(shape) && atHip) add(-2, "A bag that rests at your hips adds width there. Try a shorter shoulder strap or a top-handle bag held at the waist.");
    if (HIP_HEAVY.includes(shape) && bag.item.attrs.carry === "shoulder" && bag.item.attrs.size !== "large") add(2, "A short-strap bag sits near your waist and draws the eye up, away from your hips.");
    if (TOP_HEAVY.includes(shape) && bag.item.attrs.carry === "shoulder" && bag.item.attrs.size !== "large") add(-1, "A short shoulder bag sits beside your bust and widens the top half. Try a crossbody or a bag carried lower.");
    if (TOP_HEAVY.includes(shape) && (bag.item.attrs.carry === "crossbody" || bag.item.attrs.carry === "hand")) add(2, "A bag carried lower adds interest at the hips, balancing broader shoulders.");
  }
  const necklace = get(outfit, "necklace");
  if (necklace) {
    const len = necklace.item.attrs.length;
    if (neckline === "v" || neckline === "scoop" || neckline === "sweetheart") {
      if (len === "long" || len === "medium") add(3, "A necklace that follows your neckline (a pendant into a V or scoop) frames your face.");
      if (necklace.item.attrs.kind === "bib") add(-2, "A bib necklace fights a low neckline. Let a fine pendant echo its shape instead.");
    }
    if ((neckline === "crew" || neckline === "boat") && len === "short") add(3, "A short necklace sits neatly above a high neckline.");
    if ((neckline === "turtle" || neckline === "collar") && len === "long") add(3, "A long pendant over a high neck adds a slimming vertical line.");
    if ((neckline === "turtle" || neckline === "collar" || neckline === "halter") && necklace.item.attrs.kind === "choker") add(-3, "A choker clashes with a high or halter neckline. Try a long pendant.");
  }
  const scarf = get(outfit, "scarf");
  if (scarf) {
    if (scarf.item.attrs.kind === "long" && body.heightClass !== "tall") add(2, "A long scarf hanging open adds an unbroken vertical line, which reads taller.");
    if (scarf.item.attrs.kind === "blanket" && body.heightClass === "petite") add(-2, "A chunky blanket scarf adds a lot of bulk to a petite frame. Try a long, finer scarf.");
    if (scarf.item.attrs.kind === "blanket" && TOP_HEAVY.includes(shape)) add(-2, "Volume around the neck widens the shoulders. A long, flat scarf keeps a cleaner line.");
    if (scarf.item.attrs.kind === "neckerchief" && HIP_HEAVY.includes(shape)) add(2, "A neck scarf draws the eye up to your face and shoulders.");
  }
  // One focal point: too many statement pieces near the face compete.
  const statements = [necklace, get(outfit, "earrings"), scarf].filter((g) => g && (g.item.attrs.statement || (g.item.slot === "earrings" && g.item.attrs.kind === "drop") || g.item.attrs.kind === "blanket"));
  if (statements.length >= 2) add(-2, "Statement necklace, drop earrings and a big scarf compete. Pick one focal point near the face.");
  // Metals: warm palettes suit gold; cool palettes suit silver.
  const metalPieces = (["necklace", "earrings", "wrist", "bag", "belt"] as Slot[]).map((s) => get(outfit, s)).filter(Boolean) as { w: Worn; item: Item }[];
  const gold = metalPieces.filter((g) => deltaE(g.w.color, "#d4af37") < 18).length;
  const silver = metalPieces.filter((g) => deltaE(g.w.color, "#c0c0c0") < 12).length;
  const warmMetal = /gold|bronze|copper|brass/i.test(color.palette.metals.split(",")[0]);
  if (gold && warmMetal) add(2, `Gold tones suit your warm colouring (your best metals: ${color.palette.metals.toLowerCase()}).`);
  if (silver && !warmMetal) add(2, `Silver tones suit your cool colouring (your best metals: ${color.palette.metals.toLowerCase()}).`);
  if (gold && !warmMetal && !silver) add(-1, `Gold can look brassy against cool colouring. Try ${color.palette.metals.toLowerCase()}.`);
  if (silver && warmMetal && !gold) add(-1, `Silver can look flat against warm colouring. Try ${color.palette.metals.toLowerCase()}.`);

  /* ---------- vibe & trends ---------- */
  cat = "vibe";
  const vibePts = worn.filter((w) => ITEM[w.id]?.vibes.some((v) => profile.vibes.includes(v))).length * 2;
  if (vibePts) add(vibePts, `Fits your ${profile.vibes.join(" / ")} style.`);
  cat = "trend";
  const trends = TRENDS.filter((t) => t.matches(outfit)).map((t) => t.name);
  if (trends.length) add(trends.length * 2, `On trend for AW26: ${trends.join(", ")}.`);

  const raw = 40 + notes.reduce((a, n) => a + n.points, 0) - missing.length * 10;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const label = missing.length ? "Keep dressing" : score >= 85 ? "Signature look" : score >= 72 ? "Great look" : score >= 58 ? "Good start" : "Keep styling";
  return {
    score,
    label,
    works: notes.filter((n) => n.points > 0 || (n.points === 0 && n.evidence !== "myth" && !n.text.startsWith("Vertical"))).sort((a, b) => b.points - a.points),
    tryThis: notes.filter((n) => n.points < 0 || (n.points === 0 && n.evidence === "myth" && n.text.startsWith("Vertical"))).sort((a, b) => a.points - b.points),
    trends,
    missing,
  };
}
