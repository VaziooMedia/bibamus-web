// Sélecteur de pays des listes classées par « Pays » (DrinkChecks, PlaceChecks, les trois listes de Mes Produits) : une liste déroulante pour ne garder qu'un pays.
// Fermé, un champ court (190 px) en pastille fine à contour vert (comme les pastilles de catégories) : « Tous les pays » (contour seul) ou le pays choisi (drapeau + nom, pastille pleine) et un chevron à droite.
// Ouvert, une carte sous le champ : « Tous les pays » puis les pays de la liste, de A à Z (« Pays non renseigné » à la fin), chacun avec son drapeau, son nom et, à droite, son nombre d'éléments
// en vert fluo ; le pays choisi est en vert fluo. Toucher une ligne choisit et ferme ; toucher à côté (ou Échap) ferme sans rien changer.
//   options : [{ country, label, count }] (voir `countryOptions` de CheckListParts.jsx ; `country` vaut "" pour « Pays non renseigné ») ;
//   value   : le pays choisi, ou null pour « Tous les pays » ; total : le nombre d'éléments, tous pays confondus ; onChange(country | null).
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { FINE_PILL } from "./PillTabs.jsx";
import { hasFlag } from "./DrinkRowParts.jsx";

// Le champ est court (il ne prend pas toute la largeur : décidé par Mehdi, 2026-11-17, « inutilement longue ») et garde la même largeur quel que soit le pays choisi ; la carte de la liste est un peu plus large que lui.
const TRIGGER_WIDTH = "190px";
const PANEL_WIDTH = "240px";

const flagOf = (country) => (country && hasFlag(country) ? <CountryFlagImg country={country} size={16} /> : null);

export function CountryPicker({ options, value, total, onChange }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chosen = value === null ? null : options.find((o) => o.country === value);
  const choose = (country) => {
    onChange(country);
    setOpen(false);
  };
  const row = (key, flag, label, count, selected, onPick, first = false) => (
    <button
      key={key}
      type="button"
      data-country-option={key}
      onClick={onPick}
      style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "none", border: "none", borderTop: first ? "none" : `1px solid ${COLORS.paperAlt}`, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ width: "16px", display: "inline-flex", justifyContent: "center" }}>{flag}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 700, color: selected ? COLORS.amber : COLORS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber }}>{count}</span>
    </button>
  );

  return (
    <div data-country-picker style={{ position: "relative", marginBottom: "16px" }}>
      <button
        type="button"
        data-country-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: TRIGGER_WIDTH,
          maxWidth: "100%",
          boxSizing: "border-box",
          background: chosen ? COLORS.amber : "none",
          border: `${FINE_PILL.borderWidth} solid ${COLORS.amber}`,
          borderRadius: "999px",
          padding: "3px 12px",
          fontSize: FINE_PILL.fontSize,
          fontWeight: 700,
          color: chosen ? COLORS.paper : COLORS.ink,
          cursor: "pointer",
        }}
      >
        {chosen && flagOf(chosen.country)}
        <span style={{ flex: 1, textAlign: "left" }}>{chosen ? chosen.label : "Tous les pays"}</span>
        <span style={{ display: "inline-flex", transform: open ? "rotate(-90deg)" : "rotate(90deg)" }}>
          <NavIcon name="chevron-right" size={12} color={chosen ? COLORS.paper : COLORS.amber} />
        </span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
          <div
            role="listbox"
            data-country-list
            style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: PANEL_WIDTH, maxWidth: "100%", zIndex: 30, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
          >
            <div style={{ maxHeight: "min(320px, 50dvh)", overflowY: "auto" }}>
              {row("all", null, "Tous les pays", total, value === null, () => choose(null), true)}
              {options.map((o) => row(o.country || "none", flagOf(o.country), o.label, o.count, value === o.country, () => choose(o.country)))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
