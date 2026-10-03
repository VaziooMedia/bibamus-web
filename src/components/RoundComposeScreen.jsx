// ============================================================
// Écran de composition d'une tournée — copié tel quel depuis
// le prototype Claude. L'ancienne fonction fetchRoom (basée sur
// window.storage) est remplacée par loadSalon (Supabase).
// ============================================================
import React, { useState } from "react";
import { COLORS, MENU_CATEGORIES, VOLUME_DISPLAY_TYPES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, MoneyAmount } from "./ui.jsx";
import { BibaxSearchPicker } from "./Pickers.jsx";
import { BibazardModal } from "./BibazardModal.jsx";
import { BobBadge, DrinkBadges, getDrinkBadgeItems } from "./DrinkDisplay.jsx";
import { capitalizeFirst, drinkTypeLabel, isAlcoholicDrink, nextId, normalizeForSearch, flattenMenu, findMenuEntryById } from "../utils.js";
import { loadSalon } from "../data/salons.js";

// Un même produit peut exister sur la carte en plusieurs volumes ("Jupiler" 25cl. et 33cl.,
// jusqu'ici deux blocs distincts) — regroupés ici sous un seul nom, triés du plus petit volume
// au plus grand ; la sélection du volume se fait dans la carte elle-même (GroupedDrinkCard).
function groupDrinksByName(items) {
  const groups = [];
  const byName = new Map();
  for (const item of items) {
    const existing = byName.get(item.name);
    if (existing) {
      existing.push(item);
    } else {
      const variants = [item];
      byName.set(item.name, variants);
      groups.push({ key: item.name, variants });
    }
  }
  for (const g of groups) g.variants.sort((a, b) => (a.volumeCl || 0) - (b.volumeCl || 0));
  return groups;
}

// Définie hors du corps de RoundComposeScreen (pas comme avant) — sinon React la traite comme un
// nouveau type de composant à chaque rendu du parent, et démonte/remonte entièrement chaque carte
// au moindre changement d'état ailleurs sur l'écran, ce qui effacerait le volume choisi ici à
// chaque fois.
function GroupedDrinkCard({ variants, activeFriendId, countForFriendDrink, isOpenBar, currency, removeLastOrderFor, addOrder, flash }) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const [showInfo, setShowInfo] = useState(false);
  const selected = variants.find((v) => v.id === selectedId) || variants[0];
  const count = countForFriendDrink(activeFriendId, selected.id);
  const hasVolume = VOLUME_DISPLAY_TYPES.includes(selected.type) && selected.volumeCl;
  const hasMultipleVolumes = variants.length > 1;
  const hasInfo = selected.abv != null || selected.brewery || getDrinkBadgeItems(selected, { size: 10 }).length > 0;

  return (
    <div
      style={{
        background: count > 0 ? COLORS.surfaceAlt : COLORS.paperAlt,
        border: `2px solid ${count > 0 ? COLORS.amber : "transparent"}`,
        borderRadius: "12px",
        padding: "8px 10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
          {hasInfo && (
            <button
              onClick={() => setShowInfo((s) => !s)}
              title={showInfo ? "Masquer les détails" : "Voir les détails (degré, origine, producteur)"}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, opacity: showInfo ? 1 : 0.6 }}
            >
              <NavIcon name="info" size={14} color={COLORS.amber} />
            </button>
          )}
        </div>
        {!isOpenBar && (
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "14px", color: COLORS.ink, flexShrink: 0 }}>
            <MoneyAmount value={selected.price} currency={currency} jetonIcon="pink" />
          </span>
        )}
      </div>

      {showInfo && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", minWidth: 0 }}>
              <DrinkBadges drink={selected} size={10} />
            </div>
            {selected.abv != null && <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, flexShrink: 0 }}>{selected.abv.toFixed(1)}% ABV</div>}
          </div>
          {/* Sur sa propre ligne, dédiée — un nom de producteur peut être long, et le nom du
              produit lui-même l'est parfois déjà trop pour partager une ligne avec autre chose. */}
          {selected.brewery && <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "3px" }}>{selected.brewery}</div>}
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", minWidth: 0 }}>
          {hasMultipleVolumes
            ? variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  style={{
                    background: v.id === selectedId ? COLORS.amber : "transparent",
                    color: v.id === selectedId ? COLORS.paper : COLORS.inkSoft,
                    border: `1.5px solid ${v.id === selectedId ? COLORS.amber : COLORS.inkSoft}`,
                    borderRadius: "999px",
                    padding: "2px 8px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {v.volumeCl} cl.
                </button>
              ))
            : hasVolume && <span style={{ fontSize: "12.5px", fontWeight: 800, color: COLORS.amber }}>{selected.volumeCl} cl.</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => removeLastOrderFor(activeFriendId, selected.id)}
            disabled={count === 0}
            style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: count === 0 ? "transparent" : COLORS.paperAlt, color: COLORS.inkSoft, fontSize: "16px", cursor: count === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            −
          </button>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "15px", minWidth: "14px", textAlign: "center" }}>{count}</span>
          <button
            key={flash?.drinkId === selected.id ? flash.token : "idle"}
            onClick={() => addOrder(selected.id)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              border: "none",
              background: COLORS.amber,
              color: COLORS.paper,
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: 700,
              animation: flash?.drinkId === selected.id ? "round-add-flash 0.4s ease-out" : "none",
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoundComposeScreen({ event, mainScrollRef, draftFriends, setDraftFriends, draftOrders, setDraftOrders, activeFriendId, setActiveFriendId, bibros, myBibroCode, onBack, onSeeTicket, onUseBibaBobJoker }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [showBibazard, setShowBibazard] = useState(false);
  const [jokerUnlockedFor, setJokerUnlockedFor] = useState(null); // friendId currently spending their joker
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [room, setRoom] = useState(null);
  const isOpenBar = event.mode === "openbar";
  const isCagnotte = event.mode === "cagnotte";
  const isAddition = event.mode === "addition";

  const salonCode = event.salonCode;

  React.useEffect(() => {
    if (!salonCode) return;
    const refresh = async () => {
      try {
        const r = await loadSalon(salonCode);
        if (r) setRoom(r);
      } catch (e) {
        // silent fail on background refresh
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonCode]);

  // Real, code-carrying participants only merge/link against each other by exact matching code —
  // never by name, since two different real people can share a first name. Paused Bibax are left
  // out entirely here — they can't be added to a round, whether ordering for themselves or having
  // someone order on their behalf, until they resume from the BibaRoom card.
  const salonParticipants = salonCode ? (room?.participants || []).filter((p) => p.code !== myBibroCode && !p.paused) : [];
  const pausedCodes = new Set((room?.participants || []).filter((p) => p.paused).map((p) => p.code));
  const myPaused = pausedCodes.has(myBibroCode);

  const addFriend = (presetName) => {
    const name = capitalizeFirst((presetName ?? nameInput).trim());
    if (!name) return;
    if (draftFriends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setNameInput("");
      return;
    }
    setDraftFriends((prev) => [...prev, { id: nextId(), name }]);
    setNameInput("");
  };

  // Adding a real Bibax (from "Mes Bibax" or the live salon participant list) — if a free-typed
  // entry already has the exact same name, upgrade it in place (attach the code) instead of
  // creating a duplicate. Otherwise add fresh.
  const addRealBibro = (code, name) => {
    const displayName = capitalizeFirst(name);
    setDraftFriends((prev) => {
      const existingByCode = prev.find((f) => f.code === code);
      if (existingByCode) return prev; // already added
      const freeMatch = prev.find((f) => !f.code && !f.isSelf && f.name.toLowerCase() === displayName.toLowerCase());
      if (freeMatch) {
        return prev.map((f) => (f.id === freeMatch.id ? { ...f, name: displayName, code } : f));
      }
      return [...prev, { id: nextId(), name: displayName, code }];
    });
  };

  // Manually link an existing free-typed entry to a real Bibax — for when the names don't match
  // exactly (nickname vs real name), so no auto-merge could catch it.
  const removeFriend = (id) => {
    setDraftFriends((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFriendId === id) setActiveFriendId(next.length > 0 ? next[0].id : null);
      return next;
    });
    setDraftOrders((prev) => prev.filter((o) => o.friendId !== id));
  };

  const myBibrosNotAdded = bibros.filter((b) => !draftFriends.some((f) => f.code === b.code) && !pausedCodes.has(b.code));
  const salonParticipantsNotAdded = salonParticipants.filter((p) => !draftFriends.some((f) => f.code === p.code));
  const bibaBobStatus = event.bibaBob || {};
  const activeFriend = draftFriends.find((f) => f.id === activeFriendId) || null;
  const activeFriendBob = activeFriend && activeFriend.code ? bibaBobStatus[activeFriend.code] : null;
  // Filtered for the person currently being ordered for: zero tolerance always filters; a joker
  // holder is filtered too, unless they're actively spending it on this one add.
  const activeFriendFiltered = !!activeFriendBob && jokerUnlockedFor !== activeFriendId;

  const goToCategory = (cat) => {
    setQuery("");
    setActiveCategory(cat);
    // Le vrai défilement se passe dans le conteneur dédié de l'app, jamais la fenêtre elle-même
    // — window.scrollTo n'avait donc aucun effet réel ici.
    mainScrollRef?.current?.scrollTo(0, 0);
  };

  // Confirmation visuelle brève sur le bouton "+" lui-même — le compteur par produit, lui, revient
  // à 0 dès que le participant actif change juste après (comportement normal), ce qui donnait
  // l'impression qu'aucun clic n'avait été pris en compte. token force un nouveau cycle
  // d'animation même en cas de clics rapides et répétés sur le même produit.
  const [flash, setFlash] = useState(null);
  const addOrder = (drinkId) => {
    if (!activeFriendId) return;
    setDraftOrders((prev) => [...prev, { id: nextId(), friendId: activeFriendId, drinkId }]);
    const token = Date.now();
    setFlash({ drinkId, token });
    // Sans ce nettoyage, flash reste accroché indéfiniment — DrinkCard est redéfini à chaque
    // rendu de ce composant, donc React démonte/remonte entièrement les cartes au moindre
    // changement d'état (même un simple clic sur une étiquette de participant), et un flash
    // jamais effacé rejoue l'animation à chaque fois, sur un produit auquel on n'a pourtant
    // rien touché. Le token comparé ici évite d'effacer un flash plus récent si on enchaîne
    // vite sur un autre produit pendant la fenêtre de 450ms.
    setTimeout(() => setFlash((current) => (current?.token === token ? null : current)), 450);
    if (jokerUnlockedFor === activeFriendId) {
      const drink = findMenuEntryById(event.menu, drinkId);
      if (drink && isAlcoholicDrink(drink)) {
        onUseBibaBobJoker(activeFriend.code);
        setJokerUnlockedFor(null);
      }
    }
    // Passe automatiquement au prochain participant qui n'a pas encore de boisson — on peut
    // toujours revenir sur quelqu'un en cliquant sur son nom pour lui en ajouter une autre.
    // On exclut explicitement la personne qui vient d'être servie (l'état de sa commande n'est
    // pas encore à jour à ce stade du calcul).
    const eligible = draftFriends.filter((f) => !(f.code && pausedCodes.has(f.code)) && f.id !== activeFriendId);
    const currentIdx = draftFriends.findIndex((f) => f.id === activeFriendId);
    const afterCurrent = draftFriends.slice(currentIdx + 1).filter((f) => eligible.includes(f));
    const next = afterCurrent.find((f) => ordersForFriend(f.id).length === 0) || eligible.find((f) => ordersForFriend(f.id).length === 0);
    if (next) setActiveFriendId(next.id);
  };

  const removeLastOrderFor = (friendId, drinkId) => {
    setDraftOrders((prev) => {
      const idx = [...prev].reverse().findIndex((o) => o.friendId === friendId && o.drinkId === drinkId);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
  };

  const countForFriendDrink = (friendId, drinkId) => draftOrders.filter((o) => o.friendId === friendId && o.drinkId === drinkId).length;
  const ordersForFriend = (friendId) => draftOrders.filter((o) => o.friendId === friendId);

  const renderGroupedDrinks = (items) =>
    groupDrinksByName(items).map((group) => (
      <GroupedDrinkCard
        key={group.key}
        variants={group.variants}
        activeFriendId={activeFriendId}
        countForFriendDrink={countForFriendDrink}
        isOpenBar={isOpenBar}
        currency={event.currency}
        removeLastOrderFor={removeLastOrderFor}
        addOrder={addOrder}
        flash={flash}
      />
    ));
  const canValidateRound = draftOrders.length > 0;

  const roundTotal = draftOrders.reduce((sum, o) => {
    const d = findMenuEntryById(event.menu, o.drinkId);
    return sum + (d ? d.price : 0);
  }, 0);

  // Favorites: the 4 most-ordered drinks so far this event, so common rounds skip the folders entirely.
  const orderCounts = {};
  event.rounds.forEach((r) => r.orders.forEach((o) => (orderCounts[o.drinkId] = (orderCounts[o.drinkId] || 0) + 1)));

  // BibaBOB: while filtered, the person currently being ordered for only sees non-alcoholic
  // products across every browsing path — categories, search, and favorites alike.
  const flatMenu = flattenMenu(event.menu);
  const visibleMenu = activeFriendFiltered ? flatMenu.filter((d) => !isAlcoholicDrink(d)) : flatMenu;

  const favoriteDrinks = Object.entries(orderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => visibleMenu.find((d) => d.id === id))
    .filter(Boolean);

  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const countFor = (cat) => visibleMenu.filter((d) => categoryOf(d) === cat).length;
  const itemsIn = (cat) => visibleMenu.filter((d) => categoryOf(d) === cat);
  const uncategorizedCount = countFor("Non classé");

  const q = normalizeForSearch(query.trim());
  const searching = q.length > 0;
  const searchResultsAll = searching ? visibleMenu.filter((d) => normalizeForSearch(d.name).includes(q)) : [];
  const searchResultsInCategory = searching && activeCategory ? itemsIn(activeCategory).filter((d) => normalizeForSearch(d.name).includes(q)) : [];


  return (
    <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <style>{`
        @keyframes round-add-flash {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .round-friends-bar::-webkit-scrollbar { display: none; }
      `}</style>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", marginTop: "-6px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "24px", fontWeight: 800, color: COLORS.amber }}>
          {!isOpenBar && <MoneyAmount value={roundTotal} currency={event.currency} jetonIcon="pink" />}
        </span>
      </div>

      {/* Reste visible en permanence pendant le défilement — sans ça, on ajoute des boissons à
          l'aveugle une fois que la liste des produits a poussé les noms hors de l'écran. Défile
          horizontalement plutôt que de s'empiler sur plusieurs lignes, pour garder une hauteur
          fixe même avec beaucoup de participants. */}
      <div
        className="round-friends-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: COLORS.paper,
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          gap: "6px",
          padding: "8px 0",
          marginBottom: "4px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {draftFriends.map((f) => {
          const isActive = f.id === activeFriendId;
          const count = ordersForFriend(f.id).length;
          const hasOrdered = count > 0;
          const isPaused = f.code && pausedCodes.has(f.code);
          return (
            <div
              key={f.id}
              onClick={() => !isPaused && setActiveFriendId(isActive ? null : f.id)}
              title={isPaused ? "En pause — reprendra plus tard depuis le BibaRoom" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
                background: isPaused ? COLORS.paperAlt : hasOrdered ? COLORS.amber : COLORS.burgundy,
                color: isPaused ? COLORS.inkSoft : hasOrdered ? COLORS.paper : "#fff",
                // Sélectionné : contour blanc classique sur fond bordeaux — mais sur fond vert
                // fluo (déjà servi), le blanc s'y distingue mal, donc rose fluo à la place.
                border: isPaused
                  ? `1.5px solid ${COLORS.paperAlt}`
                  : isActive
                  ? `2.5px solid ${hasOrdered ? COLORS.pinkFluo : "#fff"}`
                  : `1.5px solid ${hasOrdered ? COLORS.amber : COLORS.burgundy}`,
                borderRadius: "999px",
                // Symétrique des deux côtés : sans ça, le nom de l'utilisateur lui-même (seul,
                // sans croix de suppression à droite) paraît décentré vers la gauche.
                padding: "5px 10px",
                fontWeight: 600,
                fontSize: "12.5px",
                cursor: isPaused ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {isPaused && <NavIcon name="pause" size={11} color={COLORS.burgundy} />}
                {f.name}
                {count > 0 && <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.85 }}>({count})</span>}
              </span>
              {f.code && bibaBobStatus[f.code] && (
                <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
                  <BobBadge />
                </span>
              )}
              {!f.isSelf && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFriend(f.id);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.18)",
                    border: "none",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: hasOrdered ? COLORS.paper : "#fff",
                    fontSize: "11px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAddPeopleOpen((o) => !o)}
        style={{ background: "none", border: `1.5px dashed ${COLORS.inkSoft}`, borderRadius: "999px", padding: "7px 14px", fontSize: "14px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer", alignSelf: "flex-start", marginBottom: "14px" }}
      >
        {addPeopleOpen ? "▲" : "+"}
      </button>

      {addPeopleOpen && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFriend()}
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 10px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
              />
              {!nameInput && (
                <span
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12.5px",
                    color: COLORS.inkSoft,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "calc(100% - 20px)",
                  }}
                >
                  Participants sans compte Bibamus
                </span>
              )}
            </div>
            <button onClick={() => addFriend()} style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, border: "none", borderRadius: "10px", padding: "0 18px", fontWeight: 700, fontSize: "18px", cursor: "pointer" }}>
              +
            </button>
          </div>
          {myBibrosNotAdded.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <BibaxSearchPicker bibros={myBibrosNotAdded} onPick={(b) => addRealBibro(b.code, b.alias || b.name)} />
            </div>
          )}
          {salonCode && salonParticipantsNotAdded.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "6px" }}>PARTICIPANTS DU SALON</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {salonParticipantsNotAdded.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => addRealBibro(p.code, p.name)}
                    style={{ background: "none", border: `1.5px dashed ${COLORS.sage}`, borderRadius: "999px", padding: "6px 12px", fontSize: "13px", color: COLORS.sage, cursor: "pointer" }}
                  >
                    + {p.name} ✓
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeFriend && activeFriendBob && (
        <div style={{ background: COLORS.surfaceAlt, border: `2px solid ${COLORS.bobBlue}`, borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <BobBadge /> BibaZERO actif — {activeFriendBob.tolerance === "zero" ? "tolérance zéro" : activeFriendBob.jokerUsed ? "joker déjà utilisé" : "avec 1 joker"}
          </span>
          {activeFriendBob.tolerance === "joker" && !activeFriendBob.jokerUsed && (
            <button
              onClick={() => setJokerUnlockedFor(jokerUnlockedFor === activeFriendId ? null : activeFriendId)}
              style={{
                display: "block",
                marginTop: "8px",
                background: jokerUnlockedFor === activeFriendId ? COLORS.bobBlue : "transparent",
                color: "#fff",
                border: `2px solid ${COLORS.bobBlue}`,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {jokerUnlockedFor === activeFriendId ? "Joker en cours — choisissez le verre exceptionnel" : "Utiliser le joker (1 verre exceptionnel)"}
            </button>
          )}
        </div>
      )}

      {!activeCategory && !searching && event.menu.length > 4 && (
        <>
          <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} style={{ width: "100%" }}>
            {isOpenBar ? "Valider la tournée →" : "Valider la commande →"}
          </PrimaryButton>
          <div style={{ marginBottom: "16px" }} />
        </>
      )}

      {!activeCategory && !searching && !event.isHome && event.menu.length > 0 && (
        <button
          onClick={() => setShowBibazard(true)}
          style={{
            background: COLORS.surfaceAlt,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "12px",
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "18px",
            width: "100%",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "14.5px" }}>
            <span style={{ color: COLORS.chalkWhite }}>Bib</span>
            <span style={{ color: COLORS.amber }}>Azard</span>
            <span style={{ color: COLORS.chalkWhite }}> — Le hasard a soif !</span>
          </span>
          <span style={{ fontSize: "13px", color: COLORS.chalkWhite, opacity: 0.7 }}>→</span>
        </button>
      )}

      {showBibazard && (
        <BibazardModal
          menu={visibleMenu}
          friendName={draftFriends.find((f) => f.id === activeFriendId)?.name || ""}
          onConfirm={(drinkId) => addOrder(drinkId)}
          onClose={() => setShowBibazard(false)}
        />
      )}

      {favoriteDrinks.length > 0 && !activeCategory && !searching && (
        <>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: COLORS.amber }}>★</span> Favoris
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px" }}>
            {groupDrinksByName(favoriteDrinks).map((group) => (
              <GroupedDrinkCard
                key={group.key}
                variants={group.variants}
                activeFriendId={activeFriendId}
                countForFriendDrink={countForFriendDrink}
                isOpenBar={isOpenBar}
                currency={event.currency}
                removeLastOrderFor={removeLastOrderFor}
                addOrder={addOrder}
                flash={flash}
              />
            ))}
          </div>
        </>
      )}

      {activeCategory ? (
        <>
          <button
                onClick={() => goToCategory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "10px", display: "flex", alignItems: "center" }}
                title="Toutes les catégories"
                aria-label="Toutes les catégories"
              >
                <NavIcon name="back-triangle" size={20} color={COLORS.amber} />
              </button>
          <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            {drinkTypeLabel(activeCategory).toUpperCase()}
          </div>
          {itemsIn(activeCategory).length > 4 && (
            <>
              <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} style={{ width: "100%" }}>
                {isOpenBar ? "Valider la tournée →" : "Valider la commande →"}
              </PrimaryButton>
              <div style={{ marginBottom: "16px" }} />
            </>
          )}
          {itemsIn(activeCategory).length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher dans les ${drinkTypeLabel(activeCategory)}`}
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {searching ? (
              searchResultsInCategory.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucune boisson trouvée dans cette catégorie.</p>
              ) : (
                renderGroupedDrinks(searchResultsInCategory)
              )
            ) : (
              renderGroupedDrinks(itemsIn(activeCategory))
            )}
          </div>
          {/* Une catégorie fournie peut faire défiler longtemps avant d'atteindre de nouveau la
              flèche de retour tout en haut — ces deux raccourcis flottants restent accessibles
              quelle que soit la position de scroll dans la liste. */}
          <div style={{ position: "fixed", bottom: "90px", right: "16px", display: "flex", flexDirection: "column", gap: "10px", zIndex: 10 }}>
            <button
              onClick={() => mainScrollRef?.current?.scrollTo(0, 0)}
              title="Remonter en haut de la liste"
              aria-label="Remonter en haut de la liste"
              style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: COLORS.surface, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <span style={{ display: "flex", transform: "rotate(90deg)" }}>
                <NavIcon name="back-triangle" size={13} color={COLORS.amber} />
              </span>
            </button>
            <button
              onClick={() => goToCategory(null)}
              title="Toutes les catégories"
              aria-label="Toutes les catégories"
              style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: COLORS.amber, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <NavIcon name="back-triangle" size={13} color={COLORS.paper} />
            </button>
          </div>
        </>
      ) : (
        <>
          {event.menu.length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans toute la carte..."
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px" }}
            />
          )}
          {searching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {searchResultsAll.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>
              ) : (
                renderGroupedDrinks(searchResultsAll)
              )}
            </div>
          ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {MENU_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => goToCategory(cat)}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px" }}>
                <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                {drinkTypeLabel(cat)}
              </span>
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(cat)} →</span>
            </button>
          ))}
          {uncategorizedCount > 0 && (
            <button
              onClick={() => goToCategory("Non classé")}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px" }}>
                <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                Non classé
              </span>
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{uncategorizedCount} →</span>
            </button>
          )}
        </div>
          )}
        </>
      )}

      <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} style={{ marginTop: "auto", width: "100%" }}>
        {isOpenBar ? "Valider la tournée →" : "Valider la commande →"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
