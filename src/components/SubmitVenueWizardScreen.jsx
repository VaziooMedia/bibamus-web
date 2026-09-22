// ============================================================
// Ajouter un lieu — même vrai principe que "Proposer une boisson" (SubmitDrinkWizardScreen) :
// un vrai parcours en 5 pages, une vraie info à la fois. Le lieu est créé dès la page 1
// (status "to_process", donc déjà visible/utilisable, comme pour les produits) ; abandonner
// avant la toute dernière page supprime le brouillon.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS, COUNTRIES, COUNTRY_ISO_CODES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PrimaryButton } from "./ui.jsx";
import { VenuePositionPicker } from "./MoreSearchPickers.jsx";
import { AddressAutocomplete } from "./AddressAutocomplete.jsx";
import { createPublicVenue, updatePublicVenue, deletePublicVenue, geocodeAddress, saveGeocodeResult, searchVenues } from "../data/sharedDirectories.js";
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
const labelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" };

export function SubmitVenueWizardScreen({ onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [venueId, setVenueId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const validatedRef = useRef(false);
  const venueIdRef = useRef(null);
  useEffect(() => {
    venueIdRef.current = venueId;
  }, [venueId]);

  // Filet de sécurité : si l'utilisateur quitte cet écran par un autre chemin que la vraie
  // validation finale, le brouillon créé est supprimé.
  useEffect(() => {
    return () => {
      if (venueIdRef.current && !validatedRef.current) {
        deletePublicVenue(venueIdRef.current);
      }
    };
  }, []);

  // Page 1 — Dénomination
  const [name, setName] = useState("");

  // Page 2 — Pays
  const [country, setCountry] = useState("");

  // Page 3 — Code postal / Commune
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  // Page 4 — Rue + N° + Section/Village
  const [streetName, setStreetName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [village, setVillage] = useState("");

  // Page 5 — Géocodage + vérification
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeNotFound, setGeocodeNotFound] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAbandon = async () => {
    if (venueId) {
      if (!window.confirm("Abandonner la création de ce lieu ? Rien ne sera enregistré.")) return;
      await deletePublicVenue(venueId);
    }
    onCancel();
  };

  const goToStep1 = async () => {
    setSubmitting(true);
    const newId = `venue-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const created = await createPublicVenue({ id: newId, name: name.trim(), status: "to_process", menu: [], likes: [] });
    setSubmitting(false);
    if (!created) {
      alert("La création du lieu a échoué — merci de réessayer.");
      return;
    }
    setVenueId(newId);
    setStep(2);
  };

  const goToStep2 = async () => {
    setSubmitting(true);
    await updatePublicVenue(venueId, { country });
    setSubmitting(false);
    setStep(3);
  };

  const goToStep3 = async () => {
    setSubmitting(true);
    await updatePublicVenue(venueId, { postalCode: postalCode.trim(), city: city.trim() });
    setSubmitting(false);
    setStep(4);
  };

  const goToStep4 = async () => {
    setSubmitting(true);
    const trimmedStreetName = streetName.trim();
    const trimmedStreetNumber = streetNumber.trim();
    const results = await searchVenues(name.trim());
    const duplicate = results.find(
      (v) =>
        v.id !== venueId &&
        normalizeForDuplicateCheck(v.name) === normalizeForDuplicateCheck(name) &&
        normalizeForDuplicateCheck(v.postalCode || "") === normalizeForDuplicateCheck(postalCode) &&
        normalizeForDuplicateCheck(v.city || "") === normalizeForDuplicateCheck(city) &&
        normalizeForDuplicateCheck(v.streetName || "") === normalizeForDuplicateCheck(trimmedStreetName) &&
        normalizeForDuplicateCheck(v.streetNumber || "") === normalizeForDuplicateCheck(trimmedStreetNumber)
    );
    if (duplicate) {
      setSubmitting(false);
      alert(`Alerte :\n"${duplicate.name}, ${duplicate.streetName}, ${duplicate.streetNumber} - ${duplicate.postalCode} ${duplicate.city}" existe déjà.\nVous ne pouvez pas le rajouter.`);
      return;
    }
    await updatePublicVenue(venueId, { streetName: trimmedStreetName, streetNumber: trimmedStreetNumber, village: village.trim() || null });
    setSubmitting(false);
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
      countryIsoCode: COUNTRY_ISO_CODES[country],
    });
    setGeocoding(false);
    if (!result || result.notFound) {
      setGeocodeNotFound(true);
      return;
    }
    setGeocodeStatus(result.status);
    setLat(result.lat);
    setLng(result.lng);
    await saveGeocodeResult(venueId, { lat: result.lat, lng: result.lng, source: result.source, confidence: result.confidence, status: result.status });
  };

  const handlePositionChange = async (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    if (newLat != null && newLng != null) {
      setGeocodeStatus("manual");
      await saveGeocodeResult(venueId, { lat: newLat, lng: newLng, source: "manual", confidence: null, status: "manual" });
    }
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    validatedRef.current = true;
    setSaving(false);
    onDone(venueId);
  };

  if (step === 1) {
    return (
      <StepShell
        step={1}
        totalSteps={5}
        title="Dénomination"
        onBack={onCancel}
        footer={
          <PrimaryButton onClick={goToStep1} disabled={!name.trim() || submitting} style={{ width: "100%" }}>
            {submitting ? "Vérification..." : "Suivant"}
          </PrimaryButton>
        }
      >
        <label style={labelStyle}>Nom du lieu</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du lieu" style={inputStyle} autoFocus />
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        step={2}
        totalSteps={5}
        title="Pays"
        onBack={handleAbandon}
        onPrevious={() => setStep(1)}
        footer={
          <PrimaryButton onClick={goToStep2} disabled={!country || submitting} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <label style={labelStyle}>Pays</label>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle}>
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
        totalSteps={5}
        title="Code postal & Commune"
        onBack={handleAbandon}
        onPrevious={() => setStep(2)}
        footer={
          <PrimaryButton onClick={goToStep3} disabled={!postalCode.trim() || !city.trim() || submitting} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        {GEOAPIFY_CONFIGURED ? (
          <AddressAutocomplete
            postalCode={postalCode}
            city={city}
            countryIsoCode={COUNTRY_ISO_CODES[country]}
            onPostalCodeChange={setPostalCode}
            onCityChange={setCity}
          />
        ) : (
          <>
            <label style={labelStyle}>Code postal</label>
            <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="0000" style={{ ...inputStyle, marginBottom: "16px" }} autoFocus />
            <label style={labelStyle}>Commune</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Commune" style={inputStyle} />
          </>
        )}
      </StepShell>
    );
  }

  if (step === 4) {
    return (
      <StepShell
        step={4}
        totalSteps={5}
        title="Adresse"
        onBack={handleAbandon}
        onPrevious={() => setStep(3)}
        footer={
          <PrimaryButton onClick={goToStep4} disabled={!streetName.trim() || !streetNumber.trim() || submitting} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <label style={labelStyle}>Rue / Place / Avenue / Boulevard</label>
        <input type="text" value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder="Adresse" style={{ ...inputStyle, marginBottom: "16px" }} autoFocus />
        <label style={labelStyle}>Numéro</label>
        <input type="text" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="00" style={{ ...inputStyle, marginBottom: "16px", width: "100px" }} />
        <label style={labelStyle}>Section / Village (facultatif)</label>
        <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Section / Village" style={inputStyle} />
      </StepShell>
    );
  }

  return (
    <StepShell
      step={5}
      totalSteps={5}
      title="Géocodage & Vérification"
      onBack={handleAbandon}
      onPrevious={() => setStep(4)}
      footer={
        <PrimaryButton onClick={handleFinalSubmit} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Enregistrement..." : "Valider"}
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
