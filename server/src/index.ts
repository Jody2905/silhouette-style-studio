import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { openDb } from "./db";

const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

let secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  if (isProd) {
    console.error("JWT_SECRET must be set to at least 32 characters in production.");
    process.exit(1);
  }
  secret = crypto.randomBytes(32).toString("hex");
  console.warn("JWT_SECRET not set: using a random dev secret (sessions reset on restart).");
}

// Production needs a hosted Postgres: free hosts like Render wipe local files on restart.
const databaseUrl = process.env.DATABASE_URL;
if (isProd && !databaseUrl) {
  console.error("DATABASE_URL must be set in production (a postgres:// connection string, e.g. from Neon).");
  process.exit(1);
}
const db = await openDb(databaseUrl ?? process.env.DB_PATH ?? path.resolve(here, "../silhouette-data"));
console.log(databaseUrl ? "Using hosted Postgres from DATABASE_URL." : "Using the local built-in database (PGlite).");
const app = createApp({
  db,
  jwtSecret: secret,
  secureCookies: isProd,
  clientDist: path.resolve(here, "../../client/dist"),
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Silhouette listening on http://localhost:${port}`));
