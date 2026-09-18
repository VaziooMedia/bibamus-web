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
import React, { useState, useEffect, useRef, useCallback } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import {
  loadMessages,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
  loadConversationProfiles,
  uploadMessagePhoto,
  getMessagePhotoUrl,
  loadMessageReactions,
  setMessageReaction,
  subscribeToReactions,
  REACTION_EMOJIS,
} from "../data/messaging.js";
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

// hideHeader : utilisé quand l'écran est intégré dans un onglet, qui porte déjà son propre
// en-tête — inutile d'en empiler deux.
export function ConversationScreen({ conversation, myUserId, title, photoUrl, onOpenProfile, onBack, hideHeader = false }) {
  const [messages, setMessages] = useState(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profilesById, setProfilesById] = useState({});
  // Bucket privé : chaque photo est affichée via une URL signée, résolue une fois puis gardée
  // en mémoire le temps de l'écran.
  const [photoUrls, setPhotoUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  // Réactions des messages affichés : { [messageId]: [{ emoji, userIds }] }.
  const [reactions, setReactions] = useState({});
  // Message dont la palette est ouverte (appui long).
  const [reactingTo, setReactingTo] = useState(null);
  const longPressTimer = useRef(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const isGroup = conversation.kind !== "direct";

  // Chargement initial, puis marquage comme lu.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadMessages(conversation.id, PAGE_SIZE, null, conversation.clearedAt || null);
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

  // Signe les photos pas encore résolues, au fur et à mesure qu'elles apparaissent.
  useEffect(() => {
    const missing = (messages || [])
      .filter((m) => m.mediaUrl && !photoUrls[m.mediaUrl])
      .map((m) => m.mediaUrl);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (path) => [path, await getMessagePhotoUrl(path)]));
      if (!cancelled) setPhotoUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, photoUrls]);

  // Réactions des messages chargés, rechargées dès qu'une réaction bouge quelque part.
  const messageIdsKey = (messages || []).map((m) => m.id).join(",");
  const refreshReactions = useCallback(() => {
    const ids = messageIdsKey ? messageIdsKey.split(",") : [];
    if (ids.length === 0) return;
    loadMessageReactions(ids).then(setReactions);
  }, [messageIdsKey]);

  useEffect(() => {
    refreshReactions();
  }, [refreshReactions]);

  useEffect(() => {
    const unsubscribe = subscribeToReactions(refreshReactions);
    return unsubscribe;
  }, [refreshReactions]);

  // Appui long : ouvre la palette. Annulé si le doigt bouge (l'utilisateur fait défiler) ou
  // si le contact se termine avant le délai.
  const startLongPress = (message) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setReactingTo(message), 450);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const myReactionFor = (messageId) => (reactions[messageId] || []).find((r) => r.userIds.includes(myUserId))?.emoji || null;

  const applyReaction = async (emoji) => {
    const target = reactingTo;
    setReactingTo(null);
    if (!target) return;
    const result = await setMessageReaction(target.id, emoji, myReactionFor(target.id));
    if (result?.error) {
      alert(result.error);
      return;
    }
    refreshReactions();
  };

  // Toujours en bas à l'arrivée d'un message, comme une vraie messagerie.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const loadOlder = async () => {
    if (!messages || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0].createdAt;
    const older = await loadMessages(conversation.id, PAGE_SIZE, oldest, conversation.clearedAt || null);
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

  const handlePickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    const uploaded = await uploadMessagePhoto(conversation.id, file);
    if (uploaded?.error) {
      setUploading(false);
      alert(uploaded.error);
      return;
    }
    const result = await sendMessage(conversation.id, "", uploaded.path);
    setUploading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setMessages((prev) => {
      if (!prev) return [result.message];
      if (prev.some((m) => m.id === result.message.id)) return prev;
      return [...prev, result.message];
    });
  };

  const visible = (messages || []).filter((m) => !m.deletedAt);

  return (
    <div style={{ padding: hideHeader ? "0" : "28px 20px 0", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {!hideHeader && <PageHeader onBack={onBack} />}

      {!hideHeader && (
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
            BibaRoom
          </span>
        )}
      </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          // Intégrée dans un onglet, cette zone n'a pas de hauteur à remplir et retomberait
          // à zéro : on lui en garantit une.
          minHeight: hideHeader ? "320px" : 0,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: "12px",
        }}
      >
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
                  {/* Dans un groupe ou un salon, l'avatar est posé à côté de la bulle : au-delà
                      de deux participants, le nom seul ne suffit plus à savoir qui parle. Il
                      n'apparaît que sur le premier message d'une suite du même auteur, un
                      espace réservé gardant l'alignement pour les suivants. */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "8px",
                      alignItems: "flex-start",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    {isGroup && !mine && (
                      <span style={{ width: "28px", flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: showSender ? "17px" : "2px" }}>
                        {showSender && <EntityAvatar photoUrl={sender?.avatarUrl} size={28} />}
                      </span>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", flex: 1, minWidth: 0 }}>
                    {showSender && (
                      <span style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "3px", paddingLeft: "4px" }}>
                        {sender ? [sender.displayName, sender.lastName].filter(Boolean).join(" ") : "Quelqu'un"}
                      </span>
                    )}
                    <div
                      onPointerDown={() => startLongPress(m)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onContextMenu={(e) => {
                        // Empêche le menu contextuel du navigateur, qui s'ouvrirait par-dessus
                        // la palette sur un appui long.
                        e.preventDefault();
                      }}
                      style={{
                        maxWidth: "78%",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
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
                      {m.mediaUrl && (
                        <img
                          src={photoUrls[m.mediaUrl] || undefined}
                          alt=""
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            borderRadius: "10px",
                            marginBottom: m.body ? "6px" : 0,
                            background: COLORS.surfaceAlt,
                            minHeight: photoUrls[m.mediaUrl] ? undefined : "120px",
                          }}
                        />
                      )}
                      {m.body}
                    </div>
                    {(reactions[m.id] || []).length > 0 && (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "3px 4px 0" }}>
                        {(reactions[m.id] || []).map((r) => {
                          const mineHere = r.userIds.includes(myUserId);
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => setMessageReaction(m.id, r.emoji, myReactionFor(m.id)).then(refreshReactions)}
                              title={mineHere ? "Retirer ma réaction" : "Réagir"}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                background: COLORS.surface,
                                border: `1.5px solid ${mineHere ? COLORS.amber : COLORS.paperAlt}`,
                                borderRadius: "999px",
                                padding: "1px 7px",
                                fontSize: "12px",
                                lineHeight: 1.6,
                                color: COLORS.ink,
                                cursor: "pointer",
                              }}
                            >
                              {r.emoji}
                              {r.userIds.length > 1 && <span style={{ fontSize: "10.5px", color: COLORS.inkSoft }}>{r.userIds.length}</span>}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    <span style={{ fontSize: "10px", color: COLORS.inkSoft, margin: "2px 4px 0" }}>{messageTime(m.createdAt)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {reactingTo && (
        <div
          onClick={() => setReactingTo(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
              {REACTION_EMOJIS.map((emoji) => {
                const mineHere = myReactionFor(reactingTo.id) === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => applyReaction(emoji)}
                    style={{
                      background: "none",
                      border: `2px solid ${mineHere ? COLORS.amber : "transparent"}`,
                      borderRadius: "50%",
                      width: "48px",
                      height: "48px",
                      fontSize: "26px",
                      lineHeight: 1,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickPhoto} style={{ display: "none" }} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Envoyer une photo"
          style={{
            flexShrink: 0,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "none",
            border: `2px solid ${COLORS.paperAlt}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploading ? "default" : "pointer",
            opacity: uploading ? 0.5 : 1,
            padding: 0,
          }}
        >
          <NavIcon name="camera" size={18} color={COLORS.amber} />
        </button>
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
