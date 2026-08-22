// ============================================================
// Autocomplétion de ville selon le pays choisi — copiée telle
// quelle depuis le prototype Claude.
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS, CITIES_BY_COUNTRY } from "../constants.js";
import { normalizeForSearch } from "../utils.js";

export function CityAutocomplete({ value, onChange, country, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const cityList = CITIES_BY_COUNTRY[country] || [];
  const q = normalizeForSearch(value.trim());
  const suggestions = q.length > 0 ? cityList.filter((c) => normalizeForSearch(c).startsWith(q)).slice(0, 6) : [];

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={style}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% - 10px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            zIndex: 30,
            overflow: "hidden",
          }}
        >
          {suggestions.map((c) => (
            <button
              key={c}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: "13.5px" }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
