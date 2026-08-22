// ============================================================
// Petits composants d'affichage liés aux produits — badges,
// icône "sans gluten", badge BibaZERO. Copiés tels quels depuis
// le prototype Claude.
// ============================================================
import React from "react";
import { COLORS, COUNTRY_FLAGS, GLUTEN_BIO_ELIGIBLE_TYPES, NATIONALITY_ELIGIBLE_TYPES, NON_ALCOHOLIC_DRINK_TYPES } from "../constants.js";
import { FlagIcon } from "./icons.jsx";

export function GlutenFreeIcon({ size = 14, color = COLORS.amberDark, title = "Sans gluten" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M12 21V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 9c0-2.5-1.8-3.5-3.5-3.5C10.2 5.5 12 6.5 12 9zM12 9c0-2.5 1.8-3.5 3.5-3.5C13.8 5.5 12 6.5 12 9z
           M12 12.5c0-2.5-1.8-3.5-3.5-3.5 1.7 0 3.5 1 3.5 3.5zM12 12.5c0-2.5 1.8-3.5 3.5-3.5-1.7 0-3.5 1-3.5 3.5z
           M12 16c0-2.5-1.8-3.5-3.5-3.5 1.7 0 3.5 1 3.5 3.5zM12 16c0-2.5 1.8-3.5 3.5-3.5-1.7 0-3.5 1-3.5 3.5z"
        fill={color}
      />
      <path d="M4 4l16 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DrinkBadges({ drink, onTagClick, size = 11 }) {
  const items = [];
  const isInherentlyNonAlcoholic = NON_ALCOHOLIC_DRINK_TYPES.includes(drink.type);
  if (NATIONALITY_ELIGIBLE_TYPES.includes(drink.type) && drink.nationality && COUNTRY_FLAGS[drink.nationality]) {
    items.push({
      key: "country",
      label: <FlagIcon flag={COUNTRY_FLAGS[drink.nationality]} size={size + 4} />,
      icon: true,
      title: drink.nationality,
      filter: { kind: "nationality", value: drink.nationality },
    });
  }
  if (!isInherentlyNonAlcoholic && drink.abv != null && drink.abv <= 0.5) {
    items.push({ key: "zero", label: "0.0%", title: "Sans alcool (≤ 0,5%)", filter: { kind: "zero" } });
  }
  if (isInherentlyNonAlcoholic && drink.abv != null && drink.abv > 0.5) {
    items.push({ key: "alcoholic", label: "Alc.", title: "Contient de l'alcool, contrairement à la plupart des produits de cette catégorie", filter: { kind: "alcoholic" } });
  }
  if (GLUTEN_BIO_ELIGIBLE_TYPES.includes(drink.type) && drink.glutenFree) {
    items.push({ key: "gf", label: <GlutenFreeIcon size={size + 3} color={COLORS.amberDark} />, icon: true, title: "Sans gluten", filter: { kind: "glutenFree" } });
  }
  if (GLUTEN_BIO_ELIGIBLE_TYPES.includes(drink.type) && drink.bio) {
    items.push({ key: "bio", label: "🌱 BIO", title: "Bio", filter: { kind: "bio" } });
  }
  if (items.length === 0) return null;

  const badgeStyle = {
    fontSize: `${size}px`,
    fontWeight: 700,
    color: COLORS.amberDark,
    background: COLORS.paperAlt,
    borderRadius: "5px",
    padding: "1px 5px",
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  };

  return (
    <>
      {items.map((it) => {
        const style = it.icon
          ? { ...badgeStyle, padding: "3px", display: "inline-flex", alignItems: "center", justifyContent: "center" }
          : it.key === "alcoholic"
          ? { ...badgeStyle, color: "#fff", background: COLORS.wine }
          : badgeStyle;
        return onTagClick ? (
          <button
            key={it.key}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(drink.type, it.filter);
            }}
            title={it.title}
            style={{ ...style, border: "none", cursor: "pointer" }}
          >
            {it.label}
          </button>
        ) : (
          <span key={it.key} title={it.title} style={style}>
            {it.label}
          </span>
        );
      })}
    </>
  );
}

export const BobBadge = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: COLORS.amber,
      color: COLORS.paperAlt,
      fontFamily: "'Urbanist', sans-serif",
      fontWeight: 900,
      fontSize: "12px",
      letterSpacing: "0.5px",
      border: `2px solid ${COLORS.amber}`,
      borderRadius: "5px",
      padding: "2px 7px",
      lineHeight: 1.3,
    }}
  >
    ZERO
  </span>
);
