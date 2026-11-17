// « Mes Produits » (Mon Profil) — trois listes de MES produits, chacune sur son écran : À goûter (le bouton « liste à goûter » de la fiche d'un produit),
// Déjà goûtés (tous les produits que j'ai checkés, notés ou non) et Notés (ma note, de la fiche d'un produit). L'écran d'entrée ne montre que les trois cartes (rond d'icône, titre, nombre de produits à droite).
// Au-dessus de chaque liste, la rangée de pastilles de catégories de DrinkChecks (« Tout » + les catégories non vides) : une catégorie choisie ne garde que ses produits ; puis trois classements
// (PRODUCT_SORTS) : « Récents » (sous « Tout », les produits sont rangés par catégorie sous une barre, comme les sortes de « Mes Favoris », du plus récent au plus ancien), « Pays » (un groupe par pays
// sous une barre drapeau + nom) et « A–Z » (une seule carte, avec, à partir de 30 produits, l'index des lettres AlphaIndex sur le bord droit). Chaque liste garde son classement au retour d'une fiche. Les lignes sont celles de DrinkChecks (`CheckRow`) : rond de 48 px, nom, détails
// (sous-catégorie · pays · ABV · Bio · Sans gluten) et, dans « Déjà goûtés » et « Notés », ma note dans la colonne sombre de droite (« Pas noté » en gris avec une flèche entourée verte quand il ne l'est pas ; un clic dessus ouvre la fiche avec la fenêtre DrinkCheck déjà ouverte pour le noter, puis la liste se remet à la même hauteur). Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Les listes viennent de la base (get_my_wishlist, get_my_checked_drinks, get_my_rated_drinks) : des identifiants, puis les produits par loadDrinksByIds.
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav, HubCard } from "./ui.jsx";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import drinkCheckIconUrl from "../assets/brand/drink-check.svg";
import { loadMyWishlist, loadMyRatedDrinks, loadMyCheckedDrinks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { RatingFraction } from "./NotesCard.jsx";
import { PRODUCT_SORTS, arrangeChecks, letterOf, alphaRowFor, CategoryChips, CheckGroup, CheckRow, hasFlag, flagPart, abvPart, bioPart, glutenFreePart } from "./CheckListParts.jsx";
import { AlphaIndex, showAlphaIndex } from "./AlphaIndex.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { useListReturn } from "../hooks/useListReturn.js";

const countLabel = (n) => `${n} produit${n > 1 ? "s" : ""}`;

const HUB_ITEMS = [
  { key: "toTry", title: "À goûter" },
  { key: "tasted", title: "Déjà goûtés" },
  { key: "rated", title: "Notés" },
];

// Écran d'entrée : trois cartes, chacune avec le nombre de ses produits (rien tant que la base n'a pas répondu).
export function MyProductsHubScreen({ onBack, goToToTry, goToTasted, goToRated }) {
  const [counts, setCounts] = useState({ toTry: null, tasted: null, rated: null });
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadMyWishlist(), loadMyCheckedDrinks(), loadMyRatedDrinks()]).then(([wishlist, checked, rated]) => {
      if (cancelled) return;
      setCounts({ toTry: wishlist ? wishlist.length : null, tasted: checked ? checked.length : null, rated: rated ? rated.length : null });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const go = { toTry: goToToTry, tasted: goToTasted, rated: goToRated };
  // Les icônes de l'app : la liste à goûter (celle de la fiche d'un produit), la chope du DrinkCheck (celle de l'accueil) et l'étoile des notes.
  const icons = {
    toTry: <NavIcon name="checklist" size={24} color={COLORS.amber} accentColor={COLORS.pinkFluo} />,
    tasted: <img src={drinkCheckIconUrl} alt="" style={{ width: "26px", height: "26px" }} />,
    rated: <NavIcon name="star" size={24} color={COLORS.amber} filled />,
  };
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>Mes Produits</ScreenTitle>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        {HUB_ITEMS.map((it) => (
          <HubCard key={it.key} title={it.title} count={counts[it.key]} countText={counts[it.key] === null ? null : countLabel(counts[it.key])} icon={icons[it.key]} onClick={go[it.key]} />
        ))}
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

const LIST_TEXTS = {
  toTry: { title: "À goûter", empty: "Aucun produit à goûter. Touche l'icône liste sur la fiche d'un produit pour le mettre de côté.", error: "Impossible de charger ta liste." },
  tasted: { title: "Déjà goûtés", empty: "Aucun produit checké pour l'instant. Fais un DrinkCheck depuis la fiche d'un produit.", error: "Impossible de charger ta liste." },
  rated: { title: "Notés", empty: "Aucun produit noté. Note un produit depuis sa fiche.", error: "Impossible de charger tes notes." },
};

// Ligne d'un produit — celle de DrinkChecks (`CheckRow`) : rond de 48 px à gauche (il déborde vers la gauche et en hauteur, le texte ne bouge pas), le nom (gras) et une ligne de détails —
// sous-catégorie · pays (drapeau) · degré (« 6.5% ABV », rien pour les produits sans alcool par définition) · Bio · Sans gluten —, et, listes « Déjà goûtés » et « Notés », ma note à droite
// dans la colonne plus sombre qui va du haut en bas de la ligne (« Pas noté » pour un produit goûté mais pas noté). « À goûter » : pas de colonne.
const RATING_COLUMN_STYLE = { fontSize: "13px", color: COLORS.chalkWhite, minWidth: "64px" };
// Produit goûté mais pas noté : la mention « Pas noté », plus discrète que la note (gris, plus petite, pas en gras).
const UNRATED_STYLE = { fontSize: "11px", fontWeight: 600, color: COLORS.inkSoft };

function ProductRow({ drink, kind, rating = null, isLast, onOpen, onRate = null, hideFlag = false }) {
  const parts = [SUBTYPE_LABELS[drink.beverageSubtype] || null, hideFlag ? null : flagPart(drink), abvPart(drink), bioPart(drink), glutenFreePart(drink)].filter(Boolean);
  // Produit pas noté : « Pas noté » en gris et, juste dessous, une flèche entourée de 16 px en vert fluo (elle dit que la case se touche pour noter le produit ; décidé par Mehdi, 2026-11-17).
  const unrated = (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span>Pas noté</span>
      <NavIcon name="arrow-right-circle" size={16} color={COLORS.amber} />
    </span>
  );
  const count = kind === "toTry" ? null : rating !== null ? <RatingFraction value={rating} /> : unrated;
  return (
    <CheckRow
      avatarPhotoUrl={drink.photoUrl}
      avatarEmoji={drink.avatarEmoji}
      fallbackIcon="bottle"
      name={drink.name}
      parts={parts}
      count={count}
      countStyle={rating !== null ? RATING_COLUMN_STYLE : { ...RATING_COLUMN_STYLE, ...UNRATED_STYLE }}
      onCountClick={rating === null ? onRate : null}
      isLast={isLast}
      onOpen={onOpen}
    />
  );
}

// Pour `arrangeChecks` (classements « Pays » et « A–Z ») : ces listes n'ont pas de nombre de checks, l'ordre « Récents » est conservé à l'intérieur d'un pays.
const SORT_FIELDS = { nameOf: (x) => x.drink.name, countOf: () => 0, countryOf: (x) => (x.drink.nationality && x.drink.nationality !== "Non renseigné" ? x.drink.nationality : "") };

// Les catégories dans l'ordre habituel de l'app, puis celles que la liste ne connaît pas (dans l'ordre où elles se présentent).
function groupByCategory(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const label = entry.drink.type || "Autres";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  }
  const known = DRINK_TYPES.filter((t) => groups.has(t));
  const others = [...groups.keys()].filter((t) => !DRINK_TYPES.includes(t));
  return [...known, ...others].map((label) => ({ label, entries: groups.get(label) }));
}

// Chaque lecture rend [{ drinkId, rating? }], ou null si la base n'a pas répondu.
const LOADERS = {
  toTry: async () => (await loadMyWishlist())?.map((id) => ({ drinkId: id })) ?? null,
  tasted: loadMyCheckedDrinks,
  rated: loadMyRatedDrinks,
};

// kind : "toTry" | "tasted" | "rated". `screenId` : l'identifiant de l'écran dans App (la mémoire du retour d'une fiche est rangée sous ce nom, voir `useListReturn`) :
// au retour d'une fiche produit, la liste se remet à la hauteur où l'on l'avait laissée ; une entrée depuis « Mes Produits » repart de zéro.
export function MyProductsListScreen({ screenId, mainScrollRef, kind, onBack, onOpenDrink, onRateDrink }) {
  const texts = LIST_TEXTS[kind];
  const { restored, save, open } = useListReturn(screenId, mainScrollRef);
  const [items, setItems] = useState(restored ? restored.items : null); // null = chargement ; [{ drinkId, rating }]
  const [drinksById, setDrinksById] = useState(restored ? restored.drinksById : {});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState(restored ? restored.category : "all");
  const [sort, setSort] = useState(restored ? restored.sort : "recent");

  useEffect(() => {
    let cancelled = false;
    setError(false);
    LOADERS[kind]().then(async (list) => {
      if (cancelled) return;
      if (!list) {
        // Au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setItems((prev) => prev || []);
        }
        return;
      }
      // Au retour d'une fiche, rien à remplacer si la liste n'a pas changé.
      const signature = (l) => l.map((x) => `${x.drinkId}:${x.rating ?? ""}`).join(",");
      if (restored && signature(list) === signature(restored.items)) return;
      const drinks = await loadDrinksByIds(list.map((x) => x.drinkId));
      if (cancelled) return;
      setDrinksById(Object.fromEntries(drinks.map((d) => [String(d.id), d])));
      setItems(list);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, attempt]);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (items === null || error) return;
    save({ items, drinksById, category, sort });
  }, [items, drinksById, category, sort, error]);
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;
  // « Pas noté » (liste « Déjà goûtés ») : ouvre la fiche avec la fenêtre DrinkCheck déjà ouverte (on y note le produit) ; la hauteur de la liste est retenue comme pour une fiche.
  const rateDrink = onRateDrink ? open(onRateDrink) : null;

  const loading = items === null;
  const allEntries = (items || []).map((x) => ({ ...x, drink: drinksById[x.drinkId] })).filter((x) => x.drink);
  // Les pastilles de catégories : « Tout », puis les catégories dans l'ordre habituel de l'app et celles que la liste ne connaît pas ; seules les catégories non vides.
  const categoryOf = (x) => x.drink.type || "Autres";
  const known = [...DRINK_TYPES, ...new Set(allEntries.map(categoryOf).filter((t) => !DRINK_TYPES.includes(t)))].filter((t) => allEntries.some((x) => categoryOf(x) === t));
  const chips = [{ key: "all", label: "Tout" }, ...known.map((t) => ({ key: t, label: t }))];
  // Une catégorie qui n'a plus de produit (liste relue au retour d'une fiche) ne laisse pas une liste vide : on revient à « Tout ».
  const activeCategory = chips.some((c) => c.key === category) ? category : "all";
  const entries = activeCategory !== "all" ? allEntries.filter((x) => categoryOf(x) === activeCategory) : allEntries;
  // « Récents » : sous « Tout », les produits restent rangés par catégorie sous leur barre (une catégorie choisie n'a pas de barre : une seule carte) ;
  // « Pays » : un groupe par pays sous sa barre drapeau + nom (la ligne ne répète pas le drapeau) ; « A–Z » : une seule carte de A à Z, avec l'index des lettres sur le bord droit.
  const groups = sort === "recent" ? (activeCategory === "all" ? groupByCategory(entries) : [{ label: "", entries }]) : arrangeChecks(entries, sort, SORT_FIELDS);
  const listRef = React.useRef(null);
  const alphaOn = showAlphaIndex(sort, entries.length);
  const alphaLetters = alphaOn ? [...new Set(entries.map((x) => letterOf(x.drink.name)))] : [];
  const alphaTarget = (letter) => alphaRowFor(listRef.current, groups.flatMap((g) => g.entries), (x) => x.drink.name, letter);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>{texts.title}</ScreenTitle>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : error ? (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
            {texts.error}{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        ) : allEntries.length === 0 ? (
          <p data-product-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            {texts.empty}
          </p>
        ) : (
          <>
            <CategoryChips chips={chips} active={activeCategory} onChange={setCategory} />
            <PillTabs tabs={PRODUCT_SORTS} active={sort} onChange={setSort} fine />
            <div ref={listRef} style={{ position: "relative" }}>
            {alphaOn && <AlphaIndex available={alphaLetters} scrollRef={mainScrollRef} targetFor={alphaTarget} />}
            {groups.map((g, gi) => {
              const rows = g.entries.map((x, i) => (
                <ProductRow
                  key={x.drinkId}
                  drink={x.drink}
                  kind={kind}
                  rating={kind !== "toTry" && typeof x.rating === "number" ? x.rating : null}
                  isLast={i === g.entries.length - 1}
                  onOpen={openDrink ? () => openDrink(x.drink.id) : null}
                  onRate={rateDrink ? () => rateDrink(x.drink.id) : null}
                  hideFlag={sort === "country"}
                />
              ));
              return (
                <CheckGroup key={g.key || g.label || "all"} label={g.label} flag={g.country && hasFlag(g.country) ? <CountryFlagImg country={g.country} size={16} /> : null} isFirst={gi === 0}>
                  {rows}
                </CheckGroup>
              );
            })}
            </div>
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
