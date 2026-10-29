import {
  HAIR_HEX, analyseColor, paletteFit, catalogFor, ITEM, PATTERN_LABEL, PATTERNS, scoreLook, SLOT_LABEL, SLOTS, styleMe, TRENDS, type Outfit, type Pattern, type Profile, type Slot,
} from "@silhouette/engine";
import { useMemo, useState } from "react";
import { Avatar } from "../avatar/Avatar";
import { EvidenceBadge, Swatch } from "../components/common";
import { AiTryOn } from "../photo/AiTryOn";
import type { User } from "../api";
import type { PhotoScene } from "../vision/analyse";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const tone = score >= 85 ? "var(--good)" : score >= 72 ? "var(--accent)" : score >= 58 ? "var(--warn)" : "var(--muted)";
  return (
    <div className="ring" aria-label={`Style score ${score} out of 100: ${label}`}>
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
      </svg>
      <div className="ring-in">
        <b>{score}</b>
      </div>
      <span className="ring-label">{label}</span>
    </div>
  );
}

export function Studio({
  profile,
  outfit,
  setOutfit,
  faceImg,
  scene,
  restoring,
  onAddPhoto,
  user,
  onSignIn,
  onSave,
}: {
  profile: Profile;
  outfit: Outfit;
  setOutfit: (o: Outfit) => void;
  faceImg: string | null;
  scene: PhotoScene | null;
  restoring?: boolean;
  onAddPhoto: () => void;
  user: User | null;
  onSignIn: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const items = useMemo(() => catalogFor(profile.wardrobe), [profile.wardrobe]);
  const slots = SLOTS.filter((s) => items.some((i) => i.slot === s));
  const [slot, setSlot] = useState<Slot>("top");
  const [seed, setSeed] = useState(1);
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const result = useMemo(() => scoreLook(profile, outfit), [profile, outfit]);
  const palette = analyseColor(profile).palette;
  const current = outfit[slot];

  const pick = (id: string) => {
    const it = ITEM[id];
    const next: Outfit = { ...outfit };
    if (current?.id === id) delete next[slot];
    else {
      next[slot] = { id, color: slot === "hair" || slot === "beard" ? (outfit.hair?.color ?? HAIR_HEX[profile.hairColor]) : it.color, pattern: "solid" };
      // A dress replaces separates and vice versa.
      if (slot === "dress") { delete next.top; delete next.bottom; }
      if (slot === "top" || slot === "bottom") delete next.dress;
    }
    setOutfit(next);
  };
  const recolor = (color: string) => current && setOutfit({ ...outfit, [slot]: { ...current, color } });
  const repattern = (pattern: Pattern) => current && setOutfit({ ...outfit, [slot]: { ...current, pattern } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim()) return setSaveMsg("Give the look a name first.");
    try {
      await onSave(saveName.trim());
      setSaveMsg(`Saved "${saveName.trim()}".`);
      setSaveName("");
    } catch (err) {
      setSaveMsg((err as Error).message);
    }
  }

  const FIT_LABEL = { great: "Suits you", ok: "Okay", clash: "Not your best" } as const;
  const originalFit = current ? paletteFit(ITEM[current.id].color, palette) : "ok";

  return (
    <div className="studio">
      <div className="stage">
        <div className="stage-top">
          <ScoreRing score={result.score} label={result.label} />
          <div className="stage-actions">
            <button type="button" className="btn" onClick={() => { setOutfit(styleMe(profile, { seed })); setSeed(seed + 1); }}>
              ✦ Style me
            </button>
            <select aria-label="Try a trend" className="select" value="" onChange={(e) => e.target.value && setOutfit(styleMe(profile, { trend: e.target.value, seed }))}>
              <option value="">Try a trend…</option>
              {TRENDS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn ghost" onClick={() => setOutfit({})}>
              Undress
            </button>
          </div>
        </div>
        {scene ? (
          <AiTryOn scene={scene} profile={profile} outfit={outfit} user={user} onSignIn={onSignIn} />
        ) : restoring ? (
          <div className="photo-loading" role="status">Loading your photo…</div>
        ) : (
          <div className="avatar-wrap">
            <Avatar profile={profile} outfit={outfit} faceImg={faceImg} />
          </div>
        )}
        {!scene && !restoring && (
          <p className="muted small center">
            <button type="button" className="link" onClick={onAddPhoto}>Add a photo</button> to try looks on yourself instead of this drawing. It stays on your device.
          </p>
        )}
        <form className="save-row" onSubmit={save}>
          <input aria-label="Look name" placeholder="Name this look" value={saveName} maxLength={60} onChange={(e) => setSaveName(e.target.value)} />
          <button type="submit" className="btn">
            Save look
          </button>
        </form>
        {saveMsg && <p className="muted small" role="status">{saveMsg}</p>}
      </div>

      <div className="rack">
        <nav className="slot-tabs" aria-label="Clothing categories">
          {slots.map((s) => (
            <button key={s} type="button" className={s === slot ? "on" : ""} aria-pressed={s === slot} onClick={() => setSlot(s)}>
              {SLOT_LABEL[s]}
              {outfit[s] && <span className="worn-dot" aria-label="(wearing)" />}
            </button>
          ))}
        </nav>
        <div className="items">
          {items
            .filter((i) => i.slot === slot)
            .map((i) => (
              <button key={i.id} type="button" className={`item${current?.id === i.id ? " on" : ""}`} aria-pressed={current?.id === i.id} onClick={() => pick(i.id)}>
                <span className="item-sw" style={{ background: current?.id === i.id ? current.color : i.color }} />
                {["top", "bottom", "dress", "outer"].includes(slot) && paletteFit(current?.id === i.id ? current.color : i.color, palette) === "great" && (
                  <span className="star" title="In your best colours" aria-label="In your best colours">★</span>
                )}
                <span className="item-name">{i.name}</span>
                {i.trends?.length ? <span className="tag">AW26</span> : null}
              </button>
            ))}
        </div>

        {current && slot !== "hair" && slot !== "beard" ? (
          <div className="custom">
            <div className="color-head">
              <h4>Colour</h4>
              <span className={`fit-pill fit-${paletteFit(current.color, palette)}`}>
                Current colour: {FIT_LABEL[paletteFit(current.color, palette)]}
              </span>
            </div>
            <div className="color-group best">
              <span className="group-label">★ Your best colours</span>
              <div className="swatches">
                {palette.best.map((c) => (
                  <Swatch key={c.hex} hex={c.hex} name={c.name} variant="best" active={current.color.toLowerCase() === c.hex.toLowerCase()} onClick={() => recolor(c.hex)} />
                ))}
              </div>
            </div>
            <div className="color-group">
              <span className="group-label">Your neutrals</span>
              <div className="swatches">
                {palette.neutrals.map((c) => (
                  <Swatch key={c.hex} hex={c.hex} name={c.name} variant="neutral" active={current.color.toLowerCase() === c.hex.toLowerCase()} onClick={() => recolor(c.hex)} />
                ))}
              </div>
            </div>
            <div className="color-group avoid">
              <span className="group-label">Keep away from your face</span>
              <div className="swatches">
                {palette.avoid.map((c) => (
                  <Swatch key={c.hex} hex={c.hex} name={c.name} variant="avoid" active={current.color.toLowerCase() === c.hex.toLowerCase()} onClick={() => recolor(c.hex)} />
                ))}
              </div>
            </div>
            <div className="color-group">
              <span className="group-label">Other</span>
              <div className="swatches">
                <Swatch hex={ITEM[current.id].color} name={`Original · ${FIT_LABEL[originalFit].toLowerCase()}`} variant={originalFit === "great" ? "best" : originalFit === "clash" ? "avoid" : undefined} active={current.color.toLowerCase() === ITEM[current.id].color.toLowerCase()} onClick={() => recolor(ITEM[current.id].color)} />
                <label className="swatch custom-color">
                  <input type="color" value={current.color} onChange={(e) => recolor(e.target.value)} aria-label="Pick any colour" />
                  <span className="sw-name">Any colour</span>
                </label>
              </div>
            </div>
            {ITEM[current.id].patternable && (
              <>
                <h4>Pattern</h4>
                <div className="chips">
                  {PATTERNS.map((p) => (
                    <button key={p} type="button" className={`chip${current.pattern === p ? " on" : ""}`} aria-pressed={current.pattern === p} onClick={() => repattern(p)}>
                      {PATTERN_LABEL[p]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : current && (slot === "hair" || slot === "beard") ? (
          <div className="custom">
            <h4>Colour</h4>
            <div className="swatches">
              {["#1a1311", "#33231a", "#5a3a26", "#8a6040", "#d4b06a", "#a2462a", "#9a9894", "#7a3fa0", "#2b5fa8"].map((hex) => (
                <Swatch key={hex} hex={hex} name="" active={current.color === hex} onClick={() => recolor(hex)} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="feedback">
          {result.missing.length > 0 && <p className="missing">Add {result.missing.join(", ")} to complete the look.</p>}
          {result.works.length > 0 && (
            <>
              <h4>What works</h4>
              <ul>
                {result.works.map((n) => (
                  <li key={n.text}>
                    <span className="pts plus">{n.points > 0 ? `+${n.points}` : "✓"}</span> {n.text} <EvidenceBadge evidence={n.evidence} source={n.source} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.tryThis.length > 0 && (
            <>
              <h4>Try this</h4>
              <ul>
                {result.tryThis.map((n) => (
                  <li key={n.text}>
                    <span className={`pts ${n.points < 0 ? "minus" : "info"}`}>{n.points < 0 ? n.points : "i"}</span> {n.text} <EvidenceBadge evidence={n.evidence} source={n.source} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
