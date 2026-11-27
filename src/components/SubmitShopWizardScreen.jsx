// ============================================================
// Ajouter un shop (point de vente de boissons à emporter) — même parcours que « Ajouter un lieu » (SubmitVenueWizardScreen) : une vraie info à la fois,
// RIEN n'est écrit en base tant que l'utilisateur n'a pas validé la dernière page ET confirmé le popup qui suit.
//
// Les pages dépendent du type choisi (deux pastilles cumulables, comme dans la plateforme de gestion) :
//   Type → Dénomination → [Magasin : Pays → Code postal & Commune → Adresse → Géocodage & Vérification] → [En ligne : Pays desservis] → Site web → Catégorie.
// Magasin seul : 8 pages ; En ligne seul : 5 pages ; les deux : 9 pages. Le type vient en premier (décidé par Mehdi, 2026-11-23) : la barre de progression est juste dès la 2e page.
//
// Doublons (calculés dans l'appareil, sur la liste lue par loadShopsDirectory, sans appel de plus) :
//   - le nom : les shops au nom proche s'affichent en direct dès la première page (toucher une ligne ouvre sa fiche) ;
//   - l'adresse d'un magasin : même nom à la même adresse = « existe déjà » (on ne peut pas continuer) ; un autre shop à la même adresse = avertissement, il faut
//     cocher « Ce n'est pas le même shop » ;
//   - le site d'une boutique en ligne : un shop en ligne qui a déjà ce site = même avertissement. (Pas pour un magasin : une enseigne partage son site entre tous ses magasins.)
// Pas de photo à la création : la fonction Edge d'envoi des images réserve le dossier `shop-photos` à l'équipe et aux comptes professionnels.
// Rien d'autre qu'une proposition : le shop est créé « À traiter » par l'app (voir createShopFromApp), visible tout de suite, relu ensuite par l'équipe.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS, COUNTRIES, COUNTRY_ISO_CODES, SHOP_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PrimaryButton } from "./ui.jsx";
import { VenuePositionPicker } from "./MoreSearchPickers.jsx";
import { AddressAutocomplete } from "./AddressAutocomplete.jsx";
import { StepShell, inputStyle, requiredStyle, labelStyle, capitalizeFirst } from "./SubmitVenueWizardScreen.jsx";
import { createShopFromApp, geocodeAddress, loadShopsDirectory, searchShops, loadShopListsOnce, COUNTRY_LABEL_TO_CODE } from "../data/sharedDirectories.js";
import { orderedList } from "../venueLists.js";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";
import { normalizeForDuplicateCheck, formatAddress } from "../utils.js";
import { findSimilarNames } from "../similarNames.js";
import { DuplicateBox, ExistingEntityRow, NotSameCheckbox, duplicateNoteStyle } from "./DuplicateWarning.jsx";
import { notify } from "./MessageToast.jsx";

const GEOAPIFY_CONFIGURED = !!(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEOAPIFY_API_KEY);

// Les pays qu'une fiche sait enregistrer (ceux qui ont un code technique).
const SHOP_COUNTRIES = COUNTRIES.filter((c) => COUNTRY_LABEL_TO_CODE[c]);

const stripArticle = (s) => (s || "").trim().replace(/^(le|la|les|l')\s*/i, "");
const sameText = (a, b) => normalizeForDuplicateCheck(a || "") === normalizeForDuplicateCheck(b || "");
const shopPlace = (s) => (s.hasStore ? formatAddress(s) : "En ligne");

// Le site tapé : vide si le champ n'a gardé que son début « https:// » ; « www.exemple.be » devient « https://www.exemple.be ».
const cleanWebsite = (s) => {
  const v = (s || "").trim();
  if (!v || v === "https://" || v === "http://") return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};
const isValidWebsite = (v) => /^https?:\/\/[^\s/.]+\.[^\s/]+/i.test(v);
const hostOf = (url) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

// Une pastille à cocher (type, catégorie).
const pillStyle = (checked) => ({
  background: checked ? COLORS.amber : "none",
  border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`,
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "11px",
  fontWeight: 600,
  color: checked ? COLORS.paper : COLORS.ink,
  cursor: "pointer",
});

export function SubmitShopWizardScreen({ initialName = "", onDone, onCancel, onOpenExisting }) {
  // Les shops déjà enregistrés, pour les avertissements de doublon. `shopsReady` : la lecture a répondu (même par un échec : on continue alors sans avertissement).
  const [allShops, setAllShops] = useState([]);
  const [shopsReady, setShopsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadShopsDirectory().then((list) => {
      if (cancelled) return;
      if (list) setAllShops(list);
      setShopsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Les catégories : celles du code, complétées par la plateforme de gestion (noms, ordre, éléments ajoutés ou supprimés).
  const [shopLists, setShopLists] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadShopListsOnce().then((lists) => {
      if (lists && !cancelled) setShopLists(lists);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const categoryOptions = orderedList(SHOP_CATEGORIES, shopLists?.[SHOP_CATEGORY_LIST_KEY].rows, shopLists?.[SHOP_CATEGORY_LIST_KEY].order);

  // Dénomination
  const [name, setName] = useState(initialName);
  const [nameMatches, setNameMatches] = useState([]);
  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      setNameMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // Les noms proches comptent aussi (mots en plus ou en moins, petite faute de frappe) : voir similarNames.js ; la recherche du serveur est `search_shops`
      // (une lecture en échec ne propose rien : on continue sans avertissement de nom).
      const fetcher = async (text, limit) => (await searchShops(stripArticle(text), limit)) || [];
      findSimilarNames(q, fetcher, 5).then((found) => {
        if (!cancelled) setNameMatches(found);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name]);

  // Type (cumulable : un shop peut avoir un magasin ET une boutique en ligne)
  const [hasStore, setHasStore] = useState(false);
  const [hasOnline, setHasOnline] = useState(false);

  // Magasin : pays, code postal / commune, adresse
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [streetName, setStreetName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [village, setVillage] = useState("");
  const [sameAddressNotSame, setSameAddressNotSame] = useState(false);
  useEffect(() => {
    setSameAddressNotSame(false);
  }, [name, postalCode, city, streetName, streetNumber]);

  // Magasin : géocodage
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeNotFound, setGeocodeNotFound] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const [geocodeSource, setGeocodeSource] = useState(null);
  const [geocodeConfidence, setGeocodeConfidence] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  // L'adresse a changé depuis le dernier géocodage : la position d'avant ne vaut plus.
  useEffect(() => {
    setLat(null);
    setLng(null);
    setGeocodeStatus(null);
    setGeocodeSource(null);
    setGeocodeConfidence(null);
    setGeocodeNotFound(false);
  }, [country, postalCode, city, streetName, streetNumber]);

  // En ligne : pays desservis
  const [deliveryCountries, setDeliveryCountries] = useState([]);

  // Site web (obligatoire pour une boutique en ligne, facultatif pour un magasin) — le champ commence par « https:// », comme dans la plateforme de gestion.
  const [website, setWebsite] = useState("https://");
  const [sameSiteNotSame, setSameSiteNotSame] = useState(false);
  useEffect(() => {
    setSameSiteNotSame(false);
  }, [website]);

  // Catégorie
  const [categories, setCategories] = useState([]);
  const toggleCategory = (code) => setCategories((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  const chosenCategories = categories.filter((code) => categoryOptions.some((c) => c.code === code));

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [saving, setSaving] = useState(false);

  // Les pages, selon le type : les pages du magasin et celles de la boutique en ligne n'existent que si le type est coché.
  const steps = useMemo(
    () => ["type", "name", ...(hasStore ? ["country", "postal", "address", "geocode"] : []), ...(hasOnline ? ["delivery"] : []), "website", "categories"],
    [hasStore, hasOnline]
  );
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const goNext = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const goPrevious = stepIdx > 0 ? () => setStepIdx((i) => Math.max(i - 1, 0)) : undefined;
  const shell = { step: stepIdx + 1, totalSteps: steps.length, onBack: onCancel, onPrevious: goPrevious };

  // Doublons d'adresse (un magasin) : même nom à la même adresse = déjà là ; un autre nom à la même adresse = à confirmer.
  const sameAddressAll = useMemo(() => {
    if (step !== "address") return [];
    return allShops.filter((s) => s.hasStore && sameText(s.postalCode, postalCode) && sameText(s.city, city) && sameText(s.streetName, streetName.trim()) && sameText(s.streetNumber, streetNumber.trim()));
  }, [step, allShops, postalCode, city, streetName, streetNumber]);
  const exactDuplicate = sameAddressAll.find((s) => sameText(stripArticle(s.name), stripArticle(name)));
  const otherAtSameAddress = sameAddressAll.filter((s) => s !== exactDuplicate);

  // Doublon de site (boutique en ligne seulement).
  const websiteValue = cleanWebsite(website);
  const websiteOk = websiteValue ? isValidWebsite(websiteValue) : !hasOnline;
  const sameSiteShops = useMemo(() => {
    if (step !== "website" || !hasOnline || !websiteValue || !isValidWebsite(websiteValue)) return [];
    const host = hostOf(websiteValue);
    return host ? allShops.filter((s) => s.hasOnline && s.website && hostOf(s.website) === host) : [];
  }, [step, hasOnline, websiteValue, allShops]);

  const countryIso = COUNTRY_ISO_CODES[COUNTRY_LABEL_TO_CODE[country] || country];

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeocodeNotFound(false);
    const result = await geocodeAddress({ streetName, streetNumber, postalCode, city, countryIsoCode: countryIso });
    setGeocoding(false);
    if (!result || result.notFound) {
      setGeocodeNotFound(true);
      return;
    }
    setGeocodeStatus(result.status);
    setGeocodeSource(result.source);
    setGeocodeConfidence(result.confidence);
    setLat(result.lat);
    setLng(result.lng);
  };

  const handlePositionChange = (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    if (newLat != null && newLng != null) {
      setGeocodeStatus("manual");
      setGeocodeSource("manual");
      setGeocodeConfidence(null);
    }
  };

  // Vraie création, en un seul appel — déclenchée uniquement par le « OK » du popup de confirmation.
  const handleConfirmCreate = async () => {
    setSaving(true);
    const created = await createShopFromApp({
      id: `shop-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: name.trim(),
      hasStore,
      hasOnline,
      categories: chosenCategories,
      country,
      streetName: streetName.trim(),
      streetNumber: streetNumber.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      village: village.trim(),
      lat,
      lng,
      geocodeStatus,
      geocodeSource,
      geocodeConfidence,
      deliveryCountries,
      website: websiteValue,
    });
    if (!created) {
      setSaving(false);
      notify("La création du shop a échoué.\nRéessaie.");
      return;
    }
    setSaving(false);
    setShowConfirmPopup(false);
    onDone(created);
  };

  const nextButton = (disabled, label = "Suivant") => (
    <PrimaryButton onClick={goNext} disabled={disabled} style={{ width: "100%" }}>
      {label}
    </PrimaryButton>
  );

  if (step === "name") {
    return (
      <StepShell {...shell} title="Dénomination" footer={nextButton(!name.trim())}>
        <p style={{ fontSize: "13px", color: COLORS.pinkFluo, fontWeight: 600, margin: "0 0 20px 0" }}>Vérifie bien les majuscules et l'orthographe</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du shop" style={requiredStyle(name.trim().length > 0)} autoFocus />
        {nameMatches.length > 0 && (
          <DuplicateBox title="Shop(s) similaire(s) déjà existant(s) :" style={{ marginTop: "10px" }}>
            {nameMatches.map((s) => (
              <ExistingEntityRow key={s.id} photoUrl={s.profilePhotoUrl} title={s.name} subtitle={shopPlace(s)} onClick={() => onOpenExisting(s.id)} />
            ))}
          </DuplicateBox>
        )}
      </StepShell>
    );
  }

  if (step === "type") {
    const typeButton = (checked, onToggle, title, caption, key) => (
      <button
        key={key}
        data-shop-type={key}
        onClick={onToggle}
        style={{
          width: "100%",
          boxSizing: "border-box",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: COLORS.surface,
          border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "14px",
          cursor: "pointer",
          color: COLORS.ink,
        }}
      >
        <span style={{ width: "22px", height: "22px", borderRadius: "6px", border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`, background: checked ? COLORS.amber : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {checked && <NavIcon name="check" size={14} color={COLORS.paper} />}
        </span>
        <span>
          <span style={{ display: "block", fontWeight: 700, fontSize: "14.5px" }}>{title}</span>
          <span style={{ display: "block", fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{caption}</span>
        </span>
      </button>
    );
    return (
      <StepShell {...shell} title="Type" footer={nextButton(!hasStore && !hasOnline)}>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Minimum 1 - Les deux sont possibles</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {typeButton(hasStore, () => setHasStore((v) => !v), "Magasin", "On s'y rend : une adresse, un point sur la carte", "store")}
          {typeButton(hasOnline, () => setHasOnline((v) => !v), "En ligne", "Une boutique en ligne : un site web, des pays où elle livre", "online")}
        </div>
      </StepShell>
    );
  }

  if (step === "country") {
    return (
      <StepShell {...shell} title="Pays" footer={nextButton(!country)}>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={requiredStyle(!!country)}>
          <option value="">Choisir un pays</option>
          {SHOP_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </StepShell>
    );
  }

  if (step === "postal") {
    return (
      <StepShell {...shell} title="Code postal & Commune" footer={nextButton(!postalCode.trim() || !city.trim())}>
        {GEOAPIFY_CONFIGURED ? (
          <AddressAutocomplete postalCode={postalCode} city={city} countryIsoCode={countryIso} onPostalCodeChange={setPostalCode} onCityChange={setCity} required />
        ) : (
          <>
            <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Code postal" style={{ ...requiredStyle(postalCode.trim().length > 0), marginBottom: "16px" }} autoFocus />
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Commune" style={requiredStyle(city.trim().length > 0)} />
          </>
        )}
      </StepShell>
    );
  }

  if (step === "address") {
    const blocked = !shopsReady || !streetName.trim() || !streetNumber.trim() || !!exactDuplicate || (otherAtSameAddress.length > 0 && !sameAddressNotSame);
    return (
      <StepShell {...shell} title="Adresse" footer={nextButton(blocked, shopsReady ? "Suivant" : "Vérification...")}>
        <input
          type="text"
          value={streetName}
          onChange={(e) => setStreetName(capitalizeFirst(e.target.value))}
          placeholder="Rue / Place / Avenue / Boulevard"
          style={{ ...requiredStyle(streetName.trim().length > 0), marginBottom: "16px" }}
          autoFocus
        />
        <input type="text" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="N°" style={{ ...requiredStyle(streetNumber.trim().length > 0), marginBottom: "16px", width: "100px" }} />
        <input type="text" value={village} onChange={(e) => setVillage(capitalizeFirst(e.target.value))} placeholder="Section / Village" style={inputStyle} />
        {exactDuplicate && (
          <DuplicateBox title="Ce shop existe déjà :" style={{ marginTop: "20px" }}>
            <ExistingEntityRow photoUrl={exactDuplicate.profilePhotoUrl} title={exactDuplicate.name} subtitle={shopPlace(exactDuplicate)} onClick={() => onOpenExisting(exactDuplicate.id)} />
            <p style={duplicateNoteStyle}>
              Tu ne peux pas le rajouter :
              <br />
              ouvre sa fiche et suggère-y une modification.
            </p>
          </DuplicateBox>
        )}
        {!exactDuplicate && otherAtSameAddress.length > 0 && (
          <DuplicateBox title="Un autre shop est déjà enregistré à cette adresse :" style={{ marginTop: "20px" }}>
            {otherAtSameAddress.map((s) => (
              <ExistingEntityRow key={s.id} photoUrl={s.profilePhotoUrl} title={s.name} subtitle={shopPlace(s)} onClick={() => onOpenExisting(s.id)} />
            ))}
            <p style={duplicateNoteStyle}>
              S'il s'agit du même shop sous un autre nom,
              <br />
              ouvre sa fiche plutôt que d'en créer une nouvelle,
              <br />
              et suggère-y une modification.
            </p>
            <NotSameCheckbox checked={sameAddressNotSame} onChange={setSameAddressNotSame} label="Ce n'est pas le même shop" />
          </DuplicateBox>
        )}
      </StepShell>
    );
  }

  if (step === "geocode") {
    return (
      <StepShell {...shell} title="Géocodage & Vérification" footer={nextButton(false)}>
        <button
          onClick={handleGeocode}
          disabled={geocoding}
          style={{
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "12px",
            padding: "12px",
            color: COLORS.amber,
            fontSize: "14px",
            fontWeight: 700,
            cursor: geocoding ? "default" : "pointer",
            marginBottom: "10px",
          }}
        >
          {!geocoding && <NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          {geocoding ? "Géocodage..." : "Géocoder automatiquement"}
        </button>
        {geocodeNotFound && <p style={{ whiteSpace: "pre-line", fontSize: "12px", color: COLORS.wine, marginBottom: "10px" }}>{"Adresse introuvable.\nVérifie les pages précédentes, ou place le repère manuellement ci-dessous."}</p>}
        {!geocodeNotFound && geocodeStatus && <p style={{ whiteSpace: "pre-line", fontSize: "12px", color: COLORS.amber, marginBottom: "10px" }}>{"✓ Position géocodée.\nVérifie ou ajuste ci-dessous si besoin."}</p>}
        <label style={labelStyle}>Vérification sur la carte</label>
        <VenuePositionPicker lat={lat} lng={lng} onChange={handlePositionChange} verified={["verified", "exact", "manual"].includes(geocodeStatus)} />
      </StepShell>
    );
  }

  if (step === "delivery") {
    const remaining = SHOP_COUNTRIES.filter((c) => !deliveryCountries.includes(c));
    return (
      <StepShell {...shell} title="Pays desservis" footer={nextButton(deliveryCountries.length === 0)}>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Les pays où la boutique en ligne livre - Minimum 1</p>
        {deliveryCountries.length > 0 && (
          <div data-delivery-countries style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {deliveryCountries.map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 6px 5px 12px", borderRadius: "999px", border: `2px solid ${COLORS.amber}`, fontSize: "12px", fontWeight: 600 }}>
                {c}
                <button
                  onClick={() => setDeliveryCountries((prev) => prev.filter((x) => x !== c))}
                  aria-label={`Retirer ${c}`}
                  style={{ background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", fontSize: "13px", padding: "0 6px", lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <select
          value=""
          onChange={(e) => e.target.value && setDeliveryCountries((prev) => [...prev, e.target.value])}
          style={requiredStyle(deliveryCountries.length > 0)}
        >
          <option value="">{deliveryCountries.length > 0 ? "Ajouter un autre pays" : "Choisir un pays"}</option>
          {remaining.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </StepShell>
    );
  }

  if (step === "website") {
    const blocked = !websiteOk || (sameSiteShops.length > 0 && !sameSiteNotSame);
    return (
      <StepShell {...shell} title="Site web" footer={nextButton(blocked)}>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>{hasOnline ? "Obligatoire pour une boutique en ligne" : "Facultatif"}</p>
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
          style={hasOnline ? requiredStyle(websiteOk) : inputStyle}
          autoFocus
        />
        {websiteValue && !isValidWebsite(websiteValue) && <p style={{ whiteSpace: "pre-line", fontSize: "12px", color: COLORS.wine, margin: "8px 0 0 0" }}>{"Adresse invalide.\nElle doit commencer par https://"}</p>}
        {sameSiteShops.length > 0 && (
          <DuplicateBox title="Un shop en ligne a déjà ce site :" style={{ marginTop: "20px" }}>
            {sameSiteShops.map((s) => (
              <ExistingEntityRow key={s.id} photoUrl={s.profilePhotoUrl} title={s.name} subtitle={shopPlace(s)} onClick={() => onOpenExisting(s.id)} />
            ))}
            <p style={duplicateNoteStyle}>
              S'il s'agit du même shop,
              <br />
              ouvre sa fiche plutôt que d'en créer une nouvelle.
            </p>
            <NotSameCheckbox checked={sameSiteNotSame} onChange={setSameSiteNotSame} label="Ce n'est pas le même shop" />
          </DuplicateBox>
        )}
      </StepShell>
    );
  }

  return (
    <>
      <StepShell
        {...shell}
        title="Catégorie"
        footer={
          <PrimaryButton onClick={() => setShowConfirmPopup(true)} disabled={chosenCategories.length === 0} withCheck style={{ width: "100%" }}>
            Valider
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Minimum 1 - Plusieurs choix possibles</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {categoryOptions.map((c) => (
            <button key={c.code} data-shop-category={c.code} onClick={() => toggleCategory(c.code)} style={pillStyle(chosenCategories.includes(c.code))}>
              {c.fr}
            </button>
          ))}
        </div>
      </StepShell>

      {showConfirmPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 2000 }}>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "16px", padding: "24px", maxWidth: "360px" }}>
            <p style={{ fontSize: "14.5px", color: COLORS.ink, margin: "0 0 20px 0", lineHeight: 1.6 }}>
              Merci pour ta contribution !
              <br />
              Elle sera vérifiée prochainement.
              <br />
              En attendant, elle est déjà disponible sur Bib<span style={{ color: COLORS.amber }}>Atlas</span>.
            </p>
            <PrimaryButton onClick={handleConfirmCreate} disabled={saving} style={{ width: "100%" }}>
              {saving ? "Enregistrement..." : "OK"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </>
  );
}
