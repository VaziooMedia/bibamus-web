// ============================================================
// Liste, en lecture seule, des boissons d'une catégorie pour un
// lieu donné — ouvert depuis VenueMenuCategoriesScreen.jsx.
// ============================================================
import React from "react";
import { COLORS, SERVING_MODE_LABELS, MENU_CATEGORIES } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, PageFooterNav, EntityAvatar } from "./ui.jsx";
import { GlutenFreeIcon } from "./DrinkDisplay.jsx";
import { resolveMenuItem, formatMoney } from "../utils.js";

const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");

const badgeStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: COLORS.amberDark,
  background: COLORS.paperAlt,
  borderRadius: "5px",
  padding: "1px 5px",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

export function VenueCategoryDrinksScreen({ venue, category, drinksDirectory = [], onBack, onOpenDrink }) {
  const items = (venue?.menu || [])
    .map((d) => resolveMenuItem(d, drinksDirectory))
    .filter((d) => categoryOf(d) === category);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "4px 0 2px 0", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
        {category}
      </h1>
      {venue?.name && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{venue.name}</p>}

      {items.length === 0 ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune boisson enregistrée dans cette catégorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((d) => {
            const isZeroAbv = d.abv != null && d.abv <= 0.5;
            const priceText = formatMoney(d.price || 0, venue?.defaultCurrency);
            // Sépare le nombre du symbole/mot de devise pour styler ce dernier plus petit et grisé.
            const priceParts = priceText.split(" ");
            const priceSymbol = priceParts.pop();
            const priceNumber = priceParts.join(" ");
            const canOpenDrink = d.fromDirectory && d.sourceDrinkId && onOpenDrink;

            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
                <EntityAvatar size={44} fallbackIcon="bottle" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{d.name || "Sans nom"}</span>
                    {d.volumeCl && <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>{d.volumeCl}cl.</span>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px", flexWrap: "wrap" }}>
                    {d.servingMode === "fut" && <span style={badgeStyle}>On Tap</span>}
                    {isZeroAbv && <span style={badgeStyle}>0.0%</span>}
                    {d.bio && <span style={badgeStyle}>🌱 BIO</span>}
                    {d.glutenFree && (
                      <span style={{ ...badgeStyle, padding: "3px", display: "inline-flex", alignItems: "center" }}>
                        <GlutenFreeIcon size={11} />
                      </span>
                    )}
                    {d.nationality && <CountryFlagImg country={d.nationality} size={16} style={{ border: "1px solid rgba(255,255,255,0.8)" }} />}
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber }}>
                        {priceNumber} <span style={{ fontSize: "10.5px", fontWeight: 600, color: COLORS.inkSoft }}>{priceSymbol}</span>
                      </span>
                      {canOpenDrink && (
                        <button onClick={() => onOpenDrink(d.sourceDrinkId)} style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer" }}>
                          <NavIcon name="chevron-right" size={15} color={COLORS.inkSoft} />
                        </button>
                      )}
                    </span>
                  </div>

                  {(d.abv != null || d.brewery) && (
                    <p style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>
                      {d.abv != null && <span>{d.abv.toFixed(1)}% ABV</span>}
                      {d.abv != null && d.brewery && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                      {d.brewery && <span>{d.brewery}</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
