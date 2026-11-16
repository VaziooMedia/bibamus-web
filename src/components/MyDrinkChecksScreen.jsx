// « DrinkChecks » (Mon Profil) — la liste des produits que la personne a déjà checkés : un produit une seule fois, par défaut du plus récemment checké au plus ancien,
// avec à droite son nombre de DrinkChecks. Mêmes lignes et mêmes classements que « PlaceChecks » (CheckListParts.jsx) ; la ligne de détails ne porte que le sous-type du produit.
// Au-dessus des quatre classements, une rangée de pastilles de catégories (Tout, Bières & Cidres, Vins & Bulles…, seules les catégories non vides) :
// elle ne garde que les produits d'une catégorie, et le classement choisi s'applique à ce qui reste.
// Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Les identifiants viennent de la fonction `get_my_drink_checks` (script bibamus-sql-mes-drinkchecks-1-liste), puis les produits par `loadDrinksByIds`.
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { loadMyDrinkChecks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { PillTabs, FINE_PILL } from "./PillTabs.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { CHECK_SORTS, arrangeChecks, CheckGroup, CheckRow } from "./CheckListParts.jsx";

const SORT_FIELDS = { nameOf: (x) => x.drink.name, countOf: (x) => x.checks, countryOf: (x) => (x.drink.nationality && x.drink.nationality !== "Non renseigné" ? x.drink.nationality : "") };
const hasFlag = (country) => !!COUNTRY_ISO_CODES[country] || country === "International" || country === "Autre";

const categoryOf = (x) => x.drink.type || "Autres";

// La rangée de catégories : une pastille par catégorie (« Tout » d'abord), contour vert fin, de la même taille que les pastilles des classements (FINE_PILL) ; celle qui est choisie est pleine. Un trait fin court au-dessus de la rangée,
// comme au-dessus des classements de PillTabs (qui apporte lui-même le trait en dessous).
function CategoryChips({ chips, active, onChange }) {
  return (
    <div>
      <div style={{ height: "1px", background: COLORS.paperAlt, marginBottom: "10px" }} />
      <div data-check-categories style={{ display: "flex", flexWrap: "nowrap", gap: "8px", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "none" }}>
        {chips.map((c) => {
          const on = active === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key)}
              aria-pressed={on}
              style={{ background: on ? COLORS.amber : "none", border: `${FINE_PILL.borderWidth} solid ${COLORS.amber}`, borderRadius: "999px", padding: FINE_PILL.padding, fontSize: FINE_PILL.fontSize, fontWeight: 700, color: on ? COLORS.paper : COLORS.ink, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MyDrinkChecksScreen({ onBack, onOpenDrink }) {
  const [items, setItems] = useState(null); // null = chargement ; [{ drinkId, checks, lastAt }]
  const [drinksById, setDrinksById] = useState({});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState("recent");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyDrinkChecks().then(async (list) => {
      if (cancelled) return;
      if (!list) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide : on n'affiche que le message d'erreur.
        setError(true);
        setItems((prev) => prev || []);
        return;
      }
      const drinks = await loadDrinksByIds(list.map((x) => x.drinkId));
      if (cancelled) return;
      setDrinksById(Object.fromEntries(drinks.map((d) => [String(d.id), d])));
      setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const loading = items === null;
  const allEntries = (items || []).map((x) => ({ ...x, drink: drinksById[x.drinkId] })).filter((x) => x.drink);
  // Les catégories dans l'ordre habituel de l'app, puis celles que la liste ne connaît pas ; seules les catégories non vides.
  const known = [...DRINK_TYPES, ...new Set(allEntries.map(categoryOf).filter((t) => !DRINK_TYPES.includes(t)))].filter((t) => allEntries.some((x) => categoryOf(x) === t));
  const chips = [{ key: "all", label: "Tout" }, ...known.map((t) => ({ key: t, label: t }))];
  const entries = category !== "all" ? allEntries.filter((x) => categoryOf(x) === category) : allEntries;
  const groups = arrangeChecks(entries, sort, SORT_FIELDS);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>
        Drink<span style={{ color: COLORS.amber }}>Checks</span>
      </ScreenTitle>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : error ? (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
            Impossible de charger tes produits.{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        ) : allEntries.length === 0 ? (
          <p data-check-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            Aucun produit checké pour l'instant. Fais un DrinkCheck depuis la fiche d'un produit.
          </p>
        ) : (
          <>
            <CategoryChips chips={chips} active={category} onChange={setCategory} />
            <PillTabs tabs={CHECK_SORTS} active={sort} onChange={setSort} fine />
            {groups.map((g, gi) => (
              <CheckGroup key={g.key} label={g.label} flag={g.country && hasFlag(g.country) ? <CountryFlagImg country={g.country} size={16} /> : null} isFirst={gi === 0}>
                {g.entries.map((x, i) => (
                  <CheckRow
                    key={x.drinkId}
                    avatarPhotoUrl={x.drink.photoUrl}
                    avatarEmoji={x.drink.avatarEmoji}
                    fallbackIcon="bottle"
                    name={x.drink.name}
                    parts={[SUBTYPE_LABELS[x.drink.beverageSubtype] || null].filter(Boolean)}
                    count={x.checks}
                    isLast={i === g.entries.length - 1}
                    onOpen={onOpenDrink ? () => onOpenDrink(x.drink.id) : null}
                  />
                ))}
              </CheckGroup>
            ))}
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
