// On-device photo analysis with Google MediaPipe. The photo is processed in this browser tab and never uploaded.
import { faceRatiosFromLandmarks, type FaceRatios, type PhotoBody } from "@silhouette/engine";
import type { FaceLandmarker, ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";

const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
/** Splits a photo into background, hair, body skin, face skin, clothes and accessories. */
const SEGMENT_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

let models: Promise<{ face: FaceLandmarker; pose: PoseLandmarker; seg: ImageSegmenter | null }> | null = null;

function loadModels() {
  if (!models) {
    models = (async () => {
      const { FaceLandmarker, FilesetResolver, ImageSegmenter, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks(new URL("mediapipe/wasm", document.baseURI).href);
      const [face, pose] = await Promise.all([
        FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: "IMAGE", numFaces: 1 }),
        PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: POSE_MODEL }, runningMode: "IMAGE", numPoses: 1, outputSegmentationMasks: true }),
      ]);
      // The hair/clothes segmenter is optional: photo mode still works (without hair recolouring) if it fails.
      const seg = await ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: SEGMENT_MODEL },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      }).catch(() => null);
      return { face, pose, seg };
    })();
    models.catch(() => (models = null)); // allow a retry after a network error
  }
  return models;
}

/** Everything photo try-on needs, kept in memory for this session only. */
export interface PhotoScene {
  /** The photo, scaled down to at most 1100 px on the long side. */
  photo: HTMLCanvasElement;
  W: number;
  H: number;
  /** 478 face landmarks in photo pixels, or null. */
  face: { x: number; y: number }[] | null;
  /** 33 body landmarks in photo pixels with visibility, or null. */
  pose: { x: number; y: number; v: number }[] | null;
  /** Soft alpha masks at photo size. */
  person: HTMLCanvasElement | null;
  hair: HTMLCanvasElement | null;
  /** Grayscale "fold map" (shadows and creases) normalised so clothing colour can be multiplied with it. */
  shade: HTMLCanvasElement | null;
  hairShade: HTMLCanvasElement | null;
}

export interface PhotoAnalysis {
  faceRatios: FaceRatios | null;
  skinHex: string | null;
  /** A square crop of the face (data URL) for showing on the avatar. Kept in memory only. */
  faceCrop: string | null;
  photoBody: PhotoBody | null;
  notes: string[];
  scene: PhotoScene;
}

const canvasOf = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Builds a soft alpha mask at photo size from a low-resolution mask. */
function maskCanvas(mw: number, mh: number, W: number, H: number, alphaAt: (i: number) => number, blur = 2): HTMLCanvasElement {
  const small = canvasOf(mw, mh);
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(mw, mh);
  for (let i = 0; i < mw * mh; i++) {
    img.data[i * 4 + 3] = alphaAt(i);
  }
  sctx.putImageData(img, 0, 0);
  const out = canvasOf(W, H);
  const ctx = out.getContext("2d")!;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(small, 0, 0, W, H);
  return out;
}

/**
 * A "fold map": the photo's fine light and shadow (creases, folds, shading) with the underlying colour removed.
 * Each pixel's brightness is divided by the average brightness around it, so dark jeans and a light shirt both
 * come out near 1.0 and only their folds remain. Multiplying a new colour by this map gives it the real folds.
 * Outside the mask the map is white (no change).
 */
export function shadeMap(photo: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
  const { width: W, height: H } = photo;
  const gray = canvasOf(W, H);
  const gctx = gray.getContext("2d", { willReadFrequently: true })!;
  gctx.filter = "grayscale(1)";
  gctx.drawImage(photo, 0, 0);
  const soft = canvasOf(W, H);
  const sctx = soft.getContext("2d", { willReadFrequently: true })!;
  sctx.filter = `blur(${Math.max(6, Math.round(W / 45))}px)`;
  sctx.drawImage(gray, 0, 0);
  const lum = gctx.getImageData(0, 0, W, H).data;
  const avg = sctx.getImageData(0, 0, W, H).data;
  const m = mask.getContext("2d")!.getImageData(0, 0, W, H).data;
  const out = canvasOf(W, H);
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const a = m[i * 4 + 3] / 255;
    const ratio = (lum[i * 4] + 4) / (avg[i * 4] + 4);
    const v = Math.max(0.45, Math.min(1, 0.06 + ratio * 0.94));
    const g = Math.round(255 * (1 - a + a * v));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  const blurred = canvasOf(W, H);
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(0.8px)";
  bctx.drawImage(out, 0, 0);
  return blurred;
}

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Average colour of small patches on both cheeks, skipping the darkest and brightest pixels (shadows, glare). */
function sampleSkin(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], r: number): string | null {
  const px: [number, number, number][] = [];
  for (const p of pts) {
    const data = ctx.getImageData(Math.max(0, p.x - r), Math.max(0, p.y - r), r * 2, r * 2).data;
    for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!px.length) return null;
  px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const mid = px.slice(Math.floor(px.length * 0.2), Math.ceil(px.length * 0.8));
  const avg = mid.reduce((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0]).map((v) => v / mid.length);
  return toHex(avg[0], avg[1], avg[2]);
}

export async function analysePhoto(img: HTMLImageElement): Promise<PhotoAnalysis> {
  const { face, pose, seg } = await loadModels();
  const scale = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const notes: string[] = [];
  const scene: PhotoScene = { photo: canvas, W, H, face: null, pose: null, person: null, hair: null, shade: null, hairShade: null };
  const out: PhotoAnalysis = { faceRatios: null, skinHex: null, faceCrop: null, photoBody: null, notes, scene };

  /* ---------- face ---------- */
  const fr = face.detect(canvas);
  const lm = fr.faceLandmarks?.[0];
  if (lm) {
    const pts = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
    scene.face = pts;
    // Head tilt check: eyes should be roughly level for reliable widths.
    const tilt = Math.abs(Math.atan2(pts[263].y - pts[33].y, pts[263].x - pts[33].x)) * (180 / Math.PI);
    const yaw = Math.abs(pts[1].x - (pts[234].x + pts[454].x) / 2) / Math.abs(pts[454].x - pts[234].x);
    if (tilt > 12 || yaw > 0.12) notes.push("Your face is turned or tilted a little, so the face shape is a rough guess. A straight-on photo gives the best result.");
    out.faceRatios = faceRatiosFromLandmarks(pts);
    const faceW = Math.abs(pts[454].x - pts[234].x);
    out.skinHex = sampleSkin(ctx, [pts[50], pts[280], pts[101], pts[330]], Math.max(3, Math.round(faceW * 0.035)));
    // Crop around the face for the avatar.
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const fw = maxX - minX, fh = maxY - minY;
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = Math.round((240 * fh * 1.12) / fw);
    c.getContext("2d")!.drawImage(canvas, minX, minY - fh * 0.06, fw, fh * 1.12, 0, 0, c.width, c.height);
    out.faceCrop = c.toDataURL("image/jpeg", 0.85);
  } else {
    notes.push("No face was found. Use a well-lit, front-facing photo, or pick your face shape yourself.");
  }

  /* ---------- body ---------- */
  const pr = pose.detect(canvas);
  const pl = pr.landmarks?.[0];
  const mask = pr.segmentationMasks?.[0];
  if (pl) scene.pose = pl.map((p) => ({ x: p.x * W, y: p.y * H, v: p.visibility ?? 1 }));
  if (pl && mask) {
    const personF = mask.getAsFloat32Array();
    scene.person = maskCanvas(mask.width, mask.height, W, H, (i) => Math.round(Math.min(1, Math.max(0, personF[i])) * 255));
    const vis = (i: number) => (pl[i].visibility ?? 1) > 0.5;
    const mw = mask.width, mh = mask.height;
    const m = mask.getAsFloat32Array();
    const at = (x: number, y: number) => m[Math.min(mh - 1, Math.max(0, Math.round(y))) * mw + Math.min(mw - 1, Math.max(0, Math.round(x)))];
    const sx = mw, sy = mh; // landmarks are normalised, so scale to mask size
    if (vis(11) && vis(12) && vis(23) && vis(24)) {
      const shY = ((pl[11].y + pl[12].y) / 2) * sy;
      const hipY = ((pl[23].y + pl[24].y) / 2) * sy;
      const midX = ((pl[11].x + pl[12].x + pl[23].x + pl[24].x) / 4) * sx;
      // Width of the body region containing the centre line at a given row (stops at gaps, so arms held away are excluded).
      const widthAt = (y: number) => {
        if (at(midX, y) < 0.5) return 0;
        let l = midX, r = midX;
        while (l > 0 && at(l - 1, y) >= 0.5) l--;
        while (r < mw - 1 && at(r + 1, y) >= 0.5) r++;
        return r - l;
      };
      const span = hipY - shY;
      const shoulder = widthAt(shY + span * 0.08);
      let waist = Infinity;
      for (let t = 0.5; t <= 0.85; t += 0.03) waist = Math.min(waist, widthAt(shY + span * t));
      let hip = 0;
      for (let t = 1.0; t <= 1.35; t += 0.03) hip = Math.max(hip, widthAt(shY + span * t));
      const armsTouching = Math.abs(pl[15].x - pl[23].x) * sx < shoulder * 0.12 || Math.abs(pl[16].x - pl[24].x) * sx < shoulder * 0.12;
      if (armsTouching) notes.push("Your arms seem close to your body, which can widen the waist and hip readings. Hold them slightly out for best results.");
      let legRatio: number | null = null;
      if (vis(29) && vis(30)) {
        const heelY = ((pl[29].y + pl[30].y) / 2) * sy;
        let topY = pl[0].y * sy;
        while (topY > 0 && at(pl[0].x * sx, topY - 1) >= 0.5) topY--;
        legRatio = Math.min(0.65, Math.max(0.3, (heelY - hipY) / (heelY - topY)));
      } else notes.push("Your feet aren't in the photo, so leg length wasn't measured. A full-length photo adds proportion tips.");
      if (shoulder > 0 && hip > 0 && Number.isFinite(waist)) {
        out.photoBody = {
          shoulder: Math.min(2.5, Math.max(0.4, shoulder / hip)),
          waist: Math.min(2, Math.max(0.4, waist / hip)),
          hip: 1,
          legRatio,
        };
      }
    } else notes.push("Your shoulders and hips need to be visible to read body shape. Tape measurements give the most accurate result anyway.");
    mask.close();
  } else {
    notes.push("No full body was found in the photo. You can still enter measurements.");
  }
  /* ---------- hair & clothes segmentation (for realistic recolouring) ---------- */
  if (seg) {
    try {
      const sr = seg.segment(canvas);
      const cm = sr.categoryMask;
      if (cm) {
        const cats = cm.getAsUint8Array();
        if (cats.some((c) => c === 1)) scene.hair = maskCanvas(cm.width, cm.height, W, H, (i) => (cats[i] === 1 ? 255 : 0), 1.5);
        if (!scene.person) scene.person = maskCanvas(cm.width, cm.height, W, H, (i) => (cats[i] !== 0 ? 255 : 0));
        cm.close();
      }
      sr.close?.();
    } catch {
      /* optional */
    }
  }
  if (scene.person) scene.shade = shadeMap(canvas, scene.person);
  if (scene.hair) scene.hairShade = shadeMap(canvas, scene.hair);
  return out;
}
