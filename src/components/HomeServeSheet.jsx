// ============================================================
// BibAtlas (« Next Drink ») — salon @Home.
//
// Chez soi, il n'y a pas de carte à télécharger ni de tournée : chacun se sert quand il en a
// envie. Tout passe donc par BibAtlas (le répertoire global) : on cherche un produit, on choisit
// son volume (facultatif), et le verre est ajouté pour SOI seulement. Chaque verre porte le code
// de la personne qui l'a pris (event.homeDrinks) ; la liste « Mes verres » permet d'en reprendre
// un identique (+) ou de retirer le dernier (−) en cas d'erreur.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_VOLUMES_CL } from "../constants.js";
import { EntityAvatar, PrimaryButton } from "./ui.jsx";
import { NavIcon } from "./icons.jsx";
import { AiIcon } from "./AiIcon.jsx";
import { BarcodeScannerModal } from "./BarcodeScannerModal.jsx";
import { drinkTypeLabel, isAlcoholicDrink, findEntryForEvent } from "../utils.js";
import { searchDrinks, loadDrinksByIds } from "../data/sharedDirectories.js";

// Même libellés que RoundComposeScreen / SearchScreen, pour la sous-catégorie d'un résultat.
const SUBTYPE_LABELS = { biere: "Bière", cidre: "Cidre", poire: "Poiré", vin: "Vin", vin_effervescent: "Vin effervescent" };

const volumeLabel = (cl) => (cl != null ? ` ${String(cl).replace(".", ",")} cl.` : "");

export function HomeServeSheet({ event, myBibroCode, myPaused, zeroMode, onServe, onRemove, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [volume, setVolume] = useState("");
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
    // Le volume habituel du produit s'il est connu, sinon « non défini » — on peut passer.
    setVolume(drink.defaultVolumeCl != null && DRINK_VOLUMES_CL.includes(Number(drink.defaultVolumeCl)) ? String(drink.defaultVolumeCl) : "");
  };

  const confirm = () => {
    if (!picked || myPaused) return;
    const cl = volume ? parseFloat(volume) : null;
    onServe(picked, { volumeCl: cl });
    setJustAdded(`${picked.name}${volumeLabel(cl)}`);
    setPicked(null);
    setQuery("");
    setResults([]);
  };

  const again = (entry) => {
    if (myPaused || !entry?.sourceDrinkId) return;
    onServe({ id: entry.sourceDrinkId, name: entry.name, kcalPer100ml: entry.kcalPer100ml }, { volumeCl: entry.volumeCl ?? null });
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
              <label style={{ fontSize: "11px", fontWeight: 600, color: COLORS.inkSoft, display: "block", marginBottom: "4px" }}>Volume</label>
              <select
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", width: "100%", boxSizing: "border-box", marginBottom: "12px" }}
              >
                <option value="">Non défini</option>
                {DRINK_VOLUMES_CL.map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(".", ",")} cl.
                  </option>
                ))}
              </select>
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
                    <span style={{ fontSize: "13px", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.entry?.name || "Boisson"}
                      {g.entry?.volumeCl != null && <span style={{ color: COLORS.amber, fontWeight: 700 }}>{volumeLabel(g.entry.volumeCl)}</span>}
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
