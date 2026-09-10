// ============================================================
// Sélecteur "Ajouter depuis le répertoire" — copié tel quel
// depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { VerifiedBadge } from "./icons.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { drinkSummaryLine } from "../utils.js";
import { searchDrinksByType } from "../data/sharedDirectories.js";

export function DrinkDirectoryPicker({ type, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Recherche côté serveur, bornée à ce type — rien tant qu'on n'a pas tapé au moins 2 lettres
  // (montrer d'emblée les premiers produits de la catégorie n'apportait rien d'utile).
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setFiltered([]);
      return;
    }
    const timer = setTimeout(() => {
      searchDrinksByType(type, query.trim()).then(setFiltered);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, type, query]);

  const pick = (d) => {
    onPick(d);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "center",
          padding: "11px",
          borderRadius: "9px",
          border: `2px dashed ${COLORS.amberDark}`,
          background: COLORS.surface,
          color: COLORS.amberDark,
          fontWeight: 700,
          fontSize: "13.5px",
          cursor: "pointer",
        }}
      >
        Ajouter depuis le répertoire
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            maxHeight: "300px",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, type ou brasserie"
            autoFocus
            style={{ margin: "8px", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>
                {query.trim().length === 0 ? "Tape au moins 2 caractères" : query.trim().length === 1 ? "Encore un caractère..." : "Aucun résultat."}
              </div>
            )}
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => pick(d)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13.5px", color: COLORS.ink, flexWrap: "wrap" }}>
                  {d.name}
                  {d.status === "complete" && <VerifiedBadge size={13} />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "1px" }}>
                  <DrinkBadges drink={d} />
                </div>
                {drinkSummaryLine(d) && <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "1px" }}>{drinkSummaryLine(d)}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
