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
import { BobBadge, DrinkBadges } from "./DrinkDisplay.jsx";
import { capitalizeFirst, drinkTypeLabel, isAlcoholicDrink, nextId, normalizeForSearch } from "../utils.js";
import { loadSalon } from "../data/salons.js";

export function RoundComposeScreen({ event, draftFriends, setDraftFriends, draftOrders, setDraftOrders, activeFriendId, setActiveFriendId, bibros, myBibroCode, onBack, onSeeTicket, onUseBibaBobJoker }) {
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
    window.scrollTo(0, 0);
  };

  const addOrder = (drinkId) => {
    if (!activeFriendId) return;
    setDraftOrders((prev) => [...prev, { id: nextId(), friendId: activeFriendId, drinkId }]);
    if (jokerUnlockedFor === activeFriendId) {
      const drink = event.menu.find((d) => d.id === drinkId);
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
  const canValidateRound = draftOrders.length > 0;

  const roundTotal = draftOrders.reduce((sum, o) => {
    const d = event.menu.find((m) => m.id === o.drinkId);
    return sum + (d ? d.price : 0);
  }, 0);

  // Favorites: the 4 most-ordered drinks so far this event, so common rounds skip the folders entirely.
  const orderCounts = {};
  event.rounds.forEach((r) => r.orders.forEach((o) => (orderCounts[o.drinkId] = (orderCounts[o.drinkId] || 0) + 1)));

  // BibaBOB: while filtered, the person currently being ordered for only sees non-alcoholic
  // products across every browsing path — categories, search, and favorites alike.
  const visibleMenu = activeFriendFiltered ? event.menu.filter((d) => !isAlcoholicDrink(d)) : event.menu;

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

  const DrinkCard = ({ drink }) => {
    const count = countForFriendDrink(activeFriendId, drink.id);
    return (
      <div
        key={drink.id}
        style={{
          background: count > 0 ? COLORS.surfaceAlt : COLORS.paperAlt,
          border: `2px solid ${count > 0 ? COLORS.amber : "transparent"}`,
          borderRadius: "12px",
          padding: "10px 12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              {drink.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginTop: "2px" }}>
              {drink.volumeCl && VOLUME_DISPLAY_TYPES.includes(drink.type) && <span style={{ fontSize: "12.5px", fontWeight: 800, color: COLORS.amber }}>{drink.volumeCl} cl.</span>}
              <DrinkBadges drink={drink} size={10} />
            </div>
            {(drink.abv != null || drink.brewery) && (
              <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>
                {[drink.abv != null ? `${drink.abv.toFixed(1)}% ABV` : null, drink.brewery || null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          {!isOpenBar && (
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "14px", color: COLORS.ink, flexShrink: 0 }}>
              <MoneyAmount value={drink.price} currency={event.currency} />
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={() => removeLastOrderFor(activeFriendId, drink.id)}
            disabled={count === 0}
            style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: count === 0 ? "transparent" : COLORS.paperAlt, color: COLORS.inkSoft, fontSize: "17px", cursor: count === 0 ? "default" : "pointer", fontWeight: 700 }}
          >
            −
          </button>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", minWidth: "16px", textAlign: "center" }}>{count}</span>
          <button
            onClick={() => addOrder(drink.id)}
            style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: COLORS.amber, color: COLORS.paper, fontSize: "17px", cursor: "pointer", fontWeight: 700 }}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", marginTop: "-6px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "24px", fontWeight: 800, color: COLORS.amber }}>
          {!isOpenBar && <MoneyAmount value={roundTotal} currency={event.currency} />}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
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
                gap: "6px",
                background: isPaused ? COLORS.paperAlt : hasOrdered ? COLORS.amber : COLORS.burgundy,
                color: isPaused ? COLORS.inkSoft : hasOrdered ? COLORS.paper : "#fff",
                border: isPaused ? `2px solid ${COLORS.paperAlt}` : isActive ? "2px solid #fff" : `2px solid ${hasOrdered ? COLORS.amber : COLORS.burgundy}`,
                borderRadius: "999px",
                padding: "8px 8px 8px 16px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: isPaused ? "default" : "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                {isPaused && <NavIcon name="pause" size={12} color={COLORS.burgundy} />}
                {f.name}
                {f.isSelf && <span style={{ fontSize: "11px", opacity: 0.75 }}> (vous)</span>}
                {count > 0 && <span style={{ marginLeft: "6px", fontFamily: "'Urbanist', sans-serif", fontSize: "12px", opacity: 0.85 }}>({count})</span>}
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
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    color: hasOrdered ? COLORS.paper : "#fff",
                    fontSize: "12px",
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
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFriend()}
              placeholder="Participants sans compte - Prénom ou surnom"
              style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "12px", outline: "none" }}
            />
            <button onClick={() => addFriend()} style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, border: "none", borderRadius: "10px", padding: "0 18px", fontWeight: 700, fontSize: "18px", cursor: "pointer" }}>
              +
            </button>
          </div>
          {myBibrosNotAdded.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "6px" }}>DEPUIS TES BIBAX</div>
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

      {!activeCategory && !searching && event.menu.length > 4 && (
        <>
          <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} style={{ width: "100%" }}>
            {isOpenBar ? "Valider la tournée →" : isCagnotte ? "Valider, le pot paie →" : "Valider la commande →"}
          </PrimaryButton>
          <div style={{ marginBottom: "16px" }} />
        </>
      )}

      {favoriteDrinks.length > 0 && !activeCategory && !searching && (
        <>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: COLORS.amber }}>★</span> Favoris
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
            {favoriteDrinks.map((drink) => (
              <DrinkCard key={drink.id} drink={drink} />
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
                {isOpenBar ? "Valider la tournée →" : isCagnotte ? "Valider, le pot paie →" : "Valider la commande →"}
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
                searchResultsInCategory.map((drink) => <DrinkCard key={drink.id} drink={drink} />)
              )
            ) : (
              itemsIn(activeCategory).map((drink) => <DrinkCard key={drink.id} drink={drink} />)
            )}
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
                searchResultsAll.map((drink) => <DrinkCard key={drink.id} drink={drink} />)
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
        {isOpenBar ? "Valider la tournée →" : isCagnotte ? "Valider, le pot paie →" : "Valider la commande →"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
