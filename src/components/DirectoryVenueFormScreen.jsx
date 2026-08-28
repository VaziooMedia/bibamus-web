// ============================================================
// Formulaire "Proposer un établissement" — copié tel quel depuis
// le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, VENUE_TYPE_TAGS, COUNTRIES, DRINK_TYPES, BEER_TYPES, DRINK_CATEGORY_ICONS, MENU_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { DrinkDirectoryPicker } from "./DrinkDirectoryPicker.jsx";
import { DrinkRow } from "./DrinkRow.jsx";
import { VenuePositionPicker } from "./MoreSearchPickers.jsx";
import { capitalizeFirst, drinkTypeLabel, nextId, isValidVenuePhone, resolveMenuItem } from "../utils.js";

export function DirectoryVenueFormScreen({ venue, drinksDirectory, breweriesDirectory, onRegisterBrewery, addIntent, suggestMode, menuOnly, onSave, onCancel }) {
  const [name, setName] = useState(venue?.name || "");
  const [subtitle, setSubtitle] = useState(venue?.subtitle || "");
  const [streetName, setStreetName] = useState(venue?.streetName || "");
  const [streetNumber, setStreetNumber] = useState(venue?.streetNumber || "");
  const [postalCode, setPostalCode] = useState(venue?.postalCode || "");
  const [city, setCity] = useState(venue?.city || "");
  const [village, setVillage] = useState(venue?.village || "");
  const [country, setCountry] = useState(venue?.country || "Belgique");
  const [phone, setPhone] = useState(venue?.phone || "");
  const [email, setEmail] = useState(venue?.email || "");
  const [website, setWebsite] = useState(venue?.website || "");
  const [googleUrl, setGoogleUrl] = useState(venue?.googleUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(venue?.facebookUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(venue?.instagramUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(venue?.tiktokUrl || "");
  const [hasFood, setHasFood] = useState(!!venue?.hasFood);
  const [defaultCurrency, setDefaultCurrency] = useState(venue?.defaultCurrency || "euro");
  const [jetonUnitValueInput, setJetonUnitValueInput] = useState(venue?.jetonUnitValue ? String(venue.jetonUnitValue) : "");
  const [tags, setTags] = useState(venue?.tags || []);
  const [lat, setLat] = useState(venue?.lat ?? null);
  const [lng, setLng] = useState(venue?.lng ?? null);
  const [menu, setMenu] = useState(venue?.menu || []);
  const [activeMenuCategory, setActiveMenuCategory] = useState(null);

  const incompleteMenuItems = menu
    .map((d) => resolveMenuItem(d, drinksDirectory))
    .filter((d) => {
      const isBeerItem = BEER_TYPES.includes(d.type);
      const isSoftItem = d.type === "Softs & Eaux";
      if ((isBeerItem || isSoftItem) && !d.volumeCl) return true;
      if (isBeerItem && !d.servingMode) return true;
      return false;
    });

  const canSave = name.trim().length > 0 && isValidVenuePhone(phone) && incompleteMenuItems.length === 0;
  const fieldStyle = { padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px", width: "100%" };

  const [pendingSpiritSource, setPendingSpiritSource] = useState(null);

  const addDrinkFromDirectory = (source, menuCategory) => {
    setMenu((prev) => [
      ...prev,
      {
        id: nextId(),
        price: 0,
        volumeCl: source.defaultVolumeCl || null,
        servingMode: source.defaultServingMode || "",
        fromDirectory: true,
        sourceDrinkId: source.id,
        ...(menuCategory ? { menuCategory } : {}),
      },
    ]);
  };

  const handlePickFromDirectory = (source) => {
    if (source.type === "Spiritueux") {
      setPendingSpiritSource(source);
    } else {
      addDrinkFromDirectory(source);
    }
  };

  const removeDrink = (id) => setMenu((prev) => prev.filter((d) => d.id !== id));

  // Moves an item up/down within its own category — items of different categories are
  // interleaved in the flat menu array, so the nearest same-category neighbor is what moves.
  const moveMenuItem = (id, direction) => {
    setMenu((prev) => {
      const categoryOf = (item) => {
        const resolved = resolveMenuItem(item, drinksDirectory);
        const effective = item.menuCategory || resolved.type;
        return MENU_CATEGORIES.includes(effective) ? effective : "Non classé";
      };
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      const cat = categoryOf(prev[idx]);
      let neighborIdx = -1;
      if (direction === "up") {
        for (let i = idx - 1; i >= 0; i--) {
          if (categoryOf(prev[i]) === cat) {
            neighborIdx = i;
            break;
          }
        }
      } else {
        for (let i = idx + 1; i < prev.length; i++) {
          if (categoryOf(prev[i]) === cat) {
            neighborIdx = i;
            break;
          }
        }
      }
      if (neighborIdx === -1) return prev;
      const next = [...prev];
      [next[idx], next[neighborIdx]] = [next[neighborIdx], next[idx]];
      return next;
    });
  };


  const setPrice = (id, price) => setMenu((prev) => prev.map((d) => (d.id === id ? { ...d, price: isNaN(price) ? 0 : price } : d)));

  const setDrinkField = (id, field, value) => setMenu((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));

  const toggleBeerTag = (id, tag) =>
    setMenu((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const tags = d.beerTags || [];
        return { ...d, beerTags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] };
      })
    );

  const isJetonMenu = defaultCurrency === "jeton";
  const menuPriceStep = isJetonMenu ? "1" : "0.10";
  const menuPriceSymbol = isJetonMenu ? <NavIcon name="jeton" size={17} color={COLORS.jetonFluo} /> : "€";

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 6px 0" }}>
        {menuOnly ? "Carte boissons" : !venue ? (addIntent ? "Créer ce lieu" : "Proposer un établissement") : suggestMode ? "Suggérer une modification" : "Éditer la fiche"}
      </h1>
      {menuOnly && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          {venue.name} — se modifie librement, par n'importe qui, à tout moment.
        </p>
      )}
      {!menuOnly && !venue && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          {addIntent
            ? "Il sera ajouté à tes lieux favoris immédiatement — et visible dans le répertoire tout de suite, avec un badge \"en attente\" jusqu'à vérification par un administrateur."
            : "Il sera visible et utilisable immédiatement, avec un badge \"en attente\" jusqu'à vérification par un administrateur."}
        </p>
      )}
      {!menuOnly && suggestMode && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          Ce lieu est certifié — tes changements sur le nom, l'adresse, le téléphone, etc. seront proposés à un administrateur. La carte boissons, elle, se modifie toujours directement.
        </p>
      )}

      {!menuOnly && (
      <>
      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Nom *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Café du Centre" autoFocus style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Sous-titre (facultatif)</label>
      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex. Événement & Loisirs" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Adresse</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder="Rue / place" style={{ ...fieldStyle, flex: 2.2 }} />
        <input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="N°" style={{ ...fieldStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Code postal" style={{ ...fieldStyle, flex: 1 }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" style={{ ...fieldStyle, flex: 2 }} />
      </div>
      <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village (facultatif, si différent de la ville)" style={fieldStyle} />
      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Position sur la carte</label>
      <div style={{ marginBottom: "18px" }}>
        <VenuePositionPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
      </div>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Numéro de téléphone</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Ex. +32 80 12 34 56"
        style={{ ...fieldStyle, marginBottom: isValidVenuePhone(phone) ? "14px" : "6px", borderColor: isValidVenuePhone(phone) ? COLORS.paperAlt : COLORS.wine }}
      />
      {!isValidVenuePhone(phone) && (
        <p style={{ fontSize: "11.5px", color: COLORS.wine, marginTop: "-2px", marginBottom: "14px" }}>
          Doit commencer par le préfixe international (ex. +32 pour la Belgique).
        </p>
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Adresse e-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.com" style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Site internet</label>
      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Google (page ou avis)</label>
      <input value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Facebook</label>
      <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien Instagram</label>
      <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." style={fieldStyle} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Lien TikTok</label>
      <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@..." style={fieldStyle} />

      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: COLORS.ink, marginBottom: "18px", cursor: "pointer" }}>
        <input type="checkbox" checked={hasFood} onChange={(e) => setHasFood(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: COLORS.amber }} />
        Restauration possible, en plus des boissons
      </label>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Moyen de paiement habituel</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px" }}>
        Juste un préréglage — modifiable à tout moment lors d'un BibaRoom ou d'un événement.
      </p>
      <div style={{ display: "flex", gap: "10px", marginBottom: defaultCurrency === "jeton" ? "10px" : "18px" }}>
        <button
          onClick={() => setDefaultCurrency("euro")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",
            border: `2px solid ${defaultCurrency === "euro" ? COLORS.ink : COLORS.paperAlt}`,
            background: defaultCurrency === "euro" ? COLORS.amber : COLORS.surface,
            color: defaultCurrency === "euro" ? COLORS.paper : COLORS.ink,
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          € Euros
        </button>
        <button
          onClick={() => setDefaultCurrency("jeton")}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",
            border: `2px solid ${defaultCurrency === "jeton" ? COLORS.ink : COLORS.paperAlt}`,
            background: defaultCurrency === "jeton" ? COLORS.amber : COLORS.surface,
            color: defaultCurrency === "jeton" ? COLORS.paper : COLORS.ink,
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <NavIcon name="jeton" size={20} color={COLORS.jetonFluo} />
            Jetons
          </span>
        </button>
      </div>
      {defaultCurrency === "jeton" && (
        <input
          value={jetonUnitValueInput}
          onChange={(e) => setJetonUnitValueInput(e.target.value.replace(",", "."))}
          placeholder="Valeur d'un jeton en € (ex. 1.50)"
          inputMode="decimal"
          style={{ ...fieldStyle, marginBottom: "18px" }}
        />
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Type d'établissement</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px" }}>Plusieurs choix possibles.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
        {VENUE_TYPE_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: `1.5px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
                background: active ? COLORS.amber : COLORS.surface,
                color: active ? COLORS.paper : COLORS.ink,
                fontSize: "12.5px",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
      </>
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Carte boissons {!menuOnly && "(facultatif)"}</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px" }}>
        Piochez dans le répertoire pour des caractéristiques standardisées. Produit manquant ? Ajoutez-le d'abord dans "Boissons" — des génériques existent déjà pour les cas non standardisés (ex. "Cocktail Maison").
      </p>

      {(() => {
        const resolvedMenu = menu.map((d) => resolveMenuItem(d, drinksDirectory));
        const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
        const countFor = (cat) => resolvedMenu.filter((d) => categoryOf(d) === cat).length;
        const itemsIn = (cat) => resolvedMenu.filter((d) => categoryOf(d) === cat);
        const uncategorizedCount = countFor("Non classé");

        const directoryPoolFor = (cat) =>
          !cat
            ? drinksDirectory || []
            : cat === "Shots"
            ? (drinksDirectory || []).filter((d) => d.type === "Spiritueux")
            : (drinksDirectory || []).filter((d) => d.type === cat);

        const addControls = (
          <>
            <div style={{ marginBottom: "10px" }}>
              <DrinkDirectoryPicker
                drinks={directoryPoolFor(activeMenuCategory)}
                onPick={(source) => (source.type === "Spiritueux" && !activeMenuCategory ? handlePickFromDirectory(source) : addDrinkFromDirectory(source, activeMenuCategory || undefined))}
              />
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
          </>
        );

        if (activeMenuCategory) {
          return (
            <div style={{ marginBottom: "20px" }}>
              <button
                onClick={() => setActiveMenuCategory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "10px", display: "flex", alignItems: "center" }}
                title="Toutes les catégories"
                aria-label="Toutes les catégories"
              >
                <NavIcon name="back-triangle" size={20} color={COLORS.amber} />
              </button>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
                {DRINK_CATEGORY_ICONS[activeMenuCategory] || "📦"} {drinkTypeLabel(activeMenuCategory).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                {itemsIn(activeMenuCategory).length === 0 && (
                  <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson dans cette catégorie pour l'instant.</p>
                )}
                {itemsIn(activeMenuCategory).map((d, i, arr) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                      <button
                        onClick={() => moveMenuItem(d.id, "up")}
                        disabled={i === 0}
                        style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "2px", opacity: i === 0 ? 0.25 : 1, fontSize: "12px", lineHeight: 1 }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveMenuItem(d.id, "down")}
                        disabled={i === arr.length - 1}
                        style={{ background: "none", border: "none", cursor: i === arr.length - 1 ? "default" : "pointer", padding: "2px", opacity: i === arr.length - 1 ? 0.25 : 1, fontSize: "12px", lineHeight: 1 }}
                      >
                        ▼
                      </button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <DrinkRow
                        drink={d}
                        priceStep={menuPriceStep}
                        priceSymbol={menuPriceSymbol}
                        onChangeName={(v) => setDrinkField(d.id, "name", v)}
                        onChangePrice={(p) => setPrice(d.id, p)}
                        onChangeType={(t) => setDrinkField(d.id, "type", t)}
                        onChangeVolume={(v) => setDrinkField(d.id, "volumeCl", v)}
                        onChangeKcal={(k) => setDrinkField(d.id, "kcalPer100ml", k)}
                        onChangeServingMode={(m) => setDrinkField(d.id, "servingMode", m)}
                        onToggleBeerTag={(tag) => toggleBeerTag(d.id, tag)}
                        onChangeBrewery={(b) => setDrinkField(d.id, "brewery", b)}
                        onChangeAbv={(abv) => setDrinkField(d.id, "abv", abv)}
                        onChangeMenuCategory={(cat) => setDrinkField(d.id, "menuCategory", cat)}
                        onRemove={() => removeDrink(d.id)}
                        breweriesDirectory={breweriesDirectory}
                        onRegisterBrewery={onRegisterBrewery}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {addControls}
            </div>
          );
        }

        return (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
              {MENU_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveMenuCategory(cat)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px" }}>
                    <span style={{ fontSize: "16px" }}>{DRINK_CATEGORY_ICONS[cat]}</span>
                    {drinkTypeLabel(cat)}
                  </span>
                  <span style={{ fontSize: "12px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(cat)} →</span>
                </button>
              ))}
              {uncategorizedCount > 0 && (
                <button
                  onClick={() => setActiveMenuCategory("Non classé")}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px" }}>
                    <span style={{ fontSize: "16px" }}>📦</span>
                    Non classé
                  </span>
                  <span style={{ fontSize: "12px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{uncategorizedCount} →</span>
                </button>
              )}
            </div>
            {addControls}
          </div>
        );
      })()}

      {incompleteMenuItems.length > 0 && (
        <p style={{ fontSize: "12.5px", color: COLORS.wine, fontWeight: 600, marginBottom: "10px" }}>
          ⚠️ {incompleteMenuItems.length} produit{incompleteMenuItems.length > 1 ? "s" : ""} incomplet{incompleteMenuItems.length > 1 ? "s" : ""} — le volume est obligatoire pour les bières et softs, le type de service pour les bières.
        </p>
      )}

      <PrimaryButton
        onClick={() =>
          canSave &&
          onSave({
            name: capitalizeFirst(name.trim()),
            subtitle: subtitle.trim(),
            streetName: streetName.trim(),
            streetNumber: streetNumber.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            village: village.trim(),
            country: country.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            googleUrl: googleUrl.trim(),
            facebookUrl: facebookUrl.trim(),
            instagramUrl: instagramUrl.trim(),
            tiktokUrl: tiktokUrl.trim(),
            hasFood,
            defaultCurrency,
            jetonUnitValue: isNaN(parseFloat(jetonUnitValueInput)) ? 0 : parseFloat(jetonUnitValueInput),
            tags,
            lat,
            lng,
            menu,
          })
        }
        disabled={!canSave}
        style={{ marginTop: "4px", width: "100%" }}
      >
        {menuOnly ? "Enregistrer la carte" : !venue ? (addIntent ? "Créer et ajouter à mes favoris" : "Proposer cet établissement") : suggestMode ? "Envoyer la suggestion" : "Enregistrer"}
      </PrimaryButton>
      <BackFooterLink onClick={onCancel} />
    </div>
  );
}
