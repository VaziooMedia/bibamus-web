// ============================================================
// Écran "Mes Statistiques" — reconstruit sur la vraie
// consommation (round_orders + solo_checkins + drink_checkins),
// avec un vrai sélecteur de période plutôt que l'ancien système
// de réinitialisation irréversible par compteur.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { WeekTracker } from "./ProfileParts.jsx";
import {
  loadMyStatsOverview,
  loadMyVenueRanking,
  loadMyDrinkRanking,
  loadVenuesByIds,
  loadDrinksByIds,
  loadMyHabits,
  loadMyCategoryRanking,
  loadMyBeerStyleRanking,
  loadMyBrandRanking,
  loadMyBreweryRanking,
  loadMyNewDrinksCount,
  loadMyDrinkPriceStats,
  loadMyVenueTypeRanking,
  loadMyCityCountryStats,
  loadMyNewVenuesCount,
  loadMyVenueSpendAvg,
  loadMyMonthlySpending,
  loadMyExtraRecords,
} from "../data/sharedDirectories.js";
import { formatMoney, buildAlcoholDaysMap } from "../utils.js";

const PERIODS = [
  { key: "all", label: "Toujours", since: null, prevSince: null },
  {
    key: "week",
    label: "Cette semaine",
    since: () => {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1; // jours écoulés depuis lundi
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    prevSince: (s) => {
      const d = new Date(s);
      d.setDate(d.getDate() - 7);
      return d;
    },
    prevLabel: "la semaine dernière",
  },
  {
    key: "month",
    label: "Ce mois",
    since: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    prevSince: (s) => new Date(s.getFullYear(), s.getMonth() - 1, 1),
    prevLabel: "le mois dernier",
  },
  {
    key: "quarter",
    label: "Ce trimestre",
    since: () => {
      const now = new Date();
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterStartMonth, 1);
    },
    prevSince: (s) => new Date(s.getFullYear(), s.getMonth() - 3, 1),
    prevLabel: "le trimestre dernier",
  },
  {
    key: "6months",
    label: "Ces 6 derniers mois",
    since: () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; },
    prevSince: (s) => { const d = new Date(s); d.setMonth(d.getMonth() - 6); return d; },
    prevLabel: "les 6 mois précédents",
  },
  {
    key: "year",
    label: "Cette année",
    since: () => new Date(new Date().getFullYear(), 0, 1),
    prevSince: (s) => new Date(s.getFullYear() - 1, 0, 1),
    prevLabel: "l'année dernière",
  },
];

const WEEKDAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const CATEGORIES = [
  { key: "apercu", label: "Aperçu" },
  { key: "records", label: "Records" },
  { key: "boissons", label: "Boissons" },
  { key: "lieux", label: "Lieux" },
  { key: "depenses", label: "Dépenses" },
  { key: "social", label: "Social" },
];

function StatSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "20px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", marginBottom: open ? "8px" : 0 }}
      >
        <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "14px", fontWeight: 700, color: COLORS.chalkWhite, flex: 1, textAlign: "left" }}>{title}</span>
        <span style={{ color: COLORS.chalkWhite, fontSize: "11px", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
      </button>
      {open && children}
    </div>
  );
}

export function MyStatsScreen({ events, bibros, alcoholFreeDays, onToggleAlcoholFreeDay, onBack, openVenue, openBibro, openDrink }) {
  const [periodKey, setPeriodKey] = useState("all");
  const period = PERIODS.find((p) => p.key === periodKey);
  const since = period.since ? period.since() : null;
  // §10 — période équivalente précédente, pour la comparaison. Pas de comparaison possible pour
  // "Toujours" (pas de point de départ à décaler).
  const prevSince = period.prevSince && since ? period.prevSince(since) : null;
  const prevUntil = since;

  const [activeCategory, setActiveCategory] = useState("apercu");

  const [overview, setOverview] = useState(null);
  useEffect(() => {
    setOverview(null);
    loadMyStatsOverview(since, null).then(setOverview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // §10 — mêmes indicateurs, mais sur la période précédente équivalente, pour la comparaison.
  const [previousOverview, setPreviousOverview] = useState(null);
  const [previousNewDrinksCount, setPreviousNewDrinksCount] = useState(0);
  const [previousNewVenuesCount, setPreviousNewVenuesCount] = useState(0);
  useEffect(() => {
    if (!prevSince) {
      setPreviousOverview(null);
      return;
    }
    loadMyStatsOverview(prevSince, prevUntil).then(setPreviousOverview);
    loadMyNewDrinksCount(prevSince, prevUntil).then(setPreviousNewDrinksCount);
    loadMyNewVenuesCount(prevSince, prevUntil).then(setPreviousNewVenuesCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const [habits, setHabits] = useState(null);
  useEffect(() => {
    loadMyHabits(since, null).then(setHabits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // §5 — Boissons.
  const [categoryRanking, setCategoryRanking] = useState([]);
  const [beerStyleRanking, setBeerStyleRanking] = useState([]);
  const [brandRanking, setBrandRanking] = useState([]);
  const [breweryRanking, setBreweryRanking] = useState([]);
  const [newDrinksCount, setNewDrinksCount] = useState(0);
  const [priceStats, setPriceStats] = useState(null);
  useEffect(() => {
    loadMyCategoryRanking(since, null, 10).then(setCategoryRanking);
    loadMyBeerStyleRanking(since, null, 10).then(setBeerStyleRanking);
    loadMyBrandRanking(since, null, 10).then(setBrandRanking);
    loadMyBreweryRanking(since, null, 10).then(setBreweryRanking);
    loadMyNewDrinksCount(since, null).then(setNewDrinksCount);
    loadMyDrinkPriceStats(since, null).then(setPriceStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // Résolution du nom de la boisson la plus chère — bornée à ce seul identifiant.
  const [maxPriceDrinkName, setMaxPriceDrinkName] = useState(null);
  useEffect(() => {
    if (!priceStats?.maxPriceDrinkId) {
      setMaxPriceDrinkName(null);
      return;
    }
    loadDrinksByIds([priceStats.maxPriceDrinkId]).then((results) => setMaxPriceDrinkName(results[0]?.name || null));
  }, [priceStats]);

  // §6 — Lieux.
  // §8 — évolution des dépenses, toujours sur les 6 derniers mois glissants, sans lien avec la
  // période sélectionnée par ailleurs sur cet écran.
  const [monthlySpending, setMonthlySpending] = useState([]);
  useEffect(() => {
    loadMyMonthlySpending(6).then(setMonthlySpending);
  }, []);

  // §9 — records supplémentaires, toujours sur tout l'historique (un record se bat sur la
  // durée, pas sur la période affichée par ailleurs).
  const [extraRecords, setExtraRecords] = useState(null);
  useEffect(() => {
    loadMyExtraRecords().then(setExtraRecords);
  }, []);

  const [venueTypeRanking, setVenueTypeRanking] = useState([]);
  const [cityCountryStats, setCityCountryStats] = useState({ distinctCities: 0, distinctCountries: 0 });
  const [newVenuesCount, setNewVenuesCount] = useState(0);
  const [venueSpendAvg, setVenueSpendAvg] = useState(null);
  useEffect(() => {
    loadMyVenueTypeRanking(since, null, 10).then(setVenueTypeRanking);
    loadMyCityCountryStats(since, null).then(setCityCountryStats);
    loadMyNewVenuesCount(since, null).then(setNewVenuesCount);
    loadMyVenueSpendAvg(since, null).then(setVenueSpendAvg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const [venuesByVisits, setVenuesByVisits] = useState([]);
  const [venuesBySpend, setVenuesBySpend] = useState([]);
  const [drinksByCount, setDrinksByCount] = useState([]);
  const [drinksBySpend, setDrinksBySpend] = useState([]);
  useEffect(() => {
    loadMyVenueRanking("visits", since, null, 10).then(setVenuesByVisits);
    loadMyVenueRanking("spend_euro", since, null, 10).then(setVenuesBySpend);
    loadMyDrinkRanking("count", since, null, 10).then(setDrinksByCount);
    loadMyDrinkRanking("spend_euro", since, null, 10).then(setDrinksBySpend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // Résolution des noms — bornée aux identifiants présents dans les classements ci-dessus,
  // jamais le répertoire complet.
  const [venueNames, setVenueNames] = useState({});
  useEffect(() => {
    const ids = new Set([...venuesByVisits, ...venuesBySpend].map((r) => r.venueId));
    if (ids.size === 0) return;
    loadVenuesByIds([...ids]).then((results) => setVenueNames((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v.name])) })));
  }, [venuesByVisits, venuesBySpend]);

  const [drinkNames, setDrinkNames] = useState({});
  useEffect(() => {
    const ids = new Set([...drinksByCount, ...drinksBySpend].map((r) => r.drinkId));
    if (ids.size === 0) return;
    loadDrinksByIds([...ids]).then((results) => setDrinkNames((prev) => ({ ...prev, ...Object.fromEntries(results.map((d) => [d.id, d.name])) })));
  }, [drinksByCount, drinksBySpend]);

  // Événements de la période sélectionnée — pour rester cohérent avec le reste de la page, qui
  // filtre déjà tout par période côté serveur.
  const eventsInPeriod = since ? events.filter((e) => e.createdAt >= since.getTime()) : events;

  // Classement par Bibax — partagé le plus de tournées avec. Reste basé sur l'historique local
  // des événements (déjà borné à cet utilisateur) — sans lien avec le chantier statistiques
  // serveur, matché par nom/alias puisque les tournées suivent les participants par nom.
  const sharedRoundsByBibroCode = {};
  const sharedVenuesByBibroCode = {};
  const firstSharedDateByBibroCode = {};
  bibros.forEach((b) => {
    const namesToMatch = [b.name, b.alias].filter(Boolean).map((n) => n.toLowerCase());
    if (namesToMatch.length === 0) return;
    let count = 0;
    const venueIds = new Set();
    let firstDate = null;
    // §7 — la "première fois" se cherche sur tout l'historique, pas seulement la période
    // affichée, sinon un Bibax connu depuis longtemps ressortirait à tort comme "nouveau".
    events.forEach((ev) => {
      const sharesThisEvent = (ev.rounds || []).some((r) => (r.friends || []).some((f) => namesToMatch.includes((f.name || "").toLowerCase())));
      if (sharesThisEvent && ev.venueId && !ev.isHome && ev.venueId !== "@event") venueIds.add(ev.venueId);
      if (sharesThisEvent && (firstDate === null || ev.createdAt < firstDate)) firstDate = ev.createdAt;
      if (eventsInPeriod.includes(ev)) {
        (ev.rounds || []).forEach((r) => {
          if ((r.friends || []).some((f) => namesToMatch.includes((f.name || "").toLowerCase()))) count++;
        });
      }
    });
    if (count > 0) sharedRoundsByBibroCode[b.code] = count;
    if (venueIds.size > 0) sharedVenuesByBibroCode[b.code] = venueIds.size;
    if (firstDate !== null) firstSharedDateByBibroCode[b.code] = firstDate;
  });
  const rankedBibrosBySharedRounds = Object.entries(sharedRoundsByBibroCode)
    .map(([code, count]) => ({ bibro: bibros.find((b) => b.code === code), count }))
    .filter((r) => r.bibro)
    .sort((a, b) => b.count - a.count);
  const rankedBibrosBySharedVenues = Object.entries(sharedVenuesByBibroCode)
    .map(([code, count]) => ({ bibro: bibros.find((b) => b.code === code), count }))
    .filter((r) => r.bibro)
    .sort((a, b) => b.count - a.count);
  const newBibaxMetCount = Object.values(firstSharedDateByBibroCode).filter((d) => (!since || d >= since.getTime()) && d <= Date.now()).length;

  // §7 — nombre moyen de Bibax présents dans un même salon (comptés par prénom, invités sans
  // compte inclus — c'est le nombre de personnes réellement présentes qui compte ici).
  const salonEventsInPeriod = eventsInPeriod.filter((e) => e.salonCode);
  const avgBibaxPerSalon =
    salonEventsInPeriod.length > 0
      ? Math.round(
          (salonEventsInPeriod.reduce((sum, ev) => {
            const names = new Set();
            (ev.rounds || []).forEach((r) => (r.friends || []).forEach((f) => names.add((f.name || "").toLowerCase())));
            return sum + names.size;
          }, 0) /
            salonEventsInPeriod.length) *
            10
        ) / 10
      : null;

  // Salons (BibaRoom) auxquels tu as participé — un même code de salon ne compte qu'une fois.
  const salonsCount = new Set(eventsInPeriod.filter((e) => e.salonCode).map((e) => e.salonCode)).size;

  // Dépense moyenne par sortie et par mois — seulement en euros, pour ne pas mélanger les
  // devises dans une moyenne. "Par mois" n'a de sens que pour une période avec un vrai début
  // (pas "Toujours", où on ne sait pas depuis quand compter).
  const monthsElapsed = since ? Math.max(1, (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : null;

  // §4 — durée moyenne d'une sortie : seuls les événements fermés (avec un vrai début et une
  // vraie fin) comptent — inclut @Home/@Event, ce n'est pas propre aux vraies tournées.
  const closedEventsWithDuration = eventsInPeriod.filter((e) => e.closedAt && e.createdAt);
  const avgOutingDurationMin =
    closedEventsWithDuration.length > 0
      ? Math.round(closedEventsWithDuration.reduce((sum, e) => sum + (e.closedAt - e.createdAt), 0) / closedEventsWithDuration.length / 60000)
      : null;
  const formatDuration = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);

  // §10 — variation par rapport à la période équivalente précédente. "Nouveau" si rien avant et
  // quelque chose maintenant ; rien affiché si les deux valent zéro (comparaison sans intérêt).
  const formatChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "nouveau" : null;
    const pct = Math.round(((current - previous) / previous) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  };

  // §9 — ces deux records se battent sur tout l'historique (pas la période affichée par
  // ailleurs), comme extraRecords côté serveur.
  const allSalonEvents = events.filter((e) => e.salonCode);
  const maxBibaxInOneOuting =
    allSalonEvents.length > 0
      ? Math.max(
          ...allSalonEvents.map((ev) => {
            const names = new Set();
            (ev.rounds || []).forEach((r) => (r.friends || []).forEach((f) => names.add((f.name || "").toLowerCase())));
            return names.size;
          })
        )
      : null;
  const allClosedEvents = events.filter((e) => e.closedAt && e.createdAt);
  const longestOutingDurationMin = allClosedEvents.length > 0 ? Math.round(Math.max(...allClosedEvents.map((e) => e.closedAt - e.createdAt)) / 60000) : null;

  // §6 — "Lieu où tu restes le plus longtemps" — durée moyenne par lieu, depuis les mêmes
  // événements fermés que ci-dessus, groupés par lieu cette fois.
  const durationsByVenue = {};
  closedEventsWithDuration.forEach((e) => {
    if (!e.venueId || e.isHome || e.venueId === "@event") return;
    if (!durationsByVenue[e.venueId]) durationsByVenue[e.venueId] = [];
    durationsByVenue[e.venueId].push(e.closedAt - e.createdAt);
  });
  const venueDurationRanking = Object.entries(durationsByVenue)
    .map(([venueId, durations]) => ({ venueId, avgMin: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60000) }))
    .sort((a, b) => b.avgMin - a.avgMin);
  const longestVenue = venueDurationRanking[0];

  // §8 — plus grosse dépense en une seule sortie (somme des tournées non offertes d'un même
  // événement, en euros — les jetons ne sont pas mélangés dans cette comparaison).
  const biggestOutingSpend = eventsInPeriod.reduce((max, ev) => {
    if (ev.currency !== "euro") return max;
    const total = (ev.rounds || []).filter((r) => !r.offeredBy).reduce((s, r) => s + (r.total || 0), 0);
    return total > max ? total : max;
  }, 0);
  // §9 — même calcul, mais sur tout l'historique, pour le record (pas la période affichée).
  const biggestOutingSpendAllTime = events.reduce((max, ev) => {
    if (ev.currency !== "euro") return max;
    const total = (ev.rounds || []).filter((r) => !r.offeredBy).reduce((s, r) => s + (r.total || 0), 0);
    return total > max ? total : max;
  }, 0);

  const [longestVenueName, setLongestVenueName] = useState(null);
  useEffect(() => {
    if (!longestVenue?.venueId) {
      setLongestVenueName(null);
      return;
    }
    loadVenuesByIds([longestVenue.venueId]).then((results) => setLongestVenueName(results[0]?.name || null));
  }, [longestVenue?.venueId]);

  const mostVisitedVenue = venuesByVisits[0];
  const mostSpentVenue = venuesBySpend[0];
  const topBibro = rankedBibrosBySharedRounds[0];

  const recordCards = [
    mostVisitedVenue && { icon: "🏆", label: "Le plus visité", value: venueNames[mostVisitedVenue.venueId] || "…", sub: `${mostVisitedVenue.value} visite${mostVisitedVenue.value > 1 ? "s" : ""}` },
    topBibro && { icon: "🍻", label: "Bu le plus de verres avec", value: topBibro.bibro.alias || topBibro.bibro.name, sub: `${topBibro.count} tournée${topBibro.count > 1 ? "s" : ""} commune${topBibro.count > 1 ? "s" : ""}` },
    mostSpentVenue && { icon: "💶", label: "Le plus dépensé", value: venueNames[mostSpentVenue.venueId] || "…", sub: formatMoney(mostSpentVenue.value, "euro") },
    extraRecords?.maxDrinksPerOuting && { icon: "🍺", label: "Le plus de boissons en une sortie", value: extraRecords.maxDrinksPerOuting, sub: "verres" },
    extraRecords?.maxDistinctDrinksPerOuting > 1 && { icon: "🎲", label: "Le plus de produits différents en une sortie", value: extraRecords.maxDistinctDrinksPerOuting, sub: "produits" },
    extraRecords?.maxVenuesPerDay > 1 && { icon: "🗺️", label: "Le plus de lieux en une journée", value: extraRecords.maxVenuesPerDay, sub: "lieux" },
    biggestOutingSpendAllTime > 0 && { icon: "💸", label: "Plus grosse dépense en une sortie", value: formatMoney(biggestOutingSpendAllTime, "euro") },
    longestOutingDurationMin != null && { icon: "⏱️", label: "Sortie la plus longue", value: formatDuration(longestOutingDurationMin) },
    maxBibaxInOneOuting > 1 && { icon: "👥", label: "Le plus de monde réuni en une sortie", value: maxBibaxInOneOuting, sub: "personnes" },
    extraRecords?.bestMonthYear && { icon: "📅", label: "Ton mois le plus actif", value: `${MONTH_NAMES[extraRecords.bestMonthMonth - 1]} ${extraRecords.bestMonthYear}`, sub: `${extraRecords.bestMonthDrinks} verres` },
    extraRecords?.longestStreakDays > 1 && { icon: "🔥", label: "Ta plus longue série", value: `${extraRecords.longestStreakDays} jours`, sub: "d'affilée" },
  ].filter(Boolean);

  const hasAnyData = overview && (overview.visits > 0 || overview.drinksOrdered > 0);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 14px 0" }}>
        <NavIcon name="bar-chart" size={20} color={COLORS.amber} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Mes Statistiques</h1>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodKey(p.key)}
            style={{
              background: periodKey === p.key ? COLORS.amber : COLORS.surface,
              color: periodKey === p.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${periodKey === p.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              background: activeCategory === c.key ? COLORS.amber : "none",
              color: activeCategory === c.key ? COLORS.paper : COLORS.inkSoft,
              border: `2px solid ${activeCategory === c.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "7px 14px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!overview ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Chargement...</p>
      ) : !hasAnyData ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>
          Rien pour cette période — tes statistiques apparaîtront ici après tes premières sorties.
        </p>
      ) : (
        <>
          {activeCategory === "apercu" && (
            <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px", marginBottom: "20px" }}>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.55, marginBottom: "12px" }}>TOUS LIEUX CONFONDUS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>VISITES</div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{overview.visits}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>BOISSONS COMMANDÉES</div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{overview.drinksOrdered}</div>
                </div>
              </div>
              {overview.calories > 0 && (
                <div style={{ paddingTop: "12px", borderTop: `2px solid ${COLORS.chalkWhite}30` }}>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>CALORIES BUES</div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.amber }}>≈ {Math.round(overview.calories)} kcal</div>
                </div>
              )}
            </div>
          )}

          {activeCategory === "apercu" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "Produits différents testés", value: overview.distinctDrinks },
                { label: "Lieux différents visités", value: overview.distinctVenues },
                { label: "Salons partagés", value: salonsCount },
                { label: "Bibax rencontrés", value: rankedBibrosBySharedRounds.length },
                overview.moneyEuro > 0 && overview.visits > 0 && { label: "Dépense moyenne / sortie", value: formatMoney(overview.moneyEuro / overview.visits, "euro") },
                overview.moneyEuro > 0 && monthsElapsed && { label: "Dépense moyenne / mois", value: formatMoney(overview.moneyEuro / monthsElapsed, "euro") },
              ]
                .filter(Boolean)
                .map((tile) => (
                  <div key={tile.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "4px" }}>{tile.label}</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px" }}>{tile.value}</div>
                  </div>
                ))}
            </div>
          )}

          {activeCategory === "apercu" && previousOverview && (
            <StatSection title={`Évolution vs ${period.prevLabel || "la période précédente"}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Boissons commandées", current: overview.drinksOrdered, previous: previousOverview.drinksOrdered },
                  { label: "Visites", current: overview.visits, previous: previousOverview.visits },
                  { label: "Argent dépensé", current: overview.moneyEuro, previous: previousOverview.moneyEuro },
                  { label: "Nouveaux produits découverts", current: newDrinksCount, previous: previousNewDrinksCount },
                  { label: "Nouveaux lieux découverts", current: newVenuesCount, previous: previousNewVenuesCount },
                ]
                  .map((m) => ({ ...m, change: formatChange(m.current, m.previous) }))
                  .filter((m) => m.current > 0 || m.previous > 0)
                  .map((m) => (
                    <div key={m.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                      <span>{m.label}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700 }}>{Math.round(m.current)}</span>
                        {m.change && (
                          <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", fontWeight: 700, color: m.change.startsWith("+") || m.change === "nouveau" ? COLORS.amber : COLORS.inkSoft }}>
                            {m.change}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </StatSection>
          )}

          {activeCategory === "apercu" && habits && (habits.topWeekday != null || habits.avgDrinksPerOuting != null || avgOutingDurationMin != null) && (
            <StatSection title="Tes habitudes">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {habits.topWeekday != null && (
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Jour où tu sors le plus</span>
                    <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{WEEKDAY_NAMES[habits.topWeekday]}</span>
                  </div>
                )}
                {habits.topHour != null && (
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Heure la plus active</span>
                    <span style={{ fontWeight: 700 }}>{habits.topHour}h</span>
                  </div>
                )}
                {habits.topMonth != null && (
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Mois le plus actif</span>
                    <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{MONTH_NAMES[habits.topMonth - 1]}</span>
                  </div>
                )}
                {habits.avgDrinksPerOuting != null && (
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Boissons en moyenne par sortie</span>
                    <span style={{ fontWeight: 700 }}>{Number(habits.avgDrinksPerOuting).toFixed(1)}</span>
                  </div>
                )}
                {avgOutingDurationMin != null && (
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Durée moyenne d'une sortie</span>
                    <span style={{ fontWeight: 700 }}>{formatDuration(avgOutingDurationMin)}</span>
                  </div>
                )}
              </div>
            </StatSection>
          )}

          {activeCategory === "depenses" && (overview.moneyEuro > 0 || overview.moneyJeton > 0) && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Argent dépensé — {period.label.toLowerCase()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {overview.moneyEuro > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: COLORS.inkSoft }}>En euros</span>
                    <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif" }}>{formatMoney(overview.moneyEuro, "euro")}</span>
                  </div>
                )}
                {overview.moneyJeton > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: COLORS.inkSoft }}>En jetons</span>
                    <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif" }}>{formatMoney(overview.moneyJeton, "jeton")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === "depenses" && (biggestOutingSpend > 0 || priceStats?.avgPrice != null) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                biggestOutingSpend > 0 && { label: "Plus grosse dépense en une sortie", value: formatMoney(biggestOutingSpend, "euro") },
                priceStats?.avgPrice != null && { label: "Dépense moyenne par boisson", value: formatMoney(priceStats.avgPrice, "euro") },
              ]
                .filter(Boolean)
                .map((tile) => (
                  <div key={tile.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "4px" }}>{tile.label}</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px" }}>{tile.value}</div>
                  </div>
                ))}
            </div>
          )}

          {activeCategory === "depenses" && monthlySpending.some((m) => m.totalEuro > 0) && (
            <StatSection title="Évolution des dépenses (6 derniers mois)">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {monthlySpending.map((m) => (
                  <div key={`${m.year}-${m.month}`} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ textTransform: "capitalize" }}>{MONTH_NAMES[m.month - 1]} {m.year}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700 }}>{formatMoney(m.totalEuro, "euro")}</span>
                  </div>
                ))}
              </div>
            </StatSection>
          )}

          {activeCategory === "apercu" && <WeekTracker alcoholDaysMap={buildAlcoholDaysMap(events, alcoholFreeDays)} onToggleDay={onToggleAlcoholFreeDay} />}

          {activeCategory === "records" && recordCards.length > 0 && (
            <StatSection title="Tes records">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recordCards.map((r) => (
                  <div
                    key={r.label}
                    style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}
                  >
                    <span style={{ fontSize: "22px" }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: "15px", fontWeight: 700 }}>{r.value}</div>
                    </div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", color: COLORS.amberDark, fontWeight: 700 }}>{r.sub}</div>
                  </div>
                ))}
              </div>
            </StatSection>
          )}

          {activeCategory === "boissons" && (
          <>
          <StatSection title="Tes produits préférés">
            {drinksByCount.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien pour cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {drinksByCount.map((r, i) => (
                  <button
                    key={r.drinkId}
                    onClick={() => openDrink && openDrink(r.drinkId)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {drinkNames[r.drinkId] || "…"}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.value} verre{r.value > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </StatSection>

          {(newDrinksCount > 0 || priceStats?.avgPrice != null) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                newDrinksCount > 0 && { label: "Nouveaux produits découverts", value: newDrinksCount },
                priceStats?.avgPrice != null && { label: "Prix moyen payé", value: formatMoney(priceStats.avgPrice, "euro") },
                priceStats?.maxPrice != null && maxPriceDrinkName && { label: "Boisson la plus chère", value: maxPriceDrinkName, sub: formatMoney(priceStats.maxPrice, "euro") },
              ]
                .filter(Boolean)
                .map((tile) => (
                  <div key={tile.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "4px" }}>{tile.label}</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px" }}>{tile.value}</div>
                    {tile.sub && <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", color: COLORS.amberDark, fontWeight: 700, marginTop: "2px" }}>{tile.sub}</div>}
                  </div>
                ))}
            </div>
          )}

          <StatSection title="Répartition par catégorie">
            {categoryRanking.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien pour cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {categoryRanking.map((r, i) => (
                  <div key={r.category} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span><strong>{i + 1}.</strong> {r.category}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.quantity} verre{r.quantity > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </StatSection>

          {beerStyleRanking.length > 0 && (
            <StatSection title="Ton style de bière préféré">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {beerStyleRanking.map((r, i) => (
                  <div key={r.style} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span><strong>{i + 1}.</strong> {r.style}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.quantity} verre{r.quantity > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </StatSection>
          )}

          {brandRanking.length > 0 && (
            <StatSection title="Marques les plus consommées">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {brandRanking.map((r, i) => (
                  <div key={r.brand} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span><strong>{i + 1}.</strong> {r.brand}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.quantity} verre{r.quantity > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </StatSection>
          )}

          {breweryRanking.length > 0 && (
            <StatSection title="Producteurs les plus consommés">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {breweryRanking.map((r, i) => (
                  <div key={r.brewery} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span><strong>{i + 1}.</strong> {r.brewery}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.quantity} verre{r.quantity > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </StatSection>
          )}
          </>
          )}

          {activeCategory === "depenses" && (
          <StatSection title="Produits pour lesquels tu as le plus dépensé">
            {drinksBySpend.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien pour cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {drinksBySpend.map((r, i) => (
                  <button
                    key={r.drinkId}
                    onClick={() => openDrink && openDrink(r.drinkId)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {drinkNames[r.drinkId] || "…"}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.amberDark, fontWeight: 700, fontSize: "13px" }}>{formatMoney(r.value, "euro")}</span>
                  </button>
                ))}
              </div>
            )}
          </StatSection>
          )}

          {activeCategory === "lieux" && (
          <>
          {venuesByVisits[0] && (
            <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "28px" }}>🏠</span>
              <div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.6 }}>TON QG</div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }}>{venueNames[venuesByVisits[0].venueId] || "…"}</div>
                <div style={{ fontSize: "12.5px", opacity: 0.7 }}>{venuesByVisits[0].value} visite{venuesByVisits[0].value > 1 ? "s" : ""}</div>
              </div>
            </div>
          )}

          {(newVenuesCount > 0 || cityCountryStats.distinctCities > 0 || venueSpendAvg != null || longestVenue) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                newVenuesCount > 0 && { label: "Nouveaux établissements découverts", value: newVenuesCount },
                cityCountryStats.distinctCities > 0 && { label: "Villes différentes visitées", value: cityCountryStats.distinctCities },
                cityCountryStats.distinctCountries > 0 && { label: "Pays différents visités", value: cityCountryStats.distinctCountries },
                venueSpendAvg != null && { label: "Dépense moyenne / établissement", value: formatMoney(venueSpendAvg, "euro") },
                longestVenue && longestVenueName && { label: "Où tu restes le plus longtemps", value: longestVenueName, sub: formatDuration(longestVenue.avgMin) },
              ]
                .filter(Boolean)
                .map((tile) => (
                  <div key={tile.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "4px" }}>{tile.label}</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px" }}>{tile.value}</div>
                    {tile.sub && <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", color: COLORS.amberDark, fontWeight: 700, marginTop: "2px" }}>{tile.sub}</div>}
                  </div>
                ))}
            </div>
          )}

          {venueTypeRanking.length > 0 && (
            <StatSection title="Type de lieu le plus fréquenté">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {venueTypeRanking.map((r, i) => (
                  <div key={r.venueType} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span><strong>{i + 1}.</strong> {r.venueType}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.quantity} visite{r.quantity > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </StatSection>
          )}

          <StatSection title="Classement par visites">
            {venuesByVisits.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Aucune visite enregistrée pour cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {venuesByVisits.map((r, i) => (
                  <button
                    key={r.venueId}
                    onClick={() => openVenue(r.venueId)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {venueNames[r.venueId] || "…"}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.value} visite{r.value > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </StatSection>
          </>
          )}

          {activeCategory === "depenses" && (
          <StatSection title="Classement par argent dépensé">
            {venuesBySpend.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien à afficher pour cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {venuesBySpend.map((r, i) => (
                  <button
                    key={r.venueId}
                    onClick={() => openVenue(r.venueId)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {venueNames[r.venueId] || "…"}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.amberDark, fontWeight: 700, fontSize: "13px" }}>{formatMoney(r.value, "euro")}</span>
                  </button>
                ))}
              </div>
            )}
          </StatSection>
          )}

          {activeCategory === "social" && (
          <>
          {rankedBibrosBySharedRounds[0] && (
            <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "28px" }}>🍻</span>
              <div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.6 }}>TON COMPAGNON DE SORTIE N°1</div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }}>{rankedBibrosBySharedRounds[0].bibro.alias || rankedBibrosBySharedRounds[0].bibro.name}</div>
                <div style={{ fontSize: "12.5px", opacity: 0.7 }}>{rankedBibrosBySharedRounds[0].count} tournée{rankedBibrosBySharedRounds[0].count > 1 ? "s" : ""} commune{rankedBibrosBySharedRounds[0].count > 1 ? "s" : ""}</div>
              </div>
            </div>
          )}

          {(newBibaxMetCount > 0 || avgBibaxPerSalon != null) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                newBibaxMetCount > 0 && { label: "Nouveaux Bibax rencontrés", value: newBibaxMetCount },
                avgBibaxPerSalon != null && { label: "Bibax en moyenne par salon", value: avgBibaxPerSalon },
              ]
                .filter(Boolean)
                .map((tile) => (
                  <div key={tile.label} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "4px" }}>{tile.label}</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px" }}>{tile.value}</div>
                  </div>
                ))}
            </div>
          )}

          {rankedBibrosBySharedVenues.length > 0 && (
            <StatSection title="Avec qui tu visites le plus de lieux différents">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {rankedBibrosBySharedVenues.map((r, i) => (
                  <button
                    key={r.bibro.code}
                    onClick={() => openBibro && openBibro(r.bibro.code)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {r.bibro.alias || r.bibro.name}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.count} lieu{r.count > 1 ? "x" : ""}</span>
                  </button>
                ))}
              </div>
            </StatSection>
          )}

          <StatSection title="Classement par Bibax">
            {rankedBibrosBySharedRounds.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien à afficher pour l'instant.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {rankedBibrosBySharedRounds.map((r, i) => (
                  <button
                    key={r.bibro.code}
                    onClick={() => openBibro && openBibro(r.bibro.code)}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
                  >
                    <span><strong>{i + 1}.</strong> {r.bibro.alias || r.bibro.name}</span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>{r.count} tournée{r.count > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </StatSection>
          </>
          )}
        </>
      )}
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
