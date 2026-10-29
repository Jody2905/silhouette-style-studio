import { DEFAULT_PROFILE, ProfileSchema, scoreLook, styleMe, type Outfit, type Profile } from "@silhouette/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiLooks, DEMO, local, localLooks, type LookStore, type SavedLook, type User } from "./api";
import { AccountMenu, AuthDialog } from "./components/Account";
import { Guide } from "./views/Guide";
import { Looks, Research, Trends } from "./views/More";
import { Studio } from "./views/Studio";
import { You } from "./views/You";
import type { PhotoScene } from "./vision/analyse";

const TABS = [
  ["you", "You"],
  ["studio", "Studio"],
  ["guide", "Style guide"],
  ["trends", "Trends"],
  ["looks", "Saved looks"],
  ["how", "How it works"],
] as const;
type Tab = (typeof TABS)[number][0];
const tabFromHash = (): Tab | null => (TABS.find(([k]) => k === location.hash.slice(1))?.[0] as Tab) ?? null;

function loadLocalProfile(): Profile | null {
  const raw = local.get<unknown>("profile", null);
  if (!raw) return null;
  const r = ProfileSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export default function App() {
  const saved = loadLocalProfile();
  const [profile, setProfileState] = useState<Profile>(saved ?? DEFAULT_PROFILE);
  const [tab, setTab] = useState<Tab>(tabFromHash() ?? (saved ? "studio" : "you"));
  const [outfit, setOutfit] = useState<Outfit>(() => local.get<Outfit | null>("outfit", null) ?? styleMe(saved ?? DEFAULT_PROFILE));
  const [faceImg, setFaceImg] = useState<string | null>(null);
  // The analysed photo lives in memory only; it is never stored or uploaded.
  const [scene, setScene] = useState<PhotoScene | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [auth, setAuth] = useState<null | "signin" | "register">(null);
  const [saveState, setSaveState] = useState("");
  const store: LookStore = user ? apiLooks : localLooks;
  const timer = useRef<number>();

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  };

  const setProfile = useCallback((p: Profile) => setProfileState(p), []);

  // Restore a session (full-stack build only).
  useEffect(() => {
    const onHash = () => {
      const t = tabFromHash();
      if (t) setTab(t);
    };
    window.addEventListener("hashchange", onHash);
    if (DEMO) localLooks.list().then(setLooks);
    else
      api
        .me()
        .then(async (r) => {
          setUser(r.user);
          if (r.profile) setProfileState(r.profile);
          setLooks(await apiLooks.list());
        })
        .catch(() => localLooks.list().then(setLooks));
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Persist the profile: browser for guests, server (debounced) when signed in.
  useEffect(() => {
    if (!user) {
      local.set("profile", profile);
      return;
    }
    setSaveState("Saving…");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      api
        .saveProfile(profile)
        .then(() => setSaveState("Saved to your account"))
        .catch(() => setSaveState("Couldn't save. Check your connection."));
    }, 700);
  }, [profile, user]);

  useEffect(() => local.set("outfit", outfit), [outfit]);

  async function handleAuth(mode: "signin" | "register", name: string, email: string, password: string) {
    const r = mode === "register" ? await api.register(name, email, password) : await api.login(email, password);
    const me = await api.me();
    if (mode === "register" || !me.profile) {
      await api.saveProfile(profile);
      for (const l of [...(await localLooks.list())].reverse()) await apiLooks.add(l.name, l.outfit, l.score);
    } else setProfileState(me.profile);
    setUser(r.user);
    setLooks(await apiLooks.list());
    setAuth(null);
  }

  async function backToGuest() {
    setUser(null);
    setSaveState("");
    setProfileState(loadLocalProfile() ?? DEFAULT_PROFILE);
    setLooks(await localLooks.list());
  }

  const lookNote = user
    ? "Saved to your account, so they're on every device."
    : DEMO
      ? "Saved in this browser."
      : "Saved in this browser. Create an account to keep them on every device.";

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <h1>Silhouette</h1>
          <p>Style studio</p>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="acct-area">
          {saveState && <span className="muted small" aria-live="polite">{saveState}</span>}
          {!DEMO &&
            (user ? (
              <AccountMenu user={user} onSignOut={async () => { await api.logout().catch(() => {}); await backToGuest(); }} onDelete={async () => { await api.deleteAccount(); await backToGuest(); }} />
            ) : (
              <>
                <button type="button" className="btn ghost small" onClick={() => setAuth("signin")}>
                  Sign in
                </button>
                <button type="button" className="btn small" onClick={() => setAuth("register")}>
                  Create account
                </button>
              </>
            ))}
        </div>
      </header>

      <main>
        {tab === "you" && <You profile={profile} setProfile={setProfile} faceImg={faceImg} setFaceImg={setFaceImg} onScene={setScene} onDone={() => go("studio")} />}
        {tab === "studio" && (
          <Studio
            profile={profile}
            outfit={outfit}
            setOutfit={setOutfit}
            faceImg={faceImg}
            scene={scene}
            onAddPhoto={() => go("you")}
            onSave={async (name) => setLooks(await store.add(name, outfit, scoreLook(profile, outfit).score))}
          />
        )}
        {tab === "guide" && <Guide profile={profile} faceImg={faceImg} />}
        {tab === "trends" && (
          <Trends
            profile={profile}
            onTry={(id) => {
              setOutfit(styleMe(profile, { trend: id }));
              go("studio");
            }}
          />
        )}
        {tab === "looks" && (
          <Looks
            profile={profile}
            looks={looks}
            faceImg={faceImg}
            note={lookNote}
            onOpen={(o) => {
              setOutfit(o);
              go("studio");
            }}
            onRename={async (id, name) => setLooks(await store.rename(id, name))}
            onDelete={async (id) => setLooks(await store.remove(id))}
          />
        )}
        {tab === "how" && <Research />}
      </main>

      <footer className="foot">
        Silhouette offers style ideas, not rules. Every body is a good body to dress. Your photo is analysed on your device and never uploaded.
      </footer>
      {!DEMO && <AuthDialog open={auth !== null} initialMode={auth ?? "signin"} onClose={() => setAuth(null)} onSubmit={handleAuth} />}
    </div>
  );
}
