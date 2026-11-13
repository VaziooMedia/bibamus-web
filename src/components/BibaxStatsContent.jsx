// ============================================================
// Onglet « Biba360 » d'un autre Bibax — les statistiques qu'il accepte de partager.
//
// Contenu de l'ancien écran « Statistiques de … » (BibroStatsScreen), devenu un onglet (2026-11-13), comme « Mes Statistiques »
// l'est devenu sur Mon Profil : sélecteur de période, puis tuiles de visites, lieux, produits, sorties et records.
// Utilisé par la fiche d'un Bibax confirmé (BibroDetailScreen) et par le profil public (BibaxProfilePreviewScreen).
//
// Chaque bloc n'arrive du serveur que si la personne le partage (fonctions loadBibaxStats*) : un bloc non partagé vaut `null`,
// et quand rien n'est partagé l'onglet l'écrit au lieu de rester vide.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import {
  loadBibaxStatsOverview,
  loadBibaxStatsRecords,
  loadBibaxStatsDrinks,
  loadBibaxStatsVenues,
  loadBibaxStatsSocial,
  loadVenuesByIds,
  loadDrinksByIds,
} from "../data/sharedDirectories.js";
import { PERIODS, MONTH_NAMES } from "./MyStatsScreen.jsx";

export function BibaxStatsContent({ userId, displayName }) {
  const [statsPeriodKey, setStatsPeriodKey] = useState("all");
  const statsPeriod = PERIODS.find((p) => p.key === statsPeriodKey);
  const statsSince = statsPeriod.since ? statsPeriod.since() : null;
  const [sharedOverview, setSharedOverview] = useState(undefined);
  const [sharedRecords, setSharedRecords] = useState(undefined);
  const [sharedDrinks, setSharedDrinks] = useState(undefined);
  const [sharedVenues, setSharedVenues] = useState(undefined);
  const [sharedSocial, setSharedSocial] = useState(undefined);
  const [sharedNames, setSharedNames] = useState({});

  useEffect(() => {
    if (!userId) return;
    loadBibaxStatsOverview(userId, statsSince, null).then(setSharedOverview);
    loadBibaxStatsDrinks(userId, statsSince, null).then(setSharedDrinks);
    loadBibaxStatsVenues(userId, statsSince, null).then(setSharedVenues);
    loadBibaxStatsSocial(userId, statsSince, null).then(setSharedSocial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, statsPeriodKey]);

  // Records : toujours tout l'historique, sans lien avec le sélecteur de période ci-dessus —
  // même comportement que dans Mes Statistiques.
  useEffect(() => {
    if (!userId) return;
    loadBibaxStatsRecords(userId).then(setSharedRecords);
  }, [userId]);

  useEffect(() => {
    const venueIds = [sharedRecords?.mostVisitedVenueId, sharedVenues?.topVenueId].filter(Boolean);
    const drinkIds = [sharedDrinks?.topDrinkId].filter(Boolean);
    if (venueIds.length === 0 && drinkIds.length === 0) return;
    Promise.all([venueIds.length ? loadVenuesByIds(venueIds) : [], drinkIds.length ? loadDrinksByIds(drinkIds) : []]).then(([venues, drinks]) => {
      setSharedNames((prev) => ({
        ...prev,
        ...Object.fromEntries(venues.map((v) => [v.id, v.name])),
        ...Object.fromEntries(drinks.map((d) => [d.id, d.name])),
      }));
    });
  }, [sharedRecords, sharedVenues, sharedDrinks]);

  return (
    <>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", marginBottom: "16px" }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setStatsPeriodKey(p.key)}
            style={{
              background: statsPeriodKey === p.key ? COLORS.amber : COLORS.surface,
              color: statsPeriodKey === p.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${statsPeriodKey === p.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {[sharedOverview, sharedRecords, sharedDrinks, sharedVenues, sharedSocial].every((s) => s === null) && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
          {displayName} ne partage pas encore ses statistiques.
        </p>
      )}

      {sharedOverview && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "Visites", value: sharedOverview.visits },
            { label: "Boissons commandées", value: sharedOverview.drinksOrdered },
            { label: "Produits différents", value: sharedOverview.distinctDrinks },
            { label: "Lieux différents", value: sharedOverview.distinctVenues },
          ].map((t) => (
            <div key={t.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ fontSize: "10.5px", color: COLORS.inkSoft }}>{t.label}</div>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px" }}>{t.value}</div>
            </div>
          ))}
        </div>
      )}

      {sharedVenues && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {sharedVenues.topVenueId && (
            <div style={{ background: COLORS.surfaceAlt, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", color: COLORS.chalkWhite, fontSize: "13px" }}>
              <span>🏠 Son QG</span>
              <strong>{sharedNames[sharedVenues.topVenueId] || "…"}</strong>
            </div>
          )}
          {sharedVenues.distinctCities > 0 && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>Villes différentes visitées</span>
              <strong>{sharedVenues.distinctCities}</strong>
            </div>
          )}
          {sharedVenues.topVenueType && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>Type de lieu préféré</span>
              <strong>{sharedVenues.topVenueType}</strong>
            </div>
          )}
        </div>
      )}

      {sharedDrinks && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {sharedDrinks.topDrinkId && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>🍺 Boisson préférée</span>
              <strong>{sharedNames[sharedDrinks.topDrinkId] || "…"}</strong>
            </div>
          )}
          {sharedDrinks.topCategory && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>Catégorie la plus consommée</span>
              <strong>{sharedDrinks.topCategory}</strong>
            </div>
          )}
        </div>
      )}

      {sharedSocial && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {sharedSocial.distinctBibaxCount > 0 && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>👥 Bibax différents rencontrés</span>
              <strong>{sharedSocial.distinctBibaxCount}</strong>
            </div>
          )}
          {sharedSocial.avgPeoplePerOuting != null && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>Taille moyenne d'une sortie</span>
              <strong>{Math.round(sharedSocial.avgPeoplePerOuting * 10) / 10}</strong>
            </div>
          )}
        </div>
      )}

      {sharedRecords && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            sharedRecords.mostVisitedVenueId && { icon: "🏆", label: "Le plus visité", value: sharedNames[sharedRecords.mostVisitedVenueId] || "…" },
            sharedRecords.maxDrinksPerOuting > 0 && { icon: "🍺", label: "Le plus de boissons en une sortie", value: sharedRecords.maxDrinksPerOuting },
            sharedRecords.maxDistinctDrinksPerOuting > 1 && { icon: "🎲", label: "Le plus de produits différents en une sortie", value: sharedRecords.maxDistinctDrinksPerOuting },
            sharedRecords.maxVenuesPerDay > 1 && { icon: "🗺️", label: "Le plus de lieux en une journée", value: sharedRecords.maxVenuesPerDay },
            sharedRecords.bestMonthYear && { icon: "📅", label: "Mois le plus actif", value: `${MONTH_NAMES[sharedRecords.bestMonthMonth - 1]} ${sharedRecords.bestMonthYear}` },
            sharedRecords.longestStreakDays > 1 && { icon: "🔥", label: "Plus longue série", value: `${sharedRecords.longestStreakDays} jours` },
          ]
            .filter(Boolean)
            .map((r) => (
              <div key={r.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                <span style={{ fontSize: "18px" }}>{r.icon}</span>
                <span style={{ flex: 1 }}>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
