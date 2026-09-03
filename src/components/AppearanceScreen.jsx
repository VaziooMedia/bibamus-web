// ============================================================
// Écran "Apparence" — accessible depuis Paramètres. Suit les
// mêmes conventions que Notifications/Préférences : seuls les
// vrais ON/OFF restent en ligne, tout choix à options va sur sa
// propre page. Ici, les deux réglages n'ont qu'une seule option
// pour l'instant — grisés en attendant une vraie alternative.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";

function AppearanceGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>{children}</div>
    </div>
  );
}

function AppearanceRow({ icon, title, value, disabled, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "14px 4px",
        borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}`,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "14px" }}>{title}</span>
      {value && <span style={{ fontSize: "13px", color: COLORS.inkSoft, marginRight: "2px" }}>{value}</span>}
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </div>
  );
}

export function AppearanceScreen({ onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="brush" size={22} color={COLORS.amber} />}>Apparence</PageTitleWithBar>

      <AppearanceGroup title="Couleurs & style">
        <AppearanceRow icon={<NavIcon name="brush" size={17} color={COLORS.amber} />} title="Couleur d'accent" value="Vert fluo" disabled />
        <AppearanceRow icon={<NavIcon name="grid" size={17} color={COLORS.amber} />} title="Icône de l'app" value="Bibamus" disabled last />
      </AppearanceGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
