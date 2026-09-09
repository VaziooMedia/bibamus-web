// ============================================================
// Écran "Catégories boissons" d'un lieu — même style que
// BibAtlas / Produits (RepertoireHubScreen).
// ============================================================
import React from "react";
import { COLORS, MENU_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ActionCard } from "./ui.jsx";
import { resolveMenuItem } from "../utils.js";

const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");

export function VenueMenuCategoriesScreen({ venue, drinksDirectory = [], onBack, onOpenCategory }) {
  // Le menu tel que stocké ne contient que des références (sourceDrinkId, fromDirectory...),
  // pas le nom/type réel — sans cette résolution, tout retombe dans "Non classé".
  const menu = (venue?.menu || []).map((d) => resolveMenuItem(d, drinksDirectory));
  const categories = [...MENU_CATEGORIES, "Non classé"];

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
          <NavIcon name="book-open" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, lineHeight: 1.1 }}>
          Catégories boissons
        </h1>
      </div>
      {venue?.name && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{venue.name}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {categories.map((cat) => {
          const count = menu.filter((d) => categoryOf(d) === cat).length;
          return (
            <ActionCard
              key={cat}
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title={cat}
              subtitle={count > 0 ? `${count} boisson${count > 1 ? "s" : ""} enregistrée${count > 1 ? "s" : ""}` : "Aucune boisson enregistrée"}
              onClick={() => onOpenCategory && onOpenCategory(cat)}
            />
          );
        })}
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
