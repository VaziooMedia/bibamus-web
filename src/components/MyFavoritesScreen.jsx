// « Mes Favoris » (Mon Profil) — tout ce que la personne a mis de côté, rangé par sorte sous une barre (comme les périodes de « Mon Historique ») :
// Lieux (étoile de la fiche d'un lieu), Marques et Producteurs (cœur de leur fiche), Bibax (cœur de la fiche d'un Bibax confirmé) et Produits (la liste
// étoilée « à goûter » de la fiche d'un produit). Du plus récent au plus ancien dans chaque sorte ; une sorte vide reste affichée, avec le geste qui
// l'alimente. Les lignes ont le style de « Mon Historique » : une carte, des lignes pleine largeur séparées par un trait fin.
// Lieux, marques, producteurs et Bibax viennent de la fonction `get_my_favorites` (des identifiants, puis les noms par les fonctions habituelles) ;
// les Bibax se lisent dans la liste `bibros` déjà en mémoire (un Bibax dont la relation n'est plus confirmée n'est de toute façon plus rendu par le serveur) ;
// les produits viennent de la liste « à goûter » (`wishlistDrinkIds`, gardée dans le navigateur).
// Chaque ligne ouvre la fiche ; son retour ramène ici.
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar } from "./ui.jsx";
import { loadMyFavorites, loadVenuesByIds, loadBrandsByIds, loadBreweriesByIds, loadDrinksByIds } from "../data/sharedDirectories.js";
import { SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE } from "./BibaSoloScreen.jsx";

const AMBER_DOT = <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />;

// Éléments séparés par des points vert fluo (même rendu que les lignes de « Mon Historique »).
function DotLine({ parts }) {
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

// Une sorte : sa barre (nom en vert fluo + trait), puis la carte de ses lignes — ou, si elle est vide, la phrase qui dit comment l'alimenter.
function FavoriteSection({ kind, label, rows, emptyText, isFirst }) {
  return (
    <section data-favorite-section={kind}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: isFirst ? "0 0 18px" : "20px 0 18px" }}>
        <span style={SOLO_BAR_LABEL_STYLE}>{label}</span>
        <div style={SOLO_BAR_LINE_STYLE} />
      </div>
      {rows.length === 0 ? (
        <p data-favorite-empty={kind} style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
          {emptyText}
        </p>
      ) : (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>{rows}</div>
      )}
    </section>
  );
}

export function MyFavoritesScreen({ bibros = [], wishlistDrinkIds = [], onBack, onOpenVenue, onOpenBrand, onOpenProducer, onOpenBibax, onOpenDrink }) {
  const [favs, setFavs] = useState(null); // null = chargement ; { venues, brands, producers, bibax } (identifiants)
  const [error, setError] = useState(false);
  const [venuesById, setVenuesById] = useState({});
  const [brandsById, setBrandsById] = useState({});
  const [producersById, setProducersById] = useState({});
  const [drinksById, setDrinksById] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyFavorites().then(async (result) => {
      if (cancelled) return;
      if (!result) {
        setError(true);
        setFavs((prev) => prev || { venues: [], brands: [], producers: [], bibax: [] });
        return;
      }
      const [venues, brands, producers] = await Promise.all([loadVenuesByIds(result.venues), loadBrandsByIds(result.brands), loadBreweriesByIds(result.producers)]);
      if (cancelled) return;
      setVenuesById(Object.fromEntries(venues.map((v) => [String(v.id), v])));
      setBrandsById(Object.fromEntries(brands.map((b) => [String(b.id), b])));
      setProducersById(Object.fromEntries(producers.map((p) => [String(p.id), p])));
      setFavs(result);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Produits : la liste « à goûter », la dernière ajoutée en premier.
  const wishlistKey = wishlistDrinkIds.join("|");
  useEffect(() => {
    if (wishlistDrinkIds.length === 0) return undefined;
    let cancelled = false;
    loadDrinksByIds(wishlistDrinkIds).then((drinks) => {
      if (!cancelled) setDrinksById(Object.fromEntries(drinks.map((d) => [String(d.id), d])));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistKey]);

  const loading = favs === null;
  const last = (arr, i) => i === arr.length - 1;

  const venues = (favs?.venues || []).map((id) => venuesById[id]).filter(Boolean);
  const brands = (favs?.brands || []).map((id) => brandsById[id]).filter(Boolean);
  const producers = (favs?.producers || []).map((id) => producersById[id]).filter(Boolean);
  const bibax = (favs?.bibax || []).map((userId) => bibros.find((b) => b.userId === userId)).filter(Boolean);
  const drinks = [...wishlistDrinkIds].reverse().map((id) => drinksById[String(id)]).filter(Boolean);

  const venueRows = venues.map((v, i) => (
    <FavoriteRow
      key={v.id}
      kind="venue"
      avatar={<EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={40} fallbackIcon="map-pin" />}
      title={v.name}
      details={[v.city, v.country].filter(Boolean)}
      isLast={last(venues, i)}
      onOpen={onOpenVenue ? () => onOpenVenue(v.id) : null}
    />
  ));
  const brandRows = brands.map((b, i) => (
    <FavoriteRow
      key={b.id}
      kind="brand"
      avatar={<EntityAvatar photoUrl={b.logoUrl} size={40} fallbackIcon="tag" />}
      title={b.name}
      details={[b.originCountry].filter(Boolean)}
      isLast={last(brands, i)}
      onOpen={onOpenBrand ? () => onOpenBrand(b.id) : null}
    />
  ));
  const producerRows = producers.map((p, i) => (
    <FavoriteRow
      key={p.id}
      kind="producer"
      avatar={<EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={40} />}
      title={p.name}
      details={[p.city, p.country].filter(Boolean)}
      isLast={last(producers, i)}
      onOpen={onOpenProducer ? () => onOpenProducer(p.id) : null}
    />
  ));
  const bibaxRows = bibax.map((b, i) => (
    <FavoriteRow
      key={b.userId}
      kind="bibax"
      avatar={<EntityAvatar photoUrl={b.avatarUrl} size={40} fallbackIcon="user" />}
      title={[b.name, b.lastName].filter(Boolean).join(" ")}
      details={[b.nickname, b.city].filter(Boolean)}
      isLast={last(bibax, i)}
      onOpen={onOpenBibax ? () => onOpenBibax(b.code) : null}
    />
  ));
  const drinkRows = drinks.map((d, i) => (
    <FavoriteRow
      key={d.id}
      kind="drink"
      avatar={<EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={40} fallbackIcon="bottle" />}
      title={d.name}
      details={[d.type, d.brand].filter(Boolean)}
      isLast={last(drinks, i)}
      onOpen={onOpenDrink ? () => onOpenDrink(d.id) : null}
    />
  ));

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Mes Favoris</h1>
      </div>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : (
          <>
            {error && (
              <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
                Impossible de charger tes favoris.{" "}
                <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
                  Réessayer
                </button>
              </p>
            )}
            {/* Si la base n'a pas répondu, on ne prétend pas que ces sortes sont vides : seule la liste « à goûter » (gardée dans le navigateur) s'affiche. */}
            {!error && (
              <>
                <FavoriteSection kind="venues" label="Lieux" rows={venueRows} emptyText="Aucun lieu favori. Touche l'étoile sur la fiche d'un lieu." isFirst />
                <FavoriteSection kind="brands" label="Marques" rows={brandRows} emptyText="Aucune marque favorite. Touche le cœur sur la fiche d'une marque." />
                <FavoriteSection kind="producers" label="Producteurs" rows={producerRows} emptyText="Aucun producteur favori. Touche le cœur sur la fiche d'un producteur." />
                <FavoriteSection kind="bibax" label="Bibax" rows={bibaxRows} emptyText="Aucun Bibax favori. Touche le cœur sur la fiche d'un Bibax." />
              </>
            )}
            <FavoriteSection kind="drinks" label="Produits" rows={drinkRows} emptyText="Aucun produit. Touche l'étoile sur la fiche d'un produit." isFirst={!!error} />
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
