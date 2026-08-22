// ============================================================
// Sélecteur "brasserie" avec recherche et création à la volée —
// copié tel quel depuis le prototype Claude. La création réelle
// passe par `onRegister`, câblé côté App.jsx vers Supabase.
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { VerifiedBadge } from "./icons.jsx";
import { normalizeForSearch, normalizeForDuplicateCheck } from "../utils.js";

export function BrewerySearchSelect({ value, onChange, breweries, onRegister, placeholder = "Sélectionner une brasserie..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingName, setCreatingName] = useState(null); // non-null while asking for the country of a new brewery
  const [newCountry, setNewCountry] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setCreatingName(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = normalizeForSearch(query.trim());
  const filtered = q ? breweries.filter((b) => normalizeForSearch(b.name).includes(q)) : breweries;
  const exactMatch = breweries.some((b) => normalizeForDuplicateCheck(b.name) === normalizeForDuplicateCheck(query));

  const pick = (name) => {
    const canonicalName = onRegister ? onRegister(name) : name;
    onChange(canonicalName || name);
    setDuplicateNotice(null);
    setOpen(false);
    setQuery("");
    setCreatingName(null);
  };

  const startCreating = (name) => {
    setCreatingName(name);
    setNewCountry("");
  };

  const confirmCreate = () => {
    if (!newCountry.trim()) return;
    const canonicalName = onRegister ? onRegister(creatingName, newCountry.trim()) : creatingName;
    onChange(canonicalName || creatingName);
    setDuplicateNotice(canonicalName && canonicalName !== creatingName ? canonicalName : null);
    setOpen(false);
    setQuery("");
    setCreatingName(null);
    setNewCountry("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "10px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          fontSize: "14px",
          color: value ? COLORS.ink : COLORS.inkSoft,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{open ? "▲" : "▾"}</span>
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
          {creatingName !== null ? (
            <div style={{ padding: "12px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, marginBottom: "8px" }}>Nouveau producteur : {creatingName}</div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Pays d'origine *</label>
              <input
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newCountry.trim() && confirmCreate()}
                placeholder="Ex. Belgique"
                autoFocus
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none", marginBottom: "10px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setCreatingName(null)}
                  style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, fontSize: "13px", cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmCreate}
                  disabled={!newCountry.trim()}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "8px",
                    border: "none",
                    background: newCountry.trim() ? COLORS.amber : COLORS.paperAlt,
                    color: COLORS.ink,
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: newCountry.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Créer
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && query.trim() && !exactMatch && startCreating(query.trim())}
                placeholder="Rechercher ou ajouter..."
                autoFocus
                style={{ margin: "8px", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
              />
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.length === 0 && !query.trim() && (
                  <div style={{ padding: "10px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune brasserie enregistrée pour l'instant.</div>
                )}
                {filtered.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pick(b.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: value === b.name ? COLORS.paperAlt : "transparent",
                      border: "none",
                      fontSize: "13.5px",
                      color: COLORS.ink,
                      cursor: "pointer",
                    }}
                  >
                    {b.name}
                    {b.country && <span style={{ fontSize: "12px", fontWeight: 500, color: COLORS.inkSoft }}>{b.country}</span>}
                    {b.status === "certified" && <VerifiedBadge size={13} />}
                  </button>
                ))}
                {query.trim() && !exactMatch && (
                  <button
                    onClick={() => startCreating(query.trim())}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "transparent",
                      border: "none",
                      borderTop: filtered.length > 0 ? `1px dashed ${COLORS.paperAlt}` : "none",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: COLORS.wine,
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter "{query.trim()}"
                  </button>
                )}
              </div>
              {value && (
                <button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={{
                    padding: "9px 14px",
                    background: "transparent",
                    border: "none",
                    borderTop: `1px dashed ${COLORS.paperAlt}`,
                    fontSize: "12px",
                    color: COLORS.inkSoft,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Effacer la sélection
                </button>
              )}
            </>
          )}
        </div>
      )}
      {duplicateNotice && (
        <p style={{ fontSize: "11.5px", color: COLORS.wine, fontWeight: 700, marginTop: "6px" }}>
          "{duplicateNotice}" existait déjà — sélectionné plutôt que dupliqué.
        </p>
      )}
    </div>
  );
}
