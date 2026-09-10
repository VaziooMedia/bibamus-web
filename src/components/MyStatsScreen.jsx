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
import { loadMyStatsOverview, loadMyVenueRanking, loadMyDrinkRanking, loadVenuesByIds, loadDrinksByIds } from "../data/sharedDirectories.js";
import { formatMoney, buildAlcoholDaysMap } from "../utils.js";

const PERIODS = [
  { key: "all", label: "Toujours", since: null },
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
  },
  { key: "month", label: "Ce mois", since: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  {
    key: "quarter",
    label: "Ce trimestre",
    since: () => {
      const now = new Date();
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterStartMonth, 1);
    },
  },
  { key: "6months", label: "Ces 6 derniers mois", since: () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; } },
  { key: "year", label: "Cette année", since: () => new Date(new Date().getFullYear(), 0, 1) },
];

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

  const [activeCategory, setActiveCategory] = useState("apercu");

  const [overview, setOverview] = useState(null);
  useEffect(() => {
    setOverview(null);
    loadMyStatsOverview(since, null).then(setOverview);
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

  // Classement par Bibax — partagé le plus de tournées avec. Reste basé sur l'historique local
  // des événements (déjà borné à cet utilisateur) — sans lien avec le chantier statistiques
  // serveur, matché par nom/alias puisque les tournées suivent les participants par nom.
  const sharedRoundsByBibroCode = {};
  bibros.forEach((b) => {
    const namesToMatch = [b.name, b.alias].filter(Boolean).map((n) => n.toLowerCase());
    if (namesToMatch.length === 0) return;
    let count = 0;
    events.forEach((ev) => {
      (ev.rounds || []).forEach((r) => {
        if ((r.friends || []).some((f) => namesToMatch.includes((f.name || "").toLowerCase()))) count++;
      });
    });
    if (count > 0) sharedRoundsByBibroCode[b.code] = count;
  });
  const rankedBibrosBySharedRounds = Object.entries(sharedRoundsByBibroCode)
    .map(([code, count]) => ({ bibro: bibros.find((b) => b.code === code), count }))
    .filter((r) => r.bibro)
    .sort((a, b) => b.count - a.count);

  const mostVisitedVenue = venuesByVisits[0];
  const mostSpentVenue = venuesBySpend[0];
  const topBibro = rankedBibrosBySharedRounds[0];

  const recordCards = [
    mostVisitedVenue && { icon: "🏆", label: "Le plus visité", value: venueNames[mostVisitedVenue.venueId] || "…", sub: `${mostVisitedVenue.value} visite${mostVisitedVenue.value > 1 ? "s" : ""}` },
    topBibro && { icon: "🍻", label: "Bu le plus de verres avec", value: topBibro.bibro.alias || topBibro.bibro.name, sub: `${topBibro.count} tournée${topBibro.count > 1 ? "s" : ""} commune${topBibro.count > 1 ? "s" : ""}` },
    mostSpentVenue && { icon: "💶", label: "Le plus dépensé", value: venueNames[mostSpentVenue.venueId] || "…", sub: formatMoney(mostSpentVenue.value, "euro") },
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
          )}
        </>
      )}
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
