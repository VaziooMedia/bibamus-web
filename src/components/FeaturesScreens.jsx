// ============================================================
// Paramètres > Fonctionnalités (Mehdi, 2026-11-19) : une ligne par fonctionnalité de l'app qui a ses propres réglages, chacune ouvrant sa page.
// Pour l'instant une seule : « BibaClubs » (ce que mes Bibax voient de mes clubs). Mêmes lignes que « Sécurité & confidentialité » (`SecurityRow`).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";
import { SecurityRow } from "./SecurityScreen.jsx";

export function FeaturesScreen({ onBack, goToSubScreen }) {
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="grid" size={22} color={COLORS.amber} />}>Fonctionnalités</PageTitleWithBar>
      <div style={{ margin: "0 -20px 22px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
        <div style={{ borderBottom: "none" }}>
          <SecurityRow icon={<NavIcon name="crown" size={17} color={COLORS.amber} />} title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Clubs</span></>} subtitle="Ce que tes Bibax voient de tes clubs" onClick={() => goToSubScreen("clubs")} />
        </div>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// « BibaClubs » : l'interrupteur « BibaClub publics » (`profiles.share_clubs`, actif par défaut comme les réglages de « Mes statistiques » : c'est à la personne de faire la démarche de masquer).
// Coupé, ses Bibax ne voient plus la liste de ses clubs sur sa fiche (« <prénom> ne partage pas ses BibaClub »). Un club privé n'est jamais visible, quel que soit ce réglage.
export function FeaturesClubsScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };
  const isOn = p.shareClubs !== false;
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="crown" size={22} color={COLORS.amber} />}>
        <span style={{ color: COLORS.ink }}>Biba</span>
        <span style={{ color: COLORS.amber }}>Clubs</span>
      </PageTitleWithBar>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>Choisis ce que tes Bibax peuvent voir de tes BibaClub.</p>
      <div style={{ margin: "0 -20px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
        <div style={{ padding: "14px", borderBottom: `1px solid ${COLORS.paperAlt}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px" }}>BibaClub publics</span>
          </div>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "8px", marginLeft: "12px" }}>
            La liste de tes BibaClub publics (nom, catégorie, nombre de membres et ton rôle), que tes Bibax ouvrent depuis le bloc « BibaClub » de ton profil. Un club privé reste toujours invisible.
          </div>
          <div style={{ marginLeft: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => update({ shareClubs: !isOn })}
              aria-pressed={isOn}
              aria-label="BibaClub publics visibles par mes Bibax"
              style={{ width: "42px", height: "24px", borderRadius: "999px", border: "none", background: isOn ? COLORS.amber : COLORS.paperAlt, position: "relative", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <span style={{ position: "absolute", top: "3px", left: isOn ? "21px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </button>
            <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Visible par mes Bibax</span>
          </div>
        </div>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
