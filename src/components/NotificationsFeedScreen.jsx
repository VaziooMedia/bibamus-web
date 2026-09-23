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
import { loadMyNotifications, markAllNotificationsRead, loadPendingBibaxRequests, respondBibaxRequest, respondNotification, getSession } from "../data/sharedDirectories.js";
import { loadBibroCodes } from "../data/profiles.js";
import { BibaxProfilePreviewScreen } from "./BibaxProfilePreviewScreen.jsx";
import { ProfileNavContext } from "../contexts.js";

const TYPE_LABELS = (myGender) => ({
  pulse_bix: "a Bixé votre publication",
  pulse_comment: "a commenté votre publication",
  pulse_sante: "a dit Cheers à votre publication",
  bibax_request: "vous a envoyé une demande Bibax",
  bibax_accepted: "a accepté votre demande Bibax",
  salon_invite: "t'invite à rejoindre un BibaRoom",
  salon_invite_accepted: "a rejoint ton BibaRoom",
  // La vraie conjugaison suit le vrai genre du destinataire (celui qui reçoit et lit la
  // notification), pas celui de l'auteur du tag.
  story_tag: `vous a ${myGender === "female" ? "taguée" : "tagué"} dans une Story`,
});

// Notifications qui parlent d'une personne plutôt que d'une publication : y toucher ouvre sa
// fiche.
const PROFILE_TYPES = ["bibax_request", "bibax_accepted"];

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

export function NotificationsFeedScreen({ onBack, onOpenPulseEntry, onOpenBibaxProfile, onRespondSalonInvite, myGender, onOpenTaggedStory }) {
  const [notifications, setNotifications] = useState(null);
  const [pendingBibax, setPendingBibax] = useState([]);
  const [respondedIds, setRespondedIds] = useState({});
  const [busyId, setBusyId] = useState(null);
  // Code Bibax par identifiant de compte — le fil ne connaît que les identifiants, alors que
  // les fiches s'ouvrent à partir d'un code.
  const [bibroCodes, setBibroCodes] = useState({});
  const [viewedProfileCode, setViewedProfileCode] = useState(null);
  // Mon propre rond de profil mène à MON profil. L'écran ne reçoit pas mon identifiant, on le
  // lit donc depuis la session plutôt que de le faire descendre depuis le routeur.
  const [myUserId, setMyUserId] = useState(null);
  const { goToProfile } = React.useContext(ProfileNavContext);

  useEffect(() => {
    getSession().then((s) => setMyUserId(s?.user?.id || null));
  }, []);

  useEffect(() => {
    loadMyNotifications().then(async (list) => {
      setNotifications(list);
      const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) markAllNotificationsRead();
      const actorIds = list.map((n) => n.actorId).filter(Boolean);
      if (actorIds.length > 0) setBibroCodes(await loadBibroCodes(actorIds));
    });
    loadPendingBibaxRequests().then(setPendingBibax);
  }, []);

  const openProfile = (actorId) => {
    if (actorId && actorId === myUserId) {
      goToProfile();
      return;
    }
    const code = bibroCodes[actorId];
    if (code) setViewedProfileCode(code);
  };

  const handleClick = (n) => {
    if (n.entityType === "pulse_event" && onOpenPulseEntry) onOpenPulseEntry(n.entityId, n.type === "pulse_comment");
    // Les notifications liées à une personne ouvrent sa fiche à partir de son compte. L'ancien
    // code passait entityId, qui est l'identifiant de la relation et non un code Bibax.
    else if (PROFILE_TYPES.includes(n.type) || n.entityType === "bibax_relationship") openProfile(n.actorId);
    // Un tag dans une Story ouvre directement cette Story précise — sinon la personne devrait
    // la retrouver elle-même dans la barre de Stories, parmi toutes les autres.
    else if (n.type === "story_tag" && n.entityId && onOpenTaggedStory) onOpenTaggedStory(n.entityId);
  };

  const respondBibax = async (n, accept) => {
    const request = pendingBibax.find((r) => r.userId === n.actorId);
    if (!request) return;
    setBusyId(n.id);
    const result = await respondBibaxRequest(request.relationshipId, accept);
    if (!result?.error) await respondNotification(n.id, accept);
    setBusyId(null);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setRespondedIds((prev) => ({ ...prev, [n.id]: accept ? "accepted" : "declined" }));
  };

  const respondSalonInvite = async (n, accept) => {
    setBusyId(n.id);
    await respondNotification(n.id, accept);
    await onRespondSalonInvite?.(n.entityId, accept);
    setBusyId(null);
    setRespondedIds((prev) => ({ ...prev, [n.id]: accept ? "accepted" : "declined" }));
  };

  if (viewedProfileCode) {
    return <BibaxProfilePreviewScreen bibroCode={viewedProfileCode} onBack={() => setViewedProfileCode(null)} />;
  }

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
              const responded = n.status === "accepted" || n.status === "declined" ? n.status : respondedIds[n.id];
              const content = (
                <>
                  {/* Le rond de profil mène à la fiche de son auteur, quel que soit le type de
                      notification. */}
                  <EntityAvatar
                    photoUrl={n.actorAvatarUrl}
                    size={40}
                    onClick={
                      bibroCodes[n.actorId] || n.actorId === myUserId
                        ? (e) => {
                            e.stopPropagation();
                            openProfile(n.actorId);
                          }
                        : undefined
                    }
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "14px" }}>
                      <strong>{[n.actorName, n.actorLastName].filter(Boolean).join(" ") || "Quelqu'un"}</strong> {TYPE_LABELS(myGender)[n.type] || n.type}
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
                        {n.type === "salon_invite"
                          ? responded === "accepted"
                            ? "Tu as rejoint le salon."
                            : "Tu as décliné l'invitation."
                          : responded === "accepted"
                          ? "Acceptée"
                          : "Déclinée"}
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

              // Un div plutôt qu'un bouton : le rond de profil est lui-même un bouton, et
              // imbriquer deux boutons n'est pas valide.
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    borderBottom: i === notifications.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "14px 0",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                    opacity: n.read ? 0.7 : 1,
                    boxSizing: "border-box",
                  }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
