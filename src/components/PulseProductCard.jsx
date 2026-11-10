import React, { useEffect, useRef, useState } from "react";
import { COLORS, SUBTYPE_LABELS, NATIONALITY_ELIGIBLE_TYPES } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { RatingFraction } from "./NotesCard.jsx";
import { displayedAbv } from "../utils.js";
import { styleTagLabel, hasStyleLabel, registerCustomStyleLabels } from "../data/styleTagLabels.js";
import { OTHER_STYLE_TYPES } from "../data/otherStyleLabels.js";
import { loadCustomBeerCiderStylesOnce, loadCustomListStyleLabelsOnce, loadBreweriesByIds } from "../data/sharedDirectories.js";

// Producteurs des produits « checkés » dans un fil BibaPulse, par identifiant. Une seule lecture groupée pour toutes les cartes
// DrinkCheck du fil (jamais une lecture par carte), et jamais deux fois le même producteur : les identifiants déjà demandés sont
// mémorisés. Partagé par le fil général et par la section Pulse des fiches (même carte, mêmes données).
export function usePulseProducersById(entries, drinks) {
  const [producersById, setProducersById] = useState({});
  const requested = useRef(new Set());
  useEffect(() => {
    const checkedDrinkIds = new Set(
      (entries || []).filter((e) => e.eventType === "drink_checked" && e.objectType === "drink" && e.objectId).map((e) => e.objectId)
    );
    const ids = new Set();
    (drinks || []).forEach((d) => {
      if (!checkedDrinkIds.has(d.id)) return;
      (d.producerIds || []).forEach((id) => id && !requested.current.has(id) && ids.add(id));
    });
    if (ids.size === 0) return;
    ids.forEach((id) => requested.current.add(id));
    loadBreweriesByIds([...ids]).then((results) => setProducersById((prev) => ({ ...prev, ...Object.fromEntries(results.map((b) => [b.id, b])) })));
  }, [entries, drinks]);
  return producersById;
}

// Fiche produit en petit, dans une carte du fil BibaPulse (DrinkCheck). Le rond-profil (photo du produit) est centré sur les TROIS
// premières lignes ; les suivantes reviennent sous lui, contre le bord gauche du bloc (décidé par Mehdi, 2026-11-10 : avec beaucoup de
// pastilles de styles, le rond avait trop d'espace au-dessus et en dessous) :
//   1. le nom ;
//   2. la sous-catégorie, le drapeau du pays (seulement pour les catégories où le pays est affiché ailleurs dans l'app) et le degré
//      d'alcool (« 6.2% ABV », même écriture et même règle d'affichage que les listes du BibAtlas), séparés par un petit point vert
//      fluo comme sur ces listes ;
//   3. le ou les producteurs (dans l'ordre choisi dans la plateforme de gestion), à défaut le producteur saisi en texte ;
//   4. les styles, en petites pastilles (même pastille que sur la fiche produit) — sur une ou plusieurs lignes ;
//   5. la note moyenne du produit (moyenne de drink.ratings, même calcul et même format que la bannière de la fiche).
// Une ligne sans donnée n'est pas affichée. Toute la fiche est un bouton qui ouvre le produit. Les données viennent du produit
// lui-même (jamais copiées dans la carte). Les noms de styles modifiés depuis la plateforme de gestion sont chargés comme sur la
// fiche produit (une seule lecture par session).
export function PulseProductCard({ drink, producers = [], onOpen }) {
  const [, setStyleLabelsTick] = useState(0);
  const styles = Array.isArray(drink.styles) ? drink.styles : [];
  const usesListStyles = OTHER_STYLE_TYPES.includes(drink.type);
  const unknownStylesKey = styles.filter((code) => !hasStyleLabel(code)).join(",");
  const isBeer = drink.type === "Bières & Cidres";
  const needsStyleLabels = usesListStyles ? styles.length > 0 : !!unknownStylesKey || (isBeer && styles.length > 0);
  useEffect(() => {
    if (!needsStyleLabels) return;
    let cancelled = false;
    (usesListStyles ? loadCustomListStyleLabelsOnce : loadCustomBeerCiderStylesOnce)().then((list) => {
      if (registerCustomStyleLabels(list) && !cancelled) setStyleLabelsTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStyleLabels, usesListStyles, unknownStylesKey, drink.id]);

  const ratingValues = Object.values(drink.ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;
  const subtypeLabel = SUBTYPE_LABELS[drink.beverageSubtype] || drink.type || "";
  const showFlag = NATIONALITY_ELIGIBLE_TYPES.includes(drink.type) && !!drink.nationality;
  const abvValue = displayedAbv(drink);
  const abvText = abvValue != null ? `${abvValue.toFixed(1)}% ABV` : null;
  const producerNames = producers.map((p) => p.name).filter(Boolean).join(", ") || drink.brewery || "";

  const lineStyle = { display: "block", marginTop: "3px" };
  const chipStyle = { background: COLORS.paperAlt, borderRadius: "999px", padding: "0.3em 0.8em", fontSize: "10px", fontWeight: 600, color: COLORS.ink, whiteSpace: "nowrap" };

  // Ligne 2 : sous-catégorie, drapeau et degré, séparés par un petit point vert fluo (comme sur les listes du BibAtlas).
  const line2 = [];
  if (subtypeLabel) line2.push(<span key="sub" style={{ overflowWrap: "anywhere" }}>{subtypeLabel}</span>);
  if (showFlag)
    line2.push(
      <span key="flag" title={drink.nationality} style={{ display: "inline-flex", flexShrink: 0 }}>
        <CountryFlagImg country={drink.nationality} size={16} />
      </span>
    );
  if (abvText) line2.push(<span key="abv" style={{ whiteSpace: "nowrap" }}>{abvText}</span>);

  return (
    <button
      type="button"
      onClick={onOpen || undefined}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: COLORS.surfaceAlt,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "10px",
        padding: "10px 12px",
        color: COLORS.ink,
        cursor: onOpen ? "pointer" : "default",
        font: "inherit",
      }}
    >
      {/* Rond-profil, centré sur les trois premières lignes : nom, sous-catégorie / drapeau / degré, producteur(s) */}
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <EntityAvatar photoUrl={drink.photoUrl} photoEmoji={drink.avatarEmoji} size={56} />
        <span style={{ flex: 1, minWidth: 0 }}>
          {/* Ligne 1 : nom */}
          <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{drink.name}</span>
          {/* Ligne 2 : sous-catégorie · drapeau · degré */}
          {line2.length > 0 && (
            <span style={{ ...lineStyle, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", fontSize: "11.5px", color: COLORS.inkSoft }}>
              {line2.map((part, i) => (
                <React.Fragment key={part.key}>
                  {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                  {part}
                </React.Fragment>
              ))}
            </span>
          )}
          {/* Ligne 3 : producteur(s) */}
          {producerNames && <span style={{ ...lineStyle, fontSize: "11.5px", color: COLORS.inkSoft, overflowWrap: "anywhere" }}>{producerNames}</span>}
        </span>
      </span>
      {/* Lignes suivantes : sous le rond-profil, contre le bord gauche du bloc */}
      {/* Ligne 4 (et 5 si beaucoup de styles) : styles, en petites pastilles */}
      {styles.length > 0 && (
        <span style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
          {styles.map((code) => (
            <span key={code} style={chipStyle}>
              {styleTagLabel(code)}
            </span>
          ))}
        </span>
      )}
      {/* Dernière ligne : note moyenne */}
      {ratingAverage != null && (
        <span style={{ display: "block", marginTop: "8px" }}>
          <span
            title="Note moyenne"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#000", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "3px 8px" }}
          >
            <NavIcon name="star" size={13} color={COLORS.amber} filled />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "12px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}>
              <RatingFraction value={ratingAverage} />
            </span>
          </span>
        </span>
      )}
    </button>
  );
}
