// ============================================================
// BibaPing — écran d'une conversation.
//
// Les messages arrivent du serveur du plus récent au plus ancien (c'est
// l'ordre de l'index) ; on les retourne ici pour l'affichage, le plus récent
// en bas, comme dans n'importe quelle messagerie.
//
// Photos volontairement absentes pour l'instant : on les ajoutera une fois le
// texte éprouvé.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { loadMessages, sendMessage, markConversationRead, subscribeToConversation, loadConversationProfiles } from "../data/messaging.js";
import bibaPingIconUrl from "../assets/brand/bibaping.svg";

const PAGE_SIZE = 40;

function messageTime(iso) {
  try {
    return new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  return new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function ConversationScreen({ conversation, myUserId, title, photoUrl, onOpenProfile, onBack }) {
  const [messages, setMessages] = useState(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profilesById, setProfilesById] = useState({});
  const bottomRef = useRef(null);

  const isGroup = conversation.kind !== "direct";

  // Chargement initial, puis marquage comme lu.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadMessages(conversation.id, PAGE_SIZE);
      if (cancelled) return;
      if (list === null) {
        setFailed(true);
        return;
      }
      setHasMore(list.length === PAGE_SIZE);
      setMessages(list.slice().reverse());
      markConversationRead(conversation.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  // Noms et avatars des participants — seulement utiles dans un groupe, où
  // plusieurs personnes différentes écrivent.
  useEffect(() => {
    if (!isGroup) return;
    const ids = (conversation.memberIds || []).filter((id) => id !== myUserId);
    if (ids.length === 0) return;
    loadConversationProfiles(ids).then(setProfilesById);
  }, [conversation.id, isGroup, conversation.memberIds, myUserId]);

  // Temps réel — un message envoyé par quelqu'un d'autre apparaît sans rien
  // rafraîchir. Le doublon est écarté au cas où l'insertion locale et
  // l'événement temps réel se croisent.
  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversation.id, (message) => {
      setMessages((prev) => {
        if (!prev) return prev;
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      markConversationRead(conversation.id);
    });
    return unsubscribe;
  }, [conversation.id]);

  // Toujours en bas à l'arrivée d'un message, comme une vraie messagerie.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const loadOlder = async () => {
    if (!messages || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0].createdAt;
    const older = await loadMessages(conversation.id, PAGE_SIZE, oldest);
    setLoadingMore(false);
    if (!older) return;
    setHasMore(older.length === PAGE_SIZE);
    setMessages((prev) => [...older.slice().reverse(), ...(prev || [])]);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const result = await sendMessage(conversation.id, text);
    setSending(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setDraft("");
    setMessages((prev) => {
      if (!prev) return [result.message];
      if (prev.some((m) => m.id === result.message.id)) return prev;
      return [...prev, result.message];
    });
  };

  const visible = (messages || []).filter((m) => !m.deletedAt);

  return (
    <div style={{ padding: "28px 20px 0", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "8px 0 14px 0" }}>
        {onOpenProfile ? (
          <button
            onClick={onOpenProfile}
            title={`Voir la fiche de ${title}`}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0, lineHeight: 0 }}
          >
            <EntityAvatar photoUrl={photoUrl} size={34} />
          </button>
        ) : (
          <span style={{ display: "flex", flexShrink: 0, lineHeight: 0 }}>
            <EntityAvatar photoUrl={photoUrl} size={34} />
          </span>
        )}
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>
        {conversation.kind === "salon" && (
          <span style={{ fontSize: "9px", fontWeight: 700, color: COLORS.paper, background: COLORS.amber, borderRadius: "999px", padding: "1px 6px", flexShrink: 0 }}>
            SALON
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "12px" }}>
        {failed ? (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>
            Les messages n'ont pas pu être chargés. Réessaie plus tard.
          </p>
        ) : messages === null ? (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>Chargement...</p>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadOlder}
                disabled={loadingMore}
                style={{
                  alignSelf: "center",
                  background: "none",
                  border: `2px solid ${COLORS.paperAlt}`,
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: COLORS.inkSoft,
                  cursor: loadingMore ? "default" : "pointer",
                }}
              >
                {loadingMore ? "..." : "Messages précédents"}
              </button>
            )}

            {visible.length === 0 && (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
                Aucun message. À toi d'ouvrir le bal.
              </p>
            )}

            {visible.map((m, index) => {
              const mine = m.senderId === myUserId;
              const previous = index > 0 ? visible[index - 1] : null;
              const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const sender = profilesById[m.senderId];
              const showSender = isGroup && !mine && (!previous || previous.senderId !== m.senderId);
              return (
                <React.Fragment key={m.id}>
                  {newDay && (
                    <div style={{ alignSelf: "center", fontSize: "10.5px", color: COLORS.inkSoft, background: COLORS.surface, border: `1px solid ${COLORS.paperAlt}`, borderRadius: "999px", padding: "3px 10px", margin: "6px 0" }}>
                      {dayLabel(m.createdAt)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                    {showSender && (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: COLORS.inkSoft, marginBottom: "3px", paddingLeft: "4px" }}>
                        <EntityAvatar photoUrl={sender?.avatarUrl} size={18} />
                        {sender ? [sender.displayName, sender.lastName].filter(Boolean).join(" ") : "Quelqu'un"}
                      </span>
                    )}
                    <div
                      style={{
                        maxWidth: "78%",
                        background: mine ? COLORS.amber : COLORS.surface,
                        color: mine ? COLORS.paper : COLORS.ink,
                        border: mine ? "none" : `2px solid ${COLORS.paperAlt}`,
                        borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        padding: "8px 12px",
                        fontSize: "14px",
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.body}
                    </div>
                    <span style={{ fontSize: "10px", color: COLORS.inkSoft, margin: "2px 4px 0" }}>{messageTime(m.createdAt)}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          padding: "10px 0 calc(14px + env(safe-area-inset-bottom, 0px))",
          borderTop: `1px solid ${COLORS.paperAlt}`,
          background: COLORS.paper,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée saute une ligne — convention habituelle.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ton message..."
          rows={1}
          style={{
            flex: 1,
            minWidth: 0,
            resize: "none",
            maxHeight: "120px",
            padding: "10px 14px",
            borderRadius: "18px",
            border: `2px solid ${COLORS.paperAlt}`,
            background: COLORS.surface,
            color: COLORS.ink,
            fontSize: "14px",
            fontFamily: "inherit",
            lineHeight: 1.4,
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          title="Envoyer"
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: draft.trim() ? COLORS.amber : COLORS.surfaceAlt,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: draft.trim() && !sending ? "pointer" : "default",
            opacity: sending ? 0.5 : 1,
            padding: 0,
          }}
        >
          {/* Blanche sur le fond vert du bouton prêt à envoyer. Aucun SVG blanc n'existe :
              le filtre force n'importe quelle couleur source en blanc pur. Au repos, l'icône
              garde sa couleur d'origine, atténuée. */}
          <img
            src={bibaPingIconUrl}
            alt=""
            style={{ height: "20px", filter: draft.trim() ? "brightness(0) invert(1)" : "none", opacity: draft.trim() ? 1 : 0.5 }}
          />
        </button>
      </div>
    </div>
  );
}
