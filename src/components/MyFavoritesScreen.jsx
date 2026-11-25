// « Mes Favoris » (Mon Profil) — tout ce que la personne a mis de côté, en six listes, chacune sur sa propre page (comme « Mes Produits ») :
// Lieux (cœur de la fiche d'un lieu), Produits (cœur de la fiche d'un produit), Marques, Producteurs et Shops (cœur de leur fiche) et Bibax (cœur de la fiche d'un
// Bibax confirmé). L'écran d'entrée ne montre que les six cartes (rond d'icône, titre, nombre dans la colonne sombre de droite — `HubCard`, comme « Mes Produits »), dans cet ordre (celui des onglets de la recherche) ; chaque page range ses lignes du plus récent au plus ancien,
// dans le style de « Mon Historique » : une carte, des lignes pleine largeur séparées par un trait fin. Une liste vide dit quel geste l'alimente.
// Les identifiants viennent de la fonction `get_my_favorites` (puis les noms par les fonctions habituelles) ; les Bibax se lisent dans la liste `bibros` déjà en
// mémoire (un Bibax dont la relation n'est plus confirmée n'est de toute façon plus rendu par le serveur).
// Chaque ligne ouvre la fiche ; son retour ramène sur la page de la liste.
import React, { useState, useEffect } from "react";
import { useListReturn } from "../hooks/useListReturn.js";
import { COLORS, SUBTYPE_LABELS } from "../constants.js";
import { PageHeader, PageFooterNav, ScrollToTopButton, EntityAvatar, HubCard, MutualPill, ScrollText } from "./ui.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES, NavIcon } from "./icons.jsx";
import { venueStreetLine, venuePostalCityLine, formatCount } from "../utils.js";
import { flagPart, abvPart, bioPart, glutenFreePart } from "./DrinkRowParts.jsx";
import { loadMyFavorites, loadVenuesByIds, loadBrandsByIds, loadBreweriesByIds, loadShopsByIds, loadDrinksByIds, loadMyFavoriteBibaxDetails, toggleFavoriteBrand, toggleFavoriteProducer, toggleFavoriteShop } from "../data/sharedDirectories.js";
import { notify } from "./MessageToast.jsx";

const AMBER_DOT = <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />;

// Éléments séparés par des points vert fluo (même rendu que les lignes de « Mon Historique »).
// `center` : éléments centrés (cartes de l'accueil). `noWrap` : tout sur une seule ligne — les textes se coupent par « … » au lieu de passer à la ligne, et les éléments qui ne sont pas du texte (drapeau, icône) gardent leur taille.
// Un élément `{ node }` est un texte mis en forme (italique, couleur…) : il se coupe par « … » comme une simple chaîne.
export function DotLine({ parts, noWrap = false, center = false, scroll = false }) {
  if (parts.length === 0) return null;
  // `scroll` (Mehdi, 2026-11-19) : une ligne trop longue défile (voir `ScrollText`) au lieu d'être coupée par « … ».
  if (scroll) {
    return (
      <ScrollText style={{ fontSize: "12px", color: COLORS.inkSoft, ...(center ? { textAlign: "center" } : null) }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          {parts.map((part, idx) => {
            const styledText = !!part && typeof part === "object" && !React.isValidElement(part) && "node" in part;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && AMBER_DOT}
                <span style={{ whiteSpace: "nowrap" }}>{styledText ? part.node : part}</span>
              </React.Fragment>
            );
          })}
        </div>
      </ScrollText>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: center ? "center" : undefined, gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: noWrap ? "nowrap" : "wrap", minWidth: 0 }}>
      {parts.map((part, idx) => {
        const styledText = !!part && typeof part === "object" && !React.isValidElement(part) && "node" in part;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && AMBER_DOT}
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...(noWrap && !styledText && typeof part !== "string" ? { flexShrink: 0 } : null) }}>
              {styledText ? part.node : part}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Le pays d'un lieu, pour une ligne de détails : son drapeau (même image que partout dans l'app) ; un pays sans drapeau connu garde son nom écrit.
export function countryFlagPart(country) {
  if (!country) return null;
  return COUNTRY_ISO_CODES[country] ? <CountryFlagImg country={country} size={14} /> : country;
}

// Les lignes d'adresse d'un lieu (Mehdi, 2026-11-17), d'office sur deux lignes comme sur la fiche : « rue, numéro » d'abord, puis « code postal ville (village) », un point vert fluo et le drapeau du pays.
// Pas de rue (lieu sans adresse précise) : seule la seconde ligne reste. Le « B- » devant le code postal n'est mis que pour les lieux belges (utils.js).
function VenueAddressLines({ venue }) {
  const street = venueStreetLine(venue);
  const postalCity = venuePostalCityLine(venue);
  const flag = countryFlagPart(venue.country);
  const lineStyle = { fontSize: "12px", color: COLORS.inkSoft, lineHeight: 1.3, minWidth: 0, overflowWrap: "anywhere" };
  if (!street && !postalCity && !flag) return null;
  return (
    <>
      {street && (
        <div data-favorite-street style={{ ...lineStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {street}
        </div>
      )}
      {(postalCity || flag) && (
        <div data-favorite-postal style={lineStyle}>
          {postalCity}
          {postalCity && flag ? " " : ""}
          {flag && (
            <span style={{ whiteSpace: "nowrap" }}>
              {postalCity && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", margin: "0 6px 2px 0", verticalAlign: "middle" }} />}
              <span style={{ display: "inline-flex", verticalAlign: "middle" }}>{flag}</span>
            </span>
          )}
        </div>
      )}
    </>
  );
}

// Le rond de profil des lignes de liste de Mon Profil : plus grand que les 40 px d'origine, SANS bouger le texte ni changer la hauteur de la ligne (64 px). Il grandit vers la gauche — dans la marge
// de 14 px de la carte — et vers le haut et le bas — dans l'espace au-dessus et au-dessous : son bord droit, donc le départ du texte, reste exactement où il était. Partagé avec DrinkChecks,
// PlaceChecks et Mes Produits (CheckListParts.jsx).
export const ROW_AVATAR_BASE = 40; // la taille d'origine
export const ROW_AVATAR = 48;
export const ROW_HEIGHT = 64;
export const ROW_PAD_Y = (ROW_HEIGHT - ROW_AVATAR) / 2;

// Ligne d'un favori — même squelette que celles de « Mon Historique » : rond de 48 px à gauche (voir ROW_AVATAR), à droite le titre (gras) et une ligne de détails.
function FavoriteRow({ kind, avatar, title, details = [], detailsNode = null, heart = null, isLast, onOpen }) {
  return (
    <button
      type="button"
      data-favorite-row={kind}
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
      <span style={{ flexShrink: 0, display: "flex", marginLeft: `-${ROW_AVATAR - ROW_AVATAR_BASE}px` }}>{avatar}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{title}</span>
        {detailsNode || <DotLine parts={details} />}
      </div>
      {heart && (
        // Le cœur de la ligne (Mehdi, 2026-11-17) : le même que sur la fiche (plein = favori) ; un clic le retire (ou le remet) sans ouvrir la fiche.
        <span
          data-favorite-heart={heart.on ? "on" : "off"}
          role="button"
          aria-label={heart.on ? `Retirer ${title} des favoris` : `Remettre ${title} en favori`}
          onClick={(e) => {
            e.stopPropagation();
            heart.onToggle();
          }}
          // Colonne sombre (Mehdi, 2026-11-17) : la même que celle du chiffre dans « PlaceChecks » / « Mes Produits » (`CheckRow`) — sur toute la hauteur de la ligne et jusqu'au bord de la carte,
          // fond de la page, trait fin à gauche, le trait de séparation des lignes la traverse, 52 px de large au moins.
          style={{
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
            cursor: "pointer",
          }}
        >
          <NavIcon name="heart" size={20} color={COLORS.amber} filled={heart.on} />
        </span>
      )}
    </button>
  );
}

// Les six listes, dans l'ordre voulu : titre de la page, nombre au singulier / au pluriel (sur la carte) et phrase d'une liste vide.
const KINDS = [
  { kind: "venues", title: "Lieux", count: (n) => `${formatCount(n)} lieu${n > 1 ? "x" : ""}`, empty: "Aucun lieu favori. Touche le cœur sur la fiche d'un lieu." },
  { kind: "drinks", title: "Produits", count: (n) => `${formatCount(n)} produit${n > 1 ? "s" : ""}`, empty: "Aucun produit favori. Touche le cœur sur la fiche d'un produit." },
  { kind: "brands", title: "Marques", count: (n) => `${formatCount(n)} marque${n > 1 ? "s" : ""}`, empty: "Aucune marque favorite. Touche le cœur sur la fiche d'une marque." },
  { kind: "producers", title: "Producteurs", count: (n) => `${formatCount(n)} producteur${n > 1 ? "s" : ""}`, empty: "Aucun producteur favori. Touche le cœur sur la fiche d'un producteur." },
  { kind: "shops", title: "Shops", count: (n) => `${formatCount(n)} shop${n > 1 ? "s" : ""}`, empty: "Aucun shop favori. Touche le cœur sur la fiche d'un shop." },
  { kind: "bibax", title: "Bibax", count: (n) => `${formatCount(n)} Bibax`, empty: "Aucun Bibax favori. Touche le cœur sur la fiche d'un Bibax." },
];

// Le rond d'icône de chaque carte de l'écran d'entrée (Mehdi, 2026-11-17) : celle que les lignes de la liste utilisent déjà quand l'élément n'a pas de photo (épingle, bouteille, étiquette,
// monogramme Bibamus) et, pour les Bibax, l'icône Bibax de l'app (trois silhouettes, choisie par Mehdi) — rien d'inventé. Les shops : un caddie (`shopping-cart`, demandé par Mehdi le 2026-11-23 ; l'app n'en avait pas, il a été ajouté à `icons.jsx`).
const KIND_ICON_NAMES = { venues: "map-pin", drinks: "bottle", brands: "tag", producers: "bibamus-monogram", shops: "shopping-cart", bibax: "bibax" };
const kindIcon = (kind, size = 24) => <NavIcon name={KIND_ICON_NAMES[kind]} size={size} color={COLORS.amber} />;
const KIND_ICONS = {
  venues: kindIcon("venues"),
  drinks: kindIcon("drinks"),
  brands: kindIcon("brands"),
  producers: kindIcon("producers"),
  shops: kindIcon("shops"),
  bibax: kindIcon("bibax", 28),
};

// Le titre d'un écran de Mon Profil : petite barre verte puis le texte. Avec `iconUrl` (DrinkChecks, PlaceChecks), une icône de 24 px — comme celle du titre « Mes Bibax » — remplace la barre ;
// avec `icon` (un élément : une icône de l'app de 24 px, comme l'étoile vide de « Mes Produits », le cœur vide de « Mes Favoris » ou l'icône de la carte d'une sous-page), c'est cette icône qui la remplace.
// Avec `subtitle` (les listes d'un autre Bibax : « de Antoine Lejeune »), une ligne discrète sous le titre, alignée sur son texte.
export function ScreenTitle({ children, iconUrl = null, icon = null, right = null, subtitle = null }) {
  const row = (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: subtitle ? "4px 0 4px" : "4px 0 18px" }}>
      {!iconUrl && !icon && <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />}
      {iconUrl && <img data-screen-title-icon src={iconUrl} alt="" style={{ width: "24px", height: "24px", flexShrink: 0 }} />}
      {icon && (
        <span data-screen-title-icon style={{ display: "inline-flex", width: "24px", height: "24px", flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{children}</h1>
      {right && <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center" }}>{right}</span>}
    </div>
  );
  if (!subtitle) return row;
  return (
    <>
      {row}
      <p data-screen-subtitle style={{ margin: `0 0 18px ${iconUrl || icon ? 34 : 14}px`, fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.3 }}>
        {subtitle}
      </p>
    </>
  );
}

// Écran d'entrée : six cartes, chacune avec le nombre de ses favoris (espace insécable tant que la base n'a pas répondu : la carte garde sa hauteur).
export function MyFavoritesScreen({ bibros = [], onBack, goTo }) {
  const [counts, setCounts] = useState(null); // null = chargement ; { venues, drinks, brands, producers, shops, bibax } ; { } si la lecture a échoué
  useEffect(() => {
    let cancelled = false;
    loadMyFavorites().then((favs) => {
      if (cancelled) return;
      if (!favs) {
        setCounts({});
        return;
      }
      setCounts({
        venues: favs.venues.length,
        drinks: favs.drinks.length,
        brands: favs.brands.length,
        producers: favs.producers.length,
        shops: favs.shops.length,
        bibax: favs.bibax.filter((userId) => bibros.some((b) => b.userId === userId)).length,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle icon={<NavIcon name="heart" size={24} color={COLORS.amber} />}>Mes Favoris</ScreenTitle>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        {KINDS.map((k) => {
          const n = counts && typeof counts[k.kind] === "number" ? counts[k.kind] : null;
          return <HubCard key={k.kind} title={k.title} count={n} countText={n === null ? null : k.count(n)} icon={KIND_ICONS[k.kind]} onClick={() => goTo(k.kind)} />;
        })}
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Une page de liste (kind : "venues" | "drinks" | "brands" | "producers" | "shops" | "bibax"). `screenId` : l'identifiant de l'écran dans App (la mémoire du retour d'une fiche
// est rangée sous ce nom, voir `useListReturn`) : au retour d'une fiche, la liste se remet à la hauteur où l'on l'avait laissée ; une entrée depuis « Mes Favoris » repart de zéro.
export function MyFavoritesListScreen({ screenId, mainScrollRef, kind, bibros = [], onBack, onOpenVenue, onOpenBrand, onOpenProducer, onOpenShop, onOpenBibax, onOpenDrink, favoriteVenueIds = null, onToggleVenueFavorite = null, favoriteDrinkIds = null, onToggleDrinkFavorite = null, favoriteBibaxIds = null, onToggleBibaxFavorite = null }) {
  const meta = KINDS.find((k) => k.kind === kind);
  const { restored, save, open } = useListReturn(screenId, mainScrollRef);
  const [ids, setIds] = useState(restored ? restored.ids : null); // null = chargement ; identifiants de cette sorte, du plus récent au plus ancien
  const [byId, setById] = useState(restored ? restored.byId : {});
  // Bibax : le @nom et le nombre de Bibax en commun, par identifiant de personne (une seule lecture, `get_my_favorite_bibax_details`) ; gardés dans la mémoire de la page
  // pour que la liste ne change pas de hauteur au retour d'une fiche. `null` tant que la lecture n'a pas répondu (ou si elle a échoué).
  const [details, setDetails] = useState(restored?.details || null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyFavorites().then(async (result) => {
      if (cancelled) return;
      if (!result) {
        // Au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setIds((prev) => prev || []);
        }
        return;
      }
      const wanted = result[kind] || [];
      // Au retour d'une fiche, rien à remplacer si la liste n'a pas changé.
      if (restored && wanted.join(",") === restored.ids.join(",")) return;
      const loader = { venues: loadVenuesByIds, drinks: loadDrinksByIds, brands: loadBrandsByIds, producers: loadBreweriesByIds, shops: loadShopsByIds }[kind];
      const items = loader ? await loader(wanted) : [];
      if (cancelled) return;
      setById(Object.fromEntries(items.map((x) => [String(x.id), x])));
      setIds(wanted);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, attempt]);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (ids === null || error) return;
    save({ ids, byId, details });
  }, [ids, byId, details, error]);
  useEffect(() => {
    if (kind !== "bibax") return;
    let cancelled = false;
    loadMyFavoriteBibaxDetails().then((result) => {
      // Au retour d'une fiche, une lecture qui échoue garde en silence ce qu'on avait.
      if (!cancelled && result) setDetails(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, attempt]);
  // Le cœur des lignes (Mehdi, 2026-11-17) : plein = favori ; un clic retire (ou remet) le favori sans ouvrir la fiche, et la ligne reste jusqu'à ce qu'on quitte la page (un second clic annule).
  // Lieux, produits et Bibax : l'état et la bascule de l'application (les mêmes que le cœur de leur fiche). Marques et producteurs : la bascule de la base, avec l'état gardé ici
  // (leurs fiches relisent le leur à l'ouverture) ; `heartOff[id]` = true quand le cœur est vide. Les shops font comme les marques et les producteurs.
  const [heartOff, setHeartOff] = useState({});
  const toggleLocalHeart = async (apiToggle, id) => {
    const key = String(id);
    const wasOn = !heartOff[key];
    setHeartOff((prev) => ({ ...prev, [key]: wasOn }));
    const result = await apiToggle(id);
    if (result?.error) {
      setHeartOff((prev) => ({ ...prev, [key]: !wasOn }));
      notify(result.error);
      return;
    }
    setHeartOff((prev) => ({ ...prev, [key]: !result.favorite }));
  };
  const openVenue = onOpenVenue ? open(onOpenVenue) : null;
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;
  const openBrand = onOpenBrand ? open(onOpenBrand) : null;
  const openProducer = onOpenProducer ? open(onOpenProducer) : null;
  const openShop = onOpenShop ? open(onOpenShop) : null;
  const openBibax = onOpenBibax ? open(onOpenBibax) : null;

  const loading = ids === null;
  const last = (arr, i) => i === arr.length - 1;
  const resolved = (ids || []).map((id) => byId[id]).filter(Boolean);

  let rows = [];
  if (kind === "venues") {
    rows = resolved.map((v, i) => (
      <FavoriteRow
        key={v.id}
        kind="venue"
        avatar={<EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={ROW_AVATAR} fallbackIcon="map-pin" />}
        title={v.name}
        detailsNode={<VenueAddressLines venue={v} />}
        heart={onToggleVenueFavorite ? { on: (favoriteVenueIds || []).includes(v.id), onToggle: () => onToggleVenueFavorite(v.id) } : null}
        isLast={last(resolved, i)}
        onOpen={openVenue ? () => openVenue(v.id) : null}
      />
    ));
  } else if (kind === "drinks") {
    rows = resolved.map((d, i) => (
      <FavoriteRow
        key={d.id}
        kind="drink"
        avatar={<EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={ROW_AVATAR} fallbackIcon="bottle" />}
        title={d.name}
        // Même ligne de détails que « Mes Produits » (Mehdi, 2026-11-17) : sous-catégorie (à la place de la catégorie), drapeau du pays, degré, Bio, Sans gluten ; plus de marque.
        details={[SUBTYPE_LABELS[d.beverageSubtype] || null, flagPart(d), abvPart(d), bioPart(d), glutenFreePart(d)].filter(Boolean)}
        heart={onToggleDrinkFavorite ? { on: (favoriteDrinkIds || []).includes(String(d.id)), onToggle: () => onToggleDrinkFavorite(d.id) } : null}
        isLast={last(resolved, i)}
        onOpen={openDrink ? () => openDrink(d.id) : null}
      />
    ));
  } else if (kind === "brands") {
    rows = resolved.map((b, i) => (
      <FavoriteRow
        key={b.id}
        kind="brand"
        avatar={<EntityAvatar photoUrl={b.logoUrl} size={ROW_AVATAR} fallbackIcon="tag" />}
        title={b.name}
        // Ville d'origine, région d'origine, puis le pays (drapeau) — sur une seule ligne (Mehdi, 2026-11-17 ; avant : le nom du pays seul). Même ordre que la fiche de la marque.
        detailsNode={<DotLine parts={[b.originCity || null, b.originRegion || null, flagPart({ nationality: b.originCountry })].filter(Boolean)} noWrap />}
        heart={{ on: !heartOff[String(b.id)], onToggle: () => toggleLocalHeart(toggleFavoriteBrand, b.id) }}
        isLast={last(resolved, i)}
        onOpen={openBrand ? () => openBrand(b.id) : null}
      />
    ));
  } else if (kind === "producers") {
    rows = resolved.map((p, i) => (
      <FavoriteRow
        key={p.id}
        kind="producer"
        avatar={<EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={ROW_AVATAR} />}
        title={p.name}
        // « Commune (Village) » (comme sur la fiche du producteur), puis le pays en drapeau — sur une seule ligne (Mehdi, 2026-11-17 ; avant : ville · nom du pays, sans village).
        detailsNode={<DotLine parts={[`${p.city || ""}${p.village ? ` (${p.village})` : ""}`.trim() || null, flagPart({ nationality: p.country })].filter(Boolean)} noWrap />}
        heart={{ on: !heartOff[String(p.id)], onToggle: () => toggleLocalHeart(toggleFavoriteProducer, p.id) }}
        isLast={last(resolved, i)}
        onOpen={openProducer ? () => openProducer(p.id) : null}
      />
    ));
  } else if (kind === "shops") {
    rows = resolved.map((s, i) => (
      <FavoriteRow
        key={s.id}
        kind="shop"
        avatar={<EntityAvatar photoUrl={s.profilePhotoUrl} size={ROW_AVATAR} />}
        title={s.name}
        // Un magasin : son adresse sur deux lignes, comme celle d'un lieu (rue puis code postal, commune et drapeau) ; une boutique en ligne seule n'a pas d'adresse : « En ligne », comme dans le répertoire.
        {...(s.hasStore ? { detailsNode: <VenueAddressLines venue={s} /> } : { details: ["En ligne"] })}
        heart={{ on: !heartOff[String(s.id)], onToggle: () => toggleLocalHeart(toggleFavoriteShop, s.id) }}
        isLast={last(resolved, i)}
        onOpen={openShop ? () => openShop(s.id) : null}
      />
    ));
  } else {
    const people = (ids || []).map((userId) => bibros.find((b) => b.userId === userId)).filter(Boolean);
    rows = people.map((b, i) => {
      // Ligne 2 : le @nom seulement s'il a été changé (au départ, le nom d'utilisateur est une copie du code Bibax), puis le surnom. Ligne 3 : commune (village), puis le pays en drapeau.
      // Ligne 4 : « N Bibax en commun », « 0 Bibax en commun » compris (Mehdi, 2026-11-18 ; avant : rien à 0 ; « Aucun » refusé : trop long). Une ligne sans contenu n'est pas affichée. Mehdi, 2026-11-17 ; avant : surnom · ville sur une seule ligne.
      const username = details?.[b.userId]?.username || "";
      const usernameChanged = !!username && username.toLowerCase() !== String(b.code || "").toLowerCase();
      // Le @nom d'abord, avec son « @ » en vert fluo, puis le surnom en italique (Mehdi, 2026-11-18 ; avant : surnom puis @nom, « @ » en rose fluo).
      const line2 = [
        usernameChanged ? { node: <><span style={{ color: COLORS.amber }}>@</span>{username}</> } : null,
        b.nickname ? { node: <span style={{ fontStyle: "italic", paddingRight: "2px" }}>{b.nickname}</span> } : null,
      ].filter(Boolean);
      const commune = b.city ? (b.locality ? `${b.city} (${b.locality})` : b.city) : ""; // comme `BibaxName` : sans commune, le village n'est pas affiché
      const line3 = [commune || null, flagPart({ nationality: b.country })].filter(Boolean);
      const mutualKnown = details?.[b.userId] ? details[b.userId].mutual || 0 : null; // null : pas encore lu (ou lecture échouée) : pas de 4ᵉ ligne
      return (
        <FavoriteRow
          key={b.userId}
          kind="bibax"
          avatar={<EntityAvatar photoUrl={b.avatarUrl} size={ROW_AVATAR} fallbackIcon="user" />}
          title={[b.name, b.lastName].filter(Boolean).join(" ")}
          detailsNode={
            <>
              {line2.length > 0 && <DotLine parts={line2} noWrap />}
              {line3.length > 0 && <DotLine parts={line3} noWrap />}
              {mutualKnown !== null && (
                <div style={{ marginTop: "1px" }}>
                  <MutualPill data-favorite-mutual n={mutualKnown} />
                </div>
              )}
            </>
          }
          heart={onToggleBibaxFavorite ? { on: (favoriteBibaxIds || []).includes(b.userId), onToggle: () => onToggleBibaxFavorite(b.code) } : null}
          isLast={last(people, i)}
          onOpen={openBibax ? () => openBibax(b.code) : null}
        />
      );
    });
  }

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle icon={kindIcon(kind)}>{meta.title}</ScreenTitle>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : error ? (
          // Si la base n'a pas répondu, on ne prétend pas que la liste est vide : on n'affiche que le message d'erreur.
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
            Impossible de charger tes favoris.{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        ) : rows.length === 0 ? (
          <p data-favorite-empty={kind} style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            {meta.empty}
          </p>
        ) : (
          <div data-favorite-section={kind} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px", overflow: "hidden" }}>
            {rows}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
      <ScrollToTopButton hideNearBottom={false} />
    </div>
  );
}
