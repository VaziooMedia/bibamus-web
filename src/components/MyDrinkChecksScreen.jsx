// « DrinkChecks » (Mon Profil) — la liste des produits que la personne a déjà checkés : un produit une seule fois, par défaut du plus récemment checké au plus ancien,
// avec à droite son nombre de DrinkChecks. Mêmes lignes et mêmes classements que « PlaceChecks » (CheckListParts.jsx) ; la ligne de détails porte le sous-type du produit, puis son drapeau
// (sauf classé par pays : la barre du pays le porte déjà, comme pour « PlaceChecks »), puis son degré « 6.5% ABV » (rien pour les produits sans alcool par définition, « 0.0% ABV » pour les autres à 0).
// Au-dessus des quatre classements, une rangée de pastilles de catégories (Tout, Bières & Cidres, Vins & Bulles…, seules les catégories non vides) :
// elle ne garde que les produits d'une catégorie, et le classement choisi s'applique à ce qui reste.
// Sous les classements, deux blocs côte à côte avec les totaux de ce qui est affiché (la catégorie choisie) : « X DrinkChecks » et « X Produits uniques ». Classés par pays, la barre de chaque pays
// porte, au bout de la ligne, ses propres totaux : « (checks / produits uniques) ».
// Classés A–Z (à partir de 30 produits), un index des lettres (AlphaIndex) borde la liste à droite : toucher une lettre, ou y glisser le doigt, fait sauter au premier produit de cette lettre.
// Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Retour d'une fiche : la page se remet comme on l'avait laissée (catégorie, classement et hauteur de défilement, voir `useListReturn`) ; ce qu'elle affichait revient aussitôt, puis la liste est relue
// en silence et remplacée seulement si elle a changé (un DrinkCheck fait sur la fiche). Une entrée depuis Mon Profil repart de zéro.
// Les identifiants viennent de la fonction `get_my_drink_checks` (script bibamus-sql-mes-drinkchecks-1-liste), puis les produits par `loadDrinksByIds`.
// La MÊME page sert, en lecture seule, aux DrinkChecks d'UN DE MES BIBAX (bloc « DrinkChecks » de sa fiche — Mehdi, 2026-11-19) : avec `other = { userId, name }`, la liste vient de
// `get_bibax_drink_checks` (qui respecte le partage « Boissons » de cette personne), un sous-titre « de <nom> » suit le titre, les messages parlent d'elle, et la flèche retour ramène à sa fiche
// (la mémoire de la liste est alors effacée, comme pour les autres sous-listes d'une fiche).
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav, ScrollToTopButton } from "./ui.jsx";
import { loadMyDrinkChecks, loadBibroDrinkChecks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { CountryFlagImg } from "./icons.jsx";
import { CHECK_SORTS, arrangeChecks, countryOptions, letterOf, alphaRowFor, CategoryChips, CheckGroup, CheckRow, CheckTotals, hasFlag, flagPart, abvPart } from "./CheckListParts.jsx";
import { AlphaIndex, showAlphaIndex } from "./AlphaIndex.jsx";
import { CountryPicker } from "./CountryPicker.jsx";
import { useListReturn } from "../hooks/useListReturn.js";
import drinkCheckIconUrl from "../assets/brand/beer-check-profil.png";

const SORT_FIELDS = { nameOf: (x) => x.drink.name, countOf: (x) => x.checks, countryOf: (x) => (x.drink.nationality && x.drink.nationality !== "Non renseigné" ? x.drink.nationality : "") };

const categoryOf = (x) => x.drink.type || "Autres";

const signatureOf = (list) => list.map((x) => `${x.drinkId}:${x.checks}`).join(",");

export function MyDrinkChecksScreen({ onBack: onBackProp, onOpenDrink, mainScrollRef, other = null }) {
  const { restored, save, open, leave } = useListReturn(other ? "bibroDrinkChecks" : "myDrinkChecks", mainScrollRef, other ? { valid: (m) => m.ctx === other.userId } : undefined);
  const onBack = other ? leave(onBackProp) : onBackProp;
  const who = other?.name || "";
  const [items, setItems] = useState(restored ? restored.items : null); // null = chargement ; [{ drinkId, checks, lastAt }]
  const [drinksById, setDrinksById] = useState(restored ? restored.drinksById : {});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState(restored ? restored.sort : "recent");
  const [category, setCategory] = useState(restored ? restored.category : "all");
  const [country, setCountry] = useState(restored ? restored.country ?? null : null); // classé « Pays » : le pays choisi dans la liste déroulante (null = tous)
  const [hidden, setHidden] = useState(false); // la personne ne partage pas ses DrinkChecks (seulement pour la liste d'un autre Bibax)

  useEffect(() => {
    let cancelled = false;
    setError(false);
    (other ? loadBibroDrinkChecks(other.userId) : loadMyDrinkChecks().then((l) => (l ? { list: l } : null))).then(async (result) => {
      if (cancelled) return;
      if (result?.hidden) {
        setHidden(true);
        setItems([]);
        return;
      }
      const list = result?.list;
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
    save({ items, drinksById, sort, category, country, ctx: other ? other.userId : undefined });
  }, [items, drinksById, sort, category, country, error]);
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;

  const loading = items === null;
  const allEntries = (items || []).map((x) => ({ ...x, drink: drinksById[x.drinkId] })).filter((x) => x.drink);
  // Les catégories dans l'ordre habituel de l'app, puis celles que la liste ne connaît pas ; seules les catégories non vides.
  const known = [...DRINK_TYPES, ...new Set(allEntries.map(categoryOf).filter((t) => !DRINK_TYPES.includes(t)))].filter((t) => allEntries.some((x) => categoryOf(x) === t));
  const chips = [{ key: "all", label: "Tout" }, ...known.map((t) => ({ key: t, label: t }))];
  // Une catégorie qui n'a plus de produit (liste relue au retour d'une fiche) ne laisse pas une liste vide : on revient à « Tout ».
  const activeCategory = chips.some((c) => c.key === category) ? category : "all";
  const entries = activeCategory !== "all" ? allEntries.filter((x) => categoryOf(x) === activeCategory) : allEntries;
  // Classé « Pays » : la liste déroulante des pays de ce qui est affiché ; un pays choisi (ou la catégorie qui l'a vidé : retour à « Tous les pays ») ne garde que ses produits.
  const countryChoices = sort === "country" ? countryOptions(entries, SORT_FIELDS.countryOf) : [];
  const activeCountry = countryChoices.some((o) => o.country === country) ? country : null;
  const shown = activeCountry === null ? entries : entries.filter((x) => SORT_FIELDS.countryOf(x) === activeCountry);
  const groups = arrangeChecks(shown, sort, SORT_FIELDS);
  // Classé A–Z : l'index des lettres sur le bord droit (AlphaIndex).
  const listRef = React.useRef(null);
  const alphaOn = showAlphaIndex(sort, entries.length);
  const alphaLetters = alphaOn ? [...new Set(entries.map((x) => letterOf(x.drink.name)))] : [];
  const alphaTarget = (letter) => alphaRowFor(listRef.current, groups.flatMap((g) => g.entries), (x) => x.drink.name, letter);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle iconUrl={drinkCheckIconUrl} subtitle={other ? <>de <strong style={{ color: COLORS.ink, fontWeight: 700 }}>{who}</strong></> : null}>
        Drink<span style={{ color: COLORS.amber }}>Checks</span>
      </ScreenTitle>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : error ? (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
            {other ? `Impossible de charger les produits de ${who}.` : "Impossible de charger tes produits."}{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        ) : hidden ? (
          <p data-check-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            {who} ne partage pas ses DrinkChecks.
          </p>
        ) : allEntries.length === 0 ? (
          <p data-check-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            {other ? `${who} n'a pas encore checké de produit.` : "Aucun produit checké pour l'instant. Fais un DrinkCheck depuis la fiche d'un produit."}
          </p>
        ) : (
          <>
            <CategoryChips chips={chips} active={activeCategory} onChange={setCategory} />
            <PillTabs tabs={CHECK_SORTS} active={sort} onChange={(k) => { if (k !== sort) setCountry(null); setSort(k); }} fine />
            {countryChoices.length > 1 && <CountryPicker options={countryChoices} value={activeCountry} total={entries.length} onChange={setCountry} />}
            <CheckTotals checks={shown.reduce((sum, x) => sum + x.checks, 0)} unique={shown.length} brand="Drink" uniqueLabel={["Produit unique", "Produits uniques"]} />
            <div ref={listRef} style={{ position: "relative" }}>
            {alphaOn && <AlphaIndex available={alphaLetters} scrollRef={mainScrollRef} targetFor={alphaTarget} />}
            {groups.map((g, gi) => (
              <CheckGroup key={g.key} label={g.label} flag={g.country && hasFlag(g.country) ? <CountryFlagImg country={g.country} size={16} /> : null} counts={g.label ? { checks: g.entries.reduce((sum, x) => sum + x.checks, 0), unique: g.entries.length } : null} isFirst={gi === 0}>
                {g.entries.map((x, i) => (
                  <CheckRow
                    key={x.drinkId}
                    avatarPhotoUrl={x.drink.photoUrl}
                    avatarEmoji={x.drink.avatarEmoji}
                    fallbackIcon="bottle"
                    name={x.drink.name}
                    parts={[SUBTYPE_LABELS[x.drink.beverageSubtype] || null, sort !== "country" ? flagPart(x.drink) : null, abvPart(x.drink)].filter(Boolean)}
                    count={x.checks}
                    isLast={i === g.entries.length - 1}
                    onOpen={openDrink ? () => openDrink(x.drink.id) : null}
                  />
                ))}
              </CheckGroup>
            ))}
            </div>
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
      <ScrollToTopButton hideNearBottom={false} />
    </div>
  );
}
