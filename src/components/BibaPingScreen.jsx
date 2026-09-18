// ============================================================
// BibaPing — liste des conversations.
//
// Premier écran de la messagerie : tête-à-tête, groupes et chats de salon
// dans une seule liste, triée par activité récente.
//
// Un tête-à-tête n'a ni titre ni photo en base — ils viennent du profil de
// l'autre participant, résolu ici en un seul appel pour toute la liste.
//
// L'écran de discussion s'ouvre depuis ici plutôt que par le routeur : ça
// évite de toucher à App.jsx pour une navigation qui reste interne à
// BibaPing. Si une conversation doit un jour s'ouvrir depuis ailleurs (une
// fiche Bibax, une notification), on la remontera au routeur à ce moment-là.
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { loadMyConversations, loadConversationProfiles } from "../data/messaging.js";
import { ConversationScreen } from "./ConversationScreen.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "À l'instant";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function BibaPingScreen({ myUserId, onBack, onNewConversation }) {
  // null = pas encore chargé OU échec ; le drapeau d'erreur distingue les deux.
  const [conversations, setConversations] = useState(null);
  const [profilesById, setProfilesById] = useState({});
  const [failed, setFailed] = useState(false);
  const [openConversation, setOpenConversation] = useState(null);

  const refresh = useCallback(async () => {
    const list = await loadMyConversations(50);
    if (list === null) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setConversations(list);
    const ids = list.flatMap((c) => c.memberIds).filter((id) => id !== myUserId);
    if (ids.length > 0) {
      const profiles = await loadConversationProfiles(ids);
      setProfilesById(profiles);
    }
  }, [myUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Titre et photo : ceux de la conversation pour un groupe ou un salon, ceux
  // de l'autre participant pour un tête-à-tête.
  const describe = (c) => {
    if (c.kind === "direct") {
      const otherId = c.memberIds.find((id) => id !== myUserId);
      const other = profilesById[otherId];
      return {
        title: other ? [other.displayName, other.lastName].filter(Boolean).join(" ") : "Conversation",
        photoUrl: other?.avatarUrl || null,
      };
    }
    return { title: c.title || (c.kind === "salon" ? "Salon" : "Groupe"), photoUrl: c.photoUrl };
  };

  const preview = (c) => {
    if (!c.lastMessageBody && !c.lastMessageHasMedia) return "Aucun message";
    const mine = c.lastMessageSenderId === myUserId;
    const body = c.lastMessageBody || "Photo";
    return mine ? `Toi : ${body}` : body;
  };

  // Une conversation ouverte remplace entièrement la liste — au retour, on
  // recharge pour que le dernier message et les non-lus soient à jour.
  if (openConversation) {
    return (
      <ConversationScreen
        conversation={openConversation}
        myUserId={myUserId}
        title={describe(openConversation).title}
        onBack={() => {
          setOpenConversation(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0 18px 0" }}>
        <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px" }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Ping</span>
        </span>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            title="Nouvelle conversation"
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "none",
              border: `2px solid ${COLORS.amber}`,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.amber} strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      {failed ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", textAlign: "center" }}>
          <NavIcon name="map-pin" size={26} color={COLORS.paperAlt} />
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Tes conversations n'ont pas pu être chargées. Réessaie plus tard.</p>
        </div>
      ) : conversations === null ? (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>Chargement...</p>
      ) : conversations.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0, fontWeight: 700 }}>Aucune conversation</p>
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>
            Écris à tes Bibax, ou aux gens d'un salon en cours.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {conversations.map((c) => {
            const { title, photoUrl } = describe(c);
            const unread = c.unreadCount > 0;
            return (
              <button
                key={c.id}
                onClick={() => setOpenConversation(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  width: "100%",
                  background: COLORS.surface,
                  border: `2px solid ${unread ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "12px",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                <EntityAvatar photoUrl={photoUrl} size={44} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                    {c.kind === "salon" && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: COLORS.paper, background: COLORS.amber, borderRadius: "999px", padding: "1px 6px", flexShrink: 0 }}>
                        SALON
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: unread ? COLORS.ink : COLORS.inkSoft,
                      fontWeight: unread ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: "2px",
                    }}
                  >
                    {preview(c)}
                  </span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <span style={{ fontSize: "10.5px", color: COLORS.inkSoft }}>{timeAgo(c.lastMessageAt)}</span>
                  {unread && (
                    <span
                      style={{
                        minWidth: "20px",
                        height: "20px",
                        borderRadius: "999px",
                        background: COLORS.amber,
                        color: COLORS.paper,
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                      }}
                    >
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "auto", paddingTop: "24px" }}>
        <BackFooterLink onClick={onBack} />
      </div>
    </div>
  );
}
