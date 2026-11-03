// ============================================================
// Écran "Carte boissons" d'un événement — copié tel quel depuis
// le prototype Claude.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, MENU_CATEGORIES, ADD_BLOCK_HEIGHT } from "../constants.js";
import { NavIcon, TokenPinkIcon, AddPlusIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { DrinkDirectoryPicker } from "./DrinkDirectoryPicker.jsx";
import { MenuProductRow, CHECK_MARK_BG } from "./MenuProductRow.jsx";
import { drinkTypeLabel, nextId, normalizeForSearch, computeMissingVenueItems, safeServingMode } from "../utils.js";
import { useTargetedDrinks } from "../hooks/useTargetedDrinks.js";
import { loadGenericDrinks } from "../data/sharedDirectories.js";

// Clé du bloc « Tous les produits ajoutés » dans le bloc déroulant ouvert (ne peut pas être confondue avec une catégorie).
const ALL_PRODUCTS_BLOCK = "__tous__";

export function MenuSetupScreen({ event, venue, updateEvent, onBack, breweriesDirectory, onRegisterBrewery, onCleanupDuplicates }) {
  const drinksDirectory = useTargetedDrinks(venue?.menu);
  const [genericDrinks, setGenericDrinks] = useState([]);
  useEffect(() => {
    loadGenericDrinks().then(setGenericDrinks);
  }, []);
  const [cleanupMessage, setCleanupMessage] = useState(null);
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const [jetonValueInput, setJetonValueInput] = useState(event.jetonUnitValue ? String(event.jetonUnitValue).replace(".", ",") : "");
  const [jetonValueEditing, setJetonValueEditing] = useState(!event.jetonUnitValue);
  const [priceWarningOpen, setPriceWarningOpen] = useState(false);

  const saveJetonValue = () => {
    const parsed = parseFloat(jetonValueInput.replace(",", "."));
    updateEvent(event.id, (e) => ({ ...e, jetonUnitValue: isNaN(parsed) ? 0 : parsed }));
    setJetonValueEditing(false);
  };

  const handleCleanup = () => {
    const result = onCleanupDuplicates();
    setCleanupMessage(result.removed === 0 ? "Aucun doublon trouvé." : `${result.removed} doublon${result.removed > 1 ? "s" : ""} retiré${result.removed > 1 ? "s" : ""}.`);
  };

  // Modifier le prix, le volume ou le type de service d'un produit = l'avoir vérifié/adapté : son cadre passe du rose fluo (à contrôler) au vert fluo (OK).
  const setPrice = (drinkId, price) => {
    updateEvent(event.id, (e) => ({
      ...e,
      menu: e.menu.map((d) => (d.id === drinkId ? { ...d, price: isNaN(price) ? 0 : price, priceChecked: true } : d)),
    }));
  };

  const setDrinkFields = (drinkId, fields) => {
    updateEvent(event.id, (e) => ({
      ...e,
      menu: e.menu.map((d) => (d.id === drinkId ? { ...d, ...fields } : d)),
    }));
  };

  const setDrinkField = (drinkId, field, value) => setDrinkFields(drinkId, { [field]: value });

  const removeDrink = (drinkId) => {
    updateEvent(event.id, (e) => ({ ...e, menu: e.menu.filter((d) => d.id !== drinkId) }));
  };

  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const q = normalizeForSearch(query.trim());
  const searching = q.length > 0;
  const searchResults = searching
    ? [...event.menu].filter((d) => normalizeForSearch(d.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const categoriesPresent = [...MENU_CATEGORIES, "Non classé"].filter((cat) => event.menu.some((d) => categoryOf(d) === cat));
  const itemsIn = (cat) => [...event.menu.filter((d) => categoryOf(d) === cat)].sort((a, b) => a.name.localeCompare(b.name));
  const toggleCategoryOpen = (cat) => setOpenCategory((prev) => (prev === cat ? null : cat));

  // Items present on the venue's live menu but missing from this event's own (frozen) menu —
  // typically because they were added to the venue after this event/salon started.
  const missingFromVenue = computeMissingVenueItems(event, venue, drinksDirectory);

  const venueItemToEventItem = (vItem) => ({
    id: nextId(),
    name: vItem.name,
    price: vItem.price || 0,
    type: vItem.type || "",
    volumeCl: vItem.volumeCl != null ? vItem.volumeCl : null,
    kcalPer100ml: vItem.kcalPer100ml != null ? vItem.kcalPer100ml : null,
    servingMode: vItem.servingMode || "",
    beerTags: vItem.beerTags || [],
    abv: vItem.abv != null ? vItem.abv : null,
    brand: vItem.brand || "",
    brewery: vItem.brewery || "",
    nationality: vItem.nationality || "",
    glutenFree: !!vItem.glutenFree,
    bio: !!vItem.bio,
    countsAsDrinkId: vItem.countsAsDrinkId || null,
    photoUrl: vItem.photoUrl || null,
    avatarEmoji: vItem.avatarEmoji || null,
    ...(vItem.menuCategory ? { menuCategory: vItem.menuCategory } : {}),
  });

  const addOneFromVenue = (vItem) => {
    updateEvent(event.id, (e) => ({ ...e, menu: [...e.menu, venueItemToEventItem(vItem)] }));
  };

  const addAllFromVenue = () => {
    updateEvent(event.id, (e) => ({ ...e, menu: [...e.menu, ...missingFromVenue.map(venueItemToEventItem)] }));
  };

  // Generic starter checklist — real products from "Boissons" tagged as generic (isGeneric ===
  // true). Each one gets a checkbox reflecting whether it's currently on this event's menu;
  // checking it copies the product in (frozen snapshot, like any other item here), unchecking
  // removes it. Sorted alphabetically, and only shown when there's at least one generic product
  // to offer — only really makes sense for events not tied to one specific venue.
  const genericDirectoryItems = [...genericDrinks].sort((a, b) => a.name.localeCompare(b.name));

  // Valeurs proposées quand on ajoute un produit à la carte (produit générique ou produit choisi dans BibAtlas) : celles encodées sur sa fiche
  // dans « Valeurs par défaut » (prix, volume, type de service) ; à défaut, les anciens champs de la fiche (prix moyen, volume, type de service).
  // Spiritueux ajouté comme Shot (asShot) dont la fiche a la case « Shot » cochée : d'abord les valeurs par défaut du shot, puis celles du spiritueux.
  // Prix : en euros, la valeur en euros ; pour un événement en jetons, la valeur en jetons si elle existe, sinon le prix en euros converti avec la
  // valeur du jeton de l'événement (au moins 1 jeton). 0 quand la fiche n'a pas de prix.
  const positiveOrNull = (v) => {
    const n = Number(v);
    return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
  };
  const defaultsOf = (src, asShot = false) => {
    const own = asShot && src.servesAsShot;
    const spirit = { euro: src.defaultPriceEuro ?? src.averagePrice ?? null, jeton: src.defaultPriceJeton ?? src.averageJetonValue ?? null };
    const priceSets = own ? [{ euro: src.defaultShotPriceEuro ?? null, jeton: src.defaultShotPriceJeton ?? null }, spirit] : [spirit];
    let price = 0;
    for (const p of priceSets) {
      const value =
        event.currency === "jeton"
          ? p.jeton != null
            ? p.jeton
            : event.jetonUnitValue && p.euro != null
            ? Math.max(1, Math.round(p.euro / event.jetonUnitValue))
            : null
          : p.euro;
      if (value != null) {
        price = value;
        break;
      }
    }
    return {
      price,
      volumeCl: (own ? positiveOrNull(src.defaultShotVolumeCl) : null) ?? positiveOrNull(src.defaultVolumeCl) ?? positiveOrNull(src.volumeCl),
      servingMode: (own ? safeServingMode(src.defaultShotServingMode) : "") || safeServingMode(src.defaultServingMode) || src.servingMode || "",
    };
  };

  const genericItemToEventItem = (g) => {
    const d = defaultsOf(g);
    return {
      id: nextId(),
      name: g.name,
      price: d.price,
      type: g.type || "",
      volumeCl: d.volumeCl,
      kcalPer100ml: g.kcalPer100ml != null ? g.kcalPer100ml : null,
      servingMode: d.servingMode,
      beerTags: g.beerTags || [],
      abv: g.abv != null ? g.abv : null,
      brand: g.brand || "",
      brewery: g.brewery || "",
      nationality: g.nationality || "",
      glutenFree: !!g.glutenFree,
      bio: !!g.bio,
      countsAsDrinkId: g.countsAsDrinkId || null,
      photoUrl: g.photoUrl || null,
      avatarEmoji: g.avatarEmoji || null,
    };
  };

  const isGenericItemPresent = (g) => event.menu.some((eItem) => normalizeForSearch(eItem.name) === normalizeForSearch(g.name));

  // Beer is the one real exception where the same generic product might need to exist twice on
  // the same event (e.g. on tap in 25cl AND bottled in 33cl) — so it gets a plain "add another"
  // button instead of a single present/absent checkbox. Every other category only ever needs one.
  const addGenericItem = (g) => {
    updateEvent(event.id, (e) => ({ ...e, menu: [...e.menu, genericItemToEventItem(g)] }));
  };

  const toggleGenericItem = (g) => {
    if (isGenericItemPresent(g)) {
      updateEvent(event.id, (e) => ({ ...e, menu: e.menu.filter((eItem) => normalizeForSearch(eItem.name) !== normalizeForSearch(g.name)) }));
    } else {
      addGenericItem(g);
    }
  };

  const [genericChecklistOpen, setGenericChecklistOpen] = useState(false);

  const [pendingSpiritSource, setPendingSpiritSource] = useState(null);

  const addDrinkFromDirectory = (source, overrideType) => {
    const d = defaultsOf(source, overrideType === "Shots");
    updateEvent(event.id, (e) => ({
      ...e,
      menu: [
        ...e.menu,
        {
          id: nextId(),
          name: source.name,
          price: d.price,
          type: overrideType || source.type || "",
          volumeCl: d.volumeCl,
          kcalPer100ml: source.kcalPer100ml != null ? source.kcalPer100ml : null,
          servingMode: d.servingMode,
          beerTags: source.beerTags || [],
          abv: source.abv != null ? source.abv : null,
          brand: source.brand || "",
          brewery: source.brewery || "",
          nationality: source.nationality || "",
          glutenFree: !!source.glutenFree,
          bio: !!source.bio,
          countsAsDrinkId: source.countsAsDrinkId || null,
          photoUrl: source.photoUrl || null,
          avatarEmoji: source.avatarEmoji || null,
        },
      ],
    }));
  };

  const handlePickFromDirectory = (source) => {
    if (source.type === "Spiritueux") {
      setPendingSpiritSource(source);
    } else {
      addDrinkFromDirectory(source);
    }
  };

  const unitLabel = event.currency === "euro" ? "€" : "jetons";
  const step = event.currency === "euro" ? "0.10" : "1";

  // Une ligne produit modifiable (résultats de recherche et blocs de la carte) : rond-profil + nom + prix, puis flèche + croix ;
  // déroulée, seulement le volume et le type de service (et Spiritueux / Shot pour un spiritueux).
  const renderDrinkRow = (drink) => (
    <MenuProductRow
      key={drink.id}
      drink={drink}
      priceStep={step}
      priceSymbol={unitLabel === "€" ? "€" : <TokenPinkIcon size={17} />}
      onChangePrice={(price) => setPrice(drink.id, price)}
      onChangeVolume={(vol) => setDrinkFields(drink.id, { volumeCl: vol, volumeChecked: true })}
      onChangeServingMode={(mode) => setDrinkFields(drink.id, { servingMode: mode, servingModeChecked: true })}
      onChangeMenuCategory={(cat) => setDrinkField(drink.id, "menuCategory", cat)}
      onChangeVerified={(verified) => setDrinkFields(drink.id, { priceChecked: verified, volumeChecked: verified, servingModeChecked: verified })}
      onRemove={() => removeDrink(drink.id)}
    />
  );

  // Les lignes produit d'un bloc : pas de cadre par produit, un trait fin entre deux lignes.
  const renderRows = (items) =>
    items.map((drink, i) => (
      <React.Fragment key={drink.id}>
        {i > 0 && <div style={{ height: "1px", background: COLORS.paperAlt }} />}
        {renderDrinkRow(drink)}
      </React.Fragment>
    ));

  // Un bloc déroulant de la carte : « Tous les produits ajoutés » ou une catégorie (un seul bloc ouvert à la fois).
  const renderMenuBlock = (key, label, items) => {
    const isOpen = openCategory === key;
    return (
      <div key={key} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", overflow: "hidden" }}>
        <button
          onClick={() => toggleCategoryOpen(key)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: "12px 10px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px" }}>
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            {label}
          </span>
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{items.length}</span>
            <span>{isOpen ? "▲" : "▾"}</span>
          </span>
        </button>
        {isOpen && <div style={{ margin: "0 10px", borderTop: `1px solid ${COLORS.paperAlt}` }}>{renderRows(items)}</div>}
      </div>
    );
  };

  return (
    <div style={{ padding: "8px 20px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 4px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>Carte boissons</h1>
      </div>
      {event.currency === "euro" ? (
        <div style={{ marginBottom: "18px" }}>
          <button
            onClick={() => setPriceWarningOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.redFluo }}>Attention</span>
            <span style={{ display: "inline-flex", transform: `rotate(${priceWarningOpen ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="back-triangle" size={11} color={COLORS.redFluo} />
            </span>
          </button>
          {priceWarningOpen && (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "8px", marginBottom: 0 }}>
              Les prix pré-encodés peuvent avoir été modifiés par l'établissement et pas encore adaptés sur cette carte boissons.
              <br />
              Tu pourras adapter ta note au bar et ta note finale si celles-ci ne correspondent pas à la réalité.
              <br />
              En cas de variation de prix, les prix appliqués par l'établissement seront toujours les prix officiels et applicables.
            </p>
          )}
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>{`Prix en ${unitLabel}.`}</p>
      )}

      {missingFromVenue.length > 0 && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", margin: "0 0 8px 0" }}>
            🔄 {missingFromVenue.length} produit{missingFromVenue.length > 1 ? "s ont" : " a"} été ajouté{missingFromVenue.length > 1 ? "s" : ""} à la carte de l'établissement depuis le début de la session en cours
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {missingFromVenue.map((vItem) => (
              <div key={vItem.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface, borderRadius: "8px", padding: "8px 10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink }}>{vItem.name}</span>
                <button
                  onClick={() => addOneFromVenue(vItem)}
                  style={{ background: COLORS.amber, border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
                >
                  + Ajouter
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addAllFromVenue}
            style={{ width: "100%", background: "#F2C94C", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#332B14", cursor: "pointer" }}
          >
            Tout ajouter à cette session
          </button>
        </div>
      )}

      {event.currency === "jeton" && (
        <div style={{ display: "inline-flex", flexDirection: "column", alignSelf: "flex-start", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: jetonValueEditing ? "8px" : 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>Valeur jeton</span>
            {!jetonValueEditing && (
              <button onClick={() => setJetonValueEditing(true)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Modifier" aria-label="Modifier">
                <NavIcon name="pencil" size={14} color={COLORS.amber} />
              </button>
            )}
          </div>
          {jetonValueEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", width: "100px", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 10px" }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={jetonValueInput}
                  onChange={(e) => setJetonValueInput(e.target.value.replace(".", ","))}
                  placeholder="0,00"
                  autoFocus
                  style={{ width: "100%", minWidth: 0, border: "none", padding: "9px 0", fontSize: "16px", fontFamily: "'Urbanist', sans-serif", fontWeight: 700, color: COLORS.amber, outline: "none", textAlign: "center" }}
                />
                <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, flexShrink: 0 }}>€</span>
              </div>
              <button onClick={saveJetonValue} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, fontSize: "12.5px", cursor: "pointer", color: COLORS.paper }}>
                Valider
              </button>
            </div>
          ) : (
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "18px", color: COLORS.amber, whiteSpace: "nowrap" }}>
              {(event.jetonUnitValue || 0).toFixed(2).replace(".", ",")} <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
            </span>
          )}
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <DrinkDirectoryPicker type={null} onPick={handlePickFromDirectory} />
      </div>
      {pendingSpiritSource && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "12px 14px", marginBottom: "10px" }}>
          <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginTop: 0, marginBottom: "8px" }}>
            Ajouter "{pendingSpiritSource.name}" comme...
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                addDrinkFromDirectory(pendingSpiritSource);
                setPendingSpiritSource(null);
              }}
              style={{ flex: 1, background: COLORS.surfaceAlt, border: "none", borderRadius: "8px", padding: "10px", fontWeight: 700, fontSize: "13px", color: COLORS.chalkWhite, cursor: "pointer" }}
            >
              Spiritueux
            </button>
            <button
              onClick={() => {
                addDrinkFromDirectory(pendingSpiritSource, "Shots");
                setPendingSpiritSource(null);
              }}
              style={{ flex: 1, background: COLORS.surfaceAlt, border: "none", borderRadius: "8px", padding: "10px", fontWeight: 700, fontSize: "13px", color: COLORS.chalkWhite, cursor: "pointer" }}
            >
              Shot
            </button>
          </div>
        </div>
      )}
      {genericDirectoryItems.length > 0 && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.pinkFluo}`, borderRadius: "10px", padding: "0 10px", marginBottom: "16px" }}>
          <button
            onClick={() => setGenericChecklistOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: `${ADD_BLOCK_HEIGHT - 4}px`, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <p style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, margin: 0 }}>Produits génériques</p>
            <AddPlusIcon color={COLORS.pinkFluo} rotated={genericChecklistOpen} />
          </button>
          {genericChecklistOpen && (
            <div style={{ paddingBottom: "14px" }}>
              <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "2px 0 10px" }}>
                Sélectionne les produits génériques disponibles.
                <br />
                <br />
                Possibilité d'ajouter plusieurs fois certains produits si plusieurs volumes sont disponibles pour un même produit (exemple : Bières Pils 25cl. et 50cl.).
                <br />
                <br />
                Possibilité d'adapter le volume et le type de service de tous les produits depuis les catégories.
                <br />
                <br />
                Si un produit spécifique est disponible, tu peux l'ajouter à la carte depuis "BibAtlas".
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {genericDirectoryItems.map((g) => {
                  if (g.type === "Bières & Cidres" || g.type === "Vins & Bulles") {
                    const count = event.menu.filter((eItem) => normalizeForSearch(eItem.name) === normalizeForSearch(g.name)).length;
                    return (
                      <div
                        key={g.id}
                        style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surfaceAlt, borderRadius: "8px", padding: "9px 12px" }}
                      >
                        <button
                          onClick={() => addGenericItem(g)}
                          style={{
                            width: "18px",
                            height: "18px",
                            flexShrink: 0,
                            // Rose tant que le produit n'est pas sur la carte, vert fluo dès qu'il y est au moins une fois.
                            background: count > 0 ? COLORS.amber : COLORS.pinkFluo,
                            color: COLORS.paper,
                            border: "none",
                            borderRadius: "50%",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            padding: 0,
                          }}
                          aria-label={`Ajouter ${g.name}`}
                        >
                          +
                        </button>
                        <span style={{ fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>
                          {g.name}
                          {count > 0 && <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}> · {count} sur la carte</span>}
                        </span>
                      </div>
                    );
                  }
                  const present = isGenericItemPresent(g);
                  return (
                    <label
                      key={g.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: COLORS.surfaceAlt,
                        borderRadius: "8px",
                        padding: "9px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={present}
                        onChange={() => toggleGenericItem(g)}
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          boxSizing: "border-box",
                          width: "18px",
                          height: "18px",
                          margin: 0,
                          flexShrink: 0,
                          borderRadius: "4px",
                          border: `1px solid ${present ? COLORS.amber : "#767676"}`,
                          background: present ? `${COLORS.amber} ${CHECK_MARK_BG} center / 12px 12px no-repeat` : "#fff",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>{g.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {event.menu.length > 6 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          style={{ padding: "11px 10px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px" }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {searching ? (
          searchResults.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucun produit trouvé.</p>
          ) : (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 10px" }}>{renderRows(searchResults)}</div>
          )
        ) : event.menu.length === 0 ? (
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucun produit sur cette carte pour l'instant.</p>
        ) : (
          <>
            {/* Premier bloc : tous les produits ajoutés, toutes catégories confondues (par ordre alphabétique). */}
            {renderMenuBlock(ALL_PRODUCTS_BLOCK, "Tous les produits ajoutés", [...event.menu].sort((a, b) => a.name.localeCompare(b.name)))}
            {categoriesPresent.map((cat) => renderMenuBlock(cat, cat === "Non classé" ? cat : drinkTypeLabel(cat), itemsIn(cat)))}
          </>
        )}
      </div>


      <button
        onClick={handleCleanup}
        style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left", marginTop: "20px" }}
      >
        Nettoyer les doublons
      </button>
      {cleanupMessage && <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: 0 }}>{cleanupMessage}</p>}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
