import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, EntityAvatar, BibaxName } from "./ui.jsx";
import { loadBibaxSuggestions, sendBibaxRequest } from "../data/sharedDirectories.js";

// Toutes les suggestions de Bibax — pas seulement les 3 premières affichées sur l'accueil.
export function BibaxAllSuggestionsScreen({ onBack, onOpenProfile }) {
  const [suggestions, setSuggestions] = useState(null);
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    loadBibaxSuggestions(50).then(setSuggestions);
  }, []);

  const addSuggestion = async (bibroCode) => {
    setBusyCode(bibroCode);
    await sendBibaxRequest(bibroCode);
    setBusyCode(null);
    setSuggestions((prev) => (prev || []).filter((s) => s.bibroCode !== bibroCode));
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0" }}>
        <span style={{ color: COLORS.ink }}>Biba</span>
        <span style={{ color: COLORS.amber }}>x</span>
        <span style={{ color: COLORS.inkSoft }}> - Suggestions</span>
      </h1>

      {suggestions === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : suggestions.length === 0 ? (
        <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune suggestion pour l'instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {suggestions.map((s) => (
            <button
              key={s.userId}
              onClick={() => onOpenProfile(s.bibroCode)}
              style={{
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <EntityAvatar photoUrl={s.avatarUrl} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <BibaxName name={s.name} lastName={s.lastName} nickname={s.nickname} city={s.city} style={{ fontSize: "13.5px", color: COLORS.ink }} />
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>
                  {s.mutualCount > 0 ? `${s.mutualCount} Bibax en commun` : s.sameLocation ? "Même ville" : ""}
                </p>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  addSuggestion(s.bibroCode);
                }}
                style={{
                  background: "none",
                  border: `2px solid ${COLORS.amber}`,
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: COLORS.amber,
                  cursor: "pointer",
                  opacity: busyCode === s.bibroCode ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                Ajouter
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
