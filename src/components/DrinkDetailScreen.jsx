// ============================================================
// Fiche détaillée d'un produit — restructurée sur le même
// visuel que la fiche lieu (VenueDetailScreen.jsx) : bandeau
// photo, avatar superposé, titre + certification, favori,
// bouton d'action principal en bas à droite de la photo.
//
// La notation (étoiles) ne se donne/modifie plus ici — comme
// pour un lieu, elle vit désormais entièrement dans le popup de
// check (DrinkCheckInModal) ; cette fiche n'affiche plus que la
// moyenne, sur le bandeau photo.
// ============================================================
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { COLORS, BEER_TYPES, DRINK_FIELD_LABELS } from "../constants.js";
import { NavIcon, CertificationIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar, BlockTitle, GoButton } from "./ui.jsx";
import { getDrinkFeatureItems, renderDrinkBadgeItem } from "./DrinkDisplay.jsx";
import { BibaxCheckRows } from "./DrinkBibaxChecksScreen.jsx";
import { shareEntity, canShareEntity } from "../shareEntity.js";
import { DrinkCheckInModal } from "./DrinkCheckInModal.jsx";
import { formatDrinkFieldValue, formatMoney, formatWeekdayDDMMYYYY, isAtpDrink } from "../utils.js";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import { EvolutionCard } from "./EvolutionCard.jsx";
import { NotesCard, formatRating } from "./NotesCard.jsx";
import { styleTagLabel, hasStyleLabel, registerCustomStyleLabels } from "../data/styleTagLabels.js";
import { loadCustomBeerCiderStylesOnce, loadMyDrinkCheckinCount, loadDrinkTotalChecks, loadDrinkUniqueCheckers, loadMyDrinkHistory, loadVenuesByIds, loadMyBibaxDrinkChecks, loadDrinkTopVenues, loadMyBibaxDrinkVenues, loadMyBibaxDrinkRating, loadDrinkEvolution, loadDrinkRevenueStats, loadBrandById, loadBreweriesByIds, toggleFollowDrink, loadDrinkFollowStatus, loadNearestVenuesServingDrink } from "../data/sharedDirectories.js";
import { loadBibroCodes } from "../data/profiles.js";
import beerCheckIconUrl from "../assets/brand/beer-check-profil.png";
import atpIconUrl from "../assets/brand/atp.svg";

// Seuls Bières & Cidres et Vins ont déjà de vraies sous-catégories définies côté plateforme
// de gestion — les autres n'en ont pas encore ; on laisse alors vide.
const SUBTYPE_LABELS = {
  biere: "Bière",
  cidre: "Cidre",
  poire: "Poiré",
  vin: "Vin",
  vin_effervescent: "Vin effervescent",
};

// Rangée de tuiles chiffrées de l'onglet Biba360 (« Checks », « Unique Checkers »…). Une valeur absente
// (lecture en cours ou échouée) s'affiche en tiret.
function StatTiles({ tiles }) {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ flex: 1, minWidth: 0, background: COLORS.paper, border: `1.5px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 6px", textAlign: "center" }}>
          <span style={{ fontSize: "11.5px", color: COLORS.inkSoft }}>{t.label}</span>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: String(t.value ?? "—").length > 5 ? "17px" : "22px", color: COLORS.amber, marginTop: "4px" }}>{t.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

// Barre verte fluo entre deux sections du bloc « Checks » (Checks, Unique Checkers, Check Trends) : 1 px, avec 16 px
// d'air au-dessus et au-dessous — le trait vert de « Où tu l'as bu » de l'historique.
function SectionDivider() {
  return <hr data-sep="" style={{ height: 0, border: "none", borderTop: `1px solid ${COLORS.amber}`, margin: "16px 0" }} />;
}

// Valeur en vert d'une ligne de l'onglet Biba360, suivie d'un « x » en blanc (« 12 x ») : le nombre reste vert fluo, le
// « x » (fois) est blanc.
function TimesValue({ count }) {
  return (
    <>
      {count}
      <span style={{ color: COLORS.ink }}> x</span>
    </>
  );
}

// Ligne de la carte « Ton historique avec ce produit » : libellé à gauche, valeur en vert à droite. La première ligne d'un
// groupe n'a pas de trait au-dessus. `normal` : valeur en police normale (Work Sans 400, 16 px — l'Urbanist de l'app n'existe qu'à partir de 600, donc jamais « normal »), pour les dates. `go` : bouton rond
// vers la fiche du lieu, posé juste à côté du nom ; la valeur reste seule à droite, alignée d'une ligne à l'autre.
function HistoryRow({ label, value, first = false, normal = false, go = null, anchor }) {
  return (
    <div data-anchor={anchor} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", ...(first ? {} : { borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px", marginTop: "10px" }) }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ minWidth: 0, fontSize: "14px", color: COLORS.ink, overflowWrap: "anywhere" }}>{label}</span>
        {go ? <GoButton label={go.label} onClick={go.onClick} /> : null}
      </div>
      <span style={{ ...(normal ? { fontFamily: "'Work Sans', sans-serif", fontWeight: 400, fontSize: "16px" } : { fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }), color: COLORS.amber, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

// « Tes Bibax qui ont checké ce produit » : on n'affiche que les 5 premiers (ceux qui ont le plus checké le produit) ; au-delà,
// le bouton « Voir tout » ouvre la liste complète sur sa propre page.
const BIBAX_PREVIEW_COUNT = 5;

// Premier parent qui défile (le conteneur de l'écran) — là où se lit la hauteur d'un élément pour y revenir.
function findScrollParent(el) {
  for (let n = el ? el.parentElement : null; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if (oy === "auto" || oy === "scroll") return n;
  }
  return document.scrollingElement || null;
}
function findAnchor(key) {
  return [...document.querySelectorAll("[data-anchor]")].find((n) => n.dataset.anchor === key) || null;
}

export function DrinkDetailScreen({
  drink,
  isAdmin,
  myBibroCode,
  myUserId,
  isOnWishlist,
  onToggleWishlist,
  onRate,
  onUnrate,
  onCheckDrink,
  autoOpenCheck = false,
  onCheckFlowFinished,
  onBack,
  onEdit,
  onCertify,
  onDecertify,
  onDelete,
  pendingContributions = [],
  onApproveContribution,
  onRejectContribution,
  onOpenBrand,
  onOpenBrewery,
  onOpenVenue,
  onOpenBibax,
  onOpenBibaxList,
  returnMemo = null,
  onReturnMemoConsumed,
  onOpenTagFilter,
  claimsEnabled = true,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState(returnMemo?.tab || "infos");
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // Parcours « DrinkCheck depuis l'accueil » : la fenêtre de check est déjà ouverte à l'arrivée sur la fiche.
  const [showCheckModal, setShowCheckModal] = useState(autoOpenCheck);
  const [inHomeCheckFlow, setInHomeCheckFlow] = useState(autoOpenCheck);
  const [justChecked, setJustChecked] = useState(false);
  const [myCheckCount, setMyCheckCount] = useState(null);
  const isBeer = BEER_TYPES.includes(drink.type);
  // Ligne « caractéristiques » de la fiche : palier d'alcool, Bio, Sans gluten (vide si le produit n'en a aucune).
  const featureItems = getDrinkFeatureItems(drink, { size: 13 });
  // Label ATP (bières trappistes) : une ligne à part, sous les caractéristiques, avec une grande icône.
  const isAtp = isAtpDrink(drink);
  const hasFeatureRows = featureItems.length > 0 || isAtp;

  // Styles modifiés depuis la gestion : l'app ne les connaît pas à la compilation — un style ajouté à la main
  // (inconnu de la liste figée) ou un style de départ renommé. On va les chercher en base (une seule fois par
  // session) quand CE produit est une bière / un cidre qui porte des styles, ou qu'il porte un style inconnu :
  // les autres produits (vins, spiritueux…) ne font aucune requête en plus. L'effet repasse à chaque fiche
  // (drink.id) : la lecture est mémorisée, donc sans coût, et un échec est réessayé à la fiche suivante.
  const [, setStyleLabelsTick] = useState(0);
  const unknownStylesKey = (drink.styles || []).filter((code) => !hasStyleLabel(code)).join(",");
  const needsStyleLabels = !!unknownStylesKey || (isBeer && (drink.styles || []).length > 0);
  useEffect(() => {
    if (!needsStyleLabels) return;
    let cancelled = false;
    loadCustomBeerCiderStylesOnce().then((list) => {
      if (registerCustomStyleLabels(list) && !cancelled) setStyleLabelsTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStyleLabels, unknownStylesKey, drink.id]);

  // Styles sélectionnés sur la fiche (pastilles) pour la liste « Produits communs ». La sélection appartient
  // à CE produit : si la fiche affichée change de produit, elle repart de zéro sans état périmé.
  const [stylePick, setStylePick] = useState({ drinkId: drink.id, codes: [] });
  const pickedStyles = stylePick.drinkId === drink.id ? stylePick.codes : [];
  const togglePickedStyle = (code) => {
    const next = pickedStyles.includes(code) ? pickedStyles.filter((c) => c !== code) : [...pickedStyles, code];
    // Toujours dans l'ordre d'affichage des pastilles, quel que soit l'ordre dans lequel on les touche.
    setStylePick({ drinkId: drink.id, codes: (drink.styles || []).filter((c) => next.includes(c)) });
  };

  // Cloche de notification — ses activités apparaissent dans ton fil Pulse, comme pour un lieu.
  const [isFollowed, setIsFollowed] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);
  useEffect(() => {
    loadDrinkFollowStatus(drink.id).then(setIsFollowed);
  }, [drink.id]);
  const handleToggleFollow = async () => {
    setTogglingFollow(true);
    const result = await toggleFollowDrink(drink.id);
    setTogglingFollow(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setIsFollowed(result.following);
  };

  const ratingValues = Object.values(drink.ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;
  const rawMyRating = drink.ratings && drink.ratings[myBibroCode];
  const myRating = typeof rawMyRating === "number" && isFinite(rawMyRating) ? rawMyRating : null;

  useEffect(() => {
    let cancelled = false;
    loadMyDrinkCheckinCount(drink.id).then((n) => {
      if (!cancelled) setMyCheckCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  // Nombre total de checks sur ce produit, tous les utilisateurs de l'app confondus — sous-bloc « Bibamus » du bloc Checks (onglet Biba360).
  const [totalCheckCount, setTotalCheckCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadDrinkTotalChecks(drink.id).then((n) => {
      if (!cancelled) setTotalCheckCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  // Nombre de personnes différentes qui ont checké ce produit, tous les utilisateurs de l'app confondus — tuile « Bibamus »
  // de la section « Unique Checkers » (onglet Biba360). null = lecture en cours, ou échouée : on affiche alors un tiret.
  const [uniqueCheckerCount, setUniqueCheckerCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setUniqueCheckerCount(null);
    loadDrinkUniqueCheckers(drink.id).then((n) => {
      if (!cancelled) setUniqueCheckerCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  // « Check Trends » (onglet Biba360) : la courbe de la popularité du produit (tous les utilisateurs, anonyme). null = lecture
  // en cours, ou échouée : rien ne s'affiche. Une réponse vide (moins de 2 personnes ont consommé ce produit) ne montre rien non plus.
  const [evolution, setEvolution] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setEvolution(null);
    loadDrinkEvolution(drink.id).then((e) => {
      if (!cancelled) setEvolution(e);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);
  const evolutionShown = !!evolution && evolution.all.some((p) => p.count > 0);

  // « Notes » (onglet Biba360), ligne Bibax : la moyenne des notes de mes Bibax. null = lecture en cours, ou échouée : un tiret.
  // Les lignes You et Bibamus n'ont pas besoin de lecture : elles viennent de drink.ratings, comme la bannière.
  const [bibaxRating, setBibaxRating] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setBibaxRating(null);
    loadMyBibaxDrinkRating(drink.id).then((r) => {
      if (!cancelled) setBibaxRating(r);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  // « Ton historique avec ce produit » (onglet Biba360) : mes consommations de ce produit. null = lecture en cours, ou échouée :
  // la carte ne s'affiche pas. Elle n'apparaît qu'une fois les noms des lieux connus (pas de lignes qui surgissent après coup).
  const [myHistory, setMyHistory] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setMyHistory(null);
    loadMyDrinkHistory(drink.id).then(async (h) => {
      if (!h || h.total <= 0) {
        if (!cancelled) setMyHistory(h);
        return;
      }
      // « @home » et « @event » ne sont pas des lieux de l'annuaire : on ne les demande jamais.
      const ids = h.venues.map((v) => v.venueId).filter((id) => id !== "@home" && id !== "@event");
      let venues = [];
      if (ids.length > 0) {
        try {
          venues = await loadVenuesByIds(ids);
        } catch (e) {
          console.error("loadMyDrinkHistory (noms des lieux):", e);
        }
      }
      if (cancelled) return;
      const venueNames = {};
      venues.forEach((v) => {
        venueNames[v.id] = v.name;
      });
      setMyHistory({ ...h, venueNames });
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);
  const historyFirstDate = myHistory ? formatWeekdayDDMMYYYY(myHistory.firstAt) : "";
  const historyLastDate = myHistory && myHistory.total > 1 ? formatWeekdayDDMMYYYY(myHistory.lastAt) : "";
  const historyShowLast = historyLastDate !== "" && historyLastDate !== historyFirstDate;
  const historyVenueRows = myHistory && myHistory.total > 0
    ? myHistory.venues
        .map((v) => ({ key: v.venueId, isVenue: v.venueId !== "@home" && v.venueId !== "@event", label: v.venueId === "@home" ? "@Home" : v.venueId === "@event" ? "@Event" : myHistory.venueNames?.[v.venueId], count: v.count }))
        .filter((r) => r.label)
    : [];
  const historyMoreVenues = myHistory ? Math.max(0, myHistory.venuesTotal - historyVenueRows.length) : 0;

  // « Où ce produit est le plus consommé ? » (onglet Biba360) : deux classements de lieux, « Tout le monde » et « Mes Bibax ».
  // null = lecture en cours ; { all, bibax } une fois les deux lectures finies et les noms des lieux connus (pas de lignes qui
  // surgissent après coup). Un classement dont la lecture a échoué vaut null : on ne le propose pas, plutôt que de dire « aucun
  // lieu ». Une ligne dont le nom du lieu est introuvable est écartée ; si aucun nom ne peut être lu, la carte n'apparaît pas.
  const [topVenues, setTopVenues] = useState(null);
  const [topScope, setTopScope] = useState("all");
  // Retour depuis la fiche d'un lieu : on rouvre le même classement (« Tout le monde » ou « Mes Bibax ») que celui où l'on a cliqué.
  const restoreScopeRef = useRef(returnMemo?.scope || null);
  useEffect(() => {
    let cancelled = false;
    setTopVenues(null);
    Promise.all([loadDrinkTopVenues(drink.id), loadMyBibaxDrinkVenues(drink.id)]).then(async ([all, bibax]) => {
      const ids = [...new Set([...(all || []), ...(bibax || [])].map((r) => r.venueId))];
      let venues = [];
      if (ids.length > 0) {
        try {
          venues = await loadVenuesByIds(ids);
        } catch (e) {
          console.error("loadDrinkTopVenues (noms des lieux):", e);
        }
      }
      if (cancelled) return;
      const byId = {};
      venues.forEach((v) => {
        byId[v.id] = v;
      });
      const withVenue = (list) => (list ? list.map((r) => ({ ...r, venue: byId[r.venueId] })).filter((r) => r.venue) : null);
      const a = withVenue(all);
      const b = withVenue(bibax);
      setTopVenues({ all: a, bibax: b });
      // On ouvre sur « Tout le monde », sauf s'il est vide ou illisible alors que « Mes Bibax » a des lieux ; au retour d'un lieu,
      // sur le classement où l'on avait cliqué (s'il a encore des lieux).
      const wanted = restoreScopeRef.current;
      restoreScopeRef.current = null;
      const wantedRows = wanted === "all" ? a : wanted === "bibax" ? b : null;
      setTopScope(wantedRows && wantedRows.length > 0 ? wanted : a && a.length > 0 ? "all" : b && b.length > 0 ? "bibax" : "all");
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);
  const topAll = topVenues ? topVenues.all : null;
  const topBibax = topVenues ? topVenues.bibax : null;
  const topHasRows = (topAll && topAll.length > 0) || (topBibax && topBibax.length > 0);
  // Le sélecteur n'existe que si les deux classements ont pu être lus ; sinon on montre celui qui existe, sans choix.
  const topShowSelect = topAll !== null && topBibax !== null;
  const topRows = (topScope === "all" ? topAll : topBibax) || [];

  // Retour depuis la fiche d'un lieu ou le profil d'un Bibax ouvert depuis l'onglet Biba360 : on se replace à la hauteur de
  // l'élément cliqué. Les cartes se remplissent au fil des lectures : on recale à chaque rendu tant que la personne n'a pas
  // touché à l'écran, 4 secondes au plus.
  const restoreRef = useRef(returnMemo);
  const alignToMemo = () => {
    const m = restoreRef.current;
    if (!m || m.offset == null) return;
    const el = findAnchor(m.anchor);
    const sc = el ? findScrollParent(el) : null;
    if (!sc) return;
    const base = sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top;
    const delta = el.getBoundingClientRect().top - base - m.offset;
    if (Math.abs(delta) >= 1) sc.scrollTop += delta;
  };
  useLayoutEffect(alignToMemo);
  useEffect(() => {
    if (!restoreRef.current) return undefined;
    if (onReturnMemoConsumed) onReturnMemoConsumed();
    // Le conteneur de l'écran est remis en haut juste après l'arrivée : on recale à plusieurs reprises.
    const timers = [0, 150, 400, 900, 1800].map((ms) => setTimeout(alignToMemo, ms));
    const end = setTimeout(() => {
      restoreRef.current = null;
    }, 4000);
    const stop = () => {
      restoreRef.current = null;
    };
    const types = ["wheel", "touchstart", "pointerdown", "keydown"];
    types.forEach((t) => window.addEventListener(t, stop, { capture: true, passive: true }));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
      types.forEach((t) => window.removeEventListener(t, stop, { capture: true }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mémoire de retour d'un clic dans l'onglet Biba360 : l'onglet, l'élément cliqué (repère) et sa hauteur dans le conteneur.
  const buildReturnMemo = (anchorKey, scope) => {
    const el = findAnchor(anchorKey);
    const sc = el ? findScrollParent(el) : null;
    const base = sc && sc !== document.scrollingElement ? sc.getBoundingClientRect().top : 0;
    return { tab: "biba360", anchor: anchorKey, offset: el && sc ? el.getBoundingClientRect().top - base : null, scope: scope || null };
  };
  const openVenueFromBiba360 = (anchorKey, venueId, scope) => onOpenVenue(venueId, buildReturnMemo(anchorKey, scope));
  // Le profil s'ouvre à partir du code Bibax, que la liste ne porte pas : on le retrouve à partir du compte.
  const openBibaxFromBiba360 = async (userId) => {
    const memo = buildReturnMemo(`bibax:${userId}`);
    const codes = await loadBibroCodes([userId]);
    if (!codes[userId]) {
      console.error("Profil du Bibax introuvable :", userId);
      return;
    }
    if (onOpenBibax) onOpenBibax(codes[userId], memo);
  };
  // « Voir tout » : la page de la liste complète. On lui passe la liste entière ; au retour, on retombe à la hauteur du bouton.
  const openBibaxListFromBiba360 = () => {
    if (onOpenBibaxList && bibaxChecks) onOpenBibaxList(bibaxChecks, buildReturnMemo("bibax-all"));
  };

  // Checks de MES Bibax sur ce produit (onglet Biba360). null = lecture en cours, ou échouée : on affiche alors un
  // tiret, jamais « aucun Bibax ». Le serveur ne rend que les Bibax confirmés qui partagent leurs statistiques
  // « Boissons » — les autres n'apparaissent pas, sans que rien ne les signale.
  const [bibaxChecks, setBibaxChecks] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setBibaxChecks(null);
    loadMyBibaxDrinkChecks(drink.id).then((list) => {
      if (!cancelled) setBibaxChecks(list);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);
  const bibaxChecksTotal = bibaxChecks ? bibaxChecks.reduce((sum, b) => sum + b.checkCount, 0) : null;

  const [linkedBrand, setLinkedBrand] = useState(null);
  useEffect(() => {
    if (drink.brandId) loadBrandById(drink.brandId).then(setLinkedBrand);
    else setLinkedBrand(null);
  }, [drink.brandId]);

  const [linkedProducers, setLinkedProducers] = useState([]);
  useEffect(() => {
    if (drink.producerIds?.length > 0) loadBreweriesByIds(drink.producerIds).then(setLinkedProducers);
    else setLinkedProducers([]);
  }, [drink.producerIds]);

  // Lieux qui le proposent — jamais la liste complète (potentiellement énorme), toujours les 5
  // plus proches de l'utilisateur. "denied" distingue le refus explicite du "pas encore demandé".
  const [nearestVenues, setNearestVenues] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("ok");
        loadNearestVenuesServingDrink(drink.id, pos.coords.latitude, pos.coords.longitude, 5).then(setNearestVenues);
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }, [drink.id]);

  // Chiffre d'affaires — réservé aux admins pour l'instant, en attendant la future plateforme
  // Business (voir bibamus-schema-owner-stats.sql).
  const [revenueStats, setRevenueStats] = useState(null);
  useEffect(() => {
    if (!isAdmin) return;
    loadDrinkRevenueStats(drink.id).then(setRevenueStats);
  }, [drink.id, isAdmin]);

  const handleCheckConfirmed = async (result) => {
    setShowCheckModal(false);
    if (!result) {
      // Fenêtre fermée sans confirmer : on reste sur la fiche, le parcours depuis l'accueil s'arrête là.
      if (inHomeCheckFlow) {
        setInHomeCheckFlow(false);
        onCheckFlowFinished && onCheckFlowFinished(null);
      }
      return;
    }
    setJustChecked(true);
    const pulseResult = await onCheckDrink(drink.id, result.venueId, {
      publishToPulse: result.publishToPulse,
      visibility: result.visibility,
      content: result.content,
    });
    setMyCheckCount((n) => (n == null ? 1 : n + 1));
    // Le check lui-même est enregistré ; seule la publication dans BibaPulse a échoué.
    if (pulseResult && pulseResult.error) {
      alert("Ton check est enregistré, mais sa publication dans BibaPulse a échoué : " + pulseResult.error);
    }
    if (inHomeCheckFlow) {
      setInHomeCheckFlow(false);
      onCheckFlowFinished && onCheckFlowFinished({ name: drink.name, published: !!result.publishToPulse && !(pulseResult && pulseResult.error) });
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: drink.coverPhotoUrl
              ? `url(${drink.coverPhotoUrl}) center/cover`
              : drink.photoUrl
              ? `url(${drink.photoUrl}) center/cover`
              : COLORS.surfaceAlt,
            filter: !drink.coverPhotoUrl && drink.photoUrl ? "blur(14px)" : "none",
            transform: !drink.coverPhotoUrl && drink.photoUrl ? "scale(1.1)" : "none",
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={drink.photoUrl} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{drink.name}</h1>
            <CertificationIcon level={drink.certificationLevel} size={17} />
          </div>
          {SUBTYPE_LABELS[drink.beverageSubtype] && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0" }}>{SUBTYPE_LABELS[drink.beverageSubtype]}</p>}
          <div style={{ position: "absolute", top: "32px", right: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            {canShareEntity() && (
              <>
                <button
                  onClick={() => shareEntity({ title: drink.name, text: `Découvre ${drink.name} sur Bibamus !` })}
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
              title={isFollowed ? "Suivi sur Pulse — ses activités apparaissent" : "Suivre sur Pulse"}
              style={{ background: "none", border: "none", cursor: togglingFollow ? "default" : "pointer", padding: 0, display: "flex" }}
            >
              <NavIcon name="bell" size={24} color={COLORS.amber} filled={isFollowed} />
            </button>
            {(isBeer || drink.type === "Vins & Bulles" || drink.type === "Spiritueux") && !drink.isGeneric && (
              <>
                <span style={{ width: "1px", height: "18px", background: COLORS.chalkWhite, opacity: 0.4 }} />
                <button
                  onClick={() => onToggleWishlist(drink.id)}
                  title={isOnWishlist ? "Retirer de ma liste à goûter" : "Ajouter à ma liste à goûter"}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <NavIcon name="star" size={24} color={COLORS.amber} filled={!!isOnWishlist} />
                </button>
              </>
            )}
          </div>
        </div>
        {ratingAverage != null && (
          <div style={{ position: "absolute", bottom: "8px", right: "68px", left: "108px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(8,19,31,0.72)",
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "8px",
                padding: "3px 8px",
              }}
            >
              <NavIcon name="star" size={14} color={COLORS.amber} filled />
              <span style={{ fontSize: "11px" }}>
                <span style={{ color: COLORS.chalkWhite }}>{formatRating(ratingAverage)}</span>
                <span style={{ color: COLORS.inkSoft }}> - {ratingValues.length} avis</span>
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowCheckModal(true)}
          title="Check ce produit"
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
          <img src={beerCheckIconUrl} alt="Check" style={{ width: "52px", height: "52px", opacity: justChecked ? 0.55 : 1 }} />
        </button>
      </div>

      <div style={{ marginTop: "76px" }}>
        {pendingContributions.length > 0 && (
          <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginBottom: "10px" }}>📝 {pendingContributions.length > 1 ? "Des modifications sont proposées" : "Une modification est proposée"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pendingContributions.map((c) => (
                <div key={c.id} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "12.5px", color: "#F2C94C", marginBottom: isAdmin ? "6px" : 0 }}>
                    <strong>{DRINK_FIELD_LABELS[c.fieldPath] || c.fieldPath}</strong> : {formatDrinkFieldValue(c.fieldPath, c.previousValue)} → {formatDrinkFieldValue(c.fieldPath, c.proposedValue)}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => onApproveContribution(c)}
                        style={{ flex: 1, background: COLORS.sage, border: "none", borderRadius: "6px", padding: "6px", fontWeight: 700, fontSize: "11.5px", color: "#fff", cursor: "pointer" }}
                      >
                        ✓ Accepter
                      </button>
                      <button
                        onClick={() => onRejectContribution(c)}
                        style={{ flex: 1, background: "none", border: "2px solid #5c4a00", borderRadius: "6px", padding: "5px", fontWeight: 700, fontSize: "11.5px", color: "#F2C94C", cursor: "pointer" }}
                      >
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[
            { key: "infos", label: "Infos" },
            { key: "biba360", label: "Biba360" },
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
              ) : t.key === "biba360" ? (
                <>
                  Biba<span style={{ color: activeTab === t.key ? undefined : COLORS.amber }}>360</span>
                </>
              ) : (
                t.label
              )}
            </button>
          ))}
        </div>

        {activeTab === "infos" && (
          <>
        {(drink.originCity || drink.originRegion || drink.nationality || drink.abv != null || drink.launchYear || drink.ibu != null || drink.colorEbc != null || hasFeatureRows || linkedBrand || linkedProducers.length > 0) && (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px" }}>
              {[
                drink.styles?.length > 0 && {
                  key: "styles",
                  sep: null,
                  node: (
                    <div key="styles" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {/* Pastille proportionnelle à la police (marges en em) : changer fontSize suffit à la redimensionner. */}
                      {drink.styles.map((code) => {
                        const picked = pickedStyles.includes(code);
                        const chipStyle = { background: picked ? COLORS.amber : COLORS.paperAlt, borderRadius: "999px", padding: "0.45em 0.9em", fontSize: "10px", fontWeight: 600, color: picked ? COLORS.paper : COLORS.ink };
                        // Toucher une pastille la sélectionne (ou la retire) ; le bloc « Produits communs » ci-dessous
                        // ouvre alors la liste des produits qui portent tous les styles choisis.
                        return onOpenTagFilter ? (
                          <button
                            key={code}
                            type="button"
                            aria-pressed={picked}
                            onClick={() => togglePickedStyle(code)}
                            style={{ ...chipStyle, border: "none", margin: 0, cursor: "pointer" }}
                          >
                            {styleTagLabel(code)}
                          </button>
                        ) : (
                          <span key={code} style={chipStyle}>
                            {styleTagLabel(code)}
                          </span>
                        );
                      })}
                    </div>
                  ),
                },
                (drink.abv != null || drink.ibu != null || drink.colorEbc != null) && {
                  key: "abv",
                  sep: "green",
                  node: (
                  <div key="abv" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {drink.abv != null && (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {/* Boîte de 15px, comme les icônes ci-dessous, pour que le point s'aligne bien sur elles */}
                        <span style={{ width: "15px", height: "15px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: COLORS.amber, display: "inline-block" }} />
                        </span>
                        {drink.abv}% vol. ABV
                      </span>
                    )}
                    {drink.abv != null && (drink.ibu != null || drink.colorEbc != null) && (
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block" }} />
                    )}
                    {drink.ibu != null && <span>{drink.ibu} IBU</span>}
                    {drink.ibu != null && drink.colorEbc != null && (
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block" }} />
                    )}
                    {drink.colorEbc != null && <span>{drink.colorEbc} EBC</span>}
                  </div>
                  ),
                },
                featureItems.length > 0 && {
                  key: "features",
                  sep: "grey",
                  node: (
                  <div key="features" data-testid="drink-features" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {featureItems.map((it, i) => (
                      <React.Fragment key={it.key}>
                        {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />}
                        {renderDrinkBadgeItem(it, { drink, size: 13 })}
                      </React.Fragment>
                    ))}
                  </div>
                  ),
                },
                isAtp && {
                  key: "atp",
                  sep: "grey",
                  node: (
                  <div key="atp" data-testid="drink-atp" style={{ display: "flex", alignItems: "center" }}>
                    <img src={atpIconUrl} alt="Authentic Trappist Product" title="Authentic Trappist Product (ATP)" style={{ height: "56px", width: "auto", display: "block" }} />
                  </div>
                  ),
                },
                (drink.originCity || drink.originRegion || drink.nationality) && {
                  key: "origin",
                  sep: "grey",
                  node: (
                  <div key="origin" style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <NavIcon name="map-pin" size={15} color={COLORS.amber} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {drink.originCity && <span>{drink.originCity}</span>}
                      {drink.originRegion && <span>{drink.originRegion}</span>}
                      {drink.nationality && (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {drink.nationality}
                          <CountryFlagImg country={drink.nationality} size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                  ),
                },
                drink.launchYear && {
                  key: "launch",
                  sep: "grey",
                  node: (
                  <div key="launch" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <NavIcon name="calendar" size={15} color={COLORS.amber} />
                    Lancé en {drink.launchYear}
                  </div>
                  ),
                },
              ]
                .filter(Boolean)
                .map((row, i) => (
                  <React.Fragment key={row.key}>
                    {/* Chaque ligne présente se sépare de la précédente (jamais avant la 1re) : en
                        vert entre les styles et le reste, en gris entre les lignes techniques. */}
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

            {(drink.originCity || drink.originRegion || drink.nationality || drink.abv != null || drink.launchYear || drink.ibu != null || drink.colorEbc != null || hasFeatureRows) && (linkedBrand || linkedProducers.length > 0) && (
              <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "14px 0" }} />
            )}

            {linkedBrand && (
              <button
                onClick={() => onOpenBrand(linkedBrand.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginBottom: linkedProducers.length > 0 ? "10px" : 0 }}
              >
                <EntityAvatar photoUrl={linkedBrand.logoUrl} size={28} />
                <span>
                  <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>Marque</span>
                  <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {linkedBrand.name}
                    <CertificationIcon level={linkedBrand.certificationLevel} size={13} />
                  </span>
                </span>
              </button>
            )}

            {linkedProducers.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onOpenBrewery(p.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginTop: i > 0 ? "10px" : 0 }}
              >
                <EntityAvatar photoUrl={p.profilePhotoUrl} photoEmoji={p.avatarEmoji} size={28} />
                <span>
                  <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>Producteur</span>
                  <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {p.name}
                    <CertificationIcon level={p.certificationLevel} size={13} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bloc visible seulement quand au moins un style est choisi. */}
        {onOpenTagFilter && pickedStyles.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "12px 14px", margin: "-4px 0 16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink }}>
              {pickedStyles.length} {pickedStyles.length > 1 ? "styles choisis" : "style choisi"}
            </span>
            <button
              type="button"
              onClick={() => onOpenTagFilter(drink.type, { kind: "style", value: pickedStyles.join(",") })}
              style={{ background: COLORS.amber, color: COLORS.paper, border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
            >
              Produits communs
            </button>
          </div>
        )}

        {isAdmin && revenueStats && revenueStats.orderCount > 0 && (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.wine}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ width: "4px", height: "18px", background: COLORS.wine, borderRadius: "2px", display: "inline-block" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Admin — Chiffre d'affaires (tous utilisateurs)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
              {revenueStats.totalEuro > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.inkSoft }}>Total en euros</span>
                  <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif" }}>{formatMoney(revenueStats.totalEuro, "euro")}</span>
                </div>
              )}
              {revenueStats.avgPriceEuro != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.inkSoft }}>Prix moyen payé</span>
                  <span style={{ fontWeight: 700, fontFamily: "'Urbanist', sans-serif" }}>{formatMoney(revenueStats.avgPriceEuro, "euro")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Lieux qui le proposent près de toi</span>
          </div>
          {geoStatus === "denied" || geoStatus === "unavailable" ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <NavIcon name="map-pin" size={26} color={COLORS.paperAlt} />
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Active ta localisation pour voir les lieux les plus proches.</p>
            </div>
          ) : geoStatus === "locating" || nearestVenues === null ? (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "16px 0" }}>Recherche des lieux les plus proches...</p>
          ) : nearestVenues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <NavIcon name="map-pin" size={26} color={COLORS.paperAlt} />
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Aucun lieu ne le propose pour l'instant.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {nearestVenues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onOpenVenue(v.id)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
                >
                  <EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={28} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                    <span style={{ fontSize: "11.5px", color: COLORS.inkSoft }}>
                      {v.distanceMeters < 1000 ? `${Math.round(v.distanceMeters)} m` : `${(v.distanceMeters / 1000).toFixed(1)} km`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isAdmin && (
          <div style={{ marginTop: "auto", paddingTop: "20px" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>ADMINISTRATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {drink.status !== "complete" ? (
                <button
                  onClick={onCertify}
                  style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}
                >
                  ✓ Certifier cette fiche
                </button>
              ) : (
                <button
                  onClick={onDecertify}
                  style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.ink, cursor: "pointer" }}
                >
                  ↩️ Décertifier cette fiche
                </button>
              )}
              <button
                onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                style={{ background: "none", border: `2px solid ${COLORS.wine}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.wine, cursor: "pointer" }}
              >
                {confirmDelete ? "Confirmer la suppression ?" : "Supprimer du répertoire"}
              </button>
            </div>
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
            Revendiquer la gestion de ce produit
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

        {activeTab === "biba360" && (
          <>
            {/* « Notes » : la note étoilée en trois lignes — You (ma note), Bibax (la moyenne de mes Bibax), Bibamus (la moyenne
                de tous, la même que sur la bannière). Tout en haut de l'onglet, avant « Checks ». */}
            <NotesCard mine={myRating} bibax={bibaxRating} everyone={ratingAverage != null ? { average: ratingAverage, count: ratingValues.length } : null} />

            {/* Un seul bloc « Checks », en trois sections séparées par une barre verte fluo :
                1. « Checks » : You (mes checks), Bibax (ceux de mes Bibax), Bibamus (tous les utilisateurs de l'app) ;
                2. « Unique Checkers » : le nombre de PERSONNES différentes (et non de checks). Pas de tuile « You » : pour moi,
                   ce serait toujours 0 ou 1. Bibax = les Bibax de la liste plus bas ; Bibamus = tous les utilisateurs de l'app ;
                3. « Check Trends » : la courbe de la popularité du produit au fil du temps (7 jours, 30 jours, 12 mois,
                   tout l'historique), tous les utilisateurs confondus, en chiffres anonymes. Rien tant que la lecture n'a pas
                   abouti, ni quand moins de 2 personnes ont consommé le produit : la section et sa barre disparaissent alors. */}
            <div data-checks-card="" style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
              <div>
                <BlockTitle>Checks</BlockTitle>
                <StatTiles
                  tiles={[
                    { label: "You", value: myCheckCount },
                    { label: "Bibax", value: bibaxChecksTotal },
                    { label: "Bibamus", value: totalCheckCount },
                  ]}
                />
              </div>
              <SectionDivider />
              <div>
                <BlockTitle>Unique Checkers</BlockTitle>
                <StatTiles
                  tiles={[
                    { label: "Bibax", value: bibaxChecks ? bibaxChecks.length : null },
                    { label: "Bibamus", value: uniqueCheckerCount },
                  ]}
                />
              </div>
              {evolutionShown && (
                <>
                  <SectionDivider />
                  <EvolutionCard key={drink.id} evolution={evolution} />
                </>
              )}
            </div>

            {/* « Ton historique avec ce produit » : mon carnet de dégustation de ce produit (tous mes verres : checks, BibaSolo,
                salons). Rien tant que la lecture n'a pas abouti, ni quand je ne l'ai jamais consommé. La « Dernière fois »
                n'apparaît que s'il y a une autre date que la première. */}
            {myHistory && myHistory.total > 0 && (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <BlockTitle>Ton historique avec ce produit</BlockTitle>
                {historyFirstDate && <HistoryRow first normal label="Première fois" value={historyFirstDate} />}
                {historyShowLast && <HistoryRow first={!historyFirstDate} normal label="Dernière fois" value={historyLastDate} />}
                <HistoryRow first={!historyFirstDate && !historyShowLast} label="Consommé au total" value={<TimesValue count={myHistory.total} />} />
                {historyVenueRows.length > 0 && (
                  <>
                    <BlockTitle style={{ margin: "16px 0 10px", borderTop: `1px solid ${COLORS.amber}`, paddingTop: "12px" }}>Où tu l'as bu</BlockTitle>
                    {historyVenueRows.map((r, i) => (
                      <HistoryRow
                        key={r.key}
                        first={i === 0}
                        anchor={r.isVenue ? `hist:${r.key}` : undefined}
                        label={r.label}
                        value={r.count}
                        go={r.isVenue ? { label: `Voir la fiche de ${r.label}`, onClick: () => openVenueFromBiba360(`hist:${r.key}`, r.key) } : null}
                      />
                    ))}
                    {historyMoreVenues > 0 && (
                      <div style={{ marginTop: "10px", borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
                        {historyMoreVenues === 1 ? "et 1 autre lieu" : `et ${historyMoreVenues} autres lieux`}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Liste des Bibax qui ont checké ce produit — un bloc à part : d'autres listes (ex. les lieux où j'ai
                consommé ce produit) pourront venir s'ajouter à côté. Rien tant que la lecture n'a pas abouti, ni quand
                aucun de mes Bibax n'a checké ce produit (la tuile « Bibax 0 » de « Unique Checkers » le dit déjà). */}
            {bibaxChecks && bibaxChecks.length > 0 && (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <BlockTitle>Tes Bibax qui ont checké ce produit</BlockTitle>
                <BibaxCheckRows rows={bibaxChecks.slice(0, BIBAX_PREVIEW_COUNT)} onOpen={openBibaxFromBiba360} />
                {bibaxChecks.length > BIBAX_PREVIEW_COUNT && (
                  <button
                    data-anchor="bibax-all"
                    onClick={openBibaxListFromBiba360}
                    style={{ display: "block", width: "100%", marginTop: "10px", paddingTop: "10px", paddingBottom: 0, paddingLeft: 0, paddingRight: 0, background: "none", border: "none", borderTop: `1px solid ${COLORS.paperAlt}`, textAlign: "center", fontSize: "12.5px", fontWeight: 400, color: COLORS.amber, cursor: "pointer" }}
                  >
                    Voir tout
                  </button>
                )}
              </div>
            )}

            {/* « Où ce produit est le plus consommé ? » : le classement des lieux (5 au plus), un gros point vert devant chaque
                nom et une flèche vers la fiche du lieu. « Tout le monde » (chiffres anonymes) ou « Mes Bibax », en deux
                sous-onglets plus fins que les onglets principaux. Rien tant que les lectures ne sont pas finies, ni quand
                aucun classement n'a de lieu. Placé après la liste des Bibax, en fin d'onglet. */}
            {topHasRows && (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <BlockTitle>Où ce produit est le plus consommé ?</BlockTitle>
                {topShowSelect && (
                  <div role="tablist" aria-label="Classement : tout le monde ou mes Bibax" style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                    {[
                      { key: "all", label: "Tout le monde" },
                      { key: "bibax", label: "Mes Bibax" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        role="tab"
                        aria-selected={topScope === t.key}
                        onClick={() => setTopScope(t.key)}
                        style={{
                          flex: 1,
                          background: topScope === t.key ? COLORS.amber : "none",
                          color: topScope === t.key ? COLORS.paper : COLORS.ink,
                          border: `1.5px solid ${topScope === t.key ? COLORS.amber : COLORS.paperAlt}`,
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                {topRows.length === 0 ? (
                  <p style={{ margin: 0, padding: "14px 0 4px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
                    {topScope === "bibax" ? "Aucun lieu à afficher chez tes Bibax pour ce produit." : "Pas encore assez de consommations pour dresser un classement."}
                  </p>
                ) : (
                  topRows.map((r, i) => (
                    <div key={r.venueId} data-anchor={`top:${r.venueId}`} style={{ display: "flex", alignItems: "center", gap: "10px", ...(i === 0 && !topShowSelect ? {} : { borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px", marginTop: "10px" }) }}>
                      <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ minWidth: 0, fontSize: "14px", color: COLORS.ink, overflowWrap: "anywhere" }}>{r.venue.name}</span>
                        <GoButton label={`Voir la fiche de ${r.venue.name}`} onClick={() => openVenueFromBiba360(`top:${r.venueId}`, r.venueId, topScope)} />
                      </div>
                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, flexShrink: 0 }}><TimesValue count={r.count} /></span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "bibapulse" && (
          <EntityPulseSection
            entityType="drink"
            entityId={drink.id}
            myUserId={myUserId}
            myBibroCode={myBibroCode}
            onOpenVenue={onOpenVenue}
            onOpenBrand={onOpenBrand}
            onOpenProducer={onOpenBrewery}
            selfEntity={{ type: "drink", object: { id: drink.id, name: drink.name } }}
          />
        )}

        {claimsEnabled && claiming && <ClaimModal entityType="drink" entityId={drink.id} entityName={drink.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

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
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    onEdit();
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
                >
                  <NavIcon name="pencil" size={20} color={COLORS.amber} />
                  Éditer
                </button>
              )}
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
          <ReportModal entityType="drink" entityId={drink.id} myBibroCode={myBibroCode} initialReason={reportInitialReason} onClose={() => setReporting(false)} />
        )}
        <div style={{ marginTop: "-14px" }}>
          <BackFooterLink onClick={onBack} />
        </div>
      </div>

      {showCheckModal && (
        <DrinkCheckInModal
          drinkName={drink.name}
          drinkPhotoUrl={drink.photoUrl}
          drinkEmoji={drink.avatarEmoji}
          drinkType={drink.type}
          myRating={myRating}
          enableContent
          onRate={(value) => onRate(value, { skipDiscoveryPulse: true })}
          onUnrate={() => onUnrate(drink.id)}
          onClose={handleCheckConfirmed}
        />
      )}
    </div>
  );
}
