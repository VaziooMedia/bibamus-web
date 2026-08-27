import React, { useState } from "react";

// Chaque sous-titre (Composition, Fabrication, Profil gustatif...) peut se replier
// indépendamment des autres, pour ne montrer que ce qu'on veut consulter ou remplir.
export function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: "6px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
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
        <span style={{ color: "#39FF66", fontSize: "12px" }}>{open ? "▼" : "▶"}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
