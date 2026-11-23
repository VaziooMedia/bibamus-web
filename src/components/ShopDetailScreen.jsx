// ============================================================
// Fiche d'un shop (point de vente de boissons à emporter) : couverture, image de profil, nom, puis une carte « Infos » copiée de celle d'un producteur
// (pastilles, adresse qui ouvre Google Maps, téléphone et courriel, icônes de réseaux) avec en plus les pays où une boutique en ligne livre.
// Un magasin affiche aussi ses horaires d'ouverture (Google, comme un lieu) sous la carte « Infos ».
// Un cœur « Favoris » en dessous du nom, à droite (même place et même taille que sur la fiche d'un producteur) : un état par personne, enregistré dans le compte, lu à l'ouverture de la fiche ;
// plein = favori, la bascule attend la réponse du serveur. Pas de note, de cloche ni d'onglets Biba360 / BibaPulse (ils viendront avec les étapes suivantes).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, SHOP_CATEGORIES } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { ZoomableAvatar } from "./PhotoLightbox.jsx";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay.jsx";
import { resolveTagLabels, buildSocials, SocialIconsRow } from "./BreweryBrandDetailScreens.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { loadShopById, loadShopListsOnce, loadShopFavoriteStatus, toggleFavoriteShop } from "../data/sharedDirectories.js";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";
import { useWrappedTitleExtra } from "../hooks/useWrappedTitleExtra.js";

// Carte « Infos » d'un shop. Les pastilles disent d'abord le type (Magasin / En ligne : un shop peut avoir les deux), puis les catégories.
// Un magasin a une adresse (le « B- » devant le code postal n'est mis que pour la Belgique) ; une boutique en ligne seule n'en a pas. Les pays desservis
// n'apparaissent que pour une boutique en ligne.
function ShopInfosCard({ shop, tags }) {
  const isBelgium = shop.country === "Belgique";
  const addressLine1 = shop.hasStore ? [shop.streetName, shop.streetNumber].filter(Boolean).join(", ") : "";
  const addressLine2 = shop.hasStore
    ? ([shop.postalCode ? `${isBelgium ? "B-" : ""}${shop.postalCode}` : "", shop.city].filter(Boolean).join(" ") + (shop.village ? ` (${shop.village})` : "")).trim()
    : "";
  const hasAddress = !!(addressLine1 || addressLine2);
  const hasPlace = shop.hasStore && (hasAddress || !!shop.country);
  const hasPhone = shop.hasStore && !!shop.phone;
  const hasEmail = !!shop.email;
  const hasContact = hasPhone || hasEmail;
  const socials = buildSocials(shop);
  const delivery = shop.hasOnline ? shop.deliveryCountries || [] : [];
  if (tags.length === 0 && !hasPlace && !hasContact && socials.length === 0 && delivery.length === 0) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([addressLine1, addressLine2, shop.country].filter(Boolean).join(", "))}`;
  const placeContent = (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <NavIcon name="map-pin" size={18} color={COLORS.amber} />
      <span>
        {hasAddress ? (
          <>
            {addressLine1}
            {addressLine1 && addressLine2 && <br />}
            {addressLine2}
          </>
        ) : (
          shop.country
        )}
        {shop.country && <CountryFlagImg country={shop.country} size={20} style={{ verticalAlign: "-2px", marginLeft: "6px" }} />}
      </span>
    </div>
  );
  const placeStyle = { textDecoration: "none", color: COLORS.inkSoft, fontSize: "12.5px", lineHeight: 1.5 };
  const contactLinkStyle = { lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" };
  const hasTop = hasPlace || hasContact;
  const thinRule = <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, margin: "12px 0" }} />;
  return (
    <div data-shop-infos style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
      {tags.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tags.map((label) => (
              <span key={label} style={{ padding: "4px 10px", borderRadius: "999px", border: `1.5px solid ${COLORS.paperAlt}`, color: COLORS.chalkWhite, fontSize: "11px", fontWeight: 600 }}>
                {label}
              </span>
            ))}
          </div>
          {(hasTop || delivery.length > 0 || socials.length > 0) && <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "12px 0" }} />}
        </>
      )}
      {hasTop && (
        <div style={{ display: "grid", gridTemplateColumns: hasPhone && hasEmail ? "1fr 1px 30px 1px 30px" : hasContact ? "1fr 1px 30px" : "1fr", gap: "8px", alignItems: "center" }}>
          {hasAddress ? (
            <a href={mapsUrl} target="_blank" rel="noreferrer" style={placeStyle}>
              {placeContent}
            </a>
          ) : hasPlace ? (
            <div style={placeStyle}>{placeContent}</div>
          ) : (
            <div />
          )}
          {hasContact && <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />}
          {hasPhone && (
            <a href={`tel:${shop.phone.replace(/\s+/g, "")}`} title={shop.phone} style={contactLinkStyle}>
              <NavIcon name="phone" size={22} color={COLORS.amber} />
            </a>
          )}
          {!hasPhone && hasEmail && (
            <a href={`mailto:${shop.email}`} title={shop.email} style={contactLinkStyle}>
              <NavIcon name="mail" size={22} color={COLORS.amber} />
            </a>
          )}
          {hasPhone && hasEmail && (
            <>
              <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
              <a href={`mailto:${shop.email}`} title={shop.email} style={contactLinkStyle}>
                <NavIcon name="mail" size={22} color={COLORS.amber} />
              </a>
            </>
          )}
        </div>
      )}
      {delivery.length > 0 && (
        <>
          {hasTop && thinRule}
          <div data-shop-delivery style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12.5px", color: COLORS.inkSoft, lineHeight: 1.5 }}>
            <span style={{ display: "flex", marginTop: "1px" }}>
              <NavIcon name="world" size={18} color={COLORS.amber} />
            </span>
            <span>
              <span style={{ display: "block", fontSize: "10px", letterSpacing: "1px" }}>LIVRE EN</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: "2px" }}>
                {delivery.map((c) => (
                  <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                    <CountryFlagImg country={c} size={16} />
                    {c}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </>
      )}
      {socials.length > 0 && (
        <>
          {(hasTop || delivery.length > 0) && thinRule}
          <SocialIconsRow socials={socials} />
        </>
      )}
    </div>
  );
}

export function ShopDetailScreen({ shopId, myBibroCode, onBack }) {
  const [shop, setShop] = useState(undefined); // undefined : lecture en cours ; null : fiche introuvable
  const [lists, setLists] = useState(null);
  // « Signaler ou suggérer une modification » (menu « Plus d'options » en bas de la fiche, comme sur les fiches Producteur et Marque) : même fenêtre de signalement
  // que les autres fiches (table entity_reports). La fiche en double se cherche côté serveur (`search_shops`), dans la fenêtre elle-même.
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  // Cœur « Favoris » : lu à l'ouverture de la fiche (faux tant que la base n'a pas répondu, ou si la lecture échoue).
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  // Nom sur plusieurs lignes : le contenu en dessous descend d'autant (voir useWrappedTitleExtra).
  const [titleRef, titleExtra] = useWrappedTitleExtra(!!shop);

  useEffect(() => {
    let cancelled = false;
    setShop(undefined);
    loadShopById(shopId).then((s) => {
      if (!cancelled) setShop(s);
    });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  useEffect(() => {
    let cancelled = false;
    setIsFavorite(false);
    loadShopFavoriteStatus(shopId).then((v) => {
      if (!cancelled) setIsFavorite(v);
    });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const handleToggleFavorite = async () => {
    setFavoriteBusy(true);
    const result = await toggleFavoriteShop(shopId);
    setFavoriteBusy(false);
    if (!result || result.error) {
      alert(result?.error || "Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setIsFavorite(!!result.favorite);
  };

  useEffect(() => {
    let cancelled = false;
    loadShopListsOnce().then((l) => {
      if (l && !cancelled) setLists(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!shop) {
    return (
      <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginTop: "24px" }}>{shop === undefined ? "Chargement..." : "Ce shop n'est plus disponible."}</p>
        <BackFooterLink onClick={onBack} />
      </div>
    );
  }

  const typeTags = [shop.hasStore && "Magasin", shop.hasOnline && "En ligne"].filter(Boolean);
  const tags = [...typeTags, ...resolveTagLabels(lists, shop.categories, SHOP_CATEGORIES, SHOP_CATEGORY_LIST_KEY)];

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div style={{ width: "100%", height: "150px", background: shop.coverPhotoUrl ? `url(${shop.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt }} />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <ZoomableAvatar photoUrl={shop.profilePhotoUrl} alt={shop.name} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div ref={titleRef}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{shop.name}</h1>
          </div>
          {shop.subtitle && (
            <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0", paddingRight: "40px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shop.subtitle}</p>
          )}
          <div style={{ position: "absolute", top: `${32 + titleExtra}px`, right: "8px", display: "flex", alignItems: "center" }}>
            <button
              data-shop-favorite={isFavorite ? "on" : "off"}
              onClick={handleToggleFavorite}
              disabled={favoriteBusy}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={isFavorite}
              style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: favoriteBusy ? "default" : "pointer" }}
            >
              <NavIcon name="heart" size={24} color={COLORS.amber} filled={isFavorite} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: `${76 + titleExtra}px` }}>
        <ShopInfosCard shop={shop} tags={tags} />
        {shop.hasStore && (
          <div data-shop-hours style={{ marginBottom: "16px" }}>
            <OpeningHoursDisplay googlePlaceId={shop.googlePlaceId} noGooglePresence={shop.noGooglePresence} noFixedHours={shop.noFixedHours} table="shops_directory" />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "40px" }}>
          <button
            data-shop-actions
            onClick={() => setShowActionsMenu(true)}
            title="Plus d'options"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
          >
            <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
          </button>
        </div>
        <div style={{ marginTop: "-14px" }}>
          <BackFooterLink onClick={onBack} />
        </div>
      </div>
      {showActionsMenu && (
        <div
          data-shop-actions-menu
          onClick={() => setShowActionsMenu(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
            <button
              data-shop-report
              onClick={() => {
                setShowActionsMenu(false);
                setReporting(true);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <ReportIcon />
              Signaler ou suggérer une modification
            </button>
          </div>
        </div>
      )}
      {reporting && <ReportModal entityType="shop" entityId={shop.id} myBibroCode={myBibroCode} canBeClosed={!!shop.hasStore} onClose={() => setReporting(false)} />}
    </div>
  );
}
