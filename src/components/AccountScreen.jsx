// ============================================================
// Écran "Compte" — accessible depuis Paramètres. Liste des
// informations du profil, chacune ouvrant un petit éditeur dédié
// (au lieu du grand formulaire d'un seul tenant de MyProfileScreen).
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS, COUNTRIES, PHONE_PREFIXES, COUNTRY_FLAGS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, WhatsappIcon, XIcon, ThreadsIcon, LinkedinIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { PhotoCropModal } from "./PhotoCropModal.jsx";
import { CityAutocomplete } from "./CityAutocomplete.jsx";
import { formatDDMMYYYY } from "../utils.js";
import { loadMyStories } from "../data/sharedDirectories.js";

const FLUO_BLUE = "#2E9EFF";
const FLUO_RED = "#FF3B3B";

// Sépare un numéro déjà stocké ("+352 691 234 567") en indicatif + reste, pour pré-remplir
// les deux champs de l'éditeur téléphone.
function splitPhone(stored) {
  if (!stored) return { prefix: "", number: "" };
  const match = PHONE_PREFIXES.find((p) => stored.startsWith(p.value));
  if (match) return { prefix: match.value, number: stored.slice(match.value.length).trim() };
  return { prefix: "", number: stored };
}

export function PageTitleWithBar({ children, size = "20px", icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 20px 0" }}>
      {icon ? <span style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>{icon}</span> : <span style={{ width: "5px", height: "24px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />}
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: size, margin: 0 }}>{children}</h1>
    </div>
  );
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function AccountRow({ icon, title, value, onClick, titleColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
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
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: "14px", flexShrink: 0, color: titleColor || COLORS.ink }}>{title}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: "13px", color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

function AccountGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>{children}</div>
    </div>
  );
}

export function AccountScreen({ myName, profile, onBack, goToField, goToDeactivate, goToDeleteAccount }) {
  const [hasActiveStory, setHasActiveStory] = useState(false);
  useEffect(() => {
    loadMyStories().then((list) => setHasActiveStory(list.some((s) => new Date(s.expiresAt) > new Date())));
  }, []);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="user" size={22} color={COLORS.amber} />}>Compte</PageTitleWithBar>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "16px", marginTop: "4px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: `2px solid ${hasActiveStory ? "#FF2C8F" : "transparent"}`, padding: "2px", flexShrink: 0 }}>
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
        <AccountRow icon={<NavIcon name="camera" size={17} color={COLORS.amber} />} title="Photo de profil" value="" onClick={() => goToField("photo")} />
        <AccountRow icon={<NavIcon name="user" size={17} color={COLORS.amber} />} title="Prénom" value={profile.name || "—"} onClick={() => goToField("name")} />
        <AccountRow icon={<NavIcon name="user" size={17} color={COLORS.amber} />} title="Nom" value={profile.lastName || "—"} onClick={() => goToField("lastName")} />
        <AccountRow icon={<NavIcon name="tag" size={17} color={COLORS.amber} />} title="Surnom" value={profile.nickname || "—"} onClick={() => goToField("nickname")} />
        <div style={{ borderBottom: "none" }}>
          <AccountRow icon={<NavIcon name="align-left" size={17} color={COLORS.amber} />} title="Bio" value={profile.bio || "—"} onClick={() => goToField("bio")} />
        </div>
      </AccountGroup>

      <AccountGroup title="Informations personnelles">
        <AccountRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Date de naissance" value={profile.birthDate ? formatDDMMYYYY(profile.birthDate) : "—"} onClick={() => goToField("birthDate")} />
        <AccountRow icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />} title="Pays & Commune" value={[profile.country, profile.city].filter(Boolean).join(", ") || "—"} onClick={() => goToField("location")} />
        <AccountRow icon={<NavIcon name="mail" size={17} color={COLORS.amber} />} title="E-mail" value={profile.email || "—"} onClick={() => goToField("email")} />
        <div style={{ borderBottom: "none" }}>
          <AccountRow icon={<NavIcon name="phone" size={17} color={COLORS.amber} />} title="Téléphone" value={profile.phone || "—"} onClick={() => goToField("phone")} />
        </div>
      </AccountGroup>

      <AccountGroup title="Gestion du compte">
        <AccountRow
          icon={
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                border: `2px solid ${FLUO_BLUE}`,
                lineHeight: 0,
              }}
            >
              <NavIcon name="pause" size={11} color={FLUO_BLUE} />
            </span>
          }
          title="Désactiver temporairement mon compte"
          value=""
          onClick={goToDeactivate}
          titleColor={FLUO_BLUE}
        />
        <div style={{ borderBottom: "none" }}>
          <AccountRow icon={<NavIcon name="trash" size={17} color={FLUO_RED} />} title="Supprimer mon compte" value="" onClick={goToDeleteAccount} titleColor={FLUO_RED} />
        </div>
      </AccountGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Éditeur générique pour un champ texte / bio (textarea) — enregistre uniquement ce champ,
// sans toucher au reste du profil. Prénom/Nom/Surnom forcent une majuscule initiale ; la Bio
// est limitée à 40 caractères (espaces compris).
export function FieldEditScreen({ field, profile, onSaveProfile, onBack }) {
  const config = {
    name: { label: "Prénom", key: "name", type: "text", capitalize: true },
    lastName: { label: "Nom", key: "lastName", type: "text", capitalize: true },
    nickname: { label: "Surnom", key: "nickname", type: "text", capitalize: true },
    bio: { label: "Bio", key: "bio", type: "textarea", maxLength: 40 },
    birthDate: { label: "Date de naissance", key: "birthDate", type: "date" },
  }[field];

  const [value, setValue] = useState(profile[config.key] || "");
  const [saving, setSaving] = useState(false);

  const handleChange = (raw) => {
    let next = raw;
    if (config.maxLength) next = next.slice(0, config.maxLength);
    if (config.capitalize) next = capitalizeFirst(next);
    setValue(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveProfile({ [config.key]: value });
    setSaving(false);
    onBack();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar>{config.label}</PageTitleWithBar>

      {config.type === "textarea" ? (
        <>
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", fontFamily: "inherit", resize: "vertical" }}
          />
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, textAlign: "right", margin: "6px 2px 0" }}>{value.length}/40</p>
        </>
      ) : config.type === "date" ? (
        <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, display: "flex", alignItems: "center", height: "48px" }}>
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            style={{ display: "block", width: "100%", height: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box", padding: "0 12px", border: "none", background: "none", color: COLORS.ink, fontSize: "15px" }}
          />
        </div>
      ) : (
        <input
          type={config.type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
        />
      )}

      <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: "20px" }}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// E-mail — c'est l'identifiant de connexion, figé pour l'instant. Un système de changement
// d'adresse de connexion est prévu séparément plus tard (implique de reconfirmer l'accès au
// compte), pas un simple champ texte.
export function EmailViewScreen({ profile, onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar>E-mail</PageTitleWithBar>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>{profile.email || "—"}</p>
      </div>
      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "12px" }}>
        C'est l'e-mail utilisé pour se connecter à Bibamus — il ne peut pas être modifié ici pour l'instant. Un système de changement d'e-mail de connexion est prévu séparément.
      </p>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Téléphone — indicatif choisi librement dans une liste (jamais pré-sélectionné ni forcé à
// partir du pays de résidence : on peut très bien vivre en Belgique avec un numéro
// luxembourgeois).
export function PhoneEditScreen({ profile, onSaveProfile, onBack }) {
  const initial = splitPhone(profile.phone);
  const [prefix, setPrefix] = useState(initial.prefix);
  const [number, setNumber] = useState(initial.number);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const combined = number.trim() ? `${prefix} ${number.trim()}`.trim() : "";
    await onSaveProfile({ phone: combined });
    setSaving(false);
    onBack();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar>Téléphone</PageTitleWithBar>

      <div style={{ display: "flex", gap: "8px" }}>
        <select
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          style={{ width: "128px", flexShrink: 0, boxSizing: "border-box", padding: "14px 8px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
        >
          <option value="">—</option>
          {PHONE_PREFIXES.map((p) => (
            <option key={p.value + p.label} value={p.value}>
              {COUNTRY_FLAGS[p.country] || ""} {p.value}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Numéro"
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
        />
      </div>

      <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: "20px" }}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Éditeur combiné pays + commune — le pays doit être choisi avant de pouvoir renseigner la
// commune, pour permettre le pré-remplissage (CityAutocomplete).
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
      <PageTitleWithBar>Pays & Commune</PageTitleWithBar>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Pays</label>
      <select
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          setCity("");
        }}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "15px", marginBottom: "18px" }}
      >
        <option value="">Sélectionner...</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Commune de résidence</label>
      <CityAutocomplete
        value={city}
        onChange={setCity}
        country={country}
        placeholder={country ? "Rechercher une commune..." : "Choisissez d'abord un pays"}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
      />
      {!country && <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "6px" }}>Le pays doit être renseigné avant la commune.</p>}

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
      <PageTitleWithBar>Photo de profil</PageTitleWithBar>

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

// Écran générique "Bientôt disponible" pour les sous-pages de Paramètres — respecte
// systématiquement la même règle de titre (icône si fournie, sinon barre verte) que le reste
// des Paramètres, pour ne plus jamais avoir à corriger un titre non conforme.
export function SettingsComingSoonScreen({ title, icon, onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={icon}>{title}</PageTitleWithBar>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: 0 }}>Cette section arrive bientôt.</p>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

function ShareToggle({ checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: COLORS.inkSoft, cursor: "pointer" }}>
      <input type="checkbox" checked={checked !== false} onChange={(e) => onChange(e.target.checked)} style={{ width: "15px", height: "15px", accentColor: COLORS.amber }} />
      Visible
    </label>
  );
}

function VisibilityRow({ icon, title, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 4px", borderBottom: `1px solid ${COLORS.paperAlt}` }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", flexShrink: 0, marginTop: "2px" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// Profil public — regroupe tous les réglages de visibilité (auparavant dispersés sur chaque
// page individuelle de Compte) en un seul endroit.
export function PublicProfileScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="eye" size={22} color={COLORS.amber} />}>Profil public</PageTitleWithBar>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>Choisissez ce que les autres utilisateurs peuvent voir sur votre profil.</p>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
        <VisibilityRow icon={<NavIcon name="tag" size={17} color={COLORS.amber} />} title="Surnom">
          <ShareToggle checked={p.shareSurnom} onChange={(v) => update({ shareSurnom: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<NavIcon name="align-left" size={17} color={COLORS.amber} />} title="Bio">
          <ShareToggle checked={p.shareBio} onChange={(v) => update({ shareBio: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Date de naissance">
          <ShareToggle checked={p.shareBirthDate} onChange={(v) => update({ shareBirthDate: v })} />
          {p.shareBirthDate !== false && (
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              {[
                { key: "full", label: "Date complète" },
                { key: "dayMonth", label: "Jour et mois seulement" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => update({ birthDateSharePrecision: opt.key })}
                  style={{
                    background: (p.birthDateSharePrecision || "full") === opt.key ? COLORS.amber : "none",
                    color: (p.birthDateSharePrecision || "full") === opt.key ? "#0D1B2A" : COLORS.ink,
                    border: `2px solid ${(p.birthDateSharePrecision || "full") === opt.key ? COLORS.amber : COLORS.paperAlt}`,
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {p.shareBirthDate !== false && (p.birthDateSharePrecision || "full") === "full" && (
            <div style={{ marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: COLORS.inkSoft, cursor: "pointer" }}>
                <input type="checkbox" checked={p.shareAge !== false} onChange={(e) => update({ shareAge: e.target.checked })} style={{ width: "15px", height: "15px", accentColor: COLORS.amber }} />
                Afficher mon âge calculé
              </label>
            </div>
          )}
        </VisibilityRow>
        <VisibilityRow icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />} title="Pays">
          <ShareToggle checked={p.shareCountry} onChange={(v) => update({ shareCountry: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />} title="Commune de résidence">
          <ShareToggle checked={p.shareCity} onChange={(v) => update({ shareCity: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<FacebookIcon size={20} />} title="Facebook">
          <ShareToggle checked={p.shareFacebook} onChange={(v) => update({ shareFacebook: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<InstagramIcon size={20} />} title="Instagram">
          <ShareToggle checked={p.shareInstagram} onChange={(v) => update({ shareInstagram: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<TiktokIcon size={20} />} title="TikTok">
          <ShareToggle checked={p.shareTiktok} onChange={(v) => update({ shareTiktok: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<SnapchatIcon size={20} />} title="Snapchat">
          <ShareToggle checked={p.shareSnapchat} onChange={(v) => update({ shareSnapchat: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<WhatsappIcon size={20} />} title="WhatsApp">
          <ShareToggle checked={p.shareWhatsapp} onChange={(v) => update({ shareWhatsapp: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<XIcon size={20} />} title="X">
          <ShareToggle checked={p.shareX} onChange={(v) => update({ shareX: v })} />
        </VisibilityRow>
        <VisibilityRow icon={<ThreadsIcon size={20} />} title="Threads">
          <ShareToggle checked={p.shareThreads} onChange={(v) => update({ shareThreads: v })} />
        </VisibilityRow>
        <div style={{ borderBottom: "none" }}>
          <VisibilityRow icon={<LinkedinIcon size={20} />} title="LinkedIn">
            <ShareToggle checked={p.shareLinkedin} onChange={(v) => update({ shareLinkedin: v })} />
          </VisibilityRow>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: "22px 0 8px 2px" }}>Affichage dans les salons (BibaRoom)</h2>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px 16px" }}>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "0 0 12px 0" }}>
          En cas de doublon avec un autre participant du même salon, l'initiale de votre nom de famille s'ajoute automatiquement.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "firstName", label: "Prénom" },
            { key: "nickname", label: "Surnom" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => update({ salonDisplayMode: opt.key })}
              style={{
                flex: 1,
                background: (p.salonDisplayMode || "firstName") === opt.key ? COLORS.amber : "none",
                color: (p.salonDisplayMode || "firstName") === opt.key ? "#0D1B2A" : COLORS.ink,
                border: `2px solid ${(p.salonDisplayMode || "firstName") === opt.key ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "9px 12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
      <PageTitleWithBar>Désactiver temporairement mon compte</PageTitleWithBar>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: 0 }}>
          Cette fonctionnalité n'existe pas encore — seule la suppression définitive du compte est disponible pour l'instant.
        </p>
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
