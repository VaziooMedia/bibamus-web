// ============================================================
// Fiches détaillées d'une brasserie/producteur et d'une marque
// — copiées telles quelles depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS, BRAND_TYPES, BRAND_CLASSIFICATIONS, PRODUCER_TYPES, PRODUCER_PROFILES, DRINK_TYPES, SUBTYPE_LABELS } from "../constants.js";
import { NavIcon, CertificationIcon, CountryFlagImg, GoogleIcon, FacebookIcon, InstagramIcon, TiktokIcon, WhatsappIcon, LinkedinIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { ZoomableAvatar } from "./PhotoLightbox.jsx";
import { getDrinkBadgeItems, renderDrinkBadgeItem } from "./DrinkDisplay.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { NotesCard, RatingFraction } from "./NotesCard.jsx";
import { EntityRatingModal } from "./EntityRatingModal.jsx";
import { HintBubble } from "./HintBubble.jsx";
import { useWrappedTitleExtra } from "../hooks/useWrappedTitleExtra.js";
import { loadDrinksByBrewery, loadDrinksByBrandId, loadBrandsByProducer, loadBreweriesByIds, loadVenueById, loadBrandListsOnce, loadProducerListsOnce, loadBrandRatingSummary, loadMyBibaxBrandRating, rateMyBrand, unrateMyBrand, loadBrandFollowStatus, toggleFollowBrand, loadBrandFavoriteStatus, toggleFavoriteBrand, loadProducerRatingSummary, loadMyBibaxProducerRating, rateMyProducer, unrateMyProducer, loadProducerFollowStatus, toggleFollowProducer, loadProducerFavoriteStatus, toggleFavoriteProducer } from "../data/sharedDirectories.js";
import { customNames } from "../venueLists.js";
import { BRAND_TYPE_LIST_KEY, BRAND_CLASSIFICATION_LIST_KEY } from "../brandLists.js";
import { PRODUCER_TYPE_LIST_KEY, PRODUCER_PROFILE_LIST_KEY } from "../producerLists.js";
import { shareEntity, canShareEntity } from "../shareEntity.js";
import { usernameLinkUrl } from "../usernameLinks.js";
import { normalizeUrl, buildWhatsAppLink } from "../utils.js";
import snapchatIconUrl from "../assets/brand/snapchat.svg";
import internetIconUrl from "../assets/brand/internet.svg";
import youtubeIconUrl from "../assets/brand/youtube.svg";

// Icônes de l'en-tête des fiches Marque et Producteur : « Partager » | cloche « Suivre sur Pulse » | cœur « Favoris », comme le bloc de la fiche
// Produit (mêmes emplacement, taille de 24 px et séparateurs verticaux). « Partager » n'apparaît que si le partage natif existe sur l'appareil.
// La cloche et le cœur sont pleins quand ils sont actifs. Pour l'instant, ils sont seulement enregistrés (l'effet sur le fil Pulse viendra après).
// followedTitle : l'infobulle de la cloche allumée, qui s'accorde avec la fiche (« Suivie » pour une marque, « Suivi » pour un producteur).
function EntityHeaderIcons({ name, username, extraTop = 0, isFollowed, followBusy, onToggleFollow, isFavorite, favoriteBusy, onToggleFavorite, followedTitle = "Suivie sur Pulse — ses activités apparaissent" }) {
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
        title={isFollowed ? followedTitle : "Suivre sur Pulse"}
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

// Les fonctions serveur de la cloche, du cœur et des notes de chaque sorte de fiche (marque, producteur) : la fiche passe la sienne à
// useEntityEngagement, qui est le même pour les deux.
const BRAND_ENGAGEMENT_API = {
  loadFollow: loadBrandFollowStatus,
  toggleFollow: toggleFollowBrand,
  loadFavorite: loadBrandFavoriteStatus,
  toggleFavorite: toggleFavoriteBrand,
  loadSummary: loadBrandRatingSummary,
  loadBibax: loadMyBibaxBrandRating,
  rate: rateMyBrand,
  unrate: unrateMyBrand,
};
const PRODUCER_ENGAGEMENT_API = {
  loadFollow: loadProducerFollowStatus,
  toggleFollow: toggleFollowProducer,
  loadFavorite: loadProducerFavoriteStatus,
  toggleFavorite: toggleFavoriteProducer,
  loadSummary: loadProducerRatingSummary,
  loadBibax: loadMyBibaxProducerRating,
  rate: rateMyProducer,
  unrate: unrateMyProducer,
};

// Cloche « Suivre sur Pulse », cœur « Favoris » et note (étoiles sur 5) d'une fiche Marque ou Producteur : un état par personne, enregistré en base.
// Lus à l'ouverture de la fiche ; une bascule attend la réponse du serveur (le bouton est inactif entre-temps), comme la cloche d'un produit.
// ratingSummary = { average, count, myRating, canRate } ; null = lecture en cours, ou échouée. Il sert à la bannière de la couverture, au bouton
// étoile et aux lignes You et Bibamus de la carte « Notes ». bibaxRating = la ligne Bibax ({ average, count }, ou null : un tiret).
// Note enregistrée ou retirée : la même confirmation encadrée en rose, en haut de l'écran, que celle d'un check (elle est dessinée par App ;
// le titre vient d'ici : « Note confirmée » (icône check) ou « Note retirée » (icône croix), avec le nom de la fiche dessous).
function useEntityEngagement(entity, api, onRatingConfirmed) {
  const [isFollowed, setIsFollowed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsFollowed(false);
    setIsFavorite(false);
    api.loadFollow(entity.id).then((v) => {
      if (!cancelled) setIsFollowed(v);
    });
    api.loadFavorite(entity.id).then((v) => {
      if (!cancelled) setIsFavorite(v);
    });
    return () => {
      cancelled = true;
    };
  }, [api, entity.id]);
  const handleToggleFollow = async () => {
    setFollowBusy(true);
    const result = await api.toggleFollow(entity.id);
    setFollowBusy(false);
    if (!result || result.error) {
      alert(result?.error || "Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setIsFollowed(!!result.following);
  };
  const handleToggleFavorite = async () => {
    setFavoriteBusy(true);
    const result = await api.toggleFavorite(entity.id);
    setFavoriteBusy(false);
    if (!result || result.error) {
      alert(result?.error || "Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setIsFavorite(!!result.favorite);
  };

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
    api.loadSummary(entity.id).then((s) => {
      if (!cancelled) setRatingSummary(s);
    });
    api.loadBibax(entity.id).then((r) => {
      if (!cancelled) setBibaxRating(r);
    });
    return () => {
      cancelled = true;
    };
  }, [api, entity.id]);
  const reloadRatingSummary = () => api.loadSummary(entity.id).then(setRatingSummary);
  const handleRatingButton = () => {
    if (!ratingSummary) {
      reloadRatingSummary(); // lecture en cours ou échouée : on réessaie
      return;
    }
    if (ratingSummary.canRate) setShowRatingModal(true);
    else setRatingHint((n) => n + 1);
  };
  const saveMyRating = async (value) => {
    const ok = await api.rate(entity.id, value);
    if (ok) {
      await reloadRatingSummary();
      if (onRatingConfirmed) onRatingConfirmed({ title: "Note confirmée", name: entity.name });
    }
    return ok;
  };
  const removeMyRating = async () => {
    const ok = await api.unrate(entity.id);
    if (ok) {
      await reloadRatingSummary();
      if (onRatingConfirmed) onRatingConfirmed({ title: "Note retirée", name: entity.name, icon: "x" });
    }
    return ok;
  };

  return {
    isFollowed,
    isFavorite,
    followBusy,
    favoriteBusy,
    handleToggleFollow,
    handleToggleFavorite,
    ratingSummary,
    bibaxRating,
    showRatingModal,
    setShowRatingModal,
    ratingHint,
    setRatingHint,
    ratingButtonRef,
    handleRatingButton,
    saveMyRating,
    removeMyRating,
  };
}

// Bannière de la note, puis bouton de note, sur la couverture : mêmes emplacements que la bannière et le bouton Check de la fiche Produit (en
// bas de la couverture, le bouton tout à droite). Sans le droit de noter (aucun produit de la fiche checké), le bouton est grisé et un appui
// affiche l'explication (bulle accrochée au bouton).
function CoverRating({ summary, buttonRef, onClick, buttonLabel }) {
  return (
    <>
      {summary && summary.count > 0 && (
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
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}><RatingFraction value={summary.average} /></span>
            <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, whiteSpace: "nowrap" }}>- {summary.count} avis</span>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        onClick={onClick}
        title={buttonLabel}
        aria-label={buttonLabel}
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
          opacity: summary && summary.canRate ? 1 : 0.45,
        }}
      >
        <NavIcon name="star" size={26} color={COLORS.amber} filled />
      </button>
    </>
  );
}

// Noms affichés des codes d'une fiche (types, profils, catégories) : ceux de la plateforme de gestion (élément ajouté, élément renommé)
// l'emportent sur la liste de départ. Un code inconnu dont le nom n'est pas chargé n'est jamais montré tel quel. Entre parenthèses,
// l'explication de la liste de départ (« Bulles (champagne, crémant...) ») est omise.
const resolveTagLabels = (lists, codes, builtin, listKey) => {
  const names = lists ? customNames(lists[listKey].rows) : {};
  return (codes || [])
    .map((code) => {
      const found = builtin.find((t) => t.code === code);
      const label = names[code] || (found ? found.fr.replace(/\s*\(.*\)\s*$/, "") : "");
      return label;
    })
    .filter(Boolean);
};

// Ligne cliquable d'une fiche liée (photo ronde, petite légende, nom, certification) : sous l'origine d'une marque, et dans la carte « Infos » d'un producteur.
function InfosLinkRow({ link, first }) {
  return (
    <button
      onClick={link.onClick}
      style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginTop: first ? 0 : "10px" }}
    >
      <EntityAvatar photoUrl={link.photoUrl} photoEmoji={link.photoEmoji} size={28} />
      <span>
        <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>{link.caption}</span>
        <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          {link.name}
          <CertificationIcon level={link.certificationLevel} size={13} />
        </span>
      </span>
    </button>
  );
}

const iconCircle = { display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" };
// Le champ WhatsApp d'un producteur est un lien (« https://wa.me/… ») ; un simple numéro est aussi accepté.
const whatsappHref = (v) => (/^[+\d\s().-]+$/.test(v.trim()) ? buildWhatsAppLink(v) : normalizeUrl(v));

// Les icônes de réseaux d'une fiche Marque ou Producteur, dans l'ordre de la fiche Lieu (site, Google, WhatsApp, Facebook, Instagram, TikTok,
// Snapchat), puis LinkedIn et YouTube. On ne met que ceux que la fiche a : une marque a le site, Facebook, Instagram, TikTok, Snapchat et YouTube ;
// un producteur a en plus Google, WhatsApp et LinkedIn. Les liens sont encodés côté plateforme de gestion.
function buildSocials(entity) {
  return [
    entity.website && {
      key: "website",
      title: "Site internet",
      href: normalizeUrl(entity.website),
      icon: (
        <span style={iconCircle}>
          <img src={internetIconUrl} alt="Site internet" width="20" height="20" style={{ display: "block", objectFit: "cover", filter: "invert(1)" }} />
        </span>
      ),
    },
    entity.googleUrl && { key: "google", title: "Page Google", href: normalizeUrl(entity.googleUrl), icon: <GoogleIcon size={20} /> },
    entity.whatsappUrl && { key: "whatsapp", title: "WhatsApp", href: whatsappHref(entity.whatsappUrl), icon: <WhatsappIcon size={20} /> },
    entity.facebookUrl && { key: "facebook", title: "Facebook", href: normalizeUrl(entity.facebookUrl), icon: <FacebookIcon size={20} /> },
    entity.instagramUrl && { key: "instagram", title: "Instagram", href: normalizeUrl(entity.instagramUrl), icon: <InstagramIcon size={20} /> },
    entity.tiktokUrl && { key: "tiktok", title: "TikTok", href: normalizeUrl(entity.tiktokUrl), icon: <TiktokIcon size={20} /> },
    entity.snapchatUrl && {
      key: "snapchat",
      title: "Snapchat",
      href: normalizeUrl(entity.snapchatUrl),
      icon: (
        <span style={iconCircle}>
          <img src={snapchatIconUrl} alt="Snapchat" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
        </span>
      ),
    },
    entity.linkedinUrl && { key: "linkedin", title: "LinkedIn", href: normalizeUrl(entity.linkedinUrl), icon: <LinkedinIcon size={20} /> },
    entity.youtubeUrl && {
      key: "youtube",
      title: "YouTube",
      href: normalizeUrl(entity.youtubeUrl),
      icon: <img src={youtubeIconUrl} alt="YouTube" width="26" height="18" style={{ display: "block" }} />,
    },
  ].filter(Boolean);
}

// La rangée d'icônes de réseaux, alignée à droite (comme sur la fiche Lieu).
function SocialIconsRow({ socials }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px" }}>
      {socials.map((x) => (
        <a key={x.key} href={x.href} target="_blank" rel="noreferrer" title={x.title} style={{ lineHeight: 0 }}>
          {x.icon}
        </a>
      ))}
    </div>
  );
}

// Carte « Infos » de la fiche Producteur : copie de celle de la fiche Lieu (même cadre, mêmes pastilles de type, trait vert, ligne d'adresse avec
// pastille de lieu et drapeau qui ouvre Google Maps, téléphone et courriel à droite de l'adresse, puis la rangée des icônes de réseaux, à droite).
// Pas d'équipements (WiFi, PMR, danse) ni de Tripadvisor / Restaurant Guru : un producteur n'en a pas. Il a en plus LinkedIn et YouTube.
// Le « B- » devant le code postal n'est mis que pour la Belgique. Le lieu lié (s'il y en a un) vient sous un trait fin.
function ProducerInfosCard({ producer, tags = [], link }) {
  const isBelgium = producer.country === "Belgique";
  const addressLine1 = [producer.streetName, producer.streetNumber].filter(Boolean).join(", ");
  const addressLine2 = (
    [producer.postalCode ? `${isBelgium ? "B-" : ""}${producer.postalCode}` : "", producer.city].filter(Boolean).join(" ") + (producer.village ? ` (${producer.village})` : "")
  ).trim();
  const hasAddress = !!(addressLine1 || addressLine2);
  const hasPlace = hasAddress || !!producer.country;
  const hasPhone = !!producer.phone;
  const hasEmail = !!producer.email;
  const socials = buildSocials(producer);
  const hasContact = hasPhone || hasEmail;
  if (tags.length === 0 && !hasPlace && !hasContact && socials.length === 0 && !link) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([addressLine1, addressLine2, producer.country].filter(Boolean).join(", "))}`;
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
          producer.country
        )}
        {producer.country && <CountryFlagImg country={producer.country} size={20} style={{ verticalAlign: "-2px", marginLeft: "6px" }} />}
      </span>
    </div>
  );
  const placeStyle = { textDecoration: "none", color: COLORS.inkSoft, fontSize: "12.5px", lineHeight: 1.5 };
  const contactLinkStyle = { lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" };
  const hasTop = hasPlace || hasContact;
  const thinRule = <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, margin: "12px 0" }} />;
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
      {tags.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tags.map((label) => (
              <span key={label} style={{ padding: "4px 10px", borderRadius: "999px", border: `1.5px solid ${COLORS.paperAlt}`, color: COLORS.chalkWhite, fontSize: "11px", fontWeight: 600 }}>
                {label}
              </span>
            ))}
          </div>
          {(hasTop || socials.length > 0 || link) && <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "12px 0" }} />}
        </>
      )}
      {hasTop && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasPhone && hasEmail ? "1fr 1px 30px 1px 30px" : hasContact ? "1fr 1px 30px" : "1fr",
            gap: "8px",
            alignItems: "center",
          }}
        >
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
            <a href={`tel:${producer.phone.replace(/\s+/g, "")}`} title={producer.phone} style={contactLinkStyle}>
              <NavIcon name="phone" size={22} color={COLORS.amber} />
            </a>
          )}
          {!hasPhone && hasEmail && (
            <a href={`mailto:${producer.email}`} title={producer.email} style={contactLinkStyle}>
              <NavIcon name="mail" size={22} color={COLORS.amber} />
            </a>
          )}
          {hasPhone && hasEmail && (
            <>
              <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
              <a href={`mailto:${producer.email}`} title={producer.email} style={contactLinkStyle}>
                <NavIcon name="mail" size={22} color={COLORS.amber} />
              </a>
            </>
          )}
        </div>
      )}
      {socials.length > 0 && (
        <>
          {hasTop && thinRule}
          <SocialIconsRow socials={socials} />
        </>
      )}
      {link && (
        <>
          {(hasTop || socials.length > 0) && thinRule}
          <InfosLinkRow link={link} first />
        </>
      )}
    </div>
  );
}

// Carte « Infos » des fiches Marque et Producteur, même présentation que la fiche Produit : pastilles, ligne d'origine, puis les fiches liées
// (le producteur d'une marque, le lieu lié d'un producteur) après un trait vert. Rien ne s'affiche si la fiche n'a rien de tout cela.
// links : [{ key, onClick, photoUrl, photoEmoji, caption, name, certificationLevel }].
function EntityInfosCard({ tags = [], originCity, originRegion, originCountry, socials = [], links = [] }) {
  const hasOrigin = !!(originCity || originRegion || originCountry);
  if (tags.length === 0 && !hasOrigin && socials.length === 0 && links.length === 0) return null;
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px" }}>
        {[
          tags.length > 0 && {
            key: "tags",
            sep: null,
            node: (
              <div key="tags" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {tags.map((label) => (
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
                  {originCity && <span>{originCity}</span>}
                  {originRegion && <span>{originRegion}</span>}
                  {originCountry && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {originCountry}
                      <CountryFlagImg country={originCountry} size={14} />
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          socials.length > 0 && { key: "socials", sep: "thin", node: <SocialIconsRow key="socials" socials={socials} /> },
        ]
          .filter(Boolean)
          .map((row, i) => (
            <React.Fragment key={row.key}>
              {i > 0 && (
                <div
                  style={{
                    borderBottom: row.sep === "green" ? `2px solid ${COLORS.amber}` : `1px solid ${COLORS.paperAlt}`,
                    margin: row.sep === "green" ? "14px 0" : "12px 0",
                  }}
                />
              )}
              {row.node}
            </React.Fragment>
          ))}
      </div>

      {(tags.length > 0 || hasOrigin || socials.length > 0) && links.length > 0 && <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "14px 0" }} />}

      {links.map((link, i) => (
        <InfosLinkRow key={link.key} link={link} first={i === 0} />
      ))}
    </div>
  );
}

// Titre à barre verte des cartes « Ses produits » / « Ses marques » : comme « Lieux qui le proposent » sur la fiche Produit.
function CardTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
      <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>{children}</span>
    </div>
  );
}

// Carte « Ses produits » des fiches Marque et Producteur : titre à barre verte et lignes imbriquées. Les produits sont regroupés par sous-catégorie
// (« Bière », « Cidre », « Soda »… : SUBTYPE_LABELS), dans l'ordre du répertoire (catégorie, puis ordre des sous-catégories). Un produit sans
// sous-catégorie nommée (les Spiritueux) est rangé sous le nom de sa catégorie. Une seule sous-catégorie = pas d'intertitre.
function RelatedDrinksCard({ drinks, emptyText, onOpenDrink }) {
  const subtypeKeys = Object.keys(SUBTYPE_LABELS);
  const drinkGroups = [
    ...drinks.reduce((m, d) => {
      const label = SUBTYPE_LABELS[d.beverageSubtype] || d.type;
      return m.set(label, { drinks: [...(m.get(label)?.drinks || []), d], type: d.type, subtypeRank: SUBTYPE_LABELS[d.beverageSubtype] ? subtypeKeys.indexOf(d.beverageSubtype) : -1 });
    }, new Map()),
  ]
    .map(([label, g]) => ({ label, ...g, typeRank: DRINK_TYPES.indexOf(g.type) === -1 ? DRINK_TYPES.length : DRINK_TYPES.indexOf(g.type) }))
    .sort((a, b) => a.typeRank - b.typeRank || a.subtypeRank - b.subtypeRank);

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
      <CardTitle>Ses produits ({drinks.length})</CardTitle>
      {drinks.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "16px 0", margin: 0 }}>{emptyText}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {drinkGroups.map(({ label, drinks: groupDrinks }, gi) => (
            <React.Fragment key={label}>
              {drinkGroups.length > 1 && (
                <div style={{ fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px", marginTop: gi > 0 ? "6px" : 0 }}>
                  {label.toUpperCase()} ({groupDrinks.length})
                </div>
              )}
              {groupDrinks.map((d) => {
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
  );
}

export function BreweryDetailScreen({ brewery, breweriesDirectory = [], myBibroCode, myUserId, onBack, onOpenDrink, onOpenBrand, onOpenVenue, onRatingConfirmed, claimsEnabled = true }) {
  const [activeTab, setActiveTab] = useState("infos");
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // Nom sur plusieurs lignes : les icônes de l'en-tête et le contenu en dessous descendent d'autant (voir useWrappedTitleExtra).
  const [titleRef, titleExtra] = useWrappedTitleExtra();

  // Cloche « Suivre sur Pulse », cœur « Favoris » et note du producteur (producer_follows, producer_favorites, producer_ratings) : voir useEntityEngagement.
  const engagement = useEntityEngagement(brewery, PRODUCER_ENGAGEMENT_API, onRatingConfirmed);
  const { ratingSummary, bibaxRating } = engagement;

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

  // Les noms des types et des profils du producteur : mêmes règles que les types et les catégories d'une marque (voir resolveTagLabels).
  const [producerLists, setProducerLists] = useState(null);
  const hasProducerTags = (brewery.producerTypes || []).length > 0 || (brewery.producerProfiles || []).length > 0;
  useEffect(() => {
    if (!hasProducerTags) return undefined;
    let cancelled = false;
    loadProducerListsOnce().then((lists) => {
      if (lists && !cancelled) setProducerLists(lists);
    });
    return () => {
      cancelled = true;
    };
  }, [hasProducerTags, brewery.id]);
  const producerTags = [
    ...resolveTagLabels(producerLists, brewery.producerTypes, PRODUCER_TYPES, PRODUCER_TYPE_LIST_KEY),
    ...resolveTagLabels(producerLists, brewery.producerProfiles, PRODUCER_PROFILES, PRODUCER_PROFILE_LIST_KEY),
  ];

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
          <ZoomableAvatar photoUrl={brewery.profilePhotoUrl} photoEmoji={brewery.avatarEmoji} alt={brewery.name} size={90} />
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
          </div>
          <EntityHeaderIcons
            name={brewery.name}
            username={brewery.username}
            extraTop={titleExtra}
            followedTitle="Suivi sur Pulse — ses activités apparaissent"
            isFollowed={engagement.isFollowed}
            followBusy={engagement.followBusy}
            onToggleFollow={engagement.handleToggleFollow}
            isFavorite={engagement.isFavorite}
            favoriteBusy={engagement.favoriteBusy}
            onToggleFavorite={engagement.handleToggleFavorite}
          />
        </div>
        <CoverRating summary={ratingSummary} buttonRef={engagement.ratingButtonRef} onClick={engagement.handleRatingButton} buttonLabel="Noter ce producteur" />
      </div>

      <div style={{ marginTop: `${76 + titleExtra}px` }}>
      {/* Même barre d'onglets que les fiches Produit et Marque. Biba360 ne contient pour l'instant que la carte « Notes » ; les autres blocs viendront. */}
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
      {/* Carte « Infos » : copie de celle de la fiche Lieu (pastilles, adresse, puis le lieu lié). */}
      <ProducerInfosCard
        producer={brewery}
        tags={producerTags}
        link={
          linkedVenue
            ? {
                key: linkedVenue.id,
                onClick: () => onOpenVenue(linkedVenue.id),
                photoUrl: linkedVenue.profilePhotoUrl,
                photoEmoji: linkedVenue.avatarEmoji,
                caption: "Lieu lié",
                name: linkedVenue.name,
                certificationLevel: linkedVenue.certificationLevel,
              }
            : null
        }
      />

      {/* Carte « Ses marques » : même présentation que « Ses produits ». */}
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <CardTitle>Ses marques ({relatedBrands.length})</CardTitle>
        {relatedBrands.length === 0 ? (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "16px 0", margin: 0 }}>Aucune marque liée à ce producteur pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {relatedBrands.map((b) => (
              <button
                key={b.id}
                onClick={() => onOpenBrand(b.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
              >
                <EntityAvatar photoUrl={b.logoUrl} size={28} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "14px" }}>{b.name}</span>
                <CertificationIcon level={b.certificationLevel} size={15} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carte « Ses produits » : titre à barre verte et lignes imbriquées, comme sur la fiche Marque. */}
      <RelatedDrinksCard drinks={relatedDrinks} emptyText="Aucune boisson de cette brasserie enregistrée pour l'instant." onOpenDrink={onOpenDrink} />

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

      {/* Carte « Notes » : You (ma note), Bibax (la moyenne de mes Bibax), Bibamus (la moyenne de tous), comme sur les fiches Produit et Marque. */}
      {activeTab === "biba360" && (
        <NotesCard
          mine={ratingSummary ? ratingSummary.myRating : null}
          bibax={bibaxRating}
          everyone={ratingSummary && ratingSummary.count > 0 ? { average: ratingSummary.average, count: ratingSummary.count } : null}
        />
      )}

      {activeTab === "bibapulse" && (
        <EntityPulseSection entityType="producer" entityId={brewery.id} myUserId={myUserId} myBibroCode={myBibroCode} onOpenDrink={onOpenDrink} onOpenVenue={onOpenVenue} onOpenBrand={onOpenBrand} />
      )}

      {/* Bulle accrochée au bouton étoile grisé (elle s'efface seule) : pourquoi on ne peut pas encore noter. */}
      {engagement.ratingHint > 0 && (
        <HintBubble key={engagement.ratingHint} anchorRef={engagement.ratingButtonRef} onClose={() => engagement.setRatingHint(0)}>
          Checke un produit de ce producteur pour pouvoir le noter.
        </HintBubble>
      )}
      {engagement.showRatingModal && ratingSummary && (
        <EntityRatingModal title="Note ce producteur" entityName={brewery.name} myRating={ratingSummary.myRating} onSave={engagement.saveMyRating} onRemove={engagement.removeMyRating} onClose={() => engagement.setShowRatingModal(false)} />
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

  // Les produits de la marque, par la clé brand_id (et non plus par le nom : la plateforme de gestion n'écrit pas toujours le nom de la marque sur le produit).
  const [relatedDrinks, setRelatedDrinks] = useState([]);
  useEffect(() => {
    loadDrinksByBrandId(brand.id).then(setRelatedDrinks);
  }, [brand.id]);

  // Cloche « Suivre sur Pulse », cœur « Favoris » et note de la marque (brand_follows, brand_favorites, brand_ratings) : voir useEntityEngagement.
  const engagement = useEntityEngagement(brand, BRAND_ENGAGEMENT_API, onRatingConfirmed);
  const { ratingSummary, bibaxRating } = engagement;

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
  const tagLabels = (codes, builtin, listKey) => resolveTagLabels(brandLists, codes, builtin, listKey);
  const brandTags = [...tagLabels(brand.brandTypes, BRAND_TYPES, BRAND_TYPE_LIST_KEY), ...tagLabels(brand.classifications, BRAND_CLASSIFICATIONS, BRAND_CLASSIFICATION_LIST_KEY)];

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
          <ZoomableAvatar photoUrl={brand.logoUrl} alt={brand.name} size={90} />
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
          <EntityHeaderIcons
            name={brand.name}
            username={brand.username}
            extraTop={titleExtra}
            isFollowed={engagement.isFollowed}
            followBusy={engagement.followBusy}
            onToggleFollow={engagement.handleToggleFollow}
            isFavorite={engagement.isFavorite}
            favoriteBusy={engagement.favoriteBusy}
            onToggleFavorite={engagement.handleToggleFavorite}
          />
        </div>
        <CoverRating summary={ratingSummary} buttonRef={engagement.ratingButtonRef} onClick={engagement.handleRatingButton} buttonLabel="Noter cette marque" />
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
      <EntityInfosCard
        tags={brandTags}
        originCity={brand.originCity}
        originRegion={brand.originRegion}
        originCountry={brand.originCountry}
        socials={buildSocials(brand)}
        links={producers.map((producer) => ({
          key: producer.id,
          onClick: () => onOpenBrewery(producer.id),
          photoUrl: producer.profilePhotoUrl,
          photoEmoji: producer.avatarEmoji,
          caption: "Producteur",
          name: producer.name,
          certificationLevel: producer.certificationLevel,
        }))}
      />

      {/* Carte « Ses produits » : titre à barre verte et lignes imbriquées, comme « Lieux qui le proposent » sur la fiche Produit. */}
      <RelatedDrinksCard drinks={relatedDrinks} emptyText="Aucune boisson de cette marque enregistrée pour l'instant." onOpenDrink={onOpenDrink} />

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
      {engagement.ratingHint > 0 && (
        <HintBubble key={engagement.ratingHint} anchorRef={engagement.ratingButtonRef} onClose={() => engagement.setRatingHint(0)}>
          Checke un produit de cette marque pour pouvoir la noter.
        </HintBubble>
      )}
      {engagement.showRatingModal && ratingSummary && (
        <EntityRatingModal title="Note cette marque" entityName={brand.name} myRating={ratingSummary.myRating} onSave={engagement.saveMyRating} onRemove={engagement.removeMyRating} onClose={() => engagement.setShowRatingModal(false)} />
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
