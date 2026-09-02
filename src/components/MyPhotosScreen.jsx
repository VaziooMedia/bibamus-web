import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader } from "./ui.jsx";
import { loadMyMediaAssets, deleteMyMediaAsset } from "../data/sharedDirectories.js";

// Galerie personnelle — agrège les photos déjà envoyées par l'utilisateur (Stories, contributions
// de fiches) via media_assets, sans dupliquer aucun stockage. Les photos de Stories restent
// consultables ici même après l'expiration de 24h de la Story elle-même.
export function MyPhotosScreen({ onBack }) {
  const [photos, setPhotos] = useState(null);
  const [viewedId, setViewedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMyMediaAssets().then(setPhotos);
  }, []);

  const viewed = photos?.find((p) => p.id === viewedId) || null;

  const handleDelete = async () => {
    if (!viewed) return;
    setDeleting(true);
    await deleteMyMediaAsset(viewed.id);
    setPhotos((prev) => prev.filter((p) => p.id !== viewed.id));
    setDeleting(false);
    setViewedId(null);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0", color: COLORS.ink }}>Mes Photos</h1>

      {photos === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : photos.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: 0 }}>Aucune photo pour l'instant. Vos Stories et vos contributions à la Database apparaîtront ici.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewedId(p.id)}
              style={{ aspectRatio: "1", background: COLORS.surfaceAlt, border: "none", borderRadius: "8px", padding: 0, cursor: "pointer", overflow: "hidden" }}
            >
              <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      {viewed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px" }}>
            <button onClick={() => setViewedId(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer" }}>
              ✕
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <img src={viewed.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: `2px solid ${COLORS.wine}`,
                borderRadius: "999px",
                padding: "10px 20px",
                fontSize: "13.5px",
                fontWeight: 700,
                color: COLORS.wine,
                cursor: "pointer",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              <NavIcon name="trash" size={16} color={COLORS.wine} />
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
