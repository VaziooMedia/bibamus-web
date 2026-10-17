// ============================================================
// Créer un BibaClub — nom, photo, description, catégorie,
// visibilité (Privé / Public) et validation des nouveaux membres.
// ============================================================
import React, { useState, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { uploadClubPhoto, createClub } from "../data/sharedDirectories.js";
import { fileToResizedJpegBlob } from "../imageUtils.js";

const CATEGORIES = ["Sport", "Amis", "Travail", "Famille", "Étudiants", "Autre"];

export function CreateClubScreen({ myUserId, onBack, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [visibility, setVisibility] = useState("private");
  // Validation des arrivées par un administrateur ou un modérateur (désactivée par défaut).
  const [validateArrivals, setValidateArrivals] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    setUploadingPhoto(true);
    // La photo est réduite en JPEG avant l'envoi (une photo de téléphone brute est trop lourde pour la vérification de contenu).
    let blob;
    try {
      blob = await fileToResizedJpegBlob(file);
    } catch (_) {
      setUploadingPhoto(false);
      setError("Impossible de lire cette photo.");
      return;
    }
    const result = await uploadClubPhoto(myUserId, blob);
    setUploadingPhoto(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPhotoUrl(result.url);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createClub({ name: name.trim(), description: description.trim(), photoUrl, category, visibility, joinMode: validateArrivals ? "request" : "open" }, myUserId);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCreated(result.clubId);
  };

  const optionButton = (active) => ({
    flex: 1,
    padding: "10px",
    borderRadius: "10px",
    border: `2px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
    background: active ? COLORS.amber : "none",
    color: active ? COLORS.paper : COLORS.ink,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  });

  const visibilityCard = (active) => ({
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: "12px",
    border: `2px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
    background: active ? COLORS.amber : "none",
    color: active ? COLORS.paper : COLORS.ink,
    cursor: "pointer",
  });

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 20px" }}>Créer un BibaClub</h1>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} style={{ background: "none", border: "none", cursor: "pointer", position: "relative" }}>
          <EntityAvatar photoUrl={photoUrl} size={84} fallbackIcon="crown" />
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: COLORS.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${COLORS.paper}`,
            }}
          >
            <NavIcon name="camera" size={13} color={COLORS.paper} />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
      </div>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Nom du club</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex. Équipe Handball"
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", marginBottom: "16px" }}
      />

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Description (optionnelle)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Quelques mots sur le club..."
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", marginBottom: "16px", resize: "vertical", fontFamily: "inherit" }}
      />

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Catégorie</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} style={{ ...optionButton(category === cat), flex: "none", padding: "8px 14px" }}>
            {cat}
          </button>
        ))}
      </div>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Qui peut trouver le club ?</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
        {[
          { value: "private", title: "Privé", text: "Invisible : le club n'apparaît nulle part. On n'y entre que sur invitation d'un membre." },
          { value: "public", title: "Public", text: "Visible dans la recherche. Chacun peut le rejoindre, ou y être invité par un membre." },
        ].map((o) => (
          <button key={o.value} onClick={() => setVisibility(o.value)} aria-pressed={visibility === o.value} style={{ ...visibilityCard(visibility === o.value) }}>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>{o.title}</div>
            <div style={{ fontSize: "11.5px", marginTop: "2px", opacity: 0.9 }}>{o.text}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700 }}>Valider les nouveaux membres</div>
          <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>
            {visibility === "private"
              ? "Un administrateur ou un modérateur approuve chaque personne invitée par un simple membre."
              : "Un administrateur ou un modérateur approuve chaque demande d'adhésion, et chaque personne invitée par un simple membre."}
          </div>
        </div>
        <button
          role="switch"
          aria-checked={validateArrivals}
          aria-label="Valider les nouveaux membres"
          onClick={() => setValidateArrivals(!validateArrivals)}
          style={{
            width: "48px",
            height: "28px",
            borderRadius: "14px",
            border: "none",
            background: validateArrivals ? COLORS.amber : COLORS.paperAlt,
            position: "relative",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <span style={{ position: "absolute", top: "3px", left: validateArrivals ? "23px" : "3px", width: "22px", height: "22px", borderRadius: "50%", background: COLORS.paper, transition: "left 0.15s" }} />
        </button>
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 20px" }}>
        {validateArrivals
          ? "Les arrivées attendent un accord. Les personnes invitées par un administrateur ou un modérateur entrent directement."
          : "Les arrivées sont directes."}
      </p>

      {error && <p style={{ fontSize: "12.5px", color: "#FF3B3B", marginBottom: "12px" }}>{error}</p>}

      <PrimaryButton onClick={handleCreate} disabled={!name.trim() || saving} style={{ width: "100%", marginTop: "auto" }}>
        {saving ? "Création..." : "Créer le club"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
