// "Make it real": swaps the quick on-device preview for a photorealistic AI edit of the user's photo.
import type { Outfit, Profile } from "@silhouette/engine";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, DEMO, type TryOnStatus, type User } from "../api";
import type { PhotoScene } from "../vision/analyse";
import { PhotoTryOn } from "./PhotoTryOn";

const CONSENT_KEY = "silhouette-ai-consent";
const hasConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
};

/** Generated pictures for this visit, by look, so going back to a look doesn't pay twice. */
const cache = new Map<string, string>();

export function AiTryOn({ scene, profile, outfit, user, onSignIn }: { scene: PhotoScene; profile: Profile; outfit: Outfit; user: User | null; onSignIn: () => void }) {
  const key = useMemo(() => JSON.stringify(outfit), [outfit]);
  const [status, setStatus] = useState<TryOnStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [showAi, setShowAi] = useState(true);
  const [, bump] = useState(0);
  const image = cache.get(key) ?? null;
  const empty = Object.keys(outfit).length === 0;

  useEffect(() => {
    if (DEMO || !user) return setStatus(null);
    api.tryOnStatus().then(setStatus, () => setStatus(null));
  }, [user]);
  useEffect(() => setError(null), [key]);

  async function generate(consented = hasConsent()) {
    if (!consented) return setAsking(true);
    setBusy(true);
    setError(null);
    try {
      const r = await api.tryOn(scene.photo.toDataURL("image/jpeg", 0.9), outfit);
      cache.set(key, r.image);
      setShowAi(true);
      bump((n) => n + 1);
      setStatus((s) => (s ? { ...s, remaining: Math.max(0, s.remaining - 1) } : s));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the server. Check your connection and try again.");
      api.tryOnStatus().then(setStatus, () => {});
    } finally {
      setBusy(false);
    }
  }

  const control = (() => {
    if (DEMO) return <p className="muted small">Photorealistic AI try-on is in the full app (with an account). This guest version shows the quick preview only.</p>;
    if (!user)
      return (
        <p className="muted small">
          <button type="button" className="link" onClick={onSignIn}>Sign in</button> to turn this preview into a realistic AI photo.
        </p>
      );
    if (status && !status.enabled) return <p className="muted small">AI try-on isn't switched on for this server yet.</p>;
    return (
      <div className="ai-row">
        <button type="button" className="btn" onClick={() => generate()} disabled={busy || empty || status?.remaining === 0}>
          {busy ? "Creating your photo…" : image ? "✨ Make it real again" : "✨ Make it real"}
        </button>
        <span className="muted small">
          {busy ? "This takes about 10–30 seconds." : empty ? "Pick some clothes first." : status ? `${status.remaining} of ${status.perDay} left today` : ""}
        </span>
      </div>
    );
  })();

  return (
    <div className="ai-tryon">
      {image && showAi ? (
        <figure className="ai-photo">
          <img src={image} alt="AI photo of you wearing this look" />
          <figcaption className="muted small">AI-generated from your photo. Details can differ slightly from the real garments.</figcaption>
        </figure>
      ) : (
        <PhotoTryOn scene={scene} profile={profile} outfit={outfit} />
      )}
      {image && (
        <div className="view-switch" role="tablist" aria-label="Which picture">
          <button type="button" role="tab" aria-selected={showAi} className={showAi ? "on" : ""} onClick={() => setShowAi(true)}>AI photo</button>
          <button type="button" role="tab" aria-selected={!showAi} className={!showAi ? "on" : ""} onClick={() => setShowAi(false)}>Quick preview</button>
          <a className="btn ghost small" href={image} download="silhouette-look.png">Download</a>
        </div>
      )}
      {asking ? (
        <div className="ai-consent" role="dialog" aria-label="Send your photo to the AI?">
          <p>
            To make the picture, your photo and a description of this look are sent to <b>Google's Gemini AI</b>. Silhouette doesn't keep either; the result
            is shown here and only saved if you download it.
          </p>
          <div className="ai-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                try {
                  localStorage.setItem(CONSENT_KEY, "1");
                } catch {
                  /* still allow this once */
                }
                setAsking(false);
                void generate(true);
              }}
            >
              OK, make it real
            </button>
            <button type="button" className="btn ghost" onClick={() => setAsking(false)}>Not now</button>
          </div>
        </div>
      ) : (
        control
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );

}
