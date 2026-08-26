import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { loadEstablishmentOpeningHours } from "../data/sharedDirectories.js";

// Les horaires ne sont jamais saisis dans Bibamus — uniquement affichés depuis Google, avec
// l'attribution requise. Aucun formulaire, aucun bouton d'édition ici.
export function OpeningHoursDisplay({ googlePlaceId }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadEstablishmentOpeningHours(googlePlaceId).then((result) => {
      if (!cancelled) {
        setHours(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [googlePlaceId]);

  if (loading) {
    return <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Chargement des horaires...</p>;
  }

  if (!googlePlaceId || hours?.status === "LINK_REQUIRED" || hours?.status === "LINK_INVALID") {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Horaires indisponibles — la fiche n'est pas encore reliée à Google.</p>
      </div>
    );
  }

  if (hours?.status === "ERROR") {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Horaires momentanément indisponibles.</p>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
      {hours?.isOpenNow != null && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: hours.isOpenNow ? COLORS.amber : "#FF3B4E", display: "inline-block" }} />
          <span style={{ fontWeight: 700, fontSize: "14px", color: hours.isOpenNow ? COLORS.amber : "#FF3B4E" }}>{hours.isOpenNow ? "Ouvert" : "Fermé"}</span>
        </div>
      )}
      {hours?.days?.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {hours.days.map((d) => (
            <div key={d.dayLabel} style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
              <span style={{ color: COLORS.ink }}>{d.dayLabel}</span>
              <span style={{ color: COLORS.inkSoft }}>
                {d.closed ? "Fermé" : d.periods.map((p) => `${p.open}–${p.close || "?"}`).join(", ")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Horaires non communiqués par l'établissement.</p>
      )}
      <p style={{ fontSize: "10.5px", color: COLORS.inkSoft, marginTop: "10px", marginBottom: 0, opacity: 0.7 }}>Horaires fournis par Google</p>
    </div>
  );
}
