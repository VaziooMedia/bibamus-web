import React, { useState, useEffect } from "react";
import { WhatsappIcon } from "./icons.jsx";
import { updateBrewery, deleteBrewery, createBrewery, uploadBreweryPhoto, loadPublicVenues, loadBreweriesDirectory, mergeEntities } from "../data/sharedDirectories.js";
import { StatusSelector } from "./StatusSelector.jsx";
import { AdminPhotoField } from "./AdminPhotoField.jsx";
import { AddressAutocomplete } from "./AddressAutocomplete.jsx";
import { SearchableSelect } from "./SearchableSelect.jsx";
import { CertificationLevelSelector } from "./CertificationLevelSelector.jsx";
import { COUNTRIES, PHONE_PREFIXES, PRODUCER_TYPES, PRODUCER_PROFILES, COUNTRY_ISO_CODES } from "../constants.js";

const GEOAPIFY_CONFIGURED = !!(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEOAPIFY_API_KEY);

const SMALL_WORDS = new Set(["de", "du", "des", "la", "le", "les", "à", "et", "the", "a", "au", "aux"]);
const SMALL_APOSTROPHE_PREFIXES = new Set(["d", "l"]);

// Ne force jamais la casse d'une lettre déjà en majuscule (préserve les sigles comme "RFC" ou
// les noms composés comme "BrewTous") — ajoute une majuscule seulement au tout premier
// caractère d'un mot/segment, s'il manque. Garde les déterminants (de/du/des/la/le/les/à/et/
// the/a/au/aux, ainsi que d'/l') en minuscule sauf en tout début de texte — ex. "Café de la
// Gare", "Côte d'Ivoire", "Rue Henri-Blès".
const capFirstOnly = (w) => {
  if (!w) return w;
  if (w.charAt(0) === w.charAt(0).toUpperCase()) return w;
  return w.charAt(0).toUpperCase() + w.slice(1);
};

const capSegment = (segment, isVeryFirst) => {
  if (!segment) return segment;
  const apostropheMatch = segment.match(/^([a-zàâäéèêëïîôöùûüÿœæçA-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸŒÆÇ]+)(['’])(.*)$/);
  if (apostropheMatch) {
    const [, prefix, apos, rest] = apostropheMatch;
    const isSmallPrefix = SMALL_APOSTROPHE_PREFIXES.has(prefix.toLowerCase());
    const newPrefix = !isVeryFirst && isSmallPrefix ? prefix.toLowerCase() : capFirstOnly(prefix);
    return newPrefix + apos + capFirstOnly(rest);
  }
  const lower = segment.toLowerCase();
  if (!isVeryFirst && SMALL_WORDS.has(lower)) return lower;
  return capFirstOnly(segment);
};

const capitalizeWords = (s) => {
  if (!s) return s;
  return s
    .split(" ")
    .map((word, wordIndex) =>
      word
        .split("-")
        .map((segment, segIndex) => capSegment(segment, wordIndex === 0 && segIndex === 0))
        .join("-")
    )
    .join(" ");
};

const parseCoordinate = (raw) => {
  if (!raw) return raw;
  const match = String(raw).match(/(-?\d+[.,]?\d*)\s*°?\s*([NSEWnsew])?/);
  if (!match) return raw;
  let value = parseFloat(match[1].replace(",", "."));
  if (isNaN(value)) return raw;
  const dir = match[2]?.toUpperCase();
  if (dir === "S" || dir === "W") value = -Math.abs(value);
  else if (dir === "N" || dir === "E") value = Math.abs(value);
  return String(value);
};

const fieldStyle = { padding: "10px 12px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "14px", width: "100%" };
const labelStyle = { fontSize: "12.5px", color: "#8792A6", marginBottom: "4px", display: "block", fontWeight: 600 };
const sectionTitleStyle = { fontSize: "13px", fontWeight: 700, color: "#F2F2E8", marginTop: "6px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" };
const separatorStyle = { borderBottom: "1px solid #28405C", margin: "20px 0" };

function SectionTitle({ children }) {
  return (
    <div style={sectionTitleStyle}>
      <span style={{ width: "4px", height: "14px", background: "#39FF66", borderRadius: "2px", display: "inline-block" }} />
      {children}
    </div>
  );
}

function TagPicker({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((o) => {
        const checked = selected.includes(o.code);
        return (
          <button
            key={o.code}
            onClick={() => onToggle(o.code)}
            style={{
              background: checked ? "#39FF66" : "none",
              border: `2px solid ${checked ? "#39FF66" : "#28405C"}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: checked ? "#0D1B2A" : "#F2F2E8",
              cursor: "pointer",
            }}
          >
            {o.fr}
          </button>
        );
      })}
    </div>
  );
}

// brewery === null → mode création
export function BreweryDetailPanel({ brewery, onClose, onSaved }) {
  const isNew = !brewery;
  const [form, setForm] = useState({
    name: brewery?.name || "",
    aliasesText: (brewery?.aliases || []).join(", "),
    subtitle: brewery?.subtitle || "",
    streetName: brewery?.streetName || "",
    streetNumber: brewery?.streetNumber || "",
    postalCode: brewery?.postalCode || "",
    city: brewery?.city || "",
    village: brewery?.village || "",
    country: brewery?.country || "belgique",
    lat: brewery?.lat ?? "",
    lng: brewery?.lng ?? "",
    phone: (brewery?.phone || "").replace(/^(\+\d+\s*)+/, ""),
    email: brewery?.email || "",
    website: brewery?.website || "",
    googleUrl: brewery?.googleUrl || "",
    whatsappUrl: brewery?.whatsappUrl || "",
    facebookUrl: brewery?.facebookUrl || "",
    instagramUrl: brewery?.instagramUrl || "",
    linkedinUrl: brewery?.linkedinUrl || "",
    youtubeUrl: brewery?.youtubeUrl || "",
    tiktokUrl: brewery?.tiktokUrl || "",
    snapchatUrl: brewery?.snapchatUrl || "",
    producerTypes: brewery?.producerTypes || [],
    producerProfiles: brewery?.producerProfiles || [],
    linkedVenueId: brewery?.linkedVenueId || null,
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(brewery?.profilePhotoUrl || null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(brewery?.coverPhotoUrl || null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [status, setStatus] = useState(brewery?.status || "to_process");
  const [certificationLevel, setCertificationLevel] = useState(brewery?.certificationLevel || "utilisateur");
  const [duplicateOfId, setDuplicateOfId] = useState(brewery?.duplicateOfId || null);
  const [otherBreweryOptions, setOtherBreweryOptions] = useState([]);

  useEffect(() => {
    if (status === "duplicate") {
      loadBreweriesDirectory().then((list) => setOtherBreweryOptions(list.filter((b) => b.id !== brewery?.id).map((b) => ({ id: b.id, name: b.name }))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const [venueOptions, setVenueOptions] = useState([]);

  useEffect(() => {
    loadPublicVenues().then((list) => setVenueOptions(list.map((v) => ({ id: v.id, name: `${v.name} — ${v.city || ""}` }))));
  }, []);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const capitalizeOnBlur = (field) => () => set(field, capitalizeWords(form[field]));
  const toggleTag = (field, tag) => setForm((f) => ({ ...f, [field]: f[field].includes(tag) ? f[field].filter((x) => x !== tag) : [...f[field], tag] }));

  const phonePrefix = PHONE_PREFIXES[form.country] || "";

  const buildPatch = () => ({
    name: capitalizeWords(form.name.trim()),
    aliases: form.aliasesText.split(",").map((a) => a.trim()).filter(Boolean),
    subtitle: capitalizeWords(form.subtitle.trim()),
    streetName: capitalizeWords(form.streetName.trim()),
    streetNumber: form.streetNumber.trim(),
    postalCode: form.postalCode.trim(),
    city: capitalizeWords(form.city.trim()),
    village: capitalizeWords(form.village.trim()),
    country: form.country,
    lat: form.lat === "" ? null : parseFloat(form.lat),
    lng: form.lng === "" ? null : parseFloat(form.lng),
    phone: form.phone.trim() ? `${phonePrefix} ${form.phone.trim()}` : "",
    email: form.email.trim(),
    website: form.website.trim(),
    googleUrl: form.googleUrl.trim(),
    whatsappUrl: form.whatsappUrl.trim(),
    facebookUrl: form.facebookUrl.trim(),
    instagramUrl: form.instagramUrl.trim(),
    linkedinUrl: form.linkedinUrl.trim(),
    youtubeUrl: form.youtubeUrl.trim(),
    tiktokUrl: form.tiktokUrl.trim(),
    snapchatUrl: form.snapchatUrl.trim(),
    producerTypes: form.producerTypes,
    producerProfiles: form.producerProfiles,
    linkedVenueId: form.linkedVenueId,
    profilePhotoUrl,
    coverPhotoUrl,
    status,
    certificationLevel,
    duplicateOfId: status === "duplicate" ? duplicateOfId : null,
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (isNew) {
      const id = `brewery-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const created = await createBrewery({ id, ...buildPatch() });
      setSaving(false);
      onSaved(created);
    } else if (status === "duplicate" && duplicateOfId) {
      const result = await mergeEntities("producer", brewery.id, duplicateOfId);
      setSaving(false);
      if (result.error) {
        alert("La fusion a échoué : " + result.error);
        return;
      }
      onSaved({ ...brewery, status: "duplicate", duplicateOfId });
    } else {
      const patch = buildPatch();
      const result = await updateBrewery(brewery.id, patch);
      setSaving(false);
      if (result?.error) {
        alert("La sauvegarde a échoué : " + result.error);
        return;
      }
      onSaved({ ...brewery, ...patch });
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer définitivement "${brewery.name}" ?`)) return;
    const result = await deleteBrewery(brewery.id);
    if (result?.error) {
      alert("La suppression a échoué : " + result.error);
      return;
    }
    onSaved(null);
  };

  const handleUploadProfile = async (file) => {
    setUploadingProfile(true);
    const tempId = brewery?.id || `pending-${Date.now()}`;
    const url = await uploadBreweryPhoto(tempId, file, "profile");
    if (url) setProfilePhotoUrl(url);
    setUploadingProfile(false);
  };

  const handleUploadCover = async (file) => {
    setUploadingCover(true);
    const tempId = brewery?.id || `pending-${Date.now()}`;
    const url = await uploadBreweryPhoto(tempId, file, "cover");
    if (url) setCoverPhotoUrl(url);
    setUploadingCover(false);
  };

  const requiredOk = form.name.trim();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
      <div style={{ width: "540px", background: "#0D1B2A", height: "100%", overflowY: "auto", padding: "28px", borderLeft: "2px solid #28405C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{isNew ? "Ajouter un producteur" : "Vérifier le producteur"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8792A6", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <AdminPhotoField label="Photo de profil (400×400)" photoUrl={profilePhotoUrl} onUpload={handleUploadProfile} onDelete={() => setProfilePhotoUrl(null)} uploading={uploadingProfile} />
        <AdminPhotoField label="Photo de couverture (1200×400)" photoUrl={coverPhotoUrl} aspect="banner" onUpload={handleUploadCover} onDelete={() => setCoverPhotoUrl(null)} uploading={uploadingCover} />

        <label style={labelStyle}>Nom *</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={capitalizeOnBlur("name")} style={{ ...fieldStyle, marginBottom: "14px" }} />

        <label style={labelStyle}>Alias / traductions (séparés par une virgule)</label>
        <input
          value={form.aliasesText}
          onChange={(e) => set("aliasesText", e.target.value)}
          placeholder="Ex. anciens noms, traductions dans une autre langue..."
          style={{ ...fieldStyle, marginBottom: "14px" }}
        />

        <label style={labelStyle}>Sous-titre</label>
        <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} onBlur={capitalizeOnBlur("subtitle")} style={fieldStyle} />

        <div style={separatorStyle} />
        <SectionTitle>Adresse</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Rue / Place / Avenue</label>
            <input value={form.streetName} onChange={(e) => set("streetName", e.target.value)} onBlur={capitalizeOnBlur("streetName")} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>N°</label>
            <input value={form.streetNumber} onChange={(e) => set("streetNumber", e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {GEOAPIFY_CONFIGURED ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "12px" }}>
            <AddressAutocomplete
              postalCode={form.postalCode}
              city={form.city}
              countryIsoCode={COUNTRY_ISO_CODES[form.country]}
              onPostalCodeChange={(v) => set("postalCode", v)}
              onCityChange={(v) => set("city", v)}
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={labelStyle}>Code postal</label>
              <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} onBlur={capitalizeOnBlur("city")} style={fieldStyle} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Village</label>
            <input value={form.village} onChange={(e) => set("village", e.target.value)} onBlur={capitalizeOnBlur("village")} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Pays</label>
            <select value={form.country} onChange={(e) => set("country", e.target.value)} style={fieldStyle}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.fr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "6px" }}>
          <div>
            <label style={labelStyle}>Latitude</label>
            <input
              type="text"
              value={form.lat}
              onChange={(e) => set("lat", e.target.value)}
              onBlur={(e) => set("lat", parseCoordinate(e.target.value))}
              placeholder="Ex. 50.4261 ou 50.4261° N"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Longitude</label>
            <input
              type="text"
              value={form.lng}
              onChange={(e) => set("lng", e.target.value)}
              onBlur={(e) => set("lng", parseCoordinate(e.target.value))}
              placeholder="Ex. 6.0251 ou 6.0251° E"
              style={fieldStyle}
            />
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "#8792A6", marginTop: "-2px", marginBottom: "14px" }}>Formats "50.4261" ou "50.4261° N" tous les deux acceptés.</p>

        <div style={separatorStyle} />
        <SectionTitle>Coordonnées</SectionTitle>

        <label style={labelStyle}>Téléphone</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <div style={{ ...fieldStyle, width: "64px", flexShrink: 0, textAlign: "center", color: "#8792A6" }}>{phonePrefix || "—"}</div>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="000 00 00 00" style={fieldStyle} />
        </div>

        <label style={labelStyle}>Email</label>
        <input value={form.email} onChange={(e) => set("email", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Site internet</label>
        <input value={form.website} onChange={(e) => set("website", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Google</label>
        <input value={form.googleUrl} onChange={(e) => set("googleUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
          <WhatsappIcon size={18} />
          Lien WhatsApp
        </label>
        <input value={form.whatsappUrl} onChange={(e) => set("whatsappUrl", e.target.value)} placeholder="https://wa.me/..." style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Facebook</label>
        <input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Instagram</label>
        <input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien TikTok</label>
        <input value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Snapchat</label>
        <input value={form.snapchatUrl} onChange={(e) => set("snapchatUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien LinkedIn</label>
        <input value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien YouTube</label>
        <input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} style={fieldStyle} />

        <div style={separatorStyle} />
        <SectionTitle>Type de producteur</SectionTitle>
        <TagPicker options={PRODUCER_TYPES} selected={form.producerTypes} onToggle={(t) => toggleTag("producerTypes", t)} />

        <div style={separatorStyle} />
        <SectionTitle>Profil du producteur</SectionTitle>
        <TagPicker options={PRODUCER_PROFILES} selected={form.producerProfiles} onToggle={(t) => toggleTag("producerProfiles", t)} />

        <div style={separatorStyle} />
        <SectionTitle>Lien avec un établissement</SectionTitle>
        <p style={{ fontSize: "11.5px", color: "#8792A6", marginTop: "-6px", marginBottom: "10px" }}>
          Si ce producteur est aussi un lieu physique (ex. une brasserie-restaurant), associez-le à sa fiche établissement plutôt que de recréer la même adresse en double.
        </p>
        <SearchableSelect options={venueOptions} value={form.linkedVenueId} onChange={(id) => set("linkedVenueId", id)} placeholder="Chercher un établissement..." />

        <div style={separatorStyle} />
        <label style={labelStyle}>Statut</label>
        <div style={{ marginBottom: "14px" }}>
          <StatusSelector value={status} onChange={setStatus} />
        </div>

        {status === "duplicate" && (
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Doublon de</label>
            <SearchableSelect options={otherBreweryOptions} value={duplicateOfId} onChange={setDuplicateOfId} placeholder="Chercher le producteur conservé..." />
          </div>
        )}

        <label style={labelStyle}>Niveau de certification</label>
        <div style={{ marginBottom: "20px" }}>
          <CertificationLevelSelector value={certificationLevel} onChange={setCertificationLevel} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={save}
            disabled={saving || !requiredOk}
            style={{ background: "#39FF66", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, color: "#0D1B2A", cursor: "pointer", opacity: requiredOk ? 1 : 0.5 }}
          >
            ✓ {isNew ? "Créer le producteur" : "Enregistrer"}
          </button>
          {!isNew && (
            <button onClick={remove} style={{ background: "none", border: "none", color: "#FF3B4E", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
