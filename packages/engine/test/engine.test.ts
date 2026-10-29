import { describe, expect, it } from "vitest";
import {
  analyseBody, analyseColor, buildGuide, CATALOG, classifyFace, DEFAULT_PROFILE, deltaE, ffit, ITEM, paletteFit, PALETTES,
  ProfileSchema, scoreLook, shapeFromPhoto, skinFromHex, styleMe, TRENDS, wear, type Profile,
} from "../src";

const p = (over: Partial<Profile> = {}): Profile => ProfileSchema.parse({ ...DEFAULT_PROFILE, ...over });
const m = (bust: number, waist: number, hip: number, highHip: number | null = null) => ({ bust, waist, hip, highHip, shoulder: null, inseam: null });

describe("FFIT body shapes (inches)", () => {
  it.each([
    [36, 26, 36, null, "hourglass"],
    [34, 26, 39, 30, "bottom-hourglass"],
    [34, 26, 39, 33 * 1.3, "spoon"],
    [38, 28, 36, null, "top-hourglass"],
    [34, 30, 35, null, "rectangle"],
    [33, 30, 38, null, "triangle"],
    [40, 33, 35, null, "inverted-triangle"],
    [40, 44, 42, null, "oval"],
  ])("bust %s waist %s hip %s → %s", (b, w, h, hh, shape) => {
    expect(ffit(b, w, h, hh)).toBe(shape);
  });

  it("uses centimetre measurements from the profile", () => {
    expect(analyseBody(p({ measurements: m(92, 66, 92) })).shape).toBe("hourglass");
    expect(analyseBody(p({ measurements: m(84, 74, 98) })).method).toBe("measurements");
  });

  it("falls back to photo widths, then to no data", () => {
    expect(shapeFromPhoto(1.25, 1.05)).toBe("inverted-triangle");
    expect(shapeFromPhoto(1.25, 0.95)).toBe("top-hourglass");
    expect(shapeFromPhoto(0.85, 0.7)).toBe("bottom-hourglass");
    expect(shapeFromPhoto(1.0, 0.98)).toBe("oval");
    const r = analyseBody(p({ measurements: { bust: null, waist: null, hip: null, highHip: null, shoulder: null, inseam: null } }));
    expect(r.method).toBe("none");
  });

  it("classifies height and legs", () => {
    expect(analyseBody(p({ heightCm: 152, wardrobe: "womenswear" })).heightClass).toBe("petite");
    expect(analyseBody(p({ heightCm: 190, wardrobe: "menswear" })).heightClass).toBe("tall");
    expect(analyseBody(p({ heightCm: 170, measurements: { ...m(92, 74, 100), inseam: 72 } })).legs).toBe("shorter");
  });
});

describe("face shape", () => {
  it.each([
    [{ length: 1.38, forehead: 0.9, jaw: 0.82, jawAngle: 0.3 }, "oval"],
    [{ length: 1.2, forehead: 0.9, jaw: 0.8, jawAngle: 0.2 }, "round"],
    [{ length: 1.2, forehead: 0.92, jaw: 0.9, jawAngle: 0.7 }, "square"],
    [{ length: 1.6, forehead: 0.9, jaw: 0.84, jawAngle: 0.3 }, "oblong"],
    [{ length: 1.4, forehead: 0.95, jaw: 0.74, jawAngle: 0.2 }, "heart"],
    [{ length: 1.4, forehead: 0.8, jaw: 0.74, jawAngle: 0.3 }, "diamond"],
    [{ length: 1.35, forehead: 0.82, jaw: 0.95, jawAngle: 0.5 }, "triangle"],
  ])("%o → %s", (r, shape) => expect(classifyFace(r)).toBe(shape));
});

describe("colour", () => {
  it("assigns seasons from undertone, depth and contrast", () => {
    expect(analyseColor(p({ undertone: "warm", skinDepth: "light", hairColor: "red" })).season).toBe("spring");
    expect(analyseColor(p({ undertone: "warm", skinDepth: "deep", hairColor: "black" })).season).toBe("autumn");
    expect(analyseColor(p({ undertone: "cool", skinDepth: "light", hairColor: "light-brown" })).season).toBe("summer");
    expect(analyseColor(p({ undertone: "cool", skinDepth: "fair", hairColor: "black" })).season).toBe("winter");
    expect(analyseColor(p({ undertone: "cool", skinDepth: "fair", hairColor: "black" })).contrast).toBe("high");
  });

  it("judges palette fit and colour distance", () => {
    expect(deltaE("#ffffff", "#ffffff")).toBe(0);
    expect(paletteFit(PALETTES.autumn.best[0].hex, PALETTES.autumn)).toBe("great");
    expect(paletteFit("#d8e6f2", PALETTES.autumn)).toBe("clash");
  });

  it("estimates skin from a sampled colour", () => {
    expect(skinFromHex("#f3d9c8").depth).toMatch(/fair|light/);
    expect(skinFromHex("#5a3a2a").depth).toMatch(/tan|deep/);
  });
});

describe("look scoring", () => {
  const triangle = p({ measurements: m(84, 70, 100), wardrobe: "womenswear" });

  it("rewards balancing pieces and penalises unbalancing ones", () => {
    const good = scoreLook(triangle, { top: wear("top-boat"), bottom: wear("bottom-wide-trousers"), shoes: wear("shoes-loafers") });
    const poor = scoreLook(triangle, { top: wear("top-tee"), bottom: wear("bottom-skinny"), shoes: wear("shoes-sneakers"), belt: wear("belt-hip") });
    expect(good.score).toBeGreaterThan(poor.score);
    expect(poor.tryThis.some((n) => /hips/.test(n.text))).toBe(true);
  });

  it("flags missing pieces", () => {
    const r = scoreLook(triangle, { top: wear("top-tee") });
    expect(r.missing).toContain("shoes");
    expect(r.label).toBe("Keep dressing");
  });

  it("busts the horizontal-stripe myth with a citation", () => {
    const r = scoreLook(triangle, { top: wear("top-rugby", undefined, "h-stripe"), bottom: wear("bottom-a-line"), shoes: wear("shoes-loafers") });
    const myth = [...r.works, ...r.tryThis].find((n) => n.evidence === "myth");
    expect(myth?.source).toBe("stripes");
  });

  it("uses face shape for hair advice", () => {
    const round = p({ faceShape: "round" });
    const a = scoreLook(round, { hair: wear("hair-long-layers"), top: wear("top-v-tee"), bottom: wear("bottom-straight-jeans"), shoes: wear("shoes-sneakers") });
    const b = scoreLook(round, { hair: wear("hair-bob"), top: wear("top-v-tee"), bottom: wear("bottom-straight-jeans"), shoes: wear("shoes-sneakers") });
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("detects trends", () => {
    for (const t of TRENDS) expect(t.matches(t.starter)).toBe(true);
  });
});

describe("guide and auto-styling", () => {
  it("builds a complete guide", () => {
    const g = buildGuide(p({ faceShape: "heart" }));
    expect(g.body.wear.length).toBeGreaterThan(2);
    expect(g.face.hair).toMatch(/bob|bangs/);
    expect(g.shopping.length).toBeGreaterThan(5);
    expect(g.trends).toHaveLength(TRENDS.length);
  });

  it("styles a complete, high-scoring look from the right wardrobe", () => {
    for (const wardrobe of ["womenswear", "menswear", "all"] as const) {
      const prof = p({ wardrobe, faceShape: "oval" });
      const look = styleMe(prof);
      const r = scoreLook(prof, look);
      expect(r.missing).toEqual([]);
      expect(r.score).toBeGreaterThanOrEqual(72);
      if (wardrobe === "menswear") for (const w of Object.values(look)) expect(ITEM[w!.id].lines).toContain("m");
    }
  });

  it("every catalog item has a valid slot and colour", () => {
    for (const i of CATALOG) expect(i.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length);
  });
});
