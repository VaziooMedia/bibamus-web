import React from "react";

// value: 1 à 5, ou null (non renseigné) — cliquer sur la valeur déjà sélectionnée la retire.
export function TasteScale({ label, value, onChange, lowLabel, highLabel }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <span style={{ fontSize: "12.5px", color: "#8792A6", fontWeight: 600 }}>{label}</span>
        {(lowLabel || highLabel) && (
          <span style={{ fontSize: "10.5px", color: "#8792A6" }}>
            {lowLabel} → {highLabel}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: "6px",
              border: `2px solid ${value === n ? "#39FF66" : "#28405C"}`,
              background: value === n ? "#39FF66" : "none",
              color: value === n ? "#0D1B2A" : "#F2F2E8",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
