// ============================================================
// Fiches détaillées d'une brasserie/producteur et d'une marque
// — copiées telles quelles depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS, BRAND_TYPES, BRAND_CLASSIFICATIONS, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { NavIcon, CertificationIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { DrinkBadges, getDrinkBadgeItems, renderDrinkBadgeItem } from "./DrinkDisplay.jsx";
import { drinkSummaryLine } from "../utils.js";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { NotesCard, RatingFraction } from "./NotesCard.jsx";
import { BrandRatingModal } from "./BrandRatingModal.jsx";
import { HintBubble } from "./HintBubble.jsx";
import { useWrappedTitleExtra } from "../hooks/useWrappedTitleExtra.js";
import { loadDrinksByBrewery, loadDrinksByBrand, loadBrandsByProducer, loadBreweriesByIds, loadVenueById, loadBrandListsOnce, loadBrandRatingSummary, loadMyBibaxBrandRating, rateMyBrand, unrateMyBrand, loadBrandFollowStatus, toggleFollowBrand, loadBrandFavoriteStatus, toggleFavoriteBrand } from "../data/sharedDirectories.js";
import { customNames } from "../venueLists.js";
import { BRAND_TYPE_LIST_KEY, BRAND_CLASSIFICATION_LIST_KEY } from "../brandLists.js";
import { shareEntity, canShareEntity } from "../shareEntity.js";
import { usernameLinkUrl } from "../usernameLinks.js";

// Bouton « Partager » des fiches producteur et marque : même icône et même emplacement que sur la fiche lieu.
// Le lien partagé est bibamus.app/@nom de la fiche (lien général si elle n'a pas encore de @nom). Rien ne
// s'affiche si le partage natif n'existe pas sur l'appareil.
function ShareEntityButton({ name, username, extraTop = 0 }) {
  if (!canShareEntity()) return null;
  return (
    <div style={{ position: "absolute", top: `${32 + extraTop}px`, right: "8px", display: "flex", alignItems: "center" }}>
      <button
        onClick={() => shareEntity({ title: name, text: `Découvre ${name} sur Bibamus !`, url: usernameLinkUrl(username) })}
        title="Partager"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
      >
        <NavIcon name="share" size={24} color={COLORS.amber} />
      </button>
    </div>
  );
}

// Icônes de l'en-tête de la fiche Marque : « Partager » | cloche « Suivre sur Pulse » | cœur « Favoris », comme le bloc de la fiche Produit
// (mêmes emplacement, taille de 24 px et séparateurs verticaux). « Partager » n'apparaît que si le partage natif existe sur l'appareil.
// La cloche et le cœur sont pleins quand ils sont actifs. Pour l'instant, ils sont seulement enregistrés (l'effet sur le fil Pulse viendra après).
function BrandHeaderIcons({ name, username, extraTop = 0, isFollowed, followBusy, onToggleFollow, isFavorite, favoriteBusy, onToggleFavorite }) {
  const divider = <span aria-hidden="true" style={{ width: "1px", height: "18px", background: COLORS.chalkWhite, opacity: 0.4 }} />;
  const iconButton = { background: "none", border: "none", padding: 0, display: "flex" };
  return (
    <div style={{ position: "absolute", top: `${32 + extraTop}px`, right: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
      {canShareEntity() && (
        <>
          <button
            onClick={() => shareEntity({ title: name, text: `Découvre ${name} sur Bibamus !`, url: usernameLinkUrl(username) })}
            title="Partager"
            aria-label="Partager"
            style={{ ...iconButton, cursor: "pointer" }}
          >
            <NavIcon name="share" size={24} color={COLORS.amber} />
          </button>
          {divider}
        </>
      )}
      <button
        onClick={onToggleFollow}
        disabled={followBusy}
        title={isFollowed ? "Suivie sur Pulse — ses activités apparaissent" : "Suivre sur Pulse"}
        aria-label={isFollowed ? "Ne plus suivre sur Pulse" : "Suivre sur Pulse"}
        aria-pressed={isFollowed}
        style={{ ...iconButton, cursor: followBusy ? "default" : "pointer" }}
      >
        <NavIcon name="bell" size={24} color={COLORS.amber} filled={isFollowed} />
      </button>
      {divider}
      <button
        onClick={onToggleFavorite}
        disabled={favoriteBusy}
        title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={isFavorite}
        style={{ ...iconButton, cursor: favoriteBusy ? "default" : "pointer" }}
      >
        <NavIcon name="heart" size={24} color={COLORS.amber} filled={isFavorite} />
      </button>
    </div>
  );
}

export function BreweryDetailScreen({ brewery, breweriesDirectory = [], myBibroCode, myUserId, onBack, onOpenDrink, onOpenBrand, onOpenVenue, claimsEnabled = true }) {
  const [activeTab, setActiveTab] = useState("infos");
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // Nom sur plusieurs lignes : « Partager » et le contenu en dessous descendent d'autant (voir useWrappedTitleExtra).
  const [titleRef, titleExtra] = useWrappedTitleExtra();

  const [relatedDrinks, setRelatedDrinks] = useState([]);
  useEffect(() => {
    loadDrinksByBrewery(brewery.name).then(setRelatedDrinks);
  }, [brewery.name]);

  const [relatedBrands, setRelatedBrands] = useState([]);
  useEffect(() => {
    loadBrandsByProducer(brewery.id).then(setRelatedBrands);
  }, [brewery.id]);

  const [linkedVenue, setLinkedVenue] = useState(null);
  useEffect(() => {
    if (brewery.linkedVenueId) loadVenueById(brewery.linkedVenueId).then(setLinkedVenue);
    else setLinkedVenue(null);
  }, [brewery.linkedVenueId]);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: brewery.coverPhotoUrl ? `url(${brewery.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={brewery.profilePhotoUrl} photoEmoji={brewery.avatarEmoji} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div>
            {/* L'icône de certification est toujours dans le coin en haut à droite du bloc du nom, à hauteur de la 1re ligne (même pour un nom court),
            et ne suit pas le texte quand le nom passe sur plusieurs lignes. Le nom lui laisse sa place à droite (23 px). 3,4 px = de quoi la
            centrer sur une ligne de 23,75 px. */}
            <div ref={titleRef}>
              <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, paddingRight: "23px", lineHeight: 1.25, color: COLORS.chalkWhite }}>{brewery.name}</h1>
            </div>
            <span style={{ position: "absolute", top: "3.4px", right: 0, display: "flex" }}>
              <CertificationIcon level={brewery.certificationLevel} size={17} />
            </span>
            {brewery.country && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0", paddingRight: canShareEntity() ? "34px" : 0 }}>{brewery.country}</p>}
          </div>
          <ShareEntityButton name={brewery.name} username={brewery.username} extraTop={titleExtra} />
        </div>
      </div>

      <div style={{ marginTop: `${76 + titleExtra}px` }}>
      {linkedVenue && (
        <button
          onClick={() => onOpenVenue(linkedVenue.id)}
          style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%", marginBottom: "20px" }}
        >
          <EntityAvatar photoUrl={linkedVenue.profilePhotoUrl} photoEmoji={linkedVenue.avatarEmoji} size={28} />
          <span>
            <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>LIEU LIÉ</span>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>{linkedVenue.name}</span>
          </span>
        </button>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[
          { key: "infos", label: "Infos" },
          { key: "bibapulse", label: "BibaPulse" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              background: activeTab === t.key ? COLORS.amber : "none",
              color: activeTab === t.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${activeTab === t.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.key === "bibapulse" ? (
              <>
                Biba<span style={{ color: activeTab === t.key ? undefined : COLORS.amber }}>Pulse</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      {activeTab === "infos" && (
        <>
      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        SES MARQUES ({relatedBrands.length})
      </div>
      {relatedBrands.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "20px" }}>
          Aucune marque liée à ce producteur pour l'instant.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {relatedBrands.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpenBrand(b.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
            >
              <EntityAvatar photoUrl={b.logoUrl} size={28} />
              <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                {b.name}
                <CertificationIcon level={b.certificationLevel} size={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        SES PRODUITS ({relatedDrinks.length})
      </div>
      {relatedDrinks.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "20px" }}>
          Aucune boisson de cette brasserie enregistrée pour l'instant.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {relatedDrinks.map((d) => (
            <button
              key={d.id}
              onClick={() => onOpenDrink(d.id)}
              style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {d.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                <DrinkBadges drink={d} />
              </div>
              {drinkSummaryLine(d) && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{drinkSummaryLine(d)}</div>}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
        {claimsEnabled && (
        <button
          onClick={() => setClaiming(true)}
          style={{
            display: "inline-block",
            background: "none",
            border: `1.5px solid ${COLORS.paperAlt}`,
            borderRadius: "7px",
            padding: "5px 10px",
            color: COLORS.inkSoft,
            fontWeight: 600,
            fontSize: "10px",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Revendiquer la gestion de ce producteur
        </button>
        )}
        <button
          onClick={() => setShowActionsMenu(true)}
          title="Plus d'options"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
        >
          <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
        </button>
      </div>
        </>
      )}

      {activeTab === "bibapulse" && (
        <EntityPulseSection entityType="producer" entityId={brewery.id} myUserId={myUserId} myBibroCode={myBibroCode} onOpenDrink={onOpenDrink} onOpenVenue={onOpenVenue} onOpenBrand={onOpenBrand} />
      )}

      {claimsEnabled && claiming && <ClaimModal entityType="producer" entityId={brewery.id} entityName={brewery.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

      {showActionsMenu && (
        <div
          onClick={() => setShowActionsMenu(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason(null);
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
      {reporting && (
        <ReportModal
          entityType="producer"
          entityId={brewery.id}
          myBibroCode={myBibroCode}
          initialReason={reportInitialReason}
          directory={breweriesDirectory}
          onClose={() => setReporting(false)}
        />
      )}
      <div style={{ marginTop: "-14px" }}>
        <BackFooterLink onClick={onBack} />
      </div>
      </div>
    </div>
  );
}

export function BrandDetailScreen({ brand, brandsDirectory = [], myBibroCode, myUserId, onBack, onOpenDrink, onOpenBrewery, onOpenVenue, onRatingConfirmed, claimsEnabled = true }) {
  const [activeTab, setActiveTab] = useState("infos");
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // Nom sur plusieurs lignes : les icônes de l'en-tête et le contenu en dessous descendent d'autant (voir useWrappedTitleExtra).
  const [titleRef, titleExtra] = useWrappedTitleExtra();

  const [relatedDrinks, setRelatedDrinks] = useState([]);
  useEffect(() => {
    loadDrinksByBrand(brand.name).then(setRelatedDrinks);
  }, [brand.name]);

  // Cloche « Suivre sur Pulse » et cœur « Favoris » de la marque : un état par personne, enregistré en base (brand_follows et brand_favorites).
  // Lus à l'ouverture de la fiche ; une bascule attend la réponse du serveur (le bouton est inactif entre-temps), comme la cloche d'un produit.
  const [isFollowed, setIsFollowed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsFollowed(false);
    setIsFavorite(false);
    loadBrandFollowStatus(brand.id).then((v) => {
      if (!cancelled) setIsFollowed(v);
    });
    loadBrandFavoriteStatus(brand.id).then((v) => {
      if (!cancelled) setIsFavorite(v);
    });
    return () => {
      cancelled = true;
    };
  }, [brand.id]);
  const handleToggleFollow = async () => {
    setFollowBusy(true);
    const result = await toggleFollowBrand(brand.id);
    setFollowBusy(false);
    if (!result || result.error) {
      alert(result?.error || "Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setIsFollowed(!!result.following);
  };
  const handleToggleFavorite = async () => {
    setFavoriteBusy(true);
    const result = await toggleFavoriteBrand(brand.id);
    setFavoriteBusy(false);
    if (!result || result.error) {
      alert(result?.error || "Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setIsFavorite(!!result.favorite);
  };

  // Notes de la marque (étoiles sur 5, comme les produits). ratingSummary = { average, count, myRating, canRate } ; null = lecture en
  // cours, ou échouée. Il sert à la bannière de la couverture, au bouton étoile et aux lignes You et Bibamus de la carte « Notes ».
  // bibaxRating = la ligne Bibax ({ average, count }, ou null : un tiret).
  const [ratingSummary, setRatingSummary] = useState(null);
  const [bibaxRating, setBibaxRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  // ratingHint : 0 = pas de bulle ; sinon un compteur, qui change à chaque appui sur le bouton grisé (la bulle repart de zéro).
  const [ratingHint, setRatingHint] = useState(0);
  const ratingButtonRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    setRatingSummary(null);
    setBibaxRating(null);
    loadBrandRatingSummary(brand.id).then((s) => {
      if (!cancelled) setRatingSummary(s);
    });
    loadMyBibaxBrandRating(brand.id).then((r) => {
      if (!cancelled) setBibaxRating(r);
    });
    return () => {
      cancelled = true;
    };
  }, [brand.id]);
  const reloadRatingSummary = () => loadBrandRatingSummary(brand.id).then(setRatingSummary);
  const handleRatingButton = () => {
    if (!ratingSummary) {
      reloadRatingSummary(); // lecture en cours ou échouée : on réessaie
      return;
    }
    if (ratingSummary.canRate) setShowRatingModal(true);
    else setRatingHint((n) => n + 1);
  };
  // Note enregistrée ou retirée : la même confirmation encadrée en rose, en haut de l'écran, que celle d'un check (elle est dessinée par App ;
  // le titre vient d'ici : « Note confirmée » (icône check) ou « Note retirée » (icône croix), avec le nom de la marque dessous).
  const saveMyRating = async (value) => {
    const ok = await rateMyBrand(brand.id, value);
    if (ok) {
      await reloadRatingSummary();
      if (onRatingConfirmed) onRatingConfirmed({ title: "Note confirmée", name: brand.name });
    }
    return ok;
  };
  const removeMyRating = async () => {
    const ok = await unrateMyBrand(brand.id);
    if (ok) {
      await reloadRatingSummary();
      if (onRatingConfirmed) onRatingConfirmed({ title: "Note retirée", name: brand.name, icon: "x" });
    }
    return ok;
  };

  const [producers, setProducers] = useState([]);
  useEffect(() => {
    if (brand.producerIds?.length > 0) loadBreweriesByIds(brand.producerIds).then(setProducers);
    else setProducers([]);
  }, [brand.producerIds]);

  // Les noms des types et des catégories de la marque : ceux de la plateforme de gestion (élément ajouté, élément renommé)
  // l'emportent sur la liste de départ. Lus une fois par session. Un code inconnu dont le nom n'est pas chargé n'est jamais
  // montré tel quel. Entre parenthèses, l'explication de la liste de départ (« Bulles (champagne, crémant...) ») est omise.
  const [brandLists, setBrandLists] = useState(null);
  const hasBrandTags = (brand.brandTypes || []).length > 0 || (brand.classifications || []).length > 0;
  useEffect(() => {
    if (!hasBrandTags) return undefined;
    let cancelled = false;
    loadBrandListsOnce().then((lists) => {
      if (lists && !cancelled) setBrandLists(lists);
    });
    return () => {
      cancelled = true;
    };
  }, [hasBrandTags, brand.id]);
  const tagLabels = (codes, builtin, listKey) => {
    const names = brandLists ? customNames(brandLists[listKey].rows) : {};
    return (codes || [])
      .map((code) => {
        const found = builtin.find((t) => t.code === code);
        const label = names[code] || (found ? found.fr.replace(/\s*\(.*\)\s*$/, "") : "");
        return label;
      })
      .filter(Boolean);
  };
  const brandTags = [...tagLabels(brand.brandTypes, BRAND_TYPES, BRAND_TYPE_LIST_KEY), ...tagLabels(brand.classifications, BRAND_CLASSIFICATIONS, BRAND_CLASSIFICATION_LIST_KEY)];
  const hasOrigin = !!(brand.originCity || brand.originRegion || brand.originCountry);

  // Les produits, regroupés par sous-catégorie (« Bière », « Cidre », « Soda »… : SUBTYPE_LABELS), dans l'ordre du répertoire
  // (catégorie, puis ordre des sous-catégories). Un produit sans sous-catégorie nommée (les Spiritueux) est rangé sous le nom
  // de sa catégorie. Une seule sous-catégorie = pas d'intertitre.
  const subtypeKeys = Object.keys(SUBTYPE_LABELS);
  const drinkGroups = [
    ...relatedDrinks.reduce((m, d) => {
      const label = SUBTYPE_LABELS[d.beverageSubtype] || d.type;
      return m.set(label, { drinks: [...(m.get(label)?.drinks || []), d], type: d.type, subtypeRank: SUBTYPE_LABELS[d.beverageSubtype] ? subtypeKeys.indexOf(d.beverageSubtype) : -1 });
    }, new Map()),
  ]
    .map(([label, g]) => ({ label, ...g, typeRank: DRINK_TYPES.indexOf(g.type) === -1 ? DRINK_TYPES.length : DRINK_TYPES.indexOf(g.type) }))
    .sort((a, b) => a.typeRank - b.typeRank || a.subtypeRank - b.subtypeRank);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: brand.coverPhotoUrl ? `url(${brand.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={brand.logoUrl} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div>
            {/* L'icône de certification est toujours dans le coin en haut à droite du bloc du nom, à hauteur de la 1re ligne (même pour un nom court),
                et ne suit pas le texte quand le nom passe sur plusieurs lignes. Le nom lui laisse sa place à droite (23 px). 3,4 px = de quoi la
                centrer sur une ligne de 23,75 px. */}
            <div ref={titleRef}>
              <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, paddingRight: "23px", lineHeight: 1.25, color: COLORS.chalkWhite }}>{brand.name}</h1>
            </div>
            <span style={{ position: "absolute", top: "3.4px", right: 0, display: "flex" }}>
              <CertificationIcon level={brand.certificationLevel} size={17} />
            </span>
          </div>
          <BrandHeaderIcons
            name={brand.name}
            username={brand.username}
            extraTop={titleExtra}
            isFollowed={isFollowed}
            followBusy={followBusy}
            onToggleFollow={handleToggleFollow}
            isFavorite={isFavorite}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
        {/* Bannière de la note, puis bouton de note : mêmes emplacements que la bannière et le bouton Check de la fiche Produit
            (en bas de la couverture, le bouton tout à droite). Sans le droit de noter (aucun produit de la marque checké), le
            bouton est grisé et un appui affiche l'explication (bulle accrochée au bouton). */}
        {ratingSummary && ratingSummary.count > 0 && (
          <div style={{ position: "absolute", bottom: "8px", right: "68px", left: "108px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: "5px",
                background: "#000",
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "8px",
                padding: "5px 10px",
                maxWidth: "100%",
              }}
            >
              <span style={{ display: "flex", alignSelf: "center" }}>
                <NavIcon name="star" size={17} color={COLORS.amber} filled />
              </span>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}><RatingFraction value={ratingSummary.average} /></span>
              <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, whiteSpace: "nowrap" }}>- {ratingSummary.count} avis</span>
            </div>
          </div>
        )}
        <button
          ref={ratingButtonRef}
          onClick={handleRatingButton}
          title="Noter cette marque"
          aria-label="Noter cette marque"
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "52px",
            height: "52px",
            boxSizing: "border-box",
            borderRadius: "50%",
            background: "#000",
            border: `3px solid ${COLORS.amber}`,
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ratingSummary && ratingSummary.canRate ? 1 : 0.45,
          }}
        >
          <NavIcon name="star" size={26} color={COLORS.amber} filled />
        </button>
      </div>

      <div style={{ marginTop: `${76 + titleExtra}px` }}>
      {/* Même barre d'onglets que la fiche Produit. Biba360 ne contient pour l'instant que la carte « Notes » ; les autres blocs viendront. */}
      <PillTabs
        tabs={[
          { key: "infos", label: "Infos" },
          { key: "biba360", label: { prefix: "Biba", accent: "360" } },
          { key: "bibapulse", label: { prefix: "Biba", accent: "Pulse" } },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "infos" && (
        <>
      {/* Carte « Infos » : même présentation que la fiche Produit (pastilles, ligne d'origine, puis le producteur après un trait vert). */}
      {(brandTags.length > 0 || hasOrigin || producers.length > 0) && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px" }}>
            {[
              brandTags.length > 0 && {
                key: "tags",
                sep: null,
                node: (
                  <div key="tags" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {brandTags.map((label) => (
                      <span key={label} style={{ background: COLORS.paperAlt, borderRadius: "999px", padding: "0.45em 0.9em", fontSize: "10px", fontWeight: 600, color: COLORS.ink }}>
                        {label}
                      </span>
                    ))}
                  </div>
                ),
              },
              hasOrigin && {
                key: "origin",
                sep: "green",
                node: (
                  <div key="origin" style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <NavIcon name="map-pin" size={15} color={COLORS.amber} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {brand.originCity && <span>{brand.originCity}</span>}
                      {brand.originRegion && <span>{brand.originRegion}</span>}
                      {brand.originCountry && (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {brand.originCountry}
                          <CountryFlagImg country={brand.originCountry} size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
            ]
              .filter(Boolean)
              .map((row, i) => (
                <React.Fragment key={row.key}>
                  {i > 0 && (
                    <div
                      style={{
                        borderBottom: row.sep === "green" ? `2px solid ${COLORS.amber}` : `1px solid ${COLORS.paperAlt}`,
                        margin: row.sep === "green" ? "14px 0" : "10px 0",
                      }}
                    />
                  )}
                  {row.node}
                </React.Fragment>
              ))}
          </div>

          {(brandTags.length > 0 || hasOrigin) && producers.length > 0 && <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "14px 0" }} />}

          {producers.map((producer, i) => (
            <button
              key={producer.id}
              onClick={() => onOpenBrewery(producer.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginTop: i > 0 ? "10px" : 0 }}
            >
              <EntityAvatar photoUrl={producer.profilePhotoUrl} photoEmoji={producer.avatarEmoji} size={28} />
              <span>
                <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>Producteur</span>
                <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {producer.name}
                  <CertificationIcon level={producer.certificationLevel} size={13} />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Carte « Ses produits » : titre à barre verte et lignes imbriquées, comme « Lieux qui le proposent » sur la fiche Produit. */}
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Ses produits ({relatedDrinks.length})</span>
        </div>
        {relatedDrinks.length === 0 ? (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "16px 0", margin: 0 }}>Aucune boisson de cette marque enregistrée pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drinkGroups.map(({ label, drinks }, gi) => (
              <React.Fragment key={label}>
                {drinkGroups.length > 1 && (
                  <div style={{ fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px", marginTop: gi > 0 ? "6px" : 0 }}>
                    {label.toUpperCase()} ({drinks.length})
                  </div>
                )}
                {drinks.map((d) => {
                  const parts = (d.type === "Bières & Cidres"
                    ? [
                        d.nationality ? <CountryFlagImg country={d.nationality} size={18.5} /> : null,
                        d.abv != null ? <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{d.abv.toFixed(1)}% ABV</span> : null,
                        ...getDrinkBadgeItems(d, { hideCountry: true }).map((it) => renderDrinkBadgeItem(it, { drink: d, size: 11 })),
                      ]
                    : getDrinkBadgeItems(d).map((it) => renderDrinkBadgeItem(it, { drink: d, size: 11 }))
                  ).filter(Boolean);
                  return (
                    <button
                      key={d.id}
                      onClick={() => onOpenDrink(d.id)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
                    >
                      <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={28} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {d.name}
                          {d.pendingContributionsCount > 0 && (
                            <span style={{ fontSize: "13px" }} title="Une modification est proposée">
                              📝
                            </span>
                          )}
                        </span>
                        {parts.length > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                            {parts.map((part, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                                {part}
                              </React.Fragment>
                            ))}
                          </span>
                        )}
                      </span>
                      <CertificationIcon level={d.certificationLevel} size={15} />
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
        {claimsEnabled && (
        <button
          onClick={() => setClaiming(true)}
          style={{
            display: "inline-block",
            background: "none",
            border: `1.5px solid ${COLORS.paperAlt}`,
            borderRadius: "7px",
            padding: "5px 10px",
            color: COLORS.inkSoft,
            fontWeight: 600,
            fontSize: "10px",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Revendiquer la gestion de cette marque
        </button>
        )}
        <button
          onClick={() => setShowActionsMenu(true)}
          title="Plus d'options"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
        >
          <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
        </button>
      </div>
        </>
      )}

      {/* Carte « Notes » : You (ma note), Bibax (la moyenne de mes Bibax), Bibamus (la moyenne de tous), comme sur la fiche Produit. */}
      {activeTab === "biba360" && (
        <NotesCard
          mine={ratingSummary ? ratingSummary.myRating : null}
          bibax={bibaxRating}
          everyone={ratingSummary && ratingSummary.count > 0 ? { average: ratingSummary.average, count: ratingSummary.count } : null}
        />
      )}

      {/* Le fil de la marque : les checks et découvertes de ses produits, et les publications qui la taguent.
          Les pastilles d'autres marques ne sont pas cliquables ici (pas de pile de retour marque → marque). */}
      {activeTab === "bibapulse" && (
        <EntityPulseSection entityType="brand" entityId={brand.id} myUserId={myUserId} myBibroCode={myBibroCode} onOpenDrink={onOpenDrink} onOpenVenue={onOpenVenue} onOpenProducer={onOpenBrewery} />
      )}

      {/* Bulle accrochée au bouton étoile grisé (elle s'efface seule) : pourquoi on ne peut pas encore noter. */}
      {ratingHint > 0 && (
        <HintBubble key={ratingHint} anchorRef={ratingButtonRef} onClose={() => setRatingHint(0)}>
          Checke un produit de cette marque pour pouvoir la noter.
        </HintBubble>
      )}
      {showRatingModal && ratingSummary && (
        <BrandRatingModal brandName={brand.name} myRating={ratingSummary.myRating} onSave={saveMyRating} onRemove={removeMyRating} onClose={() => setShowRatingModal(false)} />
      )}
      {claimsEnabled && claiming && <ClaimModal entityType="brand" entityId={brand.id} entityName={brand.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

      {showActionsMenu && (
        <div
          onClick={() => setShowActionsMenu(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason(null);
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
      {reporting && (
        <ReportModal
          entityType="brand"
          entityId={brand.id}
          myBibroCode={myBibroCode}
          initialReason={reportInitialReason}
          directory={brandsDirectory}
          onClose={() => setReporting(false)}
        />
      )}
      <div style={{ marginTop: "-14px" }}>
        <BackFooterLink onClick={onBack} />
      </div>
      </div>
    </div>
  );
}
