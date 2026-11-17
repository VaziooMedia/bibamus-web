import React, { useState, useEffect } from "react";
import { useListReturn } from "../hooks/useListReturn.js";
import { COLORS } from "../constants.js";
import { PageHeader, RequestCardAvatar, BibaxName } from "./ui.jsx";
import { loadBibaxSuggestions, sendBibaxRequest } from "../data/sharedDirectories.js";

// Toutes les suggestions de Bibax — pas seulement les 3 premières affichées sur l'accueil.
// Retour d'un profil (norme de l'app, voir `useListReturn`) : la liste se remet à la hauteur où on l'avait laissée, puis elle est relue en silence
// (quelqu'un qu'on vient d'ajouter depuis son profil disparaît) ; la flèche retour vers la page d'origine efface la mémoire.
export function BibaxAllSuggestionsScreen({ onBack: onBackProp, onOpenProfile: onOpenProfileProp, mainScrollRef }) {
  const { restored, save, open, leave } = useListReturn("bibaxAllSuggestions", mainScrollRef);
  const onBack = leave(onBackProp);
  const onOpenProfile = open(onOpenProfileProp);
  const [suggestions, setSuggestions] = useState(restored ? restored.suggestions : null);
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    let alive = true;
    loadBibaxSuggestions(50).then((list) => {
      if (alive) setSuggestions((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (suggestions !== null) save({ suggestions });
  }, [suggestions]);

  const addSuggestion = async (bibroCode) => {
    setBusyCode(bibroCode);
    await sendBibaxRequest(bibroCode);
    setBusyCode(null);
    setSuggestions((prev) => (prev || []).filter((s) => s.bibroCode !== bibroCode));
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
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
              <RequestCardAvatar photoUrl={s.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <BibaxName name={s.name} lastName={s.lastName} nickname={s.nickname} city={s.city} locality={s.locality} style={{ fontSize: "13.5px", color: COLORS.ink }} />
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>
                  {s.mutualCount > 0 ? `${s.mutualCount} Bibax en commun` : s.distanceKm != null ? `à ${s.distanceKm} km` : ""}
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
