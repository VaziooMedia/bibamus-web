// ============================================================
// Salon — enveloppe à trois onglets.
//
//   Salon : le tableau de bord existant, inchangé. C'est volontairement une
//           enveloppe : EventDashboardScreen fait plus de mille lignes et
//           n'avait pas besoin d'être réécrit pour gagner des onglets. Il
//           reçoit simplement la barre en propriété et la place lui-même,
//           entre le lieu et la ligne du mode.
//   Pulse : le fil de ce qui se passe DANS ce salon (tournées, arrivées,
//           départs). Rien à voir avec BibaPulse, qui est le réseau social.
//   Chat  : la conversation du salon — une vraie conversation BibaPing de
//           type "salon", pas un système de messages à part. L'historique
//           reste donc consultable dans BibaPing une fois la soirée finie.
//
// L'onglet Salon est celui par défaut à chaque ouverture : pendant une
// soirée, c'est la surface de travail, et personne ne doit tomber sur le chat
// en rouvrant l'app. Les deux autres portent une pastille de non-lus, pour
// qu'on sache qu'il se passe quelque chose sans avoir à y aller.
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EventDashboardScreen } from "./EventDashboardScreen.jsx";
import { ConversationScreen } from "./ConversationScreen.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { ensureSalonConversation, loadConversationUnreadCount, subscribeToMyMessages } from "../data/messaging.js";
import { loadUserIdsByBibroCodes } from "../data/profiles.js";
import { loadTokTargets, loadMyPendingToks, subscribeToToks } from "../data/toks.js";
import { TokModal } from "./TokModal.jsx";
import { formatTime, genderAgree } from "../utils.js";
import bibaPingIconUrl from "../assets/brand/bibaping.svg";
import tokIconUrl from "../assets/brand/tok.svg";

// Fil interne : tournées et mouvements de participants, mélangés par ordre chronologique.
// Tout vient du salon lui-même — aucune requête supplémentaire.
function buildSalonFeed(event) {
  const items = [];

  (event.rounds || []).forEach((r, index) => {
    items.push({
      id: `round-${r.id}`,
      at: r.createdAt,
      kind: "round",
      roundNumber: index + 1,
      buyerName: r.buyerName,
      offeredBy: r.offeredBy,
      paidByPot: r.paidByPot,
      drinkCount: (r.orders || []).length,
    });
  });

  (event.systemNotices || []).forEach((n) => {
    items.push({ id: `notice-${n.id}`, at: n.at, kind: n.type, name: n.name, gender: n.gender });
  });

  return items.filter((i) => i.at).sort((a, b) => b.at - a.at);
}

function SalonPulse({ feed }) {
  if (feed.length === 0) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0, fontWeight: 700 }}>Rien à raconter pour l'instant</p>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>Les tournées et les arrivées apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {feed.map((item) => (
        <div
          key={item.id}
          style={{
            background: COLORS.surface,
            border: `2px solid ${item.kind === "round" ? COLORS.paperAlt : COLORS.pinkFluo}`,
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: "13px", color: COLORS.ink }}>
            {item.kind === "round" && (
              <>
                <strong style={{ color: COLORS.amber }}>Tournée {item.roundNumber}</strong>
                {item.offeredBy
                  ? item.offeredBy.type === "venue"
                    ? " — offerte par la maison"
                    : " — offerte par un tiers"
                  : item.paidByPot
                  ? " — payée par la cagnotte"
                  : item.buyerName
                  ? ` — offerte par ${item.buyerName}`
                  : ""}
                {item.drinkCount > 0 && (
                  <span style={{ color: COLORS.inkSoft }}>
                    {` · ${item.drinkCount} verre${item.drinkCount > 1 ? "s" : ""}`}
                  </span>
                )}
              </>
            )}
            {item.kind === "joined" && (
              <>
                <strong>{item.name}</strong> a rejoint ce BibaRoom
              </>
            )}
            {item.kind === "left" && (
              <>
                <strong>{item.name}</strong> a quitté ce BibaRoom
              </>
            )}
            {item.kind === "safe" && (
              <>
                <strong>{item.name}</strong> signale être bien {genderAgree(item.gender, "arrivé", "arrivée")} à destination
              </>
            )}
          </span>
          <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, flexShrink: 0 }}>{formatTime(item.at)}</span>
        </div>
      ))}
    </div>
  );
}

// Pastille rouge d'un onglet.
function TabBadge({ count }) {
  if (!count) return null;
  return (
    <span
      style={{
        // À cheval sur la bordure du bouton, comme le badge "EN COURS" d'un BibaLive.
        position: "absolute",
        top: "-8px",
        right: "6px",
        minWidth: "17px",
        height: "17px",
        borderRadius: "999px",
        background: "#FF3B3B",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        boxSizing: "border-box",
        fontSize: "9.5px",
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function SalonTabsScreen(props) {
  const { event, myUserId, venue, onBack } = props;
  const [tab, setTab] = useState("salon");

  // Conversation du salon — résolue dès l'arrivée dans le salon, et pas seulement à l'ouverture
  // de l'onglet Chat : sans ça, la pastille ne pourrait jamais s'afficher avant qu'on y aille.
  const [conversation, setConversation] = useState(undefined); // undefined = en cours, null = échec
  const [chatUnread, setChatUnread] = useState(0);

  // Tok — chargé dès l'arrivée dans le salon, pour que la pastille du bouton existe avant
  // qu'on l'ouvre.
  const [tokOpen, setTokOpen] = useState(false);
  const [tokTargets, setTokTargets] = useState([]);
  const [pendingToks, setPendingToks] = useState([]);

  const salonCode = event?.salonCode || null;
  const eventName = event?.name || null;
  const participantCodes = (event?.participants || []).map((p) => p.code).filter(Boolean).join(",");

  useEffect(() => {
    setTab("salon");
  }, [event?.id]);

  useEffect(() => {
    if (!salonCode) {
      setConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Les participants sont enregistrés par leur code Bibax ; la conversation travaille avec
      // des identifiants de compte. La recherche-ou-création se fait côté serveur, seule à voir
      // la conversation déjà créée par quelqu'un d'autre.
      const codes = participantCodes ? participantCodes.split(",") : [];
      const byCode = await loadUserIdsByBibroCodes(codes);
      const memberIds = Object.values(byCode).filter(Boolean);
      const result = await ensureSalonConversation(salonCode, eventName, memberIds);
      if (cancelled) return;
      if (result?.error || !result?.id) {
        setConversation(null);
        return;
      }
      setConversation({
        id: result.id,
        kind: "salon",
        memberIds: memberIds.includes(myUserId) ? memberIds : [...memberIds, myUserId],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [salonCode, participantCodes, eventName, myUserId]);

  const refreshTok = useCallback(() => {
    if (!salonCode) return;
    loadTokTargets(salonCode).then(setTokTargets);
    loadMyPendingToks(salonCode).then(setPendingToks);
  }, [salonCode]);

  useEffect(() => {
    refreshTok();
  }, [refreshTok]);

  useEffect(() => {
    if (!salonCode) return;
    const unsubscribe = subscribeToToks(refreshTok);
    return unsubscribe;
  }, [salonCode, refreshTok]);

  const conversationId = conversation?.id || null;
  const refreshChatUnread = useCallback(() => {
    if (!conversationId) return;
    loadConversationUnreadCount(conversationId).then(setChatUnread);
  }, [conversationId]);

  // Relevé à l'arrivée, à chaque changement d'onglet (on sort du chat, les messages viennent
  // d'être lus), et dès qu'un message arrive.
  useEffect(() => {
    refreshChatUnread();
  }, [refreshChatUnread, tab]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToMyMessages(refreshChatUnread);
    return unsubscribe;
  }, [conversationId, refreshChatUnread]);

  // Pulse : le repère de dernière lecture reste sur l'appareil. Le fil est reconstruit à partir
  // du salon lui-même, il n'y a rien à stocker côté serveur.
  const feed = buildSalonFeed(event || {});
  const seenKey = `bibamus-salon-pulse-seen-${event?.id || ""}`;
  const [pulseSeenAt, setPulseSeenAt] = useState(() => {
    try {
      return parseInt(localStorage.getItem(seenKey) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const pulseUnread = feed.filter((i) => i.at > pulseSeenAt).length;
  const newestFeedAt = feed.length > 0 ? feed[0].at : 0;

  useEffect(() => {
    if (tab !== "pulse" || newestFeedAt <= pulseSeenAt) return;
    setPulseSeenAt(newestFeedAt);
    try {
      localStorage.setItem(seenKey, String(newestFeedAt));
    } catch {
      // best-effort
    }
  }, [tab, newestFeedAt, pulseSeenAt, seenKey]);

  if (!event) return null;

  // Libellé scindé : une fois l'onglet actif, seul le suffixe passe en blanc.
  const tabs = [
    { key: "salon", suffix: "Room", badge: 0 },
    { key: "pulse", suffix: "Pulse", badge: pulseUnread },
    { key: "chat", suffix: "Ping", badge: chatUnread },
  ];

  const tabBar = (
    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              background: active ? COLORS.surface : "none",
              border: `2px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "7px 6px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: active ? COLORS.amber : COLORS.inkSoft,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.key === "chat" && <img src={bibaPingIconUrl} alt="" style={{ height: "17px" }} />}
            {t.key === "pulse" && <NavIcon name="activity" size={18} color={COLORS.amber} />}
            <span>
              Biba
              <span style={{ color: active ? COLORS.ink : "inherit" }}>{t.suffix}</span>
            </span>
            <TabBadge count={t.badge} />
          </button>
        );
      })}
    </div>
  );

  // Volontairement différent des autres boutons de cette ligne : rond et plein, poussé à
  // l'extrême droite. Tok est une action sociale, pas un accès à un écran.
  const tokButton = salonCode ? (
    <button
      onClick={() => setTokOpen(true)}
      title="Envoyer un Tok"
      style={{
        position: "relative",
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        background: COLORS.amber,
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {/* Contrainte en hauteur uniquement, pour ne pas déformer un ratio non carré. Le filtre
          force l'icône en noir pur, quelle que soit sa couleur d'origine — il n'existe pas de
          version noire du fichier. */}
      <img src={tokIconUrl} alt="Tok" style={{ height: "20px", filter: "brightness(0)" }} />
      <TabBadge count={pendingToks.length} />
    </button>
  ) : null;

  if (tab === "salon") {
    return (
      <>
        <EventDashboardScreen {...props} tabBar={tabBar} tokButton={tokButton} />
        {tokOpen && (
          <TokModal
            salonCode={salonCode}
            targets={tokTargets}
            pending={pendingToks}
            myName={props.myName}
            onClose={() => setTokOpen(false)}
            onChanged={refreshTok}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "24px 0 0" }}>
      <div style={{ padding: "0 20px" }}>
        <PageHeader onBack={onBack} />
      </div>
      <div style={{ padding: "0 20px" }}>{tabBar}</div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 20px", marginBottom: "14px" }}>
        <EntityAvatar photoUrl={venue ? venue.profilePhotoUrl : null} photoEmoji={venue ? venue.avatarEmoji : null} size={34} />
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.name}
        </span>
      </div>

      {tab === "pulse" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          <SalonPulse feed={feed} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: "360px", display: "flex", flexDirection: "column", padding: "0 20px" }}>
          {!salonCode ? (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0, fontWeight: 700 }}>Pas de chat ici</p>
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>
                Le chat n'existe que pour un BibaRoom partagé, pas pour un événement gardé sur cet appareil.
              </p>
            </div>
          ) : conversation === undefined ? (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>Ouverture du chat...</p>
          ) : conversation === null ? (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>
              Le chat n'a pas pu être ouvert. Réessaie plus tard.
            </p>
          ) : (
            <ConversationScreen conversation={conversation} myUserId={myUserId} title={event.name} hideHeader onBack={() => {}} />
          )}
        </div>
      )}
    </div>
  );
}
