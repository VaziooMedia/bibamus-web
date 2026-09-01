// ============================================================
// Écran "Mes infos" — édition du profil personnel — copié tel
// quel depuis le prototype Claude.
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS, COUNTRIES, LANGUAGES, CITIES_BY_COUNTRY } from "../constants.js";
import { FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { CityAutocomplete } from "./CityAutocomplete.jsx";
import { PhotoCropModal } from "./PhotoCropModal.jsx";
import { redirectToSpotifyAuth, getMySpotifyStatus, disconnectSpotify } from "../data/spotify.js";

export function MyProfileScreen({ myName, onRenameMe, profile, onSaveProfile, onUploadPhoto, onGoToAdminUnlock, onLogout, onBack, myUserId }) {
  const [spotifyStatus, setSpotifyStatus] = useState(null);
  useEffect(() => {
    getMySpotifyStatus().then(setSpotifyStatus);
  }, []);
  const [firstName, setFirstName] = useState(myName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [email, setEmail] = useState(profile.email || "");
  const [birthDate, setBirthDate] = useState(profile.birthDate || "");
  const [country, setCountry] = useState(profile.country || "");
  const [region, setRegion] = useState(profile.region || "");
  const [city, setCity] = useState(profile.city || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [croppingFile, setCroppingFile] = useState(null);
  const fileInputRef = useRef(null);
  const [bio, setBio] = useState(profile.bio || "");
  const [shareBio, setShareBio] = useState(profile.shareBio !== false);
  const [displayNameField, setDisplayNameField] = useState(profile.displayNameField || "firstName");
  const [facebookUrl, setFacebookUrl] = useState(profile.facebookUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(profile.tiktokUrl || "");
  const [snapchatUrl, setSnapchatUrl] = useState(profile.snapchatUrl || "");
  const [sharePrenom, setSharePrenom] = useState(profile.sharePrenom !== false);
  const [shareNom, setShareNom] = useState(profile.shareNom !== false);
  const [shareSurnom, setShareSurnom] = useState(profile.shareSurnom !== false);
  const [shareEmail, setShareEmail] = useState(!!profile.shareEmail);
  const [shareBirthDate, setShareBirthDate] = useState(profile.shareBirthDate !== false);
  const [birthDateSharePrecision, setBirthDateSharePrecision] = useState(profile.birthDateSharePrecision || "full");
  const [shareCountry, setShareCountry] = useState(profile.shareCountry !== false);
  const [shareRegion, setShareRegion] = useState(profile.shareRegion !== false);
  const [shareCity, setShareCity] = useState(profile.shareCity !== false);
  const [shareFacebook, setShareFacebook] = useState(profile.shareFacebook !== false);
  const [shareInstagram, setShareInstagram] = useState(profile.shareInstagram !== false);
  const [shareTiktok, setShareTiktok] = useState(profile.shareTiktok !== false);
  const [shareSnapchat, setShareSnapchat] = useState(profile.shareSnapchat !== false);
  const [shareRecords, setShareRecords] = useState(profile.shareRecords !== false);
  const [shareVisitRanking, setShareVisitRanking] = useState(profile.shareVisitRanking !== false);
  const [saved, setSaved] = useState(false);

  const fieldStyle = {
    padding: "12px 14px",
    borderRadius: "10px",
    border: `2px solid ${COLORS.paperAlt}`,
    fontSize: "14px",
    outline: "none",
    marginBottom: "8px",
    width: "100%",
    fontFamily: "'Work Sans', sans-serif",
    color: COLORS.ink,
  };
  const labelStyle = { fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" };
  const shareCheckboxStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, marginBottom: "16px", cursor: "pointer" };

  const ShareToggle = ({ checked, onChange, label = "Visible par mes Bibax" }) => (
    <label style={shareCheckboxStyle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: "15px", height: "15px", accentColor: COLORS.amber }} />
      {label}
    </label>
  );

  const canSave = firstName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (firstName.trim() !== myName) onRenameMe(firstName.trim());
    onSaveProfile({
      lastName: lastName.trim(),
      nickname: nickname.trim(),
      email: email.trim(),
      birthDate,
      country: country.trim(),
      region: region.trim(),
      city: city.trim(),
      avatarUrl,
      bio: bio.trim(),
      displayNameField,
      facebookUrl: facebookUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      tiktokUrl: tiktokUrl.trim(),
      snapchatUrl: snapchatUrl.trim(),
      sharePrenom,
      shareNom,
      shareSurnom,
      shareEmail,
      shareBirthDate,
      birthDateSharePrecision,
      shareCountry,
      shareRegion,
      shareCity,
      shareBio,
      shareFacebook,
      shareInstagram,
      shareTiktok,
      shareSnapchat,
      shareRecords,
      shareVisitRanking,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>MA FICHE</span>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "4px 0 18px 0", lineHeight: 1 }}>Mon profil</h1>

      <label style={labelStyle}>Photo de profil</label>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            border: `2px solid ${COLORS.paperAlt}`,
            background: avatarUrl ? `${COLORS.surface} url(${avatarUrl}) center/cover no-repeat` : COLORS.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploadingPhoto ? "default" : "pointer",
            padding: 0,
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {!avatarUrl && !uploadingPhoto && <NavIcon name="default-avatar" size={38} color={COLORS.amber} />}
          {uploadingPhoto && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(13,27,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>...</div>
          )}
        </button>
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", color: COLORS.ink, cursor: "pointer" }}
          >
            {avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </button>
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "6px" }}>Sinon, l'icône par défaut est utilisée.</p>
        </div>
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
      </div>
      {photoError && <p style={{ fontSize: "12.5px", color: COLORS.wine, marginTop: "-10px", marginBottom: "18px" }}>{photoError}</p>}

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

      <label style={labelStyle}>Bio / citation (facultatif)</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Un mot sur toi, une citation qui te ressemble..."
        rows={3}
        style={{ ...fieldStyle, resize: "vertical", fontFamily: "'Work Sans', sans-serif" }}
      />
      <ShareToggle checked={shareBio} onChange={setShareBio} />

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Prénom *</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Nom</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} />
        </div>
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-2px", marginBottom: "10px" }}>
        Les montrer rassure tes Bibax sur qui tu es réellement — mais ça reste ton choix.
      </p>
      <ShareToggle checked={sharePrenom} onChange={setSharePrenom} label="Prénom visible par mes Bibax" />
      <ShareToggle checked={shareNom} onChange={setShareNom} label="Nom visible par mes Bibax" />

      <label style={labelStyle}>Surnom</label>
      <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex. Ju" style={fieldStyle} />
      <ShareToggle checked={shareSurnom} onChange={setShareSurnom} label="Surnom visible par mes Bibax" />

      <label style={labelStyle}>Nom affiché dans les BibaRooms et ailleurs</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-2px", marginBottom: "10px" }}>
        Une option n'est activable que si l'information correspondante est cochée "visible" ci-dessus. Sinon, ton prénom est utilisé par défaut.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
        {(() => {
          const canFullName = sharePrenom && shareNom && lastName.trim().length > 0;
          const canNickname = shareSurnom && nickname.trim().length > 0;
          const effective = (() => {
            if (displayNameField === "fullName" || displayNameField === "firstNameInitial") return canFullName ? displayNameField : "firstName";
            if (displayNameField === "nickname") return canNickname ? "nickname" : "firstName";
            return "firstName";
          })();
          const options = [
            { key: "fullName", label: lastName.trim() ? `${firstName} ${lastName}` : "Prénom + Nom", enabled: canFullName },
            {
              key: "firstNameInitial",
              label: lastName.trim() ? `${firstName} ${lastName.trim().charAt(0).toUpperCase()}.` : "Prénom + 1ère lettre du nom",
              enabled: canFullName,
            },
            { key: "nickname", label: nickname.trim() || "Surnom", enabled: canNickname },
            { key: "firstName", label: firstName.trim() || "Prénom", enabled: true },
          ];
          return options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => opt.enabled && setDisplayNameField(opt.key)}
              disabled={!opt.enabled}
              style={{
                background: effective === opt.key ? COLORS.amber : COLORS.surface,
                color: effective === opt.key ? COLORS.chalkWhite : opt.enabled ? COLORS.ink : COLORS.inkSoft,
                border: `2px solid ${effective === opt.key ? COLORS.ink : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: opt.enabled ? "pointer" : "not-allowed",
                opacity: opt.enabled ? 1 : 0.45,
              }}
            >
              {opt.label}
            </button>
          ));
        })()}
      </div>

      <label style={labelStyle}>Adresse e-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" style={fieldStyle} />
      <ShareToggle checked={shareEmail} onChange={setShareEmail} />

      <label style={labelStyle}>Date de naissance</label>
      <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={fieldStyle} />
      <ShareToggle checked={shareBirthDate} onChange={setShareBirthDate} />
      {shareBirthDate && (
        <div style={{ display: "flex", gap: "8px", marginTop: "-8px", marginBottom: "18px" }}>
          {[
            { key: "full", label: "Date complète" },
            { key: "dayMonth", label: "Jour et mois seulement" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setBirthDateSharePrecision(opt.key)}
              style={{
                background: birthDateSharePrecision === opt.key ? COLORS.amber : COLORS.surface,
                color: birthDateSharePrecision === opt.key ? COLORS.paper : COLORS.ink,
                border: `2px solid ${birthDateSharePrecision === opt.key ? COLORS.ink : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "7px 13px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <label style={labelStyle}>Pays</label>
      <select value={country} onChange={(e) => setCountry(e.target.value)} style={fieldStyle}>
        <option value="">Sélectionner...</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <ShareToggle checked={shareCountry} onChange={setShareCountry} />

      <label style={labelStyle}>Région</label>
      <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex. Wallonie" style={fieldStyle} />
      <ShareToggle checked={shareRegion} onChange={setShareRegion} />

      <label style={labelStyle}>Ville de résidence</label>
      <CityAutocomplete value={city} onChange={setCity} country={country} placeholder={country ? `Ex. ${(CITIES_BY_COUNTRY[country] || [])[0] || "..."}` : "Choisissez d'abord un pays"} style={fieldStyle} />
      <ShareToggle checked={shareCity} onChange={setShareCity} />

      <label style={labelStyle}>Réseaux sociaux</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <FacebookIcon size={20} />
        <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Lien Facebook" style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} />
      </div>
      <ShareToggle checked={shareFacebook} onChange={setShareFacebook} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <InstagramIcon size={20} />
        <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Lien Instagram" style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} />
      </div>
      <ShareToggle checked={shareInstagram} onChange={setShareInstagram} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <TiktokIcon size={20} />
        <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="Lien TikTok" style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} />
      </div>
      <ShareToggle checked={shareTiktok} onChange={setShareTiktok} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <SnapchatIcon size={20} />
        <input value={snapchatUrl} onChange={(e) => setSnapchatUrl(e.target.value)} placeholder="Lien Snapchat" style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} />
      </div>
      <ShareToggle checked={shareSnapchat} onChange={setShareSnapchat} />

      <label style={{ ...labelStyle, marginTop: "4px" }}>Statistiques visibles par tes Bibax</label>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-2px", marginBottom: "10px" }}>
        Tout ce qui touche à l'argent dépensé reste toujours privé, quel que soit ce choix.
      </p>
      <ShareToggle checked={shareRecords} onChange={setShareRecords} label="Mes records (lieu le plus visité)" />
      <ShareToggle checked={shareVisitRanking} onChange={setShareVisitRanking} label="Mon classement de lieux par visites" />

      <label style={labelStyle}>Langue préférée</label>
      <select value={profile.language || "fr"} disabled style={{ ...fieldStyle, background: COLORS.paperAlt, color: COLORS.inkSoft, cursor: "not-allowed" }}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "-8px", marginBottom: "18px" }}>D'autres langues arriveront plus tard.</p>

      {saved && <p style={{ fontSize: "13px", color: COLORS.sage, fontWeight: 600, marginBottom: "10px" }}>✓ Profil enregistré</p>}

      <PrimaryButton onClick={handleSave} disabled={!canSave} style={{ width: "100%" }}>
        Enregistrer
      </PrimaryButton>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px 16px", marginTop: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>BibaMusic</span>
        </div>
        {spotifyStatus?.connected ? (
          <>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "10px" }}>
              Spotify connecté{spotifyStatus.displayName ? ` : ${spotifyStatus.displayName}` : ""}
            </p>
            <button
              onClick={async () => {
                await disconnectSpotify(myUserId);
                setSpotifyStatus({ connected: false });
              }}
              style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer", width: "100%" }}
            >
              Déconnecter Spotify
            </button>
          </>
        ) : (
          <button
            onClick={redirectToSpotifyAuth}
            style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 700, color: COLORS.paper, cursor: "pointer", width: "100%" }}
          >
            Connecter Spotify
          </button>
        )}
      </div>

      {profile.isAdmin ? (
        <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "18px", textAlign: "center" }}>🛡️ Mode administrateur actif</p>
      ) : (
        <button
          onClick={onGoToAdminUnlock}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", cursor: "pointer", marginTop: "18px", textAlign: "center", width: "100%" }}
        >
          🔐 Accès administrateur
        </button>
      )}
      <button
        onClick={onLogout}
        style={{ background: "none", border: "none", color: "#D64545", fontSize: "12px", fontWeight: 700, cursor: "pointer", marginTop: "14px", textAlign: "center", width: "100%" }}
      >
        Se déconnecter
      </button>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
