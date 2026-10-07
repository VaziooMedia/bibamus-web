import React, { useState } from "react";

// Flèche vert fluo, la même ouverte (▼) et repliée (▶) : un dessin, pas un caractère (« ▶ » s'affiche en émoji sur certains téléphones).
function Chevron({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" data-chevron={open ? "open" : "closed"} style={{ flexShrink: 0, transform: open ? "none" : "rotate(-90deg)" }}>
      <path d="M1.5 3.5h9L6 9z" fill="#39FF66" />
    </svg>
  );
}

// Chaque sous-titre (Composition, Fabrication, Profil gustatif...) peut se replier
// indépendamment des autres, pour ne montrer que ce qu'on veut consulter ou remplir.
export function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: "6px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 0",
          marginBottom: open ? "10px" : 0,
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F2F2E8", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "4px", height: "14px", background: "#39FF66", borderRadius: "2px", display: "inline-block" }} />
          {title}
        </span>
        <Chevron open={open} />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
