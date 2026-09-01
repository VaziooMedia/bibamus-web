import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { loadPulseFeed, togglePulseBix } from "../data/sharedDirectories.js";

// Résout l'objet concerné (produit/établissement/marque/producteur) depuis les répertoires déjà
// chargés en mémoire — jamais de duplication de la donnée métier dans BibaPulse lui-même,
// uniquement une référence (object_type/object_id) vers la vraie fiche.
function resolveObject(entry, directories) {
  if (!entry.objectType || !entry.objectId) return null;
  const map = { venue: directories.venues, drink: directories.drinksDirectory, producer: directories.breweriesDirectory, brand: directories.brandsDirectory };
  return (map[entry.objectType] || []).find((x) => x.id === entry.objectId) || null;
}

// Gabarit textuel par type d'événement — jamais de phrase figée stockée en base, uniquement
// reconstruite ici à partir des données structurées (prêt pour une traduction future).
function pulseEventText(entry, obj) {
  const name = <strong>{entry.actorName || "Quelqu'un"}</strong>;
  const objName = obj?.name || "une fiche";
  switch (entry.eventType) {
    case "product_discovered":
      return <>{name} vient de découvrir {objName}</>;
    case "venue_visit":
      return <>{name} est passé·e chez {objName}</>;
    case "database_contribution":
      return <>{name} a ajouté {objName} à Bibamus</>;
    default:
      return <>{name} a une nouvelle activité</>;
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export function BibaPulseScreen({ onBack, venues = [], drinksDirectory = [], breweriesDirectory = [], brandsDirectory = [], onOpenVenue, onOpenDrink }) {
  const [entries, setEntries] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const directories = { venues, drinksDirectory, breweriesDirectory, brandsDirectory };

  useEffect(() => {
    loadPulseFeed().then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
  }, []);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    const oldest = entries[entries.length - 1].createdAt;
    const more = await loadPulseFeed(oldest);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  };

  const handleBix = (entry) => {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, iBixed: !e.iBixed, bixCount: e.iBixed ? e.bixCount - 1 : e.bixCount + 1 } : e)));
    togglePulseBix(entry.id, entry.iBixed);
  };

  const openObject = (entry, obj) => {
    if (!obj) return;
    if (entry.objectType === "venue" && onOpenVenue) onOpenVenue(obj.id);
    if (entry.objectType === "drink" && onOpenDrink) onOpenDrink(obj.id);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <NavIcon name="heart" size={32} color={COLORS.amber} filled />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Pulse</span>
        </h1>
      </div>

      {entries === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : entries.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", margin: 0 }}>
            Aucune activité pour l'instant. Suivez d'autres Bibax ou attendez vos premières découvertes !
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry) => {
            const obj = resolveObject(entry, directories);
            const photo = obj?.profilePhotoUrl || obj?.photoUrl || obj?.albumArt || null;
            return (
              <div key={entry.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <EntityAvatar photoUrl={entry.actorAvatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13.5px", color: COLORS.ink, lineHeight: 1.3 }}>{pulseEventText(entry, obj)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>{timeAgo(entry.createdAt)}</p>
                  </div>
                </div>

                {obj && (
                  <button
                    onClick={() => openObject(entry, obj)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      background: COLORS.surfaceAlt,
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                      marginBottom: "10px",
                    }}
                  >
                    {photo && <img src={photo} alt="" style={{ width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0, objectFit: "cover" }} />}
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{obj.name}</span>
                  </button>
                )}

                <button
                  onClick={() => handleBix(entry)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    background: entry.iBixed ? COLORS.amber : "none",
                    border: `2px solid ${COLORS.amber}`,
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: entry.iBixed ? COLORS.paper : COLORS.amber,
                    cursor: "pointer",
                  }}
                >
                  <NavIcon name="heart" size={13} color={entry.iBixed ? COLORS.paper : COLORS.amber} filled={entry.iBixed} />
                  {entry.bixCount}
                </button>
              </div>
            );
          })}

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
