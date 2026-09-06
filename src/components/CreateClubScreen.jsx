// ============================================================
// Créer un BibaClub — nom, photo, description, catégorie,
// visibilité et mode d'adhésion.
// ============================================================
import React, { useState, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { uploadClubPhoto, createClub } from "../data/sharedDirectories.js";

const CATEGORIES = ["Sport", "Amis", "Travail", "Famille", "Étudiants", "Autre"];

export function CreateClubScreen({ myUserId, onBack, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [visibility, setVisibility] = useState("private");
  const [joinMode, setJoinMode] = useState("invite");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    const result = await uploadClubPhoto(myUserId, file);
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
    const result = await createClub({ name: name.trim(), description: description.trim(), photoUrl, category, visibility, joinMode }, myUserId);
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

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Visibilité</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        <button onClick={() => setVisibility("private")} style={optionButton(visibility === "private")}>
          Privé
        </button>
        <button onClick={() => setVisibility("public")} style={optionButton(visibility === "public")}>
          Public
        </button>
      </div>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Comment rejoint-on ce club ?</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <button onClick={() => setJoinMode("invite")} style={optionButton(joinMode === "invite")}>
          Code d'invitation
        </button>
        <button onClick={() => setJoinMode("request")} style={optionButton(joinMode === "request")}>
          Sur demande
        </button>
        <button onClick={() => setJoinMode("open")} style={optionButton(joinMode === "open")}>
          Libre
        </button>
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "20px" }}>
        {joinMode === "invite" && "Un code à 6 caractères sera généré — à partager avec qui vous voulez."}
        {joinMode === "request" && "Toute personne peut demander à rejoindre — un admin ou modérateur valide chaque demande."}
        {joinMode === "open" && "Toute personne qui trouve le club peut le rejoindre directement."}
      </p>

      {error && <p style={{ fontSize: "12.5px", color: "#FF3B3B", marginBottom: "12px" }}>{error}</p>}

      <PrimaryButton onClick={handleCreate} disabled={!name.trim() || saving} style={{ width: "100%", marginTop: "auto" }}>
        {saving ? "Création..." : "Créer le club"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
