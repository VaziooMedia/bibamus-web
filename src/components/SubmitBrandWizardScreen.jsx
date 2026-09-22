// ============================================================
// Ajouter une marque — même vrai principe et même vraie structure que "Ajouter un lieu" /
// "Ajouter un producteur" : un vrai parcours en 6 pages, une vraie info à la fois. Rien n'est
// écrit en base tant que l'utilisateur n'a pas validé la toute dernière page ET confirmé le
// vrai popup qui suit — tout reste en mémoire locale jusque-là.
// ============================================================
import React, { useState } from "react";
import { COLORS, COUNTRIES, BRAND_CLASSIFICATIONS, BRAND_TYPES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { createBrand } from "../data/sharedDirectories.js";

function StepShell({ step, totalSteps, title, onBack, onPrevious, children, footer }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < step ? COLORS.amber : COLORS.paperAlt }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{title}</h1>
      </div>
      <div>{children}</div>
      {onPrevious && (
        <button
          onClick={onPrevious}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "24px 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
          Précédent
        </button>
      )}
      <div style={{ marginTop: "24px" }}>{footer}</div>
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" };
const requiredStyle = (filled) => ({ ...inputStyle, border: `2px solid ${filled ? COLORS.amber : COLORS.pinkFluo}` });
const labelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" };

function TagPicker({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((t) => {
        const checked = selected.includes(t.code);
        return (
          <button
            key={t.code}
            onClick={() => onToggle(t.code)}
            style={{
              background: checked ? COLORS.amber : "none",
              border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              color: checked ? COLORS.paper : COLORS.ink,
              cursor: "pointer",
            }}
          >
            {t.fr}
          </button>
        );
      })}
    </div>
  );
}

export function SubmitBrandWizardScreen({ brandsDirectory, breweriesDirectory, onDone, onCancel }) {
  const [step, setStep] = useState(1);

  // Page 1 — Nom
  const [name, setName] = useState("");
  const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const nameMatches = name.trim().length >= 2 ? brandsDirectory.filter((b) => normalize(b.name).includes(normalize(name.trim()))).slice(0, 5) : [];

  // Page 2 — Pays d'origine
  const [originCountry, setOriginCountry] = useState("");

  // Page 3 — Région + Ville d'origine
  const [originRegion, setOriginRegion] = useState("");
  const [originCity, setOriginCity] = useState("");

  // Page 4 — Classification
  const [classifications, setClassifications] = useState([]);
  const toggleClassification = (code) => setClassifications((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  // Page 5 — Type de marque
  const [brandTypes, setBrandTypes] = useState([]);
  const toggleBrandType = (code) => setBrandTypes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  // Page 6 — Producteur actuel (facultatif, vrai lien relationnel unique)
  const [producerQuery, setProducerQuery] = useState("");
  const [selectedProducer, setSelectedProducer] = useState(null);
  const producerResults = producerQuery.trim().length >= 2 ? breweriesDirectory.filter((p) => normalize(p.name).includes(normalize(producerQuery.trim()))).slice(0, 8) : [];

  // Vraie confirmation finale — rien n'est créé avant que l'utilisateur clique "OK" ici.
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConfirmCreate = async () => {
    setSaving(true);
    const newId = `brand-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const created = await createBrand({
      id: newId,
      name: name.trim(),
      originCountry,
      originRegion: originRegion.trim() || null,
      originCity: originCity.trim() || null,
      classifications,
      brandTypes,
      producerId: selectedProducer?.id || null,
      status: "to_process",
    });
    if (!created) {
      setSaving(false);
      alert("La création de la marque a échoué — merci de réessayer.");
      return;
    }
    setSaving(false);
    setShowConfirmPopup(false);
    onDone(newId);
  };

  if (step === 1) {
    return (
      <StepShell
        step={1}
        totalSteps={6}
        title="Dénomination"
        onBack={onCancel}
        footer={
          <PrimaryButton onClick={() => setStep(2)} disabled={!name.trim()} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "13px", color: COLORS.pinkFluo, fontWeight: 600, margin: "0 0 20px 0" }}>Vérifie bien les majuscules et l'orthographe</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la marque" style={requiredStyle(name.trim().length > 0)} autoFocus />
        {nameMatches.length > 0 && (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.pinkFluo}`, borderRadius: "12px", padding: "10px 12px", marginTop: "10px" }}>
            <p style={{ fontSize: "11.5px", color: COLORS.pinkFluo, fontWeight: 700, margin: "0 0 6px 0" }}>Marque(s) similaire(s) déjà existante(s) :</p>
            {nameMatches.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                <EntityAvatar photoUrl={b.logoUrl} size={22} />
                <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        step={2}
        totalSteps={6}
        title="Pays d'origine"
        onBack={onCancel}
        onPrevious={() => setStep(1)}
        footer={
          <PrimaryButton onClick={() => setStep(3)} disabled={!originCountry} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} style={requiredStyle(!!originCountry)}>
          <option value="">Choisir un pays</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell
        step={3}
        totalSteps={6}
        title="Région & Ville d'origine"
        onBack={onCancel}
        onPrevious={() => setStep(2)}
        footer={
          <PrimaryButton onClick={() => setStep(4)} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif.</p>
        <input type="text" value={originRegion} onChange={(e) => setOriginRegion(e.target.value)} placeholder="Région d'origine" style={{ ...inputStyle, marginBottom: "16px" }} autoFocus />
        <input type="text" value={originCity} onChange={(e) => setOriginCity(e.target.value)} placeholder="Ville d'origine" style={inputStyle} />
      </StepShell>
    );
  }

  if (step === 4) {
    return (
      <StepShell
        step={4}
        totalSteps={6}
        title="Classification"
        onBack={onCancel}
        onPrevious={() => setStep(3)}
        footer={
          <PrimaryButton onClick={() => setStep(5)} disabled={classifications.length === 0} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Minimum 1 - Plusieurs choix possibles</p>
        <TagPicker options={BRAND_CLASSIFICATIONS} selected={classifications} onToggle={toggleClassification} />
      </StepShell>
    );
  }

  if (step === 5) {
    return (
      <StepShell
        step={5}
        totalSteps={6}
        title="Type de marque"
        onBack={onCancel}
        onPrevious={() => setStep(4)}
        footer={
          <PrimaryButton onClick={() => setStep(6)} disabled={brandTypes.length === 0} style={{ width: "100%" }}>
            Suivant
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Minimum 1 - Plusieurs choix possibles</p>
        <TagPicker options={BRAND_TYPES} selected={brandTypes} onToggle={toggleBrandType} />
      </StepShell>
    );
  }

  return (
    <>
      <StepShell
        step={6}
        totalSteps={6}
        title="Producteur actuel"
        onBack={onCancel}
        onPrevious={() => setStep(5)}
        footer={
          <PrimaryButton onClick={() => setShowConfirmPopup(true)} style={{ width: "100%" }}>
            Valider
          </PrimaryButton>
        }
      >
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Facultatif.</p>
        {selectedProducer ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 14px" }}>
            <EntityAvatar photoUrl={selectedProducer.profilePhotoUrl} photoEmoji={selectedProducer.avatarEmoji} size={28} />
            <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedProducer.name}</span>
            <button onClick={() => setSelectedProducer(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>
        ) : (
          <>
            <input type="text" value={producerQuery} onChange={(e) => setProducerQuery(e.target.value)} placeholder="Rechercher un producteur..." style={inputStyle} />
            {producerResults.length > 0 && (
              <div style={{ marginTop: "8px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                {producerResults.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProducer(p);
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
          </>
        )}
      </StepShell>

      {showConfirmPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 2000 }}>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "16px", padding: "24px", maxWidth: "360px" }}>
            <p style={{ fontSize: "14.5px", color: COLORS.ink, margin: "0 0 20px 0", lineHeight: 1.6 }}>
              Merci pour ta contribution !
              <br />
              Elle sera vérifiée prochainement.
              <br />
              En attendant, elle est déjà disponible sur Bib<span style={{ color: COLORS.amber }}>Atlas</span>.
            </p>
            <PrimaryButton onClick={handleConfirmCreate} disabled={saving} style={{ width: "100%" }}>
              {saving ? "Enregistrement..." : "OK"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </>
  );
}
