// ============================================================
// Sélecteur « BibAtlas » (le répertoire de produits ; bouton avec un « + ») — copié
// à l'origine tel quel depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, SUBTYPE_LABELS, ADD_BLOCK_HEIGHT } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { AddPlusIcon } from "./icons.jsx";
import { drinkTypeLabel } from "../utils.js";
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: `${ADD_BLOCK_HEIGHT}px`,
          boxSizing: "border-box",
          textAlign: "left",
          padding: "0 14px",
          borderRadius: "9px",
          border: `2px solid ${COLORS.amberDark}`,
          background: COLORS.surface,
          color: COLORS.ink,
          fontWeight: 700,
          fontSize: "13.5px",
          cursor: "pointer",
        }}
      >
        <span>
          Bib<span style={{ color: COLORS.amber }}>Atlas</span>
        </span>
        <AddPlusIcon color={COLORS.amber} rotated={open} />
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
            {/* Une seule ligne par produit, comme la recherche BibAtlas de « Nouvelle tournée » : rond-profil, nom, catégorie. */}
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => pick(d)}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={36} fallbackIcon="bottle" />
                <span style={{ fontWeight: 600, fontSize: "14px", color: COLORS.ink, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{SUBTYPE_LABELS[d.beverageSubtype] || drinkTypeLabel(d.type)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
