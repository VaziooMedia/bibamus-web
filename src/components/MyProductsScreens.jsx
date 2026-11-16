// « Mes Produits » (Mon Profil) — trois listes de MES produits, chacune sur son écran : À goûter (le bouton « liste à goûter » de la fiche d'un produit),
// Déjà goûtés (tous les produits que j'ai checkés, notés ou non) et Notés (ma note, de la fiche d'un produit). L'écran d'entrée ne montre que les trois cartes et leur nombre de produits.
// Dans chaque liste, les produits sont rangés par catégorie sous une barre (comme les sortes de « Mes Favoris »), du plus récent au plus ancien ; les lignes ont
// le style de « Mon Historique » : une carte, des lignes pleine largeur séparées par un trait fin. Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Les listes viennent de la base (get_my_wishlist, get_my_checked_drinks, get_my_rated_drinks) : des identifiants, puis les produits par loadDrinksByIds.
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar, ActionCard } from "./ui.jsx";
import { loadMyWishlist, loadMyRatedDrinks, loadMyCheckedDrinks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE } from "./BibaSoloScreen.jsx";
import { DotLine, ScreenTitle } from "./MyFavoritesScreen.jsx";
import { RatingFraction } from "./NotesCard.jsx";
import { useListReturn } from "../hooks/useListReturn.js";

const countLabel = (n) => `${n} produit${n > 1 ? "s" : ""}`;

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
  // Espace insécable tant que le nombre n'est pas connu : la carte garde sa hauteur et ne saute pas quand il arrive.
  const sub = (n) => (n === null ? "\u00A0" : countLabel(n));
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>Mes Produits</ScreenTitle>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
        <ActionCard title="À goûter" subtitle={sub(counts.toTry)} onClick={goToToTry} />
        <ActionCard title="Déjà goûtés" subtitle={sub(counts.tasted)} onClick={goToTasted} />
        <ActionCard title="Notés" subtitle={sub(counts.rated)} onClick={goToRated} />
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

// Ligne d'un produit — même squelette que celles de « Mes Favoris » : rond de 40 px à gauche, au milieu le nom (gras) et une ligne de détails, à droite ma note (listes « Notés » et « Déjà goûtés », quand le produit est noté).
function ProductRow({ drink, rating = null, isLast, onOpen }) {
  const subtype = SUBTYPE_LABELS[drink.beverageSubtype] || null;
  return (
    <button
      type="button"
      data-product-row
      onClick={onOpen || undefined}
      disabled={!onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "12px 0",
        background: "none",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
        textAlign: "left",
        color: "inherit",
        font: "inherit",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>
        <EntityAvatar photoUrl={drink.photoUrl} photoEmoji={drink.avatarEmoji} size={40} fallbackIcon="bottle" />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{drink.name}</span>
        <DotLine parts={[subtype, drink.brand].filter(Boolean)} />
      </div>
      {rating !== null && (
        <span data-product-rating style={{ flexShrink: 0, fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}>
          <RatingFraction value={rating} />
        </span>
      )}
    </button>
  );
}

// Une catégorie : sa barre (nom en vert fluo + trait), puis la carte de ses lignes.
function CategorySection({ label, rows, isFirst }) {
  return (
    <section data-product-category={label}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: isFirst ? "0 0 18px" : "20px 0 18px" }}>
        <span style={SOLO_BAR_LABEL_STYLE}>{label}</span>
        <div style={SOLO_BAR_LINE_STYLE} />
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>{rows}</div>
    </section>
  );
}

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
export function MyProductsListScreen({ screenId, mainScrollRef, kind, onBack, onOpenDrink }) {
  const texts = LIST_TEXTS[kind];
  const { restored, save, open } = useListReturn(screenId, mainScrollRef);
  const [items, setItems] = useState(restored ? restored.items : null); // null = chargement ; [{ drinkId, rating }]
  const [drinksById, setDrinksById] = useState(restored ? restored.drinksById : {});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
    save({ items, drinksById });
  }, [items, drinksById, error]);
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;

  const loading = items === null;
  const entries = (items || []).map((x) => ({ ...x, drink: drinksById[x.drinkId] })).filter((x) => x.drink);
  const groups = groupByCategory(entries);

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
        ) : groups.length === 0 ? (
          <p data-product-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            {texts.empty}
          </p>
        ) : (
          groups.map((g, gi) => (
            <CategorySection
              key={g.label}
              label={g.label}
              isFirst={gi === 0}
              rows={g.entries.map((x, i) => (
                <ProductRow
                  key={x.drinkId}
                  drink={x.drink}
                  rating={kind !== "toTry" && typeof x.rating === "number" ? x.rating : null}
                  isLast={i === g.entries.length - 1}
                  onOpen={openDrink ? () => openDrink(x.drink.id) : null}
                />
              ))}
            />
          ))
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
