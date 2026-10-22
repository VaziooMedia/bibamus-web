// ============================================================
// Page « Bibax » de BibAtlas — ouverte par le bloc Bibax de l'écran BibAtlas.
// Sa propre barre de recherche (indépendante de celle de BibAtlas, sans
// l'icône IA : lire une étiquette n'a pas de sens pour chercher une personne).
//
// - Sans recherche : la liste de MES Bibax confirmés, par ordre alphabétique
//   (prénom puis nom, sans tenir compte des accents ni des majuscules).
// - Dès 2 caractères : la liste laisse la place aux résultats de la recherche
//   parmi tous les utilisateurs (même recherche que l'onglet Bibax de BibAtlas :
//   seuls les profils qui partagent leur nom sont trouvables). Si on efface,
//   la liste revient.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar, PageHeader } from "./ui.jsx";
import { ResultRow } from "./SearchScreen.jsx";
import { searchBibax } from "../data/sharedDirectories.js";

const fullNameOf = (b) => [b.firstName || b.name, b.lastName].filter(Boolean).join(" ") || "Bibax";

export function BibaxDirectoryScreen({ bibros = [], onOpenBibaxProfile, onBack }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;

  // Recherche côté serveur, avec un léger délai ; une réponse arrivée en retard ne remplace jamais
  // celle d'une saisie plus récente.
  useEffect(() => {
    if (!hasQuery) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchBibax(trimmed).then((found) => {
        if (cancelled) return;
        setResults(found);
        setLoading(false);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasQuery, trimmed]);

  const sortedBibros = useMemo(
    () => bibros.filter((b) => b.code).sort((a, b) => fullNameOf(a).localeCompare(fullNameOf(b), "fr", { sensitivity: "base" })),
    [bibros]
  );

  const listBox = { background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" };
  const emptyText = { fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1, boxSizing: "border-box" }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>x</span>
        </h1>
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

      {!hasQuery ? (
        sortedBibros.length === 0 ? (
          <p style={emptyText}>Tu n'as pas encore de Bibax. Utilise la recherche pour en trouver.</p>
        ) : (
          <div style={listBox}>
            {sortedBibros.map((b, i) => (
              <ResultRow
                key={b.code}
                title={fullNameOf(b)}
                subtitle={
                  b.city ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      {b.city}
                      {b.country && <CountryFlagImg country={b.country} size={13} />}
                    </span>
                  ) : null
                }
                avatar={<EntityAvatar photoUrl={b.avatarUrl} size={36} />}
                onClick={() => onOpenBibaxProfile(b.code)}
                last={i === sortedBibros.length - 1}
              />
            ))}
          </div>
        )
      ) : loading ? (
        <p style={emptyText}>Recherche des Bibax...</p>
      ) : results.length === 0 ? (
        <p style={emptyText}>Aucun résultat pour « {trimmed} ».</p>
      ) : (
        <div style={listBox}>
          {results.map((b, i) => (
            <ResultRow
              key={b.id}
              title={[b.displayName, b.lastName].filter(Boolean).join(" ")}
              subtitle={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {b.city}
                  {b.country && <CountryFlagImg country={b.country} size={13} />}
                  {(b.city || b.country) && b.mutualBibaxCount > 0 && (
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block" }} />
                  )}
                  {b.mutualBibaxCount > 0 && `${b.mutualBibaxCount} Bibax en commun`}
                </span>
              }
              avatar={<EntityAvatar photoUrl={b.avatarUrl} size={36} />}
              onClick={() => onOpenBibaxProfile(b.bibroCode)}
              last={i === results.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
