import { DEFAULT_PROFILE, wear } from "@silhouette/engine";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { openDb } from "../src/db";

const H = { "X-Requested-With": "silhouette" };
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  app = createApp({ db: await openDb(":memory:"), jwtSecret: "x".repeat(40), rateLimit: false });
});

async function signedIn(email = "jo@example.com") {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/register").set(H).send({ name: "Jo", email, password: "correct horse" });
  expect(r.status).toBe(201);
  return agent;
}

const look = { top: wear("top-boat"), bottom: wear("bottom-wide-trousers"), shoes: wear("shoes-loafers") };

describe("auth", () => {
  it("registers with an httpOnly cookie and hides the hash", async () => {
    const r = await request(app).post("/api/auth/register").set(H).send({ name: "Jo", email: "Jo@Example.com", password: "correct horse" });
    expect(r.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    expect(JSON.stringify(r.body)).not.toMatch(/hash|password/i);
  });

  it("uses one error for wrong password and unknown email", async () => {
    await signedIn();
    const a = await request(app).post("/api/auth/login").set(H).send({ email: "jo@example.com", password: "nope nope" });
    const b = await request(app).post("/api/auth/login").set(H).send({ email: "x@example.com", password: "nope nope" });
    expect(a.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("blocks requests without the CSRF header or a session", async () => {
    expect((await request(app).post("/api/auth/register").send({ name: "Jo", email: "a@b.com", password: "12345678" })).status).toBe(403);
    expect((await request(app).get("/api/looks")).status).toBe(401);
  });
});

describe("profile and looks", () => {
  it("saves a profile and scores looks on the server", async () => {
    const jo = await signedIn();
    expect((await jo.post("/api/looks").set(H).send({ name: "Brunch", outfit: look })).status).toBe(400);
    expect((await jo.put("/api/profile").set(H).send({ ...DEFAULT_PROFILE, faceShape: "heart" })).status).toBe(200);
    const r = await jo.post("/api/looks").set(H).send({ name: "Brunch", outfit: look });
    expect(r.status).toBe(201);
    expect(r.body[0].score).toBeGreaterThan(0);
    expect(r.body[0].outfit.top.id).toBe("top-boat");
  });

  it("rejects unknown items, bad colours and photo data", async () => {
    const jo = await signedIn();
    await jo.put("/api/profile").set(H).send(DEFAULT_PROFILE);
    expect((await jo.post("/api/looks").set(H).send({ name: "x", outfit: { top: { id: "nope", color: "#ffffff", pattern: "solid" } } })).status).toBe(400);
    expect((await jo.post("/api/looks").set(H).send({ name: "x", outfit: { top: { id: "top-tee", color: "red", pattern: "solid" } } })).status).toBe(400);
    const big = await jo.put("/api/profile").set(H).send({ ...DEFAULT_PROFILE, photo: "data:image/jpeg;base64," + "A".repeat(60_000) });
    expect(big.status).toBe(413);
  });

  it("keeps looks private to their owner", async () => {
    const jo = await signedIn("jo@example.com");
    const sam = await signedIn("sam@example.com");
    await jo.put("/api/profile").set(H).send(DEFAULT_PROFILE);
    const saved = await jo.post("/api/looks").set(H).send({ name: "Mine", outfit: look });
    const id = saved.body[0].id;
    expect((await sam.get("/api/looks")).body).toEqual([]);
    expect((await sam.patch(`/api/looks/${id}`).set(H).send({ name: "Stolen" })).status).toBe(404);
    await sam.delete(`/api/looks/${id}`).set(H);
    expect((await jo.get("/api/looks")).body).toHaveLength(1);
  });

  it("renames, deletes and wipes everything with the account", async () => {
    const jo = await signedIn();
    await jo.put("/api/profile").set(H).send(DEFAULT_PROFILE);
    const id = (await jo.post("/api/looks").set(H).send({ name: "A", outfit: look })).body[0].id;
    expect((await jo.patch(`/api/looks/${id}`).set(H).send({ name: "B" })).body[0].name).toBe("B");
    expect((await jo.delete("/api/account").set(H)).status).toBe(204);
    expect((await jo.get("/api/looks")).status).toBe(401);
  });
});

describe("AI try-on", () => {
  const photo = "data:image/jpeg;base64," + Buffer.from("fake-jpeg").toString("base64");

  it("is off without a key, and needs a session", async () => {
    expect((await request(app).post("/api/tryon").set(H).send({ photo, outfit: look })).status).toBe(401);
    const agent = await signedIn();
    expect((await agent.get("/api/tryon").set(H)).body.enabled).toBe(false);
    expect((await agent.post("/api/tryon").set(H).send({ photo, outfit: look })).status).toBe(503);
  });

  it("sends the photo and a description of the look, and enforces the daily limit", async () => {
    const calls: { prompt: string; mime: string }[] = [];
    app = createApp({
      db: await openDb(":memory:"),
      jwtSecret: "x".repeat(40),
      rateLimit: false,
      tryOnLimits: { perUser: 2, global: 10 },
      tryOn: async (p, prompt) => {
        calls.push({ prompt, mime: p.mimeType });
        return { mimeType: "image/png", data: "AAAA" };
      },
    });
    const agent = await signedIn();
    const r = await agent.post("/api/tryon").set(H).send({ photo, outfit: look });
    expect(r.status).toBe(200);
    expect(r.body.image).toBe("data:image/png;base64,AAAA");
    expect(calls[0].mime).toBe("image/jpeg");
    expect(calls[0].prompt).toMatch(/boat-neck top/);
    expect(calls[0].prompt).toMatch(/identical face/);
    expect((await agent.post("/api/tryon").set(H).send({ photo: "data:text/html;base64,AAAA", outfit: look })).status).toBe(400);
    expect((await agent.post("/api/tryon").set(H).send({ photo, outfit: {} })).status).toBe(400);
    await agent.post("/api/tryon").set(H).send({ photo, outfit: look });
    expect((await agent.get("/api/tryon").set(H)).body.remaining).toBe(0);
    const limited = await agent.post("/api/tryon").set(H).send({ photo, outfit: look });
    expect(limited.status).toBe(429);
    expect(calls).toHaveLength(2);
  });

  it("parses Gemini responses and explains refusals", async () => {
    const { geminiTryOn } = await import("../src/tryon");
    const fake = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    const ok = geminiTryOn("k", "m", fake({ candidates: [{ content: { parts: [{ text: "hi" }, { inlineData: { mimeType: "image/png", data: "QQ==" } }] } }] }));
    expect(await ok({ mimeType: "image/jpeg", data: "x" }, "p")).toEqual({ mimeType: "image/png", data: "QQ==" });
    const blocked = geminiTryOn("k", "m", fake({ promptFeedback: { blockReason: "SAFETY" } }));
    await expect(blocked({ mimeType: "image/jpeg", data: "x" }, "p")).rejects.toThrow(/declined/);
    const bad = geminiTryOn("k", "m", fake({ error: { message: "API key not valid" } }, 400));
    await expect(bad({ mimeType: "image/jpeg", data: "x" }, "p")).rejects.toThrow(/API key/);
  });
});
