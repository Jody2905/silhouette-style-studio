import { ITEM, type Outfit, type Pattern, type Profile, type Slot, type Worn } from "@silhouette/engine";
import { useId, useMemo } from "react";
import { bodicePath, bodyHalf, f1, limb, armLine, outerPanels, skirtHem, skirtPath, sleeves, trouserPath, hemFor } from "./garments";
import { buildFigure, curve, HAIR_HEX, mirrored, shade, SKIN_DEFAULT, VIEW_H, VIEW_W, type Figure, type Pt } from "./geometry";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */


export function patternDef(id: string, color: string, pattern: Pattern) {
  if (pattern === "solid") return null;
  const dark = shade(color, -0.45);
  const light = shade(color, 0.7);
  const ink = parseInt(color.slice(1), 16) > 0x888888 ? dark : light;
  return (
    <pattern id={id} key={id} patternUnits="userSpaceOnUse" width={pattern === "dots" ? 16 : pattern === "floral" ? 22 : 12} height={pattern === "dots" ? 16 : pattern === "floral" ? 22 : 12}>
      <rect width="100%" height="100%" fill={color} />
      {pattern === "v-stripe" && <rect x="0" y="0" width="4" height="12" fill={ink} />}
      {pattern === "h-stripe" && <rect x="0" y="0" width="12" height="4" fill={ink} />}
      {pattern === "dots" && <circle cx="8" cy="8" r="3.2" fill={ink} />}
      {pattern === "check" && (
        <>
          <rect x="0" y="0" width="6" height="12" fill={ink} opacity="0.45" />
          <rect x="0" y="0" width="12" height="6" fill={ink} opacity="0.45" />
        </>
      )}
      {pattern === "floral" && (
        <g fill={ink}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="11" cy="7" rx="2.2" ry="3.4" transform={`rotate(${a} 11 11)`} />
          ))}
          <circle cx="11" cy="11" r="1.8" fill={shade(color, 0.3)} />
        </g>
      )}
    </pattern>
  );
}

/* ------------------------------------------------------------------ */
/* Body and face                                                        */
/* ------------------------------------------------------------------ */

const FACE_FACTORS: Record<string, [number, number, number]> = {
  // forehead width, jaw width, chin point (0 flat → 1 pointed), all relative to cheek width
  oval: [0.9, 0.72, 0.4],
  round: [0.94, 0.84, 0.15],
  square: [0.95, 0.93, 0.05],
  oblong: [0.9, 0.82, 0.3],
  heart: [1.0, 0.6, 0.6],
  diamond: [0.76, 0.66, 0.5],
  triangle: [0.8, 0.98, 0.15],
};

export function headPath(F: Figure): string {
  const { cx } = F;
  const cy = F.y.headCy;
  const rx = F.headRx, ry = F.headRy;
  const [fw, jw, chin] = FACE_FACTORS[F.face] ?? FACE_FACTORS.oval;
  const left: Pt[] = [
    [cx, cy - ry],
    [cx - rx * fw * 0.78, cy - ry * 0.82],
    [cx - rx * fw, cy - ry * 0.35],
    [cx - rx, cy + ry * 0.08],
    [cx - rx * jw, cy + ry * 0.58],
    [cx - rx * (0.42 - chin * 0.3), cy + ry * (0.93 - chin * 0.02)],
    [cx, cy + ry],
  ];
  return mirrored(cx, left, 0.55);
}

function BodyLayer({ F, skin }: { F: Figure; skin: string }) {
  const { cx, y, w, legX } = F;
  const edge = shade(skin, -0.22);
  const torso = mirrored(cx, [
    [cx - w.neck, F.y.chin - 6],
    [cx - w.neck, y.neck],
    [cx - w.shoulder * 0.62, y.shoulder],
    [cx - w.shoulder, y.shoulder + 14],
    [cx - w.bust, y.bust],
    [cx - w.waist, y.waist],
    [cx - w.hip, y.hip],
    [cx - w.hip * 0.94, y.crotch],
    [cx, y.crotch + 6],
  ]);
  const leg = (side: -1 | 1) => {
    const L = cx + side * legX;
    const o = (dx: number) => L + side * dx;
    const pts: Pt[] = [
      [cx + side * w.hip * 0.94, y.crotch - 8],
      [o(w.thigh), y.crotch + F.H * 0.08],
      [o(w.knee + 2), y.knee],
      [o(w.calf), y.calf],
      [o(w.ankle), y.ankle],
      [o(w.ankle * 0.4), y.floor - 2],
      [L - side * w.ankle * 0.9, y.floor - 2],
      [L - side * w.ankle, y.ankle],
      [L - side * w.calf * 0.8, y.calf],
      [L - side * w.knee * 0.9, y.knee],
      [cx + side * 3, y.crotch + 10],
    ];
    return `M${f1(pts[0][0])},${f1(pts[0][1])}${curve(pts, 0.45)} Z`;
  };
  const armL = armLine(F, -1), armR = armLine(F, 1);
  return (
    <g fill={skin} stroke={edge} strokeWidth="1.2">
      <path d={leg(-1)} />
      <path d={leg(1)} />
      <path d={limb(armL)} />
      <path d={limb(armR)} />
      <ellipse cx={armL.pts[2][0]} cy={armL.pts[2][1] + 10} rx="8" ry="12" />
      <ellipse cx={armR.pts[2][0]} cy={armR.pts[2][1] + 10} rx="8" ry="12" />
      <path d={torso} />
    </g>
  );
}

function FaceLayer({ F, skin, eyeColor, lips, eyes, blush, faceImg, clipId }: {
  F: Figure; skin: string; eyeColor: string; lips?: Worn; eyes?: Worn; blush?: Worn; faceImg?: string | null; clipId: string;
}) {
  const { cx } = F;
  const cy = F.y.headCy;
  const rx = F.headRx, ry = F.headRy;
  const edge = shade(skin, -0.22);
  const head = headPath(F);
  const ex = rx * 0.42, ey = cy + ry * 0.02;
  const lipY = cy + ry * 0.56;
  const lipColor = lips?.color ?? shade(skin, -0.28);
  const browColor = shade(skin, -0.65);
  const eyeKind = eyes ? ITEM[eyes.id]?.id : null;
  const blushKind = blush ? ITEM[blush.id]?.attrs.kind : null;
  return (
    <g>
      <ellipse cx={cx - rx} cy={cy + 4} rx="6" ry="11" fill={skin} stroke={edge} strokeWidth="1.2" />
      <ellipse cx={cx + rx} cy={cy + 4} rx="6" ry="11" fill={skin} stroke={edge} strokeWidth="1.2" />
      <path d={head} fill={skin} stroke={edge} strokeWidth="1.2" />
      {faceImg ? (
        <>
          <clipPath id={clipId}>
            <path d={head} />
          </clipPath>
          <image href={faceImg} x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
        </>
      ) : (
        <g>
          {eyeKind === "eyes-smoky" &&
            [-1, 1].map((s) => <ellipse key={s} cx={cx + s * ex} cy={ey - 2} rx="10" ry="6.5" fill={eyes!.color} opacity="0.55" />)}
          {[-1, 1].map((s) => (
            <g key={s}>
              <path d={`M${cx + s * ex - 7},${ey} Q${cx + s * ex},${ey - 5.5} ${cx + s * ex + 7},${ey} Q${cx + s * ex},${ey + 4} ${cx + s * ex - 7},${ey} Z`} fill="#fbf8f4" stroke={browColor} strokeWidth="0.8" />
              <circle cx={cx + s * ex} cy={ey - 0.5} r="2.9" fill={eyeColor} />
              <circle cx={cx + s * ex} cy={ey - 0.5} r="1.3" fill="#111" />
              <path d={`M${cx + s * ex - 8},${ey - 9} Q${cx + s * ex},${ey - (F.masc ? 12 : 13)} ${cx + s * ex + 8},${ey - 8}`} fill="none" stroke={browColor} strokeWidth={F.masc ? 2.6 : 1.8} strokeLinecap="round" />
              {eyeKind === "eyes-winged" && <path d={`M${cx + s * ex + s * 6},${ey - 1} L${cx + s * ex + s * 12},${ey - 5}`} stroke="#111" strokeWidth="1.8" strokeLinecap="round" />}
              {eyeKind && <path d={`M${cx + s * ex - 7},${ey} Q${cx + s * ex},${ey - 5.5} ${cx + s * ex + 7},${ey}`} fill="none" stroke="#111" strokeWidth="1.3" />}
            </g>
          ))}
          <path d={`M${cx - 1},${ey + 6} Q${cx - 4},${cy + ry * 0.36} ${cx},${cy + ry * 0.38} Q${cx + 3},${cy + ry * 0.38} ${cx + 4},${cy + ry * 0.34}`} fill="none" stroke={edge} strokeWidth="1.2" strokeLinecap="round" />
          {blushKind === "apples" && [-1, 1].map((s) => <ellipse key={s} cx={cx + s * rx * 0.55} cy={cy + ry * 0.32} rx="8" ry="5" fill={blush!.color} opacity="0.45" />)}
          {blushKind === "cheekbones" &&
            [-1, 1].map((s) => <ellipse key={s} cx={cx + s * rx * 0.66} cy={cy + ry * 0.2} rx="10" ry="4" fill={blush!.color} opacity="0.42" transform={`rotate(${s * -20} ${cx + s * rx * 0.66} ${cy + ry * 0.2})`} />)}
          <path
            d={`M${cx - (F.masc ? 9 : 10)},${lipY} Q${cx - 4},${lipY - 4} ${cx},${lipY - 2} Q${cx + 4},${lipY - 4} ${cx + (F.masc ? 9 : 10)},${lipY} Q${cx},${lipY + (F.masc ? 5 : 7)} ${cx - (F.masc ? 9 : 10)},${lipY} Z`}
            fill={lipColor}
            opacity={lips ? 0.95 : 0.7}
          />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Hair                                                                 */
/* ------------------------------------------------------------------ */

function hairParts(F: Figure, id: string): { back?: string; front?: string; extra?: JSX.Element | null; extraBack?: JSX.Element | null; opacityFront?: number } {
  const { cx } = F;
  const cy = F.y.headCy;
  const rx = F.headRx, ry = F.headRy;
  const top = cy - ry;
  const cap = (h: number, side = 1.08) =>
    `M${cx - rx * side},${cy + ry * h} Q${cx - rx * 1.15},${top - 4} ${cx},${top - 8} Q${cx + rx * 1.15},${top - 4} ${cx + rx * side},${cy + ry * h} Q${cx + rx * 0.7},${cy - ry * 0.55} ${cx},${cy - ry * 0.62} Q${cx - rx * 0.7},${cy - ry * 0.55} ${cx - rx * side},${cy + ry * h} Z`;
  const longBack = (bottom: number, width = 1.35) =>
    `M${cx - rx * 1.05},${cy - ry * 0.4} Q${cx - rx * width},${cy + ry * 0.6} ${cx - rx * width * 1.05},${bottom} L${cx + rx * width * 1.05},${bottom} Q${cx + rx * width},${cy + ry * 0.6} ${cx + rx * 1.05},${cy - ry * 0.4} Z`;
  switch (id) {
    case "hair-pixie":
      return { front: `${cap(0.05)} M${cx - rx * 0.9},${cy - ry * 0.5} Q${cx},${cy - ry * 0.25} ${cx + rx * 0.7},${cy - ry * 0.75} Q${cx},${cy - ry * 0.75} ${cx - rx * 0.9},${cy - ry * 0.5} Z` };
    case "hair-bob":
      return { back: longBack(cy + ry * 0.95, 1.3), front: `${cap(0.6, 1.2)} M${cx - rx * 1.02},${cy - ry * 0.3} Q${cx - rx * 0.2},${cy - ry * 0.85} ${cx + rx * 0.95},${cy - ry * 0.62} Q${cx + rx * 0.2},${cy - ry * 0.98} ${cx - rx * 1.02},${cy - ry * 0.3} Z` };
    case "hair-lob":
      return { back: longBack(F.y.shoulder + 8, 1.35), front: cap(0.35, 1.15) };
    case "hair-curtain":
      return {
        back: longBack(F.y.bust + 10, 1.4),
        front: `${cap(0.3, 1.15)} M${cx - 2},${cy - ry * 0.75} Q${cx - rx * 0.6},${cy - ry * 0.55} ${cx - rx * 0.95},${cy - ry * 0.05} L${cx - rx * 1.05},${cy - ry * 0.6} Z M${cx + 2},${cy - ry * 0.75} Q${cx + rx * 0.6},${cy - ry * 0.55} ${cx + rx * 0.95},${cy - ry * 0.05} L${cx + rx * 1.05},${cy - ry * 0.6} Z`,
      };
    case "hair-long-layers":
      return { back: longBack(F.y.underbust + 12, 1.45), front: cap(0.45, 1.15) };
    case "hair-curls": {
      const blobs = [-1.25, -0.95, -0.6, 0.6, 0.95, 1.25].flatMap((dx) => [0.2, 0.7, 1.15].map((dy) => [cx + rx * dx, cy + ry * dy] as Pt));
      return {
        back: longBack(F.y.shoulder + 4, 1.45),
        front: cap(0.25, 1.18),
        extra: (
          <g>
            {blobs.map(([x, yy], i) => (
              <circle key={i} cx={x} cy={yy} r={rx * 0.28} />
            ))}
            {[-0.6, -0.2, 0.2, 0.6].map((dx) => (
              <circle key={dx} cx={cx + rx * dx} cy={top + 2} r={rx * 0.3} />
            ))}
          </g>
        ),
      };
    }
    case "hair-afro":
      return { back: `M${cx},${top - ry * 0.55} a${rx * 1.75},${ry * 1.3} 0 1 0 0.1,0 Z`, front: `M${cx - rx * 1.05},${cy - ry * 0.2} Q${cx},${cy - ry * 0.75} ${cx + rx * 1.05},${cy - ry * 0.2} L${cx + rx * 1.2},${cy - ry * 0.9} L${cx - rx * 1.2},${cy - ry * 0.9} Z` };
    case "hair-braids":
    case "hair-locs": {
      const n = id === "hair-braids" ? 14 : 9;
      const w = id === "hair-braids" ? 3.2 : 5.5;
      const end = id === "hair-braids" ? F.y.waist : F.y.underbust;
      return {
        front: cap(0.25, 1.12),
        extraBack: (
          <g strokeLinecap="round">
            {Array.from({ length: n }, (_, i) => {
              const t = i / (n - 1);
              const x0 = cx - rx * 1.05 + t * rx * 2.1;
              const x1 = cx - rx * 1.55 + t * rx * 3.1;
              return <path key={i} d={`M${x0},${cy - ry * 0.4} Q${x0 + (t - 0.5) * 20},${cy + ry * 0.8} ${x1},${end}`} fill="none" strokeWidth={w * 2} />;
            })}
          </g>
        ),
      };
    }
    case "hair-high-bun":
      return { front: `${cap(0.2, 1.06)} M${cx},${top - ry * 0.55} a${rx * 0.5},${ry * 0.4} 0 1 0 0.1,0 Z` };
    case "hair-buzz":
      return { front: cap(-0.1, 1.04), opacityFront: 0.55 };
    case "hair-crop":
      return { front: `${cap(-0.05, 1.07)} M${cx - rx * 0.95},${cy - ry * 0.62} L${cx - rx * 0.6},${cy - ry * 0.42} L${cx - rx * 0.3},${cy - ry * 0.6} L${cx},${cy - ry * 0.44} L${cx + rx * 0.35},${cy - ry * 0.6} L${cx + rx * 0.7},${cy - ry * 0.45} L${cx + rx * 0.95},${cy - ry * 0.65} Z` };
    case "hair-quiff":
      return { front: `${cap(-0.05, 1.07)} M${cx - rx * 0.9},${cy - ry * 0.65} Q${cx - rx * 0.6},${top - ry * 0.55} ${cx + rx * 0.3},${top - ry * 0.45} Q${cx + rx * 1.1},${top - ry * 0.2} ${cx + rx * 0.95},${cy - ry * 0.6} Z` };
    case "hair-side-part":
      return { front: `${cap(-0.05, 1.08)} M${cx - rx * 0.95},${cy - ry * 0.62} Q${cx - rx * 0.3},${cy - ry * 0.95} ${cx + rx * 1.0},${cy - ry * 0.6} L${cx + rx},${cy - ry * 0.8} L${cx - rx},${cy - ry * 0.8} Z` };
    case "hair-curly-top":
      return {
        front: cap(-0.15, 1.03),
        opacityFront: 0.5,
        extra: (
          <g>
            {[-0.75, -0.4, 0, 0.4, 0.75, -0.55, -0.15, 0.25, 0.6].map((dx, i) => (
              <circle key={i} cx={cx + rx * dx} cy={top + (i < 5 ? -2 : 10)} r={rx * 0.3} />
            ))}
          </g>
        ),
      };
    case "hair-man-bun":
      return { back: longBack(F.y.shoulder + 14, 1.25), front: `${cap(0.2, 1.1)} M${cx},${top - ry * 0.35} a${rx * 0.38},${ry * 0.3} 0 1 0 0.1,0 Z` };
    default:
      return {};
  }
}

/* ------------------------------------------------------------------ */
/* Clothing                                                             */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Avatar                                                               */
/* ------------------------------------------------------------------ */

export function Avatar({ profile, outfit, faceImg, title }: { profile: Profile; outfit: Outfit; faceImg?: string | null; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const F = useMemo(() => buildFigure(profile), [profile]);
  const skin = profile.skinHex ?? SKIN_DEFAULT[profile.skinDepth];
  const eyeColor = { "dark-brown": "#3b2416", brown: "#5b3a22", hazel: "#7a6332", green: "#4c7a4a", blue: "#4a78a8", grey: "#7d8a92" }[profile.eyeColor];
  const { cx, y, w } = F;

  const fill = (slot: Slot) => {
    const wo = outfit[slot];
    if (!wo) return "none";
    return wo.pattern === "solid" ? wo.color : `url(#${uid}-${slot})`;
  };
  const line = (slot: Slot) => shade(outfit[slot]?.color ?? "#888888", -0.3);
  const item = (slot: Slot) => (outfit[slot] ? ITEM[outfit[slot]!.id] : undefined);

  const hairWorn = outfit.hair;
  const hairColor = hairWorn?.color ?? HAIR_HEX[profile.hairColor];
  const hair = hairWorn ? hairParts(F, hairWorn.id) : { front: `M${cx - F.headRx * 1.04},${y.headCy} Q${cx},${y.headCy - F.headRy * 1.35} ${cx + F.headRx * 1.04},${y.headCy} Q${cx},${y.headCy - F.headRy * 0.75} ${cx - F.headRx * 1.04},${y.headCy} Z` };

  const top = item("top"), bottom = item("bottom"), dress = item("dress"), outer = item("outer"), shoes = item("shoes");

  /* clothing layers */
  const layers: JSX.Element[] = [];
  if (bottom) {
    const a = bottom.attrs;
    const riseY = a.rise === "high" ? y.waist - 2 : a.rise === "low" ? y.waist + F.H * 0.065 : y.waist + F.H * 0.032;
    const d = a.kind === "skirt" ? skirtPath(F, riseY, a.skirt, a.length) : trouserPath(F, riseY, a.leg, a.length);
    layers.push(<path key="bottom" d={d} fill={fill("bottom")} stroke={line("bottom")} strokeWidth="1.3" />);
    if (a.skirt === "pleated")
      layers.push(
        <g key="pleats" stroke={line("bottom")} strokeWidth="1" opacity="0.6">
          {[-0.6, -0.2, 0.2, 0.6].map((t) => (
            <line key={t} x1={cx + t * w.hip * 0.8} y1={y.hip - 6} x2={cx + t * w.hip * 1.15} y2={skirtHem(F, a.length) - 2} />
          ))}
        </g>,
      );
    if (a.kind !== "skirt") layers.push(<line key="fly" x1={cx} y1={riseY + 6} x2={cx} y2={y.crotch - 4} stroke={line("bottom")} strokeWidth="1" opacity="0.6" />);
  }
  if (dress) {
    const a = dress.attrs;
    const waistY = a.waist === "empire" ? y.underbust : a.waist === "drop" ? y.hip : y.waist;
    const isJump = !!a.leg;
    if (isJump) layers.push(<path key="dress-legs" d={trouserPath(F, waistY - 2, a.leg, a.length)} fill={fill("dress")} stroke={line("dress")} strokeWidth="1.3" />);
    else if (a.waist === "none") layers.push(<path key="dress-skirt" d={skirtPath(F, y.bust, a.skirt, a.length)} fill={fill("dress")} stroke={line("dress")} strokeWidth="1.3" />);
    else layers.push(<path key="dress-skirt" d={skirtPath(F, waistY - 2, a.skirt, a.length)} fill={fill("dress")} stroke={line("dress")} strokeWidth="1.3" />);
    layers.push(<path key="dress-bodice" d={bodicePath(F, { neckline: a.neckline, fit: "fitted", hemY: a.waist === "none" ? y.bust + 30 : waistY + 2, sleeveless: a.sleeve === "none" })} fill={fill("dress")} stroke={line("dress")} strokeWidth="1.3" />);
    for (const d of sleeves(F, a.sleeve, "fitted")) layers.push(<path key={`ds${d.length}${d.slice(0, 12)}`} d={d} fill={fill("dress")} stroke={line("dress")} strokeWidth="1.2" />);
    if (a.skirt === "wrap") layers.push(<path key="wrapline" d={`M${cx + w.waist * 0.6},${waistY} Q${cx},${(waistY + skirtHem(F, a.length)) / 2} ${cx - w.hip * 0.3},${skirtHem(F, a.length) - 2}`} fill="none" stroke={line("dress")} strokeWidth="1.2" />);
    if (a.waist === "drop") layers.push(<g key="fringe" stroke={line("dress")} strokeWidth="1">{Array.from({ length: 14 }, (_, i) => { const x = cx - w.hip + (i * 2 * w.hip) / 13; return <line key={i} x1={x} y1={y.hip + 2} x2={x} y2={skirtHem(F, a.length) + 6} />; })}</g>);
  }
  if (top && !dress) {
    const a = top.attrs;
    const tucked = bottom && bottom.attrs.rise === "high" && a.fit !== "oversized" && a.length !== "crop";
    const hemY = tucked ? y.waist + 2 : hemFor(F, a.length);
    const sheer = a.sheer;
    layers.push(<path key="top" d={bodicePath(F, { neckline: a.neckline, fit: a.fit ?? "relaxed", hemY, sleeveless: a.sleeve === "none" })} fill={fill("top")} stroke={line("top")} strokeWidth="1.3" opacity={sheer ? 0.55 : 1} />);
    for (const d of sleeves(F, a.sleeve, a.fit)) layers.push(<path key={`s${d.slice(0, 16)}`} d={d} fill={fill("top")} stroke={line("top")} strokeWidth="1.2" opacity={sheer ? 0.5 : 1} />);
    if (a.neckline === "collar")
      layers.push(<path key="collar" d={`M${cx - w.neck - 4},${y.neck - 4} L${cx - 2},${y.neck + 16} L${cx - w.neck - 14},${y.neck + 14} Z M${cx + w.neck + 4},${y.neck - 4} L${cx + 2},${y.neck + 16} L${cx + w.neck + 14},${y.neck + 14} Z`} fill={shade(outfit.top!.color, 0.15)} stroke={line("top")} strokeWidth="1" />);
    if (a.neckline === "cowl") layers.push(<path key="cowl" d={`M${cx - w.neck - 8},${y.neck + 6} Q${cx},${y.neck + 30} ${cx + w.neck + 8},${y.neck + 6}`} fill="none" stroke={line("top")} strokeWidth="1.2" />);
  }
  const belt = item("belt");
  if (belt && outfit.belt) {
    if (belt.attrs.kind === "hip") {
      const yy = y.highHip + 8;
      layers.push(<path key="belt" d={`M${cx - bodyHalf(F, yy) - 6},${yy - 6} Q${cx},${yy + 14} ${cx + bodyHalf(F, yy) + 6},${yy + 4}`} fill="none" stroke={outfit.belt.color} strokeWidth="6" strokeLinecap="round" />);
    } else {
      const hw = bodyHalf(F, y.waist) + 6;
      layers.push(
        <g key="belt">
          <rect x={cx - hw} y={y.waist - 5} width={hw * 2} height="10" rx="2" fill={outfit.belt.color} />
          <rect x={cx - 7} y={y.waist - 7} width="14" height="14" rx="2" fill="none" stroke="#c8a24a" strokeWidth="2.4" />
        </g>,
      );
    }
  }
  if (outer && outfit.outer) {
    const a = outer.attrs;
    const panels = outerPanels(F, a.kind, a.length, a.fit, a.structure === "structured");
    if (a.kind !== "cape") for (const d of sleeves(F, "long", a.fit === "oversized" ? "oversized" : "relaxed")) layers.push(<path key={`os${d.slice(0, 16)}`} d={d} fill={fill("outer")} stroke={line("outer")} strokeWidth="1.3" />);
    panels.forEach((d, i) => layers.push(<path key={`op${i}`} d={d} fill={fill("outer")} stroke={line("outer")} strokeWidth="1.3" />));
    if (a.kind === "blazer" || a.kind === "trench")
      layers.push(<path key="lapel" d={`M${cx - w.neck - 3},${y.neck - 2} L${cx - w.neck - 16},${y.bust - 4} L${cx - 13},${y.bust + 18} M${cx + w.neck + 3},${y.neck - 2} L${cx + w.neck + 16},${y.bust - 4} L${cx + 13},${y.bust + 18}`} fill="none" stroke={line("outer")} strokeWidth="1.4" />);
    if (a.kind === "puffer")
      layers.push(<g key="quilt" stroke={line("outer")} strokeWidth="1.1" opacity="0.7">{[0.25, 0.5, 0.75].map((t) => { const yy = y.shoulder + (y.waist + 8 - y.shoulder) * t; const hw = bodyHalf(F, yy) + 22; return <line key={t} x1={cx - hw} y1={yy} x2={cx + hw} y2={yy} />; })}</g>);
    if (a.kind === "shearling") layers.push(<path key="collar-fur" d={`M${cx - w.shoulder * 0.7},${y.shoulder + 2} Q${cx},${y.neck - 16} ${cx + w.shoulder * 0.7},${y.shoulder + 2} L${cx + w.neck + 18},${y.shoulder + 26} L${cx + 13},${y.bust + 16} L${cx - 13},${y.bust + 16} L${cx - w.neck - 18},${y.shoulder + 26} Z`} fill={shade(outfit.outer.color, 0.45)} stroke={line("outer")} strokeWidth="1" />);
    if (a.kind === "trench" && !outfit.belt) layers.push(<rect key="tbelt" x={cx - bodyHalf(F, y.waist) - 14} y={y.waist - 4} width={(bodyHalf(F, y.waist) + 14) * 2} height="8" fill={shade(outfit.outer.color, -0.15)} />);
  }
  const shoeLayer: JSX.Element[] = [];
  if (shoes && outfit.shoes) {
    const layers = shoeLayer; // shoes are placed under or over trousers below
    const a = shoes.attrs;
    const c = outfit.shoes.color;
    for (const s of [-1, 1] as const) {
      const L = cx + s * F.legX;
      const fy = y.floor;
      if (shoes.id === "shoes-boots") layers.push(<path key={`b${s}`} d={`M${L - w.calf - 3},${y.knee + 8} L${L + w.calf + 2},${y.knee + 8} L${L + w.ankle + 6},${fy - 10} Q${L + 16},${fy + 2} ${L},${fy + 2} Q${L - 18},${fy + 2} ${L - w.ankle - 8},${fy - 10} Z`} fill={c} stroke={shade(c, -0.35)} strokeWidth="1.2" />);
      else if (a.kind === "boot") layers.push(<path key={`b${s}`} d={`M${L - w.ankle - 6},${y.ankle - 22} L${L + w.ankle + 6},${y.ankle - 22} L${L + w.ankle + 8},${fy - 8} Q${L + 16},${fy + 2} ${L},${fy + 2} Q${L - 18},${fy + 2} ${L - w.ankle - 8},${fy - 8} Z`} fill={c} stroke={shade(c, -0.35)} strokeWidth="1.2" />);
      else if (a.kind === "sandal")
        layers.push(<g key={`b${s}`} stroke={c} strokeWidth="3" fill="none"><path d={`M${L - 10},${fy - 8} L${L + 10},${fy - 8}`} /><path d={`M${L - 9},${y.ankle} L${L + 9},${y.ankle}`} /><path d={`M${L - 14},${fy + 1} L${L + 14},${fy + 1}`} strokeWidth="4" /></g>);
      else {
        const pointy = a.kind === "pump";
        layers.push(
          <path key={`b${s}`} d={pointy ? `M${L - 11},${fy - 12} Q${L},${fy - 16} ${L + 11},${fy - 12} L${L + 6},${fy + 3} L${L},${fy + 10} L${L - 6},${fy + 3} Z` : `M${L - 14},${fy - 10} Q${L},${fy - 16} ${L + 14},${fy - 10} Q${L + 17},${fy + 4} ${L},${fy + 4} Q${L - 17},${fy + 4} ${L - 14},${fy - 10} Z`} fill={c} stroke={shade(c, -0.35)} strokeWidth="1.2" />,
        );
        if (a.kind === "sneaker") layers.push(<path key={`sole${s}`} d={`M${L - 15},${fy + 1} Q${L},${fy + 6} ${L + 15},${fy + 1}`} stroke="#d8d8d4" strokeWidth="3" fill="none" />);
        if (shoes.id === "shoes-statement") layers.push(<g key={`gem${s}`} fill="#f2e6b8">{[-6, 0, 6].map((dx) => <circle key={dx} cx={L + dx} cy={fy - 10} r="2" />)}</g>);
      }
    }
  }

  // Full-length trousers fall over shoes; skirts, shorts and cropped trousers show the whole shoe.
  const legs = bottom?.attrs.kind !== "skirt" && bottom?.attrs.length === "full" ? bottom : dress?.attrs.leg ? dress : null;
  if (legs) layers.unshift(...shoeLayer);
  else layers.push(...shoeLayer);

  /* accessories on the head */
  const cy = y.headCy;
  const rx = F.headRx, ry = F.headRy;
  const acc: JSX.Element[] = [];
  const beard = item("beard");
  if (beard && outfit.beard) {
    const c = outfit.beard.color;
    const kind = beard.attrs.kind;
    const jaw = `M${cx - rx * 0.98},${cy + ry * 0.05} Q${cx - rx * 0.95},${cy + ry * (kind === "full" ? 1.25 : 1.08)} ${cx},${cy + ry * (kind === "full" ? 1.3 : 1.08)} Q${cx + rx * 0.95},${cy + ry * (kind === "full" ? 1.25 : 1.08)} ${cx + rx * 0.98},${cy + ry * 0.05} Q${cx + rx * 0.75},${cy + ry * 0.62} ${cx},${cy + ry * 0.68} Q${cx - rx * 0.75},${cy + ry * 0.62} ${cx - rx * 0.98},${cy + ry * 0.05} Z`;
    const mous = `M${cx - 13},${cy + ry * 0.5} Q${cx},${cy + ry * 0.38} ${cx + 13},${cy + ry * 0.5} Q${cx},${cy + ry * 0.46} ${cx - 13},${cy + ry * 0.5} Z`;
    if (kind === "goatee") acc.push(<path key="beard" d={`${mous} M${cx - 9},${cy + ry * 0.68} Q${cx},${cy + ry * 1.12} ${cx + 9},${cy + ry * 0.68} Z`} fill={c} />);
    else acc.push(<path key="beard" d={`${jaw} ${mous}`} fill={c} opacity={kind === "stubble" ? 0.35 : 0.95} />);
  }
  const ear = item("earrings");
  if (ear && outfit.earrings) {
    const c = outfit.earrings.color;
    for (const s of [-1, 1]) {
      const ex = cx + s * rx, ey = cy + 14;
      if (ear.attrs.kind === "studs") acc.push(<circle key={`e${s}`} cx={ex} cy={ey} r="2.6" fill={c} />);
      if (ear.attrs.kind === "hoops") acc.push(<circle key={`e${s}`} cx={ex} cy={ey + 9} r="9" fill="none" stroke={c} strokeWidth="2.2" />);
      if (ear.attrs.kind === "drop") acc.push(<g key={`e${s}`}><line x1={ex} y1={ey} x2={ex} y2={ey + 18} stroke={c} strokeWidth="1.5" /><circle cx={ex} cy={ey + 21} r="4" fill={c} /></g>);
    }
  }
  const glasses = item("glasses");
  if (glasses && outfit.glasses) {
    const c = outfit.glasses.color;
    const gy = cy + ry * 0.02;
    const gx = rx * 0.42;
    const lens = (s: number) => {
      const x = cx + s * gx;
      switch (glasses.attrs.kind) {
        case "round":
          return <circle key={s} cx={x} cy={gy} r="10" />;
        case "square":
          return <rect key={s} x={x - 12} y={gy - 9} width="24" height="17" rx="2" />;
        case "cat-eye":
          return <path key={s} d={`M${x - 12 * s},${gy + 2} Q${x - 12 * s},${gy + 9} ${x},${gy + 8} Q${x + 12 * s},${gy + 7} ${x + 13 * s},${gy - 9} Q${x},${gy - 8} ${x - 12 * s},${gy - 5} Z`} />;
        default:
          return <path key={s} d={`M${x - 12},${gy - 7} L${x + 12},${gy - 7} Q${x + 12},${gy + 12} ${x},${gy + 11} Q${x - 12},${gy + 10} ${x - 12},${gy - 7} Z`} />;
      }
    };
    acc.push(
      <g key="glasses" fill={glasses.attrs.kind === "aviator" ? "rgba(60,60,60,0.25)" : "rgba(255,255,255,0.08)"} stroke={c} strokeWidth="2.2">
        {lens(-1)}
        {lens(1)}
        <path d={`M${cx - gx + 10},${gy - 3} Q${cx},${gy - 7} ${cx + gx - 10},${gy - 3}`} fill="none" />
      </g>,
    );
  }
  const hat = item("hat");
  if (hat && outfit.hat) {
    const c = outfit.hat.color;
    const t = cy - ry;
    if (hat.attrs.kind === "beanie") acc.push(<path key="hat" d={`M${cx - rx * 1.12},${cy - ry * 0.35} Q${cx - rx * 1.1},${t - ry * 0.45} ${cx},${t - ry * 0.5} Q${cx + rx * 1.1},${t - ry * 0.45} ${cx + rx * 1.12},${cy - ry * 0.35} Z`} fill={c} stroke={shade(c, -0.3)} />);
    if (hat.attrs.kind === "cap") acc.push(<path key="hat" d={`M${cx - rx * 1.08},${cy - ry * 0.45} Q${cx},${t - ry * 0.55} ${cx + rx * 1.08},${cy - ry * 0.45} Z M${cx - rx * 0.4},${cy - ry * 0.5} Q${cx + rx * 0.9},${cy - ry * 0.62} ${cx + rx * 1.6},${cy - ry * 0.35} Q${cx + rx * 0.6},${cy - ry * 0.3} ${cx - rx * 0.4},${cy - ry * 0.4} Z`} fill={c} stroke={shade(c, -0.3)} />);
    if (hat.attrs.kind === "fedora") acc.push(<g key="hat" fill={c} stroke={shade(c, -0.3)}><ellipse cx={cx} cy={cy - ry * 0.55} rx={rx * 2.1} ry={ry * 0.22} /><path d={`M${cx - rx * 0.95},${cy - ry * 0.55} L${cx - rx * 0.8},${t - ry * 0.45} Q${cx},${t - ry * 0.2} ${cx + rx * 0.8},${t - ry * 0.45} L${cx + rx * 0.95},${cy - ry * 0.55} Z`} /><rect x={cx - rx * 0.93} y={cy - ry * 0.75} width={rx * 1.86} height="6" fill={shade(c, -0.4)} /></g>);
    if (hat.attrs.kind === "trapper") acc.push(<g key="hat" fill={shade(c, 0.25)} stroke={shade(c, -0.25)}><path d={`M${cx - rx * 1.3},${cy + ry * 0.3} L${cx - rx * 1.25},${cy - ry * 0.45} Q${cx},${t - ry * 0.7} ${cx + rx * 1.25},${cy - ry * 0.45} L${cx + rx * 1.3},${cy + ry * 0.3} L${cx + rx * 0.95},${cy + ry * 0.3} L${cx + rx * 0.98},${cy - ry * 0.3} Q${cx},${cy - ry * 0.7} ${cx - rx * 0.98},${cy - ry * 0.3} L${cx - rx * 0.95},${cy + ry * 0.3} Z`} /></g>);
  }

  const patterned = (Object.entries(outfit) as [Slot, Worn][]).filter(([, wo]) => wo && wo.pattern !== "solid");

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="avatar" role="img" aria-label={title ?? "Your avatar wearing the current look"}>
      <defs>{patterned.map(([slot, wo]) => patternDef(`${uid}-${slot}`, wo.color, wo.pattern))}</defs>
      <ellipse cx={cx} cy={y.floor + 8} rx={w.hip + 40} ry="10" fill="var(--floor)" />
      {hair.back && <path d={hair.back} fill={hairColor} />}
      {hair.extraBack && <g fill={hairColor} stroke={hairColor}>{hair.extraBack}</g>}
      <BodyLayer F={F} skin={skin} />
      {layers}
      <FaceLayer F={F} skin={skin} eyeColor={eyeColor} lips={outfit.lips} eyes={outfit.eyes} blush={outfit.blush} faceImg={faceImg} clipId={`${uid}-clip`} />
      {acc.filter((a) => a.key === "beard")}
      {hair.front && <path d={hair.front} fill={hairColor} opacity={hair.opacityFront ?? 1} />}
      {hair.extra && <g fill={hairColor} stroke={hairColor}>{hair.extra}</g>}
      {acc.filter((a) => a.key !== "beard")}
    </svg>
  );
}
