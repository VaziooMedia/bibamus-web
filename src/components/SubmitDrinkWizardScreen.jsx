// ============================================================
// Proposer une boisson — vrai parcours en 5 pages, une vraie info à la fois, plutôt qu'un
// seul long formulaire. Le produit est créé dès la page 1 (status "draft") pour pouvoir lui
// associer des vraies variantes de conditionnement dès la page 3 ; il n'atteint le vrai statut
// "to_process" (visible/traité normalement) qu'à la toute fin, page 5. Abandonner en cours de
// route (bouton retour, ou navigation ailleurs dans l'app) supprime le brouillon.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS, DRINK_TYPES, COUNTRIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PrimaryButton, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { createDrinkQuiet, updateDrink, deleteDrink, createDrinkVariant } from "../data/sharedDirectories.js";

const BEER_CIDER_SUBTYPES = [
  { code: "biere", fr: "Bière" },
  { code: "cidre", fr: "Cidre" },
  { code: "poire", fr: "Poiré" },
];
const WINE_SUBTYPES = [
  { code: "vin", fr: "Vin" },
  { code: "vin_effervescent", fr: "Vin effervescent" },
];
const CONTAINER_TYPES = [
  { code: "bouteille_verre", fr: "Bouteille verre" },
  { code: "bouteille_pet", fr: "Bouteille PET" },
  { code: "canette", fr: "Canette" },
  { code: "fut", fr: "Fût" },
  { code: "bag_in_box", fr: "Bag-in-Box" },
  { code: "brique", fr: "Brique" },
];

function StepShell({ step, totalSteps, title, onBack, canSkipBack, children, footer }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < step ? COLORS.amber : COLORS.paperAlt }} />
        ))}
      </div>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 18px 0" }}>{title}</h1>
      <div style={{ flex: 1 }}>{children}</div>
      {footer}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" };
const labelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" };

export function SubmitDrinkWizardScreen({ breweriesDirectory, brandsDirectory, onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [drinkId, setDrinkId] = useState(null);
  const validatedRef = useRef(false);
  const drinkIdRef = useRef(null);
  useEffect(() => {
    drinkIdRef.current = drinkId;
  }, [drinkId]);

  // Filet de sécurité : si l'utilisateur quitte cet écran par un autre chemin que la vraie
  // validation finale (navigation globale de l'app), le brouillon créé est supprimé.
  useEffect(() => {
    return () => {
      if (drinkIdRef.current && !validatedRef.current) {
        deleteDrink(drinkIdRef.current);
      }
    };
  }, []);

  // Page 1 — Nom / Catégorie / Sous-catégorie
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [beverageSubtype, setBeverageSubtype] = useState("");
  const subtypeOptions = type === "Bières & Cidres" ? BEER_CIDER_SUBTYPES : type === "Vins & Bulles" ? WINE_SUBTYPES : null;
  const step1Valid = name.trim().length > 0 && !!type && (!subtypeOptions || !!beverageSubtype);

  // Page 2 — Degré d'alcool
  const [abv, setAbv] = useState("");
  const step2Valid = abv.trim().length > 0 && !isNaN(parseFloat(abv));

  // Page 3 — Code-barre + contenant + volume (facultatif, plusieurs possibles)
  const [variants, setVariants] = useState([{ container: CONTAINER_TYPES[0].code, volumeCl: "", barcode: "" }]);
  const updateVariant = (i, patch) => setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const addVariantRow = () => setVariants((prev) => [...prev, { container: CONTAINER_TYPES[0].code, volumeCl: "", barcode: "" }]);
  const removeVariantRow = (i) => setVariants((prev) => prev.filter((_, idx) => idx !== i));

  // Page 4 — Pays / Région / Ville
  const [nationality, setNationality] = useState("");
  const [originRegion, setOriginRegion] = useState("");
  const [originCity, setOriginCity] = useState("");

  // Page 5 — Marque + Producteur
  const [brandQuery, setBrandQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [producerQuery, setProducerQuery] = useState("");
  const [selectedProducers, setSelectedProducers] = useState([]);
  const [saving, setSaving] = useState(false);

  const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const brandResults = brandQuery.trim().length >= 2 ? brandsDirectory.filter((b) => normalize(b.name).includes(normalize(brandQuery))).slice(0, 8) : [];
  const producerResults =
    producerQuery.trim().length >= 2
      ? breweriesDirectory.filter((p) => normalize(p.name).includes(normalize(producerQuery)) && !selectedProducers.some((sp) => sp.id === p.id)).slice(0, 8)
      : [];

  const handleAbandon = async () => {
    if (drinkId) {
      if (!window.confirm("Abandonner la création de ce produit ? Rien ne sera enregistré.")) return;
      await deleteDrink(drinkId);
    }
    onCancel();
  };

  const goToStep1 = async () => {
    const newId = `drink-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const ok = await createDrinkQuiet({
      id: newId,
      name: name.trim(),
      type,
      beverageSubtype: subtypeOptions ? beverageSubtype : null,
      status: "to_process",
    });
    if (!ok) {
      alert("La création du produit a échoué — merci de réessayer.");
      return;
    }
    setDrinkId(newId);
    setStep(2);
  };

  const goToStep2 = async () => {
    await updateDrink(drinkId, { abv: parseFloat(abv) });
    setStep(3);
  };

  const goToStep3 = async () => {
    const rows = variants.filter((v) => v.volumeCl.trim().length > 0);
    await Promise.all(
      rows.map((v) =>
        createDrinkVariant({
          drinkId,
          container: v.container,
          volumeMl: parseFloat(v.volumeCl) * 10,
          barcode: v.barcode.trim() || null,
          marketCountry: null,
        })
      )
    );
    setStep(4);
  };

  const goToStep4 = async () => {
    await updateDrink(drinkId, { nationality: nationality || null, originRegion: originRegion.trim() || null, originCity: originCity.trim() || null });
    setStep(5);
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    await updateDrink(drinkId, {
      brandId: selectedBrand?.id || null,
      producerIds: selectedProducers.map((p) => p.id),
    });
    validatedRef.current = true;
    setSaving(false);
    onDone(drinkId);
  };

  if (step === 1) {
    return (
      <StepShell
        step={1}
        totalSteps={5}
        title="Nom, catégorie & sous-catégorie"
        onBack={onCancel}
        footer={
          <PrimaryButton onClick={goToStep1} disabled={!step1Valid} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <label style={labelStyle}>Nom du produit</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du produit" style={{ ...inputStyle, marginBottom: "20px" }} autoFocus />

        <label style={labelStyle}>Catégorie</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setBeverageSubtype("");
          }}
          style={{ ...inputStyle, marginBottom: "20px" }}
        >
          <option value="">Choisir une catégorie</option>
          {DRINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {subtypeOptions && (
          <>
            <label style={labelStyle}>Sous-catégorie</label>
            <select value={beverageSubtype} onChange={(e) => setBeverageSubtype(e.target.value)} style={inputStyle}>
              <option value="">Choisir une sous-catégorie</option>
              {subtypeOptions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.fr}
                </option>
              ))}
            </select>
          </>
        )}
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        step={2}
        totalSteps={5}
        title="Degré d'alcool"
        onBack={handleAbandon}
        footer={
          <PrimaryButton onClick={goToStep2} disabled={!step2Valid} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <label style={labelStyle}>Degré d'alcool (% ABV)</label>
        <input type="number" step="0.1" min="0" max="100" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="Ex : 5" style={inputStyle} autoFocus />
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell
        step={3}
        totalSteps={5}
        title="Code-barre & conditionnement"
        onBack={handleAbandon}
        footer={
          <PrimaryButton onClick={goToStep3} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif — un produit peut avoir plusieurs conditionnements (bouteille, canette...).</p>
        {variants.map((v, i) => (
          <div key={i} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <select value={v.container} onChange={(e) => updateVariant(i, { container: e.target.value })} style={{ ...inputStyle, flex: 1.4, padding: "10px 8px" }}>
                {CONTAINER_TYPES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.fr}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.5"
                min="0"
                value={v.volumeCl}
                onChange={(e) => updateVariant(i, { volumeCl: e.target.value })}
                placeholder="Volume (cl)"
                style={{ ...inputStyle, flex: 1, padding: "10px 8px", textAlign: "center" }}
              />
              {variants.length > 1 && (
                <button onClick={() => removeVariantRow(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>
                  <NavIcon name="x" size={16} color={COLORS.inkSoft} />
                </button>
              )}
            </div>
            <input type="text" value={v.barcode} onChange={(e) => updateVariant(i, { barcode: e.target.value })} placeholder="Code-barre (facultatif)" style={{ ...inputStyle, padding: "10px 8px" }} />
          </div>
        ))}
        <button onClick={addVariantRow} style={{ background: "none", border: `2px dashed ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px", width: "100%", color: COLORS.amber, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + Ajouter un conditionnement
        </button>
      </StepShell>
    );
  }

  if (step === 4) {
    return (
      <StepShell
        step={4}
        totalSteps={5}
        title="Origine"
        onBack={handleAbandon}
        footer={
          <PrimaryButton onClick={goToStep4} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif.</p>
        <label style={labelStyle}>Pays d'origine</label>
        <select value={nationality} onChange={(e) => setNationality(e.target.value)} style={{ ...inputStyle, marginBottom: "16px" }}>
          <option value="">Non renseigné</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={labelStyle}>Région</label>
        <input type="text" value={originRegion} onChange={(e) => setOriginRegion(e.target.value)} placeholder="Ex : Wallonie" style={{ ...inputStyle, marginBottom: "16px" }} />
        <label style={labelStyle}>Ville</label>
        <input type="text" value={originCity} onChange={(e) => setOriginCity(e.target.value)} placeholder="Ex : Liège" style={inputStyle} />
      </StepShell>
    );
  }

  return (
    <StepShell
      step={5}
      totalSteps={5}
      title="Marque & producteur"
      onBack={handleAbandon}
      footer={
        <PrimaryButton onClick={handleFinalSubmit} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Enregistrement..." : "Valider"}
        </PrimaryButton>
      }
    >
      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif.</p>

      <label style={labelStyle}>Marque</label>
      {selectedBrand ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 14px", marginBottom: "20px" }}>
          <EntityAvatar photoUrl={selectedBrand.logoUrl} size={28} />
          <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedBrand.name}</span>
          <button onClick={() => setSelectedBrand(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <NavIcon name="x" size={15} color={COLORS.inkSoft} />
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: "20px" }}>
          <input type="text" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Rechercher une marque..." style={inputStyle} />
          {brandResults.length > 0 && (
            <div style={{ marginTop: "8px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
              {brandResults.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBrand(b);
                    setBrandQuery("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: i === brandResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "10px 4px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                  }}
                >
                  <EntityAvatar photoUrl={b.logoUrl} size={26} />
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label style={labelStyle}>Producteur(s)</label>
      {selectedProducers.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 14px", marginBottom: "8px" }}>
          <EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={28} />
          <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{p.name}</span>
          <button onClick={() => setSelectedProducers((prev) => prev.filter((sp) => sp.id !== p.id))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <NavIcon name="x" size={15} color={COLORS.inkSoft} />
          </button>
        </div>
      ))}
      <input type="text" value={producerQuery} onChange={(e) => setProducerQuery(e.target.value)} placeholder="Rechercher un producteur..." style={inputStyle} />
      {producerResults.length > 0 && (
        <div style={{ marginTop: "8px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
          {producerResults.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProducers((prev) => [...prev, p]);
                setProducerQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                background: "none",
                border: "none",
                borderBottom: i === producerResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                padding: "10px 4px",
                textAlign: "left",
                cursor: "pointer",
                color: COLORS.ink,
              }}
            >
              <EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={26} />
              <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </StepShell>
  );
}
