import {
  BODY_SHAPE_LABEL, classifyFace, EYE_COLORS, FACE_SHAPE_LABEL, FACE_SHAPES, HAIR_COLORS, ProfileSchema, SKIN_DEPTHS, skinFromHex, UNDERTONES, VIBES,
  analyseBody, type Profile,
} from "@silhouette/engine";
import { useRef, useState } from "react";
import { HAIR_HEX, SKIN_DEFAULT } from "../avatar/geometry";
import { Chips, Section } from "../components/common";
import type { PhotoAnalysis, PhotoScene } from "../vision/analyse";

type MKey = keyof Profile["measurements"];
const M_FIELDS: { key: MKey; label: string; help: string }[] = [
  { key: "bust", label: "Bust / chest", help: "Around the fullest part, tape level under the arms." },
  { key: "waist", label: "Waist", help: "Around the narrowest part, usually just above the belly button." },
  { key: "highHip", label: "High hip", help: "About 10 cm (4 in) below the waist, around the top of the hip bones." },
  { key: "hip", label: "Hips", help: "Around the fullest part of the hips and seat, feet together." },
  { key: "shoulder", label: "Shoulder width", help: "Straight across the back, from one shoulder bone to the other." },
  { key: "inseam", label: "Inseam", help: "Inside leg, from the crotch to the floor, standing without shoes." },
];

export function You({
  profile,
  setProfile,
  faceImg,
  setFaceImg,
  onScene,
  onDone,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  faceImg: string | null;
  setFaceImg: (s: string | null) => void;
  onScene: (s: PhotoScene | null) => void;
  onDone: () => void;
}) {
  const [units, setUnits] = useState<"cm" | "in">("cm");
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | "loading" | "done" | "error">("");
  const [result, setResult] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFace, setShowFace] = useState(!!faceImg);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile(ProfileSchema.parse({ ...profile, [k]: v }));
  const toUnit = (cm: number | null) => (cm == null ? "" : units === "cm" ? String(Math.round(cm)) : (cm / 2.54).toFixed(1));
  const setM = (k: MKey, raw: string) => {
    const n = parseFloat(raw);
    const cm = Number.isFinite(n) ? (units === "cm" ? n : n * 2.54) : null;
    const r = ProfileSchema.safeParse({ ...profile, measurements: { ...profile.measurements, [k]: cm } });
    if (r.success) setProfile(r.data);
  };
  const [heightDraft, setHeightDraft] = useState(String(Math.round(profile.heightCm)));
  const body = analyseBody(profile);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPG or PNG).");
    setError(null);
    setResult(null);
    const url = URL.createObjectURL(file);
    setPhoto(url);
    setStatus("loading");
    // Wait for the <img> to load the file, then analyse it in this browser.
    await new Promise((r) => setTimeout(r, 30));
    const img = imgRef.current!;
    if (!img.complete) await new Promise((r) => (img.onload = r));
    try {
      const { analysePhoto } = await import("../vision/analyse");
      const r = await analysePhoto(img);
      setResult(r);
      setStatus("done");
      onScene(r.scene);
      const skin = r.skinHex ? skinFromHex(r.skinHex) : null;
      setProfile(
        ProfileSchema.parse({
          ...profile,
          faceRatios: r.faceRatios ?? profile.faceRatios,
          faceShape: r.faceRatios ? null : profile.faceShape,
          photoBody: r.photoBody ?? profile.photoBody,
          skinHex: r.skinHex ?? profile.skinHex,
          skinDepth: skin?.depth ?? profile.skinDepth,
          undertone: skin?.undertone ?? profile.undertone,
        }),
      );
      if (r.faceCrop) {
        setFaceImg(r.faceCrop);
        setShowFace(true);
      }
    } catch {
      setStatus("error");
      setError("The photo AI couldn't load. Check your connection and try again, or fill in the details below yourself.");
    }
  }

  const detectedFace = profile.faceRatios ? classifyFace(profile.faceRatios) : null;

  return (
    <div className="you">
      <Section
        title="Your photo"
        sub="A front-facing, full-length photo in fitted clothes works best, with arms held slightly away from your body. The photo is analysed on this device and is never uploaded or saved."
      >
        <div className="photo-row">
          <div className="photo-box">
            {photo ? <img ref={imgRef} src={photo} alt="Your uploaded photo" /> : <div className="photo-empty">No photo yet</div>}
            {status === "loading" && <div className="photo-busy">Reading your face and body…</div>}
          </div>
          <div className="photo-side">
            <input ref={fileRef} id="photo" type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {photo ? "Choose another photo" : "Add a photo"}
            </button>
            {error && <p className="err">{error}</p>}
            {result && (
              <ul className="found">
                <li>Face shape: <b>{result.faceRatios ? FACE_SHAPE_LABEL[classifyFace(result.faceRatios)] : "not found"}</b></li>
                <li>Skin tone: {result.skinHex ? <span className="inline-sw" style={{ background: result.skinHex }} /> : "not found"} {result.skinHex && <b>{skinFromHex(result.skinHex).depth}, {skinFromHex(result.skinHex).undertone} undertone</b>}</li>
                <li>Body: <b>{result.photoBody ? `${BODY_SHAPE_LABEL[body.shape]}${body.method === "measurements" ? " (from your measurements)" : " (estimate)"}` : "not measured"}</b></li>
                {result.notes.map((n) => (
                  <li key={n} className="note">{n}</li>
                ))}
              </ul>
            )}
            {faceImg && (
              <label className="check">
                <input type="checkbox" checked={showFace} onChange={(e) => { setShowFace(e.target.checked); if (!e.target.checked) setFaceImg(null); else if (result?.faceCrop) setFaceImg(result.faceCrop); }} />
                Show my face on the avatar (this session only)
              </label>
            )}
          </div>
        </div>
      </Section>

      <Section title="The basics">
        <div className="grid2">
          <div className="f">
            <label htmlFor="name">Name (optional)</label>
            <input id="name" value={profile.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="f">
            <label htmlFor="height">Height (cm)</label>
            <input
              id="height"
              type="number"
              inputMode="decimal"
              value={heightDraft}
              onChange={(e) => {
                setHeightDraft(e.target.value);
                const n = parseFloat(e.target.value);
                if (n >= 120 && n <= 230) set("heightCm", n);
              }}
            />
          </div>
        </div>
        <div className="f">
          <span className="lbl">Show me clothes from</span>
          <Chips name="Wardrobe" options={["womenswear", "menswear", "all"] as const} value={profile.wardrobe} onChange={(v) => set("wardrobe", v)} labels={{ all: "Everything" }} />
        </div>
      </Section>

      <Section
        title="Measurements"
        sub="Optional, but they're the most accurate way to find your body shape. Use a soft tape, snug but not tight."
        aside={<Chips name="Units" options={["cm", "in"] as const} value={units} onChange={setUnits} />}
      >
        <div className="grid3">
          {M_FIELDS.map((m) => (
            <div className="f" key={m.key}>
              <label htmlFor={`m-${m.key}`}>
                {m.label} ({units})
              </label>
              <input id={`m-${m.key}`} type="number" inputMode="decimal" defaultValue={toUnit(profile.measurements[m.key])} key={`${m.key}-${units}`} onBlur={(e) => setM(m.key, e.target.value)} />
              <span className="hint">{m.help}</span>
            </div>
          ))}
        </div>
        <p className="result">
          Body shape: <b>{BODY_SHAPE_LABEL[body.shape]}</b>
          <span className="muted"> · {body.method === "measurements" ? "from your measurements" : body.method === "photo" ? "estimated from your photo" : "add measurements or a photo"}</span>
        </p>
      </Section>

      <Section title="Colouring" sub="Your photo fills these in automatically. Lighting can fool a camera, so adjust them if they look wrong.">
        <div className="f">
          <span className="lbl">Skin depth</span>
          <Chips name="Skin depth" options={SKIN_DEPTHS} value={profile.skinDepth} onChange={(v) => setProfile(ProfileSchema.parse({ ...profile, skinDepth: v, skinHex: null }))} swatches={SKIN_DEFAULT} />
        </div>
        <div className="f">
          <span className="lbl">Undertone</span>
          <Chips name="Undertone" options={UNDERTONES} value={profile.undertone} onChange={(v) => set("undertone", v)} />
          <span className="hint">
            Not sure? Veins look blue or purple → cool; green → warm; both → neutral. Silver jewellery flatters cool skin, gold flatters warm. Olive skin has a green-grey cast.
          </span>
        </div>
        <div className="f">
          <span className="lbl">Natural hair colour</span>
          <Chips name="Hair colour" options={HAIR_COLORS} value={profile.hairColor} onChange={(v) => set("hairColor", v)} swatches={HAIR_HEX} />
        </div>
        <div className="f">
          <span className="lbl">Eye colour</span>
          <Chips name="Eye colour" options={EYE_COLORS} value={profile.eyeColor} onChange={(v) => set("eyeColor", v)} />
        </div>
      </Section>

      <Section title="Face shape" sub={detectedFace ? `Your photo reads as ${FACE_SHAPE_LABEL[detectedFace].toLowerCase()}. Pick another if you disagree.` : "Add a photo to detect it, or choose one."}>
        <Chips
          name="Face shape"
          options={FACE_SHAPES}
          value={profile.faceShape ?? detectedFace ?? ("" as never)}
          onChange={(v) => set("faceShape", v === detectedFace ? null : v)}
          labels={FACE_SHAPE_LABEL}
        />
      </Section>

      <Section title="Your style" sub="Pick up to four. Looks that match your style score higher.">
        <Chips name="Style" options={VIBES} value={profile.vibes} onChange={(v) => set("vibes", v.length ? v : profile.vibes)} multi max={4} />
      </Section>

      <div className="cta-row">
        <button type="button" className="btn big" onClick={onDone}>
          Start styling →
        </button>
      </div>
    </div>
  );
}
