import { ITEM, PATTERNS, ProfileSchema, scoreLook, SLOTS } from "@silhouette/engine";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { checkPassword, DUMMY_HASH, hashPassword, makeAuth, type AuthedRequest } from "./auth";
import type { DB } from "./db";

export interface AppOptions {
  db: DB;
  jwtSecret: string;
  secureCookies?: boolean;
  /** Folder with the built React app; served when present. */
  clientDist?: string;
  /** Disable rate limits in tests. */
  rateLimit?: boolean;
}

const Email = z.string().trim().toLowerCase().email().max(254);
const RegisterBody = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: Email,
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});
const LoginBody = z.object({ email: Email, password: z.string().min(1).max(128) });
const Worn = z.object({
  id: z.string().refine((id) => id in ITEM, "Unknown item."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Colours must be hex like #aabbcc."),
  pattern: z.enum(PATTERNS),
});
const OutfitSchema = z.partialRecord(z.enum(SLOTS), Worn);
const LookBody = z.object({ name: z.string().trim().min(1, "Give the look a name.").max(60), outfit: OutfitSchema });
const RenameBody = z.object({ name: z.string().trim().min(1).max(60) });
const IdParam = z.coerce.number().int().positive();
const MAX_LOOKS = 200;

/** Wraps async handlers so thrown errors reach the error middleware. */
const h =
  (fn: (req: AuthedRequest, res: Response) => unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as AuthedRequest, res)).catch(next);

export function createApp(opts: AppOptions) {
  const { db } = opts;
  const auth = makeAuth(opts.jwtSecret, opts.secureCookies ?? false);
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          // MediaPipe runs WebAssembly from our own files; the AI models download from Google's model store.
          "script-src": ["'self'", "'wasm-unsafe-eval'"],
          "connect-src": ["'self'", "https://storage.googleapis.com"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:", "blob:"],
          "worker-src": ["'self'", "blob:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  // CSRF defence: state-changing API calls must carry a custom header. Browsers won't send it
  // cross-site without a CORS preflight, and this API never grants CORS.
  app.use("/api", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.get("X-Requested-With") !== "silhouette") {
      return res.status(403).json({ error: "Missing request header." });
    }
    next();
  });

  if (opts.rateLimit !== false) {
    app.use("/api/auth/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many attempts. Try again in 15 minutes." } }));
    app.use("/api/", rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
  }

  const q = {
    userByEmail: db.prepare<[string], { id: number; name: string; email: string; password_hash: string }>(
      "SELECT id, name, email, password_hash FROM users WHERE lower(email) = lower(?)",
    ),
    userById: db.prepare<[number], { id: number; name: string; email: string; created_at: string }>("SELECT id, name, email, created_at FROM users WHERE id = ?"),
    insertUser: db.prepare<[string, string, string], { id: number }>("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    profile: db.prepare<[number], { data: unknown; updated_at: string }>("SELECT data, updated_at FROM profiles WHERE user_id = ?"),
    upsertProfile: db.prepare(
      `INSERT INTO profiles (user_id, data) VALUES (?, ?::jsonb)
       ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
    ),
    looks: db.prepare<[number], { id: number; name: string; outfit: unknown; score: number; created_at: string }>(
      `SELECT id, name, outfit, score, created_at AS "createdAt" FROM looks WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    ),
    countLooks: db.prepare<[number], { n: number }>("SELECT COUNT(*)::int AS n FROM looks WHERE user_id = ?"),
    insertLook: db.prepare<[number, string, string, number], { id: number }>("INSERT INTO looks (user_id, name, outfit, score) VALUES (?, ?, ?::jsonb, ?) RETURNING id"),
    renameLook: db.prepare("UPDATE looks SET name = ? WHERE id = ? AND user_id = ?"),
    deleteLook: db.prepare("DELETE FROM looks WHERE id = ? AND user_id = ?"),
  };

  const getProfile = async (userId: number) => {
    const row = await q.profile.get(userId);
    if (!row) return null;
    const parsed = ProfileSchema.safeParse(typeof row.data === "string" ? JSON.parse(row.data) : row.data);
    return parsed.success ? parsed.data : null;
  };

  /* ---------------- auth ---------------- */
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.post(
    "/api/auth/register",
    h(async (req, res) => {
      const body = RegisterBody.parse(req.body);
      if (await q.userByEmail.get(body.email)) return res.status(409).json({ error: "An account with that email already exists. Sign in instead." });
      const row = await q.insertUser.get(body.name, body.email, await hashPassword(body.password));
      auth.issue(res, row!.id);
      res.status(201).json({ user: await q.userById.get(row!.id) });
    }),
  );

  app.post(
    "/api/auth/login",
    h(async (req, res) => {
      const body = LoginBody.parse(req.body);
      const user = await q.userByEmail.get(body.email);
      const ok = await checkPassword(body.password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) return res.status(401).json({ error: "Email or password is incorrect." });
      auth.issue(res, user.id);
      res.json({ user: await q.userById.get(user.id) });
    }),
  );

  app.post("/api/auth/logout", (_req, res) => {
    auth.clear(res);
    res.status(204).end();
  });

  app.get(
    "/api/auth/me",
    auth.requireUser,
    h(async (req, res) => {
      const user = await q.userById.get(req.userId!);
      if (!user) {
        auth.clear(res);
        return res.status(401).json({ error: "Sign in to continue." });
      }
      res.json({ user, profile: await getProfile(user.id) });
    }),
  );

  app.delete(
    "/api/account",
    auth.requireUser,
    h(async (req, res) => {
      await q.deleteUser.run(req.userId!); // cascades to profile and looks
      auth.clear(res);
      res.status(204).end();
    }),
  );

  /* ---------------- profile ---------------- */
  app.get(
    "/api/profile",
    auth.requireUser,
    h(async (req, res) => {
      const p = await getProfile(req.userId!);
      if (!p) return res.status(404).json({ error: "No profile saved yet." });
      res.json(p);
    }),
  );

  app.put(
    "/api/profile",
    auth.requireUser,
    h(async (req, res) => {
      const profile = ProfileSchema.parse(req.body);
      await q.upsertProfile.run(req.userId!, JSON.stringify(profile));
      res.json(profile);
    }),
  );

  /* ---------------- saved looks ---------------- */
  app.get("/api/looks", auth.requireUser, h(async (req, res) => res.json(await q.looks.all(req.userId!))));

  app.post(
    "/api/looks",
    auth.requireUser,
    h(async (req, res) => {
      const me = req.userId!;
      const body = LookBody.parse(req.body);
      if (((await q.countLooks.get(me))?.n ?? 0) >= MAX_LOOKS) return res.status(429).json({ error: `You can save up to ${MAX_LOOKS} looks. Delete some first.` });
      const profile = await getProfile(me);
      if (!profile) return res.status(400).json({ error: "Save your profile before saving looks." });
      // The score is worked out on the server so it can't be faked.
      const score = scoreLook(profile, body.outfit).score;
      await q.insertLook.get(me, body.name, JSON.stringify(body.outfit), score);
      res.status(201).json(await q.looks.all(me));
    }),
  );

  app.patch(
    "/api/looks/:id",
    auth.requireUser,
    h(async (req, res) => {
      const { name } = RenameBody.parse(req.body);
      const info = await q.renameLook.run(name, IdParam.parse(req.params.id), req.userId!);
      if (!info.changes) return res.status(404).json({ error: "Look not found." });
      res.json(await q.looks.all(req.userId!));
    }),
  );

  app.delete(
    "/api/looks/:id",
    auth.requireUser,
    h(async (req, res) => {
      await q.deleteLook.run(IdParam.parse(req.params.id), req.userId!);
      res.json(await q.looks.all(req.userId!));
    }),
  );

  /** Lets users download everything stored about them. */
  app.get(
    "/api/export",
    auth.requireUser,
    h(async (req, res) => {
      const id = req.userId!;
      res.setHeader("Content-Disposition", 'attachment; filename="silhouette-data.json"');
      res.json({ user: await q.userById.get(id), profile: await getProfile(id), looks: await q.looks.all(id) });
    }),
  );

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

  /* ---------------- static client ---------------- */
  if (opts.clientDist && fs.existsSync(path.join(opts.clientDist, "index.html"))) {
    app.use(express.static(opts.clientDist, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(opts.clientDist!, "index.html")));
  }

  /* ---------------- errors ---------------- */
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return res.status(400).json({ error: first?.message ?? "Invalid input.", field: first?.path.join(".") });
    }
    if (err instanceof SyntaxError) return res.status(400).json({ error: "Request body isn't valid JSON." });
    if ((err as { code?: string }).code === "23505") return res.status(409).json({ error: "That already exists." });
    if ((err as { type?: string }).type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on our side. Try again." });
  });

  return app;
}
