// ============================================================
// Écran "Carte boissons" d'un événement — copié tel quel depuis
// le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, MENU_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { DrinkDirectoryPicker } from "./DrinkDirectoryPicker.jsx";
import { DrinkRow } from "./DrinkRow.jsx";
import { drinkTypeLabel, nextId, normalizeForSearch, computeMissingVenueItems } from "../utils.js";

export function MenuSetupScreen({ event, venue, updateEvent, onBack, breweriesDirectory, onRegisterBrewery, drinksDirectory, onCleanupDuplicates }) {
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

  const setPrice = (drinkId, price) => {
    updateEvent(event.id, (e) => ({
      ...e,
      menu: e.menu.map((d) => (d.id === drinkId ? { ...d, price: isNaN(price) ? 0 : price } : d)),
    }));
  };

  const setDrinkField = (drinkId, field, value) => {
    updateEvent(event.id, (e) => ({
      ...e,
      menu: e.menu.map((d) => (d.id === drinkId ? { ...d, [field]: value } : d)),
    }));
  };

  const toggleBeerTag = (drinkId, tag) => {
    updateEvent(event.id, (e) => ({
      ...e,
      menu: e.menu.map((d) => {
        if (d.id !== drinkId) return d;
        const tags = d.beerTags || [];
        const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
        return { ...d, beerTags: next };
      }),
    }));
  };

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
  const genericDirectoryItems = [...drinksDirectory.filter((d) => d.isGeneric)].sort((a, b) => a.name.localeCompare(b.name));

  const genericItemToEventItem = (g) => ({
    id: nextId(),
    name: g.name,
    price:
      event.currency === "jeton"
        ? g.averageJetonValue != null
          ? g.averageJetonValue
          : event.jetonUnitValue && g.averagePrice != null
          ? Math.max(1, Math.round(g.averagePrice / event.jetonUnitValue))
          : 0
        : g.averagePrice || 0,
    type: g.type || "",
    volumeCl: g.volumeCl != null ? g.volumeCl : null,
    kcalPer100ml: g.kcalPer100ml != null ? g.kcalPer100ml : null,
    servingMode: g.servingMode || "",
    beerTags: g.beerTags || [],
    abv: g.abv != null ? g.abv : null,
    brand: g.brand || "",
    brewery: g.brewery || "",
    nationality: g.nationality || "",
    glutenFree: !!g.glutenFree,
    bio: !!g.bio,
    countsAsDrinkId: g.countsAsDrinkId || null,
  });

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
    updateEvent(event.id, (e) => ({
      ...e,
      menu: [
        ...e.menu,
        {
          id: nextId(),
          name: source.name,
          price: 0,
          type: overrideType || source.type || "",
          volumeCl: source.volumeCl || null,
          kcalPer100ml: source.kcalPer100ml != null ? source.kcalPer100ml : null,
          servingMode: source.servingMode || "",
          beerTags: source.beerTags || [],
          abv: source.abv != null ? source.abv : null,
          brand: source.brand || "",
          brewery: source.brewery || "",
          nationality: source.nationality || "",
          glutenFree: !!source.glutenFree,
          bio: !!source.bio,
          countsAsDrinkId: source.countsAsDrinkId || null,
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

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", margin: "0 0 4px 0" }}>Carte boissons</h1>
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
                  style={{ width: "100%", minWidth: 0, border: "none", padding: "9px 0", fontSize: "16px", fontFamily: "'Urbanist', sans-serif", fontWeight: 700, color: COLORS.amber, outline: "none" }}
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

      {event.menu.length > 6 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px" }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {searching ? (
          searchResults.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucun produit trouvé.</p>
          ) : (
            searchResults.map((drink) => (
              <DrinkRow
                key={drink.id}
                drink={drink}
                priceStep={step}
                priceSymbol={unitLabel === "€" ? "€" : <NavIcon name="jeton" size={17} color={COLORS.jetonFluo} />}
                forceLocked
                onChangeName={(name) => setDrinkField(drink.id, "name", name)}
                onChangePrice={(price) => setPrice(drink.id, price)}
                onChangeType={(type) => setDrinkField(drink.id, "type", type)}
                onChangeVolume={(vol) => setDrinkField(drink.id, "volumeCl", vol)}
                onChangeKcal={(k) => setDrinkField(drink.id, "kcalPer100ml", k)}
                onChangeServingMode={(mode) => setDrinkField(drink.id, "servingMode", mode)}
                onToggleBeerTag={(tag) => toggleBeerTag(drink.id, tag)}
                onChangeBrewery={(b) => setDrinkField(drink.id, "brewery", b)}
                onChangeAbv={(abv) => setDrinkField(drink.id, "abv", abv)}
                onChangeMenuCategory={(cat) => setDrinkField(drink.id, "menuCategory", cat)}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={onRegisterBrewery}
                onRemove={() => removeDrink(drink.id)}
              />
            ))
          )
        ) : event.menu.length === 0 ? (
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucun produit sur cette carte pour l'instant.</p>
        ) : (
          categoriesPresent.map((cat) => {
            const items = itemsIn(cat);
            const isOpen = openCategory === cat;
            return (
              <div key={cat} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", overflow: "hidden" }}>
                <button
                  onClick={() => toggleCategoryOpen(cat)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px" }}>
                    <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                    {cat === "Non classé" ? cat : drinkTypeLabel(cat)}
                  </span>
                  <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{items.length}</span>
                    <span>{isOpen ? "▲" : "▾"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 10px 10px 10px" }}>
                    {items.map((drink) => (
                      <DrinkRow
                        key={drink.id}
                        drink={drink}
                        priceStep={step}
                        priceSymbol={unitLabel === "€" ? "€" : <NavIcon name="jeton" size={17} color={COLORS.jetonFluo} />}
                        forceLocked
                        onChangeName={(name) => setDrinkField(drink.id, "name", name)}
                        onChangePrice={(price) => setPrice(drink.id, price)}
                        onChangeType={(type) => setDrinkField(drink.id, "type", type)}
                        onChangeVolume={(vol) => setDrinkField(drink.id, "volumeCl", vol)}
                        onChangeKcal={(k) => setDrinkField(drink.id, "kcalPer100ml", k)}
                        onChangeServingMode={(mode) => setDrinkField(drink.id, "servingMode", mode)}
                        onToggleBeerTag={(tag) => toggleBeerTag(drink.id, tag)}
                        onChangeBrewery={(b) => setDrinkField(drink.id, "brewery", b)}
                        onChangeAbv={(abv) => setDrinkField(drink.id, "abv", abv)}
                        onChangeMenuCategory={(cat2) => setDrinkField(drink.id, "menuCategory", cat2)}
                        breweriesDirectory={breweriesDirectory}
                        onRegisterBrewery={onRegisterBrewery}
                        onRemove={() => removeDrink(drink.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <DrinkDirectoryPicker drinks={drinksDirectory || []} onPick={handlePickFromDirectory} />
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
        <div style={{ background: "#3D1F1F", border: `2px solid ${COLORS.wine}`, borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <button
            onClick={() => setGenericChecklistOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <p style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, margin: 0 }}>Produits génériques</p>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                flexShrink: 0,
                transform: `rotate(${genericChecklistOpen ? 45 : 0}deg)`,
                transition: "transform 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <line x1="9" y1="1.5" x2="9" y2="16.5" stroke={COLORS.wine} strokeWidth="2.4" strokeLinecap="round" />
                <line x1="1.5" y1="9" x2="16.5" y2="9" stroke={COLORS.wine} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          {genericChecklistOpen && (
            <>
              <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "10px 0" }}>
                Sélectionne les produits génériques disponibles.
                <br />
                <br />
                Possibilité d'ajouter plusieurs fois certains produits si plusieurs volumes sont disponibles pour un même produit (exemple : Bières Pils 25cl. et 50cl.).
                <br />
                <br />
                Possibilité d'adapter le volume et le type de service de tous les produits depuis les catégories.
                <br />
                <br />
                Si un produit spécifique est disponible, tu peux l'ajouter à la carte depuis "Ajouter depuis le répertoire".
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {genericDirectoryItems.map((g) => {
                  if (g.type === "Bières & Cidres" || g.type === "Vins & Bulles") {
                    const count = event.menu.filter((eItem) => normalizeForSearch(eItem.name) === normalizeForSearch(g.name)).length;
                    return (
                      <div
                        key={g.id}
                        style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, borderRadius: "8px", padding: "9px 12px" }}
                      >
                        <button
                          onClick={() => addGenericItem(g)}
                          style={{
                            width: "18px",
                            height: "18px",
                            flexShrink: 0,
                            background: COLORS.amber,
                            color: COLORS.paper,
                            border: "none",
                            borderRadius: "5px",
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
                        background: COLORS.surface,
                        borderRadius: "8px",
                        padding: "9px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={present}
                        onChange={() => toggleGenericItem(g)}
                        style={{ width: "18px", height: "18px", accentColor: COLORS.wine, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>{g.name}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

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
