// ============================================================
// Sous-composants de BibaMe — en-tête de profil, suivi
// hebdomadaire (jours sans alcool), contrôle de réinitialisation
// de statistique. Copiés tels quels depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, WEEKDAY_SHORT_MON_FIRST } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon } from "./icons.jsx";
import bibaxIconUrl from "../assets/brand/bibax.svg";
import { formatMemberSince, normalizeUrl, formatDDMMYYYY, computeCurrentStreak, computeLongestAlcoholFreeStreak, formatDate } from "../utils.js";
import { loadMyProfileStats } from "../data/sharedDirectories.js";

export function ProfileHeader({ myName, profile, bibros, checkIns, myUserId, goToBibros, goToProducts, goToVenues }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (myUserId) loadMyProfileStats(myUserId).then(setStats);
  }, [myUserId]);

  const StatCard = ({ icon, label, value, onClick }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "14px",
        padding: "12px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {icon}
        {onClick && (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${COLORS.amber}` }}>
            <NavIcon name="chevron-right" size={10} color={COLORS.amber} />
          </span>
        )}
      </div>
      <span style={{ fontSize: "11px", color: COLORS.inkSoft, lineHeight: 1.2, height: "27px", display: "flex", alignItems: "center" }}>{label}</span>
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", color: COLORS.amber, lineHeight: 1 }}>{value}</span>
    </button>
  );

  return (
    <>
      <div style={{ position: "relative", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "16px", marginTop: "4px", marginBottom: "14px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                border: `2px solid ${COLORS.amber}`,
                padding: "2px",
                flexShrink: 0,
              }}
            >
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={42} color={COLORS.amber} />}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.15, margin: 0 }}>
                {myName} {profile.lastName || ""}
              </h1>
              {profile.nickname && <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13.5px", color: COLORS.amber, margin: "3px 0 0" }}>{profile.nickname}</p>}
              {profile.registeredAt && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "4px 0 0" }}>Membre Bibamus depuis {formatMemberSince(profile.registeredAt)}</p>}
            </div>
          </div>
          {(profile.facebookUrl || profile.instagramUrl || profile.tiktokUrl || profile.snapchatUrl) && (
            <div style={{ position: "absolute", bottom: "0", right: "0", display: "flex", flexDirection: "row", gap: "12px", alignItems: "center" }}>
              {profile.facebookUrl && (
                <a href={normalizeUrl(profile.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <FacebookIcon size={20} />
                </a>
              )}
              {profile.instagramUrl && (
                <a href={normalizeUrl(profile.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <InstagramIcon size={20} />
                </a>
              )}
              {profile.tiktokUrl && (
                <a href={normalizeUrl(profile.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TiktokIcon size={20} />
                </a>
              )}
              {profile.snapchatUrl && (
                <a href={normalizeUrl(profile.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <SnapchatIcon size={20} />
                </a>
              )}
            </div>
          )}
        </div>

        {profile.bio && <p style={{ fontSize: "13px", color: COLORS.ink, fontStyle: "italic", lineHeight: 1.5, margin: "14px 0 0" }}>"{profile.bio}"</p>}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <StatCard icon={<img src={bibaxIconUrl} alt="" style={{ width: "18px", height: "18px" }} />} label="Bibax" value={bibros.length} onClick={goToBibros} />
        <StatCard icon={<NavIcon name="bar-chart" size={18} color={COLORS.amber} />} label="Drink Checks" value={stats ? stats.tastedDrinksCount : "…"} onClick={goToProducts} />
        <StatCard icon={<NavIcon name="map-pin-check" size={18} color={COLORS.amber} />} label="Place Checks" value={stats ? stats.venueCheckinsCount : "…"} onClick={goToVenues} />
      </div>
    </>
  );
}

export function WeekTracker({ alcoholDaysMap, onToggleDay }) {
  const [mode, setMode] = useState("currentWeek");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const currentWeekDays = (() => {
    const dow = today.getDay(); // 0=Sun..6=Sat
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  })();

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const currentMonthDays = (() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const count = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dow = first.getDay(); // 0=Sun..6=Sat
    const leadingBlanks = dow === 0 ? 6 : dow - 1; // Monday-first offset, like a real calendar
    const blanks = Array.from({ length: leadingBlanks }, () => null);
    const realDays = Array.from({ length: count }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
    return [...blanks, ...realDays];
  })();

  const gridDays = mode === "last7Days" ? last7Days : mode === "currentMonth" ? currentMonthDays : currentWeekDays;
  const isGridMode = mode === "currentWeek" || mode === "last7Days" || mode === "currentMonth";

  // The earliest date we actually have any signal for this person — before this, "no data"
  // doesn't mean a gap to fill in, it means Bibamus simply wasn't being used yet.
  const trackedKeys = Object.keys(alcoholDaysMap).sort();
  const trackingStartDate = trackedKeys.length > 0 ? new Date(trackedKeys[0] + "T00:00:00") : today;

  // A flexible range summary — used for the calendar-based aggregate periods (past month, this
  // year, last year) where a day-by-day grid wouldn't be practical on a phone screen. Clipped to
  // trackingStartDate so periods before the person started using the app aren't counted as gaps.
  const rangeSummary = (start, end) => {
    if (end.getTime() < trackingStartDate.getTime()) return { notApplicable: true };
    const effectiveStart = start.getTime() < trackingStartDate.getTime() ? trackingStartDate : start;
    let withAlcohol = 0;
    let withoutAlcohol = 0;
    const cursor = new Date(effectiveStart);
    const cappedEnd = end.getTime() > today.getTime() ? today : end;
    while (cursor <= cappedEnd) {
      const key = toKey(cursor);
      if (key in alcoholDaysMap) {
        if (alcoholDaysMap[key]) withAlcohol++;
        else withoutAlcohol++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const totalDays = Math.round((cappedEnd - effectiveStart) / 86400000) + 1;
    return { withAlcohol, withoutAlcohol, tracked: withAlcohol + withoutAlcohol, totalDays, effectiveStart, clipped: effectiveStart.getTime() > start.getTime() };
  };

  const lastMonthRange = (() => {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start, end };
  })();
  const currentYearRange = { start: new Date(today.getFullYear(), 0, 1), end: today };
  const lastYearRange = { start: new Date(today.getFullYear() - 1, 0, 1), end: new Date(today.getFullYear() - 1, 11, 31) };

  const lastMonthSummary = rangeSummary(lastMonthRange.start, lastMonthRange.end);
  const currentYearSummary = rangeSummary(currentYearRange.start, currentYearRange.end);
  const lastYearSummary = rangeSummary(lastYearRange.start, lastYearRange.end);

  const currentFreeStreak = computeCurrentStreak(alcoholDaysMap, false);
  const longestFreeStreak = computeLongestAlcoholFreeStreak(alcoholDaysMap);

  const modes = [
    { key: "currentWeek", label: "Semaine en cours" },
    { key: "last7Days", label: "7 derniers jours" },
    { key: "currentMonth", label: "Mois en cours" },
    { key: "lastMonth", label: "Mois passé" },
    { key: "currentYear", label: "Année en cours" },
    { key: "lastYear", label: "Année passée" },
  ];

  const monthNamesFr = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  const summaryCard = (summary, fallbackLabel) => {
    if (summary.notApplicable) {
      return (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
          Tu n'utilisais pas encore Bibamus à cette période.
        </p>
      );
    }
    const label = summary.clipped ? `depuis le ${formatDate(toKey(summary.effectiveStart))} (début de ton suivi)` : fallbackLabel;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "38px", color: COLORS.sage, lineHeight: 1 }}>
          {summary.withoutAlcohol} jour{summary.withoutAlcohol !== 1 ? "s" : ""} sans alcool
        </div>
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "6px" }}>
          {label}
          {summary.tracked > 0 && ` (${summary.withAlcohol} avec alcool, ${summary.totalDays - summary.tracked} sans donnée)`}
        </p>
      </div>
    );
  };

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Tes jours avec et sans alcool</div>
        <span style={{ fontSize: "11.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{today.getFullYear()}</span>
      </div>

      {(currentFreeStreak > 0 || longestFreeStreak > 0) && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          {currentFreeStreak > 0 && (
            <div style={{ flex: 1, background: "#16301F", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.sage, lineHeight: 1 }}>
                🔥 {currentFreeStreak}
              </div>
              <div style={{ fontSize: "10.5px", color: COLORS.sage, fontWeight: 700 }}>jour{currentFreeStreak !== 1 ? "s" : ""} d'affilée sans alcool</div>
            </div>
          )}
          {longestFreeStreak > currentFreeStreak && (
            <div style={{ flex: 1, background: COLORS.paperAlt, borderRadius: "12px", padding: "10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.inkSoft, lineHeight: 1 }}>
                🏆 {longestFreeStreak}
              </div>
              <div style={{ fontSize: "10.5px", color: COLORS.inkSoft, fontWeight: 700 }}>record — plus longue série</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              background: mode === m.key ? COLORS.amber : "transparent",
              color: mode === m.key ? COLORS.paper : COLORS.inkSoft,
              border: `2px solid ${mode === m.key ? COLORS.ink : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "lastMonth" && summaryCard(lastMonthSummary, `${monthNamesFr[lastMonthRange.start.getMonth()]} ${lastMonthRange.start.getFullYear()}`)}
      {mode === "currentYear" && summaryCard(currentYearSummary, `depuis le 1er janvier ${today.getFullYear()}`)}
      {mode === "lastYear" && summaryCard(lastYearSummary, `en ${lastYearRange.start.getFullYear()}`)}

      {isGridMode && (
        <>
          {mode === "currentMonth" && (
            <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "10px" }}>
              Touchez un jour non renseigné pour le marquer sans alcool.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {gridDays.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} />;
              const key = toKey(d);
              const isFuture = d.getTime() > today.getTime();
              const isToday = d.getTime() === today.getTime();
              const hasData = key in alcoholDaysMap;
              const hadAlcohol = alcoholDaysMap[key];
              const isManuallyEditable = !isFuture && (!hasData || hadAlcohol === false);
              const dayLetter =
                mode === "currentWeek" ? WEEKDAY_SHORT_MON_FIRST[i] : new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(d).charAt(0).toUpperCase();
              const circle = (
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    background: isFuture ? "transparent" : !hasData ? COLORS.paperAlt : hadAlcohol ? "#3D2C14" : "#16301F",
                    border: isToday ? `2px solid ${COLORS.wine}` : "none",
                    cursor: isManuallyEditable && onToggleDay ? "pointer" : "default",
                  }}
                >
                  {isFuture ? "" : !hasData ? "·" : hadAlcohol ? "🍺" : "✅"}
                </div>
              );
              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: isToday ? COLORS.wine : COLORS.inkSoft }}>{dayLetter}</span>
                  <span style={{ fontSize: "10px", color: COLORS.inkSoft }}>{d.getDate()}</span>
                  {isManuallyEditable && onToggleDay ? (
                    <button onClick={() => onToggleDay(key)} style={{ background: "none", border: "none", padding: 0 }} title="Marquer/démarquer comme sans alcool">
                      {circle}
                    </button>
                  ) : (
                    circle
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function StatResetControl({ field, resetDate, isConfirming, onRequestConfirm, onConfirm, onCancel, dark }) {
  const dimColor = dark ? "rgba(242,239,230,0.55)" : COLORS.inkSoft;
  const linkColor = dark ? COLORS.chalkWhite : COLORS.wine;
  if (isConfirming) {
    return (
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
        <span style={{ fontSize: "9.5px", color: dimColor }}>Sûr ?</span>
        <button onClick={() => onConfirm(field)} style={{ background: "none", border: "none", color: linkColor, fontSize: "9.5px", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
          Oui
        </button>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: dimColor, fontSize: "9.5px", cursor: "pointer", padding: 0 }}>
          Annuler
        </button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: "2px" }}>
      {resetDate && <div style={{ fontSize: "9.5px", color: dimColor }}>Depuis le {formatDDMMYYYY(resetDate)}</div>}
      <button onClick={() => onRequestConfirm(field)} style={{ background: "none", border: "none", color: dimColor, fontSize: "9.5px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
        🔄 Réinitialiser
      </button>
    </div>
  );
}
