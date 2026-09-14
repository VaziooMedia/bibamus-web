// ============================================================
// BibaPlay — la page d'accueil de la plateforme de jeux Bibamus.
// Predict (pronostics sportifs) est le premier jeu ; d'autres
// arriveront plus tard, chacun avec sa propre fiche ici.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";

export function BibaPlayHubScreen({ onBack, onSelectPredict }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 8px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Biba<span style={{ color: COLORS.amber }}>Play</span>
        </h1>
      </div>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px" }}>Jeux et défis autour d'un verre, entre amis.</p>

      <button
        onClick={onSelectPredict}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "12px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <NavIcon name="activity" size={24} color={COLORS.amber} />
        <div>
          <div style={{ fontSize: "14.5px", fontWeight: 700, color: COLORS.ink }}>Predict</div>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>Pronostics sportifs entre amis, sans argent réel</div>
        </div>
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "16px",
          opacity: 0.5,
        }}
      >
        <NavIcon name="activity" size={24} color={COLORS.inkSoft} />
        <div>
          <div style={{ fontSize: "14.5px", fontWeight: 700, color: COLORS.ink }}>D'autres jeux</div>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>Bientôt</div>
        </div>
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
