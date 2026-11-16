// « Mes Produits » (Mon Profil) — trois listes de MES produits, chacune sur son écran : À goûter (le bouton « liste à goûter » de la fiche d'un produit),
// Déjà goûtés et Notés (ma note, de la fiche d'un produit). L'écran d'entrée ne montre que les trois cartes et leur nombre de produits.
// Dans chaque liste, les produits sont rangés par catégorie sous une barre (comme les sortes de « Mes Favoris »), du plus récent au plus ancien ; les lignes ont
// le style de « Mon Historique » : une carte, des lignes pleine largeur séparées par un trait fin. Une ligne ouvre la fiche du produit, dont le retour ramène ici.
// Les listes viennent de la base (get_my_wishlist, get_my_rated_drinks) : des identifiants, puis les produits par loadDrinksByIds.
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar, ActionCard } from "./ui.jsx";
import { loadMyWishlist, loadMyRatedDrinks, loadDrinksByIds } from "../data/sharedDirectories.js";
import { SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE } from "./BibaSoloScreen.jsx";
import { DotLine } from "./MyFavoritesScreen.jsx";
import { RatingFraction } from "./NotesCard.jsx";

const countLabel = (n) => `${n} produit${n > 1 ? "s" : ""}`;

function ScreenTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
      <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{children}</h1>
    </div>
  );
}

// Écran d'entrée : trois cartes, chacune avec le nombre de ses produits (rien tant que la base n'a pas répondu).
export function MyProductsHubScreen({ onBack, goToToTry, goToTasted, goToRated }) {
  const [counts, setCounts] = useState({ toTry: null, tasted: null, rated: null });
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadMyWishlist(), loadMyRatedDrinks()]).then(([wishlist, rated]) => {
      if (cancelled) return;
      setCounts((prev) => ({ ...prev, toTry: wishlist ? wishlist.length : null, rated: rated ? rated.length : null }));
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
  tasted: { title: "Déjà goûtés", empty: "Aucun produit goûté pour l'instant.", error: "Impossible de charger ta liste." },
  rated: { title: "Notés", empty: "Aucun produit noté. Note un produit depuis sa fiche.", error: "Impossible de charger tes notes." },
};

// Ligne d'un produit — même squelette que celles de « Mes Favoris » : rond de 40 px à gauche, au milieu le nom (gras) et une ligne de détails, à droite ma note (liste « Notés »).
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
  tasted: async () => [],
  rated: loadMyRatedDrinks,
};

// kind : "toTry" | "tasted" | "rated".
export function MyProductsListScreen({ kind, onBack, onOpenDrink }) {
  const texts = LIST_TEXTS[kind];
  const [items, setItems] = useState(null); // null = chargement ; [{ drinkId, rating }]
  const [drinksById, setDrinksById] = useState({});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    LOADERS[kind]().then(async (list) => {
      if (cancelled) return;
      if (!list) {
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
  }, [kind, attempt]);

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
                  rating={kind === "rated" && typeof x.rating === "number" ? x.rating : null}
                  isLast={i === g.entries.length - 1}
                  onOpen={onOpenDrink ? () => onOpenDrink(x.drink.id) : null}
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
