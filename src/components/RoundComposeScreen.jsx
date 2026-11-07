// ============================================================
// Écran de composition d'une tournée — copié tel quel depuis
// le prototype Claude. L'ancienne fonction fetchRoom (basée sur
// window.storage) est remplacée par loadSalon (Supabase).
// ============================================================
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { COLORS, MENU_CATEGORIES, VOLUME_DISPLAY_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { NavIcon, TokenPinkIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, MoneyAmount, EntityAvatar } from "./ui.jsx";
import { BibaxSearchPicker } from "./Pickers.jsx";
import { BibazardModal } from "./BibazardModal.jsx";
import { BobBadge, DrinkBadges, getDrinkBadgeItems } from "./DrinkDisplay.jsx";
import { capitalizeFirst, displayedAbv, drinkTypeLabel, isAlcoholicDrink, nextId, makeSearchMatcher, entityNames, flattenMenu, isMenuEntryWithoutFiche, findMenuEntryById, defaultVolumeText, defaultServingModeText, canBeShot, startsAsShot, SERVING_MODE_OPTIONS, sanitizeDecimalText, sanitizeDigitsText, parsePositiveText, parsePriceText, parseTokensText, stepTokens } from "../utils.js";
import { SpiritKindToggle } from "./SpiritKindToggle.jsx";
import { loadSalon } from "../data/salons.js";
import { searchDrinks } from "../data/sharedDirectories.js";
import { useBeerDerivatives } from "../hooks/useBeerDerivatives.js";
import { baseDrinkId, drinkIdWithVariant, isShotEntry } from "../beerDerivatives.js";

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
function GroupedDrinkCard({ variants, activeFriendId, countForFriendDrink, isOpenBar, currency, removeLastOrderFor, addOrder, flash, derivativesFor }) {
  const [selectedId, setSelectedId] = useState(() => (variants.find((v) => v.isDefault) || variants[0]).id);
  const [showInfo, setShowInfo] = useState(false);
  const [variantCode, setVariantCode] = useState(null);
  const selected = variants.find((v) => v.id === selectedId) || variants[0];
  // Dérivés (Mazout, Tango…) que ce produit peut devenir : une rangée de pastilles (grises, roses quand active) sous les volumes, sans « Nature » : aucune pastille active = la bière telle quelle,
  // un second appui sur la pastille active la désactive. Le dérivé choisi s'ajoute à l'identifiant du verre : le compteur, le « + » et le « − » de la carte suivent donc la pastille active.
  // Les verres pris en Shot (catégorie « Shots » de la carte) n'ont jamais de dérivé : ceux d'un spiritueux ne concernent pas ses shots.
  const derivatives = derivativesFor && selected.fromDirectory && selected.sourceDrinkId && !isShotEntry(selected) ? derivativesFor(selected.sourceDrinkId) : [];
  const activeVariant = derivatives.some((d) => d.code === variantCode) ? variantCode : null;
  const orderId = drinkIdWithVariant(selected.id, activeVariant);
  // Le « + » clignote pour tout verre ajouté à cette carte, avec ou sans dérivé (la pastille se désactive juste après l'ajout).
  const flashHere = !!flash && baseDrinkId(flash.drinkId) === baseDrinkId(orderId);
  const count = countForFriendDrink(activeFriendId, orderId);
  // Pour la ligne « Dans la commande » : la bière telle quelle (« nature ») puis chaque dérivé.
  const countChoices = [{ code: null, name: "Nature" }, ...derivatives];
  const countsByChoice = derivatives.length > 0 ? countChoices.map((c) => ({ ...c, n: countForFriendDrink(activeFriendId, drinkIdWithVariant(selected.id, c.code)) })) : [];
  const totalCount = derivatives.length > 0 ? countsByChoice.reduce((sum, c) => sum + c.n, 0) : count;
  const hasVolume = VOLUME_DISPLAY_TYPES.includes(selected.type) && selected.volumeCl;
  const hasMultipleVolumes = variants.length > 1;
  const hasInfo = displayedAbv(selected) != null || selected.brewery || getDrinkBadgeItems(selected, { size: 10 }).length > 0;

  return (
    <div
      style={{
        background: totalCount > 0 ? COLORS.surfaceAlt : COLORS.paperAlt,
        border: `2px solid ${totalCount > 0 ? COLORS.amber : "transparent"}`,
        borderRadius: "12px",
        padding: "8px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <EntityAvatar photoUrl={selected.photoUrl} photoEmoji={selected.avatarEmoji} size={40} fallbackIcon="bottle" />
        <div style={{ flex: 1, minWidth: 0 }}>
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
                : hasVolume && (
                    // Même style "pilule" que les volumes sélectionnés multiples — pas une simple
                    // couleur de texte — même si rien n'est cliquable ici, un seul volume existant.
                    <span style={{ background: COLORS.amber, color: COLORS.paper, border: `1.5px solid ${COLORS.amber}`, borderRadius: "999px", padding: "2px 8px", fontSize: "11.5px", fontWeight: 700 }}>
                      {selected.volumeCl} cl.
                    </span>
                  )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => removeLastOrderFor(activeFriendId, orderId)}
                disabled={count === 0}
                style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: count === 0 ? "transparent" : COLORS.paperAlt, color: COLORS.inkSoft, fontSize: "16px", cursor: count === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                −
              </button>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "15px", minWidth: "14px", textAlign: "center" }}>{count}</span>
              <button
                key={flashHere ? flash.token : "idle"}
                onClick={() => {
                  addOrder(orderId);
                  // Le dérivé ne vaut que pour le verre ajouté : la pastille se désactive, le verre suivant est « nature » sauf nouveau choix.
                  setVariantCode(null);
                }}
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
              animation: flashHere ? "round-add-flash 0.4s ease-out" : "none",
            }}
          >
            +
              </button>
            </div>
          </div>

          {derivatives.length > 0 && (
            <>
              {/* Rangée de dérivés : défile à l'horizontale s'il y en a beaucoup ; grisées comme les volumes tant qu'elles sont inactives, rose fluo quand active (les volumes actifs sont verts). */}
              <div
                role="group"
                aria-label="Dérivé"
                style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", overflowX: "auto", flexWrap: "nowrap", paddingBottom: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
              >
                {derivatives.map((c) => {
                  const on = c.code === activeVariant;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setVariantCode(on ? null : c.code)}
                      style={{
                        background: on ? COLORS.pinkFluo : "transparent",
                        color: on ? COLORS.chalkWhite : COLORS.inkSoft,
                        border: `1.5px solid ${on ? COLORS.pinkFluo : COLORS.inkSoft}`,
                        borderRadius: "999px",
                        padding: "2px 8px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {totalCount > 0 && (
                <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "4px" }}>
                  Dans la commande :{" "}
                  {countsByChoice
                    .filter((c) => c.n > 0)
                    .map((c, i) => (
                      <React.Fragment key={c.code || "nature"}>
                        {i > 0 && " · "}
                        <strong style={{ color: COLORS.ink }}>
                          {c.n} {c.code ? c.name : "nature"}
                        </strong>
                      </React.Fragment>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showInfo && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
            {displayedAbv(selected) != null && <span style={{ fontSize: "11.5px", color: COLORS.inkSoft, flexShrink: 0 }}>{selected.abv.toFixed(1)}% ABV</span>}
            {displayedAbv(selected) != null && getDrinkBadgeItems(selected, { size: 10 }).length > 0 && (
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
            )}
            <DrinkBadges drink={selected} size={10} />
          </div>
          {/* Sur sa propre ligne, dédiée — un nom de producteur peut être long, et le nom du
              produit lui-même l'est parfois déjà trop pour partager une ligne avec autre chose. */}
          {selected.brewery && <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "3px" }}>{selected.brewery}</div>}
        </>
      )}
    </div>
  );
}

// Champs de la fenêtre « Ajouter à la carte » (BibAtlas) : étroits, valeur centrée. Le type de service prend la largeur de son texte.
const VOLUME_BLOCK_W = 84;
const PRICE_BLOCK_W = 96;
// Espace entre les parties de la fenêtre (au-dessus des blocs, sous les blocs, sous la phrase) : assez grand pour qu'un doigt
// qui règle une valeur n'atteigne pas le bouton « Ajouter ».
const SHEET_GAP = 24;
const encodeFieldStyle = { width: "100%", height: "46px", boxSizing: "border-box", padding: "0 10px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" };
const encodeLabelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px", whiteSpace: "nowrap" };

// Nombre de jetons : valeur centrée, avec deux flèches (+1 / −1) ; jamais en dessous de 0.
function TokenStepper({ value, onChange }) {
  const atZero = parseTokensText(value) <= 0;
  const arrowStyle = { flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0, cursor: "pointer" };
  return (
    <div style={{ position: "relative" }}>
      <input
        data-testid="bibatlas-tokens"
        aria-label="Jetons"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(sanitizeDigitsText(e.target.value))}
        placeholder="0"
        style={{ ...encodeFieldStyle, padding: "0 32px" }}
      />
      <div style={{ position: "absolute", top: "2px", bottom: "2px", right: "2px", width: "30px", display: "flex", flexDirection: "column" }}>
        <button data-testid="bibatlas-tokens-up" type="button" aria-label="Ajouter un jeton" onClick={() => onChange(stepTokens(value, 1))} style={arrowStyle}>
          <span style={{ display: "flex", transform: "rotate(-90deg)" }}><NavIcon name="chevron-right" size={14} color={COLORS.amber} /></span>
        </button>
        <button data-testid="bibatlas-tokens-down" type="button" aria-label="Retirer un jeton" disabled={atZero} onClick={() => onChange(stepTokens(value, -1))} style={{ ...arrowStyle, cursor: atZero ? "default" : "pointer", opacity: atZero ? 0.3 : 1 }}>
          <span style={{ display: "flex", transform: "rotate(90deg)" }}><NavIcon name="chevron-right" size={14} color={COLORS.amber} /></span>
        </button>
      </div>
    </div>
  );
}

// Pastille de catégorie — même style que les étiquettes de la recherche BibAtlas. Le nombre de
// produits n'est pas dedans : il s'affiche entre les pastilles et la liste.
function CategoryPill({ label, star = false, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        background: active ? COLORS.amber : "none",
        border: `2px solid ${COLORS.amber}`,
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12.5px",
        fontWeight: 700,
        color: active ? COLORS.paper : COLORS.ink,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {star && <span style={{ color: active ? COLORS.paper : COLORS.amber }}>★</span>}
      {label}
    </button>
  );
}

export function RoundComposeScreen({ event, mainScrollRef, draftFriends, setDraftFriends, draftOrders, setDraftOrders, activeFriendId, setActiveFriendId, bibros, myBibroCode, onBack, onSeeTicket, onUseBibaBobJoker, onAddBibAtlasProduct }) {
  // Pastille choisie : "all" (Tous), "favorites" (Favoris) ou le nom d'une catégorie.
  const [activePillRaw, setActivePillRaw] = useState("all");
  const [zeroOnly, setZeroOnly] = useState(false);
  // Les pastilles restent collées juste sous la barre des participants (elle-même collée en haut) :
  // on mesure donc sa hauteur. pillsAnchorRef marque la vraie place de la ligne de pastilles dans la page.
  const friendsBarRef = useRef(null);
  const pillsAnchorRef = useRef(null);
  const pillsRowRef = useRef(null);
  const [friendsBarH, setFriendsBarH] = useState(0);
  useLayoutEffect(() => {
    const el = friendsBarRef.current;
    if (el) setFriendsBarH(el.offsetHeight);
  });
  const pillsTop = Math.max(0, friendsBarH - 4);

  // BibAtlas : la carte d'un lieu n'est jamais garantie à 100% à jour — ce comble le trou en
  // cherchant directement dans le répertoire global, pour un produit absent de cette carte.
  const [bibAtlasQuery, setBibAtlasQuery] = useState("");
  const [bibAtlasResults, setBibAtlasResults] = useState([]);
  const [bibAtlasPicked, setBibAtlasPicked] = useState(null);
  const [bibAtlasVolume, setBibAtlasVolume] = useState("");
  const [bibAtlasPrice, setBibAtlasPrice] = useState("");
  const [bibAtlasServing, setBibAtlasServing] = useState("");
  // Spiritueux dont la fiche a la case « Shot » : pris en shot ou non (au départ : le choix par défaut de la fiche).
  const [bibAtlasAsShot, setBibAtlasAsShot] = useState(false);
  const [bibAtlasSaving, setBibAtlasSaving] = useState(false);
  useEffect(() => {
    const q = bibAtlasQuery.trim();
    if (q.length < 2) {
      setBibAtlasResults([]);
      return;
    }
    const timer = setTimeout(() => {
      // Sans limite explicite : la limite par défaut de searchDrinks, la même que la barre de recherche BibAtlas, « Ajouter un Produit » de
      // BibaSolo et « Me servir » (@Home), pour que tous les produits trouvés s'affichent (une limite à 8 laissait croire qu'il n'y en avait que 8).
      searchDrinks(q).then(setBibAtlasResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [bibAtlasQuery]);
  const [query, setQuery] = useState("");
  const [showBibazard, setShowBibazard] = useState(false);
  const [jokerUnlockedFor, setJokerUnlockedFor] = useState(null); // friendId currently spending their joker
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [room, setRoom] = useState(null);
  const isOpenBar = event.mode === "openbar";
  const isJeton = event.currency === "jeton";
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

  // Changer de pastille : on revient au début de la liste, juste sous les pastilles collées — sans
  // remonter tout en haut de l'écran. Le vrai défilement se passe dans le conteneur dédié de l'app,
  // jamais la fenêtre elle-même — window.scrollTo n'avait donc aucun effet réel ici.
  const selectPill = (key) => {
    setQuery("");
    setActivePillRaw(key);
    const scroller = mainScrollRef?.current;
    if (!scroller) return;
    const anchor = pillsAnchorRef.current;
    if (!anchor) {
      scroller.scrollTo(0, 0);
      return;
    }
    const natural = anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const target = Math.max(0, natural - pillsTop);
    if (scroller.scrollTop > target) scroller.scrollTo(0, target);
  };

  // Confirmation visuelle brève sur le bouton "+" lui-même — le compteur par produit, lui, revient
  // à 0 dès que le participant actif change juste après (comportement normal), ce qui donnait
  // l'impression qu'aucun clic n'avait été pris en compte. token force un nouveau cycle
  // d'animation même en cas de clics rapides et répétés sur le même produit.
  const [flash, setFlash] = useState(null);
  // Dérivés des bières (Mazout, Tango…) : lus pour les produits du répertoire de la carte ; rien ne change sans dérivé.
  const { forProduct: derivativesFor } = useBeerDerivatives(event.menu.filter((d) => d.fromDirectory && d.sourceDrinkId).map((d) => d.sourceDrinkId));
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
        derivativesFor={derivativesFor}
      />
    ));
  const canValidateRound = draftOrders.length > 0;

  const roundTotal = draftOrders.reduce((sum, o) => {
    const d = findMenuEntryById(event.menu, o.drinkId);
    return sum + (d ? d.price : 0);
  }, 0);

  // Favorites: the 4 most-ordered drinks so far this event, so common rounds skip the folders entirely.
  const orderCounts = {};
  event.rounds.forEach((r) => r.orders.forEach((o) => (orderCounts[baseDrinkId(o.drinkId)] = (orderCounts[baseDrinkId(o.drinkId)] || 0) + 1)));

  // BibaBOB: while filtered, the person currently being ordered for only sees non-alcoholic
  // products across every browsing path — categories, search, and favorites alike.
  // Un produit relié au répertoire mais sans nom (fiche supprimée, recopiée avant que la copie les ignore) n'est pas proposé : il apparaîtrait sans nom dans « Non classé ».
  const flatMenu = flattenMenu(event.menu.filter((d) => !isMenuEntryWithoutFiche(d)));
  // Le filtre BibaBob (participant au défi zéro alcool) et ce bouton manuel visent le même
  // résultat — l'un ou l'autre suffit à déclencher le filtrage, sans s'exclure mutuellement.
  const visibleMenu = activeFriendFiltered || zeroOnly ? flatMenu.filter((d) => !isAlcoholicDrink(d)) : flatMenu;

  const favoriteDrinks = Object.entries(orderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => visibleMenu.find((d) => d.id === id))
    .filter(Boolean);

  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const countFor = (cat) => visibleMenu.filter((d) => categoryOf(d) === cat).length;
  const itemsIn = (cat) => visibleMenu.filter((d) => categoryOf(d) === cat);

  // Pastilles : « Tous », « Favoris » (seulement s'il y en a), puis les catégories qui ont au moins un produit.
  const categoryPills = [...MENU_CATEGORIES, "Non classé"].filter((c) => countFor(c) > 0);
  const pillKeys = ["all", ...(favoriteDrinks.length > 0 ? ["favorites"] : []), ...categoryPills];
  // Si la pastille choisie disparaît (filtre « sans alcool » par exemple), on revient sur « Tous ».
  const activePill = pillKeys.includes(activePillRaw) ? activePillRaw : "all";
  const hasProducts = categoryPills.length > 0;
  // Nombre de produits affichés (une carte = un produit, même avec plusieurs volumes).
  const productCount = (items) => groupDrinksByName(items).length;
  const shownCount =
    activePill === "all"
      ? categoryPills.reduce((n, c) => n + productCount(itemsIn(c)), 0)
      : activePill === "favorites"
      ? productCount(favoriteDrinks)
      : productCount(itemsIn(activePill));
  const drinkListStyle = { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" };

  const handleConfirmBibAtlasAdd = async () => {
    if (!bibAtlasPicked) return;
    setBibAtlasSaving(true);
    const volumeCl = parsePositiveText(bibAtlasVolume);
    // Le prix est dans la devise du salon : des jetons (nombre entier) ou des euros.
    const price = isOpenBar ? 0 : isJeton ? parseTokensText(bibAtlasPrice) : parsePriceText(bibAtlasPrice);
    const created = await onAddBibAtlasProduct(bibAtlasPicked, { volumeCl, price, servingMode: bibAtlasServing, asShot: canBeShot(bibAtlasPicked) && bibAtlasAsShot });
    setBibAtlasSaving(false);
    if (!created) return;
    setBibAtlasPicked(null);
    setBibAtlasQuery("");
    setBibAtlasResults([]);
    // Direction la catégorie du produit tout juste ajouté, pour pouvoir le commander dans la
    // foulée — sans ça, il faudrait le rechercher une seconde fois dans sa propre catégorie.
    selectPill(categoryOf(created));
  };

  // Même règle de recherche que partout dans l'app (voir makeSearchMatcher).
  const matchesQuery = makeSearchMatcher(query);
  const searching = query.trim().length > 0;
  const searchResultsAll = searching ? visibleMenu.filter((d) => matchesQuery(entityNames(d))) : [];

  // La pastille choisie reste visible dans la ligne qui défile (ex. choisie par programme, ou après une recherche).
  useEffect(() => {
    const row = pillsRowRef.current;
    const btn = row ? row.querySelector('[aria-pressed="true"]') : null;
    if (!row || !btn) return;
    const r = row.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    row.scrollTo({ left: row.scrollLeft + (b.left - r.left) - (r.width - b.width) / 2, behavior: "smooth" });
  }, [activePill, searching]);


  return (
    <div style={{ padding: "8px 20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
      <style>{`
        @keyframes round-add-flash {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .round-friends-bar::-webkit-scrollbar { display: none; }
        .round-pills-row::-webkit-scrollbar { display: none; }
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
        ref={friendsBarRef}
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
        <button
          onClick={() => setAddPeopleOpen((o) => !o)}
          style={{ background: "none", border: `1.5px dashed ${COLORS.inkSoft}`, borderRadius: "999px", padding: "5px 10px", fontSize: "12.5px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer", flexShrink: 0 }}
        >
          {addPeopleOpen ? "▲" : "+"}
        </button>
      </div>

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

      {!searching && event.menu.length > 4 && (
        <>
          <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} withCheck style={{ width: "100%" }}>
            {isOpenBar ? "Valider la tournée" : "Valider la commande"}
          </PrimaryButton>
          <div style={{ marginBottom: "16px" }} />
        </>
      )}

      {!searching && !event.isHome && event.menu.length > 0 && (
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

          {event.menu.length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans toute la carte..."
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px" }}
            />
          )}
          <button
            onClick={() => setZeroOnly((z) => !z)}
            role="switch"
            aria-checked={zeroOnly}
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "none", border: "none", padding: "4px 0", cursor: "pointer", marginBottom: "12px" }}
          >
            {/* Piste + curseur qui glisse — pas un simple bouton qui change de couleur */}
            <span style={{ position: "relative", width: "40px", height: "22px", borderRadius: "999px", background: zeroOnly ? COLORS.amber : COLORS.paperAlt, flexShrink: 0, transition: "background 0.15s" }}>
              <span style={{ position: "absolute", top: "2px", left: zeroOnly ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink, textAlign: "left" }}>Produits sans alcool uniquement</span>
          </button>
          {searching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {searchResultsAll.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>
              ) : (
                renderGroupedDrinks(searchResultsAll)
              )}
            </div>
          ) : (
        <>
          <div ref={pillsAnchorRef} />
          {hasProducts ? (
            <>
              {/* Pastilles : une seule ligne qui défile sur le côté, collée sous la barre des
                  participants pendant le défilement de la liste. */}
              <div style={{ position: "sticky", top: `${pillsTop}px`, zIndex: 4, background: COLORS.paper, paddingBottom: "8px" }}>
                <div
                  ref={pillsRowRef}
                  className="round-pills-row"
                  style={{ display: "flex", flexWrap: "nowrap", gap: "8px", overflowX: "auto", padding: "8px 0", scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {pillKeys.map((key) => (
                    <CategoryPill
                      key={key}
                      label={key === "all" ? "Tous" : key === "favorites" ? "Favoris" : drinkTypeLabel(key)}
                      star={key === "favorites"}
                      active={key === activePill}
                      onClick={() => selectPill(key)}
                    />
                  ))}
                  {/* Espace en fin de ligne : la dernière pastille, une fois tout défilé, ne reste pas sous le fondu de droite. */}
                  <span aria-hidden="true" style={{ flex: "0 0 30px" }} />
                </div>
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "34px", background: `linear-gradient(to left, ${COLORS.paper}, transparent)`, pointerEvents: "none" }} />
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, margin: "0 0 10px" }}>
                {shownCount} produit{shownCount > 1 ? "s" : ""}
              </div>
              {activePill === "all" ? (
                categoryPills.map((cat) => (
                  <div key={cat}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                      {drinkTypeLabel(cat).toUpperCase()}
                    </div>
                    <div style={drinkListStyle}>{renderGroupedDrinks(itemsIn(cat))}</div>
                  </div>
                ))
              ) : (
                <div style={drinkListStyle}>{renderGroupedDrinks(activePill === "favorites" ? favoriteDrinks : itemsIn(activePill))}</div>
              )}
            </>
          ) : (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>
          )}

        {/* La carte d'un lieu n'est jamais garantie à 100% à jour — BibAtlas (le répertoire
            global) comble ce trou pour un produit absent de cette carte précise. */}
        <div style={{ marginTop: "4px", paddingTop: "16px", borderTop: `1px solid ${COLORS.paperAlt}`, marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "8px" }}>Produit absent de la carte ? Cherchez-le dans BibAtlas</div>
          <input
            value={bibAtlasQuery}
            onChange={(e) => setBibAtlasQuery(e.target.value)}
            placeholder="Chercher dans BibAtlas..."
            style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          {bibAtlasResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {bibAtlasResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setBibAtlasPicked(d);
                    // Spiritueux ou Shot : le choix par défaut de la fiche (seul un spiritueux avec la case « Shot » peut être un shot).
                    const asShot = startsAsShot(d);
                    setBibAtlasAsShot(asShot);
                    // Volume et type de service : ceux par défaut du produit (ceux du shot s'il commence en shot). Prix : 0,00 en euros (jamais le prix par défaut), 1 jeton en jetons.
                    setBibAtlasVolume(defaultVolumeText(d, asShot));
                    setBibAtlasServing(defaultServingModeText(d, asShot));
                    setBibAtlasPrice(isJeton ? "1" : "");
                  }}
                  style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={36} fallbackIcon="bottle" />
                  <span style={{ fontWeight: 600, fontSize: "14px", minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  {/* Sous-catégorie (ex. "Bière") plutôt que la catégorie elle-même (ex. "Bières &
                      Cidres") — déjà connue, puisqu'on cherche depuis une catégorie donnée. */}
                  <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{SUBTYPE_LABELS[d.beverageSubtype] || drinkTypeLabel(d.type)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {bibAtlasPicked && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={() => !bibAtlasSaving && setBibAtlasPicked(null)}>
            <div style={{ background: COLORS.paper, width: "100%", borderRadius: "16px 16px 0 0", padding: "20px", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
              <div data-encode="header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <EntityAvatar photoUrl={bibAtlasPicked.photoUrl} photoEmoji={bibAtlasPicked.avatarEmoji} size={44} fallbackIcon="bottle" />
                <div style={{ fontWeight: 700, fontSize: "16px", minWidth: 0, overflowWrap: "anywhere" }}>{bibAtlasPicked.name}</div>
              </div>

              {/* Spiritueux ou Shot : seulement pour un spiritueux dont la fiche a la case « Shot ». Changer de choix remet le volume et le type de
                  service par défaut de ce choix ; le prix, lui, n'est pas touché. */}
              {canBeShot(bibAtlasPicked) && (
                <SpiritKindToggle
                  asShot={bibAtlasAsShot}
                  style={{ marginTop: "14px" }}
                  onChange={(asShot) => {
                    if (asShot === bibAtlasAsShot) return;
                    setBibAtlasAsShot(asShot);
                    setBibAtlasVolume(defaultVolumeText(bibAtlasPicked, asShot));
                    setBibAtlasServing(defaultServingModeText(bibAtlasPicked, asShot));
                  }}
                />
              )}

              <div data-encode="row" style={{ display: "flex", alignItems: "flex-start", gap: "10px", margin: `${SHEET_GAP}px 0` }}>
                <div data-encode="volume" style={{ flex: `0 0 ${VOLUME_BLOCK_W}px`, minWidth: 0 }}>
                  <label htmlFor="bibatlas-volume" style={encodeLabelStyle}>Volume (cl.)</label>
                  <input
                    id="bibatlas-volume"
                    type="text"
                    inputMode="decimal"
                    value={bibAtlasVolume}
                    onChange={(e) => setBibAtlasVolume(sanitizeDecimalText(e.target.value, 6))}
                    placeholder="00"
                    style={encodeFieldStyle}
                  />
                </div>
                {!isOpenBar && (
                  <div data-encode="price" style={{ flex: `0 0 ${PRICE_BLOCK_W}px`, minWidth: 0 }}>
                    {isJeton ? (
                      <>
                        <label style={encodeLabelStyle}>
                          Jetons
                          <TokenPinkIcon size={14} />
                        </label>
                        <TokenStepper value={bibAtlasPrice} onChange={setBibAtlasPrice} />
                      </>
                    ) : (
                      <>
                        <label htmlFor="bibatlas-price" style={encodeLabelStyle}>Prix (€)</label>
                        <input
                          id="bibatlas-price"
                          type="text"
                          inputMode="decimal"
                          value={bibAtlasPrice}
                          onChange={(e) => setBibAtlasPrice(sanitizeDecimalText(e.target.value, 7))}
                          placeholder="0,00"
                          style={encodeFieldStyle}
                        />
                      </>
                    )}
                  </div>
                )}
                <div data-encode="service" style={{ flex: "0 0 auto" }}>
                  <label htmlFor="bibatlas-service" style={encodeLabelStyle}>Type de service</label>
                  <select
                    id="bibatlas-service"
                    value={bibAtlasServing}
                    onChange={(e) => setBibAtlasServing(e.target.value)}
                    style={{ ...encodeFieldStyle, textAlign: "left", padding: "0 8px" }}
                  >
                    <option value="">Non défini</option>
                    {SERVING_MODE_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p data-encode="note" style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: `0 0 ${SHEET_GAP}px 0` }}>Ce produit rejoindra la carte de ce lieu</p>

              <PrimaryButton onClick={handleConfirmBibAtlasAdd} disabled={bibAtlasSaving} style={{ width: "100%", marginBottom: "8px" }}>
                {bibAtlasSaving ? "Ajout..." : "Ajouter"}
              </PrimaryButton>
              <button
                onClick={() => !bibAtlasSaving && setBibAtlasPicked(null)}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer", width: "100%", padding: "8px" }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        </>
          )}

      {/* Une liste de produits peut faire défiler longtemps avant d'atteindre de nouveau le haut de
          l'écran — ce raccourci flottant reste accessible quelle que soit la position de scroll. */}
      {!searching && hasProducts && (
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
        </div>
      )}

      <PrimaryButton onClick={onSeeTicket} disabled={!canValidateRound} withCheck style={{ marginTop: "auto", width: "100%" }}>
        {isOpenBar ? "Valider la tournée" : "Valider la commande"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
