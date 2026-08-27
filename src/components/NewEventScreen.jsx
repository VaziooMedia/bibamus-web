// ============================================================
// Écran de création d'un nouvel événement/salon — copié tel
// quel depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { ParticipantsEditor, PublicVenueSearchPicker } from "./Pickers.jsx";
import { NearbyVenueSuggestions } from "./NearbyVenueSuggestions.jsx";
import { capitalizeFirst, todayISO } from "../utils.js";

export function NewEventScreen({ mode: screenKind = "solo", onCreate, onCancel, venues = [], publicVenues = [], onResolvePublicVenue, bibros = [] }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("euro");
  const [date, setDate] = useState(todayISO());
  const [jetonUnitValue, setJetonUnitValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [eventMode, setEventMode] = useState("tournees");
  const [participants, setParticipants] = useState([]);

  const isSalon = screenKind === "salon";
  const canCreate = name.trim().length > 0;

  const pickVenue = (venue) => {
    if (selectedVenueId === venue.id) {
      setSelectedVenueId(null);
      return;
    }
    if (selectedVenueId === "@home") {
      setEventMode("tournees");
    }
    setSelectedVenueId(venue.id);
    setName(venue.name);
    if (venue.defaultCurrency) {
      setCurrency(venue.defaultCurrency);
      setJetonUnitValue(venue.defaultCurrency === "jeton" && venue.jetonUnitValue ? String(venue.jetonUnitValue) : "");
    }
  };

  const pickHome = () => {
    if (selectedVenueId === "@home") {
      setSelectedVenueId(null);
      setEventMode("tournees");
      return;
    }
    setSelectedVenueId("@home");
    setName("@Home");
    setEventMode("openbar");
    setCurrency("euro");
  };

  const pickEventPlace = () => {
    if (selectedVenueId === "@event") {
      setSelectedVenueId(null);
      return;
    }
    if (selectedVenueId === "@home") {
      setEventMode("tournees");
    }
    setSelectedVenueId("@event");
    setName("@Event");
  };

  const pickFromDirectory = (publicVenueOrDraft) => {
    const resolved = onResolvePublicVenue(publicVenueOrDraft);
    pickVenue(resolved);
  };

  const clearVenue = () => {
    if (selectedVenueId === "@home") {
      setEventMode("tournees");
    }
    setSelectedVenueId(null);
    setName("");
  };

  const handleSubmit = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim(), currency, date, parseFloat(jetonUnitValue) || 0, selectedVenueId, eventMode, participants);
    } catch (e) {
      setError("Un problème est survenu. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 6px 0" }}>{isSalon ? "Nouveau BibaRoom" : "Nouvel événement"}</h1>
      {isSalon && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>
          Tu seras l'hôte. Un code à 4 caractères sera généré pour que tes amis rejoignent depuis leur téléphone.
        </p>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Favoris</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            onClick={pickHome}
            style={{
              background: selectedVenueId === "@home" ? COLORS.amber : COLORS.surfaceAlt,
              color: selectedVenueId === "@home" ? COLORS.paper : COLORS.amber,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <NavIcon name="home" size={15} color={selectedVenueId === "@home" ? COLORS.paper : COLORS.amber} />
              @Home
            </span>
          </button>
          <button
            onClick={pickEventPlace}
            style={{
              background: selectedVenueId === "@event" ? COLORS.amber : COLORS.surfaceAlt,
              color: selectedVenueId === "@event" ? COLORS.paper : COLORS.amber,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            @Event
          </button>
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => pickVenue(v)}
              style={{
                background: selectedVenueId === v.id ? COLORS.amber : COLORS.surface,
                color: selectedVenueId === v.id ? COLORS.paper : COLORS.ink,
                border: `2px solid ${selectedVenueId === v.id ? COLORS.ink : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v.name}
            </button>
          ))}
        </div>
        {selectedVenueId === "@home" && (
          <p style={{ fontSize: "11.5px", color: COLORS.amber, marginTop: "8px" }}>
            La carte s'ouvrira sur l'ensemble du répertoire "Boissons", en Mode Open Bar — pas de prix à gérer, chacun boit ce qu'il y a.
          </p>
        )}
        {selectedVenueId === "@event" && (
          <p style={{ fontSize: "11.5px", color: COLORS.amber, marginTop: "8px" }}>
            Pour un lieu ponctuel sans fiche répertoriée — festival, mariage, fête d'entreprise... Tu composeras la carte boissons toi-même.
          </p>
        )}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>
          {venues.length > 0 ? "Autres lieux" : "Un lieu déjà répertorié ?"}
        </label>
        <NearbyVenueSuggestions onPick={pickFromDirectory} />
        <PublicVenueSearchPicker publicVenues={publicVenues} myVenues={venues} onPick={pickFromDirectory} />
      </div>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", marginTop: isSalon ? 0 : "4px" }}>
        Titre de la session
      </label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          value={name}
          onChange={(e) => setName(capitalizeFirst(e.target.value))}
          placeholder="Titre de la session"
          autoFocus={venues.length === 0}
          style={{
            flex: 1,
            padding: "13px 14px",
            borderRadius: "10px",
            border: `2px solid ${COLORS.paperAlt}`,
            fontSize: "15px",
            outline: "none",
            background: COLORS.surface,
            color: COLORS.ink,
          }}
        />
        {selectedVenueId && (
          <button
            onClick={clearVenue}
            style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "0 14px", fontSize: "13px", color: COLORS.inkSoft, cursor: "pointer" }}
          >
            Changer
          </button>
        )}
      </div>


      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>
        Participants
      </label>
      <div style={{ marginBottom: "20px" }}>
        <ParticipantsEditor names={participants} onChange={setParticipants} bibros={bibros} />
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-14px", marginBottom: "20px" }}>
        Tu pourras toujours en ajouter plus tard.
      </p>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Choix du mode</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "tournees", label: "Mode ORBIS", desc: "Tournées" },
          { key: "cagnotte", label: "Mode ARCA", desc: "Cagnotte" },
          { key: "addition", label: "Mode PARTES", desc: "Addition partagée" },
          { key: "openbar", label: "Mode LIBER", desc: "Open bar" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setEventMode(m.key);
              if (m.key === "addition" || m.key === "openbar") setCurrency("euro");
            }}
            style={{
              textAlign: "left",
              background: eventMode === m.key ? COLORS.amber : COLORS.surface,
              color: eventMode === m.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${eventMode === m.key ? COLORS.ink : COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "14.5px" }}>{m.label}</div>
            <div style={{ fontSize: "12px", marginTop: "2px", opacity: eventMode === m.key ? 0.85 : 0.65 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {eventMode !== "openbar" && (
        <>
          {eventMode === "tournees" || eventMode === "cagnotte" ? (
            <>
              <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Type de paiement</label>
              <div style={{ display: "flex", gap: "10px", marginBottom: currency === "jeton" ? "16px" : "auto" }}>
                <button
                  onClick={() => setCurrency("euro")}
                  style={{
                    flex: 1,
                    padding: "18px 10px",
                    borderRadius: "12px",
                    border: `2px solid ${currency === "euro" ? COLORS.ink : COLORS.paperAlt}`,
                    background: currency === "euro" ? COLORS.amber : COLORS.surface,
                    color: currency === "euro" ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  € Euros
                </button>
                <button
                  onClick={() => setCurrency("jeton")}
                  style={{
                    flex: 1,
                    padding: "18px 10px",
                    borderRadius: "12px",
                    border: `2px solid ${currency === "jeton" ? COLORS.ink : COLORS.paperAlt}`,
                    background: currency === "jeton" ? COLORS.amber : COLORS.surface,
                    color: currency === "jeton" ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <NavIcon name="jeton-token" size={20} color="#0040ef" />
                    Jetons
                  </span>
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "16px" }}>L'addition partagée se règle en €.</p>
          )}
        </>
      )}

      {eventMode !== "openbar" && currency === "jeton" && (
        <div style={{ marginBottom: "auto" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>
            Valeur du jeton
          </label>
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-2px", marginBottom: "10px" }}>
            Tu pourras toujours l'ajouter ou le modifier dans la gestion des boissons.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              inputMode="decimal"
              value={jetonUnitValue}
              onChange={(e) => setJetonUnitValue(e.target.value.replace(",", "."))}
              placeholder="0.00"
              style={{
                width: "120px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: `2px solid ${COLORS.paperAlt}`,
                fontSize: "15px",
                outline: "none",
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
            <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>€ par jeton acheté</span>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginTop: "12px" }}>{error}</p>}

      <PrimaryButton onClick={handleSubmit} disabled={!canCreate || loading} style={{ marginTop: "24px", width: "100%" }}>
        {loading ? "..." : isSalon ? "Créer le BibaRoom →" : "Créer l'événement →"}
      </PrimaryButton>
      <PageFooterNav onBack={onCancel} />
    </div>
  );
}
