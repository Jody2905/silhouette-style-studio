import { analyseBody, buildGuide, scoreLook, SOURCES, type Outfit, type Profile } from "@silhouette/engine";
import { useMemo, useState } from "react";
import type { SavedLook } from "../api";
import { Avatar } from "../avatar/Avatar";
import { Section } from "../components/common";

export function Trends({ profile, onTry }: { profile: Profile; onTry: (trendId: string) => void }) {
  const g = useMemo(() => buildGuide(profile), [profile]);
  const shape = analyseBody(profile).shape;
  return (
    <div className="trends">
      <div className="page-head">
        <h2>Autumn/Winter 2026 trends</h2>
        <p className="muted">From this season's runway reports, sorted by how easily they work for your shape and style. Tap "Try it on" to style one on your avatar.</p>
      </div>
      <div className="trend-grid">
        {g.trends.map(({ trend, fit }) => (
          <article key={trend.id} className="trend">
            <div className="trend-av">
              <Avatar profile={profile} outfit={trend.starter} title={`${trend.name} starter look`} />
            </div>
            <div className="trend-body">
              <span className={`fit ${fit}`}>{fit === "easy" ? "Easy for you" : `Adapt it for your ${shape.replace("-", " ")} shape`}</span>
              <h3>{trend.name}</h3>
              <p>{trend.what}</p>
              <p className="how">
                <b>How to wear it:</b> {trend.howTo}
              </p>
              <button type="button" className="btn small" onClick={() => onTry(trend.id)}>
                Try it on
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Looks({
  profile,
  looks,
  faceImg,
  onOpen,
  onRename,
  onDelete,
  note,
}: {
  profile: Profile;
  looks: SavedLook[];
  faceImg: string | null;
  onOpen: (o: Outfit) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  note: string;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<number | null>(null);
  return (
    <div className="looks">
      <div className="page-head">
        <h2>Saved looks</h2>
        <p className="muted">{note}</p>
      </div>
      {looks.length === 0 ? (
        <div className="card empty">
          <h3>No looks saved yet</h3>
          <p className="muted">Build an outfit in the Studio, give it a name and click "Save look". It will appear here.</p>
        </div>
      ) : (
        <div className="look-grid">
          {looks.map((l) => {
            const live = scoreLook(profile, l.outfit).score;
            return (
              <article key={l.id} className="look">
                <button type="button" className="look-av" onClick={() => onOpen(l.outfit)} aria-label={`Open ${l.name} in the studio`}>
                  <Avatar profile={profile} outfit={l.outfit} faceImg={faceImg} title={l.name} />
                </button>
                <div className="look-body">
                  {editing === l.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (draft.trim()) onRename(l.id, draft.trim());
                        setEditing(null);
                      }}
                    >
                      <input aria-label="New name" value={draft} maxLength={60} autoFocus onChange={(e) => setDraft(e.target.value)} onBlur={() => setEditing(null)} />
                    </form>
                  ) : (
                    <h3>{l.name}</h3>
                  )}
                  <p className="muted small">
                    Score <b>{live}</b>
                    {live !== l.score && <> (was {l.score} when saved)</>}
                  </p>
                  {confirm === l.id ? (
                    <div className="row">
                      <button type="button" className="btn small danger" onClick={() => { onDelete(l.id); setConfirm(null); }}>
                        Delete
                      </button>
                      <button type="button" className="btn small ghost" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                    </div>
                  ) : (
                    <div className="row">
                      <button type="button" className="btn small" onClick={() => onOpen(l.outfit)}>
                        Open
                      </button>
                      <button type="button" className="link small" onClick={() => { setEditing(l.id); setDraft(l.name); }}>
                        Rename
                      </button>
                      <button type="button" className="link small" onClick={() => setConfirm(l.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Research() {
  return (
    <div className="research">
      <div className="page-head">
        <h2>How Silhouette works</h2>
        <p className="muted">What's backed by research, what's a stylist rule of thumb, and where the trends come from.</p>
      </div>
      <div className="guide-grid">
        <Section title="Three kinds of advice">
          <ul className="tips">
            <li><span className="ev ev-research">Research</span> Backed by published studies, such as the body-shape formulas, leg-length perception and facial contrast.</li>
            <li><span className="ev ev-stylist">Stylist tip</span> Widely used guidance from stylists and fashion education that hasn't been tested scientifically, such as most "dressing for your shape" and face-shape advice, and seasonal colour analysis.</li>
            <li><span className="ev ev-myth">Myth busted</span> Popular advice that studies contradict, such as "horizontal stripes make you look wider".</li>
          </ul>
        </Section>
        <Section title="Your photo and privacy">
          <ul className="tips">
            <li>Your photo is analysed inside your browser with Google's MediaPipe models. It is never uploaded to our server or saved.</li>
            <li>Only the resulting numbers (face proportions, body width ratios, skin colour) are kept with your profile, and you can edit or delete them.</li>
            <li>The face shown on your avatar stays in memory and disappears when you close the tab.</li>
            <li>Camera readings are estimates. Lighting changes skin colour, and clothing changes body outlines, so tape measurements and your own judgement always win.</li>
          </ul>
        </Section>
        <Section title="How the score works">
          <p>Every look starts at 60. Rules then add or take away points for balance with your body shape, proportion, face shape, your colour palette near the face, makeup contrast, pattern mixing, your chosen style, and current trends. Every point change is explained, with its evidence type.</p>
          <p className="muted">There's no single right way to dress. The score is a guide to help you experiment, not a verdict on your body.</p>
        </Section>
      </div>
      <Section title="Sources">
        <ul className="sources">
          {SOURCES.map((s) => (
            <li key={s.key}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title} ↗
              </a>
              <br />
              <span className="muted small">{s.usedFor}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
