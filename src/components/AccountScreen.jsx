// ============================================================
// Écran "Compte" — accessible depuis Paramètres. Liste des
// informations du profil, chacune ouvrant un petit éditeur dédié
// (au lieu du grand formulaire d'un seul tenant de MyProfileScreen).
// ============================================================
import React, { useState, useRef } from "react";
import { COLORS, COUNTRIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { PhotoCropModal } from "./PhotoCropModal.jsx";
import { formatDDMMYYYY } from "../utils.js";

function AccountRow({ title, value, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "none",
        border: "none",
        borderBottom: `1px solid ${COLORS.paperAlt}`,
        padding: "14px 4px",
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        color: COLORS.ink,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: "14px", flexShrink: 0 }}>{title}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: "13px", color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

function AccountGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", margin: "0 0 8px 2px" }}>{title}</h2>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>{children}</div>
    </div>
  );
}

export function AccountScreen({ myName, profile, onBack, goToField, goToDeactivate, goToDeleteAccount }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "16px", marginTop: "4px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: `2px solid ${COLORS.amber}`, padding: "2px", flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={32} color={COLORS.amber} />}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", lineHeight: 1.25, margin: 0 }}>{myName}</h1>
            {profile.lastName && <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", lineHeight: 1.25, margin: 0 }}>{profile.lastName}</h1>}
            {profile.nickname && <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", color: COLORS.amber, margin: "3px 0 0" }}>{profile.nickname}</p>}
          </div>
        </div>
      </div>

      <AccountGroup title="Profil">
        <AccountRow title="Photo de profil" value="" onClick={() => goToField("photo")} />
        <AccountRow title="Prénom" value={profile.name || "—"} onClick={() => goToField("name")} />
        <AccountRow title="Nom" value={profile.lastName || "—"} onClick={() => goToField("lastName")} />
        <AccountRow title="Surnom" value={profile.nickname || "—"} onClick={() => goToField("nickname")} />
        <div style={{ borderBottom: "none" }}>
          <AccountRow title="Bio" value={profile.bio || "—"} onClick={() => goToField("bio")} />
        </div>
      </AccountGroup>

      <AccountGroup title="Informations personnelles">
        <AccountRow title="Date de naissance" value={profile.birthDate ? formatDDMMYYYY(profile.birthDate) : "—"} onClick={() => goToField("birthDate")} />
        <AccountRow title="Pays & Commune" value={[profile.country, profile.city].filter(Boolean).join(", ") || "—"} onClick={() => goToField("location")} />
        <AccountRow title="E-mail" value={profile.email || "—"} onClick={() => goToField("email")} />
        <div style={{ borderBottom: "none" }}>
          <AccountRow title="Téléphone" value={profile.phone || "—"} onClick={() => goToField("phone")} />
        </div>
      </AccountGroup>

      <AccountGroup title="Gestion du compte">
        <AccountRow title="Désactiver temporairement mon compte" value="" onClick={goToDeactivate} />
        <div style={{ borderBottom: "none" }}>
          <AccountRow title="Supprimer mon compte" value="" onClick={goToDeleteAccount} />
        </div>
      </AccountGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Éditeur générique pour un champ texte / e-mail / téléphone / bio (textarea) — enregistre
// uniquement ce champ, sans toucher au reste du profil.
export function FieldEditScreen({ field, profile, onSaveProfile, onBack }) {
  const config = {
    name: { label: "Prénom", key: "name", type: "text" },
    lastName: { label: "Nom", key: "lastName", type: "text" },
    nickname: { label: "Surnom", key: "nickname", type: "text" },
    bio: { label: "Bio", key: "bio", type: "textarea" },
    email: { label: "E-mail", key: "email", type: "email" },
    phone: { label: "Téléphone", key: "phone", type: "tel" },
    birthDate: { label: "Date de naissance", key: "birthDate", type: "date" },
  }[field];

  const [value, setValue] = useState(profile[config.key] || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveProfile({ [config.key]: value });
    setSaving(false);
    onBack();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 20px 0" }}>{config.label}</h1>

      {config.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", fontFamily: "inherit", resize: "vertical" }}
        />
      ) : (
        <input
          type={config.type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
        />
      )}

      <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: "20px" }}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Éditeur combiné pays + commune — les deux se modifient ensemble, comme dans le grand
// formulaire d'origine.
export function LocationEditScreen({ profile, onSaveProfile, onBack }) {
  const [country, setCountry] = useState(profile.country || "");
  const [city, setCity] = useState(profile.city || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveProfile({ country, city });
    setSaving(false);
    onBack();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 20px 0" }}>Pays & Commune</h1>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Pays</label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "15px", marginBottom: "18px" }}
      >
        <option value="">—</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Commune de résidence</label>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
      />

      <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: "20px" }}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Éditeur de la photo de profil — même logique (recadrage puis envoi) que dans le grand
// formulaire d'origine.
export function PhotoEditScreen({ profile, onUploadPhoto, onSaveProfile, onBack }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [croppingFile, setCroppingFile] = useState(null);
  const fileInputRef = useRef(null);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 20px 0" }}>Photo de profil</h1>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            border: `2px solid ${COLORS.amber}`,
            background: COLORS.paperAlt,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploadingPhoto ? "default" : "pointer",
            padding: 0,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={56} color={COLORS.amber} />}
          {uploadingPhoto && <div style={{ position: "absolute", inset: 0, background: "rgba(13,27,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>...</div>}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", color: COLORS.ink, cursor: "pointer" }}
        >
          {avatarUrl ? "Changer la photo" : "Ajouter une photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            e.target.value = "";
            setPhotoError(null);
            setCroppingFile(file);
          }}
        />
        {photoError && <p style={{ fontSize: "12.5px", color: COLORS.wine }}>{photoError}</p>}
      </div>

      {croppingFile && (
        <PhotoCropModal
          file={croppingFile}
          onCancel={() => setCroppingFile(null)}
          onConfirm={async (blob) => {
            setCroppingFile(null);
            setUploadingPhoto(true);
            const result = await onUploadPhoto(blob);
            setUploadingPhoto(false);
            if (result.error) {
              setPhotoError(result.error);
              return;
            }
            setAvatarUrl(result.url);
            onSaveProfile({ avatarUrl: result.url });
          }}
        />
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Désactivation temporaire — fonctionnalité pas encore construite (seule la suppression
// définitive existe aujourd'hui). Écran honnête plutôt qu'un bouton qui ne ferait rien.
export function DeactivateAccountScreen({ onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0" }}>Désactiver temporairement mon compte</h1>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: 0 }}>
          Cette fonctionnalité n'existe pas encore — seule la suppression définitive du compte est disponible pour l'instant.
        </p>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
