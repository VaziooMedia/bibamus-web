// ============================================================
// « Inviter un Bibax » dans un BibaClub : la liste de mes Bibax qui
// ne sont pas encore dans le club, avec un bouton Inviter. Les
// règles (membre du club, Bibax accepté, limite journalière…) sont
// contrôlées par le serveur ; ses messages d'erreur sont affichés tels quels.
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { loadInvitableBibax, sendClubInvitation, pushClubInvitation } from "../data/sharedDirectories.js";

const FILTER_FROM = 6; // au-delà de ce nombre de Bibax, un champ de recherche apparaît
const PAGE_SIZE = 50; // personnes affichées à chaque fois ; « Afficher plus » charge les suivantes
const SEARCH_DELAY = 300; // ms d'attente après la dernière lettre tapée avant de lancer la recherche

const fullName = (b) => [b.name, b.lastName].filter(Boolean).join(" ") || "Quelqu'un";

export function InviteBibaxPanel({ clubId, clubName, myName }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState(""); // ce qui est tapé dans le champ
  const [activeTerm, setActiveTerm] = useState(""); // la recherche dont la liste affichée est le résultat
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manyBibax, setManyBibax] = useState(false); // la liste sans recherche dépasse FILTER_FROM
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const reqRef = useRef(0); // numéro de la dernière demande : une réponse plus ancienne est ignorée
  const timerRef = useRef(null);
  const nextOffsetRef = useRef(0); // combien de personnes le serveur nous a déjà données pour la recherche en cours

  useEffect(
    () => () => {
      reqRef.current += 1;
      clearTimeout(timerRef.current);
    },
    []
  );

  // Première page d'une recherche (terme vide = tous mes Bibax invitables).
  const loadFirst = async (term, initial) => {
    const id = ++reqRef.current;
    setLoadError(null);
    setLoadingMore(false);
    if (initial) setList(null);
    else setSearching(true);
    const result = await loadInvitableBibax(clubId, { search: term, limit: PAGE_SIZE, offset: 0 });
    if (id !== reqRef.current) return;
    setSearching(false);
    if (result.error) {
      setLoadError("Impossible de charger vos Bibax. Réessayez dans un instant.");
      return;
    }
    nextOffsetRef.current = result.received;
    setList(result.bibax);
    setHasMore(result.hasMore);
    setActiveTerm(term);
    if (!term) setManyBibax(result.bibax.length > FILTER_FROM || result.hasMore);
  };

  const loadMore = async () => {
    const id = ++reqRef.current;
    setLoadError(null);
    setLoadingMore(true);
    const result = await loadInvitableBibax(clubId, { search: activeTerm, limit: PAGE_SIZE, offset: nextOffsetRef.current });
    if (id !== reqRef.current) return;
    setLoadingMore(false);
    if (result.error) {
      setLoadError("Impossible de charger la suite. Réessayez dans un instant.");
      return;
    }
    nextOffsetRef.current += result.received;
    setList((l) => {
      const have = new Set((l || []).map((b) => b.userId));
      return [...(l || []), ...result.bibax.filter((b) => !have.has(b.userId))];
    });
    setHasMore(result.hasMore);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    clearTimeout(timerRef.current);
    if (!next) {
      reqRef.current += 1; // une réponse qui arriverait après la fermeture est ignorée
      setSearching(false);
      setLoadingMore(false);
      return;
    }
    setQuery("");
    setActiveTerm("");
    setManyBibax(false);
    setHasMore(false);
    loadFirst("", true);
  };

  const onType = (value) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    const term = value.trim();
    timerRef.current = setTimeout(() => loadFirst(term, false), SEARCH_DELAY);
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
    pushClubInvitation(result.invitationId, myName, clubName);
  };

  const showSearch = manyBibax || query !== "" || activeTerm !== "";
  const shown = list || [];

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
          {loadError && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: "0 0 6px" }}>{loadError}</p>}
          {!loadError && list === null && <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: 0 }}>Chargement...</p>}
          {list !== null && list.length === 0 && activeTerm === "" && query === "" && (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: 0 }}>
              Aucun de vos Bibax n'est invitable pour l'instant. Pour inviter quelqu'un dans le club, ajoutez-le d'abord comme Bibax.
            </p>
          )}
          {list !== null && (list.length > 0 || showSearch) && (
            <>
              <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 8px" }}>
                Seuls vos Bibax peuvent être invités. La personne choisit d'accepter ou de refuser.
              </p>
              {showSearch && (
                <input
                  value={query}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Chercher parmi vos Bibax"
                  aria-label="Chercher parmi vos Bibax"
                  maxLength={60}
                  autoCorrect="off"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.paper, color: COLORS.ink, fontSize: "13.5px", marginBottom: "6px" }}
                />
              )}
              {searching && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 4px" }}>Recherche...</p>}
              {!searching && !loadError && shown.length === 0 && <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>Aucun Bibax ne correspond.</p>}
              <div style={{ maxHeight: "320px", overflowY: "auto", opacity: searching ? 0.55 : 1 }}>
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
              {hasMore && !searching && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{ display: "block", width: "100%", marginTop: "8px", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", fontWeight: 700, color: COLORS.ink, cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.6 : 1 }}
                >
                  {loadingMore ? "Chargement..." : "Afficher plus"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
