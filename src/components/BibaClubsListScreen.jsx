// ============================================================
// "Mes BibaClub" — invitations reçues, liste des clubs dont on est
// membre, recherche de clubs publics à rejoindre, et accès à la création.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { loadMyClubs, loadMyClubInvitations, searchPublicClubs } from "../data/sharedDirectories.js";
import { ClubInvitationCard } from "./ClubInvitationCard.jsx";

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

const JOIN_MODE_LABEL = { invite: "Sur invitation", request: "Sur demande", open: "Ouvert" };
const STATUS_LABEL = { active: "Membre", pending: "Demande en attente" };

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "10px",
  border: `2px solid ${COLORS.paperAlt}`,
  background: COLORS.paper,
  color: COLORS.ink,
  fontSize: "14px",
};

export function BibaClubsListScreen({ myUserId, onBack, onOpenClub, onCreateClub }) {
  const [myClubs, setMyClubs] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchSeq = React.useRef(0);

  useEffect(() => {
    loadMyClubs(myUserId).then(setMyClubs);
    // Une erreur de chargement des invitations ne bloque pas la liste : on n'affiche simplement rien.
    loadMyClubInvitations().then((result) => setInvitations(result.invitations || []));
  }, [myUserId]);

  // Recherche parmi les clubs publics : lancée 0,4 s après la dernière frappe, à partir de 2 caractères.
  useEffect(() => {
    const text = searchInput.trim();
    searchSeq.current += 1;
    const seq = searchSeq.current;
    setSearchError(null);
    if (text.length < 2) {
      setSearchResults(null);
      setSearchBusy(false);
      return undefined;
    }
    setSearchBusy(true);
    const timer = setTimeout(async () => {
      const result = await searchPublicClubs(text);
      if (seq !== searchSeq.current) return; // une recherche plus récente a pris le relais
      setSearchBusy(false);
      if (result.error) {
        setSearchError("La recherche a échoué. Réessayez dans un instant.");
        setSearchResults(null);
        return;
      }
      setSearchResults(result.clubs);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Invitation acceptée : le club rejoint apparaît tout de suite dans « Mes BibaClub ».
  const handleInvitationResponded = (_invitation, status) => {
    if (status === "active") loadMyClubs(myUserId).then(setMyClubs);
  };

  const roleLabel = { admin: "Admin", moderator: "Modérateur", member: "Membre" };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <NavIcon name="crown" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Mes</span> <span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Club</span>
        </h1>
      </div>

      <PrimaryButton onClick={onCreateClub} style={{ width: "100%", marginBottom: "20px" }}>
        + Créer un BibaClub
      </PrimaryButton>

      {invitations.length > 0 && (
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>
            Invitations reçues ({invitations.length})
          </div>
          {invitations.map((inv) => (
            <ClubInvitationCard key={inv.id} invitation={inv} onOpenClub={(id) => onOpenClub(id)} onResponded={handleInvitationResponded} />
          ))}
        </div>
      )}

      {myClubs === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
      ) : myClubs.length > 0 ? (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {myClubs.map((c, i) => (
              <div key={c.id} style={{ borderBottom: i === myClubs.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                <ClubRow club={c} subtitle={roleLabel[c.myRole]} onClick={() => onOpenClub(c.id)} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "24px" }}>
          Vous n'êtes membre d'aucun BibaClub pour l'instant. Créez le vôtre, ou attendez l'invitation d'un de vos Bibax.
        </p>
      )}

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
        <div style={{ fontSize: "14.5px", fontWeight: 700, marginBottom: "4px" }}>Découvrir des clubs publics</div>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 10px 0" }}>
          Cherchez par nom (2 lettres au minimum). Un club privé n'apparaît jamais ici : on n'y entre que sur invitation d'un Bibax membre.
        </p>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Nom du club"
          maxLength={60}
          autoCorrect="off"
          style={inputStyle}
        />
        {searchError && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: "10px 0 0 0" }}>{searchError}</p>}
        {searchBusy && <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "10px 0 0 0" }}>Recherche...</p>}
        {!searchBusy && searchResults && searchResults.length === 0 && (
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "10px 0 0 0" }}>Aucun club public ne correspond.</p>
        )}
        {!searchBusy && searchResults && searchResults.length > 0 && (
          <div style={{ marginTop: "6px" }}>
            {searchResults.map((c, i) => (
              <div key={c.id} style={{ borderBottom: i === searchResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                <ClubRow
                  club={c}
                  subtitle={[c.category, STATUS_LABEL[c.myStatus] || JOIN_MODE_LABEL[c.joinMode]].filter(Boolean).join(" · ")}
                  onClick={() => onOpenClub(c.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
