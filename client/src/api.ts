import type { Outfit, Profile } from "@silhouette/engine";

/** Demo builds have no backend: everything is stored in the browser. */
export const DEMO = import.meta.env.MODE === "demo";

export interface User {
  id: number;
  name: string;
  email: string;
}
export interface SavedLook {
  id: number;
  name: string;
  outfit: Outfit;
  score: number;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "silhouette" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Request failed.");
  return data as T;
}

export interface TryOnStatus {
  enabled: boolean;
  remaining: number;
  perDay: number;
}

export const api = {
  tryOnStatus: () => call<TryOnStatus>("GET", "/api/tryon"),
  tryOn: (photo: string, outfit: Outfit) => call<{ image: string }>("POST", "/api/tryon", { photo, outfit }),
  me: () => call<{ user: User; profile: Profile | null }>("GET", "/api/auth/me"),
  register: (name: string, email: string, password: string) => call<{ user: User }>("POST", "/api/auth/register", { name, email, password }),
  login: (email: string, password: string) => call<{ user: User }>("POST", "/api/auth/login", { email, password }),
  logout: () => call<void>("POST", "/api/auth/logout"),
  deleteAccount: () => call<void>("DELETE", "/api/account"),
  saveProfile: (p: Profile) => call<Profile>("PUT", "/api/profile", p),
};

export const local = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`silhouette.${key}`);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`silhouette.${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  },
};

/** Saved looks: on the server when signed in, in this browser otherwise. */
export interface LookStore {
  list(): Promise<SavedLook[]>;
  add(name: string, outfit: Outfit, score: number): Promise<SavedLook[]>;
  rename(id: number, name: string): Promise<SavedLook[]>;
  remove(id: number): Promise<SavedLook[]>;
}

export const apiLooks: LookStore = {
  list: () => call("GET", "/api/looks"),
  add: (name, outfit) => call("POST", "/api/looks", { name, outfit }),
  rename: (id, name) => call("PATCH", `/api/looks/${id}`, { name }),
  remove: (id) => call("DELETE", `/api/looks/${id}`),
};

export const localLooks: LookStore = {
  list: async () => local.get<SavedLook[]>("looks", []),
  add: async (name, outfit, score) => {
    const list = local.get<SavedLook[]>("looks", []);
    const id = Math.max(0, ...list.map((l) => l.id)) + 1;
    const next = [{ id, name, outfit, score, createdAt: new Date().toISOString() }, ...list].slice(0, 200);
    local.set("looks", next);
    return next;
  },
  rename: async (id, name) => {
    const next = local.get<SavedLook[]>("looks", []).map((l) => (l.id === id ? { ...l, name } : l));
    local.set("looks", next);
    return next;
  },
  remove: async (id) => {
    const next = local.get<SavedLook[]>("looks", []).filter((l) => l.id !== id);
    local.set("looks", next);
    return next;
  },
};
