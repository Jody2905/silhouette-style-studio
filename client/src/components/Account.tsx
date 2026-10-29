import { useEffect, useRef, useState } from "react";
import { ApiError, type User } from "../api";

export function AuthDialog({
  open,
  initialMode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialMode: "signin" | "register";
  onClose: () => void;
  onSubmit: (mode: "signin" | "register", name: string, email: string, password: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setMode(initialMode);
      setError(null);
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    } else if (!open && d.open) d.close();
  }, [open, initialMode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(mode, name, email, password);
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="auth-t" className="auth">
      <form onSubmit={submit}>
        <h4 id="auth-t">{mode === "signin" ? "Sign in" : "Create your account"}</h4>
        <p className="muted small">
          {mode === "register" ? "Save your looks and profile on any device. Your current profile and saved looks come with you." : "Welcome back."}
        </p>
        {mode === "register" && (
          <div className="f">
            <label htmlFor="a-name">Name</label>
            <input id="a-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
        )}
        <div className="f">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="f">
          <label htmlFor="a-pw">Password</label>
          <input
            id="a-pw"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "register" && <span className="muted small">At least 8 characters.</span>}
        </div>
        {error && (
          <p className="ferr" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="small">
          {mode === "signin" ? "New to Stride? " : "Already have an account? "}
          <button type="button" className="link" onClick={() => setMode(mode === "signin" ? "register" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </form>
    </dialog>
  );
}

export function AccountMenu({ user, onSignOut, onDelete }: { user: User; onSignOut: () => void; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="acct" ref={ref}>
      <button type="button" className="btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {user.name} ▾
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="muted small menu-who">{user.email}</div>
          <a role="menuitem" href="/api/export">
            Download my data
          </a>
          <button type="button" role="menuitem" onClick={onSignOut}>
            Sign out
          </button>
          {confirm ? (
            <div className="confirm">
              <p className="small">Delete your account, profile and all logs? This can't be undone.</p>
              <div className="row">
                <button type="button" className="btn danger" onClick={onDelete}>
                  Delete everything
                </button>
                <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <button type="button" role="menuitem" className="danger-text" onClick={() => setConfirm(true)}>
              Delete account…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
