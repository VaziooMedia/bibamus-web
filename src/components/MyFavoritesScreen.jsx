// « Mes Favoris » (Mon Profil) — tout ce que la personne a mis de côté, en cinq listes, chacune sur sa propre page (comme « Mes Produits ») :
// Lieux (cœur de la fiche d'un lieu), Produits (cœur de la fiche d'un produit), Marques et Producteurs (cœur de leur fiche) et Bibax (cœur de la fiche d'un
// Bibax confirmé). L'écran d'entrée ne montre que les cinq cartes (rond d'icône, titre, nombre dans la colonne sombre de droite — `HubCard`, comme « Mes Produits »), dans cet ordre ; chaque page range ses lignes du plus récent au plus ancien,
// dans le style de « Mon Historique » : une carte, des lignes pleine largeur séparées par un trait fin. Une liste vide dit quel geste l'alimente.
// Les identifiants viennent de la fonction `get_my_favorites` (puis les noms par les fonctions habituelles) ; les Bibax se lisent dans la liste `bibros` déjà en
// mémoire (un Bibax dont la relation n'est plus confirmée n'est de toute façon plus rendu par le serveur).
// Chaque ligne ouvre la fiche ; son retour ramène sur la page de la liste.
import React, { useState, useEffect } from "react";
import { useListReturn } from "../hooks/useListReturn.js";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar, HubCard } from "./ui.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES, NavIcon } from "./icons.jsx";
import { loadMyFavorites, loadVenuesByIds, loadBrandsByIds, loadBreweriesByIds, loadDrinksByIds } from "../data/sharedDirectories.js";

const AMBER_DOT = <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />;

// Éléments séparés par des points vert fluo (même rendu que les lignes de « Mon Historique »).
export function DotLine({ parts }) {
  if (parts.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: "wrap", minWidth: 0 }}>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && AMBER_DOT}
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{part}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Le pays d'un lieu, pour une ligne de détails : son drapeau (même image que partout dans l'app) ; un pays sans drapeau connu garde son nom écrit.
export function countryFlagPart(country) {
  if (!country) return null;
  return COUNTRY_ISO_CODES[country] ? <CountryFlagImg country={country} size={14} /> : country;
}

// Ligne d'un favori — même squelette que celles de « Mon Historique » : rond de 40 px à gauche, à droite le titre (gras) et une ligne de détails.
function FavoriteRow({ kind, avatar, title, details = [], isLast, onOpen }) {
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
      <span style={{ flexShrink: 0, display: "flex" }}>{avatar}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{title}</span>
        <DotLine parts={details} />
      </div>
    </button>
  );
}

// Les cinq listes, dans l'ordre voulu : titre de la page, nombre au singulier / au pluriel (sur la carte) et phrase d'une liste vide.
const KINDS = [
  { kind: "venues", title: "Lieux", count: (n) => `${n} lieu${n > 1 ? "x" : ""}`, empty: "Aucun lieu favori. Touche le cœur sur la fiche d'un lieu." },
  { kind: "drinks", title: "Produits", count: (n) => `${n} produit${n > 1 ? "s" : ""}`, empty: "Aucun produit favori. Touche le cœur sur la fiche d'un produit." },
  { kind: "brands", title: "Marques", count: (n) => `${n} marque${n > 1 ? "s" : ""}`, empty: "Aucune marque favorite. Touche le cœur sur la fiche d'une marque." },
  { kind: "producers", title: "Producteurs", count: (n) => `${n} producteur${n > 1 ? "s" : ""}`, empty: "Aucun producteur favori. Touche le cœur sur la fiche d'un producteur." },
  { kind: "bibax", title: "Bibax", count: (n) => `${n} Bibax`, empty: "Aucun Bibax favori. Touche le cœur sur la fiche d'un Bibax." },
];

// Le rond d'icône de chaque carte de l'écran d'entrée (Mehdi, 2026-11-17) : celle que les lignes de la liste utilisent déjà quand l'élément n'a pas de photo (épingle, bouteille, étiquette,
// monogramme Bibamus, silhouette) — rien d'inventé.
const KIND_ICONS = {
  venues: <NavIcon name="map-pin" size={24} color={COLORS.amber} />,
  drinks: <NavIcon name="bottle" size={24} color={COLORS.amber} />,
  brands: <NavIcon name="tag" size={24} color={COLORS.amber} />,
  producers: <NavIcon name="bibamus-monogram" size={24} color={COLORS.amber} />,
  bibax: <NavIcon name="user" size={24} color={COLORS.amber} />,
};

// Le titre d'un écran de Mon Profil : petite barre verte puis le texte. Avec `iconUrl` (DrinkChecks, PlaceChecks), une icône de 24 px — comme celle du titre « Mes Bibax » — remplace la barre.
export function ScreenTitle({ children, iconUrl = null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
      {!iconUrl && <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />}
      {iconUrl && <img data-screen-title-icon src={iconUrl} alt="" style={{ width: "24px", height: "24px", flexShrink: 0 }} />}
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{children}</h1>
    </div>
  );
}

// Écran d'entrée : cinq cartes, chacune avec le nombre de ses favoris (espace insécable tant que la base n'a pas répondu : la carte garde sa hauteur).
export function MyFavoritesScreen({ bibros = [], onBack, goTo }) {
  const [counts, setCounts] = useState(null); // null = chargement ; { venues, drinks, brands, producers, bibax } ; { } si la lecture a échoué
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
      <ScreenTitle>Mes Favoris</ScreenTitle>
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

// Une page de liste (kind : "venues" | "drinks" | "brands" | "producers" | "bibax"). `screenId` : l'identifiant de l'écran dans App (la mémoire du retour d'une fiche
// est rangée sous ce nom, voir `useListReturn`) : au retour d'une fiche, la liste se remet à la hauteur où l'on l'avait laissée ; une entrée depuis « Mes Favoris » repart de zéro.
export function MyFavoritesListScreen({ screenId, mainScrollRef, kind, bibros = [], onBack, onOpenVenue, onOpenBrand, onOpenProducer, onOpenBibax, onOpenDrink }) {
  const meta = KINDS.find((k) => k.kind === kind);
  const { restored, save, open } = useListReturn(screenId, mainScrollRef);
  const [ids, setIds] = useState(restored ? restored.ids : null); // null = chargement ; identifiants de cette sorte, du plus récent au plus ancien
  const [byId, setById] = useState(restored ? restored.byId : {});
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
      const loader = { venues: loadVenuesByIds, drinks: loadDrinksByIds, brands: loadBrandsByIds, producers: loadBreweriesByIds }[kind];
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
    save({ ids, byId });
  }, [ids, byId, error]);
  const openVenue = onOpenVenue ? open(onOpenVenue) : null;
  const openDrink = onOpenDrink ? open(onOpenDrink) : null;
  const openBrand = onOpenBrand ? open(onOpenBrand) : null;
  const openProducer = onOpenProducer ? open(onOpenProducer) : null;
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
        avatar={<EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={40} fallbackIcon="map-pin" />}
        title={v.name}
        details={[v.city, countryFlagPart(v.country)].filter(Boolean)}
        isLast={last(resolved, i)}
        onOpen={openVenue ? () => openVenue(v.id) : null}
      />
    ));
  } else if (kind === "drinks") {
    rows = resolved.map((d, i) => (
      <FavoriteRow
        key={d.id}
        kind="drink"
        avatar={<EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={40} fallbackIcon="bottle" />}
        title={d.name}
        details={[d.type, d.brand].filter(Boolean)}
        isLast={last(resolved, i)}
        onOpen={openDrink ? () => openDrink(d.id) : null}
      />
    ));
  } else if (kind === "brands") {
    rows = resolved.map((b, i) => (
      <FavoriteRow
        key={b.id}
        kind="brand"
        avatar={<EntityAvatar photoUrl={b.logoUrl} size={40} fallbackIcon="tag" />}
        title={b.name}
        details={[b.originCountry].filter(Boolean)}
        isLast={last(resolved, i)}
        onOpen={openBrand ? () => openBrand(b.id) : null}
      />
    ));
  } else if (kind === "producers") {
    rows = resolved.map((p, i) => (
      <FavoriteRow
        key={p.id}
        kind="producer"
        avatar={<EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={40} />}
        title={p.name}
        details={[p.city, p.country].filter(Boolean)}
        isLast={last(resolved, i)}
        onOpen={openProducer ? () => openProducer(p.id) : null}
      />
    ));
  } else {
    const people = (ids || []).map((userId) => bibros.find((b) => b.userId === userId)).filter(Boolean);
    rows = people.map((b, i) => (
      <FavoriteRow
        key={b.userId}
        kind="bibax"
        avatar={<EntityAvatar photoUrl={b.avatarUrl} size={40} fallbackIcon="user" />}
        title={[b.name, b.lastName].filter(Boolean).join(" ")}
        details={[b.nickname, b.city].filter(Boolean)}
        isLast={last(people, i)}
        onOpen={openBibax ? () => openBibax(b.code) : null}
      />
    ));
  }

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>{meta.title}</ScreenTitle>

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
          <div data-favorite-section={kind} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {rows}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
