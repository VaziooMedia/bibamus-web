// ============================================================
// Écran "Carte" (catégories de boissons) d'un lieu.
// ============================================================
import React from "react";
import { COLORS, MENU_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { resolveMenuItem } from "../utils.js";
import carteIconUrl from "../assets/brand/carte.svg";

const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");

export function VenueMenuCategoriesScreen({ venue, drinksDirectory = [], onBack, onOpenCategory }) {
  // Le menu tel que stocké ne contient que des références (sourceDrinkId, fromDirectory...),
  // pas le nom/type réel — sans cette résolution, tout retombe dans "Non classé".
  const menu = (venue?.menu || []).map((d) => resolveMenuItem(d, drinksDirectory));
  const categoriesWithCount = [...MENU_CATEGORIES, "Non classé"]
    .map((cat) => ({ cat, count: menu.filter((d) => categoryOf(d) === cat).length }))
    .filter(({ count }) => count > 0);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: COLORS.paperAlt,
            flexShrink: 0,
          }}
        >
          <img src={carteIconUrl} alt="" style={{ width: "22px", height: "22px" }} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: 0, lineHeight: 1 }}>Carte</h1>
      </div>
      {venue?.name && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{venue.name}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {categoriesWithCount.map(({ cat, count }) => (
          <button
            key={cat}
            onClick={() => onOpenCategory && onOpenCategory(cat)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{cat}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>{count}</span>
              <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
            </span>
          </button>
        ))}
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
