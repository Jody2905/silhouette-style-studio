# Silhouette — style studio

**Full app:** _add your Render link_ (accounts and saved looks)
**Guest demo:** https://jody2905.github.io/silhouette-style-studio/ (no sign-up; looks stay in your browser)

A dress-up game for adults that works out your best style. Add a photo, your height and (optionally) a few measurements; Silhouette reads your face shape, body proportions and colouring, then lets you dress an avatar shaped like you in clothes, hairstyles, makeup and this season's trends. Every look gets a score with a plain-English explanation of what works and what to try, each tagged by how strong the evidence is.

## Features

- **On-device photo analysis**: Google MediaPipe Face Landmarker and Pose Landmarker run in the browser to measure face proportions, sample skin tone, and read shoulder/waist/hip widths and leg length from the body outline. **The photo is never uploaded or stored**; only derived numbers are kept.
- **Body shape** from tape measurements using the published Female Figure Identification Technique (FFIT) formulas, with the plus-size "fuller middle" adjustment; photo estimate as a fallback.
- **Face shape** (oval, round, square, oblong, heart, diamond, triangle) from landmark ratios, overridable by the user.
- **Colour season** (spring/summer/autumn/winter) from undertone, depth and hair/eye contrast, with palettes, metals and lip shades; colours compared in CIELAB (ΔE).
- **Try looks on your own photo (free, on-device)**: clothes are cut to your real body outline from the photo (skin is filled in where a new neckline, sleeve or hem shows more than your original outfit) and take their folds and shadows from your photo, hair is recoloured inside a hair mask, and makeup, glasses, earrings, hats, beards and shoes are placed on your face and body landmarks. Hold a button to compare with the original. Once you add a photo, the studio and style guide show looks on your photo instead of the avatar; on photos, hair changes colour (hairstyle shapes need the avatar).
- **Dress-up studio**: an SVG avatar drawn to your proportions and skin tone (optionally with your own face, kept in memory only), 100+ pieces across 14 categories, recolouring with your best colours, neutrals and colours to avoid clearly marked, and prints (stripes, dots, check, floral).
- **Look scoring**: rules for body balance, proportion, face shape, colour near the face, makeup contrast, pattern mixing, personal style and trends, with capped categories so great looks have to get several things right. "Style me" builds a high-scoring look automatically.
- **Evidence labels**: every tip is marked *Research*, *Stylist tip* or *Myth busted* (e.g. horizontal stripes don't make you look wider — Thompson & Mikellidou 2011), linked to sources.
- **AW26 trends** from current runway reports, ranked by how easily they suit your shape, with "Try it on".
- **Personal style guide** and a shopping list in your colours.
- **Accounts and saved looks** (scores computed on the server), with data export and account deletion.

## Stack

| Layer | Tech |
|---|---|
| Style engine | Pure TypeScript package (`packages/engine`), Zod, Vitest |
| Computer vision | MediaPipe Tasks Vision (WebAssembly, in-browser) |
| API | Node + Express, PostgreSQL (Neon in production, PGlite locally), JWT in httpOnly cookies |
| Client | React 18 + Vite, hand-drawn SVG avatar |
| Tests | 29 engine unit tests, 7 API integration tests; `client/tryon-test.html` is a dev page that tests photo try-on with a synthetic photo |

## Run locally

Requires Node 22.13+.

```bash
npm install
npm run dev     # API on :3001, app on http://localhost:5173
npm test
```

No database setup needed locally: a built-in Postgres (PGlite) stores data in `server/silhouette-data`.

## Deploy for free (Render + Neon)

1. Create a free Neon project and copy its `postgresql://…?sslmode=require` connection string.
2. On Render choose **New → Blueprint**, pick this repo, and paste the string as `DATABASE_URL`.
3. For the guest demo, set **Settings → Pages → Source: GitHub Actions**; `.github/workflows/pages.yml` publishes it on every push.

## Security and privacy

- Photos are processed only in the browser; the API rejects large payloads and stores no images.
- bcrypt password hashing, httpOnly SameSite cookies, CSRF header check, Zod validation on every input, parameterised SQL, Helmet with a strict Content-Security-Policy (only Google's model store is allowed for AI model downloads), rate limiting.
- Saved-look scores are recomputed on the server so they can't be faked; users can export or delete all their data.

## Honest limits

Body-shape categories come from apparel research, but most "what flatters" advice and seasonal colour analysis are stylist conventions, not proven science, and the app says so. Camera readings depend on lighting, pose and clothing. The score is a guide for experimenting, not a judgement of anyone's body.

## Sources

See the **How it works** tab, or `packages/engine/src/sources.ts`.
