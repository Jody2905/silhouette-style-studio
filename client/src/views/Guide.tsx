import { buildGuide, styleMe, type Outfit, type Profile } from "@silhouette/engine";
import { useMemo } from "react";
import { Avatar } from "../avatar/Avatar";
import { EvidenceBadge, Section, Swatch } from "../components/common";

export function Guide({ profile, faceImg }: { profile: Profile; faceImg: string | null }) {
  const g = useMemo(() => buildGuide(profile), [profile]);
  const signature = useMemo(() => styleMe(profile, { seed: 3 }), [profile]);
  const masc = profile.wardrobe === "menswear";

  return (
    <div className="guide">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Your style guide{profile.name ? ` · ${profile.name}` : ""}</p>
          <h2>
            {g.body.label} body, {g.face.shape ? `${g.face.label.toLowerCase()} face` : "face not measured"}, {g.color.palette.label.split(" (")[0].toLowerCase()} colouring
          </h2>
          <p className="muted">{g.body.summary}</p>
        </div>
        <div className="hero-avatar">
          <Avatar profile={profile} outfit={signature as Outfit} faceImg={faceImg} title="Your signature look" />
          <span className="cap">A signature look picked for you</span>
        </div>
      </section>

      <div className="guide-grid">
        <Section title="Body shape" sub={g.body.method === "measurements" ? "From your measurements, using the Female Figure Identification Technique formulas." : g.body.method === "photo" ? "Estimated from your photo. Tape measurements are more accurate." : "Add measurements or a photo to personalise this."}>
          <h4>Wear more of</h4>
          <ul className="ticks">{g.body.wear.map((t) => <li key={t}>{t}</li>)}</ul>
          <h4>Go easy on</h4>
          <ul className="crosses">{g.body.careful.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="fine"><EvidenceBadge evidence="stylist" /> Shape names come from research; what "flatters" each shape is stylist convention, not proven science.</p>
        </Section>

        <Section title="Proportion" sub={`Height: ${g.body.heightClass}${g.body.legs !== "unknown" ? ` · legs: ${g.body.legs} than average` : ""}`}>
          <ul className="tips">
            {g.proportion.map((t) => (
              <li key={t.text}>
                {t.text} <EvidenceBadge evidence={t.evidence} source={t.source} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Face shape" sub={g.face.summary}>
          {g.face.shape ? (
            <ul className="tips">
              <li><b>Hair:</b> {g.face.hair}</li>
              <li><b>Glasses:</b> {g.face.glasses}</li>
              {profile.wardrobe !== "womenswear" && <li><b>Beard:</b> {g.face.beard}</li>}
            </ul>
          ) : (
            <p className="muted">Add a photo on the You tab.</p>
          )}
          <p className="fine"><EvidenceBadge evidence="stylist" /> Face-shape advice is a widely used stylist rule of thumb.</p>
        </Section>

        <Section title="Your colours" sub={g.color.palette.summary}>
          <h4>Best colours</h4>
          <div className="swatches">{g.color.palette.best.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} variant="best" />)}</div>
          <h4>Neutrals</h4>
          <div className="swatches">{g.color.palette.neutrals.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} variant="neutral" />)}</div>
          <h4>Keep away from your face</h4>
          <div className="swatches">{g.color.palette.avoid.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} variant="avoid" />)}</div>
          <p><b>Metals:</b> {g.color.palette.metals} · <b>Your contrast:</b> {g.color.contrast}</p>
          <p className="fine"><EvidenceBadge evidence="stylist" /> Seasonal colour analysis is a stylist method; it hasn't been tested scientifically.</p>
        </Section>

        {!masc && (
          <Section title="Makeup">
            <div className="swatches">{g.color.palette.lips.map((c) => <Swatch key={c.hex} hex={c.hex} name={`${c.name} lip`} />)}</div>
            <ul className="tips">
              {g.makeup.map((t) => (
                <li key={t.text}>
                  {t.text} <EvidenceBadge evidence={t.evidence} source={t.source} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Shopping list" sub="Key pieces to look for, in your colours.">
          <ol className="shop">{g.shopping.map((s) => <li key={s}>{s}</li>)}</ol>
        </Section>
      </div>
    </div>
  );
}
