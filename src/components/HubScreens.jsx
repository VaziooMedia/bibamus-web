// ============================================================
// Écrans "hub" — BibaGo, BibAtlas, et l'écran générique
// "Bientôt disponible" utilisé pour les fonctions verrouillées.
// Copiés tels quels depuis le prototype Claude.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ActionCard } from "./ui.jsx";

export function SessionHubScreen({ onBack, goToNewSalon, goToJoinSalon, goToBibArena }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <NavIcon name="bibago-nav" size={28} color={COLORS.amber} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: 0, lineHeight: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Go</span>
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "16px" }}>
              <span style={{ color: COLORS.ink }}>Biba</span>
              <span style={{ color: COLORS.amber }}>Room</span>
            </span>
          </div>
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 12px 0" }}>Événement partagé, suivi des tournées entre amis</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={goToNewSalon} style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}>
              Créer
            </button>
            <button onClick={goToJoinSalon} style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}>
              Rejoindre
            </button>
          </div>
        </div>

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: COLORS.redFluo,
              background: COLORS.paperAlt,
              borderRadius: "999px",
              padding: "3px 8px",
            }}
          >
            Soon
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "16px" }}>
              <span style={{ color: COLORS.ink }}>Bib</span>
              <span style={{ color: COLORS.amber }}>Arena</span>
            </span>
          </div>
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 12px 0" }}>Espace collectif plus large</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              disabled
              style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "9px 12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.inkSoft, cursor: "not-allowed" }}
            >
              Créer
            </button>
            <button
              disabled
              style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "9px 12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.inkSoft, cursor: "not-allowed" }}
            >
              Rejoindre
            </button>
          </div>
        </div>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function RepertoireHubScreen({ onBack, goToDiscover, goToDrinks, goToManageBreweries, goToManageBrands, goToScanBarcode }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <NavIcon name="map" size={32} color={COLORS.amber} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: 0, lineHeight: 1 }}>
          <span style={{ color: COLORS.ink }}>Bib</span>
          <span style={{ color: COLORS.amber }}>Atlas</span>
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <ActionCard
          icon={<NavIcon name="camera" size={18} color={COLORS.amber} />}
          title="Scanner un code-barres"
          subtitle="Retrouve un produit directement depuis sa bouteille ou sa canette"
          onClick={goToScanBarcode}
        />
        <ActionCard
          icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
          title="Établissements & lieux"
          subtitle="Répertoire des établissements & lieux référencés"
          onClick={goToDiscover}
        />
        <ActionCard
          icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
          title="Produits"
          subtitle="Répertoire des produits référencés"
          onClick={goToDrinks}
        />
        <ActionCard
          icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
          title="Brasseries et producteurs"
          subtitle="Répertoire des brasseries et producteurs référencés"
          onClick={goToManageBreweries}
        />
        <ActionCard
          icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
          title="Marques"
          subtitle="Répertoire des marques référencées"
          onClick={goToManageBrands}
        />
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function ComingSoonScreen({ onBack, eyebrow, title, icon, iconSize = 32, emoji, description, ideas }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      {icon ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 10px 0" }}>
          <NavIcon name={icon} size={iconSize} color={COLORS.amber} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: 0, lineHeight: 1 }}>{title}</h1>
        </div>
      ) : (
        <>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>{eyebrow}</span>
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: "4px 0 10px 0", lineHeight: 1 }}>{title}</h1>
        </>
      )}
      {emoji && <div style={{ textAlign: "center", fontSize: "56px", margin: "20px 0" }}>{emoji}</div>}
      <div
        style={{
          background: "#3D1F1F",
          border: `2px dashed ${COLORS.wine}`,
          borderRadius: "14px",
          padding: "16px",
          textAlign: "center",
          marginTop: emoji ? 0 : "20px",
          marginBottom: "18px",
        }}
      >
        <p style={{ fontSize: "13px", fontWeight: 700, color: COLORS.wine, margin: 0 }}>🚧 Bientôt disponible</p>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: 0 }}>{description}</p>
      </div>
      {ideas && ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {ideas.map((idea, i) => (
            <div key={i} style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "10px", padding: "14px 16px", fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>
              {idea}
            </div>
          ))}
        </div>
      )}
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
