// ============================================================
// BibAtlas (« Next Drink ») — salon @Home.
//
// Chez soi, il n'y a pas de carte à télécharger ni de tournée : chacun se sert quand il en a
// envie. Tout passe donc par BibAtlas (le répertoire global) : on cherche un produit, on choisit
// son volume et son type de service (facultatifs, pré-remplis avec les valeurs par défaut de la
// fiche produit), et le verre est ajouté pour SOI seulement. Chaque verre porte le code
// de la personne qui l'a pris (event.homeDrinks) ; la liste « Mes verres » permet d'en reprendre
// un identique (+) ou de retirer le dernier (−) en cas d'erreur.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar, PrimaryButton } from "./ui.jsx";
import { NavIcon } from "./icons.jsx";
import { AiIcon } from "./AiIcon.jsx";
import { ServiceTag } from "./ServiceTag.jsx";
import { BarcodeScannerModal } from "./BarcodeScannerModal.jsx";
import { drinkTypeLabel, isAlcoholicDrink, findEntryForEvent } from "../utils.js";
import { searchDrinks, loadDrinksByIds } from "../data/sharedDirectories.js";

// Même libellés que RoundComposeScreen / SearchScreen, pour la sous-catégorie d'un résultat.
const SUBTYPE_LABELS = { biere: "Bière", cidre: "Cidre", poire: "Poiré", vin: "Vin", vin_effervescent: "Vin effervescent" };

const volumeLabel = (cl) => (cl != null ? ` ${String(cl).replace(".", ",")} cl.` : "");

// Type de service : même ordre et mêmes libellés que le « Type de service par défaut » de la fiche produit côté Gestion.
const SERVING_MODE_OPTIONS = [
  ["bouteille", "Bouteille"],
  ["canette", "Canette"],
  ["fut", "On Tap"],
  ["verre", "Au verre"],
];

// Champ « Volume (cl.) » : même gabarit (largeur, valeur centrée) que le champ de volume de BibaSolo.
const VOLUME_BLOCK_W = 114;
const encodeFieldStyle = {
  width: "100%",
  height: "46px",
  boxSizing: "border-box",
  padding: "0 14px",
  borderRadius: "12px",
  border: `2px solid ${COLORS.paperAlt}`,
  background: COLORS.surface,
  color: COLORS.ink,
  fontSize: "14px",
  textAlign: "center",
};
const fieldLabelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, display: "block", marginBottom: "6px" };

// Volume saisi (virgule ou point) → nombre de cl, ou null si vide ou illisible.
const parseVolume = (raw) => {
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
// Valeurs par défaut de la fiche produit (Gestion) : volume habituel et type de service habituel.
const defaultVolumeText = (drink) => {
  const n = Number(drink?.defaultVolumeCl);
  return drink?.defaultVolumeCl != null && Number.isFinite(n) && n > 0 ? String(n) : "";
};
const defaultServingMode = (drink) => (SERVING_MODE_OPTIONS.some(([key]) => key === drink?.defaultServingMode) ? drink.defaultServingMode : "");

export function HomeServeSheet({ event, myBibroCode, myPaused, zeroMode, onServe, onRemove, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [volume, setVolume] = useState("");
  const [servingMode, setServingMode] = useState("");
  const [justAdded, setJustAdded] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchDrinks(q, 8).then(setResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // BibaZERO actif : les boissons alcoolisées ne sont pas proposées, comme dans une tournée.
  const visibleResults = zeroMode ? results.filter((d) => !isAlcoholicDrink(d)) : results;

  // Mes verres, regroupés par produit (et volume), dans l'ordre où je les ai pris.
  const mine = (event.homeDrinks || []).filter((h) => h.code === myBibroCode);
  const groups = [];
  mine.forEach((h) => {
    const existing = groups.find((g) => g.drinkId === h.drinkId);
    if (existing) {
      existing.count += 1;
      existing.lastServeId = h.id;
    } else {
      const entry = findEntryForEvent(event, h.drinkId);
      groups.push({ drinkId: h.drinkId, entry, count: 1, lastServeId: h.id });
    }
  });

  const pick = (drink) => {
    setPicked(drink);
    // Le volume et le type de service habituels du produit (fiche produit, côté Gestion) s'ils sont connus, sinon vides — on peut passer.
    setVolume(defaultVolumeText(drink));
    setServingMode(defaultServingMode(drink));
  };

  const confirm = () => {
    if (!picked || myPaused) return;
    const cl = parseVolume(volume);
    onServe(picked, { volumeCl: cl, servingMode });
    setJustAdded(`${picked.name}${volumeLabel(cl)}`);
    setPicked(null);
    setQuery("");
    setResults([]);
  };

  const again = (entry) => {
    if (myPaused || !entry?.sourceDrinkId) return;
    onServe({ id: entry.sourceDrinkId, name: entry.name, kcalPer100ml: entry.kcalPer100ml }, { volumeCl: entry.volumeCl ?? null, servingMode: entry.servingMode || "" });
    setJustAdded(`${entry.name}${volumeLabel(entry.volumeCl)}`);
  };

  // Une boisson reconnue par la lecture d'étiquette (IA) se choisit comme un résultat de recherche. BibaZERO actif : une boisson
  // alcoolisée n'est pas proposée, ici non plus — on le dit plutôt que de ne rien faire.
  const pickScanned = async (drinkId) => {
    setScannerOpen(false);
    const [drink] = await loadDrinksByIds([drinkId]);
    if (!drink) return;
    if (zeroMode && isAlcoholicDrink(drink)) {
      setScanNotice("BibaZERO actif : cette boisson alcoolisée n'est pas proposée.");
      return;
    }
    setScanNotice(null);
    pick(drink);
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={onClose}>
        <div
          style={{ background: COLORS.paper, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: "20px", boxSizing: "border-box" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
              <div data-testid="home-serve-title" style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px" }}>
                <span style={{ color: COLORS.ink }}>Bib</span>
                <span style={{ color: COLORS.amber }}>Atlas</span>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "24px", lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>
              ×
            </button>
          </div>

          {myPaused && (
            <p style={{ fontSize: "12px", color: COLORS.bobYellow, margin: "0 0 12px 0" }}>Tu es en pause — reprends depuis le BibaRoom pour pouvoir te servir.</p>
          )}
          {zeroMode && !myPaused && (
            <p style={{ fontSize: "12px", color: COLORS.bobYellow, margin: "0 0 12px 0" }}>BibaZERO actif : les boissons alcoolisées ne sont pas proposées.</p>
          )}

          {scanNotice && (
            <p role="status" style={{ fontSize: "12px", color: COLORS.bobYellow, margin: "0 0 12px 0" }}>{scanNotice}</p>
          )}

          <div
            data-testid="home-serve-search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "10px 14px",
              boxSizing: "border-box",
              opacity: myPaused ? 0.5 : 1,
            }}
          >
            <NavIcon name="search" size={17} color={COLORS.inkSoft} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher dans BibAtlas..."
              disabled={myPaused}
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
            />
            <span style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />
            <button
              onClick={() => setScannerOpen(true)}
              disabled={myPaused}
              aria-label="Chercher avec l'IA"
              data-testid="home-serve-ai"
              style={{ background: "none", border: "none", cursor: myPaused ? "default" : "pointer", padding: 0, flexShrink: 0, display: "flex" }}
            >
              <AiIcon size={28} bleed />
            </button>
          </div>

          {visibleResults.length > 0 && !picked && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {visibleResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => pick(d)}
                  style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={36} fallbackIcon="bottle" />
                  <span style={{ fontWeight: 600, fontSize: "14px", minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{SUBTYPE_LABELS[d.beverageSubtype] || drinkTypeLabel(d.type)}</span>
                </button>
              ))}
            </div>
          )}

          {picked && (
            <div style={{ marginTop: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px" }}>{picked.name}</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <div data-encode="volume" style={{ flex: `0 0 ${VOLUME_BLOCK_W}px`, minWidth: 0 }}>
                  <label htmlFor="home-serve-volume" style={fieldLabelStyle}>Volume (cl.)</label>
                  <input
                    id="home-serve-volume"
                    type="text"
                    inputMode="decimal"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="00"
                    style={encodeFieldStyle}
                  />
                </div>
                <div data-encode="service" style={{ flex: 1, minWidth: 0 }}>
                  <label htmlFor="home-serve-service" style={fieldLabelStyle}>Type de service</label>
                  <select
                    id="home-serve-service"
                    value={servingMode}
                    onChange={(e) => setServingMode(e.target.value)}
                    style={{ ...encodeFieldStyle, textAlign: "left" }}
                  >
                    <option value="">Non défini</option>
                    {SERVING_MODE_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <PrimaryButton onClick={confirm} disabled={myPaused} style={{ width: "100%", marginBottom: "6px" }}>
                Me servir
              </PrimaryButton>
              <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer", width: "100%", padding: "8px" }}>
                Annuler
              </button>
            </div>
          )}

          {justAdded && !picked && (
            <p role="status" style={{ fontSize: "13px", color: COLORS.amber, fontWeight: 700, margin: "12px 0 0 0" }}>
              ✓ Ajouté : {justAdded}
            </p>
          )}

          {groups.length > 0 && (
            <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, marginBottom: "8px" }}>Mes verres ({mine.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {groups.map((g) => (
                  <div key={g.drinkId} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, minWidth: 0, display: "flex", flexDirection: "column", whiteSpace: "pre" }}>
                      {/* Le nom se coupe par « … » si besoin ; le volume reste toujours visible. */}
                      <span style={{ display: "flex", alignItems: "baseline", minWidth: 0 }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{g.entry?.name || "Boisson"}</span>
                        {g.entry?.volumeCl != null && <span style={{ color: COLORS.amber, fontWeight: 700, flexShrink: 0 }}>{volumeLabel(g.entry.volumeCl)}</span>}
                      </span>
                      {/* Le type de service, en petite pastille sur la ligne du dessous. */}
                      <ServiceTag mode={g.entry?.servingMode} />
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <button
                        onClick={() => onRemove(g.lastServeId)}
                        aria-label={`Retirer un verre : ${g.entry?.name || "Boisson"}`}
                        style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: COLORS.paperAlt, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                      >
                        −
                      </button>
                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", minWidth: "12px", textAlign: "center" }}>{g.count}</span>
                      <button
                        onClick={() => again(g.entry)}
                        disabled={myPaused || !g.entry?.sourceDrinkId}
                        aria-label={`Reprendre : ${g.entry?.name || "Boisson"}`}
                        style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: myPaused ? COLORS.paperAlt : COLORS.amber, color: myPaused ? COLORS.inkSoft : COLORS.paper, fontSize: "13px", fontWeight: 700, cursor: myPaused ? "default" : "pointer" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer", width: "100%", padding: "14px 8px 4px" }}>
            Fermer
          </button>
        </div>
      </div>
      {scannerOpen && <BarcodeScannerModal myBibroCode={myBibroCode} onClose={() => setScannerOpen(false)} onFoundDrink={pickScanned} />}
    </>
  );
}
