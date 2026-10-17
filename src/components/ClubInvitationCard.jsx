// ============================================================
// Carte « invitation reçue » dans un BibaClub : qui m'invite, dans
// quel club, et les boutons Accepter / Refuser. Sert dans la liste
// « Mes BibaClub » et sur la page d'un club où l'on est invité
// (variante « compact » : le nom et la photo du club sont déjà affichés au-dessus).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { respondClubInvitation } from "../data/sharedDirectories.js";

const OUTCOME_TEXT = {
  active: "Bienvenue ! Vous avez rejoint le club.",
  pending: "Invitation acceptée : un administrateur du club doit encore valider votre entrée.",
  declined: "Invitation refusée.",
  expired: "Cette invitation n'est plus valable.",
};

export function ClubInvitationCard({ invitation, onOpenClub, onResponded, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const respond = async (accept) => {
    setBusy(true);
    setError(null);
    const result = await respondClubInvitation(invitation.id, accept);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOutcome(result.status);
    if (onResponded) onResponded(invitation, result.status);
  };

  const inviter = invitation.inviterName || "Un de vos Bibax";
  const subtitle = [invitation.clubCategory, `Invité par ${inviter}`].filter(Boolean).join(" · ");
  const header = compact ? (
    <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: "13.5px" }}>
      <strong>{inviter}</strong> vous invite à rejoindre ce club.
    </span>
  ) : (
    <>
      <EntityAvatar photoUrl={invitation.clubPhotoUrl} size={44} fallbackIcon="crown" />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: "14.5px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invitation.clubName}</div>
        <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>{subtitle}</div>
      </span>
    </>
  );
  const headerStyle = { display: "flex", alignItems: "center", gap: "12px", width: "100%", background: "none", border: "none", padding: 0, color: COLORS.ink };

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${outcome ? COLORS.paperAlt : COLORS.amber}`, borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
      {onOpenClub && !outcome ? (
        <button onClick={() => onOpenClub(invitation.clubId)} style={{ ...headerStyle, cursor: "pointer" }}>
          {header}
        </button>
      ) : (
        <div style={headerStyle}>{header}</div>
      )}

      {outcome ? (
        <div style={{ marginTop: "10px" }}>
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: 0 }}>{OUTCOME_TEXT[outcome] || OUTCOME_TEXT.expired}</p>
          {outcome === "active" && onOpenClub && (
            <button
              onClick={() => onOpenClub(invitation.clubId)}
              style={{ background: "none", border: "none", padding: "8px 0 0", fontSize: "12.5px", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}
            >
              Ouvrir le club
            </button>
          )}
        </div>
      ) : (
        <>
          {error && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: "10px 0 0" }}>{error}</p>}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              onClick={() => respond(true)}
              disabled={busy}
              style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, color: COLORS.paper, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "..." : "Accepter"}
            </button>
            <button
              onClick={() => respond(false)}
              disabled={busy}
              style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}
            >
              Refuser
            </button>
          </div>
        </>
      )}
    </div>
  );
}
