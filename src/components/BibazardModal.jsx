// ============================================================
// Modale "BibAzard" (roulette de boisson au hasard) — copiée
// telle quelle depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, MENU_CATEGORIES, VOLUME_DISPLAY_TYPES } from "../constants.js";
import { PrimaryButton } from "./ui.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { drinkTypeLabel, isAlcoholicDrink } from "../utils.js";

export function BibazardModal({ menu, friendName, onConfirm, onClose }) {
  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const availableCategories = MENU_CATEGORIES.filter((cat) => menu.some((d) => categoryOf(d) === cat));
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [includeNonAlcoholic, setIncludeNonAlcoholic] = useState(true);
  const [phase, setPhase] = useState("selecting"); // "selecting" | "spinning" | "result"
  const [resultDrink, setResultDrink] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [hasReplayed, setHasReplayed] = useState(false);
  const intervalRef = React.useRef(null);
  const currentDrinkRef = React.useRef(null);

  React.useEffect(() => () => clearInterval(intervalRef.current), []);

  // "Softs & eaux" is always alcohol-free — no toggle needed there. The other categories can mix
  // alcoholic and 0.0% versions of the same kind of drink, so the toggle only matters (and only
  // shows) once at least one selected category could actually contain both.
  const mixedCategorySelected = selectedCategories.some((cat) => cat !== "Softs & eaux");
  const pool = menu.filter((d) => selectedCategories.includes(categoryOf(d)) && (includeNonAlcoholic || isAlcoholicDrink(d)));

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const spin = () => {
    if (pool.length === 0) return;
    setPhase("spinning");
    // Fast, constant-rate spin — the user decides when to stop, rather than the app deciding for
    // them. A ref (not state) tracks the currently-shown drink so "stop" always uses the exact
    // item on screen at that instant, with no async state-update timing risk.
    intervalRef.current = setInterval(() => {
      const d = pool[Math.floor(Math.random() * pool.length)];
      currentDrinkRef.current = d;
      setDisplayName(d.name);
    }, 45);
  };

  const stopSpin = () => {
    clearInterval(intervalRef.current);
    const final = currentDrinkRef.current;
    setResultDrink(final);
    setDisplayName(final.name);
    setPhase("result");
  };

  const replay = () => {
    setHasReplayed(true);
    spin();
  };

  const confirm = () => {
    if (resultDrink) onConfirm(resultDrink.id);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div style={{ background: COLORS.surface, borderRadius: "20px", padding: "24px 20px", width: "100%", maxWidth: "380px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "18px", fontWeight: 700 }}>
            <span style={{ color: COLORS.chalkWhite }}>Bib</span>
            <span style={{ color: COLORS.amber }}>Azard</span>
          </span>
          <div style={{ width: "36px", height: "2px", background: COLORS.amber, opacity: 0.5, margin: "8px auto" }} />
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: phase === "selecting" ? "26px" : "24px", margin: 0, lineHeight: 1 }}>
            {phase === "selecting" ? "Le hasard a soif !" : `Pour ${friendName}`}
          </h2>
        </div>

        {phase === "selecting" && (
          <>
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", margin: "10px 0 16px 0" }}>Choisissez les catégories dans lesquelles le hasard peut piocher.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "18px" }}>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    background: selectedCategories.includes(cat) ? COLORS.amber : COLORS.surface,
                    border: `2px solid ${selectedCategories.includes(cat) ? COLORS.amber : COLORS.paperAlt}`,
                    borderRadius: "999px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: selectedCategories.includes(cat) ? COLORS.paper : COLORS.ink,
                    cursor: "pointer",
                  }}
                >
                  {drinkTypeLabel(cat)}
                </button>
              ))}
            </div>

            {mixedCategorySelected && (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12.5px", marginBottom: "12px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeNonAlcoholic}
                  onChange={(e) => setIncludeNonAlcoholic(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: COLORS.amber }}
                />
                Inclure les sans-alcool (0.0%)
              </label>
            )}

            <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, textAlign: "center", marginTop: "-8px", marginBottom: "16px" }}>
              {pool.length} produit{pool.length !== 1 ? "s" : ""} en jeu
            </p>
            <PrimaryButton onClick={spin} disabled={pool.length === 0} style={{ width: "100%" }}>
              Lancer
            </PrimaryButton>
          </>
        )}

        {(phase === "spinning" || phase === "result") && (
          <>
            <div
              style={{
                background: COLORS.surfaceAlt,
                borderRadius: "14px",
                padding: "28px 16px",
                textAlign: "center",
                margin: "16px 0",
                minHeight: "76px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: phase === "result" ? "19px" : "15px", color: phase === "result" ? COLORS.amber : COLORS.chalkWhite, lineHeight: 1.2 }}>
                {displayName}
                {phase === "result" && resultDrink && resultDrink.volumeCl && VOLUME_DISPLAY_TYPES.includes(resultDrink.type) && (
                  <span style={{ color: COLORS.chalkWhite }}> {resultDrink.volumeCl}cl.</span>
                )}
              </span>
              {phase === "result" && resultDrink && (
                <span style={{ fontSize: "11.5px", color: COLORS.inkSoft, fontWeight: 600 }}>{drinkTypeLabel(categoryOf(resultDrink))}</span>
              )}
            </div>

            {phase === "spinning" && (
              <button
                onClick={stopSpin}
                style={{ width: "100%", padding: "15px", borderRadius: "10px", border: "none", background: COLORS.wine, color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
              >
                STOP !
              </button>
            )}

            {phase === "result" && (
              <>
                {resultDrink && (
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px", marginBottom: "16px" }}>
                    <DrinkBadges drink={resultDrink} size={12} />
                  </div>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  {!hasReplayed && (
                    <button
                      onClick={replay}
                      style={{ flex: 1, padding: "13px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                    >
                      Relancer
                      <br />
                      <span style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.7 }}>(seconde chance)</span>
                    </button>
                  )}
                  <PrimaryButton onClick={confirm} style={{ flex: 1 }}>
                    Je prends !
                  </PrimaryButton>
                </div>
              </>
            )}
          </>
        )}

        {phase === "selecting" && (
          <button onClick={onClose} style={{ display: "block", margin: "14px auto 0 auto", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer" }}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
