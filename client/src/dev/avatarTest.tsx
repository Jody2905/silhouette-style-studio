import { CATALOG, DEFAULT_PROFILE, ProfileSchema, wear, type Outfit } from "@silhouette/engine";
import { createRoot } from "react-dom/client";
import { Avatar } from "../avatar/Avatar";
import "../styles.css";
const p = ProfileSchema.parse({ ...DEFAULT_PROFILE });
const base: Outfit = { top: wear("top-v-tee", "#efe3c8"), bottom: wear("bottom-wide-trousers", "#36393f"), shoes: wear("shoes-loafers") };
const ids = CATALOG.filter((i) => ["bag", "necklace", "scarf", "wrist"].includes(i.slot)).map((i) => i.id);
createRoot(document.getElementById("root")!).render(
  <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 4 }}>
    {ids.map((id) => <div key={id} style={{ fontSize: 11 }}>{id}<Avatar profile={p} outfit={{ ...base, [CATALOG.find((i) => i.id === id)!.slot]: wear(id) }} faceImg={null} /></div>)}
  </div>,
);
