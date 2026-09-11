// ============================================================
// "Ton année Bibamus" (§11 du document de réflexion — Wrapped).
// Un carrousel de cartes plein écran plutôt qu'un onglet de plus
// dans Mes Statistiques — format visuellement différent, pensé
// pour être capturé en screenshot. Pas encore d'export image
// automatique (une vraie brique technique séparée) — juste un
// résultat déjà présentable tel quel.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { loadMyStatsOverview, loadMyVenueRanking, loadMyDrinkRanking, loadMyMonthlyDrinks, loadVenuesByIds, loadDrinksByIds } from "../data/sharedDirectories.js";
import { formatMoney } from "../utils.js";

const MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function WrappedScreen({ onBack, openVenue, openDrink, openBibro, bibros, events }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setCardIndex(0);
    const since = new Date(year, 0, 1);
    const until = new Date(year + 1, 0, 1);

    Promise.all([loadMyStatsOverview(since, until), loadMyVenueRanking("visits", since, until, 1), loadMyDrinkRanking("count", since, until, 1), loadMyMonthlyDrinks(year)]).then(
      async ([overview, topVenues, topDrinks, monthlyDrinks]) => {
        const topVenue = topVenues[0];
        const topDrink = topDrinks[0];
        const [venueName, drinkName] = await Promise.all([
          topVenue ? loadVenuesByIds([topVenue.venueId]).then((r) => r[0]?.name || null) : null,
          topDrink ? loadDrinksByIds([topDrink.drinkId]).then((r) => r[0]?.name || null) : null,
        ]);
        const bestMonth = monthlyDrinks.reduce((best, m) => (m.quantity > (best?.quantity || 0) ? m : best), null);

        // Ton Bibax de l'année — même calcul que le classement social de Mes Statistiques,
        // mais borné à cette seule année.
        const yearEvents = events.filter((e) => e.createdAt >= since.getTime() && e.createdAt < until.getTime());
        const sharedByCode = {};
        bibros.forEach((b) => {
          const names = [b.name, b.alias].filter(Boolean).map((n) => n.toLowerCase());
          if (names.length === 0) return;
          let count = 0;
          yearEvents.forEach((ev) => (ev.rounds || []).forEach((r) => { if ((r.friends || []).some((f) => names.includes((f.name || "").toLowerCase()))) count++; }));
          if (count > 0) sharedByCode[b.code] = count;
        });
        const topBibro = Object.entries(sharedByCode)
          .map(([code, count]) => ({ bibro: bibros.find((b) => b.code === code), count }))
          .filter((r) => r.bibro)
          .sort((a, b) => b.count - a.count)[0];

        setData({
          overview,
          topVenue: topVenue && venueName ? { ...topVenue, name: venueName } : null,
          topDrink: topDrink && drinkName ? { ...topDrink, name: drinkName } : null,
          bestMonth: bestMonth && bestMonth.quantity > 0 ? bestMonth : null,
          topBibro: topBibro || null,
        });
        setLoading(false);
      }
    );
  }, [year]);

  const hasAnyData = data && data.overview.drinksOrdered > 0;

  const cards = data
    ? [
        { key: "intro", bg: COLORS.surfaceAlt, accent: COLORS.amber, emoji: "🎉", title: `Ton année Bibamus`, big: String(year), sub: null },
        data.bestMonth && { key: "month", bg: COLORS.surfaceAlt, accent: COLORS.bobYellow, emoji: "📅", title: "Ton mois de folie", big: `${MONTH_NAMES[data.bestMonth.month - 1]}`, sub: `${data.bestMonth.quantity} boisson${data.bestMonth.quantity > 1 ? "s" : ""}` },
        data.topVenue && { key: "venue", bg: COLORS.surfaceAlt, accent: COLORS.amber, emoji: "🏠", title: "Ton QG", big: data.topVenue.name, sub: `${data.topVenue.value} visite${data.topVenue.value > 1 ? "s" : ""}`, onClick: () => openVenue(data.topVenue.venueId) },
        data.topDrink && { key: "drink", bg: COLORS.surfaceAlt, accent: COLORS.jetonFluo, emoji: "🍺", title: "Ta boisson de l'année", big: data.topDrink.name, sub: `${data.topDrink.value} verre${data.topDrink.value > 1 ? "s" : ""}`, onClick: () => openDrink(data.topDrink.drinkId) },
        data.topBibro && { key: "bibro", bg: COLORS.surfaceAlt, accent: COLORS.wine, emoji: "🍻", title: "Ton Bibax de l'année", big: data.topBibro.bibro.alias || data.topBibro.bibro.name, sub: `${data.topBibro.count} sortie${data.topBibro.count > 1 ? "s" : ""} ensemble`, onClick: () => openBibro && openBibro(data.topBibro.bibro.code) },
        data.overview.distinctVenues > 0 && { key: "explorer", bg: COLORS.surfaceAlt, accent: COLORS.sage, emoji: "🗺️", title: "Explorateur", big: String(data.overview.distinctVenues), sub: `établissement${data.overview.distinctVenues > 1 ? "s" : ""} différent${data.overview.distinctVenues > 1 ? "s" : ""} visité${data.overview.distinctVenues > 1 ? "s" : ""}` },
        {
          key: "recap",
          bg: COLORS.surfaceAlt,
          accent: COLORS.amber,
          emoji: "✨",
          title: "En résumé",
          big: null,
          recap: [
            { label: "Boissons commandées", value: data.overview.drinksOrdered },
            { label: "Visites", value: data.overview.visits },
            data.overview.moneyEuro > 0 && { label: "Dépensé", value: formatMoney(data.overview.moneyEuro, "euro") },
          ].filter(Boolean),
        },
      ].filter(Boolean)
    : [];

  const card = cards[cardIndex];

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 14px 0" }}>
        <span style={{ fontSize: "20px" }}>🎉</span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Ton année Bibamus</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
        <button onClick={() => setYear((y) => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }} aria-label="Année précédente">
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
          </span>
        </button>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }}>{year}</span>
        <button
          onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
          disabled={year >= currentYear}
          style={{ background: "none", border: "none", cursor: year >= currentYear ? "default" : "pointer", padding: "4px", opacity: year >= currentYear ? 0.3 : 1 }}
          aria-label="Année suivante"
        >
          <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
        </button>
      </div>

      {loading ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", textAlign: "center" }}>Chargement...</p>
      ) : !hasAnyData ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", textAlign: "center" }}>Rien à raconter pour {year} — essaie une autre année, ou reviens plus tard !</p>
      ) : (
        <>
          <button
            onClick={card.onClick}
            disabled={!card.onClick}
            style={{
              background: card.bg,
              border: `2px solid ${card.accent}`,
              borderRadius: "20px",
              padding: "40px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: "320px",
              cursor: card.onClick ? "pointer" : "default",
              width: "100%",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "44px", marginBottom: "16px" }}>{card.emoji}</span>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12.5px", letterSpacing: "1.5px", color: COLORS.chalkWhite, opacity: 0.6, marginBottom: "10px" }}>{card.title.toUpperCase()}</span>
            {card.recap ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                {card.recap.map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: COLORS.chalkWhite }}>
                    <span style={{ opacity: 0.7 }}>{r.label}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: card.accent }}>{r.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.chalkWhite, lineHeight: 1.2 }}>{card.big}</span>
                {card.sub && <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "15px", color: card.accent, fontWeight: 700, marginTop: "8px" }}>{card.sub}</span>}
              </>
            )}
          </button>

          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "20px" }}>
            {cards.map((c, i) => (
              <button
                key={c.key}
                onClick={() => setCardIndex(i)}
                aria-label={`Carte ${i + 1}`}
                style={{ width: "8px", height: "8px", borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === cardIndex ? COLORS.amber : COLORS.paperAlt }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
              disabled={cardIndex === 0}
              style={{ flex: 1, padding: "13px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontWeight: 700, fontSize: "14px", cursor: cardIndex === 0 ? "default" : "pointer", opacity: cardIndex === 0 ? 0.4 : 1 }}
            >
              ← Précédent
            </button>
            <button
              onClick={() => setCardIndex((i) => Math.min(cards.length - 1, i + 1))}
              disabled={cardIndex === cards.length - 1}
              style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "14px", cursor: cardIndex === cards.length - 1 ? "default" : "pointer", opacity: cardIndex === cards.length - 1 ? 0.4 : 1 }}
            >
              Suivant →
            </button>
          </div>
        </>
      )}
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
