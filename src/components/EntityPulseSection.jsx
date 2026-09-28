// ============================================================
// Pulse d'une fiche (Produit, Lieu, Producteur) — mêmes cartes que le fil principal (BibaPulseScreen),
// filtrées à cette seule fiche, avec deux onglets : « Tous » (tout ce que je peux voir) et « Mes Bibax »
// (mes Bibax confirmés seulement). Ne se recharge jamais tout seul (contrairement au fil principal,
// qui l'actualise toutes les 10 secondes) : cette section est consultée une fois, pas surveillée en continu.
//
// selfEntity (facultatif) : la fiche elle-même, déjà en mémoire (le produit d'une fiche Produit,
// le lieu d'une fiche Lieu). Sert à afficher un nom juste immédiatement, sans attendre un aller-retour
// réseau, pour les publications qui la concernent directement. Forme : { type: "drink" | "venue", object }.
// Sans effet pour une fiche Producteur : ses publications portent sur des produits différents, jamais
// sur le producteur lui-même.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { loadEntityPulse, loadDrinksByIds, loadVenuesByIds } from "../data/sharedDirectories.js";
import { PulseCard } from "./BibaPulseScreen.jsx";
import { BibaxProfilePreviewScreen } from "./BibaxProfilePreviewScreen.jsx";
import { ProfileNavContext } from "../contexts.js";

const SPECIAL_VENUE_LABELS = { "@home": "@Home", "@event": "@Event" };
const SCOPES = [
  { key: "all", label: "Tout le monde" },
  { key: "bibax", label: "Mes Bibax" },
];

export function EntityPulseSection({ entityType, entityId, myUserId, myBibroCode, onOpenVenue, onOpenDrink, selfEntity }) {
  const [scope, setScope] = useState("all");
  const [entries, setEntries] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewedProfileCode, setViewedProfileCode] = useState(null);
  const { goToProfile } = React.useContext(ProfileNavContext);

  const seedDrinks = selfEntity?.type === "drink" ? [selfEntity.object] : [];
  const seedVenues = selfEntity?.type === "venue" ? { [selfEntity.object.id]: selfEntity.object } : {};
  const [drinksDirectory, setDrinksDirectory] = useState(seedDrinks);
  const [venuesById, setVenuesById] = useState(seedVenues);

  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => e.objectType === "drink" && e.objectId && ids.add(e.objectId));
    seedDrinks.forEach((d) => ids.delete(d.id)); // déjà en mémoire, pas besoin de les recharger
    if (ids.size === 0) return;
    loadDrinksByIds([...ids]).then((results) => setDrinksDirectory((prev) => [...prev.filter((d) => !ids.has(d.id)), ...results]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);
  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => {
      if (e.objectType === "venue" && e.objectId) ids.add(e.objectId);
      else if (e.venueId && !SPECIAL_VENUE_LABELS[e.venueId]) ids.add(e.venueId);
    });
    Object.keys(seedVenues).forEach((id) => ids.delete(id));
    if (ids.size === 0) return;
    loadVenuesByIds([...ids]).then((results) => setVenuesById((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v])) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const directories = { venuesById, drinksDirectory, breweriesDirectory: [], brandsDirectory: [] };

  useEffect(() => {
    setEntries(null);
    loadEntityPulse(entityType, entityId, scope).then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
  }, [entityType, entityId, scope]);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    const oldest = entries[entries.length - 1].createdAt;
    const more = await loadEntityPulse(entityType, entityId, scope, oldest);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  };

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  if (viewedProfileCode) {
    return <BibaxProfilePreviewScreen bibroCode={viewedProfileCode} onBack={() => setViewedProfileCode(null)} />;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            style={{
              flex: 1,
              background: scope === s.key ? COLORS.amber : "none",
              color: scope === s.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${scope === s.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "9px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {entries === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : entries.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", margin: 0 }}>
            {scope === "bibax" ? "Aucun de tes Bibax n'a encore publié ici." : "Aucune publication pour l'instant."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry) => (
            <PulseCard
              key={entry.id}
              entry={entry}
              directories={directories}
              myUserId={myUserId}
              myBibroCode={myBibroCode}
              onOpenVenue={onOpenVenue}
              onOpenDrink={onOpenDrink}
              onOpenTagged={(person) => {
                if (person.id === myUserId) goToProfile();
                else if (person.bibro_code) setViewedProfileCode(person.bibro_code);
              }}
              onOpenProfile={entry.actorId === myUserId ? goToProfile : setViewedProfileCode}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
            >
              {loadingMore ? "Chargement..." : "Voir plus"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
