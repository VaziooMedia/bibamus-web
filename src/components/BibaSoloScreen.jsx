// ============================================================
// BibaSolo — accessible depuis BibaGo. Historique continu de
// consommations personnelles, sans notion de session/salon :
// on choisit une boisson, un prix (obligatoire), un lieu
// (optionnel), et c'est tout. Récapitulatif du jour visible en
// direct au-dessus de la liste.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS, VOLUME_DISPLAY_TYPES, MENU_CATEGORIES, SERVING_MODE_LABELS } from "../constants.js";
import { NavIcon, CountryFlagImg, WaterAlertIcon } from "./icons.jsx";
import { GlutenFreeIcon } from "./DrinkDisplay.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar, BackFooterLink } from "./ui.jsx";
import { BibaBobModal, WaterAlertModal } from "./DashboardParts.jsx";
import { requestNotificationPermissionAndGetToken } from "../firebaseClient.js";
import {
  addSoloCheckin,
  loadMySoloCheckins,
  deleteSoloCheckin,
  searchDrinks,
  loadDrinksByIds,
  searchVenues,
  loadVenuesByIds,
  loadNearbyVenues,
  loadGenericDrinks,
  loadMyBibaZeroStatus,
  activateBibaZeroSolo,
  deactivateBibaZeroSolo,
  useBibaZeroJokerSolo,
  loadMyWaterAlertSoloSettings,
  saveWaterAlertSoloSettings,
  upsertPushSubscription,
} from "../data/sharedDirectories.js";
import { drinkTypeLabel, resolveMenuItem, formatMoney, isAlcoholicDrink } from "../utils.js";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";
import carteIconUrl from "../assets/brand/carte.svg";
import bibatlasIconUrl from "../assets/brand/bibatlas.svg";
import beerIconUrl from "../assets/brand/beer.svg";
import drinkCheckIconUrl from "../assets/brand/drink-check.svg";
import { DrinkCheckScreen } from "./DrinkCheckScreen.jsx";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDateOnly(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeOnly(iso) {
  return new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

function drinkCalories(drink, volumeCl) {
  if (!drink?.kcalPer100ml) return 0;
  const volume = volumeCl || drink.volumeCl || 25;
  // kcalPer100ml est par 100 ML, mais le volume est stocké en CL (1 cl = 10 ml) — d'où le ×10.
  return Math.round((drink.kcalPer100ml * volume * 10) / 100);
}

const menuBadgeStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: COLORS.amberDark,
  background: COLORS.paperAlt,
  borderRadius: "5px",
  padding: "1px 5px",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

// Bloc produit — reproduit exactement la présentation de la carte d'un lieu dans BibAtlas
// (ligne 1 : nom + volume ; ligne 2 : service, drapeau, degré d'alcool, badges, prix ; ligne 3 :
// producteur), avec le drapeau sans fond et le degré d'alcool toujours visible s'il est connu.
function MenuItemBlock({ item, onClick }) {
  const isZeroAbv = item.abv != null && item.abv <= 0.5;
  const priceText = item.price != null ? formatMoney(item.price, "euro") : null;
  const priceParts = priceText ? priceText.split(" ") : [];
  const priceSymbol = priceParts.length > 1 ? priceParts.pop() : null;
  const priceNumber = priceParts.join(" ");

  const line2Parts = [
    item.servingMode && SERVING_MODE_LABELS[item.servingMode] ? (
      <span key="serving" style={{ fontSize: "11px", color: COLORS.inkSoft }}>
        {SERVING_MODE_LABELS[item.servingMode]}
      </span>
    ) : null,
    item.nationality ? <CountryFlagImg key="flag" country={item.nationality} size={16} /> : null,
    item.abv != null ? (
      <span key="abv" style={{ fontSize: "11px", color: COLORS.inkSoft }}>
        {item.abv.toFixed(1)}% ABV
      </span>
    ) : null,
    isZeroAbv ? (
      <span key="zero" style={menuBadgeStyle}>
        0.0%
      </span>
    ) : null,
    item.bio ? (
      <span key="bio" style={menuBadgeStyle}>
        🌱 BIO
      </span>
    ) : null,
    item.glutenFree ? (
      <span key="gf" style={{ ...menuBadgeStyle, padding: "3px", display: "inline-flex", alignItems: "center" }}>
        <GlutenFreeIcon size={11} />
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", boxSizing: "border-box", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "left", cursor: "pointer" }}
    >
      <EntityAvatar photoUrl={item.photoUrl} size={44} fallbackIcon="bottle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{item.name}</span>
          {item.volumeCl && <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>{item.volumeCl}cl.</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px", flexWrap: "wrap" }}>
          {line2Parts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
              {part}
            </React.Fragment>
          ))}
          {priceText && (
            <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: 700, color: COLORS.amber, flexShrink: 0 }}>
              {priceNumber} <span style={{ fontSize: "10.5px", fontWeight: 600, color: COLORS.inkSoft }}>{priceSymbol}</span>
            </span>
          )}
        </div>

        {item.brewery && <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>{item.brewery}</p>}
      </div>
    </button>
  );
}

// Écran d'ajout — recherche une boisson, prix obligatoire. Le lieu est fixé une fois sur la
// page principale de BibaSolo et appliqué automatiquement ici, sans le redemander à chaque verre.
function AddSoloCheckinScreen({ myUserId, recentDrinks = [], venue, bibaZeroActive = false, onDone, onBack }) {
  const [query, setQuery] = useState("");
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [volume, setVolume] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Trois portes d'entrée distinctes une fois qu'un lieu est choisi, comme dans un salon : sa
  // propre carte (par catégories), une recherche libre dans tout BibAtlas, ou une recherche
  // bornée aux produits marqués génériques.
  const [pickMode, setPickMode] = useState(null); // null | "carte" | "bibatlas" | "generic"
  const [activeCategory, setActiveCategory] = useState(null);
  const [carteQuery, setCarteQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  // Carte du lieu choisi — comme dans un salon, seuls les vrais produits du catalogue (pas les
  // ajouts purement locaux au menu d'un lieu) peuvent être réutilisés ici, sinon le nom ne se
  // résoudrait plus correctement ensuite dans l'historique ou les stats. Le menu stocké ne
  // contient que sourceDrinkId + prix — le vrai nom/type/volume vient du catalogue, chargé ici
  // puis appliqué à chaque item exactement comme le fait la création d'un salon.
  const [venueDrinks, setVenueDrinks] = useState([]);
  useEffect(() => {
    const ids = [...new Set((venue?.menu || []).filter((d) => d && d.fromDirectory && d.sourceDrinkId).map((d) => d.sourceDrinkId))];
    if (ids.length === 0) return;
    loadDrinksByIds(ids).then(setVenueDrinks);
  }, [venue]);
  const venueMenuItems = (venue?.menu || [])
    .filter((item) => item && item.fromDirectory && item.sourceDrinkId)
    .map((item) => resolveMenuItem(item, venueDrinks))
    .filter((item) => item.name)
    .filter((item) => !bibaZeroActive || !isAlcoholicDrink(item));
  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const venueCategories = [...MENU_CATEGORIES, "Non classé"].filter((cat) => venueMenuItems.some((d) => categoryOf(d) === cat));
  const itemsInCategory = (cat) => venueMenuItems.filter((d) => categoryOf(d) === cat);
  const visibleRecentDrinks = bibaZeroActive ? recentDrinks.filter((d) => !isAlcoholicDrink(d)) : recentDrinks;

  const q = normalize(query);
  const [rawDrinkResults, setRawDrinkResults] = useState([]);
  const drinkResults = bibaZeroActive ? rawDrinkResults.filter((d) => !isAlcoholicDrink(d)) : rawDrinkResults;
  useEffect(() => {
    if (q.length < 2) {
      setRawDrinkResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchDrinks(query.trim(), 8).then(setRawDrinkResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [q, query]);

  // Produits génériques — chargés une fois, filtrés côté client sur la recherche tapée.
  const [genericDrinks, setGenericDrinks] = useState([]);
  const [genericQuery, setGenericQuery] = useState("");
  useEffect(() => {
    if (pickMode === "generic" && genericDrinks.length === 0) loadGenericDrinks().then(setGenericDrinks);
  }, [pickMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const gq = normalize(genericQuery);
  const genericResults = (gq.length === 0 ? genericDrinks : genericDrinks.filter((d) => normalize(d.name).includes(gq))).filter((d) => !bibaZeroActive || !isAlcoholicDrink(d));

  const selectDrink = (d) => {
    setSelectedDrink(d);
    setVolume(d.volumeCl ? String(d.volumeCl) : "25");
  };

  // Choisir un item de la carte du lieu — pré-remplit aussi le prix et le volume réellement
  // pratiqués là-bas, modifiables ensuite comme d'habitude.
  const selectVenueMenuItem = (item) => {
    setSelectedDrink({ id: item.sourceDrinkId, name: item.name });
    setVolume(item.volumeCl ? String(item.volumeCl) : "25");
    if (item.price != null) setPrice(String(item.price).replace(".", ","));
  };

  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!selectedDrink || !price) return;
    setSaving(true);
    setError(null);
    const volumeNum = parseFloat(String(volume).replace(",", ".")) || null;
    const result = await addSoloCheckin(myUserId, selectedDrink.id, parseFloat(price.replace(",", ".")), venue?.id, volumeNum);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Ajouter un verre</h1>
      </div>

      {!selectedDrink ? (
        <>
          {pickMode === null && (
            <>
              {visibleRecentDrinks.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Favoris</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {visibleRecentDrinks.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => selectDrink(d)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: COLORS.surface,
                          border: `2px solid ${COLORS.amber}`,
                          borderRadius: "999px",
                          padding: "5px 10px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: COLORS.ink,
                          cursor: "pointer",
                        }}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {visibleRecentDrinks.length > 0 && <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 18px" }} />}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {venueMenuItems.length > 0 && (
                  <button
                    onClick={() => setPickMode("carte")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      boxSizing: "border-box",
                      background: COLORS.surface,
                      border: `2px solid ${COLORS.amber}`,
                      borderRadius: "12px",
                      padding: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img src={carteIconUrl} alt="" style={{ height: "22px", width: "auto", display: "block" }} />
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
                      {venue.name}
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
                      Carte
                    </span>
                    <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
                  </button>
                )}
                <button
                  onClick={() => setPickMode("bibatlas")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <img src={bibatlasIconUrl} alt="" style={{ height: "22px", width: "auto", display: "block" }} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>
                    <span style={{ color: COLORS.chalkWhite }}>Biba</span>
                    <span style={{ color: COLORS.amber }}>Atlas</span>
                  </span>
                  <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
                </button>
                <button
                  onClick={() => setPickMode("generic")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <img src={beerIconUrl} alt="" style={{ height: "22px", width: "auto", display: "block" }} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>Produits génériques</span>
                  <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
                </button>
              </div>
            </>
          )}

          {pickMode === "carte" && (
            <>
              <button
                onClick={() => (activeCategory ? setActiveCategory(null) : setPickMode(null))}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" }}
              >
                <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
                {activeCategory ? "Catégories" : "Retour"}
              </button>

              {!activeCategory ? (
                <>
                  <input
                    type="text"
                    value={carteQuery}
                    onChange={(e) => setCarteQuery(e.target.value)}
                    placeholder="Rechercher dans la carte..."
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", marginBottom: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
                  />
                  {normalize(carteQuery).length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {venueMenuItems
                        .filter((d) => normalize(d.name).includes(normalize(carteQuery)))
                        .map((item) => (
                          <MenuItemBlock key={item.id} item={item} onClick={() => selectVenueMenuItem(item)} />
                        ))}
                    </div>
                  ) : (
                    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                      {venueCategories.map((cat, i) => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            background: "none",
                            border: "none",
                            borderBottom: i === venueCategories.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                            padding: "14px 4px",
                            textAlign: "left",
                            cursor: "pointer",
                            color: COLORS.ink,
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          {drinkTypeLabel(cat)}
                          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>{itemsInCategory(cat).length} →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    placeholder={`Rechercher dans ${drinkTypeLabel(activeCategory)}...`}
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", marginBottom: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {itemsInCategory(activeCategory)
                      .filter((d) => normalize(d.name).includes(normalize(categoryQuery)))
                      .map((item) => (
                        <MenuItemBlock key={item.id} item={item} onClick={() => selectVenueMenuItem(item)} />
                      ))}
                  </div>
                </>
              )}
            </>
          )}

          {pickMode === "bibatlas" && (
            <>
              <button
                onClick={() => setPickMode(null)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" }}
              >
                <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
                Retour
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une boisson..."
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
              />
              {drinkResults.length > 0 && (
                <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                  {drinkResults.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => selectDrink(d)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderBottom: i === drinkResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                        padding: "12px 4px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: COLORS.ink,
                      }}
                    >
                      <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={32} fallbackIcon="bottle" />
                      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        {d.abv != null && (
                          <>
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{String(d.abv).replace(".", ",")}% ABV</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {pickMode === "generic" && (
            <>
              <button
                onClick={() => setPickMode(null)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" }}
              >
                <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
                Retour
              </button>
              <input
                type="text"
                value={genericQuery}
                onChange={(e) => setGenericQuery(e.target.value)}
                placeholder="Rechercher un produit générique..."
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
              />
              {genericResults.length > 0 && (
                <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", maxHeight: "340px", overflowY: "auto" }}>
                  {genericResults.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => selectDrink(d)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderBottom: i === genericResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                        padding: "12px 4px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: COLORS.ink,
                      }}
                    >
                      <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={32} fallbackIcon="bottle" />
                      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        {d.abv != null && (
                          <>
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{String(d.abv).replace(".", ",")}% ABV</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "18px",
            }}
          >
            <NavIcon name="bottle" size={18} color={COLORS.amber} />
            <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedDrink.name}</span>
            <button onClick={() => setSelectedDrink(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>

          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Volume (cl)</label>
          <input
            type="text"
            inputMode="decimal"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="ex. 25"
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", marginBottom: "18px" }}
          />

          <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Prix payé (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex. 4,50"
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", marginBottom: "18px" }}
          />

          {venue && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "18px" }}>
              <NavIcon name="map-pin" size={14} color={COLORS.amber} />
              {venue.name}
            </div>
          )}

          {error && <p style={{ fontSize: "12.5px", color: "#FF3B3B", marginTop: "10px" }}>{error}</p>}

          <PrimaryButton onClick={handleSubmit} disabled={!price || saving} style={{ width: "100%", marginTop: "24px" }}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </PrimaryButton>
        </>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Même vrai principe que WaterAlertSettingsScreen (MinorScreens.jsx), mais persisté sur le
// profil plutôt que sur un event de salon — "rounds" (tournées) devient "checkins"
// (consommations du jour).
function WaterAlertSoloSettingsScreen({ myUserId, settings, onSave, onBack }) {
  const wa = settings || {};
  const [mode, setMode] = useState(wa.enabled ? wa.mode || "time" : "off");
  const [everyMinutes, setEveryMinutes] = useState(wa.everyMinutes ? String(wa.everyMinutes) : "30");
  const [everyRounds, setEveryRounds] = useState(wa.everyRounds ? String(wa.everyRounds) : "3");

  const options = [
    { key: "off", label: "Désactivé", desc: "Aucun rappel" },
    { key: "time", label: "Toutes les X minutes", desc: "Rappel basé sur le temps écoulé" },
    { key: "checkins", label: "Toutes les X consommations", desc: "Rappel basé sur le nombre de verres du jour" },
  ];

  const handleSubmit = async () => {
    if (mode === "off") {
      await saveWaterAlertSoloSettings(myUserId, { enabled: false });
      onSave({ enabled: false });
      return;
    }
    const token = await requestNotificationPermissionAndGetToken();
    if (token) {
      await upsertPushSubscription(token, "web");
    } else if (Notification?.permission === "denied") {
      alert("Notifications refusées — le rappel s'affichera quand même à l'écran tant que l'app est ouverte, mais pas en notification.");
    }
    const next = { enabled: true, mode, everyMinutes: parseInt(everyMinutes, 10) || 30, everyRounds: parseInt(everyRounds, 10) || 3 };
    await saveWaterAlertSoloSettings(myUserId, next);
    onSave(next);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 6px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <WaterAlertIcon size={26} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Water<span style={{ color: COLORS.amber }}>Alert</span>
        </h1>
      </div>

      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "18px" }}>
        Un rappel s'affiche pour te suggérer de boire un verre d'eau.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {options.map((o) => (
          <div key={o.key}>
            <button
              onClick={() => setMode(o.key)}
              style={{
                width: "100%",
                textAlign: "left",
                background: mode === o.key ? COLORS.amber : COLORS.surface,
                color: mode === o.key ? COLORS.paper : COLORS.ink,
                border: `2px solid ${mode === o.key ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "14.5px" }}>{o.label}</div>
              <div style={{ fontSize: "12px", marginTop: "2px", opacity: mode === o.key ? 0.85 : 0.65 }}>{o.desc}</div>
            </button>
            {o.key === "time" && mode === "time" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", paddingLeft: "4px" }}>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>Toutes les</span>
                <select
                  value={everyMinutes}
                  onChange={(e) => setEveryMinutes(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" }}
                >
                  {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>minutes</span>
              </div>
            )}
            {o.key === "checkins" && mode === "checkins" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", paddingLeft: "4px" }}>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>Toutes les</span>
                <select
                  value={everyRounds}
                  onChange={(e) => setEveryRounds(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>consommations</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <PrimaryButton onClick={handleSubmit} style={{ width: "100%" }}>
        Valider
      </PrimaryButton>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}

export function BibaSoloScreen({ myUserId, myBibroCode, onRateDrink, onUnrateDrink, onOpenDrink, onBack }) {
  const [checkins, setCheckins] = useState(null);
  const [recentDrinkIds, setRecentDrinkIds] = useState([]);
  const [adding, setAdding] = useState(false);
  const [checkingDrinks, setCheckingDrinks] = useState(false);
  const [caloriesHidden, setCaloriesHidden] = useState(false);
  const [drinksById, setDrinksById] = useState({});
  const [venuesById, setVenuesById] = useState({});

  // Lieu actuel — fixé une fois ici, appliqué automatiquement à chaque verre ajouté ensuite,
  // sans le redemander à chaque fois. Persisté pour tenir jusqu'à ce qu'on le change soi-même,
  // même en quittant puis en revenant sur BibaSolo. Géolocalisation tentée dès l'ouverture de
  // l'écran, en arrière-plan ; silencieuse si refusée ou indisponible, la recherche manuelle
  // reste là.
  const venueStorageKey = `bibasolo-${myUserId}-current-venue`;
  const [currentVenue, setCurrentVenueState] = useState(() => {
    try {
      const stored = localStorage.getItem(venueStorageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const setCurrentVenue = (next) => {
    setCurrentVenueState(next);
    try {
      if (next) localStorage.setItem(venueStorageKey, JSON.stringify(next));
      else localStorage.removeItem(venueStorageKey);
    } catch {
      // localStorage indisponible (mode privé, quota...) — le lieu reste actif pour la session
      // en cours, simplement pas retrouvé à la prochaine ouverture.
    }
  };
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState([]);

  // BibaZERO — même vrai concept qu'en salon (voir BibaBobModal), persisté sur le profil.
  const [bibaZero, setBibaZero] = useState(null);
  const [bibaZeroMenuOpen, setBibaZeroMenuOpen] = useState(false);
  const [bibaBobModalMode, setBibaBobModalMode] = useState(null); // null | "activate" | "deactivate"
  const refreshBibaZero = () => loadMyBibaZeroStatus(myUserId).then(setBibaZero);
  useEffect(() => {
    refreshBibaZero();
  }, [myUserId]);

  // WaterAlert — même vrai concept qu'en salon, mais basé sur le nombre de vraies
  // consommations du jour ("checkins") plutôt que de tournées. Rappel purement visuel, actif
  // uniquement tant que l'app reste ouverte (pas de vrai déclencheur serveur ici, contrairement
  // au salon, qui envoie une vraie notification push même app fermée).
  const [waterAlert, setWaterAlert] = useState(null);
  const [waterAlertModalOpen, setWaterAlertModalOpen] = useState(false);
  const [waterAlertSettingsOpen, setWaterAlertSettingsOpen] = useState(false);
  const waterAlertClaimedForCount = React.useRef(null);
  useEffect(() => {
    loadMyWaterAlertSoloSettings(myUserId).then(setWaterAlert);
  }, [myUserId]);
  useEffect(() => {
    if (!waterAlert || !waterAlert.enabled || waterAlert.mode !== "checkins" || checkins === null) return;
    if (waterAlertClaimedForCount.current === null) {
      waterAlertClaimedForCount.current = checkins.length;
      return;
    }
    const since = checkins.length - (waterAlert.lastReminderCount ?? checkins.length);
    if (checkins.length > waterAlertClaimedForCount.current && since >= (waterAlert.everyRounds || 3)) {
      waterAlertClaimedForCount.current = checkins.length;
      setWaterAlertModalOpen(true);
    }
  }, [checkins?.length, waterAlert?.enabled, waterAlert?.mode]);
  useEffect(() => {
    if (!waterAlert || !waterAlert.enabled || waterAlert.mode !== "time") return;
    const checkElapsed = () => {
      const lastAt = waterAlert.lastReminderAt || new Date().toISOString();
      const elapsedMs = Date.now() - new Date(lastAt).getTime();
      if (elapsedMs >= (waterAlert.everyMinutes || 30) * 60000) {
        setWaterAlertModalOpen(true);
        setWaterAlert((w) => ({ ...w, lastReminderAt: new Date().toISOString() }));
      }
    };
    const interval = setInterval(checkElapsed, 15000);
    return () => clearInterval(interval);
  }, [waterAlert?.enabled, waterAlert?.mode, waterAlert?.lastReminderAt]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadNearbyVenues(pos.coords.latitude, pos.coords.longitude, 500, 5).then(setNearbyVenues);
      },
      () => {},
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const vq = normalize(venueQuery);
  useEffect(() => {
    if (vq.length < 2) {
      setVenueResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchVenues(venueQuery.trim(), 6).then(setVenueResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [vq, venueQuery]);

  const pickVenue = (v) => {
    setCurrentVenue(v);
    setVenuePickerOpen(false);
    setVenueQuery("");
  };

  const refresh = () => loadMySoloCheckins(startOfTodayIso()).then(setCheckins);

  // Favoris — sur tout l'historique, pas seulement aujourd'hui, sinon la liste se vide à
  // chaque nouvelle journée. Limité à 3, le plus ancien pousse dehors dès qu'un nouveau arrive.
  const refreshFavorites = () =>
    loadMySoloCheckins().then((all) => {
      const seen = new Set();
      const ids = [];
      for (const c of all) {
        const key = String(c.drinkId);
        if (!seen.has(key)) {
          seen.add(key);
          ids.push(key);
        }
        if (ids.length >= 3) break;
      }
      setRecentDrinkIds(ids);
    });

  useEffect(() => {
    refresh();
    refreshFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ids = new Set(recentDrinkIds);
    (checkins || []).forEach((c) => ids.add(String(c.drinkId)));
    if (ids.size === 0) {
      setDrinksById({});
      return;
    }
    loadDrinksByIds([...ids]).then((results) => setDrinksById(Object.fromEntries(results.map((d) => [String(d.id), d]))));
  }, [checkins, recentDrinkIds]);

  useEffect(() => {
    const venueIds = new Set((checkins || []).filter((c) => c.venueId).map((c) => String(c.venueId)));
    if (venueIds.size === 0) {
      setVenuesById({});
      return;
    }
    loadVenuesByIds([...venueIds]).then((results) => setVenuesById(Object.fromEntries(results.map((v) => [String(v.id), v]))));
  }, [checkins, recentDrinkIds]);

  const totals = useMemo(() => {
    if (!checkins) return { count: 0, price: 0, kcal: 0 };
    return checkins.reduce(
      (acc, c) => {
        const drink = drinksById[String(c.drinkId)];
        return {
          count: acc.count + 1,
          price: acc.price + (c.price || 0),
          kcal: acc.kcal + (drink ? drinkCalories(drink, c.volumeCl) : 0),
        };
      },
      { count: 0, price: 0, kcal: 0 }
    );
  }, [checkins, drinksById]);

  const handleDelete = async (id) => {
    setCheckins((prev) => prev.filter((c) => c.id !== id));
    await deleteSoloCheckin(id);
  };

  const handleReset = async () => {
    if (!checkins || checkins.length === 0) return;
    if (!window.confirm("Tout effacer pour aujourd'hui ? Cette action est irréversible.")) return;
    const ids = checkins.map((c) => c.id);
    setCheckins([]);
    await Promise.all(ids.map((id) => deleteSoloCheckin(id)));
  };

  if (adding) {
    return (
      <AddSoloCheckinScreen
        myUserId={myUserId}
        recentDrinks={recentDrinkIds.map((id) => drinksById[id]).filter(Boolean)}
        venue={currentVenue}
        bibaZeroActive={!!bibaZero}
        onBack={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          refresh();
          refreshFavorites();
        }}
      />
    );
  }

  if (checkingDrinks) {
    return (
      <DrinkCheckScreen
        drinkIds={(checkins || []).map((c) => c.drinkId)}
        presetVenue={currentVenue ? { id: currentVenue.id, name: currentVenue.name } : null}
        myBibroCode={myBibroCode}
        onBack={() => setCheckingDrinks(false)}
        onRateDrink={onRateDrink}
        onUnrateDrink={onUnrateDrink}
      />
    );
  }

  if (waterAlertSettingsOpen) {
    return (
      <WaterAlertSoloSettingsScreen
        myUserId={myUserId}
        settings={waterAlert}
        onSave={(next) => {
          setWaterAlert(next);
          setWaterAlertSettingsOpen(false);
        }}
        onBack={() => setWaterAlertSettingsOpen(false)}
      />
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 28px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <img src={bibaSoloIconUrl} alt="BibaSolo" style={{ width: "26px", height: "26px" }} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, flex: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Solo</span>
        </h1>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setBibaZeroMenuOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "32px",
              background: bibaZero ? COLORS.amber : "none",
              border: `2px solid ${bibaZero ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "8px",
              cursor: "pointer",
            }}
            title={bibaZero ? "BibaZERO actif" : "Mode BibaZERO"}
          >
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: bibaZero ? COLORS.paper : COLORS.amber }}>ZERO</span>
          </button>
          {bibaZeroMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
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
              {bibaZero ? (
                <>
                  <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>
                    <strong style={{ color: COLORS.ink }}>Actif</strong> — {bibaZero.tolerance === "zero" ? "tolérance zéro" : bibaZero.jokerUsed ? "joker déjà utilisé" : "avec 1 joker"}
                  </p>
                  <button
                    onClick={() => {
                      setBibaBobModalMode("deactivate");
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
                    setBibaBobModalMode("activate");
                    setBibaZeroMenuOpen(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontSize: "12.5px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                >
                  <NavIcon name="play" size={13} color={COLORS.amber} />
                  Activer <span><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>ZERO</span></span>
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setWaterAlertSettingsOpen(true)}
          title="Réglages WaterAlert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            background: waterAlert?.enabled ? COLORS.amber : "none",
            border: `2px solid ${waterAlert?.enabled ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          <WaterAlertIcon size={18} />
        </button>
        <button
          onClick={handleReset}
          title="Réinitialiser aujourd'hui"
          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px", cursor: "pointer", display: "flex" }}
        >
          <NavIcon name="refresh" size={16} color={COLORS.inkSoft} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
        {currentVenue ? (
          <div
            onClick={() => setVenuePickerOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 1,
              minWidth: 0,
              maxWidth: "75%",
              boxSizing: "border-box",
              background: COLORS.surface,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "12px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.amber} />
            <span style={{ minWidth: 0, fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentVenue.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVenue(null);
                setVenuePickerOpen(false);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <NavIcon name="x" size={12} color={COLORS.paperAlt} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setVenuePickerOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              boxSizing: "border-box",
              background: "none",
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "8px 12px",
              cursor: "pointer",
              textAlign: "left",
              color: COLORS.inkSoft,
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.inkSoft} />
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Lieu</span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => setCheckingDrinks(true)}
            title="Drink Check"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: COLORS.amber,
              border: "none",
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <img src={drinkCheckIconUrl} alt="Drink Check" style={{ height: "24px", filter: "brightness(0)" }} />
          </button>
          <button
            onClick={() => setAdding(true)}
            title="Ajouter un verre"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: COLORS.amber,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              fontSize: "22px",
              fontWeight: 700,
              color: COLORS.paper,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, marginBottom: "14px" }} />

      {venuePickerOpen && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            <button
              onClick={() => pickVenue({ id: "@home", name: "@Home" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: COLORS.surface,
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: COLORS.ink,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
                <NavIcon name="map-pin" size={12} color={COLORS.amber} />
              </span>
              @Home
            </button>
            <button
              onClick={() => pickVenue({ id: "@event", name: "@Event" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: COLORS.surface,
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: COLORS.ink,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
                <NavIcon name="map-pin" size={12} color={COLORS.amber} />
              </span>
              @Event
            </button>
          </div>
          {nearbyVenues.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "6px" }}>Lieux proches de toi</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {nearbyVenues.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => pickVenue(v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: COLORS.surface,
                      border: `2px solid ${COLORS.amber}`,
                      borderRadius: "999px",
                      padding: "8px 14px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: COLORS.ink,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
                      <NavIcon name="map-pin" size={12} color={COLORS.amber} />
                    </span>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            value={venueQuery}
            onChange={(e) => setVenueQuery(e.target.value)}
            placeholder="Rechercher un lieu..."
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
          />
          {venueResults.length > 0 && (
            <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
              {venueResults.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => pickVenue(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: i === venueResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "12px 4px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                  }}
                >
                  <NavIcon name="map-pin" size={16} color={COLORS.amber} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{v.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.count}</div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>{totals.count <= 1 ? "Verre" : "Verres"}</div>
        </div>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>
            {totals.price.toFixed(2)} <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
          </div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Dépensé</div>
        </div>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          {caloriesHidden ? (
            <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.inkSoft }}>—</div>
          ) : (
            <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.kcal}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px" }}>
            <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>Kcal</span>
            <button
              onClick={() => setCaloriesHidden((h) => !h)}
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: 0 }}
              title={caloriesHidden ? "Afficher les calories" : "Masquer les calories"}
            >
              <NavIcon name={caloriesHidden ? "eye-off" : "eye"} size={11} color={COLORS.inkSoft} />
            </button>
          </div>
        </div>
      </div>
      <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, marginBottom: "18px" }} />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {checkins === null ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : checkins.length === 0 ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Rien d'encodé aujourd'hui.</p>
        ) : (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {checkins.map((c, i) => {
              const drink = drinksById[String(c.drinkId)];
              const venue = c.venueId ? venuesById[String(c.venueId)] : null;
              const showMentions = drink && VOLUME_DISPLAY_TYPES.includes(drink.type);
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    padding: "12px 0",
                    borderBottom: i === checkins.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <button
                      onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                      disabled={!drink || !onOpenDrink}
                      style={{ background: "none", border: "none", padding: 0, cursor: drink && onOpenDrink ? "pointer" : "default", flexShrink: 0, marginTop: "2px" }}
                    >
                      <EntityAvatar photoUrl={drink?.photoUrl} photoEmoji={drink?.avatarEmoji} size={40} fallbackIcon="bottle" />
                    </button>
                    <button
                      onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                      disabled={!drink || !onOpenDrink}
                      style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: drink && onOpenDrink ? "pointer" : "default" }}
                    >
                      {/* Ligne 1 — produit + volume */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{drink?.name || "Boisson"}</span>
                        {c.volumeCl && <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.amber, flexShrink: 0 }}>{c.volumeCl}cl.</span>}
                      </div>
                      {/* Ligne 2 — mentions + drapeau, séparés par un point vert fluo */}
                      {(() => {
                        const mentionParts = [];
                        if (drink?.nationality) mentionParts.push(<CountryFlagImg key="flag" country={drink.nationality} size={16} />);
                        if (showMentions && drink.bio) mentionParts.push(<span key="bio">Bio</span>);
                        if (showMentions && drink.glutenFree) mentionParts.push(<span key="gf">Sans gluten</span>);
                        if (showMentions && drink.abv != null) mentionParts.push(<span key="abv">{String(drink.abv).replace(".", ",")}% ABV</span>);
                        if (mentionParts.length === 0) return null;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, marginTop: "3px", flexWrap: "wrap" }}>
                            {mentionParts.map((part, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                                {part}
                              </React.Fragment>
                            ))}
                          </div>
                        );
                      })()}
                    </button>
                    {c.price != null && (
                      <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, marginTop: "2px", flexShrink: 0 }}>
                        {c.price.toFixed(2)} <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
                      </span>
                    )}
                  </div>
                  {/* Ligne 3 — lieu + date + heure (séparés par un point vert fluo), croix à l'extrême droite */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginLeft: "50px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: "wrap" }}>
                      {[venue?.name, formatDateOnly(c.createdAt), formatTimeOnly(c.createdAt)].filter(Boolean).map((part, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}>
                      <NavIcon name="x" size={14} color={COLORS.paperAlt} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {bibaBobModalMode && (
        <BibaBobModal
          friendName="toi"
          storedPin={bibaZero?.pin}
          mode={bibaBobModalMode}
          onActivate={async (tolerance, pin) => {
            const result = await activateBibaZeroSolo(myUserId, tolerance, pin);
            if (result?.error) {
              alert(result.error);
              return;
            }
            setBibaBobModalMode(null);
            refreshBibaZero();
          }}
          onDeactivate={async () => {
            const result = await deactivateBibaZeroSolo(myUserId, bibaZero?.pin);
            if (result?.error) {
              alert(result.error);
              return;
            }
            setBibaBobModalMode(null);
            refreshBibaZero();
          }}
          onClose={() => setBibaBobModalMode(null)}
        />
      )}
      {waterAlertModalOpen && <WaterAlertModal onClose={() => setWaterAlertModalOpen(false)} />}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
