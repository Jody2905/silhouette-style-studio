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
  const CAPS = { body: 14, proportion: 10, pattern: 4, face: 10, colour: 10, makeup: 6, vibe: 6, trend: 4 };
  type Cat = keyof typeof CAPS;
  const used: Record<Cat, number> = { body: 0, proportion: 0, pattern: 0, face: 0, colour: 0, makeup: 0, vibe: 0, trend: 0 };
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
    for (const s of ["hair", "glasses", "earrings", "beard"] as Slot[]) {
      const g = get(outfit, s);
      if (!g) continue;
      if (g.item.attrs.goodFor?.includes(face)) add(s === "hair" ? 6 : 3, `${g.item.name} suits a ${face} face.`);
      else if (g.item.attrs.carefulWith?.includes(face)) add(s === "hair" ? -5 : -3, `${g.item.name} can exaggerate a ${face} face shape.`);
    }
  }

  /* ---------- colour ---------- */
  cat = "colour";
  const nearFace = [dress ?? top, outer, get(outfit, "lips")].filter(Boolean) as { w: Worn; item: Item }[];
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
