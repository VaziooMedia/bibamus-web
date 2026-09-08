import React, { useState } from "react";
import { updateAppUserProfile, createAppUser, deleteAppUser, getMinimumAge } from "../data/sharedDirectories.js";
import { COUNTRIES } from "../constants.js";
import { CityAutocomplete } from "./CityAutocomplete.jsx";
import { FacebookIcon, WhatsappIcon, InstagramIcon, TiktokIcon, SnapchatIcon, XIcon, ThreadsIcon, LinkedinIcon, PinterestIcon, TwitchIcon } from "./icons.jsx";

const fieldStyle = { padding: "10px 12px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "14px", width: "100%", color: "#F2F2E8", background: "#0D1B2A", boxSizing: "border-box" };
const labelStyle = { fontSize: "12.5px", color: "#8792A6", marginBottom: "4px", display: "block", fontWeight: 600 };
const separatorStyle = { borderBottom: "1px solid #28405C", margin: "16px 0" };
const errorBorder = { borderColor: "#FF3B4E" };

function stripPrefix(value, prefix) {
  if (!value) return "";
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

// Réseau social — préfixe fixe préaffiché sur sa propre ligne (non modifiable), le champ en
// dessous ne contient que l'identifiant. La valeur stockée (préfixe + identifiant) est
// reconstituée à chaque frappe.
function SocialLinkField({ icon, label, prefix, value, onChange, last }) {
  const handle = stripPrefix(value, prefix);
  return (
    <div style={{ marginBottom: last ? 0 : "16px" }}>
      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
        {icon}
        {label}
      </label>
      <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", border: "2px solid #28405C", borderBottom: "none", background: "#16273D", fontSize: "13px", color: "#8792A6", overflowWrap: "anywhere" }}>
        {prefix}
      </div>
      <input
        value={handle}
        onChange={(e) => onChange(e.target.value.trim() ? prefix + e.target.value : "")}
        placeholder="identifiant"
        style={{ ...fieldStyle, borderRadius: "0 0 8px 8px" }}
      />
    </div>
  );
}

// Astérisque vert fluo pour signaler un champ obligatoire (uniquement affiché en création).
function RequiredLabel({ children, required }) {
  return (
    <label style={labelStyle}>
      {children} {required && <span style={{ color: "#39FF66" }}>*</span>}
    </label>
  );
}

// Flèche simple (sans hampe) — pointe vers la droite repliée, vers le bas dépliée.
function ChevronIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
      <path d="M3 1 L9 6 L3 11" stroke="#39FF66" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// En-tête de section repliable — barre verticale verte fluo, titre blanc, flèche, et un
// indicateur optionnel (la pastille de statut) visible même quand la section est repliée.
function SectionHeader({ title, open, onToggle, indicator }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "10px 0",
        textAlign: "left",
      }}
    >
      <div style={{ width: "4px", height: "18px", background: "#39FF66", borderRadius: "2px" }} />
      <span style={{ color: "#F2F2E8", fontWeight: 800, fontSize: "15px" }}>{title}</span>
      {indicator}
      <div style={{ flex: 1 }} />
      <ChevronIcon open={open} />
    </button>
  );
}

const APP_LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "nl", label: "Néerlandais" },
  { code: "en", label: "Anglais" },
  { code: "de", label: "Allemand" },
];

function EyeIcon({ crossed }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="#8792A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="#8792A6" strokeWidth="1.8" />
      {crossed && <line x1="2" y1="2" x2="22" y2="22" stroke="#8792A6" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

const PRESET_REASONS = [
  "Non-respect des conditions d'utilisation",
  "Comportement abusif envers d'autres utilisateurs",
  "Contenu inapproprié",
  "Spam ou activité suspecte",
];

const DURATION_OPTIONS = [
  { key: "1d", label: "1 jour", days: 1 },
  { key: "3d", label: "3 jours", days: 3 },
  { key: "7d", label: "7 jours", days: 7 },
  { key: "30d", label: "30 jours", days: 30 },
  { key: "permanent", label: "Permanent", days: null },
];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatDateFr(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ageFromBirthDate(dateStr) {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function UserDetailPanel({ user, onClose, onSaved }) {
  const isNew = !user;
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [birthDate, setBirthDate] = useState(user?.birth_date || "");
  const [country, setCountry] = useState(user?.country || "");
  const [city, setCity] = useState(user?.city || "");
  const [locality, setLocality] = useState(user?.locality || "");
  const [whatsappUrl, setWhatsappUrl] = useState(user?.whatsapp_url || "");
  const [facebookUrl, setFacebookUrl] = useState(user?.facebook_url || "");
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || "");
  const [tiktokUrl, setTiktokUrl] = useState(user?.tiktok_url || "");
  const [snapchatUrl, setSnapchatUrl] = useState(user?.snapchat_url || "");
  const [xUrl, setXUrl] = useState(user?.x_url || "");
  const [threadsUrl, setThreadsUrl] = useState(user?.threads_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || "");
  const [pinterestUrl, setPinterestUrl] = useState(user?.pinterest_url || "");
  const [twitchUrl, setTwitchUrl] = useState(user?.twitch_url || "");
  const [appLanguage, setAppLanguage] = useState(user?.app_language || "fr");
  const [active, setActive] = useState(user?.active !== false);
  const [blockedReason, setBlockedReason] = useState(user?.blocked_reason || "");
  const [blockedUntil, setBlockedUntil] = useState(user?.blocked_until || null);
  const [customReason, setCustomReason] = useState(!PRESET_REASONS.includes(user?.blocked_reason) && !!user?.blocked_reason);
  const [selectedDurationKey, setSelectedDurationKey] = useState(() => (user?.active === false && !user?.blocked_until ? "permanent" : null));
  const [durationTouched, setDurationTouched] = useState(user?.active === false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [blockErrors, setBlockErrors] = useState({});

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [openSections, setOpenSections] = useState({ info: true, social: false, status: false });
  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const age = ageFromBirthDate(birthDate);

  const handleSave = async () => {
    setError(null);

    if (isNew) {
      const missing = {};
      if (!firstName.trim()) missing.firstName = true;
      if (!lastName.trim()) missing.lastName = true;
      if (!email.trim()) missing.email = true;
      if (!password.trim()) missing.password = true;
      if (!birthDate) missing.birthDate = true;
      if (!country) missing.country = true;
      if (!city.trim()) missing.city = true;
      setFieldErrors(missing);
      if (Object.keys(missing).length > 0) {
        setError("Merci de compléter tous les champs obligatoires (*).");
        return;
      }

      const computedAge = ageFromBirthDate(birthDate);
      const minimumAge = await getMinimumAge(country);
      if (computedAge == null || computedAge < minimumAge) {
        setFieldErrors({ birthDate: true, country: true });
        setError(`Bibamus concerne des boissons alcoolisées — un âge minimum de ${minimumAge} ans est requis pour ce pays.`);
        return;
      }

      setSaving(true);
      const result = await createAppUser(email, password, firstName, lastName, nickname, birthDate);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      return;
    }

    if (!active) {
      const missing = {};
      if (!durationTouched) missing.duration = true;
      if (!blockedReason.trim()) missing.reason = true;
      setBlockErrors(missing);
      if (Object.keys(missing).length > 0) {
        setOpenSections((prev) => ({ ...prev, status: true }));
        setError("Merci de préciser une durée et une raison de blocage.");
        return;
      }
    }

    if (!country || !city.trim()) {
      setFieldErrors({ country: !country, city: !city.trim() });
      setError("Le pays et la commune de résidence sont obligatoires.");
      return;
    }

    setSaving(true);
    const result = await updateAppUserProfile(user.id, {
      firstName,
      lastName,
      nickname,
      birthDate,
      country,
      city,
      locality,
      whatsappUrl,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      snapchatUrl,
      xUrl,
      threadsUrl,
      linkedinUrl,
      pinterestUrl,
      twitchUrl,
      appLanguage,
      active,
      blockedReason,
      blockedUntil,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAppUser(user.id, deletePassword);
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    onSaved();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
      <div style={{ background: "#16273D", borderRadius: "14px", padding: "28px", width: "480px", maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", color: "#F2F2E8", margin: 0 }}>{isNew ? "Nouvel utilisateur" : "Fiche utilisateur"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8792A6", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {!isNew && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "#28405C", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user.avatar_emoji ? (
                <span style={{ fontSize: "40px" }}>{user.avatar_emoji}</span>
              ) : (
                <svg width="38" height="44" viewBox="0 0 879 1048" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    fill="#39FF66"
                    d="M 18.00,900.00 L 16.00,922.00 L 18.00,951.00 L 23.00,967.00 L 33.00,986.00 L 54.00,1009.00 L 64.00,1016.00 L 87.00,1027.00 L 107.00,1031.00 L 771.00,1031.00 L 792.00,1027.00 L 810.00,1019.00 L 827.00,1007.00 L 839.00,995.00 L 851.00,977.00 L 857.00,963.00 L 862.00,937.00 L 861.00,910.00 L 856.00,875.00 L 850.00,850.00 L 839.00,815.00 L 821.00,777.00 L 808.00,754.00 L 794.00,733.00 L 770.00,703.00 L 754.00,686.00 L 728.00,663.00 L 712.00,651.00 L 680.00,631.00 L 644.00,614.00 L 614.00,604.00 L 584.00,597.00 L 551.00,593.00 L 335.00,593.00 L 312.00,595.00 L 275.00,602.00 L 239.00,613.00 L 205.00,628.00 L 187.00,638.00 L 157.00,658.00 L 125.00,685.00 L 91.00,723.00 L 70.00,753.00 L 48.00,793.00 L 34.00,829.00 L 24.00,865.00 Z M 79.00,926.00 L 83.00,893.00 L 92.00,855.00 L 106.00,819.00 L 124.00,785.00 L 136.00,767.00 L 153.00,746.00 L 185.00,715.00 L 217.00,692.00 L 246.00,677.00 L 264.00,670.00 L 287.00,663.00 L 320.00,657.00 L 346.00,655.00 L 537.00,655.00 L 562.00,657.00 L 586.00,661.00 L 608.00,667.00 L 634.00,677.00 L 659.00,690.00 L 676.00,701.00 L 701.00,721.00 L 730.00,751.00 L 754.00,785.00 L 779.00,835.00 L 788.00,861.00 L 794.00,885.00 L 798.00,910.00 L 799.00,937.00 L 794.00,950.00 L 783.00,962.00 L 776.00,966.00 L 763.00,969.00 L 115.00,969.00 L 103.00,966.00 L 90.00,957.00 L 84.00,949.00 L 81.00,942.00 Z M 418.00,17.00 L 395.00,20.00 L 368.00,26.00 L 341.00,35.00 L 313.00,48.00 L 294.00,59.00 L 270.00,76.00 L 234.00,110.00 L 217.00,131.00 L 202.00,154.00 L 185.00,188.00 L 179.00,204.00 L 170.00,237.00 L 165.00,276.00 L 165.00,310.00 L 173.00,358.00 L 178.00,375.00 L 193.00,410.00 L 219.00,451.00 L 230.00,464.00 L 258.00,492.00 L 270.00,502.00 L 298.00,521.00 L 328.00,537.00 L 371.00,552.00 L 396.00,557.00 L 422.00,560.00 L 471.00,559.00 L 505.00,553.00 L 522.00,548.00 L 552.00,537.00 L 575.00,525.00 L 596.00,512.00 L 617.00,496.00 L 649.00,465.00 L 662.00,449.00 L 680.00,422.00 L 696.00,390.00 L 704.00,367.00 L 710.00,344.00 L 714.00,318.00 L 714.00,266.00 L 711.00,242.00 L 703.00,211.00 L 696.00,190.00 L 679.00,155.00 L 658.00,124.00 L 645.00,108.00 L 617.00,81.00 L 598.00,66.00 L 574.00,51.00 L 550.00,39.00 L 517.00,27.00 L 475.00,18.00 L 449.00,16.00 Z M 416.00,80.00 L 456.00,79.00 L 479.00,82.00 L 504.00,88.00 L 543.00,105.00 L 570.00,123.00 L 595.00,146.00 L 607.00,160.00 L 621.00,180.00 L 638.00,214.00 L 646.00,239.00 L 650.00,258.00 L 652.00,296.00 L 650.00,320.00 L 646.00,340.00 L 634.00,375.00 L 619.00,401.00 L 609.00,415.00 L 586.00,440.00 L 567.00,456.00 L 536.00,475.00 L 505.00,488.00 L 470.00,496.00 L 421.00,497.00 L 386.00,491.00 L 355.00,480.00 L 335.00,470.00 L 316.00,458.00 L 300.00,445.00 L 276.00,421.00 L 254.00,390.00 L 239.00,358.00 L 230.00,320.00 L 228.00,289.00 L 231.00,255.00 L 239.00,223.00 L 255.00,188.00 L 271.00,164.00 L 303.00,130.00 L 317.00,119.00 L 341.00,104.00 L 379.00,88.00 Z"
                  />
                </svg>
              )}
            </div>
            <p style={{ fontSize: "11px", color: "#8792A6", marginTop: "8px", textAlign: "center" }}>
              Photo choisie par l'utilisateur dans l'app
              <br />
              Non modifiable ici.
            </p>
          </div>
        )}

        {/* ---------------- INFORMATIONS ---------------- */}
        <SectionHeader title="Informations" open={openSections.info} onToggle={() => toggleSection("info")} />
        {openSections.info && (
          <div style={{ marginBottom: "8px" }}>
            <RequiredLabel required={isNew}>Prénom</RequiredLabel>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ ...fieldStyle, marginBottom: "12px", ...(fieldErrors.firstName ? errorBorder : {}) }}
            />

            <RequiredLabel required={isNew}>Nom</RequiredLabel>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ ...fieldStyle, marginBottom: "12px", ...(fieldErrors.lastName ? errorBorder : {}) }}
            />

            <label style={labelStyle}>Surnom</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />

            <RequiredLabel required={isNew}>Email</RequiredLabel>
            {isNew ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...fieldStyle, marginBottom: "12px", ...(fieldErrors.email ? errorBorder : {}) }}
              />
            ) : (
              <p style={{ ...fieldStyle, marginBottom: "12px", color: "#8792A6" }}>{email}</p>
            )}

            {isNew && (
              <>
                <RequiredLabel required>Mot de passe</RequiredLabel>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...fieldStyle, paddingRight: "40px", ...(fieldErrors.password ? errorBorder : {}) }}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((v) => !v)}
                    aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
                  >
                    <EyeIcon crossed={passwordVisible} />
                  </button>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <RequiredLabel required={isNew}>Date de naissance</RequiredLabel>
                <input
                  type="date"
                  value={birthDate || ""}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{ ...fieldStyle, colorScheme: "dark", ...(fieldErrors.birthDate ? errorBorder : {}) }}
                />
              </div>
              <div style={{ width: "80px" }}>
                <label style={labelStyle}>Âge</label>
                <p style={{ ...fieldStyle, margin: 0, color: "#8792A6", textAlign: "center" }}>{age != null ? age : "—"}</p>
              </div>
            </div>

            <RequiredLabel required>Pays</RequiredLabel>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                // La commune dépend du pays choisi — si le pays change, une commune déjà
                // saisie appartiendrait à la liste de l'ancien pays.
                setCity("");
              }}
              style={{ ...fieldStyle, marginBottom: "12px", ...(fieldErrors.country ? errorBorder : {}) }}
            >
              <option value="">—</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.fr}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <RequiredLabel required>Commune de résidence</RequiredLabel>
                <CityAutocomplete value={city} onChange={setCity} countryCode={country} placeholder="Ex. Bruxelles" style={{ ...fieldStyle, ...(fieldErrors.city ? errorBorder : {}) }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ville / Village (optionnel)</label>
                <input value={locality} onChange={(e) => setLocality(e.target.value)} style={fieldStyle} />
              </div>
            </div>

            <label style={labelStyle}>Langue utilisée sur l'app</label>
            <select value={appLanguage} onChange={(e) => setAppLanguage(e.target.value)} style={fieldStyle}>
              {APP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={separatorStyle} />

        {/* ---------------- RÉSEAUX SOCIAUX ---------------- */}
        <SectionHeader title="Réseaux sociaux" open={openSections.social} onToggle={() => toggleSection("social")} />
        {openSections.social && (
          <div style={{ marginBottom: "8px" }}>
            <SocialLinkField icon={<WhatsappIcon size={20} />} label="WhatsApp" prefix="https://wa.me/" value={whatsappUrl} onChange={setWhatsappUrl} />
            <SocialLinkField icon={<FacebookIcon size={20} />} label="Facebook" prefix="https://www.facebook.com/" value={facebookUrl} onChange={setFacebookUrl} />
            <SocialLinkField icon={<InstagramIcon size={20} />} label="Instagram" prefix="https://www.instagram.com/" value={instagramUrl} onChange={setInstagramUrl} />
            <SocialLinkField icon={<TiktokIcon size={20} />} label="TikTok" prefix="https://www.tiktok.com/@" value={tiktokUrl} onChange={setTiktokUrl} />
            <SocialLinkField icon={<SnapchatIcon size={20} />} label="Snapchat" prefix="https://www.snapchat.com/add/" value={snapchatUrl} onChange={setSnapchatUrl} />
            <SocialLinkField icon={<XIcon size={20} />} label="X" prefix="https://x.com/" value={xUrl} onChange={setXUrl} />
            <SocialLinkField icon={<ThreadsIcon size={20} />} label="Threads" prefix="https://www.threads.net/@" value={threadsUrl} onChange={setThreadsUrl} />
            <SocialLinkField icon={<LinkedinIcon size={20} />} label="LinkedIn" prefix="https://www.linkedin.com/in/" value={linkedinUrl} onChange={setLinkedinUrl} />
            <SocialLinkField icon={<PinterestIcon size={20} />} label="Pinterest" prefix="https://www.pinterest.com/" value={pinterestUrl} onChange={setPinterestUrl} />
            <SocialLinkField icon={<TwitchIcon size={20} />} label="Twitch" prefix="https://www.twitch.tv/" value={twitchUrl} onChange={setTwitchUrl} last />
          </div>
        )}

        {!isNew && (
          <>
            <div style={separatorStyle} />

            {/* ---------------- STATUT ---------------- */}
            <SectionHeader
              title="Statut"
              open={openSections.status}
              onToggle={() => toggleSection("status")}
              indicator={<span style={{ width: "9px", height: "9px", borderRadius: "50%", background: active ? "#39FF66" : "#FF3B4E", flexShrink: 0 }} />}
            />
            {openSections.status && (
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <button
                    onClick={() => setActive(true)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: "8px",
                      border: `2px solid ${active ? "#39FF66" : "#28405C"}`,
                      background: active ? "#39FF66" : "none",
                      color: active ? "#0D1B2A" : "#F2F2E8",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Actif
                  </button>
                  <button
                    onClick={() => setActive(false)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: "8px",
                      border: `2px solid ${!active ? "#FF3B4E" : "#28405C"}`,
                      background: !active ? "#FF3B4E" : "none",
                      color: !active ? "#0D1B2A" : "#F2F2E8",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Bloqué
                  </button>
                </div>
                {!active && (
                  <>
                    <label style={{ ...labelStyle, color: blockErrors.duration ? "#FF3B4E" : labelStyle.color }}>
                      Durée du blocage {blockErrors.duration && <span style={{ color: "#39FF66" }}>*</span>}
                    </label>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                      {DURATION_OPTIONS.map((d) => {
                        const isSelected = selectedDurationKey === d.key;
                        return (
                          <button
                            key={d.key}
                            onClick={() => {
                              setBlockedUntil(d.days === null ? null : addDays(d.days));
                              setSelectedDurationKey(d.key);
                              setDurationTouched(true);
                              setBlockErrors((prev) => ({ ...prev, duration: false }));
                            }}
                            style={{
                              padding: "7px 12px",
                              borderRadius: "8px",
                              border: `2px solid ${isSelected ? "#39FF66" : blockErrors.duration ? "#FF3B4E" : "#28405C"}`,
                              background: isSelected ? "#39FF66" : "none",
                              color: isSelected ? "#0D1B2A" : "#F2F2E8",
                              fontWeight: 700,
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: "12px", color: "#8792A6", marginBottom: "14px" }}>
                      {!durationTouched
                        ? "Choisissez une durée ci-dessus."
                        : blockedUntil
                        ? `Réactivation automatique le ${formatDateFr(blockedUntil)}.`
                        : "Blocage permanent — pas de date de réactivation."}
                    </p>

                    <label style={{ ...labelStyle, color: blockErrors.reason ? "#FF3B4E" : labelStyle.color }}>
                      Raison {blockErrors.reason && <span style={{ color: "#39FF66" }}>*</span>}
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                      {PRESET_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setBlockedReason(r);
                            setCustomReason(false);
                            setBlockErrors((prev) => ({ ...prev, reason: false }));
                          }}
                          style={{
                            textAlign: "left",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: `2px solid ${!customReason && blockedReason === r ? "#39FF66" : blockErrors.reason ? "#FF3B4E" : "#28405C"}`,
                            background: !customReason && blockedReason === r ? "#0D1B2A" : "none",
                            color: "#F2F2E8",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {r}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setCustomReason(true);
                          setBlockedReason("");
                        }}
                        style={{
                          textAlign: "left",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: `2px solid ${customReason ? "#39FF66" : blockErrors.reason ? "#FF3B4E" : "#28405C"}`,
                          background: customReason ? "#0D1B2A" : "none",
                          color: "#F2F2E8",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        Autre raison (texte libre)
                      </button>
                    </div>
                    {customReason && (
                      <input
                        value={blockedReason}
                        onChange={(e) => {
                          setBlockedReason(e.target.value);
                          if (e.target.value.trim()) setBlockErrors((prev) => ({ ...prev, reason: false }));
                        }}
                        placeholder="Précisez la raison"
                        style={{ ...fieldStyle, marginBottom: "12px", ...(blockErrors.reason ? errorBorder : {}) }}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {error && <p style={{ color: "#FF3B4E", fontSize: "12.5px", margin: "12px 0" }}>{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", background: "#39FF66", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, color: "#0D1B2A", cursor: "pointer", opacity: saving ? 0.6 : 1, marginTop: "8px" }}
        >
          {saving ? "Enregistrement..." : isNew ? "Créer le compte" : "Enregistrer"}
        </button>

        {!isNew && (
          <>
            <div style={separatorStyle} />
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                style={{ width: "100%", background: "none", border: "2px solid #FF3B4E", borderRadius: "8px", padding: "10px", fontWeight: 700, color: "#FF3B4E", cursor: "pointer" }}
              >
                Supprimer ce compte utilisateur
              </button>
            ) : (
              <div>
                <p style={{ fontSize: "12.5px", color: "#F2F2E8", marginBottom: "8px" }}>
                  Pour confirmer la suppression, entrez <strong>votre propre</strong> mot de passe (le compte admin actuellement connecté) :
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  style={{ ...fieldStyle, marginBottom: "10px" }}
                />
                {deleteError && <p style={{ color: "#FF3B4E", fontSize: "12.5px", marginBottom: "10px" }}>{deleteError}</p>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setConfirmingDelete(false);
                      setDeletePassword("");
                      setDeleteError(null);
                    }}
                    style={{ flex: 1, background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "10px", color: "#F2F2E8", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || !deletePassword}
                    style={{ flex: 1, background: "#FF3B4E", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 700, color: "#fff", cursor: "pointer", opacity: deleting || !deletePassword ? 0.6 : 1 }}
                  >
                    {deleting ? "Suppression..." : "Confirmer la suppression"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
