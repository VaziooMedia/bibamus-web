// ============================================================
// Salon — enveloppe à trois onglets.
//
//   Salon : le tableau de bord existant, inchangé. C'est volontairement une
//           enveloppe : EventDashboardScreen fait plus de mille lignes et
//           n'avait pas besoin d'être touché pour gagner des onglets.
//   Pulse : le fil de ce qui se passe DANS ce salon (tournées, arrivées,
//           départs). Rien à voir avec BibaPulse, qui est le réseau social.
//   Chat  : la conversation du salon — une vraie conversation BibaPing de
//           type "salon", pas un système de messages à part. L'historique
//           reste donc consultable dans BibaPing une fois la soirée finie.
//
// L'onglet Salon est celui par défaut à chaque ouverture : pendant une
// soirée, c'est la surface de travail, et personne ne doit tomber sur le chat
// en rouvrant l'app.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EventDashboardScreen } from "./EventDashboardScreen.jsx";
import { ConversationScreen } from "./ConversationScreen.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { ensureSalonConversation } from "../data/messaging.js";
import { loadUserIdsByBibroCodes } from "../data/profiles.js";
import { formatTime, genderAgree } from "../utils.js";
import bibaPingIconUrl from "../assets/brand/bibaping.svg";

const TABS = [
  { key: "salon", label: "Salon" },
  { key: "pulse", label: "Pulse" },
  { key: "chat", label: "Chat" },
];

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

function SalonPulse({ event }) {
  const feed = buildSalonFeed(event);

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

function SalonChat({ event, myUserId, myName }) {
  // undefined = pas encore tenté, null = échec
  const [conversation, setConversation] = useState(undefined);

  useEffect(() => {
    if (!event.salonCode) return;
    let cancelled = false;
    (async () => {
      // Les participants sont enregistrés par leur code Bibax ; la conversation travaille avec
      // des identifiants de compte. On crée la conversation si elle n'existe pas encore, et on
      // y réinscrit les présents à chaque ouverture — ce qui rattrape aussi les arrivées
      // survenues depuis la dernière fois.
      const codes = (event.participants || []).map((p) => p.code).filter(Boolean);
      const byCode = await loadUserIdsByBibroCodes(codes);
      const memberIds = Object.values(byCode).filter(Boolean);
      const result = await ensureSalonConversation(event.salonCode, event.name, memberIds);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.salonCode, (event.participants || []).length]);

  if (!event.salonCode) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0, fontWeight: 700 }}>Pas de chat ici</p>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "6px 0 0" }}>
          Le chat n'existe que pour un BibaRoom partagé, pas pour un événement gardé sur cet appareil.
        </p>
      </div>
    );
  }

  if (conversation === undefined) {
    return <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>Ouverture du chat...</p>;
  }

  if (conversation === null) {
    return (
      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "24px 0" }}>
        Le chat n'a pas pu être ouvert. Réessaie plus tard.
      </p>
    );
  }

  return <ConversationScreen conversation={conversation} myUserId={myUserId} title={event.name} hideHeader onBack={() => {}} />;
}

export function SalonTabsScreen(props) {
  const { event, myUserId, myName, venue, onBack, onAddStory, onOpenStoryAuthor } = props;
  const [tab, setTab] = useState("salon");

  // L'onglet Salon redevient l'onglet actif dès qu'on change de salon.
  useEffect(() => {
    setTab("salon");
  }, [event?.id]);

  if (!event) return null;

  // Le tableau de bord porte déjà son propre en-tête et sa propre mise en page : on le rend tel
  // quel, avec juste la barre d'onglets au-dessus.
  const tabBar = (
    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: active ? COLORS.surface : "none",
              border: `2px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "7px 10px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: active ? COLORS.amber : COLORS.inkSoft,
              cursor: "pointer",
            }}
          >
            {t.key === "chat" && <img src={bibaPingIconUrl} alt="" style={{ height: "14px" }} />}
            {t.key === "pulse" && <NavIcon name="activity" size={14} color={active ? COLORS.amber : COLORS.inkSoft} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );

  // Le tableau de bord place lui-même la barre, entre le lieu et la ligne du mode : c'est le
  // seul endroit où elle ne coupe pas la lecture de l'en-tête.
  if (tab === "salon") {
    return <EventDashboardScreen {...props} tabBar={tabBar} />;
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
          <SalonPulse event={event} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: "360px", display: "flex", flexDirection: "column", padding: "0 20px" }}>
          <SalonChat event={event} myUserId={myUserId} myName={myName} />
        </div>
      )}
    </div>
  );
}
