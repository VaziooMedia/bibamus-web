// ============================================================
// Tableau de bord d'un salon/événement — copié tel quel depuis
// le prototype Claude. C'est l'écran le plus dense de toute
// l'app (Jetons, Participants, Notes intermédiaires, cagnotte,
// note finale, section BibaRoom...).
// ============================================================
import React, { useState } from "react";
import { COLORS, EVENT_MODE_LABELS, EVENT_MODE_DESC } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar, PageHeader, BackFooterLink, PrimaryButton, MoneyAmount } from "./ui.jsx";
import { ParticipantsEditor } from "./Pickers.jsx";
import { PotCard, SalonSection, FinalTotalCard, SplitBillCard, BibaBobModal } from "./DashboardParts.jsx";
import { BibaMusicSection } from "./BibaMusicSection.jsx";
import { formatDate, formatTime, nextId, normalizeForSearch, kcalForDrink, computeMissingVenueItems } from "../utils.js";
import { loadSalon } from "../data/salons.js";

export function EventDashboardScreen({ event, venue, drinksDirectory, eventTotal, onNewRound, onManageMenu, onBack, updateEvent, myName, myBibroCode, bibros, onAdjustVenuePersonalDrink, onCloseEvent, onOpenSettings, onDeleteRound, onEditRound, onActivateBibaBob, onDeactivateBibaBob, goToBibaMusic }) {
  const [showPersonalDetail, setShowPersonalDetail] = useState(false);
  const [caloriesHidden, setCaloriesHidden] = useState(false);
  const [personalDrinkQuery, setPersonalDrinkQuery] = useState("");
  const [expandedRoundIds, setExpandedRoundIds] = useState(() => new Set());
  const [showRoundsList, setShowRoundsList] = useState(true);
  const [amIPaused, setAmIPaused] = useState(false);
  const [pausedCodes, setPausedCodes] = useState(new Set());

  React.useEffect(() => {
    if (!event.salonCode) {
      setAmIPaused(false);
      setPausedCodes(new Set());
      return;
    }
    let cancelled = false;
    loadSalon(event.salonCode)
      .then((r) => {
        if (!cancelled && r) {
          setAmIPaused(!!r.participants?.find((p) => p.code === myBibroCode)?.paused);
          setPausedCodes(new Set((r.participants || []).filter((p) => p.paused).map((p) => p.code)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event.salonCode, myBibroCode]);

  const toggleRoundExpanded = (id) =>
    setExpandedRoundIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [confirmClose, setConfirmClose] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [bibaZeroMenuOpen, setBibaZeroMenuOpen] = useState(false);
  // Pause: for events spanning several days (a festival, say) — a simple on/off flag with a
  // timestamp of when it was last toggled, shown as a badge. Doesn't split "today"'s stats by
  // day; it's a status marker so the group knows the event is on hold, not a per-day ledger.
  const togglePause = () => updateEvent(event.id, (e) => ({ ...e, paused: !e.paused, pausedAt: !e.paused ? Date.now() : null }));
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [confirmDeleteRoundId, setConfirmDeleteRoundId] = useState(null);
  const [participantsEditorOpen, setParticipantsEditorOpen] = useState(false);
  const [bibaBobModal, setBibaBobModal] = useState(null); // { code, name, mode: "activate"|"deactivate" }
  const newVenueItemsCount = computeMissingVenueItems(event, venue, drinksDirectory).length;
  const menuIsEmpty = event.menu.length === 0;
  // If a venue is attached and its own menu was priced in a different currency than this event
  // uses, the copied prices are almost certainly wrong (e.g. a venue priced in euros, but this
  // event switched to jetons — the numbers carry over unchanged, now meaning something else).
  const menuCurrencyMismatch = !!venue && !!venue.defaultCurrency && venue.defaultCurrency !== event.currency;
  const [editBuyerId, setEditBuyerId] = useState(null);
  const [editOfferedByType, setEditOfferedByType] = useState(null);
  const [editOfferedByLabel, setEditOfferedByLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editSettledDirectly, setEditSettledDirectly] = useState(true);
  const isOpenBar = event.mode === "openbar";
  const isCagnotte = event.mode === "cagnotte";
  const isAddition = event.mode === "addition";

  // Same as formatMoney for euros, but drops the decimals entirely when they're .00 — used just
  // in this card for the smaller, secondary money figures.
  const formatEuroTrim = (value) => {
    const n = Math.round(value * 100) / 100;
    return n % 1 === 0 ? `${n} €` : `${n.toFixed(2).replace(".", ",")} €`;
  };

  const ticketsPurchased = (event.ticketPurchases || []).reduce((sum, p) => sum + p.quantity, 0);
  const purchasedTicketsCount = (event.ticketPurchases || []).filter((p) => !p.carriedOver && !p.given).reduce((sum, p) => sum + p.quantity, 0);
  const freeTicketsCount = (event.ticketPurchases || []).filter((p) => p.carriedOver).reduce((sum, p) => sum + p.quantity, 0);
  const givenTicketsCount = (event.ticketPurchases || []).filter((p) => p.given).reduce((sum, p) => sum - p.quantity, 0);
  const tabTotal = event.rounds.filter((r) => r.settledDirectly === false).reduce((sum, r) => sum + r.total, 0);
  // Jetons are personal — each participant buys their own stack. So only rounds I actually paid
  // for (as the buyer) should come out of my own jeton balance; a round someone else bought for
  // the group is covered by their jetons, not mine. Jetons I've put into a shared cagnotte pot
  // (the event may have switched modes mid-way) have equally left my stash, so they count too.
  const myPotContributions = (event.pot?.contributions || []).filter((c) => c.name === myName).reduce((sum, c) => sum + c.amount, 0);
  const myJetonSpend =
    event.rounds.reduce((sum, r) => {
      if (r.offeredBy || r.paidByPot) return sum;
      if (r.buyerName === myName) return sum + r.total + (r.tip || 0);
      return sum;
    }, 0) + myPotContributions;

  const startEditRound = (r) => {
    setEditingRoundId(r.id);
    setEditOfferedByType(r.offeredBy?.type || null);
    setEditOfferedByLabel(r.offeredBy?.label || "");
    setEditAmount(String(r.total));
    setEditSettledDirectly(r.settledDirectly !== false);
    if (r.paidByPot) {
      setEditBuyerId("pot");
    } else {
      const matchedFriend = r.friends.find((f) => f.name === r.buyerName);
      setEditBuyerId(matchedFriend ? matchedFriend.id : null);
    }
  };

  const submitEditRound = (r) => {
    const buyer = r.friends.find((f) => f.id === editBuyerId);
    onEditRound(r.id, {
      total: parseFloat(editAmount) || 0,
      settledDirectly: editOfferedByType ? true : editBuyerId === "pot" ? true : editSettledDirectly,
      buyerName: editOfferedByType || editBuyerId === "pot" ? null : buyer?.name || null,
      paidByPot: editBuyerId === "pot",
      offeredBy: editOfferedByType ? { type: editOfferedByType, label: editOfferedByLabel.trim() } : null,
    });
    setEditingRoundId(null);
  };

  const addPurchase = (carriedOver = false) => {
    const qty = parseInt(purchaseQty, 10);
    if (!qty || qty <= 0) return;
    updateEvent(event.id, (e) => ({
      ...e,
      ticketPurchases: [...(e.ticketPurchases || []), { id: nextId(), quantity: qty, timestamp: Date.now(), carriedOver }],
    }));
    setPurchaseQty("");
  };

  const addGivenAway = () => {
    const qty = parseInt(purchaseQty, 10);
    if (!qty || qty <= 0 || qty > ticketsPurchased) return;
    updateEvent(event.id, (e) => ({
      ...e,
      ticketPurchases: [...(e.ticketPurchases || []), { id: nextId(), quantity: -qty, timestamp: Date.now(), given: true }],
    }));
    setPurchaseQty("");
  };

  const personalTotal = event.personalOrders.length;

  const caloriesInfo = event.personalOrders.reduce(
    (acc, order) => {
      const drink = event.menu.find((d) => d.id === order.drinkId);
      const kcal = drink ? kcalForDrink(drink) : null;
      if (kcal != null) acc.total += kcal;
      else acc.missing += 1;
      return acc;
    },
    { total: 0, missing: 0 }
  );

  const myRounds = event.rounds.filter((r) => r.buyerName === myName);
  const myPending = myRounds.filter((r) => r.settledDirectly === false).reduce((sum, r) => sum + r.total, 0);
  const myTips = myRounds.filter((r) => r.settledDirectly !== false).reduce((sum, r) => sum + (r.tip || 0), 0);
  const myPaid = myRounds.filter((r) => r.settledDirectly !== false).reduce((sum, r) => sum + r.total, 0);
  const myRoundsTotal = myPending + myPaid;

  const addPersonal = (drinkId) => {
    updateEvent(event.id, (e) => ({
      ...e,
      personalOrders: [...e.personalOrders, { id: nextId(), drinkId, timestamp: Date.now() }],
    }));
    if (event.venueId) {
      const drink = event.menu.find((d) => d.id === drinkId);
      if (drink) onAdjustVenuePersonalDrink(event.venueId, drink.name, 1, kcalForDrink(drink));
    }
  };

  const removeLastPersonalFor = (drinkId) => {
    updateEvent(event.id, (e) => {
      const idx = [...e.personalOrders].reverse().findIndex((o) => o.drinkId === drinkId);
      if (idx === -1) return e;
      const realIdx = e.personalOrders.length - 1 - idx;
      return { ...e, personalOrders: e.personalOrders.filter((_, i) => i !== realIdx) };
    });
    if (event.venueId) {
      const drink = event.menu.find((d) => d.id === drinkId);
      if (drink) onAdjustVenuePersonalDrink(event.venueId, drink.name, -1, kcalForDrink(drink));
    }
  };

  const countPersonal = (drinkId) => event.personalOrders.filter((o) => o.drinkId === drinkId).length;

  const attendeeNames = new Set();
  event.rounds.forEach((r) => r.friends.forEach((f) => attendeeNames.add(f.name.toLowerCase())));
  const attendeesCount = attendeeNames.size;
  // The most recent round's participants is a natural proxy for "who's still here right now" —
  // anyone who left simply won't appear in the latest tournée anymore.
  const currentAttendeeNames = new Set();
  if (event.rounds.length > 0) event.rounds[event.rounds.length - 1].friends.forEach((f) => currentAttendeeNames.add(f.name.toLowerCase()));
  const currentAttendeesCount = currentAttendeeNames.size;

  const myBibaBob = (event.bibaBob || {})[myBibroCode] || null;
  const othersBibaBob = Object.entries(event.bibaBob || {})
    .filter(([code]) => code !== myBibroCode)
    .map(([, status]) => status);

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 2px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <EntityAvatar photoUrl={venue ? venue.profilePhotoUrl : null} photoEmoji={venue ? venue.avatarEmoji : null} size={48} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0, lineHeight: 1.1 }}>{event.name}</h1>
          {event.paused && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                border: `2px solid ${COLORS.jetonFluo}`,
                borderRadius: "999px",
                flexShrink: 0,
              }}
              title="Événement en pause"
            >
              <NavIcon name="pause" size={12} color={COLORS.jetonFluo} />
            </span>
          )}
        </div>
      </div>
      <div style={{ marginTop: "4px", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>
          {event.date && `${formatDate(event.date)} · `}
          {event.createdAt && `Start : ${formatTime(event.createdAt)}`}
        </span>
      </div>
      <div style={{ marginTop: "8px", marginBottom: "18px" }}>
        <button
          onClick={onOpenSettings}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}
        >
          <NavIcon name="switch" size={19} color={COLORS.amber} />
          <span style={{ fontSize: "12.5px", fontWeight: 700 }}>
            <span style={{ color: COLORS.ink }}>Mode </span>
            <span style={{ color: COLORS.amber }}>{EVENT_MODE_LABELS[event.mode] || event.mode}</span>
          </span>
          {EVENT_MODE_DESC[event.mode] && (
            <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500 }}>({EVENT_MODE_DESC[event.mode]})</span>
          )}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "18px" }}>
        <button
          onClick={onManageMenu}
          style={{ position: "relative", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "4px", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "7px 9px", fontWeight: 600, fontSize: "11px", color: COLORS.ink, cursor: "pointer" }}
        >
          <NavIcon name="bottle" size={12} color={COLORS.amber} />
          Produits
          {menuIsEmpty ? (
            <span
              style={{
                position: "absolute",
                top: "-9px",
                left: "-9px",
                background: COLORS.wine,
                color: "#fff",
                borderRadius: "999px",
                minWidth: "23px",
                height: "23px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
                border: "2px solid #fff",
                padding: "0 5px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
              title="Aucune boisson sur la carte — ajoutez-en via « Charger la carte générique » ou depuis le répertoire"
            >
              !
            </span>
          ) : menuCurrencyMismatch ? (
            <span
              style={{
                position: "absolute",
                top: "-9px",
                left: "-9px",
                background: COLORS.redFluo,
                color: "#000",
                borderRadius: "999px",
                minWidth: "23px",
                height: "23px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
                border: "2px solid #fff",
                padding: "0 5px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
              title={`Cet établissement affiche ses prix en ${venue.defaultCurrency === "euro" ? "euros" : "jetons"}, mais cet événement est en ${event.currency === "euro" ? "euros" : "jetons"} — les montants copiés sont probablement à corriger.`}
            >
              ⚠
            </span>
          ) : (
            newVenueItemsCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-9px",
                  left: "-9px",
                  background: COLORS.amber,
                  color: COLORS.paper,
                  borderRadius: "999px",
                  minWidth: "23px",
                  height: "23px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  border: "2px solid #fff",
                  padding: "0 5px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }}
                title={`${newVenueItemsCount} nouveau${newVenueItemsCount > 1 ? "x" : ""} produit${newVenueItemsCount > 1 ? "s" : ""} disponible${newVenueItemsCount > 1 ? "s" : ""}`}
              >
                +{newVenueItemsCount}
              </span>
            )
          )}
        </button>

        <div style={{ position: "relative" }}>
        <button
          onClick={() => setBibaZeroMenuOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "32px",
            background: myBibaBob ? COLORS.amber : "none",
            border: `2px solid ${myBibaBob ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "8px",
            cursor: "pointer",
          }}
          title={myBibaBob ? "BibaZERO actif" : "Mode BibaZERO"}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: myBibaBob ? COLORS.paper : COLORS.amber }}>ZERO</span>
        </button>
        {bibaZeroMenuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: "6px",
              zIndex: 10,
              background: COLORS.surfaceAlt,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              padding: "12px 14px",
              minWidth: "220px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            }}
          >
            {myBibaBob ? (
              <>
                <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>
                  <strong style={{ color: COLORS.ink }}>Actif</strong> — {myBibaBob.tolerance === "zero" ? "tolérance zéro" : myBibaBob.jokerUsed ? "joker déjà utilisé" : "avec 1 joker"}
                </p>
                {othersBibaBob.length > 0 && (
                  <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: 0 }}>
                    Aussi BOB ce soir : {othersBibaBob.map((s) => s.name).join(", ")}
                  </p>
                )}
                <button
                  onClick={() => {
                    setBibaBobModal({ code: myBibroCode, name: myName, mode: "deactivate" });
                    setBibaZeroMenuOpen(false);
                  }}
                  style={{ background: "none", border: "none", color: COLORS.bobBlue, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: "8px 0 0 0" }}
                >
                  Désactiver
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setBibaBobModal({ code: myBibroCode, name: myName, mode: "activate" });
                  setBibaZeroMenuOpen(false);
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontSize: "12.5px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
              >
                <NavIcon name="play" size={13} color={COLORS.amber} />
                Activer le mode <span><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>ZERO</span></span>
              </button>
            )}
          </div>
        )}
        </div>

        <button
          disabled
          style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px", height: "32px", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 10px", cursor: "not-allowed", opacity: 0.55 }}
          title="BibaMusic"
        >
          <NavIcon name="bibamusic" size={22} color={COLORS.amber} />
          <span style={{ fontSize: "11px", fontWeight: 700 }}>
            <span style={{ color: COLORS.ink }}>Biba</span>
            <span style={{ color: COLORS.amber }}>Music</span>
          </span>
          <span
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              fontSize: "8px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              color: COLORS.redFluo,
              background: COLORS.paperAlt,
              borderRadius: "999px",
              padding: "2px 6px",
            }}
          >
            Soon
          </span>
        </button>

        <div style={{ position: "relative" }}>
        <button
          onClick={() => setSessionMenuOpen((o) => !o)}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "60px",
            height: "32px",
            background: "none",
            border: `2px solid ${event.paused || confirmClose ? COLORS.jetonFluo : COLORS.paperAlt}`,
            borderRadius: "8px",
            cursor: "pointer",
          }}
          title="Pause / Fin de l'événement"
        >
          <NavIcon name="pause" size={12} color={event.paused ? COLORS.jetonFluo : COLORS.amber} />
          <span style={{ fontSize: "10px", color: COLORS.inkSoft }}>/</span>
          <NavIcon name="stop" size={12} color={confirmClose ? COLORS.redFluo : COLORS.amber} />
        </button>

        {sessionMenuOpen && (
          <div
            style={{
              position: "absolute",
              top: "36px",
              right: 0,
              zIndex: 10,
              background: COLORS.surfaceAlt,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              padding: "6px",
              minWidth: "190px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            }}
          >
            <button
              onClick={() => {
                togglePause();
                setSessionMenuOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                background: "none",
                border: "none",
                borderRadius: "7px",
                padding: "9px 10px",
                fontSize: "13px",
                fontWeight: 600,
                color: event.paused ? COLORS.jetonFluo : COLORS.ink,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <NavIcon name={event.paused ? "play" : "pause"} size={14} color={COLORS.jetonFluo} />
              {event.paused ? "Reprendre l'événement" : "Mettre l'événement en pause"}
            </button>
            <button
              onClick={() => (confirmClose ? onCloseEvent() : setConfirmClose(true))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                background: "none",
                border: "none",
                borderRadius: "7px",
                padding: "9px 10px",
                fontSize: "13px",
                fontWeight: 600,
                color: confirmClose ? COLORS.redFluo : COLORS.ink,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <NavIcon name="stop" size={14} color={COLORS.redFluo} />
              {confirmClose ? "Confirmer ?" : "Fin de l'événement"}
            </button>
            {confirmClose && (
              <p style={{ fontSize: "10.5px", color: COLORS.redFluo, padding: "0 10px 6px 10px", margin: 0 }}>
                Sortira de tes événements en cours — reste consultable dans l'historique.{" "}
                <button
                  onClick={() => setConfirmClose(false)}
                  style={{ background: "none", border: "none", color: COLORS.inkSoft, textDecoration: "underline", fontSize: "10.5px", cursor: "pointer", padding: 0 }}
                >
                  Annuler
                </button>
              </p>
            )}
          </div>
        )}
        </div>
      </div>


      <PrimaryButton
        onClick={onNewRound}
        disabled={event.paused}
        style={{
          width: "100%",
          marginTop: "18px",
          marginBottom: "16px",
          ...(event.paused ? { background: "none", border: `2px solid ${COLORS.jetonFluo}`, color: COLORS.jetonFluo } : {}),
        }}
      >
        {event.paused ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <NavIcon name="pause" size={15} color={COLORS.jetonFluo} /> Session en pause
          </span>
        ) : (
          "+ Nouvelle tournée"
        )}
      </PrimaryButton>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
        {(() => {
          // Rejoindre un salon via code ajoute à event.participants, pas à knownFriends — sans
          // cette fusion, la personne resterait invisible ici tout en apparaissant correctement
          // dans la suggestion de tournée et "+ Nouvelle tournée", qui lisent participants.
          const salonParticipantNames = (event.participants || [])
            .filter((p) => p.code !== myBibroCode)
            .map((p) => p.name)
            .filter(Boolean);
          const mergedNames = Array.from(
            new Set([...(event.knownFriends || []).filter((n) => n !== myName), ...salonParticipantNames])
          );
          return (
            <>
              <button
                onClick={() => setParticipantsEditorOpen((o) => !o)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, display: "flex", alignItems: "center", gap: "10px" }}>
                  Participants ({mergedNames.length + 1})
                </span>
                <span style={{ display: "inline-flex", transform: `rotate(${participantsEditorOpen ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
                  <NavIcon name="back-triangle" size={18} color={COLORS.amber} />
                </span>
              </button>
              {participantsEditorOpen && (
                <div style={{ marginTop: "12px" }}>
                  <ParticipantsEditor
                    names={mergedNames}
                    onChange={(names) =>
                      updateEvent(event.id, (e) => ({
                        ...e,
                        knownFriends: names.filter((n) => !salonParticipantNames.includes(n) && n !== myName),
                      }))
                    }
                    selfName={myName}
                    bibros={bibros}
                  />
                </div>
              )}
            </>
          );
        })()}
        <button
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            borderTop: `1px dashed ${COLORS.paperAlt}`,
            marginTop: "12px",
            paddingTop: "10px",
            cursor: "not-allowed",
            opacity: 0.55,
            textAlign: "left",
          }}
          title="Bientôt disponible"
        >
          <span style={{ fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            Pré-remplir avec un BibaClub
          </span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: COLORS.redFluo,
              background: COLORS.paperAlt,
              borderRadius: "999px",
              padding: "3px 8px",
            }}
          >
            Soon
          </span>
        </button>
      </div>

      <BibaMusicSection event={event} updateEvent={updateEvent} myBibroCode={myBibroCode} myName={myName} />

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Mes statistiques</div>

        <div style={{ display: "flex", marginTop: "10px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>{personalTotal}</div>
            <div style={{ fontSize: "10px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px" }}>VERRE{personalTotal !== 1 ? "S" : ""}</div>
          </div>
          {!isOpenBar && !isCagnotte && !isAddition && (
            <div style={{ flex: 1, textAlign: "center", borderLeft: `1px solid ${COLORS.paperAlt}` }}>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>
                <MoneyAmount value={myRoundsTotal} currency={event.currency} centered jetonIconSize={28} />
              </div>
              <div style={{ fontSize: "10px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px" }}>{myRoundsTotal > 0 ? "DÉPENSÉS" : "DÉPENSÉ"}</div>
            </div>
          )}
          <div style={{ flex: 1, textAlign: "center", borderLeft: `1px solid ${COLORS.paperAlt}` }}>
            {caloriesHidden ? (
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.inkSoft }}>—</div>
            ) : (
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px" }}>
                {caloriesInfo.total > 0 ? (
                  <>
                    <span style={{ color: COLORS.ink }}>≈</span> <span style={{ color: COLORS.amber }}>{caloriesInfo.total}</span>
                  </>
                ) : (
                  <span style={{ color: COLORS.amber }}>—</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "10px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px" }}>
                {caloriesHidden ? "KCAL" : `KCAL${caloriesInfo.missing > 0 ? ` (${caloriesInfo.missing} s.i.)` : ""}`}
              </span>
              <button
                onClick={() => setCaloriesHidden((h) => !h)}
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: 0 }}
                title={caloriesHidden ? "Afficher les calories" : "Masquer les calories — certains préfèrent ne pas les voir défiler en direct"}
              >
                <NavIcon name={caloriesHidden ? "eye-off" : "eye"} size={11} color={COLORS.inkSoft} />
              </button>
            </div>
          </div>
        </div>

        {!isOpenBar && !isCagnotte && !isAddition && event.rounds.length > 0 && (
          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}`, fontSize: "12.5px", color: COLORS.inkSoft }}>
            <div style={{ marginBottom: myRounds.length > 0 ? "8px" : 0 }}>
              Tournées offertes : <strong style={{ color: COLORS.amber }}>{myRounds.length}</strong> sur <strong style={{ color: COLORS.amber }}>{event.rounds.length}</strong>
            </div>
            {myRounds.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "180px" }}>
                  <span>Sur ma note</span>
                  <strong style={{ color: COLORS.redFluo, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>
                    <MoneyAmount value={myPending} currency={event.currency} />
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "180px" }}>
                  <span>Déjà payé</span>
                  <strong style={{ color: COLORS.amber, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>
                    <MoneyAmount value={myPaid} currency={event.currency} />
                  </strong>
                </div>
                {myTips > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "180px" }}>
                    <span>+ Pourboire</span>
                    <strong style={{ color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>
                      <MoneyAmount value={myTips} currency={event.currency} />
                    </strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "180px" }}>
                  <span>Total</span>
                  <strong style={{ color: COLORS.ink, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>
                    <MoneyAmount value={myRoundsTotal} currency={event.currency} />
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowPersonalDetail((s) => !s)}
          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "10px 0 0 0" }}
          title="Ajouter une boisson hors tournée"
        >
          <span style={{ display: "inline-flex", transform: `rotate(${showPersonalDetail ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
            <NavIcon name="back-triangle" size={20} color={COLORS.amber} />
          </span>
        </button>

        {showPersonalDetail && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "6px" }}>Ajouter une boisson hors tournée</div>
            {amIPaused && (
              <p style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.bobYellow, marginBottom: "8px" }}>
                <NavIcon name="pause" size={12} color={COLORS.bobYellow} />
                Tu es en pause — reprends depuis le BibaRoom pour pouvoir t'ajouter une boisson.
              </p>
            )}
            <input
              value={personalDrinkQuery}
              onChange={(e) => setPersonalDrinkQuery(e.target.value)}
              placeholder="Chercher une boisson..."
              autoFocus
              disabled={amIPaused}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "9px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none", opacity: amIPaused ? 0.5 : 1 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {(() => {
                const q = normalizeForSearch(personalDrinkQuery.trim());
                const searching = q.length > 0;
                const list = searching
                  ? event.menu.filter((d) => normalizeForSearch(d.name).includes(q))
                  : event.menu.filter((d) => countPersonal(d.id) > 0);
                if (list.length === 0) {
                  return searching ? (
                    <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic", margin: 0 }}>Aucune boisson ne correspond.</p>
                  ) : null;
                }
                return list.map((drink) => {
                  const count = countPersonal(drink.id);
                  return (
                    <div
                      key={drink.id}
                      style={{ background: count > 0 ? COLORS.paperAlt : "transparent", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{drink.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => removeLastPersonalFor(drink.id)}
                          disabled={count === 0}
                          style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: COLORS.surface, fontSize: "13px", fontWeight: 700, cursor: count === 0 ? "default" : "pointer" }}
                        >
                          −
                        </button>
                        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", minWidth: "12px", textAlign: "center" }}>{count}</span>
                        <button
                          onClick={() => !amIPaused && addPersonal(drink.id)}
                          disabled={amIPaused}
                          style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: amIPaused ? COLORS.paperAlt : COLORS.amber, fontSize: "13px", fontWeight: 700, cursor: amIPaused ? "default" : "pointer", color: amIPaused ? COLORS.inkSoft : COLORS.paper }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
        <button
          onClick={() => setShowRoundsList((s) => !s)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", marginBottom: showRoundsList ? "8px" : 0 }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Notes intermédiaires</span>
          <span style={{ display: "inline-flex", transform: `rotate(${showRoundsList ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
            <NavIcon name="back-triangle" size={16} color={COLORS.amber} />
          </span>
        </button>
        {showRoundsList && (
          <>
        {event.rounds.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune tournée offerte pour l'instant.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...event.rounds].reverse().map((r, i) => {
            const expanded = expandedRoundIds.has(r.id);
            const isEditing = editingRoundId === r.id;
            return (
              <div key={r.id} style={{ background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    <strong>
                      Tournée <span style={{ color: COLORS.amber }}>{event.rounds.length - i}</span>
                    </strong>
                  </span>
                  {!isOpenBar && (
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: r.offeredBy ? COLORS.amber : isAddition || r.settledDirectly === false ? COLORS.redFluo : COLORS.amber }}>
                      <MoneyAmount value={r.total} currency={event.currency} />
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <button
                    onClick={() => toggleRoundExpanded(r.id)}
                    style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    title={expanded ? "Cacher les participants" : "Voir les participants"}
                  >
                    <span style={{ display: "inline-flex", transform: `rotate(${expanded ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
                      <NavIcon name="back-triangle" size={16} color={COLORS.amber} />
                    </span>
                  </button>
                </div>
                {expanded && (
                  <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
                    {/* 1. Offert par X */}
                    <div style={{ fontSize: "12.5px", color: COLORS.ink, marginBottom: "8px" }}>
                      {r.offeredBy
                        ? r.offeredBy.type === "venue"
                          ? "Offert par la maison"
                          : "Offert par un tiers"
                        : r.buyerName
                        ? `Offert par ${r.buyerName}`
                        : r.paidByPot
                        ? "Payée par la cagnotte"
                        : "Free"}
                    </div>

                    {/* 2. Précision */}
                    {r.offeredBy && r.offeredBy.label && (
                      <p style={{ fontSize: "12px", color: COLORS.ink, fontStyle: "italic", marginBottom: "8px" }}>"{r.offeredBy.label}"</p>
                    )}

                    {/* 3. Participants */}
                    <div style={{ marginBottom: "8px" }}>
                      {r.friends
                        .filter((f) => r.orders.some((o) => o.friendId === f.id))
                        .map((f) => (
                          <div key={f.id} style={{ fontSize: "13px", color: COLORS.inkSoft, padding: "2px 0" }}>
                            {f.name}
                          </div>
                        ))}
                    </div>

                    {/* 4. Réglé directement / dérivé — même ligne que les icônes modifier/supprimer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, flex: 1, minWidth: 0 }}>
                        {event.currency === "euro" && !isOpenBar && !r.offeredBy ? (
                          <span style={{ color: isAddition || r.settledDirectly === false ? COLORS.redFluo : COLORS.amber }}>
                            {isAddition ? "En attente du partage" : r.settledDirectly === false ? "Sur la note" : "Réglée directement"}
                          </span>
                        ) : r.offeredBy ? (
                          <span style={{ color: COLORS.inkSoft, fontWeight: 400 }}>Montant informatif — ne compte dans aucun total d'argent dépensé.</span>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                        {!isAddition && (
                          <button
                            onClick={() => (isEditing ? setEditingRoundId(null) : startEditRound(r))}
                            style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            title={isEditing ? "Annuler" : "Modifier"}
                          >
                            <NavIcon name={isEditing ? "x" : "pencil"} size={16} color={isEditing ? COLORS.amber : COLORS.ink} />
                          </button>
                        )}
                        <button
                          onClick={() => (confirmDeleteRoundId === r.id ? onDeleteRound(r.id) : setConfirmDeleteRoundId(r.id))}
                          style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          title={confirmDeleteRoundId === r.id ? "Confirmer la suppression" : "Supprimer"}
                        >
                          <NavIcon name="x" size={16} color={COLORS.redFluo} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isEditing && (
                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft }}>QUI OFFRE ?</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {r.friends.length > 1 &&
                        r.friends.map((f) => {
                          const isPaused = f.code && pausedCodes.has(f.code);
                          return (
                            <button
                              key={f.id}
                              disabled={isPaused}
                              onClick={() => {
                                setEditBuyerId(f.id);
                                setEditOfferedByType(null);
                              }}
                              title={isPaused ? "En pause — ne peut pas se voir attribuer une tournée" : undefined}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                background: !editOfferedByType && editBuyerId === f.id && !isPaused ? COLORS.amber : "transparent",
                                color: !editOfferedByType && editBuyerId === f.id && !isPaused ? COLORS.paper : COLORS.ink,
                                border: `2px solid ${!editOfferedByType && editBuyerId === f.id && !isPaused ? COLORS.amber : COLORS.paperAlt}`,
                                borderRadius: "999px",
                                padding: "5px 11px",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: isPaused ? "default" : "pointer",
                                opacity: isPaused ? 0.5 : 1,
                              }}
                            >
                              {isPaused && <NavIcon name="pause" size={11} color={COLORS.ink} />}
                              {f.isSelf ? "Moi" : f.name}
                            </button>
                          );
                        })}
                      <button
                        onClick={() => {
                          setEditBuyerId(editBuyerId === "pot" ? null : "pot");
                          setEditOfferedByType(null);
                        }}
                        style={{
                          background: !editOfferedByType && editBuyerId === "pot" ? COLORS.amber : "transparent",
                          color: !editOfferedByType && editBuyerId === "pot" ? COLORS.paper : COLORS.ink,
                          border: `2px solid ${!editOfferedByType && editBuyerId === "pot" ? COLORS.amber : COLORS.paperAlt}`,
                          borderRadius: "999px",
                          padding: "5px 11px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Payé par la cagnotte
                      </button>
                      <button
                        onClick={() => {
                          setEditOfferedByType(editOfferedByType === "venue" ? null : "venue");
                          setEditBuyerId(null);
                        }}
                        style={{
                          background: editOfferedByType === "venue" ? COLORS.amber : "transparent",
                          color: editOfferedByType === "venue" ? COLORS.paper : COLORS.ink,
                          border: `2px solid ${editOfferedByType === "venue" ? COLORS.amber : COLORS.paperAlt}`,
                          borderRadius: "999px",
                          padding: "5px 11px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Offert par la maison
                      </button>
                      <button
                        onClick={() => {
                          setEditOfferedByType(editOfferedByType === "thirdParty" ? null : "thirdParty");
                          setEditBuyerId(null);
                        }}
                        style={{
                          background: editOfferedByType === "thirdParty" ? COLORS.amber : "transparent",
                          color: editOfferedByType === "thirdParty" ? COLORS.paper : COLORS.ink,
                          border: `2px solid ${editOfferedByType === "thirdParty" ? COLORS.amber : COLORS.paperAlt}`,
                          borderRadius: "999px",
                          padding: "5px 11px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Un tiers
                      </button>
                    </div>
                    {editOfferedByType && (
                      <input
                        value={editOfferedByLabel}
                        onChange={(e) => setEditOfferedByLabel(e.target.value)}
                        placeholder="Précision (facultatif)"
                        style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "12.5px", outline: "none" }}
                      />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, flexShrink: 0 }}>MONTANT</div>
                      <input
                        type="number"
                        min="0"
                        step="0.10"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        style={{ width: "90px", padding: "7px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", fontFamily: "'Urbanist', sans-serif", outline: "none" }}
                      />
                      <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>€</span>
                    </div>
                    {!editOfferedByType && editBuyerId !== "pot" && (
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!editSettledDirectly}
                          onChange={(e) => setEditSettledDirectly(!e.target.checked)}
                          style={{ width: "15px", height: "15px", accentColor: COLORS.amber }}
                        />
                        Réglée plus tard, sur la note
                      </label>
                    )}
                    <button
                      onClick={() => submitEditRound(r)}
                      style={{ background: COLORS.amber, color: COLORS.paper, border: "none", borderRadius: "8px", padding: "9px", fontWeight: 700, fontSize: "13px", cursor: "pointer", marginTop: "4px" }}
                    >
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>

      {isCagnotte && <PotCard event={event} updateEvent={updateEvent} myName={myName} />}


      {!isOpenBar && !isCagnotte && (
        <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px 18px", marginBottom: "16px" }}>
          {event.currency === "jeton" ? (
            <>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Mes jetons</div>
              <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: "10px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <NavIcon name="jeton-token" size={28} color="#39FF14" />
                  </div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.chalkWhite, lineHeight: 1.3 }}>{ticketsPurchased - myJetonSpend}</div>
                  <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px" }}>RESTANTS</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <NavIcon name="jeton-token" size={28} color="#ef1700" />
                  </div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.chalkWhite, lineHeight: 1.3 }}>{myJetonSpend}</div>
                  <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px" }}>DÉPENSÉS</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>
                {event.finalTotal != null ? (
                  "NOTE FINALE DU BAR"
                ) : (
                  <>
                    Total général pour cette session <span style={{ fontSize: "12px", opacity: 0.7 }}>≈</span>
                  </>
                )}
              </div>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", color: COLORS.amber, lineHeight: 1.3, textAlign: "center" }}>
                <MoneyAmount
                  value={event.finalTotal != null ? event.finalTotal + (event.tip || 0) + event.rounds.reduce((s, r) => s + (r.tip || 0), 0) : eventTotal}
                  currency={event.currency}
                  centered
                />
              </div>
              {event.finalTotal != null && (
                <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "2px" }}>
                  Tournées sur la note :{" "}
                  <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.jetonFluo }}>
                    <MoneyAmount value={tabTotal} currency={event.currency} />
                  </span>
                  {Math.abs(event.finalTotal - tabTotal) < 0.01 ? (
                    <span style={{ color: COLORS.amber, fontWeight: 700 }}> · OK ✓</span>
                  ) : (
                    <>
                      {" · écart de "}
                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.redFluo }}>
                        <MoneyAmount value={Math.abs(event.finalTotal - tabTotal)} currency={event.currency} />
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {event.rounds.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${COLORS.chalkWhite}25` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.chalkWhite, lineHeight: 1 }}>{event.rounds.length}</div>
                <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
                  TOURNÉE{event.rounds.length !== 1 ? "S" : ""}
                  {!isAddition && (
                    <>
                      <br />
                      OFFERTE{event.rounds.length !== 1 ? "S" : ""}
                    </>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.chalkWhite, lineHeight: 1 }}>{currentAttendeesCount}</div>
                <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
                  BIBAX
                  <br />
                  EN DIRECT
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.chalkWhite, lineHeight: 1 }}>{attendeesCount}</div>
                <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
                  BIBAX
                  <br />
                  TOTAL
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isOpenBar && event.rounds.length > 0 && (
        <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px 18px", marginBottom: "16px", display: "flex", gap: "18px" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{event.rounds.length}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              TOURNÉE{event.rounds.length !== 1 ? "S" : ""}
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{currentAttendeesCount}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              BIBAX
              <br />
              PRÉSENTS
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{attendeesCount}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              BIBAX
              <br />
              TOTAL
            </div>
          </div>
        </div>
      )}

      {isCagnotte && event.rounds.length > 0 && (
        <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px 18px", marginBottom: "16px", display: "flex", gap: "18px" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{event.rounds.length}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              TOURNÉE{event.rounds.length !== 1 ? "S" : ""}
              <br />
              OFFERTE{event.rounds.length !== 1 ? "S" : ""}
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{currentAttendeesCount}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              BIBAX
              <br />
              PRÉSENTS
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.amber, lineHeight: 1 }}>{attendeesCount}</div>
            <div style={{ fontSize: "10px", opacity: 0.65, fontFamily: "'Urbanist', sans-serif", letterSpacing: "0.5px", marginTop: "2px", lineHeight: 1.4 }}>
              BIBAX
              <br />
              TOTAL
            </div>
          </div>
        </div>
      )}


      {event.currency === "jeton" && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px", textAlign: "center", position: "relative" }}>
          {event.jetonUnitValue > 0 && (
            <div style={{ position: "absolute", bottom: "10px", right: "14px", fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>
              {formatEuroTrim(event.jetonUnitValue)} / jeton
            </div>
          )}
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Jetons acquis par {myName} (moi)</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: COLORS.ink }}>{ticketsPurchased}</div>
          {event.jetonUnitValue > 0 ? (
            purchasedTicketsCount > 0 && (
              <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.amberDark }}>
                {formatEuroTrim(purchasedTicketsCount * event.jetonUnitValue)} dépensés
              </div>
            )
          ) : (
            <button
              onClick={onOpenSettings}
              style={{ background: "none", border: "none", color: COLORS.bobBlue, fontSize: "11.5px", fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              ⚠️ Valeur du jeton non définie — la renseigner
            </button>
          )}

          <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", marginTop: "12px", flexWrap: "wrap" }}>
            <input
              type="number"
              min="1"
              value={purchaseQty}
              onChange={(e) => setPurchaseQty(e.target.value)}
              style={{ width: "60px", padding: "9px 6px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", textAlign: "center", fontFamily: "'Urbanist', sans-serif" }}
            />
            <button
              onClick={() => addPurchase(false)}
              style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 10px", fontWeight: 700, fontSize: "12px", cursor: "pointer", color: COLORS.paper }}
            >
              Acheter
            </button>
            <button
              onClick={() => addPurchase(true)}
              title="Jetons obtenus sans les payer — reportés, donnés par un autre Bibax, trouvés par terre... peu importe la source"
              style={{ background: COLORS.jetonFluo, border: "none", borderRadius: "8px", padding: "9px 10px", fontWeight: 700, fontSize: "12px", cursor: "pointer", color: COLORS.paper }}
            >
              Gratuit
            </button>
            <button
              onClick={addGivenAway}
              title="Jeton donné à quelqu'un, ou perdu"
              style={{ background: COLORS.redFluo, border: "none", borderRadius: "8px", padding: "9px 10px", fontWeight: 700, fontSize: "12px", cursor: "pointer", color: "#000" }}
            >
              Donner
            </button>
          </div>

          {event.ticketPurchases.length > 0 && (
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.paper, background: COLORS.amber, borderRadius: "999px", padding: "3px 9px" }}>
                Achetés : {purchasedTicketsCount}
              </span>
              {freeTicketsCount > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.paper, background: COLORS.jetonFluo, borderRadius: "999px", padding: "3px 9px" }}>
                  Gratuits : {freeTicketsCount}
                </span>
              )}
              {givenTicketsCount > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#000", background: COLORS.redFluo, borderRadius: "999px", padding: "3px 9px" }}>
                  Donnés : {givenTicketsCount}
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600 }}>
            Jetons utilisés : {myJetonSpend} sur {ticketsPurchased}
          </div>
        </div>
      )}


      {event.currency === "euro" && !isOpenBar && (
        <div style={{ marginBottom: "0" }}>
          {isAddition ? (
            <SplitBillCard event={event} updateEvent={updateEvent} total={eventTotal} />
          ) : (
            (tabTotal >= 0.01 || event.finalTotal != null) && <FinalTotalCard event={event} updateEvent={updateEvent} roundsSum={tabTotal} />
          )}
        </div>
      )}






      {bibaBobModal && (
        <BibaBobModal
          friendName={bibaBobModal.name}
          storedPin={myBibaBob ? myBibaBob.pin : null}
          mode={bibaBobModal.mode}
          onActivate={(tolerance, pin) => {
            onActivateBibaBob(bibaBobModal.code, bibaBobModal.name, tolerance, pin);
            setBibaBobModal(null);
          }}
          onDeactivate={() => {
            onDeactivateBibaBob(bibaBobModal.code);
            setBibaBobModal(null);
          }}
          onClose={() => setBibaBobModal(null)}
        />
      )}


      <SalonSection event={event} updateEvent={updateEvent} myName={myName} myBibroCode={myBibroCode} bibros={bibros} />

      <PrimaryButton
        onClick={onNewRound}
        disabled={event.paused}
        style={{
          width: "100%",
          marginTop: "16px",
          ...(event.paused ? { background: "none", border: `2px solid ${COLORS.jetonFluo}`, color: COLORS.jetonFluo } : {}),
        }}
      >
        {event.paused ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <NavIcon name="pause" size={15} color={COLORS.jetonFluo} /> Session en pause
          </span>
        ) : (
          "+ Nouvelle tournée"
        )}
      </PrimaryButton>


      <BackFooterLink onClick={onBack} />

    </div>
  );
}
