// ============================================================
// Écran "Mes Statistiques" — copié tel quel depuis le prototype
// Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EyeOffIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { ProfileHeader, WeekTracker, StatResetControl } from "./ProfileParts.jsx";
import { formatMoney, kcalForDrink, isAlcoholicDrink, realMoneySpentFor, realMoneySpentSince, buildAlcoholDaysMap } from "../utils.js";

export function MyStatsScreen({ venues: rawVenues, events, myName, profile, bibros, checkIns, alcoholFreeDays, onToggleAlcoholFreeDay, drinksDirectory, onResetStatField, onResetMoney, onBack, openVenue, openBibro }) {
  const [confirmingReset, setConfirmingReset] = useState(null); // which field is pending confirmation

  // Un établissement fraîchement créé (ou jamais visité) peut avoir des statistiques
  // incomplètes ou absentes — on garantit ici une forme complète avant tout calcul, pour
  // éviter le même plantage que sur la fiche détaillée d'un établissement.
  const venues = (rawVenues || []).map((v) => ({
    ...v,
    stats: {
      visits: 0,
      drinksOrdered: 0,
      caloriesTotal: 0,
      personalDrinksByType: {},
      ...(v.stats || {}),
      moneySpent: { euro: 0, jeton: 0, ...((v.stats && v.stats.moneySpent) || {}) },
    },
  }));

  // "counts as" resolution mirrors the app-level tallyNameFor — a mix (e.g. Mazout) tallies under
  // its linked base drink's name if one is set, otherwise under its own.
  const tallyNameFor = (drink) => {
    if (drink.countsAsDrinkId) {
      const linked = (drinksDirectory || []).find((d) => d.id === drink.countsAsDrinkId);
      if (linked) return linked.name;
    }
    return drink.name;
  };

  const resetDates = profile.statsResetDates || {};

  // Venues carry their own running stats, updated live as rounds happen — but @Home and @Event
  // sessions have no venueId to attach stats to, so their personal orders are recomputed here
  // directly from the event's own data instead of being silently invisible. Each poste respects
  // its own reset cutoff independently, using the timestamps already stored on rounds/orders.
  const noVenueEvents = events.filter((e) => !e.venueId);
  const noVenueTotals = noVenueEvents.reduce(
    (acc, ev) => {
      const rounds = ev.rounds || [];
      const orders = ev.personalOrders || [];
      const hasVisit = rounds.some((r) => !resetDates.visits || r.timestamp >= resetDates.visits) || orders.some((o) => !resetDates.visits || o.timestamp >= resetDates.visits);
      if (hasVisit) acc.visits += 1;
      acc.drinksOrdered += rounds
        .filter((r) => !resetDates.drinksOrdered || r.timestamp >= resetDates.drinksOrdered)
        .reduce((s, r) => s + (r.orders || []).length, 0);
      rounds
        .filter((r) => !r.offeredBy && (!resetDates.money || (r.createdAt || r.timestamp) >= resetDates.money))
        .forEach((r) => {
          const key = ev.currency === "jeton" ? "moneyJeton" : "moneyEuro";
          acc[key] += r.total || 0;
        });
      orders.forEach((o) => {
        const drink = (ev.menu || []).find((d) => d.id === o.drinkId);
        if (!drink) return;
        if (!resetDates.calories || o.timestamp >= resetDates.calories) acc.calories += kcalForDrink(drink);
        if (!resetDates.personalDrinks || o.timestamp >= resetDates.personalDrinks) {
          const key = tallyNameFor(drink);
          acc.drinksByName[key] = (acc.drinksByName[key] || 0) + 1;
        }
      });
      return acc;
    },
    { visits: 0, drinksOrdered: 0, calories: 0, drinksByName: {}, moneyEuro: 0, moneyJeton: 0 }
  );

  const totals = venues.reduce(
    (acc, v) => {
      acc.visits += v.stats.visits;
      acc.drinksOrdered += v.stats.drinksOrdered;
      acc.moneyEuro += v.stats.moneySpent.euro || 0;
      acc.moneyJeton += v.stats.moneySpent.jeton || 0;
      acc.calories += v.stats.caloriesTotal || 0;
      acc.personalDrinks += Object.values(v.stats.personalDrinksByType || {}).reduce((s, n) => s + n, 0);
      return acc;
    },
    { visits: noVenueTotals.visits, drinksOrdered: noVenueTotals.drinksOrdered, moneyEuro: noVenueTotals.moneyEuro, moneyJeton: noVenueTotals.moneyJeton, calories: noVenueTotals.calories, personalDrinks: 0 }
  );
  totals.personalDrinks += Object.values(noVenueTotals.drinksByName).reduce((s, n) => s + n, 0);

  const withVisits = venues.filter((v) => v.stats.visits > 0);
  const mostVisited = withVisits.length ? [...withVisits].sort((a, b) => b.stats.visits - a.stats.visits)[0] : null;
  const withCalories = venues.filter((v) => (v.stats.caloriesTotal || 0) > 0);
  const mostCaloric = withCalories.length ? [...withCalories].sort((a, b) => b.stats.caloriesTotal - a.stats.caloriesTotal)[0] : null;

  // Same breakdown as a venue's own "par boisson" list, just summed across every venue (plus
  // @Home/@Event sessions, computed above) — includes anything counted via "Compte comme".
  const drinksByNameAllVenues = { ...noVenueTotals.drinksByName };
  venues.forEach((v) => {
    Object.entries(v.stats.personalDrinksByType || {}).forEach(([name, n]) => {
      if (n > 0) drinksByNameAllVenues[name] = (drinksByNameAllVenues[name] || 0) + n;
    });
  });
  const rankedDrinksByName = Object.entries(drinksByNameAllVenues).sort((a, b) => b[1] - a[1]);

  const rankedVenues = venues.filter((v) => v.stats.visits > 0).sort((a, b) => b.stats.visits - a.stats.visits);

  // Real money spent per venue, computed from event history (includes jeton purchases converted to €).
  const venueMoneyMap = {};
  events.forEach((ev) => {
    if (!ev.venueId) return;
    venueMoneyMap[ev.venueId] = (venueMoneyMap[ev.venueId] || 0) + realMoneySpentFor(ev);
  });
  const rankedVenuesByMoney = venues
    .map((v) => ({ ...v, _realMoney: venueMoneyMap[v.id] || 0 }))
    .filter((v) => v._realMoney > 0)
    .sort((a, b) => b._realMoney - a._realMoney);
  const mostSpentVenue = rankedVenuesByMoney.length ? rankedVenuesByMoney[0] : null;

  // Shared rounds per Bibax — matched by name/alias against each round's participant list,
  // since rounds track participants by name, not by Bibax code.
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
  const topBibroEntry = Object.entries(sharedRoundsByBibroCode).sort((a, b) => b[1] - a[1])[0];
  const topBibro = topBibroEntry ? bibros.find((b) => b.code === topBibroEntry[0]) : null;
  const topBibroCount = topBibroEntry ? topBibroEntry[1] : 0;
  const rankedBibrosBySharedRounds = Object.entries(sharedRoundsByBibroCode)
    .map(([code, count]) => ({ bibro: bibros.find((b) => b.code === code), count }))
    .filter((r) => r.bibro)
    .sort((a, b) => b.count - a.count);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const lastMonthRef = new Date(curYear, curMonth - 1, 1);
  const lastMonthYear = lastMonthRef.getFullYear();
  const lastMonthNum = lastMonthRef.getMonth();
  const lastYear = curYear - 1;
  const moneyBuckets = { total: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, lastYear: 0 };
  const totalTips = events.reduce((sum, ev) => {
    const passes = (ts) => !resetDates.money || (ts != null && ts >= resetDates.money);
    const eventTip = passes(ev.createdAt) ? ev.tip || 0 : 0;
    const roundTips = (ev.rounds || []).filter((r) => passes(r.timestamp)).reduce((s, r) => s + (r.tip || 0), 0);
    return sum + eventTip + roundTips;
  }, 0);

  events.forEach((ev) => {
    const amount = realMoneySpentSince(ev, resetDates.money);
    if (!amount) return;
    moneyBuckets.total += amount;
    if (!ev.date) return;
    const d = new Date(ev.date + "T00:00:00");
    const y = d.getFullYear();
    const m = d.getMonth();
    if (y === curYear) {
      moneyBuckets.thisYear += amount;
      if (m === curMonth) moneyBuckets.thisMonth += amount;
    }
    if (y === lastMonthYear && m === lastMonthNum) moneyBuckets.lastMonth += amount;
    if (y === lastYear) moneyBuckets.lastYear += amount;
  });

  const moneyPeriodRows = [
    { label: "Total", value: moneyBuckets.total },
    { label: "Mois en cours", value: moneyBuckets.thisMonth },
    { label: "Mois passé", value: moneyBuckets.lastMonth },
    { label: "Année en cours", value: moneyBuckets.thisYear },
    { label: "Année passée", value: moneyBuckets.lastYear },
  ];

  const recordCards = [
    mostVisited && { icon: "🏆", label: "Le plus visité", value: mostVisited.name, sub: `${mostVisited.stats.visits} visite${mostVisited.stats.visits > 1 ? "s" : ""}` },
    topBibro && {
      icon: "🍻",
      label: "Bu le plus de verres avec",
      value: topBibro.alias || topBibro.name,
      sub: `${topBibroCount} tournée${topBibroCount > 1 ? "s" : ""} commune${topBibroCount > 1 ? "s" : ""}`,
      private: true,
    },
    mostSpentVenue && { icon: "💶", label: "Le plus dépensé", value: mostSpentVenue.name, sub: formatMoney(mostSpentVenue._realMoney, "euro"), private: true },
    mostCaloric && { icon: "🔥", label: "Le plus calorique", value: mostCaloric.name, sub: `≈ ${Math.round(mostCaloric.stats.caloriesTotal)} kcal`, private: true },
  ].filter(Boolean);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>MES STATISTIQUES</span>

      <ProfileHeader myName={myName} profile={profile} bibros={bibros} checkIns={checkIns} />

      <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "34px", margin: "0 0 14px 0", lineHeight: 1 }}>Tous lieux confondus</h2>

      {venues.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>
          Pas encore de lieu enregistré — tes statistiques apparaîtront ici une fois que tu en auras ajouté.
        </p>
      ) : (
        <>
          <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px", marginBottom: "20px" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.55, marginBottom: "12px" }}>TOUS LIEUX CONFONDUS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>VISITES</div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{totals.visits}</div>
                <StatResetControl
                  field="visits"
                  resetDate={resetDates.visits}
                  isConfirming={confirmingReset === "visits"}
                  onRequestConfirm={setConfirmingReset}
                  onConfirm={(f) => {
                    onResetStatField(f);
                    setConfirmingReset(null);
                  }}
                  onCancel={() => setConfirmingReset(null)}
                  dark
                />
              </div>
              <div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>BOISSONS COMMANDÉES</div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{totals.drinksOrdered}</div>
                <StatResetControl
                  field="drinksOrdered"
                  resetDate={resetDates.drinksOrdered}
                  isConfirming={confirmingReset === "drinksOrdered"}
                  onRequestConfirm={setConfirmingReset}
                  onConfirm={(f) => {
                    onResetStatField(f);
                    setConfirmingReset(null);
                  }}
                  onCancel={() => setConfirmingReset(null)}
                  dark
                />
              </div>
            </div>
            {(totals.calories > 0 || totals.personalDrinks > 0 || resetDates.calories || resetDates.personalDrinks) && (
              <div style={{ paddingTop: "12px", borderTop: `2px solid ${COLORS.chalkWhite}30` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>VERRES PERSONNELS</div>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.amber }}>{totals.personalDrinks}</div>
                    <StatResetControl
                      field="personalDrinks"
                      resetDate={resetDates.personalDrinks}
                      isConfirming={confirmingReset === "personalDrinks"}
                      onRequestConfirm={setConfirmingReset}
                      onConfirm={(f) => {
                        onResetStatField(f);
                        setConfirmingReset(null);
                      }}
                      onCancel={() => setConfirmingReset(null)}
                      dark
                    />
                  </div>
                  {totals.calories > 0 && (
                    <div>
                      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>CALORIES BUES</div>
                      <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.amber }}>≈ {Math.round(totals.calories)} kcal</div>
                      <StatResetControl
                        field="calories"
                        resetDate={resetDates.calories}
                        isConfirming={confirmingReset === "calories"}
                        onRequestConfirm={setConfirmingReset}
                        onConfirm={(f) => {
                          onResetStatField(f);
                          setConfirmingReset(null);
                        }}
                        onCancel={() => setConfirmingReset(null)}
                        dark
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(rankedDrinksByName.length > 0 || resetDates.personalDrinks) && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Tes verres, par boisson — tous lieux confondus</div>
              {rankedDrinksByName.length === 0 ? (
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: 0, marginBottom: "8px" }}>Rien depuis la réinitialisation.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                  {rankedDrinksByName.map(([name, n]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span>{name}</span>
                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700 }}>{n}</span>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: "10.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "6px" }}>Partage le même compteur que "Verres personnels" ci-dessus.</p>
              <StatResetControl
                field="personalDrinks"
                resetDate={resetDates.personalDrinks}
                isConfirming={confirmingReset === "personalDrinks-list"}
                onRequestConfirm={() => setConfirmingReset("personalDrinks-list")}
                onConfirm={(f) => {
                  onResetStatField(f);
                  setConfirmingReset(null);
                }}
                onCancel={() => setConfirmingReset(null)}
              />
            </div>
          )}

          {(moneyBuckets.total > 0 || resetDates.money) && (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px" }}>Argent dépensé</div>
              <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "10px" }}>Jetons convertis en € au moment de l'achat. Pourboires inclus dans le total.</p>
              {moneyBuckets.total === 0 ? (
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: 0, marginBottom: "8px" }}>Rien depuis la réinitialisation.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {moneyPeriodRows.map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: COLORS.inkSoft }}>{row.label}</span>
                      <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif" }}>{formatMoney(row.value, "euro")}</span>
                    </div>
                  ))}
                </div>
              )}
              {totalTips > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
                  <span style={{ color: COLORS.inkSoft }}>💶 Dont pourboires donnés</span>
                  <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif", color: COLORS.amberDark }}>{formatMoney(totalTips, "euro")}</span>
                </div>
              )}
              <div style={{ marginTop: "10px" }}>
                <StatResetControl
                  field="money"
                  resetDate={resetDates.money}
                  isConfirming={confirmingReset === "money"}
                  onRequestConfirm={setConfirmingReset}
                  onConfirm={() => {
                    onResetMoney();
                    setConfirmingReset(null);
                  }}
                  onCancel={() => setConfirmingReset(null)}
                />
              </div>
            </div>
          )}

          <WeekTracker alcoholDaysMap={buildAlcoholDaysMap(events, alcoholFreeDays)} onToggleDay={onToggleAlcoholFreeDay} />

          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>TES RECORDS</div>
          {recordCards.some((r) => r.private) && (
            <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <EyeOffIcon size={12} /> = privé, jamais visible par tes Bibax
            </p>
          )}
          {recordCards.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", marginBottom: "20px" }}>Rien pour l'instant — ça viendra après tes premières sorties !</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {recordCards.map((r) => (
                <div
                  key={r.label}
                  style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontSize: "22px" }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                      {r.label}
                      {r.private && <EyeOffIcon size={13} />}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{r.value}</div>
                  </div>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", color: COLORS.amberDark, fontWeight: 700 }}>{r.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>CLASSEMENT PAR VISITES</div>
          {rankedVenues.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", marginBottom: "20px" }}>Aucune visite enregistrée pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {rankedVenues.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => openVenue(v.id)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                  }}
                >
                  <span>
                    <strong>{i + 1}.</strong> {v.name}
                  </span>
                  <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>
                    {v.stats.visits} visite{v.stats.visits !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
            CLASSEMENT PAR ARGENT DÉPENSÉ
          </div>
          {rankedVenuesByMoney.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", marginBottom: "20px" }}>Rien à afficher pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rankedVenuesByMoney.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => openVenue(v.id)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                  }}
                >
                  <span>
                    <strong>{i + 1}.</strong> {v.name}
                  </span>
                <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.amberDark, fontWeight: 700, fontSize: "13px" }}>
                    {formatMoney(v._realMoney, "euro")}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>CLASSEMENT PAR BIBAX</div>
          {rankedBibrosBySharedRounds.length === 0 ? (
            <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic" }}>Rien à afficher pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rankedBibrosBySharedRounds.map((r, i) => (
                <button
                  key={r.bibro.code}
                  onClick={() => openBibro && openBibro(r.bibro.code)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                  }}
                >
                  <span>
                    <strong>{i + 1}.</strong> {r.bibro.alias || r.bibro.name}
                  </span>
                  <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>
                    {r.count} tournée{r.count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
