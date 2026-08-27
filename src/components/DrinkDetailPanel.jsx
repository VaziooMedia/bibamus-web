import React, { useState, useEffect } from "react";
import { updateDrink, deleteDrink, createDrink, uploadDrinkMainPhoto, uploadDrinkGalleryPhoto, loadBrandsDirectory, loadBreweriesDirectory } from "../data/sharedDirectories.js";
import { StatusSelector } from "./StatusSelector.jsx";
import { AdminPhotoField } from "./AdminPhotoField.jsx";
import { GalleryManager } from "./GalleryManager.jsx";
import { SearchableSelect, SearchableMultiSelect } from "./SearchableSelect.jsx";
import { StyleTagAccordion } from "./StyleTagAccordion.jsx";
import { TasteScale } from "./TasteScale.jsx";
import { VariantManager } from "./VariantManager.jsx";
import { FreeTagInput } from "./FreeTagInput.jsx";
import { CollapsibleSection } from "./CollapsibleSection.jsx";
import { COUNTRIES } from "../constants.js";
import {
  BEER_CIDER_STYLE_GROUPS,
  BEER_CIDER_COMMERCIAL_STATUSES,
  FLAVOR_NOTE_GROUPS,
  FOOD_PAIRINGS,
  OCCASIONS,
  RECOMMENDED_GLASSES,
  YES_NO_UNKNOWN,
  FERMENTATION_TYPES,
  BEER_AGING_OPTIONS,
  BARREL_TYPES,
  MAIN_FRUITS,
  CIDER_FERMENTATION_TYPES,
  CARBONATION_METHODS,
  CIDER_AGING_OPTIONS,
  CIDER_BARREL_TYPES,
  ALLERGENS,
  MASHING_PROCESSES,
  APPLE_TYPES,
  VERIFICATION_STATUSES,
} from "../data/beerCiderStyles.js";

export const DRINK_TYPES = [
  { code: "bieres_cidres", fr: "Bières & Cidres" },
  { code: "vins_bulles", fr: "Vins & Bulles" },
  { code: "spiritueux", fr: "Spiritueux" },
  { code: "cocktails_mocktails", fr: "Cocktails / Mocktails" },
  { code: "softs_eaux", fr: "Softs & Eaux" },
  { code: "boissons_chaudes", fr: "Boissons chaudes" },
  { code: "snacks", fr: "Snacks" },
  { code: "generiques", fr: "Génériques" },
];
export const BEER_CIDER_SUBTYPES = [
  { code: "biere", fr: "Bière" },
  { code: "cidre", fr: "Cidre" },
  { code: "poire", fr: "Poiré" },
];

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

// drink === null → mode création (nouvelle fiche vierge)
export function DrinkDetailPanel({ drink, onClose, onSaved }) {
  const isNew = !drink;
  const [form, setForm] = useState({
    name: drink?.name || "",
    type: drink?.type || DRINK_TYPES[0].code,
    beverageSubtype: drink?.beverageSubtype || BEER_CIDER_SUBTYPES[0].code,
    brandId: drink?.brandId || null,
    producerIds: drink?.producerIds || [],
    nationality: drink?.nationality || "belgique",
    originRegion: drink?.originRegion || "",
    originCity: drink?.originCity || "",
    styles: drink?.styles || [],
    abv: drink?.abv ?? "",
    kcalPer100ml: drink?.kcalPer100ml ?? "",
    productStatus: drink?.productStatus || BEER_CIDER_COMMERCIAL_STATUSES[0].code,
    alternateName: drink?.alternateName || "",
    launchYear: drink?.launchYear ?? "",
    // Niveau 2 — composition bière
    malts: drink?.malts || [],
    hops: drink?.hops || [],
    yeast: drink?.yeast || "",
    cereals: drink?.cereals || [],
    fruits: drink?.fruits || [],
    spices: drink?.spices || [],
    otherIngredients: drink?.otherIngredients || [],
    allergens: drink?.allergens || [],
    // Niveau 2 — fabrication bière
    fermentationType: drink?.fermentationType || "",
    bottleRefermented: drink?.bottleRefermented || "",
    filtered: drink?.filtered || "",
    pasteurized: drink?.pasteurized || "",
    dryHopping: drink?.dryHopping || "",
    beerAging: drink?.beerAging || "",
    barrelType: drink?.barrelType || "",
    // Niveau 2 — composition & fabrication cidre/poiré
    mainFruit: drink?.mainFruit || "",
    fruitVarieties: drink?.fruitVarieties || "",
    fruitOrigin: drink?.fruitOrigin || "",
    pureJuice: drink?.pureJuice || "",
    concentrateUsed: drink?.concentrateUsed || "",
    ciderFermentation: drink?.ciderFermentation || "",
    carbonationMethod: drink?.carbonationMethod || "",
    ciderFiltered: drink?.ciderFiltered || "",
    ciderPasteurized: drink?.ciderPasteurized || "",
    ciderAging: drink?.ciderAging || "",
    ciderBarrelType: drink?.ciderBarrelType || "",
    // Niveau 2 — profil gustatif
    tasteBitterness: drink?.tasteBitterness ?? null,
    tasteSweetness: drink?.tasteSweetness ?? null,
    tasteAcidity: drink?.tasteAcidity ?? null,
    tasteBody: drink?.tasteBody ?? null,
    tasteFruitiness: drink?.tasteFruitiness ?? null,
    tasteHoppiness: drink?.tasteHoppiness ?? null,
    tasteMaltiness: drink?.tasteMaltiness ?? null,
    tasteTannin: drink?.tasteTannin ?? null,
    tasteCarbonation: drink?.tasteCarbonation ?? null,
    // Niveau 2 — arômes & saveurs
    flavorNotes: drink?.flavorNotes || [],
    // Niveau 2 — service & consommation
    servingTemperature: drink?.servingTemperature || "",
    recommendedGlass: drink?.recommendedGlass || RECOMMENDED_GLASSES[0].code,
    foodPairings: drink?.foodPairings || [],
    occasion: drink?.occasion || "",
    // Niveau 2 — caractéristiques & labels
    alcoholFree: !!drink?.alcoholFree,
    lowAlcohol: !!drink?.lowAlcohol,
    glutenFree: !!drink?.glutenFree,
    glutenReduced: !!drink?.glutenReduced,
    bio: !!drink?.bio,
    vegan: drink?.vegan || "inconnu",
    sugarFree: !!drink?.sugarFree,
    lactoseFree: !!drink?.lactoseFree,
    certifications: drink?.certifications || [],
    // Niveau 2 — présentation
    shortDescription: drink?.shortDescription || "",
    fullDescription: drink?.fullDescription || "",
    productHistory: drink?.productHistory || "",
    officialUrl: drink?.officialUrl || "",
    // Niveau 3 — données techniques bière
    ibu: drink?.ibu ?? "",
    colorEbc: drink?.colorEbc ?? "",
    colorSrm: drink?.colorSrm ?? "",
    originalGravity: drink?.originalGravity ?? "",
    finalGravity: drink?.finalGravity ?? "",
    platoDegree: drink?.platoDegree ?? "",
    apparentAttenuation: drink?.apparentAttenuation ?? "",
    finalPh: drink?.finalPh ?? "",
    carbonationTechnical: drink?.carbonationTechnical || "",
    relativeBitterness: drink?.relativeBitterness ?? "",
    realExtract: drink?.realExtract ?? "",
    // Niveau 3 — procédé brassicole avancé
    mashingProcess: drink?.mashingProcess || "",
    hoppingDetails: drink?.hoppingDetails || "",
    dryHopDetail: drink?.dryHopDetail || "",
    yeastStrain: drink?.yeastStrain || "",
    primaryFermentation: drink?.primaryFermentation || "",
    secondaryFermentation: drink?.secondaryFermentation || "",
    conditioningProcess: drink?.conditioningProcess || "",
    maturationDetails: drink?.maturationDetails || "",
    barrelDetails: drink?.barrelDetails || "",
    blendDetails: drink?.blendDetails || "",
    // Niveau 3 — données techniques cidre/poiré
    ciderInitialGravity: drink?.ciderInitialGravity ?? "",
    ciderFinalGravity: drink?.ciderFinalGravity ?? "",
    residualSugar: drink?.residualSugar ?? "",
    totalAcidity: drink?.totalAcidity ?? "",
    ciderPh: drink?.ciderPh ?? "",
    tanninLevel: drink?.tanninLevel ?? "",
    ciderCarbonationTechnical: drink?.ciderCarbonationTechnical || "",
    detailedVarieties: drink?.detailedVarieties || "",
    appleType: drink?.appleType || "",
    pressingMethod: drink?.pressingMethod || "",
    defecationKeeving: drink?.defecationKeeving || "",
    malolacticFermentation: drink?.malolacticFermentation || "",
    ciderBlendDetails: drink?.ciderBlendDetails || "",
    ciderAgingDetails: drink?.ciderAgingDetails || "",
    // Niveau 3 — traçabilité & sources
    infoSource: drink?.infoSource || "",
    sourceUrl: drink?.sourceUrl || "",
    verificationDate: drink?.verificationDate || "",
    contributor: drink?.contributor || "",
    verificationStatus: drink?.verificationStatus || VERIFICATION_STATUSES[0].code,
  });
  const [mainPhotoUrl, setMainPhotoUrl] = useState(drink?.mainPhotoUrl || null);
  const [galleryPhotos, setGalleryPhotos] = useState(drink?.galleryPhotos || []);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [status, setStatus] = useState(drink?.status || "pending");
  const [stylesSectionOpen, setStylesSectionOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("quick");
  const [saving, setSaving] = useState(false);
  const [brandOptions, setBrandOptions] = useState([]);
  const [producerOptions, setProducerOptions] = useState([]);

  const isBeerOrCider = form.type === "bieres_cidres";
  const isBeer = form.beverageSubtype === "biere";

  useEffect(() => {
    loadBrandsDirectory().then((list) => setBrandOptions(list.map((b) => ({ id: b.id, name: b.name }))));
    loadBreweriesDirectory().then((list) => setProducerOptions(list.map((b) => ({ id: b.id, name: b.name }))));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggleStyle = (tag) => setForm((f) => ({ ...f, styles: f.styles.includes(tag) ? f.styles.filter((t) => t !== tag) : [...f.styles, tag] }));
  const toggleArrayField = (field, value) => setForm((f) => ({ ...f, [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value] }));

  const buildPatch = () => {
    const base = {
      name: form.name.trim(),
      type: form.type,
      abv: form.abv === "" ? null : parseFloat(form.abv),
      kcalPer100ml: form.kcalPer100ml === "" ? null : parseFloat(form.kcalPer100ml),
      status,
    };
    if (!isBeerOrCider) return base;
    return {
      ...base,
      beverageSubtype: form.beverageSubtype,
      brandId: form.brandId,
      producerIds: form.producerIds,
      nationality: form.nationality,
      originRegion: form.originRegion.trim(),
      originCity: form.originCity.trim(),
      styles: form.styles,
      productStatus: form.productStatus,
      alternateName: form.alternateName.trim(),
      launchYear: form.launchYear === "" ? null : parseInt(form.launchYear, 10),
      malts: form.malts,
      hops: form.hops,
      yeast: form.yeast.trim(),
      cereals: form.cereals,
      fruits: form.fruits,
      spices: form.spices,
      otherIngredients: form.otherIngredients,
      allergens: form.allergens,
      fermentationType: form.fermentationType,
      bottleRefermented: form.bottleRefermented,
      filtered: form.filtered,
      pasteurized: form.pasteurized,
      dryHopping: form.dryHopping,
      beerAging: form.beerAging,
      barrelType: form.barrelType,
      mainFruit: form.mainFruit,
      fruitVarieties: form.fruitVarieties.trim(),
      fruitOrigin: form.fruitOrigin.trim(),
      pureJuice: form.pureJuice,
      concentrateUsed: form.concentrateUsed,
      ciderFermentation: form.ciderFermentation,
      carbonationMethod: form.carbonationMethod,
      ciderFiltered: form.ciderFiltered,
      ciderPasteurized: form.ciderPasteurized,
      ciderAging: form.ciderAging,
      ciderBarrelType: form.ciderBarrelType,
      tasteBitterness: form.tasteBitterness,
      tasteSweetness: form.tasteSweetness,
      tasteAcidity: form.tasteAcidity,
      tasteBody: form.tasteBody,
      tasteFruitiness: form.tasteFruitiness,
      tasteHoppiness: form.tasteHoppiness,
      tasteMaltiness: form.tasteMaltiness,
      tasteTannin: form.tasteTannin,
      tasteCarbonation: form.tasteCarbonation,
      flavorNotes: form.flavorNotes,
      servingTemperature: form.servingTemperature.trim(),
      recommendedGlass: form.recommendedGlass,
      foodPairings: form.foodPairings,
      occasion: form.occasion,
      alcoholFree: form.alcoholFree,
      lowAlcohol: form.lowAlcohol,
      glutenFree: form.glutenFree,
      glutenReduced: form.glutenReduced,
      bio: form.bio,
      vegan: form.vegan,
      sugarFree: form.sugarFree,
      lactoseFree: form.lactoseFree,
      certifications: form.certifications,
      shortDescription: form.shortDescription.trim(),
      fullDescription: form.fullDescription.trim(),
      productHistory: form.productHistory.trim(),
      officialUrl: form.officialUrl.trim(),
      ibu: form.ibu === "" ? null : parseFloat(form.ibu),
      colorEbc: form.colorEbc === "" ? null : parseFloat(form.colorEbc),
      colorSrm: form.colorSrm === "" ? null : parseFloat(form.colorSrm),
      originalGravity: form.originalGravity === "" ? null : parseFloat(form.originalGravity),
      finalGravity: form.finalGravity === "" ? null : parseFloat(form.finalGravity),
      platoDegree: form.platoDegree === "" ? null : parseFloat(form.platoDegree),
      apparentAttenuation: form.apparentAttenuation === "" ? null : parseFloat(form.apparentAttenuation),
      finalPh: form.finalPh === "" ? null : parseFloat(form.finalPh),
      carbonationTechnical: form.carbonationTechnical.trim(),
      relativeBitterness: form.relativeBitterness === "" ? null : parseFloat(form.relativeBitterness),
      realExtract: form.realExtract === "" ? null : parseFloat(form.realExtract),
      mashingProcess: form.mashingProcess,
      hoppingDetails: form.hoppingDetails.trim(),
      dryHopDetail: form.dryHopDetail.trim(),
      yeastStrain: form.yeastStrain.trim(),
      primaryFermentation: form.primaryFermentation.trim(),
      secondaryFermentation: form.secondaryFermentation.trim(),
      conditioningProcess: form.conditioningProcess.trim(),
      maturationDetails: form.maturationDetails.trim(),
      barrelDetails: form.barrelDetails.trim(),
      blendDetails: form.blendDetails.trim(),
      ciderInitialGravity: form.ciderInitialGravity === "" ? null : parseFloat(form.ciderInitialGravity),
      ciderFinalGravity: form.ciderFinalGravity === "" ? null : parseFloat(form.ciderFinalGravity),
      residualSugar: form.residualSugar === "" ? null : parseFloat(form.residualSugar),
      totalAcidity: form.totalAcidity === "" ? null : parseFloat(form.totalAcidity),
      ciderPh: form.ciderPh === "" ? null : parseFloat(form.ciderPh),
      tanninLevel: form.tanninLevel === "" ? null : parseFloat(form.tanninLevel),
      ciderCarbonationTechnical: form.ciderCarbonationTechnical.trim(),
      detailedVarieties: form.detailedVarieties.trim(),
      appleType: form.appleType,
      pressingMethod: form.pressingMethod.trim(),
      defecationKeeving: form.defecationKeeving.trim(),
      malolacticFermentation: form.malolacticFermentation,
      ciderBlendDetails: form.ciderBlendDetails.trim(),
      ciderAgingDetails: form.ciderAgingDetails.trim(),
      infoSource: form.infoSource.trim(),
      sourceUrl: form.sourceUrl.trim(),
      verificationDate: form.verificationDate || null,
      contributor: form.contributor.trim(),
      verificationStatus: form.verificationStatus,
      mainPhotoUrl,
      galleryPhotos,
    };
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (isNew) {
      const id = `drink-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const created = await createDrink({ id, ...buildPatch() });
      setSaving(false);
      onSaved(created);
    } else {
      const patch = buildPatch();
      await updateDrink(drink.id, patch);
      setSaving(false);
      onSaved({ ...drink, ...patch });
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer définitivement "${drink.name}" ?`)) return;
    await deleteDrink(drink.id);
    onSaved(null);
  };

  const handleUploadPhoto = async (file) => {
    setUploadingPhoto(true);
    const tempId = drink?.id || `pending-${Date.now()}`;
    const url = await uploadDrinkMainPhoto(tempId, file);
    if (url) setMainPhotoUrl(url);
    setUploadingPhoto(false);
  };

  const handleUploadGalleryPhoto = async (file) => {
    setUploadingGallery(true);
    const tempId = drink?.id || `pending-${Date.now()}`;
    const url = await uploadDrinkGalleryPhoto(tempId, file);
    if (url) setGalleryPhotos((prev) => [...prev, url]);
    setUploadingGallery(false);
  };

  const removeGalleryPhoto = (index) => setGalleryPhotos((prev) => prev.filter((_, i) => i !== index));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
      <div style={{ width: "520px", background: "#0D1B2A", height: "100%", overflowY: "auto", padding: "28px", borderLeft: "2px solid #28405C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{isNew ? "Ajouter un produit" : "Vérifier le produit"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8792A6", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <label style={labelStyle}>Type</label>
        <select value={form.type} onChange={(e) => set("type", e.target.value)} style={{ ...fieldStyle, marginBottom: "14px" }}>
          {DRINK_TYPES.map((t) => (
            <option key={t.code} value={t.code}>
              {t.fr}
            </option>
          ))}
        </select>

        {isBeerOrCider && (
          <AdminPhotoField label="Photo principale (800×800)" photoUrl={mainPhotoUrl} onUpload={handleUploadPhoto} onDelete={() => setMainPhotoUrl(null)} uploading={uploadingPhoto} />
        )}

        <label style={labelStyle}>Nom du produit *</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} style={{ ...fieldStyle, marginBottom: "14px" }} />

        {isBeerOrCider ? (
          <>
            <div style={{ display: "flex", gap: "4px", marginBottom: "18px", borderBottom: "2px solid #28405C" }}>
              {[
                { key: "quick", label: "Ajout rapide" },
                { key: "niveau1", label: "Niveau 1" },
                { key: "niveau2", label: "Niveau 2 (expert)" },
                { key: "niveau3", label: "Niveau 3 (expert)" },
                { key: "gallery", label: "Galerie images" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab.key ? "2px solid #39FF66" : "2px solid transparent",
                    marginBottom: "-2px",
                    padding: "8px 10px",
                    color: activeTab === tab.key ? "#39FF66" : "#8792A6",
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "quick" && (
              <div>
                <label style={labelStyle}>Taux d'alcool (%)</label>
                <input type="number" step="0.1" value={form.abv} onChange={(e) => set("abv", e.target.value)} placeholder="Ex. 0.0 pour sans alcool" style={{ ...fieldStyle, marginBottom: "14px" }} />
                <p style={{ fontSize: "12.5px", color: "#8792A6" }}>
                  De quoi créer la fiche en quelques secondes. Le nom et le type suffisent pour enregistrer — vous pourrez enrichir via les onglets Niveau 1, 2 et 3 à tout moment, y compris plus tard.
                </p>
              </div>
            )}

            {activeTab === "niveau1" && (
              <>
            <label style={labelStyle}>Bière / Cidre / Poiré</label>
            <select value={form.beverageSubtype} onChange={(e) => set("beverageSubtype", e.target.value)} style={{ ...fieldStyle, marginBottom: "14px" }}>
              {BEER_CIDER_SUBTYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.fr}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Nom alternatif / ancien nom</label>
            <input value={form.alternateName} onChange={(e) => set("alternateName", e.target.value)} style={{ ...fieldStyle, marginBottom: "14px" }} />

            <div style={separatorStyle} />
            <SectionTitle>Marque & producteur</SectionTitle>
            <label style={labelStyle}>Marque</label>
            <div style={{ marginBottom: "12px" }}>
              <SearchableSelect options={brandOptions} value={form.brandId} onChange={(id) => set("brandId", id)} placeholder="Chercher une marque..." />
            </div>
            <label style={labelStyle}>Producteur(s) — plusieurs possibles en cas de collaboration</label>
            <SearchableMultiSelect options={producerOptions} values={form.producerIds} onChange={(ids) => set("producerIds", ids)} placeholder="Chercher un producteur..." />

            <div style={separatorStyle} />
            <SectionTitle>Origine</SectionTitle>
            <label style={labelStyle}>Pays d'origine</label>
            <select value={form.nationality} onChange={(e) => set("nationality", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.fr}
                </option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Région / Province</label>
                <input value={form.originRegion} onChange={(e) => set("originRegion", e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input value={form.originCity} onChange={(e) => set("originCity", e.target.value)} style={fieldStyle} />
              </div>
            </div>

            <div style={separatorStyle} />
            <SectionTitle>Caractéristiques</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={labelStyle}>Taux d'alcool (%)</label>
                <input type="number" step="0.1" value={form.abv} onChange={(e) => set("abv", e.target.value)} placeholder="Ex. 0.0 pour sans alcool" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Énergie (kcal/100ml)</label>
                <input type="number" value={form.kcalPer100ml} onChange={(e) => set("kcalPer100ml", e.target.value)} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Statut du produit</label>
                <select value={form.productStatus} onChange={(e) => set("productStatus", e.target.value)} style={fieldStyle}>
                  {BEER_CIDER_COMMERCIAL_STATUSES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.fr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Année de lancement</label>
                <input type="number" value={form.launchYear} onChange={(e) => set("launchYear", e.target.value)} placeholder="Ex. 1985" style={fieldStyle} />
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "#8792A6", marginTop: "-2px", marginBottom: "14px" }}>
              Le code-barres se gère depuis le scan dans l'app — pas encore intégré à cette fiche.
            </p>

            <div style={separatorStyle} />
            <button
              onClick={() => setStylesSectionOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginBottom: stylesSectionOpen ? "12px" : 0,
              }}
            >
              <span style={{ ...sectionTitleStyle, marginTop: 0, marginBottom: 0 }}>
                <span style={{ width: "4px", height: "14px", background: "#39FF66", borderRadius: "2px", display: "inline-block" }} />
                Style(s)
                {form.styles.length > 0 && <span style={{ color: "#8792A6", fontWeight: 500 }}> ({form.styles.length} sélectionné{form.styles.length > 1 ? "s" : ""})</span>}
              </span>
              <span style={{ color: "#39FF66", fontSize: "12px" }}>{stylesSectionOpen ? "▼" : "▶"}</span>
            </button>
            {stylesSectionOpen && (
              <>
                <p style={{ fontSize: "11.5px", color: "#8792A6", marginTop: "-6px", marginBottom: "10px" }}>Plusieurs styles peuvent se cumuler (ex. IPA + Hazy + Double IPA).</p>
                <StyleTagAccordion groups={BEER_CIDER_STYLE_GROUPS} selected={form.styles} onToggle={toggleStyle} />
              </>
            )}
              </>
            )}

            {activeTab === "niveau2" && (
              <>
                {isBeer ? (
                  <>
                    <CollapsibleSection title="Composition">
                    <label style={labelStyle}>Malt(s)</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.malts} onChange={(v) => set("malts", v)} placeholder="Ex. Pilsner, Vienna, Caramel..." />
                    </div>
                    <label style={labelStyle}>Houblon(s)</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.hops} onChange={(v) => set("hops", v)} placeholder="Ex. Citra, Mosaic, Saaz..." />
                    </div>
                    <label style={labelStyle}>Levure</label>
                    <input value={form.yeast} onChange={(e) => set("yeast", e.target.value)} placeholder="Souche ou famille si connue" style={{ ...fieldStyle, marginBottom: "12px" }} />
                    <label style={labelStyle}>Céréales</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.cereals} onChange={(v) => set("cereals", v)} placeholder="Orge, blé, avoine, seigle..." />
                    </div>
                    <label style={labelStyle}>Fruits</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.fruits} onChange={(v) => set("fruits", v)} placeholder="Fruits utilisés" />
                    </div>
                    <label style={labelStyle}>Épices / plantes / botanicals</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.spices} onChange={(v) => set("spices", v)} placeholder="Coriandre, gingembre, café..." />
                    </div>
                    <label style={labelStyle}>Autres ingrédients</label>
                    <div style={{ marginBottom: "12px" }}>
                      <FreeTagInput tags={form.otherIngredients} onChange={(v) => set("otherIngredients", v)} placeholder="Lactose, miel, sel..." />
                    </div>
                    <label style={labelStyle}>Allergènes déclarés</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {ALLERGENS.map((a) => {
                        const checked = form.allergens.includes(a.code);
                        return (
                          <button
                            key={a.code}
                            onClick={() => toggleArrayField("allergens", a.code)}
                            style={{ background: checked ? "#39FF66" : "none", border: `2px solid ${checked ? "#39FF66" : "#28405C"}`, borderRadius: "999px", padding: "5px 11px", fontSize: "11.5px", fontWeight: 600, color: checked ? "#0D1B2A" : "#F2F2E8", cursor: "pointer" }}
                          >
                            {a.fr}
                          </button>
                        );
                      })}
                    </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Fabrication">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Type de fermentation</label>
                        <select value={form.fermentationType} onChange={(e) => set("fermentationType", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {FERMENTATION_TYPES.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Refermentation en bouteille</label>
                        <select value={form.bottleRefermented} onChange={(e) => set("bottleRefermented", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Filtrée</label>
                        <select value={form.filtered} onChange={(e) => set("filtered", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Pasteurisée</label>
                        <select value={form.pasteurized} onChange={(e) => set("pasteurized", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Dry hopping</label>
                        <select value={form.dryHopping} onChange={(e) => set("dryHopping", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          <option value="oui">Oui</option>
                          <option value="non">Non</option>
                          <option value="ddh">DDH</option>
                          <option value="tdh">TDH</option>
                          <option value="inconnu">Inconnu</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                      <div>
                        <label style={labelStyle}>Vieillissement</label>
                        <select value={form.beerAging} onChange={(e) => set("beerAging", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {BEER_AGING_OPTIONS.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      {form.beerAging === "Bois" && (
                        <div>
                          <label style={labelStyle}>Type de fût</label>
                          <select value={form.barrelType} onChange={(e) => set("barrelType", e.target.value)} style={fieldStyle}>
                            <option value="">—</option>
                            {BARREL_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    </CollapsibleSection>
                  </>
                ) : (
                  <>
                    <CollapsibleSection title="Composition & fabrication (cidre / poiré)">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Fruit principal</label>
                        <select value={form.mainFruit} onChange={(e) => set("mainFruit", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {MAIN_FRUITS.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Variété(s)</label>
                        <input value={form.fruitVarieties} onChange={(e) => set("fruitVarieties", e.target.value)} style={fieldStyle} />
                      </div>
                    </div>
                    <label style={labelStyle}>Origine des fruits</label>
                    <input value={form.fruitOrigin} onChange={(e) => set("fruitOrigin", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Pur jus</label>
                        <select value={form.pureJuice} onChange={(e) => set("pureJuice", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Concentré utilisé</label>
                        <select value={form.concentrateUsed} onChange={(e) => set("concentrateUsed", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Fermentation</label>
                        <select value={form.ciderFermentation} onChange={(e) => set("ciderFermentation", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {CIDER_FERMENTATION_TYPES.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Prise de mousse</label>
                        <select value={form.carbonationMethod} onChange={(e) => set("carbonationMethod", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {CARBONATION_METHODS.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Filtré</label>
                        <select value={form.ciderFiltered} onChange={(e) => set("ciderFiltered", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Pasteurisé</label>
                        <select value={form.ciderPasteurized} onChange={(e) => set("ciderPasteurized", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {YES_NO_UNKNOWN.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                      <div>
                        <label style={labelStyle}>Vieillissement</label>
                        <select value={form.ciderAging} onChange={(e) => set("ciderAging", e.target.value)} style={fieldStyle}>
                          <option value="">—</option>
                          {CIDER_AGING_OPTIONS.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                      </div>
                      {form.ciderAging === "Bois" && (
                        <div>
                          <label style={labelStyle}>Type de fût</label>
                          <select value={form.ciderBarrelType} onChange={(e) => set("ciderBarrelType", e.target.value)} style={fieldStyle}>
                            <option value="">—</option>
                            {CIDER_BARREL_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    </CollapsibleSection>
                  </>
                )}

                <CollapsibleSection title="Profil gustatif">
                <TasteScale label="Amertume" value={form.tasteBitterness} onChange={(v) => set("tasteBitterness", v)} lowLabel="Très faible" highLabel="Très forte" />
                <TasteScale label="Douceur" value={form.tasteSweetness} onChange={(v) => set("tasteSweetness", v)} lowLabel="Très sèche" highLabel="Très douce" />
                <TasteScale label="Acidité" value={form.tasteAcidity} onChange={(v) => set("tasteAcidity", v)} lowLabel="Très faible" highLabel="Très forte" />
                <TasteScale label="Corps" value={form.tasteBody} onChange={(v) => set("tasteBody", v)} lowLabel="Très léger" highLabel="Très puissant" />
                <TasteScale label="Fruité" value={form.tasteFruitiness} onChange={(v) => set("tasteFruitiness", v)} lowLabel="Discret" highLabel="Très fruité" />
                {isBeer && <TasteScale label="Houblonné" value={form.tasteHoppiness} onChange={(v) => set("tasteHoppiness", v)} lowLabel="Discret" highLabel="Très houblonné" />}
                {isBeer && <TasteScale label="Malté" value={form.tasteMaltiness} onChange={(v) => set("tasteMaltiness", v)} lowLabel="Discret" highLabel="Très malté" />}
                {!isBeer && <TasteScale label="Tanin" value={form.tasteTannin} onChange={(v) => set("tasteTannin", v)} lowLabel="Faible" highLabel="Très tannique" />}
                <TasteScale label="Effervescence" value={form.tasteCarbonation} onChange={(v) => set("tasteCarbonation", v)} lowLabel="Plate" highLabel="Très effervescente" />
                </CollapsibleSection>

                <CollapsibleSection title="Arômes & saveurs">
                <StyleTagAccordion groups={FLAVOR_NOTE_GROUPS} selected={form.flavorNotes} onToggle={(t) => toggleArrayField("flavorNotes", t)} />
                </CollapsibleSection>

                <CollapsibleSection title="Service & consommation">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Température de service</label>
                    <input value={form.servingTemperature} onChange={(e) => set("servingTemperature", e.target.value)} placeholder="Ex. 4-6°C" style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Verre recommandé</label>
                    <select value={form.recommendedGlass} onChange={(e) => set("recommendedGlass", e.target.value)} style={fieldStyle}>
                      {RECOMMENDED_GLASSES.map((g) => (
                        <option key={g.code} value={g.code}>
                      {g.fr}
                    </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label style={labelStyle}>Accords alimentaires</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {FOOD_PAIRINGS.map((f) => {
                    const checked = form.foodPairings.includes(f.code);
                    return (
                      <button
                        key={f.code}
                        onClick={() => toggleArrayField("foodPairings", f.code)}
                        style={{ background: checked ? "#39FF66" : "none", border: `2px solid ${checked ? "#39FF66" : "#28405C"}`, borderRadius: "999px", padding: "5px 11px", fontSize: "11.5px", fontWeight: 600, color: checked ? "#0D1B2A" : "#F2F2E8", cursor: "pointer" }}
                      >
                        {f.fr}
                      </button>
                    );
                  })}
                </div>
                <label style={labelStyle}>Moment / occasion</label>
                <select value={form.occasion} onChange={(e) => set("occasion", e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  {OCCASIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.fr}
                    </option>
                  ))}
                </select>
                </CollapsibleSection>

                <CollapsibleSection title="Caractéristiques & labels">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.alcoholFree} onChange={(e) => set("alcoholFree", e.target.checked)} />
                    Sans alcool
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.lowAlcohol} onChange={(e) => set("lowAlcohol", e.target.checked)} />
                    Faible en alcool
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.glutenFree} onChange={(e) => set("glutenFree", e.target.checked)} />
                    Sans gluten
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.glutenReduced} onChange={(e) => set("glutenReduced", e.target.checked)} />
                    Gluten réduit
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.bio} onChange={(e) => set("bio", e.target.checked)} />
                    Bio
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.sugarFree} onChange={(e) => set("sugarFree", e.target.checked)} />
                    Sans sucres ajoutés
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.lactoseFree} onChange={(e) => set("lactoseFree", e.target.checked)} />
                    Sans lactose
                  </label>
                </div>
                <label style={labelStyle}>Vegan</label>
                <select value={form.vegan} onChange={(e) => set("vegan", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }}>
                  {YES_NO_UNKNOWN.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                  ))}
                </select>
                <label style={labelStyle}>Labels / certifications</label>
                <div>
                  <FreeTagInput tags={form.certifications} onChange={(v) => set("certifications", v)} placeholder="Ex. AB, Ecocert, Demeter..." />
                </div>
                </CollapsibleSection>

                <CollapsibleSection title="Présentation">
                <label style={labelStyle}>Description courte</label>
                <textarea value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} rows={2} style={{ ...fieldStyle, marginBottom: "12px", resize: "vertical" }} />
                <label style={labelStyle}>Description complète</label>
                <textarea value={form.fullDescription} onChange={(e) => set("fullDescription", e.target.value)} rows={4} style={{ ...fieldStyle, marginBottom: "12px", resize: "vertical" }} />
                <label style={labelStyle}>Histoire du produit</label>
                <textarea value={form.productHistory} onChange={(e) => set("productHistory", e.target.value)} rows={3} style={{ ...fieldStyle, marginBottom: "12px", resize: "vertical" }} />
                <label style={labelStyle}>Lien officiel</label>
                <input value={form.officialUrl} onChange={(e) => set("officialUrl", e.target.value)} style={fieldStyle} />
                </CollapsibleSection>

                <CollapsibleSection title="Conditionnements & variantes">
                <p style={{ fontSize: "11.5px", color: "#8792A6", marginTop: "-6px", marginBottom: "10px" }}>
                  Une même bière peut exister en plusieurs bouteilles, canettes ou fûts — chacun avec son propre code-barres si connu.
                </p>
                <VariantManager drinkId={drink?.id || null} />
                </CollapsibleSection>
              </>
            )}

            {activeTab === "niveau3" && (
              <>
                <div style={{ background: "#2A1F0D", border: "2px solid #FF9500", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px", color: "#F2F2E8" }}>
                  🔒 Réservé aux producteurs "Business" (accord B2B) et aux administrateurs. L'accès depuis cette plateforme n'est pas encore restreint techniquement — un vrai verrouillage par compte producteur reste à construire.
                </div>
                {isBeer ? (
                  <>
                        <CollapsibleSection title="Données techniques (bière)">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div>
                            <label style={labelStyle}>IBU</label>
                            <input type="number" step="0.1" value={form.ibu} onChange={(e) => set("ibu", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Couleur EBC</label>
                            <input type="number" step="0.1" value={form.colorEbc} onChange={(e) => set("colorEbc", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Couleur SRM</label>
                            <input type="number" step="0.1" value={form.colorSrm} onChange={(e) => set("colorSrm", e.target.value)} style={fieldStyle} />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div>
                            <label style={labelStyle}>OG (densité initiale)</label>
                            <input type="number" step="0.001" value={form.originalGravity} onChange={(e) => set("originalGravity", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>FG (densité finale)</label>
                            <input type="number" step="0.001" value={form.finalGravity} onChange={(e) => set("finalGravity", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Degré Plato</label>
                            <input type="number" step="0.1" value={form.platoDegree} onChange={(e) => set("platoDegree", e.target.value)} style={fieldStyle} />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div>
                            <label style={labelStyle}>Atténuation apparente (%)</label>
                            <input type="number" step="0.1" value={form.apparentAttenuation} onChange={(e) => set("apparentAttenuation", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>pH final</label>
                            <input type="number" step="0.01" value={form.finalPh} onChange={(e) => set("finalPh", e.target.value)} style={fieldStyle} />
                          </div>
                        </div>
                        <label style={labelStyle}>Carbonatation (volumes CO2 ou g/L)</label>
                        <input value={form.carbonationTechnical} onChange={(e) => set("carbonationTechnical", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <label style={labelStyle}>Amertume relative</label>
                            <input type="number" step="0.01" value={form.relativeBitterness} onChange={(e) => set("relativeBitterness", e.target.value)} style={fieldStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Extrait réel / apparent</label>
                            <input type="number" step="0.1" value={form.realExtract} onChange={(e) => set("realExtract", e.target.value)} style={fieldStyle} />
                          </div>
                        </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Procédé brassicole avancé">
                        <label style={labelStyle}>Empâtage</label>
                        <select value={form.mashingProcess} onChange={(e) => set("mashingProcess", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }}>
                          <option value="">—</option>
                          {MASHING_PROCESSES.map((t) => (
                            <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                          ))}
                        </select>
                        <label style={labelStyle}>Houblonnage</label>
                        <input value={form.hoppingDetails} onChange={(e) => set("hoppingDetails", e.target.value)} placeholder="Ajouts amérisants, whirlpool, dry hop..." style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>DDH / TDH (détail)</label>
                        <input value={form.dryHopDetail} onChange={(e) => set("dryHopDetail", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Levure / souche précise</label>
                        <input value={form.yeastStrain} onChange={(e) => set("yeastStrain", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Fermentation primaire</label>
                        <input value={form.primaryFermentation} onChange={(e) => set("primaryFermentation", e.target.value)} placeholder="Température, durée, cuve" style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Fermentation secondaire</label>
                        <input value={form.secondaryFermentation} onChange={(e) => set("secondaryFermentation", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Conditionnement</label>
                        <input value={form.conditioningProcess} onChange={(e) => set("conditioningProcess", e.target.value)} placeholder="Refermentation, carbonatation forcée, krausening..." style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Maturation</label>
                        <input value={form.maturationDetails} onChange={(e) => set("maturationDetails", e.target.value)} placeholder="Durée, température, cuve, lagering" style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Barrique / bois</label>
                        <input value={form.barrelDetails} onChange={(e) => set("barrelDetails", e.target.value)} placeholder="Essence, ancien contenu, durée" style={{ ...fieldStyle, marginBottom: "12px" }} />
                        <label style={labelStyle}>Assemblage / blend</label>
                        <input value={form.blendDetails} onChange={(e) => set("blendDetails", e.target.value)} placeholder="Lots ou millésimes assemblés" style={fieldStyle} />
                        </CollapsibleSection>
                      </>
                    ) : (
                      <CollapsibleSection title="Données techniques (cidre / poiré)">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={labelStyle}>Densité initiale</label>
                          <input type="number" step="0.001" value={form.ciderInitialGravity} onChange={(e) => set("ciderInitialGravity", e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Densité finale</label>
                          <input type="number" step="0.001" value={form.ciderFinalGravity} onChange={(e) => set("ciderFinalGravity", e.target.value)} style={fieldStyle} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={labelStyle}>Sucre résiduel (g/L)</label>
                          <input type="number" step="0.1" value={form.residualSugar} onChange={(e) => set("residualSugar", e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Acidité totale (g/L)</label>
                          <input type="number" step="0.1" value={form.totalAcidity} onChange={(e) => set("totalAcidity", e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>pH</label>
                          <input type="number" step="0.01" value={form.ciderPh} onChange={(e) => set("ciderPh", e.target.value)} style={fieldStyle} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={labelStyle}>Tanins</label>
                          <input type="number" step="0.1" value={form.tanninLevel} onChange={(e) => set("tanninLevel", e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Carbonatation (CO2 ou g/L)</label>
                          <input value={form.ciderCarbonationTechnical} onChange={(e) => set("ciderCarbonationTechnical", e.target.value)} style={fieldStyle} />
                        </div>
                      </div>
                      <label style={labelStyle}>Variétés détaillées</label>
                      <input value={form.detailedVarieties} onChange={(e) => set("detailedVarieties", e.target.value)} placeholder="Variétés et proportions si connues" style={{ ...fieldStyle, marginBottom: "12px" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={labelStyle}>Type de pommes</label>
                          <select value={form.appleType} onChange={(e) => set("appleType", e.target.value)} style={fieldStyle}>
                            <option value="">—</option>
                            {APPLE_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Méthode de pressage</label>
                          <input value={form.pressingMethod} onChange={(e) => set("pressingMethod", e.target.value)} style={fieldStyle} />
                        </div>
                      </div>
                      <label style={labelStyle}>Défécation / Keeving</label>
                      <input value={form.defecationKeeving} onChange={(e) => set("defecationKeeving", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                      <label style={labelStyle}>Fermentation malolactique</label>
                      <select value={form.malolacticFermentation} onChange={(e) => set("malolacticFermentation", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }}>
                        <option value="">—</option>
                        {YES_NO_UNKNOWN.map((t) => (
                          <option key={t.code} value={t.code}>
                      {t.fr}
                    </option>
                        ))}
                      </select>
                      <label style={labelStyle}>Assemblage</label>
                      <input value={form.ciderBlendDetails} onChange={(e) => set("ciderBlendDetails", e.target.value)} placeholder="Variétés, cuvées, millésimes assemblés" style={{ ...fieldStyle, marginBottom: "12px" }} />
                      <label style={labelStyle}>Vieillissement (détails)</label>
                      <input value={form.ciderAgingDetails} onChange={(e) => set("ciderAgingDetails", e.target.value)} placeholder="Durée, récipient, type de bois" style={fieldStyle} />
                      </CollapsibleSection>
                    )}

                    <CollapsibleSection title="Traçabilité & sources">
                    <label style={labelStyle}>Source de l'information</label>
                    <input value={form.infoSource} onChange={(e) => set("infoSource", e.target.value)} placeholder="Site officiel, fiche technique, étiquette..." style={{ ...fieldStyle, marginBottom: "12px" }} />
                    <label style={labelStyle}>URL source</label>
                    <input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} style={{ ...fieldStyle, marginBottom: "12px" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Date de vérification</label>
                        <input type="date" value={form.verificationDate} onChange={(e) => set("verificationDate", e.target.value)} style={fieldStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Contributeur</label>
                        <input value={form.contributor} onChange={(e) => set("contributor", e.target.value)} style={fieldStyle} />
                      </div>
                    </div>
                    <label style={labelStyle}>Statut de vérification</label>
                    <select value={form.verificationStatus} onChange={(e) => set("verificationStatus", e.target.value)} style={fieldStyle}>
                      {VERIFICATION_STATUSES.map((s) => (
                        <option key={s.code} value={s.code}>
                      {s.fr}
                    </option>
                      ))}
                    </select>
                    </CollapsibleSection>
                  </>
                )}

            {activeTab === "gallery" && (
              <div>
                <p style={{ fontSize: "12.5px", color: "#8792A6", marginBottom: "12px" }}>Photos additionnelles du produit (packaging, étiquette, verre servi...).</p>
                <GalleryManager photos={galleryPhotos} onUpload={handleUploadGalleryPhoto} onRemove={removeGalleryPhoto} uploading={uploadingGallery} />
              </div>
            )}
          </>
        ) : (
          <p style={{ background: "#16273D", borderRadius: "8px", padding: "12px", fontSize: "12.5px", color: "#8792A6", marginBottom: "14px" }}>
            La fiche détaillée pour cette catégorie n'est pas encore construite — seuls le nom, le degré et l'énergie sont disponibles pour l'instant.
          </p>
        )}

        <div style={separatorStyle} />
        <label style={labelStyle}>Statut de vérification</label>
        <div style={{ marginBottom: "20px" }}>
          <StatusSelector value={status} onChange={setStatus} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            style={{ background: "#39FF66", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, color: "#0D1B2A", cursor: "pointer", opacity: form.name.trim() ? 1 : 0.5 }}
          >
            ✓ {isNew ? "Créer le produit" : "Enregistrer"}
          </button>
          {!isNew && (
            <button onClick={remove} style={{ background: "none", border: "none", color: "#FF3B4E", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}>
              Supprimer ce produit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
