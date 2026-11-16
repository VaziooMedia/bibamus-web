// « DrinkChecks » (Mon Profil) — la liste des produits que la personne a déjà checkés : un produit une seule fois, par défaut du plus récemment checké au plus ancien,
// avec à droite son nombre de DrinkChecks. Mêmes lignes et mêmes classements que « PlaceChecks » (CheckListParts.jsx) ; la ligne de détails ne porte que le sous-type du produit.
// Au-dessus des quatre classements, une rangée de pastilles de catégories (Tout, Bières & Cidres, Vins & Bulles…, seules les catégories non vides) :
// elle ne garde que les produits d'une catégorie, et le classement choisi s'applique à ce qui reste.
// Sous les classements, deux blocs côte à côte avec les totaux de ce qui est affiché (la catégorie choisie) : « X DrinkChecks » et « X Produits uniques ». Classés par pays, la barre de chaque pays
// porte ses propres totaux : « (checks / produits uniques) ».
// Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Retour d'une fiche : la page se remet comme on l'avait laissée (catégorie, classement et hauteur de défilement, voir `useListReturn`) ; ce qu'elle affichait revient aussitôt, puis la liste est relue
// en silence et remplacée seulement si elle a changé (un DrinkCheck fait sur la fiche). Une entrée depuis Mon Profil repart de zéro.
// Les identifiants viennent de la fonction `get_my_drink_checks` (script bibamus-sql-mes-drinkchecks-1-liste), puis les produits par `loadDrinksByIds`.
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { loadMyDrinkChecks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { PillTabs, FINE_PILL } from "./PillTabs.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { CHECK_SORTS, arrangeChecks, CheckGroup, CheckRow, CheckTotals } from "./CheckListParts.jsx";
import { useListReturn } from "../hooks/useListReturn.js";

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

const signatureOf = (list) => list.map((x) => `${x.drinkId}:${x.checks}`).join(",");

export function MyDrinkChecksScreen({ onBack, onOpenDrink, mainScrollRef }) {
  const { restored, save, open } = useListReturn("myDrinkChecks", mainScrollRef);
  const [items, setItems] = useState(restored ? restored.items : null); // null = chargement ; [{ drinkId, checks, lastAt }]
  const [drinksById, setDrinksById] = useState(restored ? restored.drinksById : {});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState(restored ? restored.sort : "recent");
  const [category, setCategory] = useState(restored ? restored.category : "all");

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyDrinkChecks().then(async (list) => {
      if (cancelled) return;
      if (!list) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide : on n'affiche que le message d'erreur.
        // Au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setItems((prev) => prev || []);
        }
        return;
      }
      // Au retour d'une fiche, rien à remplacer si la liste n'a pas changé.
      if (restored && signatureOf(list) === signatureOf(restored.items)) return;
      const drinks = await loadDrinksByIds(list.map((x) => x.drinkId));
      if (cancelled) return;
      setDrinksById(Object.fromEntries(drinks.map((d) => [String(d.id), d])));
      setItems(list);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (items === null || error) return;
    save({ items, drinksById, sort, category });
  }, [items, drinksById, sort, category, error]);
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;

  const loading = items === null;
  const allEntries = (items || []).map((x) => ({ ...x, drink: drinksById[x.drinkId] })).filter((x) => x.drink);
  // Les catégories dans l'ordre habituel de l'app, puis celles que la liste ne connaît pas ; seules les catégories non vides.
  const known = [...DRINK_TYPES, ...new Set(allEntries.map(categoryOf).filter((t) => !DRINK_TYPES.includes(t)))].filter((t) => allEntries.some((x) => categoryOf(x) === t));
  const chips = [{ key: "all", label: "Tout" }, ...known.map((t) => ({ key: t, label: t }))];
  // Une catégorie qui n'a plus de produit (liste relue au retour d'une fiche) ne laisse pas une liste vide : on revient à « Tout ».
  const activeCategory = chips.some((c) => c.key === category) ? category : "all";
  const entries = activeCategory !== "all" ? allEntries.filter((x) => categoryOf(x) === activeCategory) : allEntries;
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
            <CategoryChips chips={chips} active={activeCategory} onChange={setCategory} />
            <PillTabs tabs={CHECK_SORTS} active={sort} onChange={setSort} fine />
            <CheckTotals checks={entries.reduce((sum, x) => sum + x.checks, 0)} unique={entries.length} brand="Drink" uniqueLabel={["Produit unique", "Produits uniques"]} />
            {groups.map((g, gi) => (
              <CheckGroup key={g.key} label={g.label} flag={g.country && hasFlag(g.country) ? <CountryFlagImg country={g.country} size={16} /> : null} counts={g.label ? { checks: g.entries.reduce((sum, x) => sum + x.checks, 0), unique: g.entries.length } : null} isFirst={gi === 0}>
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
                    onOpen={openDrink ? () => openDrink(x.drink.id) : null}
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
