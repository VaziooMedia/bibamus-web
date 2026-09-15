// ============================================================
// Fil de notifications — accessible depuis la barre d'accès
// rapide. Liste réelle, stockée en base (notifications_feed),
// distincte des préférences de notifications (dans Paramètres).
// Marque tout comme lu à l'ouverture.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { loadMyNotifications, markAllNotificationsRead, loadPendingBibaxRequests, respondBibaxRequest } from "../data/sharedDirectories.js";

const TYPE_LABELS = {
  pulse_bix: "a Bixé votre publication",
  pulse_comment: "a commenté votre publication",
  pulse_sante: "a dit Cheers à votre publication",
  bibax_request: "vous a envoyé une demande Bibax",
  bibax_accepted: "a accepté votre demande Bibax",
  salon_invite: "t'invite à rejoindre un BibaRoom",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export function NotificationsFeedScreen({ onBack, onOpenPulseEntry, onOpenBibaxProfile, onRespondSalonInvite }) {
  const [notifications, setNotifications] = useState(null);
  const [pendingBibax, setPendingBibax] = useState([]);
  const [respondedIds, setRespondedIds] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadMyNotifications().then((list) => {
      setNotifications(list);
      const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) markAllNotificationsRead();
    });
    loadPendingBibaxRequests().then(setPendingBibax);
  }, []);

  const handleClick = (n) => {
    if (n.entityType === "pulse_event" && onOpenPulseEntry) onOpenPulseEntry(n.entityId, n.type === "pulse_comment");
    else if (n.entityType === "bibax_relationship" && onOpenBibaxProfile) onOpenBibaxProfile(n.entityId);
  };

  const respondBibax = async (n, accept) => {
    const request = pendingBibax.find((r) => r.userId === n.actorId);
    if (!request) return;
    setBusyId(n.id);
    const result = await respondBibaxRequest(request.relationshipId, accept);
    setBusyId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setRespondedIds((prev) => ({ ...prev, [n.id]: accept ? "accepted" : "declined" }));
  };

  const respondSalonInvite = async (n, accept) => {
    setBusyId(n.id);
    await onRespondSalonInvite?.(n.entityId, accept);
    setBusyId(null);
    setRespondedIds((prev) => ({ ...prev, [n.id]: accept ? "accepted" : "declined" }));
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", flexShrink: 0 }}>
          <NavIcon name="back-triangle" size={18} color={COLORS.ink} />
        </button>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: COLORS.paperAlt,
            flexShrink: 0,
          }}
        >
          <NavIcon name="bell" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Notifications</h1>
      </div>

      {notifications === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Chargement...</p>
      ) : notifications.length === 0 ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucune notification pour l'instant.</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {notifications.map((n, i) => {
              const pendingRequest = n.type === "bibax_request" ? pendingBibax.find((r) => r.userId === n.actorId) : null;
              const isActionable = (n.type === "bibax_request" && pendingRequest) || n.type === "salon_invite";
              const responded = respondedIds[n.id];
              const content = (
                <>
                  <EntityAvatar photoUrl={n.actorAvatarUrl} size={40} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "14px" }}>
                      <strong>{[n.actorName, n.actorLastName].filter(Boolean).join(" ") || "Quelqu'un"}</strong> {TYPE_LABELS[n.type] || n.type}
                    </span>
                    <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{timeAgo(n.createdAt)}</div>
                    {n.postPreview && (
                      <div style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{n.postPreview}"
                      </div>
                    )}
                    {n.previewText && (
                      <div style={{ fontSize: "12.5px", color: COLORS.ink, marginTop: "4px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        « {n.previewText} »
                      </div>
                    )}
                    {responded && (
                      <div style={{ fontSize: "12px", color: COLORS.amber, marginTop: "6px", fontWeight: 600 }}>
                        {responded === "accepted" ? "Acceptée" : "Déclinée"}
                      </div>
                    )}
                  </span>
                  {!n.read && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                </>
              );

              if (isActionable && !responded) {
                const respond = n.type === "bibax_request" ? respondBibax : respondSalonInvite;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      width: "100%",
                      borderBottom: i === notifications.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                      padding: "14px 0",
                      color: COLORS.ink,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>{content}</div>
                    <div style={{ display: "flex", gap: "8px", paddingLeft: "52px" }}>
                      <button
                        onClick={() => respond(n, true)}
                        disabled={busyId === n.id}
                        style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: COLORS.paper, cursor: "pointer" }}
                      >
                        Rejoindre
                      </button>
                      <button
                        onClick={() => respond(n, false)}
                        disabled={busyId === n.id}
                        style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: COLORS.inkSoft, cursor: "pointer" }}
                      >
                        Décliner
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: i === notifications.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "14px 0",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                    opacity: n.read ? 0.7 : 1,
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
