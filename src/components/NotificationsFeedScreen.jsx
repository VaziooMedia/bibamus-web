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
import { loadMyNotifications, markAllNotificationsRead, loadPendingBibaxRequests, respondBibaxRequest, respondNotification, getSession, loadMyClubInvitations, loadMyDeclinedClubInvitations, respondClubInvitation, reopenClubInvitation } from "../data/sharedDirectories.js";
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
  club_invitation: "vous invite à rejoindre un BibaClub",
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

export function NotificationsFeedScreen({ onBack, onOpenPulseEntry, onOpenBibaxProfile, onRespondSalonInvite, myGender, onOpenTaggedStory, onOpenClub }) {
  const [notifications, setNotifications] = useState(null);
  const [pendingBibax, setPendingBibax] = useState([]);
  const [respondedIds, setRespondedIds] = useState({});
  const [busyId, setBusyId] = useState(null);
  // Code Bibax par identifiant de compte — le fil ne connaît que les identifiants, alors que
  // les fiches s'ouvrent à partir d'un code.
  const [bibroCodes, setBibroCodes] = useState({});
  const [viewedProfileCode, setViewedProfileCode] = useState(null);
  // Invitations à un BibaClub, par club : { id, state } avec state = « pending » (en attente), « declined »
  // (refusée, mais on peut encore changer d'avis), « joined » (je suis dans le club), « requested » (un
  // administrateur doit valider mon entrée) ou « expired ». null tant que ce n'est pas connu. La
  // notification, elle, reste dans le fil une fois l'invitation traitée ou périmée : c'est cet état,
  // donné par le serveur, qui dit si l'on peut encore y répondre.
  const [clubInv, setClubInv] = useState(null);
  const [clubInvBusy, setClubInvBusy] = useState(null);
  const [clubInvErrors, setClubInvErrors] = useState({});
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
      if (list.some((n) => n.type === "club_invitation")) {
        Promise.all([loadMyClubInvitations(), loadMyDeclinedClubInvitations()]).then(([pending, declined]) => {
          // Sans la liste des invitations en attente, on n'affirme rien. Sans celle des refus (par exemple
          // tant que le serveur ne la fournit pas), on garde les invitations en attente telles quelles.
          if (pending.error) return;
          const map = {};
          if (!declined.error) for (const i of declined.invitations) map[i.clubId] = { id: i.id, state: "declined" };
          for (const i of pending.invitations) map[i.clubId] = { id: i.id, state: "pending" };
          setClubInv(map);
        });
      }
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
    // Une invitation dans un BibaClub ouvre la page de ce club (on peut aussi y répondre directement
    // depuis le fil, avec les boutons Accepter / Refuser).
    else if (n.type === "club_invitation" && n.entityId && onOpenClub) onOpenClub(n.entityId);
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

  const setClubState = (clubId, entry) => setClubInv((m) => ({ ...(m || {}), [clubId]: entry }));

  // Accepter ou refuser une invitation à un BibaClub directement depuis le fil. Le serveur répond :
  // « active » (je suis dans le club), « pending » (un administrateur doit valider), « declined » ou
  // « expired » ; ses messages d'erreur sont affichés tels quels.
  const respondClubInvite = async (n, accept) => {
    const entry = clubInv?.[n.entityId];
    if (!entry) return;
    setClubInvBusy(n.id);
    setClubInvErrors((e) => ({ ...e, [n.id]: null }));
    const result = await respondClubInvitation(entry.id, accept);
    setClubInvBusy(null);
    if (result.error) {
      setClubInvErrors((e) => ({ ...e, [n.id]: result.error }));
      if (result.error === "Invitation introuvable.") setClubState(n.entityId, { id: entry.id, state: "expired" });
      return;
    }
    const state = result.status === "active" ? "joined" : result.status === "pending" ? "requested" : result.status === "declined" ? "declined" : "expired";
    setClubState(n.entityId, { id: entry.id, state });
  };

  // Changer d'avis après un refus : l'invitation redevient « en attente » (le club n'est pas prévenu).
  const reopenClubInvite = async (n) => {
    const entry = clubInv?.[n.entityId];
    if (!entry) return;
    setClubInvBusy(n.id);
    setClubInvErrors((e) => ({ ...e, [n.id]: null }));
    const result = await reopenClubInvitation(entry.id);
    setClubInvBusy(null);
    if (result.error) {
      setClubInvErrors((e) => ({ ...e, [n.id]: result.error }));
      if (result.error === "Invitation introuvable.") setClubState(n.entityId, { id: entry.id, state: "expired" });
      return;
    }
    setClubState(n.entityId, { id: entry.id, state: result.status === "pending" ? "pending" : "expired" });
  };

  // Une seule notification par club porte les boutons : la plus récente (les plus anciennes parlent
  // d'invitations déjà traitées).
  const latestClubNotifId = {};
  for (const n of notifications || []) {
    if (n.type !== "club_invitation" || !n.entityId) continue;
    const cur = (notifications || []).find((x) => x.id === latestClubNotifId[n.entityId]);
    if (!cur || new Date(n.createdAt).getTime() > new Date(cur.createdAt).getTime()) latestClubNotifId[n.entityId] = n.id;
  }

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
              // Invitation à un BibaClub : ce que le serveur dit de son état (rien tant qu'on ne le sait pas).
              const isClubInvite = n.type === "club_invitation";
              const clubEntry = isClubInvite && clubInv !== null && latestClubNotifId[n.entityId] === n.id ? clubInv[n.entityId] : undefined;
              const clubState = clubEntry?.state;
              let clubInfo = null;
              if (isClubInvite && clubInv !== null) {
                if (clubState === "joined") clubInfo = { text: "Vous avez rejoint le club.", strong: true };
                else if (clubState === "requested") clubInfo = { text: "Demande envoyée : un administrateur doit valider votre arrivée.", strong: true };
                else if (clubState === "declined") clubInfo = { text: "Invitation refusée.", strong: false };
                else if (clubState !== "pending") clubInfo = { text: "Cette invitation n'est plus en attente.", strong: false };
              }
              const clubBusy = clubInvBusy === n.id;
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
                    {n.previewText && n.type !== "story_tag" && (
                      <div style={{ fontSize: "12.5px", color: COLORS.ink, marginTop: "4px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        « {n.previewText} »
                      </div>
                    )}
                    {clubInfo && (
                      <div style={{ fontSize: "12px", color: clubInfo.strong ? COLORS.amber : COLORS.inkSoft, marginTop: "6px", fontWeight: 600 }}>{clubInfo.text}</div>
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

              if (clubState) {
                // Invitation à un BibaClub encore actionnable ou venant d'être traitée : boutons dans le fil,
                // et accès au club (toucher le texte, ou « Voir le club » / « Ouvrir le club »).
                const canOpen = !!(n.entityId && onOpenClub);
                const linkStyle = { background: "none", border: "none", padding: "4px 0", fontWeight: 700, fontSize: "13px", color: COLORS.amber, cursor: "pointer", textAlign: "left" };
                const primary = { flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: COLORS.paper, cursor: clubBusy ? "not-allowed" : "pointer", opacity: clubBusy ? 0.6 : 1 };
                const secondary = { flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: COLORS.inkSoft, cursor: clubBusy ? "not-allowed" : "pointer", opacity: clubBusy ? 0.6 : 1 };
                return (
                  <div
                    key={n.id}
                    style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", borderBottom: i === notifications.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`, padding: "14px 0", color: COLORS.ink }}
                  >
                    <div
                      onClick={clubState !== "declined" ? () => handleClick(n) : undefined}
                      style={{ display: "flex", alignItems: "center", gap: "12px", cursor: clubState !== "declined" && canOpen ? "pointer" : "default", opacity: n.read ? 0.85 : 1 }}
                    >
                      {content}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "52px" }}>
                      {clubState === "pending" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => respondClubInvite(n, true)} disabled={clubBusy} style={primary}>
                            Accepter
                          </button>
                          <button onClick={() => respondClubInvite(n, false)} disabled={clubBusy} style={secondary}>
                            Refuser
                          </button>
                        </div>
                      )}
                      {clubState === "declined" && (
                        <button onClick={() => reopenClubInvite(n)} disabled={clubBusy} style={{ ...secondary, flex: "none", alignSelf: "flex-start" }}>
                          Changer d'avis
                        </button>
                      )}
                      {clubState === "joined" && canOpen && (
                        <button onClick={() => onOpenClub(n.entityId)} style={{ ...primary, flex: "none", alignSelf: "flex-start" }}>
                          Ouvrir le club
                        </button>
                      )}
                      {(clubState === "pending" || clubState === "requested") && canOpen && (
                        <button onClick={() => onOpenClub(n.entityId)} style={linkStyle}>
                          Voir le club
                        </button>
                      )}
                      {clubInvErrors[n.id] && <p style={{ fontSize: "11.5px", color: "#FF3B3B", margin: 0 }}>{clubInvErrors[n.id]}</p>}
                    </div>
                  </div>
                );
              }

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
