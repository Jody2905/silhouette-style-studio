import { SOURCES, type Evidence } from "@silhouette/engine";
import type { ReactNode } from "react";

const EVIDENCE_LABEL: Record<Evidence, string> = { research: "Research", stylist: "Stylist tip", myth: "Myth busted" };

export function EvidenceBadge({ evidence, source }: { evidence: Evidence; source?: string }) {
  const src = source ? SOURCES.find((s) => s.key === source) : undefined;
  const badge = <span className={`ev ev-${evidence}`}>{EVIDENCE_LABEL[evidence]}</span>;
  return src ? (
    <a href={src.url} target="_blank" rel="noopener noreferrer" title={src.title} className="ev-link">
      {badge}
    </a>
  ) : (
    badge
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
  swatches,
  multi,
  max,
  name,
}: {
  options: readonly T[];
  value: T | T[];
  onChange: (v: any) => void;
  labels?: Partial<Record<T, string>>;
  swatches?: Partial<Record<T, string>>;
  multi?: boolean;
  max?: number;
  name: string;
}) {
  const selected = (o: T) => (Array.isArray(value) ? value.includes(o) : value === o);
  const toggle = (o: T) => {
    if (!multi) return onChange(o);
    const arr = value as T[];
    if (arr.includes(o)) onChange(arr.filter((x) => x !== o));
    else if (!max || arr.length < max) onChange([...arr, o]);
  };
  return (
    <div className="chips" role={multi ? "group" : "radiogroup"} aria-label={name}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role={multi ? undefined : "radio"}
          aria-checked={multi ? undefined : selected(o)}
          aria-pressed={multi ? selected(o) : undefined}
          className={`chip${selected(o) ? " on" : ""}`}
          onClick={() => toggle(o)}
        >
          {swatches?.[o] && <span className="dot" style={{ background: swatches[o] }} />}
          {labels?.[o] ?? o.replace(/-/g, " ")}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, sub, children, aside }: { title: string; sub?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {sub && <p className="muted">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Swatch({ hex, name, onClick, active, variant }: { hex: string; name: string; onClick?: () => void; active?: boolean; variant?: "best" | "neutral" | "avoid" }) {
  const inner = (
    <>
      <span className={`sw${variant ? ` sw-${variant}` : ""}`} style={{ background: hex }}>
        {variant === "best" && <span className="sw-badge" aria-hidden>★</span>}
        {variant === "avoid" && <span className="sw-slash" aria-hidden />}
      </span>
      <span className="sw-name">{name}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={`swatch${active ? " on" : ""}`} onClick={onClick} aria-pressed={active} title={variant === "best" ? `${name}: one of your best colours` : variant === "avoid" ? `${name}: keep away from your face` : name}>
      {inner}
    </button>
  ) : (
    <div className="swatch" title={variant === "best" ? `${name}: one of your best colours` : variant === "avoid" ? `${name}: keep away from your face` : name}>{inner}</div>
  );
}
