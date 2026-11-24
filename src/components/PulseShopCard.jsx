import React, { useEffect, useRef, useState } from "react";
import { COLORS, SHOP_CATEGORIES } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { resolveTagLabels } from "./BreweryBrandDetailScreens.jsx";
import { formatAddress } from "../utils.js";
import { loadShopsByIds, loadShopListsOnce } from "../data/sharedDirectories.js";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";

// Shops cités par les cartes « Contribution à BibAtlas » d'un fil BibaPulse, par identifiant : une seule lecture groupée pour les shops pas encore lus (jamais deux fois le
// même shop dans la session, même si plusieurs cartes parlent de lui). Un shop que la base ne montre pas (fiche retirée, masquée ou fusionnée dans un autre : statut
// « doublon ») est absent de la réponse : la carte n'a alors pas de bloc de fiche. Une lecture qui échoue donne la même chose, sans nouvel essai.
export function usePulseShopsById(entries) {
  const [shopsById, setShopsById] = useState({});
  const requested = useRef(new Set());
  useEffect(() => {
    const ids = [];
    (entries || []).forEach((e) => {
      if (e.eventType === "database_contribution" && e.objectType === "shop" && e.objectId && !requested.current.has(e.objectId) && !ids.includes(e.objectId)) ids.push(e.objectId);
    });
    if (ids.length === 0) return;
    ids.forEach((id) => requested.current.add(id));
    loadShopsByIds(ids).then((shops) => setShopsById((prev) => ({ ...prev, ...Object.fromEntries(shops.map((s) => [s.id, s])) })));
  }, [entries]);
  return shopsById;
}

// Fiche shop en petit, dans une carte du fil BibaPulse (Contribution à BibAtlas). Même cadre et même mise en page que la fiche lieu (PulseVenueCard) : le rond-profil
// (logo du shop, ou le caddie à défaut — l'icône de l'onglet Shops de la recherche) est centré sur les trois premières lignes ; les suivantes reviennent sous lui.
//   1. le nom ;
//   2. le sous-titre, en italique avec le petit point vert fluo de 6 px devant (comme sur la fiche lieu) ;
//   3. l'adresse du magasin (même écriture que la liste des Shops : « Rue de Fer, 12 - B-5000 Namur »), ou « En ligne » pour une boutique sans magasin ;
//   4. les catégories, en petites pastilles (« Supermarché », « Cave à bières »…), sur une ou plusieurs lignes.
// Une ligne sans donnée n'est pas affichée ; pas de note (les shops n'en ont pas encore). Toute la fiche est un bouton qui ouvre le shop. Les données viennent du shop
// lui-même, jamais copiées dans la carte. Les noms de catégories modifiés depuis la plateforme de gestion sont chargés comme sur la liste des Shops (une seule lecture
// par session) ; une catégorie dont le nom n'est pas connu n'est pas montrée (jamais son code technique).
export function PulseShopCard({ shop, onOpen }) {
  const [lists, setLists] = useState(null);
  const hasCategories = (shop.categories || []).length > 0;
  useEffect(() => {
    if (!hasCategories) return undefined;
    let cancelled = false;
    loadShopListsOnce().then((l) => {
      if (l && !cancelled) setLists(l);
    });
    return () => {
      cancelled = true;
    };
  }, [hasCategories, shop.id]);

  const categoryLabels = resolveTagLabels(lists, shop.categories, SHOP_CATEGORIES, SHOP_CATEGORY_LIST_KEY);
  const place = shop.hasStore ? formatAddress(shop) : "En ligne";

  const lineStyle = { display: "block", marginTop: "3px" };
  const chipStyle = { background: COLORS.paperAlt, borderRadius: "999px", padding: "0.3em 0.8em", fontSize: "10px", fontWeight: 600, color: COLORS.ink, whiteSpace: "nowrap" };

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
      {/* Rond-profil, centré sur les trois premières lignes : nom, sous-titre, adresse */}
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <EntityAvatar photoUrl={shop.profilePhotoUrl} size={56} fallbackIcon="shopping-cart" />
        <span style={{ flex: 1, minWidth: 0 }}>
          {/* Ligne 1 : nom */}
          <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{shop.name}</span>
          {/* Ligne 2 : sous-titre, précédé du point vert fluo */}
          {shop.subtitle && (
            <span style={{ ...lineStyle, display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.chalkWhite, fontStyle: "italic", fontWeight: 600 }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{shop.subtitle}</span>
            </span>
          )}
          {/* Ligne 3 : adresse du magasin, ou « En ligne » */}
          {place && <span style={{ ...lineStyle, fontSize: "11.5px", color: COLORS.inkSoft, overflowWrap: "anywhere" }}>{place}</span>}
        </span>
      </span>
      {/* Ligne 4 : catégories, en petites pastilles, sous le rond-profil */}
      {categoryLabels.length > 0 && (
        <span style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
          {categoryLabels.map((label) => (
            <span key={label} style={chipStyle}>
              {label}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
