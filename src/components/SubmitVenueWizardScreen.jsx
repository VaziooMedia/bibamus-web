// ============================================================
// Ajouter un lieu — un vrai parcours en 7 pages, une vraie info à la fois. Contrairement à la
// version précédente, RIEN n'est écrit en base tant que l'utilisateur n'a pas validé la toute
// dernière page ET confirmé le vrai popup qui suit — tout reste en mémoire locale jusque-là.
// Ça évite les vrais brouillons/tests qui apparaissaient dans BibAtlas avant toute validation.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, COUNTRIES, COUNTRY_ISO_CODES, VENUE_TYPES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PrimaryButton } from "./ui.jsx";
import { VenuePositionPicker } from "./MoreSearchPickers.jsx";
import { AddressAutocomplete } from "./AddressAutocomplete.jsx";
import { createPublicVenue, saveGeocodeResult, geocodeAddress, searchVenues, COUNTRY_LABEL_TO_CODE } from "../data/sharedDirectories.js";
import { normalizeForDuplicateCheck } from "../utils.js";

const GEOAPIFY_CONFIGURED = !!(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEOAPIFY_API_KEY);

function StepShell({ step, totalSteps, title, onBack, onPrevious, children, footer }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < step ? COLORS.amber : COLORS.paperAlt }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{title}</h1>
      </div>
      <div>{children}</div>
      {onPrevious && (
        <button
          onClick={onPrevious}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "24px 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
          Précédent
        </button>
      )}
      <div style={{ marginTop: "24px" }}>{footer}</div>
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" };
const requiredStyle = (filled) => ({ ...inputStyle, border: `2px solid ${filled ? COLORS.amber : COLORS.pinkFluo}` });
const labelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" };
const capitalizeFirst = (s) => (s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const AMENITY_FIELDS = [
  ["hasOccasionalKaraoke", "Karaokés occasionnels"],
  ["hasOccasionalConcerts", "Concerts occasionnels"],
  ["hasBilliards", "Billard"],
  ["hasFoosball", "Babyfoot - Kicker"],
  ["hasDarts", "Jeu de fléchettes"],
  ["hasBingo", "Bingo"],
  ["hasFood", "Restauration"],
  ["hasSnacks", "Petite restauration"],
  ["hasTerrace", "Terrasse"],
  ["wheelchairAccessible", "Accessible PMR"],
  ["hasWifi", "WiFi gratuit"],
  ["hasDogs", "Chiens acceptés"],
  ["canDance", "Possibilité de danser (en soirée)"],
  ["reservationPossible", "Réservation possible"],
  ["goodForGroups", "Idéal pour des grands groupes"],
  ["privatizationPossible", "Privatisation possible"],
  ["hasPrivateRoom", "Salle annexe privée disponible"],
  ["smokingArea", "Espace fumeurs"],
];

export function SubmitVenueWizardScreen({ onDone, onCancel }) {
  const [step, setStep] = useState(1);

  // Page 1 — Dénomination
  const [name, setName] = useState("");

  // Repère les vraies correspondances existantes en direct pendant la saisie du nom, avec
  // leur vraie adresse (essentiel pour les lieux, vu la fréquence des homonymes).
  const [nameMatches, setNameMatches] = useState([]);
  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      setNameMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      searchVenues(q, 5).then(setNameMatches);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  // Page 2 — Pays
  const [country, setCountry] = useState("");

  // Page 3 — Code postal / Commune
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  // Page 4 — Rue + N° + Section/Village
  const [streetName, setStreetName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [village, setVillage] = useState("");
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Page 5 — Géocodage + vérification
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeNotFound, setGeocodeNotFound] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const [geocodeSource, setGeocodeSource] = useState(null);
  const [geocodeConfidence, setGeocodeConfidence] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // Page 6 — Type
  const [venueTypes, setVenueTypes] = useState([]);
  const toggleVenueType = (code) => setVenueTypes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  // Page 7 — Aménités
  const [amenities, setAmenities] = useState({});
  const toggleAmenity = (key) => setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));

  // Vraie confirmation finale — rien n'est créé avant que l'utilisateur clique "OK" ici.
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [saving, setSaving] = useState(false);

  const stripArticle = (s) => (s || "").trim().replace(/^(le|la|les|l')\s*/i, "");
  const normalizeVenueName = (s) => normalizeForDuplicateCheck(stripArticle(s));

  const goToStep4 = async () => {
    setCheckingDuplicate(true);
    const trimmedStreetName = streetName.trim();
    const trimmedStreetNumber = streetNumber.trim();
    const results = await searchVenues(stripArticle(name.trim()));
    setCheckingDuplicate(false);
    const duplicate = results.find(
      (v) =>
        normalizeVenueName(v.name) === normalizeVenueName(name) &&
        normalizeForDuplicateCheck(v.postalCode || "") === normalizeForDuplicateCheck(postalCode) &&
        normalizeForDuplicateCheck(v.city || "") === normalizeForDuplicateCheck(city) &&
        normalizeForDuplicateCheck(v.streetName || "") === normalizeForDuplicateCheck(trimmedStreetName) &&
        normalizeForDuplicateCheck(v.streetNumber || "") === normalizeForDuplicateCheck(trimmedStreetNumber)
    );
    if (duplicate) {
      alert(`Alerte :\n"${duplicate.name}, ${duplicate.streetName}, ${duplicate.streetNumber} - ${duplicate.postalCode} ${duplicate.city}" existe déjà.\nVous ne pouvez pas le rajouter.`);
      return;
    }
    setStreetName(trimmedStreetName);
    setStreetNumber(trimmedStreetNumber);
    setStep(5);
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeocodeNotFound(false);
    const result = await geocodeAddress({
      streetName,
      streetNumber,
      postalCode,
      city,
      countryIsoCode: COUNTRY_ISO_CODES[COUNTRY_LABEL_TO_CODE[country] || country],
    });
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

  // Vraie création complète, en un seul vrai appel — déclenchée uniquement par le "OK" du
  // popup de confirmation, jamais avant.
  const handleConfirmCreate = async () => {
    setSaving(true);
    const newId = `venue-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const created = await createPublicVenue({
      id: newId,
      name: name.trim(),
      country,
      postalCode: postalCode.trim(),
      city: city.trim(),
      streetName: streetName.trim(),
      streetNumber: streetNumber.trim(),
      village: village.trim() || null,
      venueTypes,
      ...amenities,
      status: "to_process",
      menu: [],
      likes: [],
    });
    if (!created) {
      setSaving(false);
      alert("La création du lieu a échoué — merci de réessayer.");
      return;
    }
    if (lat != null && lng != null) {
      await saveGeocodeResult(newId, { lat, lng, source: geocodeSource, confidence: geocodeConfidence, status: geocodeStatus });
    }
    setSaving(false);
    setShowConfirmPopup(false);
    onDone(newId);
  };

  if (step === 1) {
    return (
      <StepShell
        step={1}
        totalSteps={7}
        title="Dénomination"
        onBack={onCancel}
        footer={
          <PrimaryButton onClick={() => setStep(2)} disabled={!name.trim()} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "13px", color: COLORS.pinkFluo, fontWeight: 600, margin: "0 0 20px 0" }}>Vérifie bien les majuscules et l'orthographe</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du lieu" style={requiredStyle(name.trim().length > 0)} autoFocus />
        {nameMatches.length > 0 && (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.pinkFluo}`, borderRadius: "12px", padding: "10px 12px", marginTop: "10px" }}>
            <p style={{ fontSize: "11.5px", color: COLORS.pinkFluo, fontWeight: 700, margin: "0 0 6px 0" }}>Lieu(x) similaire(s) déjà existant(s) :</p>
            {nameMatches.map((v) => (
              <div key={v.id} style={{ padding: "4px 0" }}>
                <div style={{ fontSize: "12.5px", fontWeight: 600 }}>{v.name}</div>
                {(v.streetName || v.city) && (
                  <div style={{ fontSize: "11px", color: COLORS.inkSoft }}>
                    {[v.streetName && v.streetNumber ? `${v.streetName}, ${v.streetNumber}` : v.streetName, v.postalCode && v.city ? `${v.postalCode} ${v.city}` : v.city].filter(Boolean).join(" - ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        step={2}
        totalSteps={7}
        title="Pays"
        onBack={onCancel}
        onPrevious={() => setStep(1)}
        footer={
          <PrimaryButton onClick={() => setStep(3)} disabled={!country} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={requiredStyle(!!country)}>
          <option value="">Choisir un pays</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell
        step={3}
        totalSteps={7}
        title="Code postal & Commune"
        onBack={onCancel}
        onPrevious={() => setStep(2)}
        footer={
          <PrimaryButton onClick={() => setStep(4)} disabled={!postalCode.trim() || !city.trim()} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        {GEOAPIFY_CONFIGURED ? (
          <AddressAutocomplete
            postalCode={postalCode}
            city={city}
            countryIsoCode={COUNTRY_ISO_CODES[COUNTRY_LABEL_TO_CODE[country] || country]}
            onPostalCodeChange={setPostalCode}
            onCityChange={setCity}
            required
          />
        ) : (
          <>
            <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Code postal" style={{ ...requiredStyle(postalCode.trim().length > 0), marginBottom: "16px" }} autoFocus />
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Commune" style={requiredStyle(city.trim().length > 0)} />
          </>
        )}
      </StepShell>
    );
  }

  if (step === 4) {
    return (
      <StepShell
        step={4}
        totalSteps={7}
        title="Adresse"
        onBack={onCancel}
        onPrevious={() => setStep(3)}
        footer={
          <PrimaryButton onClick={goToStep4} disabled={!streetName.trim() || !streetNumber.trim() || checkingDuplicate} style={{ width: "100%" }}>
            {checkingDuplicate ? "Vérification..." : "Suivant"}
          </PrimaryButton>
        }
      >
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
      </StepShell>
    );
  }

  if (step === 5) {
    return (
      <StepShell
        step={5}
        totalSteps={7}
        title="Géocodage & Vérification"
        onBack={onCancel}
        onPrevious={() => setStep(4)}
        footer={
          <PrimaryButton onClick={() => setStep(6)} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
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
        {geocodeNotFound && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "10px" }}>Adresse introuvable — vérifiez les pages précédentes, ou placez le repère manuellement ci-dessous.</p>}
        {!geocodeNotFound && geocodeStatus && <p style={{ fontSize: "12px", color: COLORS.amber, marginBottom: "10px" }}>✓ Position géocodée — vérifiez ou ajustez ci-dessous si besoin.</p>}

        <label style={labelStyle}>Vérification sur la carte</label>
        <VenuePositionPicker lat={lat} lng={lng} onChange={handlePositionChange} verified={["verified", "exact", "manual"].includes(geocodeStatus)} />
      </StepShell>
    );
  }

  if (step === 6) {
    return (
      <StepShell
        step={6}
        totalSteps={7}
        title="Type"
        onBack={onCancel}
        onPrevious={() => setStep(5)}
        footer={
          <PrimaryButton onClick={() => setStep(7)} disabled={venueTypes.length === 0} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Minimum 1 - Plusieurs choix possibles</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {VENUE_TYPES.map((t) => {
            const checked = venueTypes.includes(t.code);
            return (
              <button
                key={t.code}
                onClick={() => toggleVenueType(t.code)}
                style={{
                  background: checked ? COLORS.amber : "none",
                  border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "999px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: checked ? COLORS.paper : COLORS.ink,
                  cursor: "pointer",
                }}
              >
                {t.fr}
              </button>
            );
          })}
        </div>
      </StepShell>
    );
  }

  return (
    <>
      <StepShell
        step={7}
        totalSteps={7}
        title="Aménités"
        onBack={onCancel}
        onPrevious={() => setStep(6)}
        footer={
          <PrimaryButton onClick={() => setShowConfirmPopup(true)} style={{ width: "100%" }}>
            Valider
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif - Plusieurs choix possibles</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {AMENITY_FIELDS.map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer" }}>
              <input type="checkbox" checked={!!amenities[key]} onChange={() => toggleAmenity(key)} style={{ width: "18px", height: "18px", accentColor: COLORS.amber, flexShrink: 0 }} />
              {label}
            </label>
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
