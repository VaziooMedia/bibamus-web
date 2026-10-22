// ============================================================
// BibaPing — « + » : choisir à qui écrire.
//
// La liste de MES Bibax confirmés, par ordre alphabétique (prénom puis nom, sans tenir
// compte des accents ni des majuscules). La barre de recherche filtre cette liste sur le
// prénom, le nom et le surnom. Un clic sur un Bibax ouvre le tête-à-tête avec lui — ou le
// crée s'il n'existe pas encore : c'est BibaPing qui s'en charge, via `onPick`.
//
// Seuls les Bibax dont on connaît le compte (`userId`) peuvent recevoir un message.
// ============================================================
import React, { useState, useMemo } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar, PageHeader } from "./ui.jsx";
import { ResultRow } from "./SearchScreen.jsx";

const fullNameOf = (b) => [b.firstName || b.name, b.lastName].filter(Boolean).join(" ") || "Bibax";

// « Émile » et « emile » se valent ; « jean dup » trouve « Jean Dupont ».
const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// `onPick(bibax)` renvoie une promesse : null si la discussion s'est ouverte, sinon le texte de l'erreur.
export function NewConversationScreen({ bibros = [], onPick, onBack }) {
  const [query, setQuery] = useState("");
  const [openingCode, setOpeningCode] = useState(null);
  const [error, setError] = useState("");

  const trimmed = query.trim();

  const sortedBibros = useMemo(
    () =>
      bibros
        .filter((b) => b.code && b.userId)
        .sort((a, b) => fullNameOf(a).localeCompare(fullNameOf(b), "fr", { sensitivity: "base" })),
    [bibros]
  );

  const shown = useMemo(() => {
    const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return sortedBibros;
    return sortedBibros.filter((b) => {
      const haystack = normalize([b.firstName || b.name, b.lastName, b.nickname].filter(Boolean).join(" "));
      return tokens.every((t) => haystack.includes(t));
    });
  }, [sortedBibros, trimmed]);

  const handlePick = async (b) => {
    if (openingCode) return;
    setError("");
    setOpeningCode(b.code);
    const failure = await onPick(b);
    // En cas de succès, BibaPing remplace cet écran : rien d'autre à faire ici.
    if (failure) {
      setOpeningCode(null);
      setError(failure);
    }
  };

  const emptyText = { fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1, boxSizing: "border-box" }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1, color: COLORS.ink }}>Nouveau message</h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "10px 14px",
          marginBottom: "16px",
          boxSizing: "border-box",
        }}
      >
        <NavIcon name="search" size={17} color={COLORS.inkSoft} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un Bibax..."
          style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
        />
        <button
          onClick={() => setQuery("")}
          aria-label="Effacer la recherche"
          style={{
            background: "none",
            border: "none",
            cursor: query.length > 0 ? "pointer" : "default",
            padding: 0,
            flexShrink: 0,
            visibility: query.length > 0 ? "visible" : "hidden",
            display: "flex",
          }}
        >
          <NavIcon name="x" size={15} color={COLORS.inkSoft} />
        </button>
      </div>

      {error && <p style={{ fontSize: "12.5px", color: COLORS.wine, textAlign: "center", margin: "0 0 12px" }}>{error}</p>}

      {sortedBibros.length === 0 ? (
        <p style={emptyText}>Tu n'as pas encore de Bibax à qui écrire.</p>
      ) : shown.length === 0 ? (
        <p style={emptyText}>Aucun Bibax pour « {trimmed} ».</p>
      ) : (
        <div
          style={{
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "12px",
            padding: "0 12px",
            opacity: openingCode ? 0.6 : 1,
          }}
        >
          {shown.map((b, i) => (
            <ResultRow
              key={b.code}
              title={fullNameOf(b)}
              subtitle={
                b.nickname || b.city ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    {b.nickname && <span style={{ fontStyle: "italic", color: COLORS.amber }}>{b.nickname}</span>}
                    {b.nickname && b.city && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.inkSoft, display: "inline-block" }} />}
                    {b.city}
                    {b.city && b.country && <CountryFlagImg country={b.country} size={13} />}
                  </span>
                ) : null
              }
              avatar={<EntityAvatar photoUrl={b.avatarUrl} size={36} />}
              onClick={() => handlePick(b)}
              last={i === shown.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
