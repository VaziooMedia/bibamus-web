// ============================================================
// Fiche détaillée d'un établissement — copiée telle quelle
// depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { COLORS, SUBTYPE_LABELS, NATIONALITY_ELIGIBLE_TYPES } from "../constants.js";
import { NavIcon, GoogleIcon, FacebookIcon, InstagramIcon, TiktokIcon, WhatsappIcon, CertificationIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar, BlockTitle } from "./ui.jsx";
import { ZoomableAvatar } from "./PhotoLightbox.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { shareEntity, canShareEntity } from "../shareEntity.js";
import { usernameLinkUrl } from "../usernameLinks.js";
import { useWrappedTitleExtra } from "../hooks/useWrappedTitleExtra.js";
import { formatAddress, venueStreetLine, venuePostalCityLine, mapsUrlFor, normalizeUrl, buildWhatsAppLink, displayedAbv } from "../utils.js";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import { VenueRatingDisplay } from "./VenueRatingDisplay.jsx";
import { VenueNotesSection } from "./VenueNotesSection.jsx";
import { loadVenueTopDrinks, loadDrinksByIds, loadMyStatsForVenue, toggleFollowVenue, loadVenueFollowStatus, loadBreweryLinkedToVenue } from "../data/sharedDirectories.js";
import { VenueCheckInConfirmModal } from "./VenueCheckInConfirmModal.jsx";
import { loadMyVenueRating, loadVenueListsOnce } from "../data/sharedDirectories.js";
import { VENUE_TYPE_LIST_KEY, registerVenueTypeNames, venueTypeDisplayName } from "../venueLists.js";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";
import carteIconUrl from "../assets/brand/carte.svg";
import snapchatIconUrl from "../assets/brand/snapchat.svg";
import tripadvisorIconUrl from "../assets/brand/tripadvisor.svg";
import restaurantGuruIconUrl from "../assets/brand/restaurant-guru.svg";
import wifiIconUrl from "../assets/brand/wifi-free.svg";
import pmrIconUrl from "../assets/brand/acces-pmr.svg";
import danceIconUrl from "../assets/brand/danser.svg";
import internetIconUrl from "../assets/brand/internet.svg";
import { notify } from "./MessageToast.jsx";

// Liste « Produits les plus populaires ici » (onglet Biba360 d'un lieu). Chaque ligne est un bouton qui ouvre le produit (le retour ramène sur cet onglet : voir `returnTab`).
// Mise en page décidée par Mehdi (2026-11-24, « style A ») : liste aérée, un trait fin entre les lignes ; à gauche le rond du produit (40 px : photo, sinon emoji, sinon la
// bouteille ; sans anneau, pour aucun produit — retiré le 2026-11-25) ; au milieu le nom puis un sous-texte (sous-catégorie, drapeau du pays — seulement pour les catégories où le pays est
// affiché ailleurs dans l'app — et degré d'alcool « 6.2% ABV », même écriture et même règle que PulseProductCard et les listes du BibAtlas, séparés par un petit point vert fluo ;
// une donnée absente n'est pas affichée) ; un trait vertical fin, puis le nombre en vert fluo et un chevron « › ». Le sous-texte remplace l'ancienne ligne « producteur ».
function TopDrinksList({ rows, info, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((r, i) => {
        const d = info[r.drinkId];
        const subtypeLabel = d ? SUBTYPE_LABELS[d.beverageSubtype] || d.type || "" : "";
        const showFlag = !!d && NATIONALITY_ELIGIBLE_TYPES.includes(d.type) && !!d.nationality;
        const abvValue = d ? displayedAbv(d) : null;
        const abvText = abvValue != null ? `${abvValue.toFixed(1)}% ABV` : null;
        const subParts = [];
        if (subtypeLabel) subParts.push(<span key="sub" style={{ overflowWrap: "anywhere" }}>{subtypeLabel}</span>);
        if (showFlag)
          subParts.push(
            <span key="flag" title={d.nationality} style={{ display: "inline-flex", flexShrink: 0 }}>
              <CountryFlagImg country={d.nationality} size={16} />
            </span>
          );
        if (abvText) subParts.push(<span key="abv" style={{ whiteSpace: "nowrap" }}>{abvText}</span>);
        return (
          <button
            key={r.drinkId}
            type="button"
            onClick={onOpen ? () => onOpen(r.drinkId) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              boxSizing: "border-box",
              font: "inherit",
              color: COLORS.ink,
              cursor: onOpen ? "pointer" : "default",
              background: "none",
              border: "none",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.paperAlt}`,
              padding: "10px 0",
            }}
          >
            <span style={{ display: "flex", flexShrink: 0 }}>
              <EntityAvatar photoUrl={d?.photoUrl} photoEmoji={d?.avatarEmoji} size={40} fallbackIcon="bottle" />
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere", lineHeight: 1.25 }}>{d?.name || "…"}</span>
              {subParts.length > 0 && (
                // Le petit point vert fluo est collé au DÉBUT de chaque morceau et le bloc est décalé d'autant vers la gauche : le point du premier morceau de chaque ligne
                // sort du cadre (coupé) — quand le sous-texte passe sur deux lignes (écran étroit), aucun point ne reste seul en bout ou en début de ligne.
                <span style={{ display: "block", overflowX: "clip", marginTop: "3px" }}>
                  <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: "2px", marginLeft: "-13px", fontSize: "11.5px", color: COLORS.inkSoft }}>
                    {subParts.map((part) => (
                      <span key={part.key} style={{ position: "relative", display: "inline-flex", alignItems: "center", paddingLeft: "13px" }}>
                        <span aria-hidden="true" style={{ position: "absolute", left: "4px", top: "50%", marginTop: "-2px", width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber }} />
                        {part}
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </span>
            {/* Séparation verticale entre le produit et le nombre (même trait fin que dans « Tes check-ins ici | Tes boissons bues ici »). */}
            <span aria-hidden="true" style={{ alignSelf: "stretch", width: "1px", background: COLORS.paperAlt, flexShrink: 0 }} />
            <span style={{ flexShrink: 0, minWidth: "30px", textAlign: "center", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", color: COLORS.amber }}>{r.quantity}</span>
            <span aria-hidden="true" style={{ flexShrink: 0, color: COLORS.inkSoft, fontSize: "18px", lineHeight: 1, marginLeft: "-2px" }}>›</span>
          </button>
        );
      })}
    </div>
  );
}

export function VenueDetailScreen({ venue, myBibroCode, myUserId, onToggleLike, onCheckIn, autoOpenCheck = false, onCheckFlowFinished, onCheckConfirmed, onBack, onDelete, onManageMenu, onToggleFavorite, onCleanupDuplicates, onOpenCheckInsHistory, onOpenDrinksHistory, onOpenBrewery, onOpenDrink, pulseReturnEntryId = null, onRememberPulseEntry, returnTab = null, onRememberTab, claimsEnabled = true }) {
  const [claiming, setClaiming] = useState(false);
  // Retour d'une fiche ouverte depuis une carte de l'onglet BibaPulse : on rouvre cet onglet (voir EntityPulseSection).
  // Retour d'un produit ouvert depuis « Produits les plus populaires ici » (onglet Biba360) : on rouvre cet onglet et on recentre le bloc (`returnTab`, gardé par App).
  const [activeTab, setActiveTab] = useState(pulseReturnEntryId ? "bibapulse" : returnTab || "infos");
  const restoredFromProduct = useRef(!!returnTab && !pulseReturnEntryId);
  const topBlockRef = useRef(null);
  useEffect(() => {
    // La mémoire d'App est vidée dès que l'écran a lu son onglet : une visite ultérieure du lieu repart sur Infos.
    if (returnTab && onRememberTab) onRememberTab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const [linkedProducer, setLinkedProducer] = useState(null);
  useEffect(() => {
    loadBreweryLinkedToVenue(venue.id).then(setLinkedProducer);
  }, [venue.id]);
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // Nom sur plusieurs lignes : les icônes de l'en-tête et le contenu en dessous descendent d'autant (voir useWrappedTitleExtra).
  const [titleRef, titleExtra] = useWrappedTitleExtra();
  // Cloche de notification — ses activités (check-ins de tes Bibax, plus tard ses événements et
  // nouveaux produits) apparaissent dans ton fil Pulse.
  const [isFollowed, setIsFollowed] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);
  useEffect(() => {
    if (!venue?.id) return;
    loadVenueFollowStatus(venue.id).then(setIsFollowed);
  }, [venue?.id]);
  const handleToggleFollow = async () => {
    setTogglingFollow(true);
    const result = await toggleFollowVenue(venue.id);
    setTogglingFollow(false);
    if (result?.error) {
      notify(result.error);
      return;
    }
    setIsFollowed(result.following);
  };
  // Mes propres visites/boissons dans ce lieu — plus le champ partagé stats de la ligne du lieu.
  const [stats, setStats] = useState({ visits: 0, drinksOrdered: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  useEffect(() => {
    setStatsLoaded(false);
    loadMyStatsForVenue(venue.id).then((s) => {
      setStats(s);
      setStatsLoaded(true);
    });
  }, [venue.id]);
  // Produits les plus populaires ici, tous utilisateurs confondus — jamais d'argent, juste des
  // quantités (voir bibamus-schema-public-stats.sql).
  const [topDrinks, setTopDrinks] = useState([]);
  // Nom, photo, emoji, catégorie, sous-catégorie, pays et degré de chaque produit de la liste (rond de la ligne et sous-texte).
  const [topDrinkInfo, setTopDrinkInfo] = useState({});
  useEffect(() => {
    loadVenueTopDrinks(venue.id, null, null, 5).then((results) => {
      setTopDrinks(results);
      if (results.length > 0) {
        loadDrinksByIds(results.map((r) => r.drinkId)).then((drinks) => setTopDrinkInfo(Object.fromEntries(drinks.map((d) => [d.id, { name: d.name, photoUrl: d.photoUrl, avatarEmoji: d.avatarEmoji, type: d.type, beverageSubtype: d.beverageSubtype, nationality: d.nationality, abv: d.abv }]))));
      }
    });
  }, [venue.id]);
  // Au retour d'un produit : le bloc des produits populaires est recentré à l'écran, une seule fois, quand sa liste est arrivée.
  useEffect(() => {
    if (!restoredFromProduct.current || topDrinks.length === 0 || !topBlockRef.current) return;
    restoredFromProduct.current = false;
    topBlockRef.current.scrollIntoView({ block: "center" });
  }, [topDrinks]);
  const address = formatAddress(venue);
  const addressLine1 = venueStreetLine(venue);
  const addressLine2 = venuePostalCityLine(venue);
  const likes = venue.likes || [];
  const hasPhone = !!venue.phone;
  const hasEmail = !!venue.email;
  // Les noms des types d'établissement : ceux de la plateforme de gestion (type ajouté, type renommé) l'emportent sur la
  // liste de départ. Lus une fois par session ; l'écran ne se redessine que si un nom change.
  const [, setTypeNamesTick] = useState(0);
  const hasTypes = (venue.venueTypes || []).length > 0;
  useEffect(() => {
    if (!hasTypes) return undefined;
    let cancelled = false;
    loadVenueListsOnce().then((lists) => {
      if (lists && registerVenueTypeNames(lists[VENUE_TYPE_LIST_KEY].rows) && !cancelled) setTypeNamesTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [hasTypes, venue.id]);
  // Un type ajouté à la main dont le nom n'est pas encore chargé n'est pas montré (jamais son code technique).
  const typeChips = (venue.venueTypes || []).map((code) => ({ code, label: venueTypeDisplayName(code) })).filter((t) => t.label);
  const hasAmenities = !!(venue.hasWifi || venue.wheelchairAccessible || venue.canDance);
  const [activeAmenityTip, setActiveAmenityTip] = useState(null);
  const hoursBlockRef = useRef(null);
  const [hoursBlockHeight, setHoursBlockHeight] = useState(null);
  useLayoutEffect(() => {
    if (!hoursBlockRef.current) return undefined;
    // Le bloc disparaît quand on change d'onglet : la mesure tardive de l'observateur ne doit alors rien lire.
    const measure = () => {
      if (hoursBlockRef.current) setHoursBlockHeight(hoursBlockRef.current.offsetHeight);
    };
    measure();
    // Les horaires sont chargées de façon asynchrone (fetch Google) : le bloc affiche
    // d'abord "Chargement des horaires..." (pas de bordure/fond, hauteur différente) avant
    // le vrai contenu. On observe les changements de taille réels le temps que ce chargement
    // se termine, puis on se déconnecte pour ne plus bouger — notamment quand l'utilisateur
    // déroule manuellement les horaires plus tard, ce qui ne doit pas agrandir le bouton "Carte".
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(hoursBlockRef.current);
    const timeout = setTimeout(() => observer.disconnect(), 4000);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);
  const hasSocials = !!(
    venue.website ||
    venue.googleUrl ||
    venue.facebookUrl ||
    venue.instagramUrl ||
    venue.tiktokUrl ||
    venue.whatsapp ||
    venue.snapchatUrl ||
    venue.tripadvisorUrl ||
    venue.restaurantGuruUrl
  );
  const iLike = likes.includes(myBibroCode);
  const [showCheckInConfirm, setShowCheckInConfirm] = useState(false);
  const [checkInMyRating, setCheckInMyRating] = useState(null);

  // La fenêtre « PlaceCheck » s'ouvre à chaque check-in ; le check n'est enregistré qu'à sa confirmation.
  // L'avis sur le lieu se donne dans cette même fenêtre (liste déroulante) : elle reçoit l'avis déjà donné,
  // s'il y en a un.
  const handleCheckIn = async () => {
    setCheckInMyRating(await loadMyVenueRating(venue.id));
    setShowCheckInConfirm(true);
  };

  // Parcours « PlaceCheck depuis l'accueil » : la fenêtre de check s'ouvre dès l'arrivée sur la fiche, et une
  // fois le check confirmé on repart vers le Pulse ou l'accueil — voir App.jsx.
  const [inHomeCheckFlow, setInHomeCheckFlow] = useState(autoOpenCheck);
  useEffect(() => {
    if (autoOpenCheck) handleCheckIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finishHomeFlow = (info) => {
    setInHomeCheckFlow(false);
    onCheckFlowFinished && onCheckFlowFinished(info);
  };

  const handleCheckInConfirmed = async (result) => {
    setShowCheckInConfirm(false);
    if (!result) {
      // Fenêtre fermée sans confirmer : rien n'est enregistré, on reste sur la fiche.
      if (inHomeCheckFlow) finishHomeFlow(null);
      return;
    }
    setJustCheckedIn(true);
    // Si l'enregistrement de l'avis échoue, App prévient déjà la personne (le check, lui, est bien enregistré) : on n'annonce alors pas d'avis.
    let ratingFailed = false;
    const pulseResult = await onCheckIn({ publishToPulse: result.publishToPulse, visibility: result.visibility, content: result.content, drink: result.drink, ratingChange: result.ratingChange, venueRating: result.venueRating, discovery: result.discovery, onRatingFailed: () => { ratingFailed = true; } });
    if (pulseResult && pulseResult.error) notify("Ton check-in est enregistré, mais sa publication dans BibaPulse a échoué : " + pulseResult.error);
    // La confirmation rose (dessinée par App) annonce le check, et l'avis s'il a été donné, modifié ou retiré.
    const detail = result.ratingChange && !ratingFailed ? (result.ratingChange.value == null ? "Avis retiré" : "Avis confirmé") : null;
    if (inHomeCheckFlow) finishHomeFlow({ name: venue.name, published: !!result.publishToPulse && !(pulseResult && pulseResult.error), detail });
    else if (onCheckConfirmed) onCheckConfirmed({ name: venue.name, detail });
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: venue.coverPhotoUrl ? `url(${venue.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <ZoomableAvatar photoUrl={venue.profilePhotoUrl} photoEmoji={venue.avatarEmoji} alt={venue.name} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          {/* L'icône de certification est toujours dans le coin en haut à droite du bloc du nom, à hauteur de la 1re ligne (même pour un nom court),
              et ne suit pas le texte quand le nom passe sur plusieurs lignes. Le nom lui laisse sa place à droite (23 px). 3,4 px = de quoi la
              centrer sur une ligne de 23,75 px. */}
          <div ref={titleRef}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, paddingRight: "23px", lineHeight: 1.25, color: COLORS.chalkWhite }}>{venue.name}</h1>
          </div>
          <span style={{ position: "absolute", top: "3.4px", right: 0, display: "flex" }}>
            <CertificationIcon level={venue.certificationLevel} size={17} />
          </span>
          {venue.subtitle && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0" }}>{venue.subtitle}</p>}
          <div style={{ position: "absolute", top: `${32 + titleExtra}px`, right: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            {canShareEntity() && (
              <>
                <button
                  onClick={() => shareEntity({ title: venue.name, text: `Découvre ${venue.name} sur Bibamus !`, url: usernameLinkUrl(venue.username) })}
                  title="Partager"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <NavIcon name="share" size={24} color={COLORS.amber} />
                </button>
                <span style={{ width: "1px", height: "18px", background: COLORS.chalkWhite, opacity: 0.4 }} />
              </>
            )}
            <button
              onClick={handleToggleFollow}
              disabled={togglingFollow}
              title={isFollowed ? "Suivi sur Pulse : ses activités apparaissent" : "Suivre sur Pulse"}
              style={{ background: "none", border: "none", cursor: togglingFollow ? "default" : "pointer", padding: 0, display: "flex" }}
            >
              <NavIcon name="bell" size={24} color={COLORS.amber} filled={isFollowed} />
            </button>
            <span style={{ width: "1px", height: "18px", background: COLORS.chalkWhite, opacity: 0.4 }} />
            <button
              onClick={onToggleFavorite}
              title={venue.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
            >
              <NavIcon name="heart" size={24} color={COLORS.amber} filled={!!venue.isFavorite} />
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "8px", right: "68px", left: "108px" }}>
          <VenueRatingDisplay venueId={venue.id} />
        </div>
        <button
          onClick={handleCheckIn}
          title={justCheckedIn ? "Tes Bibax peuvent te voir ici" : "Je suis ici !"}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={placeCheckIconUrl}
            alt="Check-in"
            style={{ width: "52px", height: "52px", opacity: justCheckedIn ? 0.55 : 1 }}
          />
        </button>
      </div>

      <div style={{ marginTop: `${76 + titleExtra}px` }}>
        {venue.pendingContributionsCount > 0 && (
          <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "#F2C94C" }}>
            📝 Une modification de la fiche est proposée, en attente de validation.
          </div>
        )}
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
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
        {typeChips.length > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {typeChips.map(({ code, label }) => (
                <span
                  key={code}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    border: `1.5px solid ${COLORS.paperAlt}`,
                    color: COLORS.chalkWhite,
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "12px 0" }} />
          </>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasPhone && hasEmail ? "1fr 1px 30px 1px 30px" : hasPhone || hasEmail ? "1fr 1px 30px" : "1fr",
            gap: "8px",
            marginBottom: "12px",
            alignItems: "center",
          }}
        >
          <a href={mapsUrlFor(venue)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: COLORS.inkSoft, fontSize: "12.5px", lineHeight: 1.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <NavIcon name="map-pin" size={18} color={COLORS.amber} />
              <span>
                {addressLine1}
                {addressLine1 && <br />}
                {addressLine2}
                {venue.country && (
                  <CountryFlagImg country={venue.country} size={20} style={{ verticalAlign: "-2px", marginLeft: "6px" }} />
                )}
              </span>
            </div>
          </a>
          {(hasPhone || hasEmail) && <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />}
          {hasPhone && (
            <a href={`tel:${venue.phone.replace(/\s+/g, "")}`} title={venue.phone} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="phone" size={22} color={COLORS.amber} />
            </a>
          )}
          {!hasPhone && hasEmail && (
            <a href={`mailto:${venue.email}`} title={venue.email} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="mail" size={22} color={COLORS.amber} />
            </a>
          )}
          {hasPhone && hasEmail && (
            <>
              <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
              <a href={`mailto:${venue.email}`} title={venue.email} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <NavIcon name="mail" size={22} color={COLORS.amber} />
              </a>
            </>
          )}
        </div>
        {(hasAmenities || hasSocials) && <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, margin: "12px 0" }} />}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {venue.hasWifi && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "wifi" ? null : "wifi")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={wifiIconUrl} alt="WiFi" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "wifi" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    WiFi gratuit
                  </div>
                )}
              </span>
            )}
            {venue.wheelchairAccessible && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "pmr" ? null : "pmr")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={pmrIconUrl} alt="Accès PMR" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "pmr" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    Accès PMR
                  </div>
                )}
              </span>
            )}
            {venue.canDance && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "dance" ? null : "dance")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={danceIconUrl} alt="Danse" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "dance" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    Musique dansante en soirée
                  </div>
                )}
              </span>
            )}
          </div>
          {hasAmenities && hasSocials && <div style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px", marginLeft: "auto" }}>
          {venue.website && (
            <a href={normalizeUrl(venue.website)} target="_blank" rel="noreferrer" title="Site internet" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={internetIconUrl} alt="Site internet" width="20" height="20" style={{ display: "block", objectFit: "cover", filter: "invert(1)" }} />
              </span>
            </a>
          )}
          {venue.googleUrl && (
            <a href={normalizeUrl(venue.googleUrl)} target="_blank" rel="noreferrer" title="Page Google" style={{ lineHeight: 0 }}>
              <GoogleIcon size={20} />
            </a>
          )}
          {venue.whatsapp && (
            <a href={buildWhatsAppLink(venue.whatsapp)} target="_blank" rel="noreferrer" title="WhatsApp" style={{ lineHeight: 0 }}>
              <WhatsappIcon size={20} />
            </a>
          )}
          {venue.facebookUrl && (
            <a href={normalizeUrl(venue.facebookUrl)} target="_blank" rel="noreferrer" title="Facebook" style={{ lineHeight: 0 }}>
              <FacebookIcon size={20} />
            </a>
          )}
          {venue.instagramUrl && (
            <a href={normalizeUrl(venue.instagramUrl)} target="_blank" rel="noreferrer" title="Instagram" style={{ lineHeight: 0 }}>
              <InstagramIcon size={20} />
            </a>
          )}
          {venue.tiktokUrl && (
            <a href={normalizeUrl(venue.tiktokUrl)} target="_blank" rel="noreferrer" title="TikTok" style={{ lineHeight: 0 }}>
              <TiktokIcon size={20} />
            </a>
          )}
          {venue.snapchatUrl && (
            <a href={normalizeUrl(venue.snapchatUrl)} target="_blank" rel="noreferrer" title="Snapchat" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={snapchatIconUrl} alt="Snapchat" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          {venue.tripadvisorUrl && (
            <a href={normalizeUrl(venue.tripadvisorUrl)} target="_blank" rel="noreferrer" title="Tripadvisor" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={tripadvisorIconUrl} alt="Tripadvisor" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          {venue.restaurantGuruUrl && (
            <a href={normalizeUrl(venue.restaurantGuruUrl)} target="_blank" rel="noreferrer" title="Restaurant Guru" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={restaurantGuruIconUrl} alt="Restaurant Guru" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          </div>
        </div>
        {linkedProducer && (
          <>
            <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "12px 0" }} />
            <button
              onClick={() => onOpenBrewery(linkedProducer.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }}
            >
              <EntityAvatar photoUrl={linkedProducer.profilePhotoUrl} photoEmoji={linkedProducer.avatarEmoji} size={28} />
              <span>
                <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>EXPLOITÉ PAR</span>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{linkedProducer.name}</span>
              </span>
            </button>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ flex: 2 }} ref={hoursBlockRef}>
          <OpeningHoursDisplay googlePlaceId={venue.googlePlaceId} noGooglePresence={venue.noGooglePresence} noFixedHours={venue.noFixedHours} />
        </div>
        <button
          onClick={onManageMenu}
          style={{
            flex: 1,
            height: hoursBlockHeight ? `${hoursBlockHeight}px` : undefined,
            borderRadius: "12px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <img src={carteIconUrl} alt="" style={{ width: "20px", height: "20px" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.ink }}>Carte</span>
        </button>
      </div>


      {/* Plus de blocs « Prochains évènements » ni « Médias » (Mehdi, 2026-11-21) : ils n'étaient que des cases « Bientôt disponible ». Quand ils reviendront, ils ne s'afficheront que s'il y a au moins un évènement / un média. */}
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
          Revendiquer la gérance de ce lieu
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

      {/* Onglet Biba360 d'une fiche Lieu (Mehdi, 2026-11-21) : d'abord la carte « Notes » (You / Bibax / Bibamus), puis les deux blocs qui étaient dans Infos : « Produits les plus populaires ici »
          et « Tes check-ins ici / Tes boissons bues ici ». Les autres blocs viendront, un à la fois. */}
      {activeTab === "biba360" && (
        <>
          <VenueNotesSection venueId={venue.id} />
      {topDrinks.length > 0 && (
        <div ref={topBlockRef} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          {/* Même titre que les autres blocs de Biba360 (« Notes ») : blanc, en gras, barre verte et trait fin dessous (Mehdi, 2026-11-21). */}
          <BlockTitle>Produits les plus populaires ici</BlockTitle>
          <TopDrinksList
            rows={topDrinks}
            info={topDrinkInfo}
            onOpen={onOpenDrink ? (id) => { if (onRememberTab) onRememberTab("biba360"); onOpenDrink(id); } : null}
          />
        </div>
      )}

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px", display: "flex", alignItems: "stretch" }}>
        <button
          onClick={onOpenCheckInsHistory}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}
        >
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes check-ins ici</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>{stats.visits || 0}</span>
            <span style={{ color: COLORS.inkSoft, fontSize: "13px" }}>→</span>
          </span>
        </button>
        <div style={{ width: "1px", background: COLORS.paperAlt, margin: "0 14px" }} />
        <button
          onClick={onOpenDrinksHistory}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}
        >
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes boissons bues ici</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>{stats.drinksOrdered || 0}</span>
            <span style={{ color: COLORS.inkSoft, fontSize: "13px" }}>→</span>
          </span>
        </button>
      </div>

        </>
      )}

      {activeTab === "bibapulse" && (
        <EntityPulseSection
          entityType="venue"
          entityId={venue.id}
          myUserId={myUserId}
          myBibroCode={myBibroCode}
          onOpenDrink={onOpenDrink}
          onOpenProducer={onOpenBrewery}
          selfEntity={{ type: "venue", object: { id: venue.id, name: venue.name } }}
          returnEntryId={pulseReturnEntryId}
          onRememberEntry={onRememberPulseEntry}
        />
      )}

      {claimsEnabled && claiming && <ClaimModal entityType="venue" entityId={venue.id} entityName={venue.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}
      {showCheckInConfirm && (
        <VenueCheckInConfirmModal venueName={venue.name} venuePhotoUrl={venue.profilePhotoUrl} venueEmoji={venue.avatarEmoji} myRating={checkInMyRating} canDiscover={statsLoaded && stats.visits === 0 && !justCheckedIn} onClose={handleCheckInConfirmed} />
      )}

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
          entityType="venue"
          entityId={venue.id}
          myBibroCode={myBibroCode}
          initialReason={reportInitialReason}
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
