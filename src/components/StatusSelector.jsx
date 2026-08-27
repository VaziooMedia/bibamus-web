import React from "react";

const STATES = [
  { key: "pending", label: "En attente", color: "#00C8FF" },
  { key: "reviewed", label: "Non certifié", color: "#FF3B4E" },
  { key: "certified", label: "Certifié", color: "#39FF66" },
];

export function StatusSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {STATES.map((s) => {
        const active = value === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              flex: 1,
              padding: "9px 8px",
              borderRadius: "8px",
              border: `2px solid ${active ? s.color : "#28405C"}`,
              background: active ? s.color : "none",
              color: active ? "#0D1B2A" : "#F2F2E8",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
