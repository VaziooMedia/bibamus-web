// Pièces communes aux pages « PlaceChecks », « DrinkChecks » et « Mes Produits » (Mon Profil) : une liste de lieux ou de produits checkés, avec à droite le nombre de checks,
// quatre classements au choix (Récents, Checks, Pays, A–Z ; trois dans « Mes Produits », sans « Checks ») et, pour « Pays », un groupe par pays sous une barre drapeau + nom + trait.
import React from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { DotLine, ROW_AVATAR, ROW_AVATAR_BASE, ROW_PAD_Y as ROW_PAD_Y_SHARED } from "./MyFavoritesScreen.jsx";
import { SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE } from "./BibaSoloScreen.jsx";
import { FINE_PILL } from "./PillTabs.jsx";

// Éléments de la ligne de détails d'un produit (DrinkChecks, Mes Produits, Mes Favoris > Produits) : définis dans DrinkRowParts.jsx, repris ici pour les écrans qui les importaient d'ici.
export { hasFlag, flagPart, abvPart, bioPart, glutenFreePart } from "./DrinkRowParts.jsx";

// Les classements au choix (pastilles de même largeur en haut de la page). « Récents » : l'ordre de la base, du dernier check au plus ancien.
export const CHECK_SORTS = [
  { key: "recent", label: "Récents" },
  { key: "checks", label: "Checks" },
  { key: "country", label: "Pays" },
  { key: "alpha", label: "A–Z" },
];

// « Mes Produits » : les trois classements d'une liste (pas de « Checks » : un produit à goûter ou noté n'a pas de nombre de checks).
export const PRODUCT_SORTS = CHECK_SORTS.filter((s) => s.key !== "checks");

const compareText = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });

// La lettre sous laquelle un nom se range dans l'index A–Z : sa première lettre, sans accent, en majuscule ; « # » pour un chiffre ou un symbole.
export const letterOf = (name) => {
  const c = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

// Pour l'index A–Z (AlphaIndex) : la ligne (`data-check-row`) du premier élément de la liste rangée qui commence par cette lettre.
// `listEl` : le bloc qui contient les lignes ; `sortedEntries` : les entrées dans l'ordre où elles sont affichées.
export function alphaRowFor(listEl, sortedEntries, nameOf, letter) {
  if (!listEl) return null;
  const at = sortedEntries.findIndex((x) => letterOf(nameOf(x)) === letter);
  return at < 0 ? null : listEl.querySelectorAll("[data-check-row]")[at] || null;
}

// Range les entrées selon le classement : une liste de groupes { key, label, country, entries } (un seul groupe, sans titre, sauf pour « Pays »).
// Les fonctions à fournir : nameOf(entry) → le nom, countOf(entry) → le nombre de checks, countryOf(entry) → le pays (vide si inconnu).
// Le tri de JavaScript est stable : à égalité de checks, l'ordre « Récents » est conservé.
export function arrangeChecks(entries, sort, { nameOf, countOf, countryOf }) {
  const byName = (a, b) => compareText(nameOf(a), nameOf(b));
  const byChecks = (a, b) => countOf(b) - countOf(a);
  if (sort === "checks") return [{ key: "all", entries: [...entries].sort(byChecks) }];
  if (sort === "alpha") return [{ key: "all", entries: [...entries].sort(byName) }];
  if (sort === "country") {
    const groups = new Map();
    for (const x of entries) {
      const c = countryOf(x) || "";
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(x);
    }
    return [...groups.keys()]
      .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : compareText(a, b)))
      .map((c) => ({ key: c || "none", country: c, label: c || "Pays non renseigné", entries: groups.get(c).sort(byChecks) }));
  }
  return [{ key: "all", entries }];
}

// La rangée de catégories (DrinkChecks et les trois listes de Mes Produits) : une pastille par catégorie (« Tout » d'abord), contour vert fin, de la même taille que les pastilles des classements (FINE_PILL) ;
// celle qui est choisie est pleine. Un trait fin court au-dessus de la rangée, comme au-dessus des classements de PillTabs (qui apporte lui-même le trait en dessous) ; sans PillTabs derrière,
// `bottomLine` ferme la rangée par un trait fin, comme PillTabs.
export function CategoryChips({ chips, active, onChange, bottomLine = false }) {
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
      {bottomLine && <div style={{ height: "1px", background: COLORS.paperAlt, marginBottom: "16px" }} />}
    </div>
  );
}

// Les deux totaux de ce que la page affiche (la catégorie choisie, pour DrinkChecks), en deux blocs fins côte à côte : l'intitulé à gauche, le chiffre en vert fluo à droite dans une colonne plus
// sombre, avec un trait fin à gauche (comme la colonne du chiffre des lignes). Le premier est le nombre de checks (la somme du chiffre de droite des lignes), le second le nombre d'éléments uniques
// (le nombre de lignes). `brand` : « Drink » ou « Place » (le libellé du premier bloc est « DrinkChecks » / « PlaceChecks », « Checks » en vert) ; `uniqueLabel` : [singulier, pluriel].
// Le singulier vaut pour 0 et 1.
export function CheckTotals({ checks, unique, brand, uniqueLabel }) {
  const block = (label, value, key) => (
    <div
      data-check-total={key}
      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "stretch", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", overflow: "hidden" }}
    >
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", padding: "6px 8px 6px 10px", fontSize: "11px", fontWeight: 700, color: COLORS.ink, lineHeight: 1.2 }}>{label}</span>
      <span
        style={{
          flexShrink: 0,
          minWidth: "38px",
          boxSizing: "border-box",
          padding: "0 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.paper,
          borderLeft: `1px solid ${COLORS.paperAlt}`,
          fontFamily: "'Urbanist', sans-serif",
          fontWeight: 800,
          fontSize: "14px",
          color: COLORS.amber,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
  return (
    <div data-check-totals style={{ display: "flex", gap: "10px", margin: "0 0 16px" }}>
      {block(
        <>
          {brand}
          <span style={{ color: COLORS.amber }}>{checks > 1 ? "Checks" : "Check"}</span>
        </>,
        checks,
        "checks"
      )}
      {block(unique > 1 ? uniqueLabel[1] : uniqueLabel[0], unique, "unique")}
    </div>
  );
}

// Un groupe : sa barre (drapeau éventuel + nom en vert fluo + trait + totaux éventuels en bout de ligne), puis la carte de ses lignes. Sans nom, la carte seule.
// `counts` : { checks, unique } — les totaux du groupe, au bout de la barre, sous la forme « (12 / 3) » : parenthèses et barre en blanc, chiffres en vert fluo.
export function CheckGroup({ label, flag = null, counts = null, isFirst, children }) {
  return (
    <section data-check-group={label || ""}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: isFirst ? "0 0 18px" : "20px 0 18px" }}>
          <span style={{ ...SOLO_BAR_LABEL_STYLE, display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {flag}
            {label}
          </span>
          <div style={SOLO_BAR_LINE_STYLE} />
          {counts && (
            <span data-check-group-counts style={{ ...SOLO_BAR_LABEL_STYLE, color: COLORS.ink }}>
              (<span style={{ color: COLORS.amber }}>{counts.checks}</span> / <span style={{ color: COLORS.amber }}>{counts.unique}</span>)
            </span>
          )}
        </div>
      )}
      <div data-check-section style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px", overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}

// Le rond de profil des lignes (48 px, sans bouger le texte) : voir ROW_AVATAR dans MyFavoritesScreen.jsx, partagé avec Mes Favoris.
const AVATAR_BASE = ROW_AVATAR_BASE;
const AVATAR_SIZE = ROW_AVATAR;
const ROW_PAD_Y = ROW_PAD_Y_SHARED;

// Une ligne : rond de profil, nom en gras, ligne de détails à points vert fluo, et à droite le nombre de checks.
export function CheckRow({ avatarPhotoUrl, avatarEmoji, fallbackIcon, name, parts, count, countStyle = null, onCountClick = null, isLast, onOpen }) {
  return (
    <button
      type="button"
      data-check-row
      onClick={onOpen || undefined}
      disabled={!onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: `${ROW_PAD_Y}px 0`,
        background: "none",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
        textAlign: "left",
        color: "inherit",
        font: "inherit",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex", marginLeft: `-${AVATAR_SIZE - AVATAR_BASE}px` }}>
        <EntityAvatar photoUrl={avatarPhotoUrl} photoEmoji={avatarEmoji} size={AVATAR_SIZE} fallbackIcon={fallbackIcon} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{name}</span>
        <DotLine parts={parts} />
      </div>
      {/* `count` : le contenu de la colonne (un nombre de checks, ou ma note dans Mes Produits) ; absent (null) = pas de colonne. `countStyle` : retouches de la colonne (taille, couleur, largeur).
          Colonne du chiffre : sur toute la hauteur de la ligne et jusqu'au bord de la carte, plus sombre que la carte, avec un trait fin à gauche ; le trait de séparation
          des lignes la traverse. Largeur d'au moins 52 px : les chiffres restent alignés d'une ligne à l'autre (jusqu'à 4 chiffres et au-delà, la colonne s'élargit). */}
      {count !== null && count !== undefined && (
        <span
          data-check-count
          // `onCountClick` : un clic sur la colonne fait autre chose que d'ouvrir la fiche (« Pas noté » → noter le produit) ; il ne remonte pas à la ligne.
          onClick={
            onCountClick
              ? (e) => {
                  e.stopPropagation();
                  onCountClick();
                }
              : undefined
          }
          role={onCountClick ? "button" : undefined}
          aria-label={onCountClick ? `${name} : noter ce produit` : undefined}
          style={{
            cursor: onCountClick ? "pointer" : undefined,
            flexShrink: 0,
            alignSelf: "stretch",
            minWidth: "52px",
            boxSizing: "border-box",
            padding: "0 8px",
            margin: `-${ROW_PAD_Y}px -14px -${isLast ? ROW_PAD_Y : ROW_PAD_Y + 1}px 6px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: COLORS.paper,
            borderLeft: `1px solid ${COLORS.paperAlt}`,
            borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
            fontFamily: "'Urbanist', sans-serif",
            fontWeight: 800,
            fontSize: "16px",
            color: COLORS.amber,
            whiteSpace: "nowrap",
            ...countStyle,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
