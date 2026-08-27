import React, { useState, useEffect } from "react";
import { updateBrand, deleteBrand, createBrand, uploadBrandLogo, loadBreweriesDirectory } from "../data/sharedDirectories.js";
import { StatusSelector } from "./StatusSelector.jsx";
import { AdminPhotoField } from "./AdminPhotoField.jsx";
import { SearchableSelect } from "./SearchableSelect.jsx";
import { COUNTRIES, BRAND_CLASSIFICATIONS, BRAND_TYPES } from "../constants.js";

const SMALL_WORDS = new Set(["de", "du", "des", "la", "le", "les", "à", "et", "the", "a"]);
const SMALL_APOSTROPHE_PREFIXES = new Set(["d", "l"]);

// Majuscule en début de chaque mot, mais garde les déterminants (de/du/des/la/le/les/à/et/the/a,
// ainsi que d'/l') en minuscule sauf en tout début de texte — ex. "Café de la Gare",
// "Côte d'Ivoire". Corrige aussi un bug où les lettres accentuées en milieu de mot (café → CafÉ)
// étaient capitalisées à tort : \b (limite de mot) en JavaScript ignore les lettres accentuées.
const capitalizeWords = (s) => {
  if (!s) return s;
  const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  return s
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      const apostropheMatch = word.match(/^([a-zàâäéèêëïîôöùûüÿœæç]+)(['’])(.*)$/i);
      if (apostropheMatch) {
        const [, prefix, apos, rest] = apostropheMatch;
        const prefixLower = prefix.toLowerCase();
        const isSmallPrefix = SMALL_APOSTROPHE_PREFIXES.has(prefixLower);
        const newPrefix = index === 0 || !isSmallPrefix ? cap(prefixLower) : prefixLower;
        return newPrefix + apos + cap(rest.toLowerCase());
      }
      const lower = word.toLowerCase();
      if (index !== 0 && SMALL_WORDS.has(lower)) return lower;
      return cap(lower);
    })
    .join(" ");
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

// brand === null → mode création
export function BrandDetailPanel({ brand, onClose, onSaved }) {
  const isNew = !brand;
  const [form, setForm] = useState({
    name: brand?.name || "",
    alternateName: brand?.alternateName || "",
    slogan: brand?.slogan || "",
    foundedYear: brand?.foundedYear ?? "",
    originCountry: brand?.originCountry || "belgique",
    originCity: brand?.originCity || "",
    classification: brand?.classification || BRAND_CLASSIFICATIONS[0].code,
    brandTypes: brand?.brandTypes || [],
    website: brand?.website || "",
    facebookUrl: brand?.facebookUrl || "",
    instagramUrl: brand?.instagramUrl || "",
    tiktokUrl: brand?.tiktokUrl || "",
    snapchatUrl: brand?.snapchatUrl || "",
    producerId: brand?.producerId || null,
    brandOwner: brand?.brandOwner || "",
  });
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState(brand?.status || (isNew ? "certified" : "pending"));
  const [saving, setSaving] = useState(false);
  const [producerOptions, setProducerOptions] = useState([]);

  useEffect(() => {
    loadBreweriesDirectory().then((list) => setProducerOptions(list.map((b) => ({ id: b.id, name: b.name }))));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const capitalizeOnBlur = (field) => () => set(field, capitalizeWords(form[field]));
  const toggleType = (t) => setForm((f) => ({ ...f, brandTypes: f.brandTypes.includes(t) ? f.brandTypes.filter((x) => x !== t) : [...f.brandTypes, t] }));

  const buildPatch = () => ({
    name: capitalizeWords(form.name.trim()),
    alternateName: capitalizeWords(form.alternateName.trim()),
    slogan: capitalizeWords(form.slogan.trim()),
    foundedYear: form.foundedYear === "" ? null : parseInt(form.foundedYear, 10),
    originCountry: form.originCountry,
    originCity: form.originCity.trim(),
    classification: form.classification,
    brandTypes: form.brandTypes,
    website: form.website.trim(),
    facebookUrl: form.facebookUrl.trim(),
    instagramUrl: form.instagramUrl.trim(),
    tiktokUrl: form.tiktokUrl.trim(),
    snapchatUrl: form.snapchatUrl.trim(),
    producerId: form.producerId,
    brandOwner: form.brandOwner.trim(),
    logoUrl,
    status,
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (isNew) {
      const id = `brand-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const created = await createBrand({ id, ...buildPatch() });
      setSaving(false);
      onSaved(created);
    } else {
      const patch = buildPatch();
      await updateBrand(brand.id, patch);
      setSaving(false);
      onSaved({ ...brand, ...patch });
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer définitivement "${brand.name}" ?`)) return;
    await deleteBrand(brand.id);
    onSaved(null);
  };

  const handleUploadLogo = async (file) => {
    setUploadingLogo(true);
    const tempId = brand?.id || `pending-${Date.now()}`;
    const url = await uploadBrandLogo(tempId, file);
    if (url) setLogoUrl(url);
    setUploadingLogo(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
      <div style={{ width: "500px", background: "#0D1B2A", height: "100%", overflowY: "auto", padding: "28px", borderLeft: "2px solid #28405C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{isNew ? "Ajouter une marque" : "Vérifier la marque"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8792A6", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <AdminPhotoField label="Logo (400×400)" photoUrl={logoUrl} onUpload={handleUploadLogo} onDelete={() => setLogoUrl(null)} uploading={uploadingLogo} />

        <label style={labelStyle}>Nom *</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={capitalizeOnBlur("name")} style={{ ...fieldStyle, marginBottom: "14px" }} />

        <label style={labelStyle}>Nom alternatif / Ancien nom</label>
        <input value={form.alternateName} onChange={(e) => set("alternateName", e.target.value)} style={{ ...fieldStyle, marginBottom: "14px" }} />

        <label style={labelStyle}>Slogan</label>
        <input value={form.slogan} onChange={(e) => set("slogan", e.target.value)} onBlur={capitalizeOnBlur("slogan")} style={fieldStyle} />

        <div style={separatorStyle} />
        <SectionTitle>Identité</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Année de création</label>
            <input type="number" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="Ex. 1985" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Pays d'origine</label>
            <select value={form.originCountry} onChange={(e) => set("originCountry", e.target.value)} style={fieldStyle}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.fr}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label style={labelStyle}>Ville / Région d'origine</label>
        <input value={form.originCity} onChange={(e) => set("originCity", e.target.value)} onBlur={capitalizeOnBlur("originCity")} style={fieldStyle} />

        <div style={separatorStyle} />
        <SectionTitle>Classification</SectionTitle>
        <select value={form.classification} onChange={(e) => set("classification", e.target.value)} style={fieldStyle}>
          {BRAND_CLASSIFICATIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.fr}
            </option>
          ))}
        </select>

        <div style={separatorStyle} />
        <SectionTitle>Type de marque</SectionTitle>
        <TagPicker options={BRAND_TYPES} selected={form.brandTypes} onToggle={toggleType} />

        <div style={separatorStyle} />
        <SectionTitle>Coordonnées</SectionTitle>
        <label style={labelStyle}>Site internet</label>
        <input value={form.website} onChange={(e) => set("website", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Facebook</label>
        <input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Instagram</label>
        <input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien TikTok</label>
        <input value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
        <label style={labelStyle}>Lien Snapchat</label>
        <input value={form.snapchatUrl} onChange={(e) => set("snapchatUrl", e.target.value)} style={fieldStyle} />

        <div style={separatorStyle} />
        <SectionTitle>Producteur / Propriétaire</SectionTitle>
        <label style={labelStyle}>Producteur actuel</label>
        <div style={{ marginBottom: "12px" }}>
          <SearchableSelect options={producerOptions} value={form.producerId} onChange={(id) => set("producerId", id)} placeholder="Chercher un producteur..." />
        </div>
        <label style={labelStyle}>Propriétaire de la marque</label>
        <input value={form.brandOwner} onChange={(e) => set("brandOwner", e.target.value)} onBlur={capitalizeOnBlur("brandOwner")} style={fieldStyle} />

        <div style={separatorStyle} />
        <label style={labelStyle}>Statut</label>
        <div style={{ marginBottom: "20px" }}>
          <StatusSelector value={status} onChange={setStatus} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            style={{ background: "#39FF66", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, color: "#0D1B2A", cursor: "pointer", opacity: form.name.trim() ? 1 : 0.5 }}
          >
            ✓ {isNew ? "Créer la marque" : "Enregistrer"}
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
