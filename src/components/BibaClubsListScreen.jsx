// ============================================================
// "Mes BibaClub" — liste des clubs dont on est membre, recherche
// de clubs publics à rejoindre, et accès à la création.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { loadMyClubs } from "../data/sharedDirectories.js";

function ClubRow({ club, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        background: "none",
        border: "none",
        padding: "12px 0",
        textAlign: "left",
        cursor: "pointer",
        color: COLORS.ink,
      }}
    >
      <EntityAvatar photoUrl={club.photoUrl} size={44} fallbackIcon="crown" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14.5px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div>
        <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>{subtitle}</div>
      </span>
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

export function BibaClubsListScreen({ myUserId, onBack, onOpenClub, onCreateClub }) {
  const [myClubs, setMyClubs] = useState(null);

  useEffect(() => {
    loadMyClubs(myUserId).then(setMyClubs);
  }, [myUserId]);

  const roleLabel = { admin: "Admin", moderator: "Modérateur", member: "Membre" };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <NavIcon name="crown" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Mes</span> <span style={{ color: COLORS.amber }}>BibaClub</span>
        </h1>
      </div>

      <PrimaryButton onClick={onCreateClub} style={{ width: "100%", marginBottom: "20px" }}>
        + Créer un BibaClub
      </PrimaryButton>

      {myClubs === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
      ) : myClubs.length > 0 ? (
        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px", display: "block" }}>Mes clubs</label>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {myClubs.map((c, i) => (
              <div key={c.id} style={{ borderBottom: i === myClubs.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                <ClubRow club={c} subtitle={roleLabel[c.myRole]} onClick={() => onOpenClub(c.id)} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "24px" }}>Vous n'êtes membre d'aucun BibaClub pour l'instant.</p>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
