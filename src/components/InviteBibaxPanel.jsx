// ============================================================
// « Inviter un Bibax » dans un BibaClub : la liste de mes Bibax qui
// ne sont pas encore dans le club, avec un bouton Inviter. Les
// règles (membre du club, Bibax accepté, limite journalière…) sont
// contrôlées par le serveur ; ses messages d'erreur sont affichés tels quels.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { loadInvitableBibax, sendClubInvitation, pushClubInvitation } from "../data/sharedDirectories.js";

const FILTER_FROM = 6; // au-delà de ce nombre de Bibax, un champ de recherche apparaît

const fullName = (b) => [b.name, b.lastName].filter(Boolean).join(" ") || "Quelqu'un";

export function InviteBibaxPanel({ clubId, clubName, myName }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoadError(null);
    setList(null);
    const result = await loadInvitableBibax(clubId);
    if (result.error) {
      setLoadError("Impossible de charger vos Bibax. Réessayez dans un instant.");
      return;
    }
    setList(result.bibax);
  };

  const invite = async (bibax) => {
    setBusyId(bibax.userId);
    setRowErrors((e) => ({ ...e, [bibax.userId]: null }));
    const result = await sendClubInvitation(clubId, bibax.userId);
    setBusyId(null);
    if (result.error) {
      setRowErrors((e) => ({ ...e, [bibax.userId]: result.error }));
      return;
    }
    setList((l) => (l || []).map((b) => (b.userId === bibax.userId ? { ...b, alreadyInvited: true } : b)));
    // La notification du fil est créée par le serveur ; ici, la notification du téléphone (sans attendre).
    pushClubInvitation(bibax.userId, myName, clubName);
  };

  const needle = filter.trim().toLowerCase();
  const shown = (list || []).filter((b) => !needle || fullName(b).toLowerCase().includes(needle));

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.ink, textAlign: "left" }}
      >
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>Inviter un Bibax</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.amber }}>{open ? "Fermer" : "Ouvrir"}</span>
      </button>

      {open && (
        <div style={{ marginTop: "10px" }}>
          {loadError && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: 0 }}>{loadError}</p>}
          {!loadError && list === null && <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: 0 }}>Chargement...</p>}
          {list !== null && list.length === 0 && (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: 0 }}>
              Aucun de vos Bibax n'est invitable pour l'instant. Pour inviter quelqu'un dans le club, ajoutez-le d'abord comme Bibax.
            </p>
          )}
          {list !== null && list.length > 0 && (
            <>
              <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 8px" }}>
                Seuls vos Bibax peuvent être invités. La personne choisit d'accepter ou de refuser.
              </p>
              {list.length > FILTER_FROM && (
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Chercher parmi vos Bibax"
                  maxLength={60}
                  autoCorrect="off"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.paper, color: COLORS.ink, fontSize: "13.5px", marginBottom: "6px" }}
                />
              )}
              {shown.length === 0 && <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>Aucun Bibax ne correspond.</p>}
              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {shown.map((b, i) => (
                  <div key={b.userId} style={{ borderBottom: i === shown.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
                      <EntityAvatar photoUrl={b.avatarUrl} size={34} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: "13.5px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName(b)}</span>
                      {b.alreadyInvited ? (
                        <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.inkSoft }}>Invitation envoyée</span>
                      ) : (
                        <button
                          onClick={() => invite(b)}
                          disabled={busyId !== null}
                          aria-label={`Inviter ${fullName(b)}`}
                          style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", fontWeight: 700, color: COLORS.paper, cursor: busyId !== null ? "not-allowed" : "pointer", opacity: busyId !== null ? 0.6 : 1 }}
                        >
                          {busyId === b.userId ? "..." : "Inviter"}
                        </button>
                      )}
                    </div>
                    {rowErrors[b.userId] && <p style={{ fontSize: "11.5px", color: "#FF3B3B", margin: "0 0 8px" }}>{rowErrors[b.userId]}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
