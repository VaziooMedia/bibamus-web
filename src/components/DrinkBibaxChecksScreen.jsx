// ============================================================
// « Tes Bibax qui ont checké ce produit » — la liste complète.
//
// Dans l'onglet Biba360 d'une fiche produit, la liste s'arrête aux 5 premiers Bibax (ceux qui ont le plus checké le produit) ;
// le bouton « Voir tout » ouvre cette page, qui les montre tous. Les lignes sont les mêmes dans les deux endroits
// (`BibaxCheckRows`). La liste vient de la fiche produit : cette page ne lit rien elle-même, sauf le code Bibax de la personne
// touchée, au moment où l'on ouvre son profil.
// ============================================================
import React, { useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BlockTitle, GoButton } from "./ui.jsx";
import { BibaxIdentity } from "./BibaxLines.jsx";
import { loadBibroCodes } from "../data/profiles.js";
import { useListReturn } from "../hooks/useListReturn.js";
import { formatCount } from "../utils.js";

// Les lignes de la liste : avatar, nom puis @nom + surnom (les deux premières lignes d'un Bibax), suivi de la flèche d'accès au profil, et à droite le nombre de checks.
// `rows` : { userId, name, lastName, username, nickname, avatarUrl, checkCount }. `onOpen(userId)` ouvre le profil.
export function BibaxCheckRows({ rows, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rows.map((b, i) => (
        <div key={b.userId} data-anchor={`bibax:${b.userId}`} style={{ display: "flex", alignItems: "center", gap: "10px", ...(i === 0 ? {} : { borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px" }) }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {b.avatarUrl ? <img src={b.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={16} color={COLORS.amber} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <BibaxIdentity name={b.name} lastName={b.lastName} username={b.username} nickname={b.nickname} style={{ fontSize: "14px" }} />
            <GoButton label={`Voir le profil de ${[b.name, b.lastName].filter(Boolean).join(" ") || b.nickname || "ce Bibax"}`} onClick={() => onOpen(b.userId)} />
          </div>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, flexShrink: 0 }}>{formatCount(b.checkCount)}</span>
        </div>
      ))}
    </div>
  );
}

// Retour d'un profil (norme de l'app, voir `useListReturn`) : la page se remet à la hauteur où on l'avait laissée ; la flèche retour vers la fiche du produit efface la mémoire.
export function DrinkBibaxChecksScreen({ drinkName, rows, onBack: onBackProp, onOpenBibax: onOpenBibaxProp, mainScrollRef }) {
  const { save, open, leave } = useListReturn("drinkBibaxChecks", mainScrollRef, { valid: (m) => m.ctx === drinkName });
  const onBack = leave(onBackProp);
  const onOpenBibax = open(onOpenBibaxProp);
  useEffect(() => {
    save({ ctx: drinkName });
  }, [drinkName]);
  // Le profil s'ouvre à partir du code Bibax, que la liste ne porte pas : on le retrouve à partir du compte.
  const openProfile = async (userId) => {
    const codes = await loadBibroCodes([userId]);
    if (!codes[userId]) {
      console.error("Profil du Bibax introuvable :", userId);
      return;
    }
    onOpenBibax(codes[userId]);
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", color: COLORS.ink, margin: "4px 0 18px 0", overflowWrap: "anywhere" }}>{drinkName}</h1>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px" }}>
        <BlockTitle>Tes Bibax qui ont checké ce produit</BlockTitle>
        <BibaxCheckRows rows={rows} onOpen={openProfile} />
      </div>
    </div>
  );
}
