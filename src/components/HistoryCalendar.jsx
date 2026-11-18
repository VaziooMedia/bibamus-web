// Calendrier de « Mon Historique » (Mon Profil) : une petite carte-calendrier d'un mois pour retrouver un jour plus vite que de faire défiler la liste.
// Les jours qui ont de l'activité sont des ronds vert fluo pleins (on les touche) ; les autres jours sont grisés et ne se touchent pas ; le jour en cours a un contour vert.
// Un « jour » est une période de 6 h → 6 h, comme les barres de l'historique : une activité de 2 h du matin appartient au jour d'avant. Les jours sont écrits « AAAA-MM-JJ » (jour du téléphone).
// Mois précédent / suivant par les flèches, bornés au premier jour d'activité et au mois en cours. Semaine du lundi au dimanche.
//   activeDays : Set des jours avec de l'activité ; todayDay : le jour en cours ; minDay / maxDay : le premier jour d'activité et le dernier jour affiché ;
//   loading : les jours se lisent encore (pas de grille) ; busy : l'historique se charge jusqu'au jour touché (grille grisée, plus rien ne se touche) ;
//   error ("days" : les jours n'ont pas pu être lus ; "jump" : l'historique n'a pas pu être chargé jusqu'au jour touché) / onRetry ; onPick(jour) : un jour touché.
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

export const dayKeyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthIndexOf = (day) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;

export function HistoryCalendar({ activeDays, todayDay, minDay, maxDay, loading = false, busy = false, error = null, onRetry, onPick }) {
  const lastMonth = monthIndexOf(maxDay);
  const firstMonth = Math.min(monthIndexOf(minDay), lastMonth);
  const [month, setMonth] = useState(lastMonth);
  const year = Math.floor(month / 12);
  const monthInYear = month % 12;
  const daysInMonth = new Date(year, monthInYear + 1, 0).getDate();
  const leading = (new Date(year, monthInYear, 1).getDay() + 6) % 7; // lundi = 0
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const arrow = (dir) => {
    const target = month + dir;
    const disabled = target < firstMonth || target > lastMonth;
    return (
      <button
        type="button"
        data-calendar-arrow={dir < 0 ? "prev" : "next"}
        aria-label={dir < 0 ? "Mois précédent" : "Mois suivant"}
        disabled={disabled}
        onClick={() => setMonth(target)}
        style={{ background: "none", border: "none", padding: "6px 10px", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.25 : 1, display: "inline-flex", transform: dir < 0 ? "rotate(180deg)" : "none" }}
      >
        <NavIcon name="chevron-right" size={16} color={COLORS.amber} />
      </button>
    );
  };

  return (
    <div data-history-calendar>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        {arrow(-1)}
        <span data-calendar-month style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "15px", color: COLORS.ink }}>
          {MONTHS_FR[monthInYear]} {year}
        </span>
        {arrow(1)}
      </div>
      {loading ? (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", margin: "28px 0" }}>Chargement de ton historique...</p>
      ) : error === "days" ? (
        <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "24px 0" }}>
          Impossible de lire les jours.{" "}
          <button type="button" onClick={onRetry} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
            Réessayer
          </button>
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: "4px", justifyItems: "center", opacity: busy ? 0.5 : 1 }}>
            {WEEKDAYS_INITIALS.map((w, i) => (
              <span key={i} style={{ fontSize: "10.5px", fontWeight: 700, color: COLORS.inkSoft, padding: "2px 0 4px" }}>
                {w}
              </span>
            ))}
            {cells.map((n, i) => {
              if (n === null) return <span key={`b${i}`} />;
              const day = `${year}-${String(monthInYear + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
              const active = activeDays.has(day);
              const today = day === todayDay;
              return (
                <button
                  key={day}
                  type="button"
                  data-calendar-day={day}
                  data-calendar-active={active ? "1" : "0"}
                  disabled={!active || busy}
                  onClick={() => onPick(day)}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: today ? `1.5px solid ${COLORS.amber}` : "1.5px solid transparent",
                    background: active ? COLORS.amber : "none",
                    color: active ? COLORS.paper : COLORS.inkSoft,
                    opacity: active ? 1 : 0.45,
                    fontSize: "13px",
                    fontWeight: active ? 800 : 600,
                    cursor: active ? "pointer" : "default",
                    padding: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {error === "jump" ? (
            <p data-calendar-error style={{ fontSize: "11.5px", color: "#FF3B3B", textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}>
              Impossible de charger l'historique jusqu'à ce jour.{" "}
              <button type="button" onClick={onRetry} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "11.5px" }}>
                Réessayer
              </button>
            </p>
          ) : (
            <p data-calendar-legend style={{ fontSize: "10.5px", color: COLORS.inkSoft, textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}>
              {busy ? "Chargement de ton historique..." : "Les jours en vert ont de l'activité (jour de 6 h à 6 h)."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
