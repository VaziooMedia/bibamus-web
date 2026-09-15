// ============================================================
// BibaSolo — accessible depuis BibaGo. Historique continu de
// consommations personnelles, sans notion de session/salon :
// on choisit une boisson, un prix (obligatoire), un lieu
// (optionnel), et c'est tout. Récapitulatif du jour visible en
// direct au-dessus de la liste.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS, COUNTRY_FLAGS, VOLUME_DISPLAY_TYPES, MENU_CATEGORIES } from "../constants.js";
import { NavIcon, FlagIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { addSoloCheckin, loadMySoloCheckins, deleteSoloCheckin, searchDrinks, loadDrinksByIds, searchVenues, loadVenuesByIds, loadNearbyVenues, loadGenericDrinks } from "../data/sharedDirectories.js";
import { drinkTypeLabel } from "../utils.js";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";

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

// Écran d'ajout — recherche une boisson, prix obligatoire. Le lieu est fixé une fois sur la
// page principale de BibaSolo et appliqué automatiquement ici, sans le redemander à chaque verre.
function AddSoloCheckinScreen({ myUserId, recentDrinks = [], venue, onDone, onBack }) {
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

  // Carte du lieu choisi — comme dans un salon, seuls les vrais produits du catalogue (pas les
  // ajouts purement locaux au menu d'un lieu) peuvent être réutilisés ici, sinon le nom ne se
  // résoudrait plus correctement ensuite dans l'historique ou les stats.
  const venueMenuItems = (() => {
    const seen = new Set();
    return (venue?.menu || []).filter((item) => item.fromDirectory && item.sourceDrinkId && !seen.has(item.sourceDrinkId) && seen.add(item.sourceDrinkId));
  })();
  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const venueCategories = MENU_CATEGORIES.filter((cat) => venueMenuItems.some((d) => categoryOf(d) === cat));
  const itemsInCategory = (cat) => venueMenuItems.filter((d) => categoryOf(d) === cat).sort((a, b) => a.name.localeCompare(b.name));

  const q = normalize(query);
  const [drinkResults, setDrinkResults] = useState([]);
  useEffect(() => {
    if (q.length < 2) {
      setDrinkResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchDrinks(query.trim(), 8).then(setDrinkResults);
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
  const genericResults = gq.length === 0 ? genericDrinks : genericDrinks.filter((d) => normalize(d.name).includes(gq));

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
              {recentDrinks.length > 0 && (
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Favoris</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {recentDrinks.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => selectDrink(d)}
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
                        <NavIcon name="bottle" size={14} color={COLORS.amber} />
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Quelle boisson ?</label>
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
                    <NavIcon name="bottle" size={18} color={COLORS.amber} />
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>Carte de {venue.name}</span>
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
                  <NavIcon name="search" size={18} color={COLORS.amber} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>Rechercher dans BibAtlas</span>
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
                  <NavIcon name="search" size={18} color={COLORS.amber} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>Produit générique</span>
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
              ) : (
                <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                  {itemsInCategory(activeCategory).map((item, i, arr) => (
                    <button
                      key={item.sourceDrinkId}
                      onClick={() => selectVenueMenuItem(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                        padding: "12px 4px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: COLORS.ink,
                      }}
                    >
                      <NavIcon name="bottle" size={16} color={COLORS.amber} />
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{item.name}</span>
                      {item.price != null && <span style={{ fontSize: "13px", color: COLORS.amber, fontWeight: 700 }}>{String(item.price).replace(".", ",")} €</span>}
                    </button>
                  ))}
                </div>
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
                      <NavIcon name="bottle" size={16} color={COLORS.amber} />
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{d.name}</span>
                      <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>{d.type}</span>
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
                      <NavIcon name="bottle" size={16} color={COLORS.amber} />
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{d.name}</span>
                      <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>{d.type}</span>
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

export function BibaSoloScreen({ myUserId, onOpenDrink, onBack }) {
  const [checkins, setCheckins] = useState(null);
  const [recentDrinkIds, setRecentDrinkIds] = useState([]);
  const [adding, setAdding] = useState(false);
  const [drinksById, setDrinksById] = useState({});
  const [venuesById, setVenuesById] = useState({});

  // Lieu actuel — fixé une fois ici, appliqué automatiquement à chaque verre ajouté ensuite,
  // sans le redemander à chaque fois. Géolocalisation tentée dès l'ouverture de l'écran, en
  // arrière-plan ; silencieuse si refusée ou indisponible, la recherche manuelle reste là.
  const [currentVenue, setCurrentVenue] = useState(null);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState([]);

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
        onBack={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          refresh();
          refreshFavorites();
        }}
      />
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <img src={bibaSoloIconUrl} alt="BibaSolo" style={{ width: "26px", height: "26px" }} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, flex: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Solo</span>
        </h1>
        <button
          onClick={handleReset}
          title="Réinitialiser aujourd'hui"
          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px", cursor: "pointer", display: "flex" }}
        >
          <NavIcon name="refresh" size={16} color={COLORS.inkSoft} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
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
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.amber} />
            <span style={{ minWidth: 0, fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentVenue.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVenue(null);
                setVenuePickerOpen(false);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
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
              padding: "10px 14px",
              cursor: "pointer",
              textAlign: "left",
              color: COLORS.inkSoft,
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.inkSoft} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Lieu</span>
          </button>
        )}
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
                      fontSize: "13px",
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
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.kcal}</div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Kcal</div>
        </div>
      </div>

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
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 0",
                    borderBottom: i === checkins.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                  }}
                >
                  <button
                    onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                    disabled={!drink || !onOpenDrink}
                    style={{ background: "none", border: "none", padding: 0, cursor: drink && onOpenDrink ? "pointer" : "default", flexShrink: 0, marginTop: "2px" }}
                  >
                    <EntityAvatar size={40} fallbackIcon="bottle" />
                  </button>
                  <button
                    onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                    disabled={!drink || !onOpenDrink}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: drink && onOpenDrink ? "pointer" : "default" }}
                  >
                    {/* Ligne 1 — produit */}
                    <div style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{drink?.name || "Boisson"}</div>
                    {/* Ligne 2 — volume + mentions + drapeau */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: COLORS.inkSoft, marginTop: "3px", flexWrap: "wrap" }}>
                      {c.volumeCl && <span>{c.volumeCl} cl.</span>}
                      {showMentions && drink.abv != null && <span>· {String(drink.abv).replace(".", ",")}%</span>}
                      {showMentions && drink.bio && <span>· Bio</span>}
                      {showMentions && drink.glutenFree && <span>· Sans gluten</span>}
                      {drink?.nationality && COUNTRY_FLAGS[drink.nationality] && (
                        <span style={{ marginLeft: "2px" }}>
                          <FlagIcon flag={COUNTRY_FLAGS[drink.nationality]} size={12} />
                        </span>
                      )}
                    </div>
                    {/* Ligne 3 — lieu + date + heure */}
                    <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "3px" }}>
                      {venue ? `${venue.name} · ` : ""}
                      {formatDateOnly(c.createdAt)} · {formatTimeOnly(c.createdAt)}
                    </div>
                  </button>
                  {c.price != null && (
                    <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, marginTop: "2px" }}>
                      {c.price.toFixed(2)} <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
                    </span>
                  )}
                  <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginTop: "2px" }}>
                    <NavIcon name="trash" size={14} color={COLORS.inkSoft} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
