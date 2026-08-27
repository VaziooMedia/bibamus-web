import React from "react";

const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
];

// Crée les options par tranche de 30 minutes, de 00:00 à 23:30.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const fieldStyle = { padding: "6px 8px", borderRadius: "6px", border: "2px solid #28405C", fontSize: "12.5px", background: "#0D1B2A" };

export function OpeningHoursEditor({ value, onChange }) {
  const days = value?.days || {};
  const openOnHolidays = !!value?.openOnHolidays;

  const setDay = (dayKey, patch) => {
    onChange({ ...value, days: { ...days, [dayKey]: { ...(days[dayKey] || { open: false, from: "11:00", to: "23:00" }), ...patch } } });
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
        {DAYS.map((d) => {
          const day = days[d.key] || { open: false, from: "11:00", to: "23:00" };
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", width: "92px", flexShrink: 0, cursor: "pointer" }}>
                <input type="checkbox" checked={day.open} onChange={(e) => setDay(d.key, { open: e.target.checked })} />
                {d.label}
              </label>
              {day.open ? (
                <>
                  <select value={day.from} onChange={(e) => setDay(d.key, { from: e.target.value })} style={fieldStyle}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: "#8792A6", fontSize: "12px" }}>à</span>
                  <select value={day.to} onChange={(e) => setDay(d.key, { to: e.target.value })} style={fieldStyle}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <span style={{ color: "#8792A6", fontSize: "12px" }}>Fermé</span>
              )}
            </div>
          );
        })}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
        <input type="checkbox" checked={openOnHolidays} onChange={(e) => onChange({ ...value, openOnHolidays: e.target.checked })} />
        Ouvert les jours fériés
      </label>
    </div>
  );
}
