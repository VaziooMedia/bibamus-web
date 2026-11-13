// ============================================================
// BibaSolo — accessible depuis BibaGo. Historique continu de
// consommations personnelles, sans notion de session/salon :
// on choisit une boisson, un prix (obligatoire), un lieu
// (optionnel), et c'est tout. Récapitulatif du jour visible en
// direct au-dessus de la liste.
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { COLORS, VOLUME_DISPLAY_TYPES, MENU_CATEGORIES, SERVING_MODE_LABELS } from "../constants.js";
import { NavIcon, CountryFlagImg, WaterAlertIcon, TokenPinkIcon, TokenGreenIcon } from "./icons.jsx";
import { GlutenFreeIcon } from "./DrinkDisplay.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar, BackFooterLink, MoneyAmount } from "./ui.jsx";
import { BibaBobModal, WaterAlertModal } from "./DashboardParts.jsx";
import { BarcodeScannerModal } from "./BarcodeScannerModal.jsx";
import { requestNotificationPermissionAndGetToken } from "../firebaseClient.js";
import {
  addSoloCheckin,
  archiveSoloCheckins,
  loadMySoloCheckins,
  loadMySoloHistory,
  deleteSoloCheckin,
  searchDrinks,
  loadDrinksByIds,
  searchVenues,
  loadVenuesByIds,
  loadNearbyVenues,
  loadGenericDrinks,
  loadMyBibaZeroStatus,
  activateBibaZeroSolo,
  deactivateBibaZeroSolo,
  useBibaZeroJokerSolo,
  loadMyWaterAlertSoloSettings,
  saveWaterAlertSoloSettings,
  upsertPushSubscription,
  loadMyJetonMovements,
  addJetonMovement,
  archiveMyJetonMovements,
  loadMyJetonSpentSince,
} from "../data/sharedDirectories.js";
import { drinkTypeLabel, resolveMenuItem, formatMoney, isAlcoholicDrink, flattenMenu, displayedAbv, displayedAlcoholTier, volumeUnit, kcalOfPortion, SERVING_MODE_OPTIONS, safeServingMode, defaultServingModeText, canBeShot, startsAsShot, makeSearchMatcher, entityNames } from "../utils.js";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";
import carteIconUrl from "../assets/brand/carte.svg";
import genericIconUrl from "../assets/brand/generic-icon-green.svg";
import drinkCheckIconUrl from "../assets/brand/drinkcheck2.svg";
import bioIconUrl from "../assets/brand/bio.svg";
import glutenFreeIconUrl from "../assets/brand/gluteen-free.svg";
import { DrinkCheckScreen } from "./DrinkCheckScreen.jsx";
import { AiIcon } from "./AiIcon.jsx";
import { SpiritKindToggle } from "./SpiritKindToggle.jsx";
import { BeerDerivativePills } from "./BeerDerivativePills.jsx";
import { useBeerDerivatives, useBeerDerivativeList } from "../hooks/useBeerDerivatives.js";
import { derivativeName, kcalPer100mlWithVariant, volumeAfterVariantChange } from "../beerDerivatives.js";
import { ServicePill, DerivativePill, serviceLabelOf } from "./ServiceTag.jsx";

// La « journée » BibaSolo ne change pas à minuit mais à 6 h du matin (heure du téléphone) : une sortie de 22 h à 4 h est une
// seule soirée. `current` = début de la période en cours (le dernier 6 h passé), `previous` = début de la période d'avant.
const SOLO_DAY_START_HOUR = 6;
// Boutons ronds à contour gris (Historique, Archiver) : 42 px, icône de 18 px.
const SOLO_ROUND_OUTLINE_BUTTON_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "none",
  border: `2px solid ${COLORS.paperAlt}`,
  boxSizing: "border-box",
  padding: 0,
  cursor: "pointer",
  flexShrink: 0,
};
// Les deux barres de séparation de la liste (« Aujourd'hui » et la date de la période précédente) ont le même style.
export const SOLO_BAR_LABEL_STYLE = { fontSize: "12px", fontWeight: 700, color: COLORS.amber, whiteSpace: "nowrap" };
export const SOLO_BAR_LINE_STYLE = { flex: 1, height: "2px", borderRadius: "1px", background: COLORS.inkSoft, opacity: 0.5 };
const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
// « Dimanche 01/11 » : le jour où la période a commencé (à 6 h).
export function formatPeriodDay(iso) {
  const d = new Date(iso);
  return `${WEEKDAYS_FR[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Début (le dernier 6 h passé, heure du téléphone) de la période qui contient l'instant donné.
export function soloPeriodStartOf(when) {
  const at = new Date(when);
  const start = new Date(at);
  start.setHours(SOLO_DAY_START_HOUR, 0, 0, 0);
  if (start > at) start.setDate(start.getDate() - 1);
  return start;
}
function soloPeriodStarts(now = new Date()) {
  const current = soloPeriodStartOf(now);
  const previous = new Date(current);
  previous.setDate(previous.getDate() - 1);
  return { current: current.toISOString(), previous: previous.toISOString() };
}

export function formatDateOnly(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTimeOnly(iso) {
  return new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

// Volume à pré-remplir pour un produit : le « Volume par défaut » encodé sur sa fiche dans la
// plateforme de gestion (default_volume_cl), à défaut l'ancien champ volume_cl de l'app. Si la
// fiche n'en porte aucun, VOLUME_FALLBACK_CL reste le dernier recours.
const VOLUME_FALLBACK_CL = "25";

// Nombre de « Lieux proches de toi » proposés sous @Home et @Event quand on choisit un lieu.
const NEARBY_VENUES_COUNT = 2;

// Étiquettes de lieu fines, identiques pour @Home, @Event et les lieux proches (24 px de haut).
const VENUE_PILL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  background: COLORS.surface,
  border: `2px solid ${COLORS.amber}`,
  borderRadius: "999px",
  padding: "2px 10px 2px 3px",
  fontSize: "10.5px",
  fontWeight: 700,
  color: COLORS.ink,
  cursor: "pointer",
};
const VENUE_PILL_ICON_STYLE = { display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 };

// Lieux « rapides » : pas de vrai lieu en base, donc rien à afficher sur la ligne du lieu dans le journal.
export const QUICK_VENUE_IDS = ["@home", "@event"];

// Icônes Bio / Gluten free de la ligne 2 du journal : les mêmes que sur les fiches, passées en gris
// (même teinte que le texte voisin).
const MENTION_ICON_STYLE = { height: "14px", width: "auto", display: "block", filter: "grayscale(1) brightness(0.72)" };
// L'icône Bio a sa feuille en haut et ses lettres en bas : sans correction, ses lettres tombent ~1,8 px sous la
// ligne de base du texte voisin. Remontée de 2,7 px (mesuré à l'écran), ses lettres posent sur la même ligne de base
// que « % ABV » ; la feuille dépasse au-dessus, dans l'interligne.
const BIO_ICON_STYLE = { ...MENTION_ICON_STYLE, transform: "translateY(-2.7px)" };

// Mise en page du formulaire d'ajout, sur deux lignes : « Volume » et « Type de service » côte à côte, puis, une ligne plus
// bas, le choix € / Jetons / Free avec le champ de prix. Chaque bloc d'encodage est UN seul bloc : un cadre gris arrondi qui
// contient, collés l'un à l'autre, son titre (bandeau vert fluo ; pour le prix, les trois onglets € / Jetons / Free) et son champ.
// Le bloc a exactement la largeur de son titre ; le bloc du bas a exactement la largeur totale des deux blocs du haut (écart
// compris), et ses trois onglets ont la même largeur.
const ENCODE_COL_GAP = 24; // écart entre « Volume » et « Type de service »
const ENCODE_ROW_GAP = 30; // écart entre la ligne du haut et le bloc du prix
const PAY_TAB_GAP = 2; // filet entre les onglets € / Jetons / Free (le gris du cadre apparaît entre eux)
const PAY_EURO_SIZE = "16px"; // le sigle € de l'onglet, plus grand que les libellés « Free » / « Jetons » (10,5 px) pour rester lisible ; tient dans le bandeau de 24 px
const ENCODE_HEADER_H = 24; // hauteur commune du bandeau de titre / des onglets, en haut de chaque bloc (barre de séparation comprise)
const ENCODE_SEPARATOR = `2px solid ${COLORS.paperAlt}`; // petite barre qui sépare le titre (ou les onglets) du champ, même gris que le cadre et les filets entre onglets
const ENCODE_FIELD_H = 44; // hauteur commune des champs (volume, type de service, prix)
const encodeBlockStyle = {
  boxSizing: "border-box",
  border: `2px solid ${COLORS.paperAlt}`,
  borderRadius: "12px",
  overflow: "hidden",
  background: COLORS.surface,
};
const encodeTitleStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  height: `${ENCODE_HEADER_H}px`,
  padding: "0 12px",
  background: COLORS.amber,
  borderBottom: ENCODE_SEPARATOR,
  fontSize: "10.5px",
  fontWeight: 700,
  color: COLORS.paper,
  whiteSpace: "nowrap",
};
// Le champ n'a plus de bordure ni d'angles à lui : c'est le cadre du bloc qui les porte. Le contour de focus est tracé à l'intérieur
// du champ (outlineOffset négatif), sans quoi le cadre le couperait.
const encodeInputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  height: `${ENCODE_FIELD_H}px`,
  padding: "0 14px",
  border: "none",
  borderRadius: 0,
  background: COLORS.surface,
  color: COLORS.ink,
  fontSize: "14px",
  textAlign: "center",
  outlineOffset: "-2px",
};
// Pris en shot (`asShot`), le volume du shot encodé sur la fiche (default_shot_volume_cl) passe en premier ; s'il n'y en a pas, on retombe sur la chaîne habituelle.
function defaultVolumeOf(drink, asShot = false) {
  for (const v of [asShot ? drink?.defaultShotVolumeCl : null, drink?.defaultVolumeCl, drink?.volumeCl]) {
    const n = Number(v);
    if (v != null && v !== "" && Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function drinkCalories(drink, volumeCl) {
  if (!drink?.kcalPer100ml) return 0;
  const volume = volumeCl || drink.volumeCl || 25;
  // kcalPer100ml est par 100 ML, mais le volume est stocké en CL (1 cl = 10 ml) ; pour un snack, c'est par 100 g et le poids est en grammes (voir kcalOfPortion).
  return kcalOfPortion(drink.kcalPer100ml, volume, drink.type);
}

const menuBadgeStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: COLORS.amberDark,
  background: COLORS.paperAlt,
  borderRadius: "5px",
  padding: "1px 5px",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

// Bloc produit — reproduit exactement la présentation de la carte d'un lieu dans BibAtlas
// (ligne 1 : nom + volume ; ligne 2 : service, drapeau, degré d'alcool, badges, prix ; ligne 3 :
// producteur), avec le drapeau sans fond et le degré d'alcool toujours visible s'il est connu.
function MenuItemBlock({ item, onClick }) {
  const alcoholTier = displayedAlcoholTier(item);
  const priceText = item.price != null ? formatMoney(item.price, "euro") : null;
  const priceParts = priceText ? priceText.split(" ") : [];
  const priceSymbol = priceParts.length > 1 ? priceParts.pop() : null;
  const priceNumber = priceParts.join(" ");

  const line2Parts = [
    item.servingMode && SERVING_MODE_LABELS[item.servingMode] ? (
      <span key="serving" style={{ fontSize: "11px", color: COLORS.inkSoft }}>
        {SERVING_MODE_LABELS[item.servingMode]}
      </span>
    ) : null,
    item.nationality ? <CountryFlagImg key="flag" country={item.nationality} size={16} /> : null,
    displayedAbv(item) != null ? (
      <span key="abv" style={{ fontSize: "11px", color: COLORS.inkSoft }}>
        {item.abv.toFixed(1)}% ABV
      </span>
    ) : null,
    alcoholTier ? (
      <span key={alcoholTier.key} title={alcoholTier.title} style={menuBadgeStyle}>
        {alcoholTier.label}
      </span>
    ) : null,
    item.bio ? (
      <span key="bio" style={menuBadgeStyle}>
        🌱 BIO
      </span>
    ) : null,
    item.glutenFree ? (
      <span key="gf" style={{ ...menuBadgeStyle, padding: "3px", display: "inline-flex", alignItems: "center" }}>
        <GlutenFreeIcon size={11} />
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", boxSizing: "border-box", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "left", cursor: "pointer" }}
    >
      <EntityAvatar photoUrl={item.photoUrl} size={44} fallbackIcon="bottle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{item.name}</span>
          {item.volumeCl && <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>{item.volumeCl}{volumeUnit(item.type)}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px", flexWrap: "wrap" }}>
          {line2Parts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
              {part}
            </React.Fragment>
          ))}
          {priceText && (
            <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: 700, color: COLORS.amber, flexShrink: 0 }}>
              {priceNumber} <span style={{ fontSize: "10.5px", fontWeight: 600, color: COLORS.inkSoft }}>{priceSymbol}</span>
            </span>
          )}
        </div>

        {item.brewery && <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>{item.brewery}</p>}
      </div>
    </button>
  );
}

// Écran d'ajout — recherche une boisson, prix obligatoire. Le lieu est fixé une fois sur la
// page principale de BibaSolo et appliqué automatiquement ici, sans le redemander à chaque verre.
function AddSoloCheckinScreen({ myUserId, recentDrinks = [], venue, bibaZeroActive = false, defaultCurrency = "euro", onDone, onBack, onAddDrink = null }) {
  const [query, setQuery] = useState("");
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [volume, setVolume] = useState("");
  const [price, setPrice] = useState("");
  // Monnaie dans laquelle le verre a été payé : « jeton » d'office quand le mode Jetons est activé sur l'écran principal, « euro » sinon.
  const [currency, setCurrency] = useState(defaultCurrency === "jeton" ? "jeton" : "euro"); // "euro" | "jeton"
  const [free, setFree] = useState(false); // verre offert : compte pour un prix de 0 (en euros), le prix saisi est gardé de côté
  const [offered, setOffered] = useState(""); // montant payé pour un verre offert à d'autres, dans la monnaie du verre (facultatif ; le champ ne s'ouvre qu'à la demande)
  const [offeredOpen, setOfferedOpen] = useState(false);
  const priceInputRef = useRef(null); // champ de prix : reçoit le curseur (et le clavier numérique) dès qu'on touche € ou Jetons
  const priceTyped = useRef(false); // la personne a-t-elle commencé à taper le prix ? (voir l'effet des dérivés plus bas)
  const [servingMode, setServingMode] = useState(""); // type de service : "" (non défini) | bouteille | canette | fut | verre | pet | brique | carton
  const [asShot, setAsShot] = useState(false); // spiritueux pris en shot (choix Spiritueux / Shot)
  const [shotSource, setShotSource] = useState(null); // fiche complète du produit choisi : dit s'il peut être un shot et fournit ses valeurs par défaut
  const [saving, setSaving] = useState(false);
  // Dérivé du produit choisi (bière : Mazout, Tango… ; spiritueux : Coca, Tonic…) : aucune pastille active au départ = la bière telle quelle. Les dérivés proposés sont ceux
  // cochés sur la fiche du produit dans la gestion ; le verre reste le produit de base, seule l'énergie change.
  const [variantCode, setVariantCode] = useState(null);
  const { forProduct: derivativesFor } = useBeerDerivatives(selectedDrink ? [selectedDrink.id] : []);
  // Un spiritueux pris en Shot n'a pas de dérivé (Coca, Tonic… ne concernent que le verre de spiritueux) : pas de pastilles, et jamais de dérivé envoyé.
  const derivatives = selectedDrink && !asShot ? derivativesFor(selectedDrink.id) : [];
  const activeVariant = derivatives.some((d) => d.code === variantCode) ? variantCode : null;
  useEffect(() => {
    setVariantCode(null); // un autre produit (ou plus aucun) : on repart sans dérivé
    priceTyped.current = false;
  }, [selectedDrink?.id]);
  // Un produit qui a des dérivés : le clavier numérique du prix ne doit pas s'imposer, il masquerait les pastilles. Un produit déjà lu dans la session
  // est connu dès l'affichage (le champ n'a alors pas le curseur) ; à la première lecture, les pastilles n'arrivent qu'après l'ouverture du champ : si le
  // curseur y est encore et qu'aucun prix n'a été tapé, on le retire (le clavier se referme).
  useEffect(() => {
    if (derivatives.length > 0 && !priceTyped.current && priceInputRef.current && document.activeElement === priceInputRef.current) priceInputRef.current.blur();
  }, [derivatives.length]);
  // Un spiritueux « en dérivé » est un verre rempli : si la fiche donne le volume du verre pour ce dérivé (Vodka + Red Bull = 20 cl), le champ Volume
  // le prend ; on revient au volume d'avant en décochant (sauf si la personne a corrigé le volume entre-temps).
  const volumeBeforeVariant = useRef("");
  const chooseVariant = (code) => {
    const next = derivatives.find((d) => d.code === code) || null;
    const previous = derivatives.find((d) => d.code === activeVariant) || null;
    if (next?.volumeCl != null && previous?.volumeCl == null) volumeBeforeVariant.current = volume;
    setVolume(volumeAfterVariantChange({ currentText: volume, previous, next, volumeAvant: volumeBeforeVariant.current }));
    setVariantCode(code);
  };

  // Trois portes d'entrée distinctes une fois qu'un lieu est choisi, comme dans un salon : sa
  // propre carte (par catégories), une recherche libre dans tout BibAtlas, ou une recherche
  // bornée aux produits marqués génériques.
  const [pickMode, setPickMode] = useState(null); // null | "carte" | "bibatlas" | "generic"
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [carteQuery, setCarteQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  // Carte du lieu choisi — comme dans un salon, seuls les vrais produits du catalogue (pas les
  // ajouts purement locaux au menu d'un lieu) peuvent être réutilisés ici, sinon le nom ne se
  // résoudrait plus correctement ensuite dans l'historique ou les stats. Le menu stocké ne
  // contient que sourceDrinkId + prix — le vrai nom/type/volume vient du catalogue, chargé ici
  // puis appliqué à chaque item exactement comme le fait la création d'un salon.
  const [venueDrinks, setVenueDrinks] = useState([]);
  useEffect(() => {
    const ids = [...new Set((venue?.menu || []).filter((d) => d && d.fromDirectory && d.sourceDrinkId).map((d) => d.sourceDrinkId))];
    if (ids.length === 0) return;
    loadDrinksByIds(ids).then(setVenueDrinks);
  }, [venue]);
  const venueMenuItems = flattenMenu(venue?.menu || [])
    .filter((item) => item && item.fromDirectory && item.sourceDrinkId)
    .map((item) => resolveMenuItem(item, venueDrinks))
    .filter((item) => item.name)
    .filter((item) => !bibaZeroActive || !isAlcoholicDrink(item));
  const categoryOf = (d) => (MENU_CATEGORIES.includes(d.menuCategory) ? d.menuCategory : MENU_CATEGORIES.includes(d.type) ? d.type : "Non classé");
  const venueCategories = [...MENU_CATEGORIES, "Non classé"].filter((cat) => venueMenuItems.some((d) => categoryOf(d) === cat));
  const itemsInCategory = (cat) => venueMenuItems.filter((d) => categoryOf(d) === cat);
  const visibleRecentDrinks = bibaZeroActive ? recentDrinks.filter((d) => !isAlcoholicDrink(d)) : recentDrinks;

  const q = query.trim();
  const [rawDrinkResults, setRawDrinkResults] = useState([]);
  const drinkResults = bibaZeroActive ? rawDrinkResults.filter((d) => !isAlcoholicDrink(d)) : rawDrinkResults;
  useEffect(() => {
    if (q.length < 2) {
      setRawDrinkResults([]);
      return;
    }
    const timer = setTimeout(() => {
      // Sans limite explicite : la même recherche, avec la même limite par défaut, que la barre de recherche BibAtlas (SearchScreen),
      // pour que tous les produits trouvés s'affichent (une limite à 8 laissait croire qu'il n'y en avait que 8).
      searchDrinks(query.trim()).then(setRawDrinkResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [q, query]);

  // Produits génériques — chargés une fois, filtrés côté client sur la recherche tapée.
  const [genericDrinks, setGenericDrinks] = useState([]);
  const [genericQuery, setGenericQuery] = useState("");
  useEffect(() => {
    if (pickMode === "generic" && genericDrinks.length === 0) loadGenericDrinks().then(setGenericDrinks);
  }, [pickMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Même règle de recherche que partout dans l'app (voir makeSearchMatcher) pour la carte du lieu, une catégorie de la carte et les produits génériques.
  const carteMatches = makeSearchMatcher(carteQuery);
  const categoryMatches = makeSearchMatcher(categoryQuery);
  const genericMatches = makeSearchMatcher(genericQuery);
  const genericResults = genericDrinks.filter((d) => genericMatches(entityNames(d))).filter((d) => !bibaZeroActive || !isAlcoholicDrink(d));
  // Les dérivés des produits proposés (mes verres, carte du lieu, résultats de recherche) sont lus d'avance : au moment où on touche un produit, on sait
  // déjà s'il a des dérivés, donc le clavier du prix ne s'ouvre pas pour rien (voir l'effet sur `derivatives`). 100 produits au plus.
  useBeerDerivatives(
    [...new Set([...visibleRecentDrinks.map((d) => d.id), ...venueMenuItems.map((d) => d.sourceDrinkId), ...drinkResults.map((d) => d.id), ...genericResults.map((d) => d.id)])].filter(Boolean).slice(0, 100)
  );

  // Un spiritueux dont la fiche a la case « Shot » cochée propose le choix Spiritueux / Shot ; il démarre en Shot si la fiche
  // le dit par défaut. Volume et type de service reprennent alors les valeurs du shot de la fiche.
  const selectDrink = (d) => {
    const shot = startsAsShot(d);
    setSelectedDrink(d);
    setShotSource(d);
    setAsShot(shot);
    setVolume(String(defaultVolumeOf(d, shot) ?? VOLUME_FALLBACK_CL));
    setServingMode(defaultServingModeText(d, shot));
  };

  // Changer de choix (Spiritueux / Shot) remet volume et type de service aux valeurs de la fiche pour ce choix ; le prix reste tel quel.
  const changeKind = (next) => {
    if (next === asShot) return;
    setAsShot(next);
    setVariantCode(null); // le dérivé choisi pour le verre ne suit pas le passage en Shot (ni le retour)
    setVolume(String(defaultVolumeOf(shotSource, next) ?? VOLUME_FALLBACK_CL));
    setServingMode(defaultServingModeText(shotSource, next));
  };

  // Choisir un item de la carte du lieu — pré-remplit aussi le prix et le volume réellement
  // pratiqués là-bas, modifiables ensuite comme d'habitude. Si la carte ne précise pas le
  // volume, c'est celui par défaut de la fiche du produit qui s'applique.
  const selectVenueMenuItem = (item) => {
    const master = venueDrinks.find((m) => m.id === item.sourceDrinkId);
    // Sur la carte d'un lieu, c'est la carte qui dit si le verre est un shot (catégorie « Shots »).
    const shot = categoryOf(item) === "Shots";
    setSelectedDrink({ id: item.sourceDrinkId, name: item.name, photoUrl: item.photoUrl, avatarEmoji: master?.avatarEmoji });
    setShotSource(master || null);
    setAsShot(shot);
    setVolume(item.volumeCl ? String(item.volumeCl) : String(defaultVolumeOf(master, shot) ?? VOLUME_FALLBACK_CL));
    // Le type de service que le lieu précise sur sa carte passe avant celui par défaut de la fiche du produit.
    setServingMode(safeServingMode(item.servingMode) || defaultServingModeText(master, shot));
    if (item.price != null) setPrice(String(item.price).replace(".", ","));
    // Une carte tarifée en jetons : le prix repris ici est un nombre de jetons, pas des euros. Une carte tarifée en euros remet
    // les euros, même si le mode Jetons avait mis « Jetons » par défaut : sinon son prix en euros atterrirait dans le champ des jetons.
    if (venue?.defaultCurrency === "jeton") setCurrency("jeton");
    else if (venue?.defaultCurrency === "euro") setCurrency("euro");
  };

  const [error, setError] = useState(null);

  // À la maison (@Home), on boit ce qu'il y a dans son frigo : rien n'est payé, donc pas de prix.
  const isHome = venue?.id === "@home";
  // Le montant offert suit la monnaie du verre : jetons quand le verre est payé en jetons, euros sinon. Pas à la maison (pas de prix), ni avec « Free » (verre sans monnaie).
  const canOffer = !isHome && !free;
  const offeredInJetons = currency === "jeton";

  const handleSubmit = async () => {
    if (!selectedDrink || (!isHome && !free && !price)) return;
    setSaving(true);
    setError(null);
    const volumeNum = parseFloat(String(volume).replace(",", ".")) || null;
    // @Home : pas de prix. « Free » : prix 0, en euros. Sinon, le prix saisi dans la monnaie choisie.
    const priceNum = isHome ? null : free ? 0 : parseFloat(price.replace(",", "."));
    const offeredNum = canOffer && offeredOpen ? parseFloat(String(offered).replace(",", ".")) : 0;
    const result = await addSoloCheckin(myUserId, selectedDrink.id, priceNum, venue?.id, volumeNum, free ? "euro" : currency, servingMode, asShot, offeredNum, activeVariant);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Ajouter un Produit</h1>
      </div>

      {!selectedDrink ? (
        <>
          {pickMode === null && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: COLORS.surface,
                  border: `2px solid ${COLORS.paperAlt}`,
                  borderRadius: "12px",
                  padding: "10px 14px",
                  boxSizing: "border-box",
                  marginBottom: "14px",
                }}
              >
                <NavIcon name="search" size={17} color={COLORS.inkSoft} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher dans BibAtlas..."
                  style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
                />
                <span style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />
                <button onClick={() => setScannerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}>
                  <AiIcon size={28} bleed />
                </button>
              </div>

              {query.length >= 2 ? (
                drinkResults.length > 0 ? (
                  <div style={{ marginBottom: "18px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                    {drinkResults.map((d, i) => (
                      <button
                        key={d.id}
                        onClick={() => selectDrink(d)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          background: "none",
                          border: "none",
                          borderBottom: i === drinkResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                          padding: "12px 4px",
                          textAlign: "left",
                          cursor: "pointer",
                          color: COLORS.ink,
                        }}
                      >
                        <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={32} fallbackIcon="bottle" />
                        <span style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                          {displayedAbv(d) != null && (
                            <>
                              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />
                              <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{String(d.abv).replace(".", ",")}% ABV</span>
                            </>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", margin: "0 0 18px" }}>Aucun résultat.</p>
                )
              ) : (
                <>
              {visibleRecentDrinks.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Favoris</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {visibleRecentDrinks.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => selectDrink(d)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: COLORS.surface,
                          border: `2px solid ${COLORS.amber}`,
                          borderRadius: "999px",
                          padding: "5px 10px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: COLORS.ink,
                          cursor: "pointer",
                        }}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {visibleRecentDrinks.length > 0 && <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 18px" }} />}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {venueMenuItems.length > 0 && (
                  <button
                    onClick={() => setPickMode("carte")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      boxSizing: "border-box",
                      background: COLORS.surface,
                      border: `2px solid ${COLORS.amber}`,
                      borderRadius: "12px",
                      padding: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img src={carteIconUrl} alt="" style={{ height: "22px", width: "auto", display: "block" }} />
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
                      {venue.name}
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
                      Carte
                    </span>
                    <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
                  </button>
                )}
                <button
                  onClick={() => setPickMode("generic")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "12px",
                    padding: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <img src={genericIconUrl} alt="" style={{ height: "22px", width: "auto", display: "block" }} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>Produits génériques</span>
                  <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
                </button>
              </div>
            </>
          )}
          </>
          )}

          {pickMode === "carte" && (
            <>
              <button
                onClick={() => (activeCategory ? setActiveCategory(null) : setPickMode(null))}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" }}
              >
                <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
                {activeCategory ? "Catégories" : "Retour"}
              </button>

              {!activeCategory ? (
                <>
                  <input
                    type="text"
                    value={carteQuery}
                    onChange={(e) => setCarteQuery(e.target.value)}
                    placeholder="Rechercher dans la carte..."
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", marginBottom: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
                  />
                  {carteQuery.trim().length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {venueMenuItems
                        .filter((d) => carteMatches(entityNames(d)))
                        .map((item) => (
                          <MenuItemBlock key={item.id} item={item} onClick={() => selectVenueMenuItem(item)} />
                        ))}
                    </div>
                  ) : (
                    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                      {venueCategories.map((cat, i) => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            background: "none",
                            border: "none",
                            borderBottom: i === venueCategories.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                            padding: "14px 4px",
                            textAlign: "left",
                            cursor: "pointer",
                            color: COLORS.ink,
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          {drinkTypeLabel(cat)}
                          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>{itemsInCategory(cat).length} →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    placeholder={`Rechercher dans ${drinkTypeLabel(activeCategory)}...`}
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", marginBottom: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {itemsInCategory(activeCategory)
                      .filter((d) => categoryMatches(entityNames(d)))
                      .map((item) => (
                        <MenuItemBlock key={item.id} item={item} onClick={() => selectVenueMenuItem(item)} />
                      ))}
                  </div>
                </>
              )}
            </>
              )}

          {pickMode === "generic" && (
            <>
              <button
                onClick={() => setPickMode(null)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "14px" }}
              >
                <NavIcon name="back-triangle" size={12} color={COLORS.inkSoft} />
                Retour
              </button>
              <input
                type="text"
                value={genericQuery}
                onChange={(e) => setGenericQuery(e.target.value)}
                placeholder="Rechercher un produit générique..."
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
              />
              {genericResults.length > 0 && (
                <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", maxHeight: "340px", overflowY: "auto" }}>
                  {genericResults.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => selectDrink(d)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderBottom: i === genericResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                        padding: "12px 4px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: COLORS.ink,
                      }}
                    >
                      <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={32} fallbackIcon="bottle" />
                      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        {displayedAbv(d) != null && (
                          <>
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>{String(d.abv).replace(".", ",")}% ABV</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "12px",
              padding: "5px 12px",
              marginTop: "18px",
              marginBottom: canBeShot(shotSource) || derivatives.length > 0 ? "28px" : "32px",
            }}
          >
            <EntityAvatar photoUrl={selectedDrink.photoUrl} photoEmoji={selectedDrink.avatarEmoji} size={28} fallbackIcon="bottle" />
            <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedDrink.name}</span>
            <button onClick={() => setSelectedDrink(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>

          {/* Spiritueux dont la fiche a la case « Shot » : choix Spiritueux / Shot (boutons fins), centré comme le formulaire en dessous */}
          {canBeShot(shotSource) && <SpiritKindToggle fine asShot={asShot} onChange={changeKind} style={{ margin: "0 auto 32px" }} />}

          {/* Bière dont la fiche a des dérivés (Mazout, Tango…) : rangée de pastilles au même endroit et dans le même style que ce choix ; aucune active = la bière telle quelle */}
          {derivatives.length > 0 && <BeerDerivativePills derivatives={derivatives} activeCode={activeVariant} onChange={chooseVariant} style={{ margin: "0 auto 32px" }} />}

          {/* Ligne 1 : « Volume » et « Type de service » côte à côte, chacun aussi large que sa pastille de titre.
              Ligne 2 : choix € / Jetons / Free et champ de prix, exactement aussi larges que la ligne 1 (@Home : pas de prix). */}
          <div data-encode="form" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", width: "fit-content", margin: "0 auto 40px", gap: `${ENCODE_ROW_GAP}px` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: `${ENCODE_COL_GAP}px` }}>
              <div data-encode="volume" style={{ ...encodeBlockStyle, flex: "0 0 auto", minWidth: 0 }}>
                <label htmlFor="solo-volume" style={encodeTitleStyle}>{selectedDrink.type === "Snacks" ? "Poids (g.)" : "Volume (cl.)"}</label>
                <input
                  id="solo-volume"
                  type="text"
                  inputMode="decimal"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="00"
                  style={{ ...encodeInputStyle, width: 0, minWidth: "100%", padding: "0 8px" }}
                />
              </div>

              <div data-encode="service" style={{ ...encodeBlockStyle, flex: "0 0 auto", minWidth: 0 }}>
                <label htmlFor="solo-service" style={encodeTitleStyle}>Type de service</label>
                <div style={{ position: "relative", width: 0, minWidth: "100%" }}>
                  <select
                    id="solo-service"
                    value={servingMode}
                    onChange={(e) => setServingMode(e.target.value)}
                    style={{ ...encodeInputStyle, WebkitAppearance: "none", appearance: "none", textAlign: "left", padding: "0 26px 0 11px", fontSize: "13px", cursor: "pointer" }}
                  >
                    <option value="">Non défini</option>
                    {SERVING_MODE_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" style={{ position: "absolute", right: "9px", top: "50%", marginTop: "-3px", pointerEvents: "none" }}>
                    <path d="M1 1l4 4 4-4" fill="none" stroke={COLORS.inkSoft} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {!isHome && (
              <div data-encode="price" style={{ ...encodeBlockStyle, width: 0, minWidth: "100%", borderRadius: canOffer && offeredOpen ? "12px 12px 0 0" : "12px" }}>
                <div role="group" aria-label="Monnaie" style={{ boxSizing: "border-box", height: `${ENCODE_HEADER_H}px`, display: "flex", gap: `${PAY_TAB_GAP}px`, background: COLORS.paperAlt, borderBottom: ENCODE_SEPARATOR }}>
                  {[
                    ["euro", "€"],
                    ["jeton", "Jetons"],
                    ["free", "Free"],
                  ].map(([key, label]) => {
                    const active = free ? key === "free" : key === currency;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        aria-label={key === "jeton" ? "Jetons" : undefined}
                        onClick={() => {
                          if (key === "free") {
                            setFree(true);
                          } else {
                            // Le champ est grisé tant que « Free » est actif : on applique le changement tout de suite (flushSync),
                            // puis on met le curseur dans le champ dans le même geste, pour que le clavier numérique s'ouvre aussi sur mobile.
                            flushSync(() => {
                              setFree(false);
                              setCurrency(key);
                            });
                            priceInputRef.current?.focus();
                          }
                        }}
                        style={{
                          flex: "1 1 0",
                          minWidth: 0,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: active ? COLORS.amber : COLORS.surface,
                          border: "none",
                          borderRadius: 0,
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: active ? COLORS.paper : COLORS.ink,
                          cursor: "pointer",
                        }}
                      >
                        {key === "jeton" ? <TokenPinkIcon size={13} /> : key === "euro" ? <span style={{ fontSize: PAY_EURO_SIZE, lineHeight: 1 }}>{label}</span> : label}
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={priceInputRef}
                  type="text"
                  inputMode="decimal"
                  aria-label="Prix"
                  value={free ? "-" : price}
                  onChange={(e) => {
                    priceTyped.current = true;
                    setPrice(e.target.value);
                  }}
                  disabled={free}
                  placeholder={currency === "jeton" ? "0" : "0,00"}
                  autoFocus={derivatives.length === 0}
                  style={free ? { ...encodeInputStyle, opacity: 0.45, background: COLORS.paper } : encodeInputStyle}
                />
              </div>
            )}
            {/* Facultatif, sous le prix du verre : ce qu'on a payé en plus pour offrir un verre à d'autres, en euros ou en jetons comme le verre. Un simple lien tant qu'on n'en a pas besoin. */}
            {canOffer &&
              (offeredOpen ? (
                // Ouvert, le bloc se colle sous celui du prix : on annule l'écart de la colonne (+ 2 px, pour que son filet du haut recouvre le filet du bas du
                // bloc du prix et ne fasse qu'un seul trait), et seuls les angles extérieurs restent arrondis.
                <div data-encode="offered" style={{ ...encodeBlockStyle, width: 0, minWidth: "100%", marginTop: `-${ENCODE_ROW_GAP + 2}px`, borderRadius: "0 0 12px 12px" }}>
                  {/* Le titre est aussi un bouton : un appui referme le bloc (le lien « + Offrir » revient) et efface le montant saisi. */}
                  <button type="button" data-encode="offered-close" aria-label="Masquer le bloc Offrir" onClick={() => { setOffered(""); setOfferedOpen(false); }} style={{ ...encodeTitleStyle, width: "100%", borderTop: "none", borderLeft: "none", borderRight: "none", fontFamily: "inherit", cursor: "pointer" }}>
                    Offrir
                  </button>
                  <input id="solo-offered" type="text" inputMode="decimal" aria-label="Montant offert" value={offered} onChange={(e) => setOffered(e.target.value)} placeholder={offeredInJetons ? "0" : "0,00"} autoFocus style={encodeInputStyle} />
                </div>
              ) : (
                <button type="button" data-encode="offered-open" onClick={() => setOfferedOpen(true)} style={{ alignSelf: "center", marginTop: "-14px", background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 700, color: COLORS.amber }}>
                  + Offrir
                </button>
              ))}
          </div>

          {venue && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "18px" }}>
              <NavIcon name="map-pin" size={14} color={COLORS.amber} />
              {venue.name}
            </div>
          )}

          {error && <p style={{ fontSize: "12.5px", color: "#FF3B3B", marginTop: "10px" }}>{error}</p>}

          <PrimaryButton onClick={handleSubmit} disabled={(!isHome && !free && !price) || saving} style={{ width: "100%", marginTop: "24px" }}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </PrimaryButton>
        </>
      )}

      <PageFooterNav onBack={onBack} />

      {scannerOpen && (
        <BarcodeScannerModal
          myBibroCode={myUserId}
          onClose={() => setScannerOpen(false)}
          onAddDrink={
            onAddDrink
              ? () => {
                  setScannerOpen(false);
                  onAddDrink();
                }
              : null
          }
          onFoundDrink={async (drinkId) => {
            setScannerOpen(false);
            const [d] = await loadDrinksByIds([drinkId]);
            if (d) selectDrink(d);
          }}
        />
      )}
    </div>
  );
}

// Même vrai principe que WaterAlertSettingsScreen (MinorScreens.jsx), mais persisté sur le
// profil plutôt que sur un event de salon — "rounds" (tournées) devient "checkins"
// (consommations du jour).
function WaterAlertSoloSettingsScreen({ myUserId, settings, checkinCount, onSave, onBack }) {
  const wa = settings || {};
  const [mode, setMode] = useState(wa.enabled ? wa.mode || "time" : "off");
  const [everyMinutes, setEveryMinutes] = useState(wa.everyMinutes ? String(wa.everyMinutes) : "30");
  const [everyRounds, setEveryRounds] = useState(wa.everyRounds ? String(wa.everyRounds) : "3");

  const options = [
    { key: "off", label: "Désactivé", desc: "Aucun rappel" },
    { key: "time", label: "Toutes les X minutes", desc: "Rappel basé sur le temps écoulé" },
    { key: "checkins", label: "Toutes les X consommations", desc: "Rappel basé sur le nombre de verres du jour" },
  ];

  const handleSubmit = async () => {
    if (mode === "off") {
      await saveWaterAlertSoloSettings(myUserId, { enabled: false });
      onSave({ enabled: false });
      return;
    }
    const token = await requestNotificationPermissionAndGetToken();
    if (token) {
      await upsertPushSubscription(token, "web");
    } else if (Notification?.permission === "denied") {
      alert("Notifications refusées — le rappel s'affichera quand même à l'écran tant que l'app est ouverte, mais pas en notification.");
    }
    const next = {
      enabled: true,
      mode,
      everyMinutes: parseInt(everyMinutes, 10) || 30,
      everyRounds: parseInt(everyRounds, 10) || 3,
      // Point de départ posé à l'activation : sans lui, le premier rappel partirait aussitôt (temps) ou
      // ne partirait jamais (consommations). Le serveur tient ensuite l'heure de ses propres rappels de son côté.
      ...(mode === "time" ? { lastReminderAt: new Date().toISOString() } : {}),
      ...(mode === "checkins" && typeof checkinCount === "number" ? { lastReminderCount: checkinCount } : {}),
    };
    await saveWaterAlertSoloSettings(myUserId, next);
    onSave(next);
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 6px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <WaterAlertIcon size={26} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Water<span style={{ color: COLORS.amber }}>Alert</span>
        </h1>
      </div>

      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "18px" }}>
        Un rappel s'affiche pour te suggérer de boire un verre d'eau.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {options.map((o) => (
          <div key={o.key}>
            <button
              onClick={() => setMode(o.key)}
              style={{
                width: "100%",
                textAlign: "left",
                background: mode === o.key ? COLORS.amber : COLORS.surface,
                color: mode === o.key ? COLORS.paper : COLORS.ink,
                border: `2px solid ${mode === o.key ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "14.5px" }}>{o.label}</div>
              <div style={{ fontSize: "12px", marginTop: "2px", opacity: mode === o.key ? 0.85 : 0.65 }}>{o.desc}</div>
            </button>
            {o.key === "time" && mode === "time" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", paddingLeft: "4px" }}>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>Toutes les</span>
                <select
                  value={everyMinutes}
                  onChange={(e) => setEveryMinutes(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" }}
                >
                  {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>minutes</span>
              </div>
            )}
            {o.key === "checkins" && mode === "checkins" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", paddingLeft: "4px" }}>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>Toutes les</span>
                <select
                  value={everyRounds}
                  onChange={(e) => setEveryRounds(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>consommations</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <PrimaryButton onClick={handleSubmit} withCheck style={{ width: "100%" }}>
        Valider
      </PrimaryButton>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}

// Nombre de jetons affiché comme partout ailleurs dans l'app (MoneyAmount) : au dixième près, sans « .0 » (les demi-jetons existent : 1.5).
const formatJetonCount = (value) => {
  const n = Math.round(value * 10) / 10;
  return n % 1 === 0 ? n : n.toFixed(1);
};

// Une ligne du journal (produit, volume, prix, lieu, date, croix de suppression) — la même dans la liste de BibaSolo (période en
// cours et période précédente grisée) et dans l'Historique. Sans `onDelete`, pas de croix de suppression (Historique en lecture seule).
export function SoloCheckinRow({ c, drink, venue, isLast, onOpenDrink, onDelete }) {
  const showMentions = drink && VOLUME_DISPLAY_TYPES.includes(drink.type);
  // Bière prise en dérivé (Mazout, Tango…) : une pastille grisée sur la ligne 1, à droite du nom du produit. Un dérivé retiré ou masqué depuis
  // ne s'affiche plus (le verre reste la bière de base).
  const derivativeList = useBeerDerivativeList();
  const variantName = c.variantCode ? derivativeName(derivativeList, c.variantCode) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 0",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
      }}
    >
      <button
        onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
        disabled={!drink || !onOpenDrink}
        style={{ background: "none", border: "none", padding: 0, cursor: drink && onOpenDrink ? "pointer" : "default", flexShrink: 0, marginTop: "2px" }}
      >
        <EntityAvatar photoUrl={drink?.photoUrl} photoEmoji={drink?.avatarEmoji} size={40} fallbackIcon="bottle" />
      </button>
      {/* À droite du rond : 3 lignes qui se suivent, sans ligne vide entre elles */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <button
            onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
            disabled={!drink || !onOpenDrink}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: drink && onOpenDrink ? "pointer" : "default" }}
          >
            {/* Ligne 1 — produit, puis la pastille grisée du dérivé s'il y en a un (le volume est en tête de la ligne 2). Si la ligne est trop longue,
                c'est le nom du produit qui se coupe par « … » : la pastille reste toujours visible. */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{drink?.name || "Boisson"}</span>
              {variantName && <span style={{ flexShrink: 0, display: "inline-flex" }}><DerivativePill name={variantName} /></span>}
            </div>
          </button>
          {c.price != null && (
            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, marginTop: "2px", flexShrink: 0 }}>
              {c.currency === "jeton" ? (
                <MoneyAmount value={c.price} currency="jeton" jetonIcon="pink" jetonIconSize={14} />
              ) : c.price === 0 ? (
                // Verre « Free » (enregistré avec un prix de 0 en euros) : le mot « Free » plutôt que « 0.00 € ».
                "Free"
              ) : (
                <>
                  {c.price.toFixed(2)} <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
                </>
              )}
            </span>
          )}
        </div>
        {/* Lignes 2 et 3 (sur toute la largeur, sous le prix ; points vert fluo entre les éléments ; chacune ouvre la fiche du produit ; chacune
            disparaît quand elle n'a rien à montrer).
            Ligne 2 — volume + % ABV + étiquette d'alcool (0.0 %…) + icône Bio + icône Gluten free.
            Ligne 3 — drapeau du pays + pastille de type de service : « Shot » seule pour un verre pris en shot, sans tenir compte de son type de
            service ; sinon le type de service s'il est défini. */}
        {(() => {
          const detailParts = [];
          if (c.volumeCl) detailParts.push(<span key="vol" style={{ fontWeight: 700, color: COLORS.amber, whiteSpace: "nowrap" }}>{c.volumeCl}{volumeUnit(drink?.type)}</span>);
          if (showMentions && displayedAbv(drink) != null) detailParts.push(<span key="abv">{String(drink.abv).replace(".", ",")}% ABV</span>);
          const alcoholTier = showMentions ? displayedAlcoholTier(drink) : null;
          if (alcoholTier) detailParts.push(<span key="tier" title={alcoholTier.title} style={{ whiteSpace: "nowrap" }}>{alcoholTier.label}</span>);
          if (showMentions && drink.bio) detailParts.push(<img key="bio" src={bioIconUrl} alt="Bio" style={BIO_ICON_STYLE} />);
          if (showMentions && drink.glutenFree) detailParts.push(<img key="gf" src={glutenFreeIconUrl} alt="Sans gluten" style={MENTION_ICON_STYLE} />);
          const originParts = [];
          if (drink?.nationality) originParts.push(<CountryFlagImg key="flag" country={drink.nationality} size={16} />);
          if (c.shot || serviceLabelOf(c.servingMode)) originParts.push(<ServicePill key="service" mode={c.servingMode} shot={c.shot} />);
          const renderLine = (parts, line) =>
            parts.length === 0 ? null : (
              <button
                onClick={() => drink && onOpenDrink && onOpenDrink(drink.id)}
                disabled={!drink || !onOpenDrink}
                style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, textAlign: "left", cursor: drink && onOpenDrink ? "pointer" : "default" }}
              >
                <div data-journal-line={line} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: "wrap" }}>
                  {parts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                      {part}
                    </React.Fragment>
                  ))}
                </div>
              </button>
            );
          return (
            <>
              {renderLine(detailParts, "2")}
              {renderLine(originParts, "3")}
            </>
          );
        })()}
        {/* Ligne 3 bis — montant payé pour offrir un verre à d'autres, quand il y en a un, dans la monnaie du verre (il compte dans le Dépensé ou dans les jetons dépensés, pas dans le prix du verre). */}
        {c.offeredPrice > 0 && (
          <div data-journal-line="offered" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: COLORS.inkSoft }}>
            <span style={{ fontWeight: 700, color: COLORS.amber, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              + {c.currency === "jeton" ? <MoneyAmount value={c.offeredPrice} currency="jeton" jetonIcon="pink" jetonIconSize={12} /> : <>{c.offeredPrice.toFixed(2)} €</>}
            </span>
            offerts
          </div>
        )}
        {/* Ligne 4 — lieu, avec l'icône de lieu vert fluo devant. Rien pour @Home, @Event ou sans lieu : la ligne disparaît et la date prend sa place. */}
        {venue?.name && !QUICK_VENUE_IDS.includes(c.venueId) && (
          <div data-journal-line="venue" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: COLORS.inkSoft, minWidth: 0 }}>
            {/* flexShrink 0 : sur un nom de lieu très long, l'icône garde sa taille (c'est le nom qui se coupe par « … »). */}
            <span style={{ display: "flex", flexShrink: 0 }}>
              <NavIcon name="map-pin" size={12} color={COLORS.amber} />
            </span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venue.name}</span>
          </div>
        )}
        {/* Ligne 5 (4 quand il n'y a pas de lieu) — date + heure (points vert fluo) à gauche, croix de suppression à l'extrême droite */}
        <div data-journal-line="date" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div data-journal-datetime="1" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: "wrap" }}>
            {[formatDateOnly(c.createdAt), formatTimeOnly(c.createdAt)].filter(Boolean).map((part, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                <span>{part}</span>
              </React.Fragment>
            ))}
          </div>
          {onDelete && (
            <button onClick={() => onDelete(c.id)} style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: "4px", margin: "-4px -4px -4px 0", flexShrink: 0 }}>
              <NavIcon name="x" size={14} color={COLORS.paperAlt} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Écran « Historique » : tous les verres, archivés compris, du plus récent au plus ancien, regroupés par période (6 h → 6 h) sous une
// barre datée, par pages de HISTORY_PAGE_SIZE. En lecture seule : pas de croix de suppression.
export const HISTORY_PAGE_SIZE = 40;
function SoloHistoryScreen({ onBack, onOpenDrink }) {
  const [rows, setRows] = useState(null); // null = chargement de la première page
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [drinksById, setDrinksById] = useState({});
  const [venuesById, setVenuesById] = useState({});

  const loadPage = async (offset) => {
    setLoadingMore(true);
    const page = await loadMySoloHistory(offset, HISTORY_PAGE_SIZE);
    setLoadingMore(false);
    if (page === null) {
      setError(true);
      if (offset === 0) setRows((prev) => prev || []);
      return;
    }
    setError(false);
    setRows((prev) => (offset === 0 ? page : [...(prev || []), ...page]));
    setHasMore(page.length === HISTORY_PAGE_SIZE);
  };
  useEffect(() => {
    loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Produits et lieux des verres affichés : seulement ceux qu'on n'a pas encore demandés.
  useEffect(() => {
    if (!rows) return;
    const missingDrinks = [...new Set(rows.map((c) => String(c.drinkId)))].filter((id) => !(id in drinksById));
    if (missingDrinks.length > 0) {
      loadDrinksByIds(missingDrinks).then((results) =>
        setDrinksById((prev) => {
          const next = { ...prev };
          missingDrinks.forEach((id) => (next[id] = null));
          results.forEach((d) => (next[String(d.id)] = d));
          return next;
        })
      );
    }
    const missingVenues = [...new Set(rows.filter((c) => c.venueId && !QUICK_VENUE_IDS.includes(c.venueId)).map((c) => String(c.venueId)))].filter((id) => !(id in venuesById));
    if (missingVenues.length > 0) {
      loadVenuesByIds(missingVenues).then((results) =>
        setVenuesById((prev) => {
          const next = { ...prev };
          missingVenues.forEach((id) => (next[id] = null));
          results.forEach((v) => (next[String(v.id)] = v));
          return next;
        })
      );
    }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const out = [];
    for (const c of rows || []) {
      const start = soloPeriodStartOf(c.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === start.getTime()) last.items.push(c);
      else out.push({ key: start.getTime(), start, items: [c] });
    }
    return out;
  }, [rows]);
  const currentKey = soloPeriodStartOf(new Date()).getTime();
  const thisYear = new Date().getFullYear();
  const groupLabel = (g) => {
    if (g.key === currentKey) return "Aujourd'hui";
    const label = formatPeriodDay(g.start.toISOString());
    return g.start.getFullYear() === thisYear ? label : `${label}/${g.start.getFullYear()}`;
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Historique</h1>
      </div>

      <div style={{ flex: 1 }}>
        {rows === null ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : groups.length === 0 && !error ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Aucun verre dans l'historique.</p>
        ) : (
          groups.map((g, gi) => (
            <React.Fragment key={g.key}>
              <div data-solo-history-bar="1" style={{ display: "flex", alignItems: "center", gap: "10px", margin: gi === 0 ? "0 0 18px" : "20px 0 18px" }}>
                <span data-solo-history-label="1" style={SOLO_BAR_LABEL_STYLE}>{groupLabel(g)}</span>
                <div style={SOLO_BAR_LINE_STYLE} />
              </div>
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                {g.items.map((c, i) => (
                  <SoloCheckinRow
                    key={c.id}
                    c={c}
                    drink={drinksById[String(c.drinkId)]}
                    venue={c.venueId ? venuesById[String(c.venueId)] : null}
                    isLast={i === g.items.length - 1}
                    onOpenDrink={onOpenDrink}
                  />
                ))}
              </div>
            </React.Fragment>
          ))
        )}
        {error && (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", marginTop: "16px" }}>
            Impossible de charger l'historique.{" "}
            <button type="button" onClick={() => loadPage(rows ? rows.length : 0)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        )}
        {hasMore && !error && (
          <button
            type="button"
            data-solo-history-more="1"
            disabled={loadingMore}
            onClick={() => loadPage(rows.length)}
            style={{ width: "100%", marginTop: "18px", padding: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", color: COLORS.ink, fontSize: "13px", fontWeight: 700, cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1 }}
          >
            {loadingMore ? "Chargement..." : "Voir plus"}
          </button>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Boutons ronds du bloc Jetons : 32 px pour « + » / « − » et la croix / le « + » du formulaire d'achat, 40 px pour le « + » d'achat.
const JETON_ROUND_BUTTON = { display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: "none", border: `2px solid ${COLORS.paperAlt}`, boxSizing: "border-box", padding: 0, flexShrink: 0, cursor: "pointer" };
const JETON_SMALL_BUTTON = { ...JETON_ROUND_BUTTON, width: "32px", height: "32px" };
// Annuler (croix) et valider (« + ») du formulaire d'achat : carrés à coins arrondis, plus petits que les boutons ronds « + » / « − » de la colonne de gauche.
const JETON_BUY_ACTION_BUTTON = { ...JETON_SMALL_BUTTON, width: "28px", height: "28px", borderRadius: "8px" };
const JETON_INPUT = { width: "54px", height: "34px", boxSizing: "border-box", textAlign: "center", fontSize: "15px", fontWeight: 700, color: COLORS.ink, background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", outline: "none" };

function jetonPlusIcon(color, size = 12) {
  const bar = (2.5 / 2);
  return (
    <span style={{ position: "relative", width: `${size}px`, height: `${size}px`, display: "block" }}>
      <span style={{ position: "absolute", left: 0, top: `${size / 2 - bar}px`, width: `${size}px`, height: "2.5px", borderRadius: "2px", background: color }} />
      <span style={{ position: "absolute", top: 0, left: `${size / 2 - bar}px`, width: "2.5px", height: `${size}px`, borderRadius: "2px", background: color }} />
    </span>
  );
}

// Bloc « Jetons » de l'accueil de BibaSolo, sous les trois blocs (Verres / Dépensé / Kcal) ; on l'affiche et on le masque avec
// l'icône Jetons de l'en-tête. Couleurs des jetons : vert fluo = solde positif (jeton du solde, bouton d'achat), rose = dépensés.
//   - à gauche : « + » (jeton trouvé ou offert) au-dessus de « − » (jeton donné, ou verre offert à quelqu'un) : ils ne touchent pas au Dépensé ;
//   - au centre : le solde (chiffre blanc, jeton vert, « disponible(s) »), une petite barre, puis les jetons dépensés (« 3 ● dépensés ») ;
//   - à droite : « + » vert = acheter des jetons. Le sous-bloc d'achat (X jetons contre X €) s'ouvre dessous, croix à gauche pour annuler,
//     « + » à droite pour ajouter ; les euros payés s'ajoutent au Dépensé du jour.
// `balance` vaut null tant que les mouvements ne sont pas chargés ; `onBuy` renvoie une promesse (true si l'achat est enregistré).
function SoloJetonsBlock({ balance, spent, busy, error, onAdjust, onBuy }) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyCount, setBuyCount] = useState("");
  const [buyEuro, setBuyEuro] = useState("");
  const buyN = parseFloat(String(buyCount).replace(",", "."));
  const canBuy = buyN > 0 && !busy;
  const closeBuy = () => {
    setBuyOpen(false);
    setBuyCount("");
    setBuyEuro("");
  };
  const confirmBuy = async () => {
    if (!canBuy) return;
    const euro = parseFloat(String(buyEuro).replace(",", "."));
    const ok = await onBuy(buyN, Number.isFinite(euro) && euro > 0 ? euro : 0);
    if (ok) closeBuy();
  };
  const stock = balance ?? 0;
  const canMinus = balance != null && balance > 0 && !busy;
  return (
    <div data-jetons-block="1" style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
          <button type="button" onClick={() => onAdjust(1)} disabled={busy} title="Ajouter un jeton (trouvé ou offert)" aria-label="Ajouter un jeton" style={{ ...JETON_SMALL_BUTTON, opacity: busy ? 0.6 : 1 }}>
            {jetonPlusIcon(COLORS.ink)}
          </button>
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            disabled={!canMinus}
            title="Retirer un jeton (donné, ou verre offert à quelqu'un)"
            aria-label="Retirer un jeton"
            style={{ ...JETON_SMALL_BUTTON, opacity: canMinus ? 1 : 0.35, cursor: canMinus ? "pointer" : "default" }}
          >
            <span style={{ width: "12px", height: "2.5px", borderRadius: "2px", background: COLORS.ink }} />
          </button>
        </div>
        <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
          <div data-jeton-count="1" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "22px", fontWeight: 800, color: stock < 0 ? COLORS.pinkFluo : COLORS.ink }}>
            {balance == null ? "–" : formatJetonCount(balance)}
            <TokenGreenIcon size={20} />
          </div>
          <div data-jeton-label="1" style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>{stock < 2 ? "disponible" : "disponibles"}</div>
          <div style={{ width: "40px", height: "2px", borderRadius: "1px", background: COLORS.paperAlt, margin: "7px auto 6px" }} />
          <div data-jeton-spent="1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "11px", color: COLORS.inkSoft }}>
            <span style={{ fontWeight: 700, color: COLORS.ink }}>{formatJetonCount(spent)}</span>
            <TokenPinkIcon size={11} />
            <span>{spent > 0 && spent < 2 ? "dépensé" : "dépensés"}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBuyOpen(true)}
          disabled={buyOpen}
          title="Acheter des jetons"
          aria-label="Acheter des jetons"
          style={{ ...JETON_ROUND_BUTTON, position: "relative", overflow: "visible", border: `2px solid ${COLORS.amber}`, opacity: buyOpen ? 0.35 : 1, cursor: buyOpen ? "default" : "pointer" }}
        >
          {/* Un jeton vert avec un petit « + » : on achète des jetons, et ce bouton ne se confond plus avec le « + » de « Ajouter un Produit ». */}
          <TokenGreenIcon size={22} />
          <span style={{ position: "absolute", top: "-6px", right: "-6px", width: "16px", height: "16px", borderRadius: "50%", background: COLORS.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {jetonPlusIcon(COLORS.paper, 9)}
          </span>
        </button>
      </div>
      {buyOpen && (
        <div data-jeton-buy="1">
          <div style={{ borderTop: `2px solid ${COLORS.paperAlt}`, margin: "12px -14px 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft }}>
            <button type="button" onClick={closeBuy} title="Annuler" aria-label="Annuler" style={JETON_BUY_ACTION_BUTTON}>
              <span style={{ display: "block", transform: "rotate(45deg)" }}>{jetonPlusIcon(COLORS.ink)}</span>
            </button>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <input type="text" inputMode="decimal" aria-label="Nombre de jetons" value={buyCount} onChange={(e) => setBuyCount(e.target.value)} placeholder="0" autoFocus style={JETON_INPUT} />
              <span style={{ whiteSpace: "nowrap" }}>jetons contre</span>
              <input type="text" inputMode="decimal" aria-label="Montant payé en euros" value={buyEuro} onChange={(e) => setBuyEuro(e.target.value)} placeholder="0,00" style={JETON_INPUT} />
              <span style={{ fontWeight: 600 }}>€</span>
            </div>
            <button
              type="button"
              onClick={confirmBuy}
              disabled={!canBuy}
              title="Ajouter les jetons"
              aria-label="Ajouter les jetons achetés"
              style={{ ...JETON_BUY_ACTION_BUTTON, background: COLORS.amber, border: `2px solid ${COLORS.amber}`, opacity: canBuy ? 1 : 0.35, cursor: canBuy ? "pointer" : "default" }}
            >
              {jetonPlusIcon(COLORS.paper)}
            </button>
          </div>
        </div>
      )}
      {error && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: "10px 0 0" }}>{error}</p>}
    </div>
  );
}

export function BibaSoloScreen({ myUserId, myBibroCode, onRateDrink, onUnrateDrink, onCheckDrink, onCheckConfirmed, onOpenDrink, onBack, onAddDrink, startInHistory = false, onHistoryOpenChange }) {
  const [checkins, setCheckins] = useState(null); // période en cours (de 6 h à 6 h) : c'est elle que comptent les compteurs
  const [previousCheckins, setPreviousCheckins] = useState(null); // période d'avant, affichée grisée sous la liste
  const [previousPeriodStart, setPreviousPeriodStart] = useState(null); // début (6 h) de la période d'avant : sa date s'affiche dans la barre de séparation
  const [spentInfoOpen, setSpentInfoOpen] = useState(false); // bulle de détail du bloc « Dépensé » (mes consommations / consommations offertes / jetons achetés)
  const [periodInfoOpen, setPeriodInfoOpen] = useState(null); // bulle d'explication des périodes ouverte : null | "today" | "previous" (icône « info » de chaque barre)
  const spentTileRef = useRef(null);
  // Comme la bulle des périodes ci-dessous : un appui n'importe où ailleurs que sur le bloc « Dépensé » referme sa bulle (un appui sur le bloc la referme déjà).
  useEffect(() => {
    if (!spentInfoOpen) return undefined;
    const close = (e) => {
      if (spentTileRef.current && !spentTileRef.current.contains(e.target)) setSpentInfoOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [spentInfoOpen]);
  const todayBarRef = useRef(null);
  const previousBarRef = useRef(null);
  useEffect(() => {
    if (!periodInfoOpen) return undefined;
    const close = (e) => {
      const bar = periodInfoOpen === "today" ? todayBarRef.current : previousBarRef.current;
      if (bar && !bar.contains(e.target)) setPeriodInfoOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [periodInfoOpen]);
  const [recentDrinkIds, setRecentDrinkIds] = useState([]);
  const [adding, setAdding] = useState(false);
  // L'écran est démonté quand on ouvre une fiche produit : l'Historique ouvert est donc signalé à l'application (onHistoryOpenChange), qui nous le
  // rend au retour de la fiche (startInHistory) pour qu'on retombe sur l'Historique et non sur l'accueil de BibaSolo.
  const [historyOpen, setHistoryOpen] = useState(!!startInHistory);
  useEffect(() => {
    onHistoryOpenChange?.(historyOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen]);
  const [checkingDrinks, setCheckingDrinks] = useState(false);
  const [caloriesHidden, setCaloriesHidden] = useState(false);
  // Jetons — l'icône de l'en-tête affiche / masque le bloc Jetons ; ce choix est retenu sur cet appareil (comme le lieu actuel).
  const jetonsStorageKey = `bibasolo-${myUserId}-jetons-on`;
  const [jetonsOn, setJetonsOnState] = useState(() => {
    try {
      return localStorage.getItem(jetonsStorageKey) === "1";
    } catch {
      return false;
    }
  });
  const toggleJetons = () => {
    const next = !jetonsOn;
    setJetonsOnState(next);
    try {
      if (next) localStorage.setItem(jetonsStorageKey, "1");
      else localStorage.removeItem(jetonsStorageKey);
    } catch {
      // localStorage indisponible : le bloc reste affiché / masqué pour la session en cours, simplement pas retrouvé à la prochaine ouverture.
    }
  };
  const [jetonMovements, setJetonMovements] = useState(null); // null tant que non chargés
  const [jetonSpentTotal, setJetonSpentTotal] = useState(0); // jetons des verres payés en jetons depuis le premier mouvement (archivés compris)
  const [jetonBusy, setJetonBusy] = useState(false);
  const [jetonError, setJetonError] = useState("");
  const [drinksById, setDrinksById] = useState({});
  const [venuesById, setVenuesById] = useState({});

  // Lieu actuel — fixé une fois ici, appliqué automatiquement à chaque verre ajouté ensuite,
  // sans le redemander à chaque fois. Persisté pour tenir jusqu'à ce qu'on le change soi-même,
  // même en quittant puis en revenant sur BibaSolo. Géolocalisation tentée dès l'ouverture de
  // l'écran, en arrière-plan ; silencieuse si refusée ou indisponible, la recherche manuelle
  // reste là.
  const venueStorageKey = `bibasolo-${myUserId}-current-venue`;
  const [currentVenue, setCurrentVenueState] = useState(() => {
    try {
      const stored = localStorage.getItem(venueStorageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const setCurrentVenue = (next) => {
    setCurrentVenueState(next);
    try {
      if (next) localStorage.setItem(venueStorageKey, JSON.stringify(next));
      else localStorage.removeItem(venueStorageKey);
    } catch {
      // localStorage indisponible (mode privé, quota...) — le lieu reste actif pour la session
      // en cours, simplement pas retrouvé à la prochaine ouverture.
    }
  };
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState([]);

  // BibaZERO — même vrai concept qu'en salon (voir BibaBobModal), persisté sur le profil.
  const [bibaZero, setBibaZero] = useState(null);
  const [bibaZeroMenuOpen, setBibaZeroMenuOpen] = useState(false);
  const [bibaBobModalMode, setBibaBobModalMode] = useState(null); // null | "activate" | "deactivate"
  const refreshBibaZero = () => loadMyBibaZeroStatus(myUserId).then(setBibaZero);
  useEffect(() => {
    refreshBibaZero();
  }, [myUserId]);

  // WaterAlert — même vrai concept qu'en salon.
  // - Mode « toutes les X minutes » : le serveur envoie un vrai push à ce seul compte, app fermée (tâche
  //   planifiée water-alert-solo-time-check), à partir de l'heure d'activation enregistrée dans le réglage. Tant que
  //   l'app est ouverte sur BibaSolo, la fenêtre ci-dessous s'affiche à l'écran (un push ne s'affiche pas au premier plan).
  // - Mode « toutes les X consommations » : entièrement dans l'app, puisque c'est en ajoutant un verre ici qu'il se
  //   déclenche. Le compteur de départ est enregistré avec le réglage : il tient d'une ouverture de BibaSolo à l'autre.
  const [waterAlert, setWaterAlert] = useState(null);
  const [waterAlertModalOpen, setWaterAlertModalOpen] = useState(false);
  const [waterAlertSettingsOpen, setWaterAlertSettingsOpen] = useState(false);
  useEffect(() => {
    loadMyWaterAlertSoloSettings(myUserId).then(setWaterAlert);
  }, [myUserId]);
  const saveWaterAlertCount = (count) => {
    const next = { ...waterAlert, lastReminderCount: count };
    setWaterAlert(next);
    saveWaterAlertSoloSettings(myUserId, next);
  };
  useEffect(() => {
    if (!waterAlert || !waterAlert.enabled || waterAlert.mode !== "checkins" || checkins === null) return;
    const count = checkins.length;
    const base = waterAlert.lastReminderCount;
    // Réglage activé sans compteur de départ, ou compteur du jour reparti plus bas (liste archivée, verre
    // supprimé, nouvelle journée) : on repart du compteur actuel, sans rappel.
    if (typeof base !== "number" || count < base) {
      saveWaterAlertCount(count);
      return;
    }
    if (count - base >= (waterAlert.everyRounds || 3)) {
      setWaterAlertModalOpen(true);
      saveWaterAlertCount(count);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkins?.length, waterAlert?.enabled, waterAlert?.mode, waterAlert?.everyRounds, waterAlert?.lastReminderCount]);
  useEffect(() => {
    if (!waterAlert || !waterAlert.enabled || waterAlert.mode !== "time") return;
    const checkElapsed = () => {
      const lastAt = waterAlert.lastReminderAt || new Date().toISOString();
      const elapsedMs = Date.now() - new Date(lastAt).getTime();
      if (elapsedMs >= (waterAlert.everyMinutes || 30) * 60000) {
        setWaterAlertModalOpen(true);
        setWaterAlert((w) => ({ ...w, lastReminderAt: new Date().toISOString() }));
      }
    };
    const interval = setInterval(checkElapsed, 15000);
    return () => clearInterval(interval);
  }, [waterAlert?.enabled, waterAlert?.mode, waterAlert?.lastReminderAt]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadNearbyVenues(pos.coords.latitude, pos.coords.longitude, 500, NEARBY_VENUES_COUNT).then(setNearbyVenues);
      },
      () => {},
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const vq = venueQuery.trim();
  useEffect(() => {
    if (vq.length < 2) {
      setVenueResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchVenues(venueQuery.trim(), 6).then(setVenueResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [vq, venueQuery]);

  const pickVenue = (v) => {
    setCurrentVenue(v);
    setVenuePickerOpen(false);
    setVenueQuery("");
  };

  const refresh = () => {
    const { current, previous } = soloPeriodStarts();
    setPreviousPeriodStart(previous);
    loadMySoloCheckins(current, true).then(setCheckins);
    loadMySoloCheckins(previous, true, current).then(setPreviousCheckins);
  };

  // Solde de jetons = achats + ajouts − retraits − jetons des verres payés en jetons. Relu au chargement, après chaque mouvement et
  // chaque fois que la liste des verres change (verre ajouté, supprimé, archivé, nouvelle période).
  const refreshJetons = async () => {
    const moves = await loadMyJetonMovements();
    if (moves === null) return;
    setJetonMovements(moves);
    if (moves.length === 0) {
      setJetonSpentTotal(0);
      return;
    }
    const spent = await loadMyJetonSpentSince(moves[0].createdAt);
    if (spent !== null) setJetonSpentTotal(spent);
  };
  useEffect(() => {
    refreshJetons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, checkins]);
  const jetonBalance = useMemo(() => {
    if (jetonMovements === null) return null;
    const net = jetonMovements.reduce((acc, m) => acc + (m.kind === "retrait" ? -m.jetons : m.jetons), 0);
    return Math.round((net - jetonSpentTotal) * 100) / 100;
  }, [jetonMovements, jetonSpentTotal]);
  // Euros payés en achetant des jetons pendant la période en cours (6 h → 6 h), achats archivés exclus : ils s'ajoutent au Dépensé.
  const jetonPurchasesEuro = useMemo(() => {
    if (!jetonMovements) return 0;
    const start = new Date(soloPeriodStarts().current).getTime();
    return jetonMovements.reduce((acc, m) => acc + (m.kind === "achat" && !m.archived && new Date(m.createdAt).getTime() >= start ? m.amountEur || 0 : 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jetonMovements, checkins]);
  const saveJetonMovement = async (kind, jetons, amountEur = null) => {
    if (jetonBusy) return false;
    setJetonBusy(true);
    setJetonError("");
    const result = await addJetonMovement(myUserId, kind, jetons, amountEur);
    if (result.error) {
      setJetonError("Impossible d'enregistrer les jetons pour le moment. Réessaie dans un instant.");
      setJetonBusy(false);
      return false;
    }
    await refreshJetons();
    setJetonBusy(false);
    return true;
  };

  // Favoris — sur tout l'historique, pas seulement aujourd'hui, sinon la liste se vide à
  // chaque nouvelle journée. Limité à 3, le plus ancien pousse dehors dès qu'un nouveau arrive.
  const refreshFavorites = () =>
    loadMySoloCheckins().then((all) => {
      const seen = new Set();
      const ids = [];
      for (const c of all) {
        const key = String(c.drinkId);
        if (!seen.has(key)) {
          seen.add(key);
          ids.push(key);
        }
        if (ids.length >= 3) break;
      }
      setRecentDrinkIds(ids);
    });

  // Passage à une nouvelle période (6 h) pendant que l'écran reste ouvert : les listes et les compteurs sont rechargés pile à 6 h.
  // On revérifie aussi au retour sur l'app, car un téléphone en veille peut avoir mis le minuteur en pause.
  useEffect(() => {
    let timer = null;
    let shown = soloPeriodStarts().current;
    const schedule = () => {
      const next = new Date(shown);
      next.setDate(next.getDate() + 1); // le 6 h suivant (heure du téléphone)
      timer = setTimeout(check, Math.max(1000, next.getTime() - Date.now() + 500));
    };
    const check = () => {
      clearTimeout(timer);
      const now = soloPeriodStarts().current;
      if (now !== shown) {
        shown = now;
        refresh();
      }
      schedule();
    };
    const onVisible = () => {
      if (!document.hidden) check();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
    refreshFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ids = new Set(recentDrinkIds);
    (checkins || []).forEach((c) => ids.add(String(c.drinkId)));
    (previousCheckins || []).forEach((c) => ids.add(String(c.drinkId)));
    if (ids.size === 0) {
      setDrinksById({});
      return;
    }
    loadDrinksByIds([...ids]).then((results) => setDrinksById(Object.fromEntries(results.map((d) => [String(d.id), d]))));
  }, [checkins, previousCheckins, recentDrinkIds]);

  useEffect(() => {
    const venueIds = new Set([...(checkins || []), ...(previousCheckins || [])].filter((c) => c.venueId && !QUICK_VENUE_IDS.includes(c.venueId)).map((c) => String(c.venueId)));
    if (venueIds.size === 0) {
      setVenuesById({});
      return;
    }
    loadVenuesByIds([...venueIds]).then((results) => setVenuesById(Object.fromEntries(results.map((v) => [String(v.id), v]))));
  }, [checkins, previousCheckins, recentDrinkIds]);

  // Dérivés (Mazout, Coca, Citron…) : l'énergie saisie pour CE produit et ce dérivé compte dans les kcal dès qu'elle est lue (ce que fait aussi la base pour les
  // statistiques) ; sans valeur saisie, le verre garde l'énergie du produit. On ne lit que les produits des verres pris en dérivé.
  const variantDrinkIds = useMemo(() => (checkins || []).filter((c) => c.variantCode).map((c) => String(c.drinkId)), [checkins]);
  const { forProduct: derivativesOf } = useBeerDerivatives(variantDrinkIds);

  const totals = useMemo(() => {
    if (!checkins) return { count: 0, price: 0, own: 0, offered: 0, jetons: 0, kcal: 0 };
    return checkins.reduce(
      (acc, c) => {
        const drink = drinksById[String(c.drinkId)];
        return {
          count: acc.count + 1,
          price: acc.price + (c.currency === "jeton" ? 0 : (c.price || 0) + (c.offeredPrice || 0)), // euros : prix du verre + euros offerts
          own: acc.own + (c.currency === "jeton" ? 0 : c.price || 0), // euros : mes consommations seules
          offered: acc.offered + (c.currency === "jeton" ? 0 : c.offeredPrice || 0), // euros : consommations offertes seules
          jetons: acc.jetons + (c.currency === "jeton" ? (c.price || 0) + (c.offeredPrice || 0) : 0), // jetons : prix du verre + jetons offerts
          kcal: acc.kcal + (drink ? drinkCalories({ ...drink, kcalPer100ml: kcalPer100mlWithVariant(drink.kcalPer100ml, String(drink.id), c.variantCode) }, c.volumeCl) : 0),
        };
      },
      { count: 0, price: 0, own: 0, offered: 0, jetons: 0, kcal: 0 }
    );
  }, [checkins, drinksById, derivativesOf]);

  const handleDelete = async (id) => {
    setCheckins((prev) => prev.filter((c) => c.id !== id));
    setPreviousCheckins((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    await deleteSoloCheckin(id);
  };

  // « Archiver » vide les deux listes affichées : la période en cours et la période précédente grisée.
  const handleArchive = async () => {
    const ids = [...(checkins || []), ...(previousCheckins || [])].map((c) => c.id);
    if (ids.length === 0) return;
    if (!window.confirm("Archiver les listes affichées ? Les compteurs BibaSolo repartent à zéro, mais tout reste compté dans Mes Statistiques.")) return;
    setCheckins([]);
    setPreviousCheckins([]);
    await archiveSoloCheckins(ids);
    await archiveMyJetonMovements(previousPeriodStart || soloPeriodStarts().previous);
    refreshJetons();
  };

  if (historyOpen) {
    return <SoloHistoryScreen onBack={() => setHistoryOpen(false)} onOpenDrink={onOpenDrink} />;
  }

  if (adding) {
    return (
      <AddSoloCheckinScreen
        myUserId={myUserId}
        recentDrinks={recentDrinkIds.map((id) => drinksById[id]).filter(Boolean)}
        venue={currentVenue}
        bibaZeroActive={!!bibaZero}
        defaultCurrency={jetonsOn ? "jeton" : "euro"}
        onAddDrink={onAddDrink}
        onBack={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          refresh();
          refreshFavorites();
        }}
      />
    );
  }

  if (checkingDrinks) {
    return (
      <DrinkCheckScreen
        drinkIds={(checkins || []).map((c) => c.drinkId)}
        presetVenue={currentVenue ? { id: currentVenue.id, name: currentVenue.name } : null}
        myBibroCode={myBibroCode}
        onBack={() => setCheckingDrinks(false)}
        onRateDrink={onRateDrink}
        onUnrateDrink={onUnrateDrink}
        onCheckDrink={onCheckDrink}
        onCheckConfirmed={onCheckConfirmed}
      />
    );
  }

  if (waterAlertSettingsOpen) {
    return (
      <WaterAlertSoloSettingsScreen
        myUserId={myUserId}
        settings={waterAlert}
        checkinCount={checkins ? checkins.length : undefined}
        onSave={(next) => {
          setWaterAlert(next);
          setWaterAlertSettingsOpen(false);
        }}
        onBack={() => setWaterAlertSettingsOpen(false)}
      />
    );
  }

  // Icône « info » d'une barre de séparation (« today » ou « previous ») et sa bulle, qui explique comment sont comptées les périodes.
  // Une seule bulle est ouverte à la fois ; elle se pose sous l'icône touchée.
  const renderPeriodInfo = (which) => (
    <>
      <button
        type="button"
        data-solo-period-info={which}
        onClick={() => setPeriodInfoOpen((o) => (o === which ? null : which))}
        aria-label="Comment sont comptées les périodes"
        aria-expanded={periodInfoOpen === which}
        title="Comment sont comptées les périodes"
        style={{ background: "none", border: "none", padding: "6px", margin: "-6px 0 -6px -6px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, opacity: periodInfoOpen === which ? 1 : 0.6 }}
      >
        <NavIcon name="info" size={14} color={COLORS.amber} />
      </button>
      {periodInfoOpen === which && (
        <div
          data-solo-period-bubble={which}
          role="note"
          style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 5, width: "230px", boxSizing: "border-box", background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 12px", fontSize: "12px", lineHeight: 1.4, color: COLORS.ink, boxShadow: "0 10px 24px rgba(0,0,0,.55)" }}
        >
          <span style={{ position: "absolute", top: "-6px", right: "9px", width: "10px", height: "10px", background: COLORS.surface, borderTop: `2px solid ${COLORS.amber}`, borderLeft: `2px solid ${COLORS.amber}`, transform: "rotate(45deg)" }} />
          Les périodes sont comptées sur 24 h, de 6 h du matin à 6 h du matin le lendemain.
        </div>
      )}
    </>
  );

  const renderCheckinRow = (c, i, list) => (
    <SoloCheckinRow
      key={c.id}
      c={c}
      drink={drinksById[String(c.drinkId)]}
      venue={c.venueId ? venuesById[String(c.venueId)] : null}
      isLast={i === list.length - 1}
      onOpenDrink={onOpenDrink}
      onDelete={handleDelete}
    />
  );

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 28px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <img src={bibaSoloIconUrl} alt="BibaSolo" style={{ width: "26px", height: "26px" }} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, flex: 1 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Solo</span>
        </h1>
        <button
          onClick={toggleJetons}
          data-testid="jetons-toggle"
          aria-pressed={jetonsOn}
          title={jetonsOn ? "Masquer les Jetons" : "Afficher les Jetons"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            background: "none",
            border: `2px solid ${jetonsOn ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          {/* Inactive : le même jeton vert, grisé (désaturé et atténué comme un élément désactivé) */}
          <span style={{ display: "flex", filter: jetonsOn ? "none" : "grayscale(1)", opacity: jetonsOn ? 1 : 0.4 }}>
            <TokenGreenIcon size={18} />
          </span>
        </button>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setBibaZeroMenuOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "32px",
              background: bibaZero ? COLORS.amber : "none",
              border: `2px solid ${bibaZero ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "8px",
              cursor: "pointer",
            }}
            title={bibaZero ? "BibaZERO actif" : "Mode BibaZERO"}
          >
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: bibaZero ? COLORS.paper : COLORS.amber }}>ZERO</span>
          </button>
          {bibaZeroMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "6px",
                zIndex: 10,
                background: COLORS.surfaceAlt,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "12px 14px",
                minWidth: "220px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              {bibaZero ? (
                <>
                  <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: 0 }}>
                    <strong style={{ color: COLORS.ink }}>Actif</strong> — {bibaZero.tolerance === "zero" ? "tolérance zéro" : bibaZero.jokerUsed ? "joker déjà utilisé" : "avec 1 joker"}
                  </p>
                  <button
                    onClick={() => {
                      setBibaBobModalMode("deactivate");
                      setBibaZeroMenuOpen(false);
                    }}
                    style={{ background: "none", border: "none", color: COLORS.bobBlue, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: "8px 0 0 0" }}
                  >
                    Désactiver
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setBibaBobModalMode("activate");
                    setBibaZeroMenuOpen(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontSize: "12.5px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                >
                  <NavIcon name="play" size={13} color={COLORS.amber} />
                  Activer <span><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>ZERO</span></span>
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setWaterAlertSettingsOpen(true)}
          title="Réglages WaterAlert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            background: waterAlert?.enabled ? COLORS.amber : "none",
            border: `2px solid ${waterAlert?.enabled ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          <WaterAlertIcon size={18} dark={!!waterAlert?.enabled} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
        {currentVenue ? (
          <div
            onClick={() => setVenuePickerOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 1,
              minWidth: 0,
              maxWidth: "75%",
              boxSizing: "border-box",
              background: COLORS.surface,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "12px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.amber} />
            <span style={{ minWidth: 0, fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentVenue.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVenue(null);
                setVenuePickerOpen(false);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <NavIcon name="x" size={12} color={COLORS.paperAlt} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setVenuePickerOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              boxSizing: "border-box",
              background: "none",
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "8px 12px",
              cursor: "pointer",
              textAlign: "left",
              color: COLORS.inkSoft,
            }}
          >
            <NavIcon name="map-pin" size={16} color={COLORS.inkSoft} />
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Lieu</span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => setCheckingDrinks(true)}
            title="Drink Check"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: COLORS.amber,
              border: "none",
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <img src={drinkCheckIconUrl} alt="Drink Check" style={{ height: "24px" }} />
          </button>
          <button
            onClick={() => setAdding(true)}
            title="Ajouter un Produit"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: COLORS.amber,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              fontSize: "22px",
              fontWeight: 700,
              color: COLORS.paper,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      </div>
      <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, marginBottom: "14px" }} />

      {venuePickerOpen && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            <button onClick={() => pickVenue({ id: "@home", name: "@Home" })} style={VENUE_PILL_STYLE}>
              <span style={VENUE_PILL_ICON_STYLE}>
                <NavIcon name="map-pin" size={10} color={COLORS.amber} />
              </span>
              @Home
            </button>
            <button onClick={() => pickVenue({ id: "@event", name: "@Event" })} style={VENUE_PILL_STYLE}>
              <span style={VENUE_PILL_ICON_STYLE}>
                <NavIcon name="map-pin" size={10} color={COLORS.amber} />
              </span>
              @Event
            </button>
          </div>
          {nearbyVenues.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "6px" }}>Lieux proches de toi</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {nearbyVenues.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => pickVenue(v)}
                    data-nearby-venue="1"
                    style={VENUE_PILL_STYLE}
                  >
                    <span style={VENUE_PILL_ICON_STYLE}>
                      <NavIcon name="map-pin" size={10} color={COLORS.amber} />
                    </span>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            value={venueQuery}
            onChange={(e) => setVenueQuery(e.target.value)}
            placeholder="Rechercher un lieu..."
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
          />
          {venueResults.length > 0 && (
            <div style={{ marginTop: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
              {venueResults.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => pickVenue(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: i === venueResults.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}`,
                    padding: "12px 4px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: COLORS.ink,
                  }}
                >
                  <NavIcon name="map-pin" size={16} color={COLORS.amber} />
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>{v.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.count}</div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>{totals.count <= 1 ? "Verre" : "Verres"}</div>
        </div>
        {/* Un appui sur le bloc ouvre / ferme une bulle (même style que la bulle des périodes) qui détaille le Dépensé. */}
        <div
          data-spent-tile="1"
          ref={spentTileRef}
          role="button"
          tabIndex={0}
          aria-expanded={spentInfoOpen}
          aria-label="Détail du dépensé"
          onClick={() => setSpentInfoOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSpentInfoOpen((o) => !o);
            }
          }}
          style={{ position: "relative", cursor: "pointer", flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}
        >
          {/* Dépensé = euros seulement : les verres payés en euros + les euros offerts + les euros payés pour acheter des jetons. Les jetons ont leur bloc. */}
          <div data-spent="1" style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>
            <div>
              {/* Le nombre est centré dans le bloc ; le sigle € est posé juste à sa droite sans entrer dans le centrage. */}
              <span data-spent-amount="1" style={{ position: "relative", display: "inline-block" }}>
                {(totals.price + jetonPurchasesEuro).toFixed(2)}
                <span data-spent-symbol="1" style={{ position: "absolute", left: "100%", top: 0, marginLeft: "4px" }}>
                  <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontWeight: 600 }}>€</span>
                </span>
              </span>
            </div>
          </div>
          <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Dépensé</div>
          {spentInfoOpen && (
            <div
              data-spent-bubble="1"
              role="note"
              style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "calc(100% + 8px)", zIndex: 5, width: "230px", boxSizing: "border-box", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 12px", fontSize: "12px", lineHeight: 1.4, color: COLORS.ink, boxShadow: "0 10px 24px rgba(0,0,0,.55)", cursor: "default" }}
            >
              <span style={{ position: "absolute", top: "-6px", left: "calc(50% - 5px)", width: "10px", height: "10px", background: COLORS.surface, borderTop: `2px solid ${COLORS.amber}`, borderLeft: `2px solid ${COLORS.amber}`, transform: "rotate(45deg)" }} />
              {[
                ["own", "Mes consommations", totals.own],
                ["offered", "Consommations offertes", totals.offered],
                ...(jetonPurchasesEuro > 0 ? [["jetons", "Jetons achetés", jetonPurchasesEuro]] : []),
              ].map(([key, label, value]) => (
                <div key={key} data-spent-line={key} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 700, color: COLORS.amber, whiteSpace: "nowrap" }}>{value.toFixed(2)} €</span>
                </div>
              ))}
              <div data-spent-line="total" style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "6px", paddingTop: "6px", borderTop: `1px solid ${COLORS.paperAlt}`, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: COLORS.amber, whiteSpace: "nowrap" }}>{(totals.price + jetonPurchasesEuro).toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          {caloriesHidden ? (
            <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.inkSoft }}>—</div>
          ) : (
            <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{totals.kcal}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px" }}>
            <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>Kcal</span>
            <button
              onClick={() => setCaloriesHidden((h) => !h)}
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: 0 }}
              title={caloriesHidden ? "Afficher les calories" : "Masquer les calories"}
            >
              <NavIcon name={caloriesHidden ? "eye-off" : "eye"} size={11} color={COLORS.inkSoft} />
            </button>
          </div>
        </div>
      </div>
      {jetonsOn && (
        <SoloJetonsBlock
          balance={jetonBalance}
          spent={totals.jetons}
          busy={jetonBusy}
          error={jetonError}
          onAdjust={(delta) => saveJetonMovement(delta > 0 ? "ajout" : "retrait", 1)}
          onBuy={(count, euro) => saveJetonMovement("achat", count, euro)}
        />
      )}
      {/* Barre de séparation au-dessus de la liste en cours : « Aujourd'hui », la barre, puis l'icône « info » (bulle d'explication des périodes). */}
      <div data-solo-today-bar="1" ref={todayBarRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span data-solo-today-label="1" style={SOLO_BAR_LABEL_STYLE}>Aujourd'hui</span>
        <div style={SOLO_BAR_LINE_STYLE} />
        {renderPeriodInfo("today")}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {checkins === null ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : (
          <>
            {checkins.length === 0 ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Rien d'encodé aujourd'hui.</p>
            ) : (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                {checkins.map((c, i) => renderCheckinRow(c, i, checkins))}
              </div>
            )}
            {/* Période précédente : grisée, sous une barre de séparation ; elle ne compte pas dans les compteurs du haut. */}
            {previousCheckins && previousCheckins.length > 0 && (
              <>
                <div data-solo-separator="1" ref={previousBarRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
                  <span data-solo-period-date="1" style={SOLO_BAR_LABEL_STYLE}>{formatPeriodDay(previousPeriodStart)}</span>
                  <div style={SOLO_BAR_LINE_STYLE} />
                  {renderPeriodInfo("previous")}
                </div>
                <div data-solo-previous="1" style={{ opacity: 0.5, filter: "grayscale(1)", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                  {previousCheckins.map((c, i) => renderCheckinRow(c, i, previousCheckins))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Sous le bloc de la période précédente, juste au-dessus de la barre du pied de page, tout à droite : Historique, puis Archiver
          (Archiver n'apparaît que s'il y a quelque chose à archiver ; Historique est toujours là). */}
      <div data-solo-bottom-actions="1" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
        <button onClick={() => setHistoryOpen(true)} title="Historique" aria-label="Historique" style={SOLO_ROUND_OUTLINE_BUTTON_STYLE}>
          <NavIcon name="calendar" size={18} color={COLORS.inkSoft} />
        </button>
        {((checkins && checkins.length > 0) || (previousCheckins && previousCheckins.length > 0)) && (
          <button onClick={handleArchive} title="Archiver" aria-label="Archiver" style={SOLO_ROUND_OUTLINE_BUTTON_STYLE}>
            <NavIcon name="refresh" size={18} color={COLORS.inkSoft} />
          </button>
        )}
      </div>

      {bibaBobModalMode && (
        <BibaBobModal
          friendName="toi"
          storedPin={bibaZero?.pin}
          mode={bibaBobModalMode}
          onActivate={async (tolerance, pin) => {
            const result = await activateBibaZeroSolo(myUserId, tolerance, pin);
            if (result?.error) {
              alert(result.error);
              return;
            }
            setBibaBobModalMode(null);
            refreshBibaZero();
          }}
          onDeactivate={async () => {
            const result = await deactivateBibaZeroSolo(myUserId, bibaZero?.pin);
            if (result?.error) {
              alert(result.error);
              return;
            }
            setBibaBobModalMode(null);
            refreshBibaZero();
          }}
          onClose={() => setBibaBobModalMode(null)}
        />
      )}
      {waterAlertModalOpen && <WaterAlertModal onClose={() => setWaterAlertModalOpen(false)} />}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
