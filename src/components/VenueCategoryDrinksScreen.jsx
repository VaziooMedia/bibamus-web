// ============================================================
// Liste, en lecture seule, des boissons d'une catégorie pour un
// lieu donné — ouvert depuis VenueMenuCategoriesScreen.jsx.
// ============================================================
import React from "react";
import { COLORS, SERVING_MODE_LABELS, MENU_CATEGORIES } from "../constants.js";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { resolveMenuItem, formatMoney, drinkTypeLabel, kcalForDrink } from "../utils.js";

const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");

export function VenueCategoryDrinksScreen({ venue, category, drinksDirectory = [], onBack }) {
  const items = (venue?.menu || [])
    .map((d) => resolveMenuItem(d, drinksDirectory))
    .filter((d) => categoryOf(d) === category);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "4px 0 2px 0" }}>{category}</h1>
      {venue?.name && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{venue.name}</p>}

      {items.length === 0 ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune boisson enregistrée dans cette catégorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((d) => {
            const kcalTotal = kcalForDrink(d);
            const bits = [
              d.type ? drinkTypeLabel(d.type) : null,
              d.abv != null ? `${d.abv.toFixed(1)}% ABV` : null,
              d.servingMode ? SERVING_MODE_LABELS[d.servingMode] : null,
              (d.beerTags || []).length ? d.beerTags.join(", ") : null,
              d.brewery || null,
              kcalTotal ? `≈ ${kcalTotal} kcal` : null,
            ].filter(Boolean);
            return (
              <div key={d.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{d.name || "Sans nom"}</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: COLORS.amber, flexShrink: 0 }}>{formatMoney(d.price || 0, venue?.defaultCurrency)}</span>
                </div>
                {bits.length > 0 && <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>{bits.join(" · ")}</p>}
              </div>
            );
          })}
        </div>
      )}
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
