import React from "react";

export function ComingSoon({ title }) {
  return (
    <div>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", marginBottom: "16px" }}>{title}</h1>
      <div style={{ background: "#16273D", borderRadius: "12px", padding: "24px", color: "#8792A6", fontSize: "14px" }}>
        Cette section n'est pas encore construite — on posera le contenu ici prochainement.
      </div>
    </div>
  );
}
