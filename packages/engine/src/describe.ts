// Turns a look into a precise written instruction for an AI photo editor ("Make it real").
import { ITEM, type Outfit, type Slot, type Worn } from "./catalog";
import { PALETTES } from "./color";
import { HAIR_HEX, type Profile } from "./types";

/** Plain colour names with reference values; the nearest one names a hex colour for the AI. */
const NAMED: [string, string][] = [
  ["black", "#111111"], ["charcoal", "#36393f"], ["grey", "#808890"], ["light grey", "#c8c8c8"], ["white", "#f6f6f4"], ["ivory", "#f2efe6"],
  ["cream", "#efe3c8"], ["beige", "#d8c3a5"], ["camel", "#c19a6b"], ["tan", "#b08a5a"], ["chocolate brown", "#4a2f23"], ["rust", "#b4532a"],
  ["burgundy", "#6b1c2a"], ["red", "#c8102e"], ["tomato red", "#e0402e"], ["coral", "#e2654d"], ["orange", "#f08a3c"], ["mustard yellow", "#d4a62a"],
  ["golden yellow", "#f2b632"], ["olive green", "#6b6b2e"], ["khaki", "#8f8456"], ["sage green", "#a3b49a"], ["forest green", "#2f5a3a"], ["emerald green", "#1f7a55"],
  ["teal", "#2f7f7f"], ["soft teal", "#5f9ea0"], ["navy blue", "#1b2a4a"], ["denim blue", "#3d5a80"], ["cobalt blue", "#2643a8"], ["cornflower blue", "#6f8fd8"],
  ["powder blue", "#9bb8d8"], ["grey-blue", "#7f93aa"], ["lavender", "#b4a0d8"], ["mauve", "#a77b98"], ["plum", "#4f2d48"], ["raspberry", "#b6406a"],
  ["fuchsia", "#c2287a"], ["dusty rose", "#c98a96"], ["blush pink", "#f0b8b8"], ["bubblegum pink", "#f4849c"], ["taupe", "#9c8f88"], ["gold", "#d4af37"], ["silver", "#c0c0c0"],
];
for (const p of Object.values(PALETTES)) for (const c of [...p.best, ...p.neutrals]) NAMED.push([c.name.toLowerCase(), c.hex]);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function colourName(hex: string): string {
  const [r, g, b] = rgb(hex);
  let best = NAMED[0][0], bd = Infinity;
  for (const [name, h] of NAMED) {
    const [r2, g2, b2] = rgb(h);
    // Weighted RGB distance: close enough to name a colour for a person.
    const d = 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
    if (d < bd) [best, bd] = [name, d];
  }
  return best;
}

const PATTERN_WORDS: Record<string, string> = {
  solid: "",
  "v-stripe": "with vertical stripes",
  "h-stripe": "with horizontal stripes",
  dots: "with a polka-dot print",
  check: "in a check pattern",
  floral: "with a small floral print",
};

const NECK: Record<string, string> = {
  v: "V-neck", scoop: "scoop neck", crew: "crew neck", boat: "boat neck", turtle: "turtleneck", square: "square neckline",
  collar: "collared", sweetheart: "sweetheart neckline", halter: "halter neck", cowl: "cowl neck",
};
const SLEEVE: Record<string, string> = { none: "sleeveless", short: "short sleeves", long: "long sleeves", puff: "puff sleeves", elbow: "elbow-length sleeves" };

function garment(w: Worn): string {
  const item = ITEM[w.id];
  const a = item.attrs;
  const bits: string[] = [];
  if (a.fit) bits.push(a.fit);
  if (a.length && item.slot !== "hair") bits.push(`${a.length}-length`);
  if (a.rise) bits.push(`${a.rise}-rise`);
  const extras = [a.neckline && NECK[a.neckline], a.sleeve && SLEEVE[a.sleeve], a.leg && `${a.leg} leg`, a.skirt && item.slot === "dress" && `${a.skirt} skirt`]
    .filter(Boolean)
    .join(", ");
  const colour = colourName(w.color);
  const pattern = PATTERN_WORDS[w.pattern] ?? "";
  const name = item.name.toLowerCase();
  const words = bits.filter((b) => !name.includes(b.split("-")[0]));
  const phrase = `${words.join(" ")} ${name}`.trim();
  const article = /^[aeiou]/.test(phrase) ? "an" : "a";
  return `${article} ${phrase} in ${colour}${pattern ? ` ${pattern}` : ""}${extras ? ` (${extras})` : ""}`.replace(/\s+/g, " ");
}

/**
 * The full instruction for an AI photo editor: dress the person in this look while keeping everything that makes
 * the photo theirs (face, body, pose, background) unchanged. Returns null if the look has nothing to show.
 */
export function describeLook(outfit: Outfit, profile: Profile): string | null {
  const has = (s: Slot) => !!outfit[s];
  const lines: string[] = [];
  if (has("dress")) lines.push(`Dress: ${garment(outfit.dress!)}.`);
  else {
    if (has("top")) lines.push(`Top: ${garment(outfit.top!)}.`);
    if (has("bottom")) lines.push(`Bottoms: ${garment(outfit.bottom!)}.`);
  }
  if (has("outer")) lines.push(`Over it: ${garment(outfit.outer!)}, worn open.`);
  if (has("belt")) lines.push(`Belt: ${ITEM[outfit.belt!.id].name.toLowerCase()} in ${colourName(outfit.belt!.color)}.`);
  if (has("shoes")) lines.push(`Shoes: ${ITEM[outfit.shoes!.id].name.toLowerCase()} in ${colourName(outfit.shoes!.color)}.`);
  if (has("bag")) {
    const b = outfit.bag!;
    const carry = { hand: "held in one hand", shoulder: "on the shoulder", crossbody: "worn crossbody", back: "worn on the back" }[ITEM[b.id].attrs.carry ?? "shoulder"];
    lines.push(`Bag: ${garment(b).replace(/ \(.*\)$/, "")}, ${carry}.`);
  }
  if (has("necklace")) lines.push(`Necklace: ${ITEM[outfit.necklace!.id].name.toLowerCase()} in ${colourName(outfit.necklace!.color)}.`);
  if (has("scarf")) lines.push(`Scarf: ${garment(outfit.scarf!).replace(/ \(.*\)$/, "")}${ITEM[outfit.scarf!.id].attrs.kind === "neckerchief" || ITEM[outfit.scarf!.id].attrs.kind === "bandana" ? ", tied at the neck" : ", draped around the neck"}.`);
  if (has("wrist")) lines.push(`On the wrist: ${ITEM[outfit.wrist!.id].name.toLowerCase()} in ${colourName(outfit.wrist!.color)}.`);
  for (const s of ["earrings", "glasses", "hat"] as const) if (has(s)) lines.push(`${s[0].toUpperCase() + s.slice(1)}: ${ITEM[outfit[s]!.id].name.toLowerCase()} in ${colourName(outfit[s]!.color)}.`);
  if (has("hair")) {
    const h = outfit.hair!;
    const natural = h.color.toLowerCase() === HAIR_HEX[profile.hairColor].toLowerCase();
    lines.push(`Hair: restyle into a ${ITEM[h.id].name.toLowerCase()}${natural ? ", keeping the natural hair colour" : `, coloured ${colourName(h.color)}`}. Keep the hair texture realistic for this person.`);
  }
  const makeup = (["lips", "eyes", "blush"] as const).filter(has).map((s) => `${ITEM[outfit[s]!.id].name.toLowerCase()}${s === "lips" ? ` lipstick (${colourName(outfit[s]!.color)})` : ""}`);
  if (makeup.length) lines.push(`Makeup: ${makeup.join(", ")}. Subtle and realistic.`);
  if (has("beard")) lines.push(`Facial hair: ${ITEM[outfit.beard!.id].name.toLowerCase()}.`);
  if (!lines.length) return null;

  const keep: string[] = [];
  if (!has("dress") && !has("top") && !has("outer")) keep.push("their current top");
  if (!has("dress") && !has("bottom")) keep.push("their current bottoms");
  if (!has("shoes")) keep.push("their current footwear");
  return [
    "Edit this photo so the person is wearing the outfit below, as a realistic fashion photo.",
    "Keep the same person: identical face, identity, skin tone, body shape and size, height, pose, hands and expression. Keep the background, framing, camera angle and lighting exactly the same.",
    "The clothes must fit this person's real body naturally, with realistic fabric texture, seams, folds and shadows that match the light in the photo. Replace the old clothing completely; none of it should show through.",
    keep.length ? `Leave ${keep.join(", ")} unchanged.` : "",
    "",
    "Outfit:",
    ...lines.map((l) => `- ${l}`),
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}
