import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { loadEstablishmentOpeningHours } from "../data/sharedDirectories.js";
import { NavIcon } from "./icons.jsx";

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Un jour d'ouverture pour un bar/resto peut se terminer aux petites heures du matin. Google
// découpe toujours par jour calendaire (00:00-23:59), ce qui coupe artificiellement une soirée
// en deux périodes distinctes : la fin de nuit réapparaît comme une period du lendemain (ex.
// mercredi "09:00–01:00" + jeudi "00:00–01:00", qui est en réalité la même soirée). On regroupe
// ici selon une "journée d'exploitation" 07:00→06:59 : toute period qui commence avant 07:00
// appartient en fait à la soirée de la veille.
function regroupIntoBusinessDays(days) {
  if (!days || days.length === 0) return days;
  const n = days.length;
  const earlyByDay = days.map((d) => (d.periods || []).filter((p) => timeToMinutes(p.open) < 7 * 60));
  const regularByDay = days.map((d) => (d.periods || []).filter((p) => timeToMinutes(p.open) >= 7 * 60));

  return days.map((d, i) => {
    const nextEarly = earlyByDay[(i + 1) % n];
    let periods = [...regularByDay[i]];
    if (nextEarly.length > 0) {
      if (periods.length > 0) {
        const last = { ...periods[periods.length - 1], close: nextEarly[nextEarly.length - 1].close };
        periods = [...periods.slice(0, -1), last];
      } else {
        periods = nextEarly;
      }
    }
    return { ...d, periods, closed: periods.length === 0 };
  });
}

// Les horaires ne sont jamais saisis dans Bibamus — uniquement affichés depuis Google, avec
// l'attribution requise. Aucun formulaire, aucun bouton d'édition ici.
export function OpeningHoursDisplay({ googlePlaceId, noGooglePresence, noFixedHours }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  if (noFixedHours) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Pas d'horaire fixe — fonctionne sur réservation ou événementiel.</p>
      </div>
    );
  }

  if (noGooglePresence) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Horaires non disponibles — cet établissement n'a pas de fiche Google.</p>
      </div>
    );
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

  if (hours?.closedPermanently) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: "#FF3B4E", fontWeight: 700, margin: 0 }}>Cet établissement est indiqué comme fermé définitivement sur Google.</p>
      </div>
    );
  }

  if (hours?.closedTemporarily) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontWeight: 700, margin: 0 }}>Cet établissement est indiqué comme fermé temporairement sur Google.</p>
      </div>
    );
  }

  const businessDays = hours?.days ? regroupIntoBusinessDays(hours.days) : hours?.days;
  const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const todayName = DAY_NAMES_FR[new Date().getDay()];
  const todayEntry = businessDays?.find((d) => d.dayLabel?.toLowerCase().startsWith(todayName)) || null;

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", cursor: "pointer" }}
    >
      {hours?.isOpenNow != null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: hours.isOpenNow ? COLORS.amber : COLORS.redFluo, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: hours.isOpenNow ? COLORS.amber : COLORS.redFluo }}>{hours.isOpenNow ? "Ouvert" : "Fermé"}</span>
            {!expanded && todayEntry && (
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>
                — {todayEntry.closed ? "toute la journée" : todayEntry.periods.map((p) => `${p.open}–${p.close || "?"}`).join(", ")}
              </span>
            )}
          </div>
          <span style={{ display: "flex", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
          </span>
        </div>
      )}
      {expanded && (
        <>
          {businessDays?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
              {businessDays.map((d) => (
                <div key={d.dayLabel} style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                  <span style={{ color: COLORS.ink }}>{d.dayLabel}</span>
                  <span style={{ color: COLORS.inkSoft }}>
                    {d.closed ? "Fermé" : d.periods.map((p) => `${p.open}–${p.close || "?"}`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "10px 0 0" }}>Horaires non communiqués par l'établissement.</p>
          )}
          <p style={{ fontSize: "10.5px", color: COLORS.inkSoft, marginTop: "10px", marginBottom: 0, opacity: 0.7 }}>Horaires fournis par Google</p>
        </>
      )}
    </div>
  );
}
