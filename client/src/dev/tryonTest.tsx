// Dev-only harness: renders PhotoTryOn on a synthetic photo with hand-placed landmarks (no AI models needed).
import { DEFAULT_PROFILE, ProfileSchema, wear, type Outfit } from "@silhouette/engine";
import { createRoot } from "react-dom/client";
import { PhotoTryOn, figureFromScene } from "../photo/PhotoTryOn";
import "../styles.css";
import { shadeMap, type PhotoScene } from "../vision/analyse";

const W = 600, H = 1000;
const cv = (w = W, h = H) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const photo = cv();
const g = photo.getContext("2d")!;
const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#d9d4cc"); bg.addColorStop(1, "#bfb8ae");
g.fillStyle = bg; g.fillRect(0, 0, W, H);
const skin = "#b07850";
// body silhouette: head, neck, torso in a grey tee, jeans legs, arms slightly out
const person = new Path2D();
person.ellipse(300, 140, 62, 80, 0, 0, Math.PI * 2);
person.rect(275, 200, 50, 50);
const torso = new Path2D("M205,250 Q300,235 395,250 L405,330 L380,430 L395,520 L205,520 L220,430 L195,330 Z");
const legs = new Path2D("M210,515 L295,515 L290,930 L245,930 Z M305,515 L390,515 L355,930 L310,930 Z");
const arms = new Path2D("M205,255 L160,400 L150,520 L172,522 L190,405 L222,300 Z M395,255 L440,400 L450,520 L428,522 L410,405 L378,300 Z");
g.fillStyle = skin; g.fill(person); g.fill(arms);
g.fillStyle = "#808890"; g.fill(torso);
g.fillStyle = "#33496b"; g.fill(legs);
// fake folds
g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 6;
for (const [x1, y1, x2, y2] of [[240, 300, 300, 360], [360, 310, 320, 400], [250, 600, 270, 700], [330, 620, 320, 760]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
g.fillStyle = "#2a1b14"; g.beginPath(); g.ellipse(300, 85, 70, 45, 0, Math.PI, 0); g.fill(); g.fillRect(232, 85, 22, 110); g.fillRect(346, 85, 22, 110);
// shoes
g.fillStyle = "#eee"; g.beginPath(); g.ellipse(265, 940, 34, 14, 0, 0, 7); g.ellipse(335, 940, 34, 14, 0, 0, 7); g.fill();

const personMask = cv(); const pm = personMask.getContext("2d")!; pm.fillStyle = "#000";
pm.fill(person); pm.fill(torso); pm.fill(legs); pm.fill(arms); pm.beginPath(); pm.ellipse(265, 940, 34, 14, 0, 0, 7); pm.ellipse(335, 940, 34, 14, 0, 0, 7); pm.fill();
const hairMask = cv(); const hm = hairMask.getContext("2d")!; hm.fillStyle = "#000"; hm.beginPath(); hm.ellipse(300, 85, 70, 45, 0, Math.PI, 0); hm.fill(); hm.fillRect(232, 85, 22, 110); hm.fillRect(346, 85, 22, 110);
const shadeOf = (mask: HTMLCanvasElement) => {
  const s = cv(); const sg = s.getContext("2d")!; sg.fillStyle = "#fff"; sg.fillRect(0, 0, W, H);
  const tmp = cv(); const tg = tmp.getContext("2d")!; tg.drawImage(photo, 0, 0); tg.globalCompositeOperation = "destination-in"; tg.drawImage(mask, 0, 0);
  sg.filter = "grayscale(1) brightness(1.6)"; sg.drawImage(tmp, 0, 0); return s;
};

// 478 face points around an ellipse (enough for the indices used)
const face = Array.from({ length: 478 }, () => ({ x: 300, y: 150 }));
const set = (i: number, x: number, y: number) => (face[i] = { x, y });
set(10, 300, 62); set(152, 300, 218); set(234, 240, 140); set(454, 360, 140); set(50, 265, 165); set(280, 335, 165); set(2, 300, 172); set(17, 300, 200); set(168, 300, 128); set(468, 278, 135); set(473, 322, 135);
[61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185].forEach((i, n, a) => { const t = (n / a.length) * Math.PI * 2; set(i, 300 + Math.cos(t) * 20, 192 + Math.sin(t) * 8); });
[78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191].forEach((i, n, a) => { const t = (n / a.length) * Math.PI * 2; set(i, 300 + Math.cos(t) * 13, 192 + Math.sin(t) * 2); });
[33, 246, 161, 160, 159, 158, 157, 173, 133].forEach((i, n) => set(i, 266 + n * 3.2, 135 - Math.sin((n / 8) * Math.PI) * 5));
[263, 466, 388, 387, 386, 385, 384, 398, 362].forEach((i, n) => set(i, 334 - n * 3.2, 135 - Math.sin((n / 8) * Math.PI) * 5));
[234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454].forEach((i, n, a) => { const t = Math.PI - (n / (a.length - 1)) * Math.PI; set(i, 300 + Math.cos(t) * 60, 140 + Math.sin(t) * 78); });
g.fillStyle = "#3a2a22"; for (const i of [468, 473]) { g.beginPath(); g.arc(face[i].x, face[i].y, 6, 0, 7); g.fill(); }
g.fillStyle = "#8a4a3a"; g.beginPath(); g.ellipse(300, 192, 18, 6, 0, 0, 7); g.fill();

const pose = Array.from({ length: 33 }, () => ({ x: 300, y: 500, v: 0 }));
const P = (i: number, x: number, y: number) => (pose[i] = { x, y, v: 0.99 });
P(0, 300, 160); P(11, 225, 258); P(12, 375, 258); P(13, 182, 400); P(14, 418, 400); P(15, 160, 515); P(16, 440, 515);
P(23, 255, 500); P(24, 345, 500); P(25, 268, 720); P(26, 332, 720); P(27, 268, 920); P(28, 332, 920); P(29, 260, 945); P(30, 340, 945); P(31, 290, 950); P(32, 310, 950);

const scene: PhotoScene = { photo, W, H, face, pose, person: personMask, hair: hairMask, shade: shadeMap(photo, personMask), hairShade: shadeMap(photo, hairMask) };
const profile = ProfileSchema.parse({ ...DEFAULT_PROFILE, hairColor: "dark-brown" });
const looks: [string, Outfit][] = [
  ["original", {}],
  ["wrap dress + makeup", { dress: wear("dress-wrap", "#b6406a", "dots"), lips: wear("lips-red"), eyes: wear("eyes-winged"), blush: wear("blush-apples"), hair: wear("hair-lob", "#a2462a"), shoes: wear("shoes-pumps"), earrings: wear("ear-hoops") }],
  ["blazer + wide trousers", { top: wear("top-turtleneck", "#efe3c8"), bottom: wear("bottom-wide-trousers", "#c19a6b"), outer: wear("outer-blazer", "#1b2a4a"), shoes: wear("shoes-loafers"), glasses: wear("glasses-square"), hair: wear("hair-bob", "#d4b06a") }],
  ["menswear", { top: wear("top-shirt", "#9bb8d8", "check"), bottom: wear("bottom-chinos"), beard: wear("beard-boxed"), hat: wear("hat-cap"), shoes: wear("shoes-sneakers"), belt: wear("belt-waist") }],
];
createRoot(document.getElementById("root")!).render(
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 8 }}>
    {looks.map(([name, o]) => <div key={name}><b>{name}</b><PhotoTryOn scene={scene} profile={profile} outfit={o} /></div>)}
  </div>,
);


