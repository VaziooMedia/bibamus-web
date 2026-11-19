// ============================================================
// Écrans "Mes Bibax" — liste, fiche détaillée, ajout d'un
// contact, et déverrouillage admin. Copiés tels quels depuis
// le prototype Claude.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, WhatsappIcon, XIcon, ThreadsIcon, LinkedinIcon, PinterestIcon, TwitchIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, PageFooterNav, BackFooterLink, PrimaryButton, EntityAvatar, ActionCard, CARD_AVATAR, avatarOverhang, RequestCardAvatar, MutualPill } from "./ui.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { QRCodeSVG } from "./QRCodeSVG.jsx";
import { SalonQrScannerModal } from "./SalonQrScannerModal.jsx";
import { MyPhotosScreen } from "./MyPhotosScreen.jsx";
import { useListReturn } from "../hooks/useListReturn.js";
import { makeSearchMatcher, normalizeUrl, drinkTypeLabel, formatMemberSince, formatSharedBirthDate, computeAgeFromBirthDate, usernameFromQuery, formatCount } from "../utils.js";
import {
  loadPendingBibaxRequests,
  loadSentBibaxRequests,
  loadBibaxSuggestions,
  loadMyBibaxUsernames,
  loadMyBibaxMutualCounts,
  attachUsernames,
  attachMutualCounts,
  loadMutualCountsByBibroCodes,
  dismissBibaxSuggestion,
  respondBibaxRequest,
  sendBibaxRequest,
  cancelBibaxRequest,
  loadMutualBibaxCount,
  loadBibroBibaxList,
  loadBibroPublicClubs,
  loadBibaxCount,
  loadMyProfileStats,
  searchBibaxByName,
  loadUsernamesByBibroCodes,
  lookupUsername,
  toggleNotifyPulse,
  loadNotifyPulse,
  loadPulseStories,
} from "../data/sharedDirectories.js";
import { openDirectConversation } from "../data/messaging.js";
import { ConversationScreen } from "./ConversationScreen.jsx";
import bibaPingIconUrl from "../assets/brand/bibaping.svg";
import { PillTabs, TabBadge } from "./PillTabs.jsx";
import { CheckGroup, CheckRow, letterOf } from "./CheckListParts.jsx";
import { BibaxIdentity, bibaxDetailParts } from "./BibaxLines.jsx";
import { AlphaIndex, showAlphaIndex } from "./AlphaIndex.jsx";
import { BibaxStatsContent } from "./BibaxStatsContent.jsx";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { ClubRow, JOIN_MODE_LABEL } from "./BibaClubsListScreen.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import bibaxIconUrl from "../assets/brand/bibax.svg";
import birthdayIconUrl from "../assets/brand/birthday-icon.png";
import residenceIconUrl from "../assets/brand/residence-icon.png";

// Mes Bibax : trois pages à pastilles — « Bibax » (la liste de mes Bibax), « Suggestions » (la liste des suggestions) et « Demandes » (reçues et envoyées), décision de Mehdi du 2026-11-18.
// Les demandes sont lues au niveau de la page : la pastille « Demandes » affiche ainsi le nombre de demandes reçues quel que soit l'onglet ouvert.
// Taille des boutons ronds des Demandes (reçues : coche et croix l'une sous l'autre ; envoyées : croix grise), plus petits que ceux des Suggestions (34 px) — Mehdi, 2026-11-18 (28 px d'abord, puis 24 px : « plus petit »).
// Zone tactile élargie sans changer l'apparence (comme la flèche du profil : `GoButton`) : 10 px de chaque côté (12 sur les ronds à contour de 2 px, dont la zone se compte depuis l'intérieur du contour) ; entre la coche et la croix empilées, 3 px au-dessus et au-dessous pour ne pas se chevaucher.
const REQUEST_BTN = "24px";

function useBibaxRequests(onBibaxAdded) {
  const [pending, setPending] = useState(null);
  const [sent, setSent] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const prevSentIds = useRef(null);

  const refresh = () => {
    loadPendingBibaxRequests().then(attachUsernames).then(attachMutualCounts).then(setPending);
    loadSentBibaxRequests().then(attachUsernames).then(attachMutualCounts).then((data) => {
      // Une demande envoyée qui disparaît (sans qu'on l'ait nous-même annulée) veut dire que
      // l'autre vient de la confirmer — il faut alors synchroniser ce nouveau Bibax localement,
      // pas seulement rafraîchir l'affichage des demandes.
      if (prevSentIds.current) {
        const newIds = new Set(data.map((r) => r.relationshipId));
        const disappeared = prevSentIds.current.some((id) => !newIds.has(id));
        if (disappeared) onBibaxAdded();
      }
      prevSentIds.current = data.map((r) => r.relationshipId);
      setSent(data);
    });
  };

  useEffect(() => {
    refresh();
    // Rafraîchit périodiquement — sans ça, "Demandes envoyées" ne se met à jour que si on
    // quitte puis revient sur cet écran, laissant croire qu'une demande est encore en attente
    // alors qu'elle vient d'être confirmée par l'autre personne.
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const respond = async (relationshipId, accept) => {
    setBusyId(relationshipId);
    const result = await respondBibaxRequest(relationshipId, accept);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (accept) onBibaxAdded();
    refresh();
  };

  const cancelRequest = async (relationshipId) => {
    setBusyId(relationshipId);
    const result = await cancelBibaxRequest(relationshipId);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.alreadyAccepted) {
      alert("Trop tard — cette demande vient d'être confirmée par l'autre personne. Vous êtes déjà Bibax.");
      onBibaxAdded();
    }
    refresh();
  };

  return { pending, sent, busyId, refresh, respond, cancelRequest };
}

// Page « Demandes » : les demandes reçues (à confirmer ou refuser), puis les demandes envoyées (à annuler). Mêmes boutons ronds que la page Suggestions (décidé par Mehdi, 2026-11-18) :
// la coche ronde verte à la place du « + » pour confirmer, le « × » rond rose fluo pour refuser.
function BibaxRequestsPanel({ pending, sent, busyId, respond, cancelRequest, onOpenProfile }) {
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [sentExpanded, setSentExpanded] = useState(true);
  const hasPending = pending && pending.length > 0;
  const hasSent = sent && sent.length > 0;
  if (pending === null && sent === null) return <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>;
  if (!hasPending && !hasSent) return <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune demande pour l'instant.</p>;
  return (
    <>
      {hasPending && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setPendingExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: pendingExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>Demandes reçues ({pending.length})</span>
            <span style={{ display: "inline-flex", marginLeft: "auto", transform: `rotate(${pendingExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {pendingExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pending.map((r) => (
              <div
                key={r.relationshipId}
                onClick={() => onOpenProfile(r.bibroCode)}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <RequestCardAvatar photoUrl={r.avatarUrl} />
                <BibaxIdentity name={r.name} lastName={r.lastName} username={r.username} nickname={r.nickname} city={r.city} locality={r.locality} country={r.country} mutual={r.mutual} style={{ flex: 1, fontSize: "13.5px", color: COLORS.ink }} />
                {/* Les deux boutons l'un sous l'autre, plus petits (Mehdi, 2026-11-18 : pour laisser de la place au texte, surtout en 320 px). */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      respond(r.relationshipId, true);
                    }}
                    disabled={busyId === r.relationshipId}
                    aria-label="Accepter"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.amber, border: "none", borderRadius: "50%", position: "relative", width: REQUEST_BTN, height: REQUEST_BTN, cursor: "pointer", flexShrink: 0, padding: 0 }}
                  >
                    <span aria-hidden="true" style={{ position: "absolute", top: "-3px", right: "-10px", bottom: "-3px", left: "-10px" }} />
                    <NavIcon name="check" size={13} color={COLORS.paper} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      respond(r.relationshipId, false);
                    }}
                    disabled={busyId === r.relationshipId}
                    aria-label="Refuser"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `2px solid ${COLORS.pinkFluo}`, borderRadius: "50%", boxSizing: "border-box", position: "relative", width: REQUEST_BTN, height: REQUEST_BTN, cursor: "pointer", flexShrink: 0, padding: 0 }}
                  >
                    <span aria-hidden="true" style={{ position: "absolute", top: "-5px", right: "-12px", bottom: "-5px", left: "-12px" }} />
                    <NavIcon name="x" size={12} color={COLORS.pinkFluo} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {hasSent && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setSentExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: sentExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>Demandes envoyées ({sent.length})</span>
            <span style={{ display: "inline-flex", marginLeft: "auto", transform: `rotate(${sentExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {sentExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sent.map((r) => (
              <div
                key={r.relationshipId}
                onClick={() => onOpenProfile(r.bibroCode)}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <RequestCardAvatar photoUrl={r.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <BibaxIdentity name={r.name} lastName={r.lastName} username={r.username} nickname={r.nickname} city={r.city} locality={r.locality} country={r.country} mutual={r.mutual} style={{ fontSize: "13.5px", color: COLORS.ink }} />
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: COLORS.pinkFluo }}>En attente de confirmation</p>
                </div>
                {/* Annuler la demande : rond avec une croix grise, contour gris foncé (discret), de la même taille que les boutons des demandes reçues (Mehdi, 2026-11-18). */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelRequest(r.relationshipId);
                  }}
                  disabled={busyId === r.relationshipId}
                  aria-label="Annuler la demande"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "50%", boxSizing: "border-box", position: "relative", width: REQUEST_BTN, height: REQUEST_BTN, cursor: "pointer", flexShrink: 0, padding: 0 }}
                >
                  <span aria-hidden="true" style={{ position: "absolute", top: "-12px", right: "-12px", bottom: "-12px", left: "-12px" }} />
                  <NavIcon name="x" size={12} color={COLORS.inkSoft} />
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
    </>
  );
}

// Page « Suggestions » : toutes les suggestions (50 au plus), en liste. Le « + » rond vert envoie la demande ; le « × » rond gris (`inkSoft`) supprime la suggestion (la personne n'est plus proposée pendant 3 mois).
function BibaxSuggestionsPanel({ suggestions, busyCode, onOpenProfile, onAdd, onDismiss }) {
  if (suggestions === null) return <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>;
  if (suggestions.length === 0) return <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune suggestion pour l'instant.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {suggestions.map((s) => (
        <div
          key={s.userId}
          onClick={() => onOpenProfile(s.bibroCode)}
          style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <RequestCardAvatar photoUrl={s.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <BibaxIdentity name={s.name} lastName={s.lastName} username={s.username} nickname={s.nickname} city={s.city} locality={s.locality} country={s.country} scrollName style={{ fontSize: "13.5px", color: COLORS.ink }} />
            <div style={{ marginTop: "3px" }}>
              <MutualPill n={s.mutualCount || 0} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(s.bibroCode);
              }}
              disabled={busyCode === s.bibroCode}
              aria-label="Ajouter"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.amber, border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", flexShrink: 0, opacity: busyCode === s.bibroCode ? 0.5 : 1 }}
            >
              <NavIcon name="plus" size={18} color={COLORS.paper} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(s);
              }}
              aria-label="Supprimer cette suggestion"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `2px solid ${COLORS.inkSoft}`, borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", flexShrink: 0 }}
            >
              <NavIcon name="x" size={17} color={COLORS.inkSoft} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Les trois classements de la liste de Mes Bibax (Mehdi, 2026-11-18) : par prénom (au départ), par nom de famille, par nom d'utilisateur (@nom).
const BIBAX_SORTS = [
  { key: "first", label: "Prénom" },
  { key: "last", label: "Nom" },
  { key: "username", label: { accent: "@", suffix: "Username" } },
];
const bibaxCollator = new Intl.Collator("fr", { sensitivity: "base" });

// Retour d'une fiche (norme de l'app, voir `useListReturn`) : la liste se remet à la hauteur où on l'avait laissée, avec la recherche tapée ; une entrée depuis Mon Profil repart de zéro.
export function BibrosListScreen({ myName, profile, checkIns, myBibroCode, bibros, goToAddBibro, onViewBibro, onBack, onBibaxAdded, onOpenBibaxProfile, onToggleFavorite, initialTab, mainScrollRef }) {
  const { restored, save, open } = useListReturn("bibrosList", mainScrollRef);
  const [query, setQuery] = useState(restored ? restored.query : "");
  // Trois pages à pastilles : « bibax » (ma liste), « suggestions », « requests » (demandes). Au retour d'une fiche, la page ouverte est celle qu'on avait laissée ; sinon `initialTab`
  // (l'accueil ouvre directement les suggestions), sinon la liste de mes Bibax.
  const [tab, setTab] = useState(restored?.tab || initialTab || "bibax");
  const [suggestions, setSuggestions] = useState(restored ? restored.suggestions ?? null : null);
  const [suggestionBusyCode, setSuggestionBusyCode] = useState(null);
  // Classement de la liste de Mes Bibax : « first » (prénom), « last » (nom de famille) ou « username » (@nom). `usernames` : { userId: nom d'utilisateur }, lus à l'ouverture de la page « Bibax ».
  const [sort, setSort] = useState(restored?.sort || "first");
  const [usernames, setUsernames] = useState(restored ? restored.usernames ?? null : null);
  // `mutuals` : { userId: nombre de Bibax en commun } (ligne 4 de chaque Bibax ; absent = 0, la ligne n'est pas affichée), lus eux aussi à l'ouverture de la page « Bibax ».
  const [mutuals, setMutuals] = useState(restored ? restored.mutuals ?? null : null);
  useEffect(() => {
    save({ query, tab, suggestions, sort, usernames, mutuals });
  }, [query, tab, suggestions, sort, usernames, mutuals]);
  const viewBibro = onViewBibro ? open(onViewBibro) : onViewBibro;
  const openBibaxProfile = onOpenBibaxProfile ? open(onOpenBibaxProfile) : onOpenBibaxProfile;
  const requests = useBibaxRequests(onBibaxAdded || (() => {}));

  // Les suggestions sont lues à chaque ouverture de la page « Suggestions » (celle qu'on garde en mémoire sert à se replacer au retour d'une fiche, puis elle est relue en silence).
  useEffect(() => {
    if (tab !== "suggestions") return undefined;
    let alive = true;
    loadBibaxSuggestions(50).then(attachUsernames).then((list) => {
      if (alive) setSuggestions((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    });
    return () => {
      alive = false;
    };
  }, [tab]);

  // Les noms d'utilisateur (ligne 2 de chaque Bibax et classement « @Username ») sont relus à chaque ouverture de la page « Bibax » (comme les suggestions : ce qu'on a en mémoire sert tout de suite, puis la lecture le remplace en silence).
  // Si la lecture échoue, on garde ce qu'on avait : la ligne 2 n'affiche pas de @nom et le classement « @Username » se fait sur le code Bibax.
  useEffect(() => {
    if (tab !== "bibax") return undefined;
    let alive = true;
    loadMyBibaxUsernames().then((list) => {
      if (alive && list) setUsernames((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    });
    // Le nombre de Bibax en commun (ligne 4) : même règle, si la lecture échoue on garde ce qu'on avait (ou rien : pas de 4ᵉ ligne).
    loadMyBibaxMutualCounts().then((list) => {
      if (alive && list) setMutuals((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    });
    return () => {
      alive = false;
    };
  }, [tab, bibros.length]);

  const addSuggestion = async (bibroCode) => {
    setSuggestionBusyCode(bibroCode);
    await sendBibaxRequest(bibroCode);
    setSuggestionBusyCode(null);
    setSuggestions((prev) => (prev || []).filter((s) => s.bibroCode !== bibroCode));
    requests.refresh();
  };
  const dismissSuggestion = (s) => {
    setSuggestions((prev) => (prev || []).filter((x) => x.userId !== s.userId));
    dismissBibaxSuggestion(s.userId);
  };

  // Même règle de recherche que partout dans l'app (voir makeSearchMatcher) : prénom, nom, surnom, alias, ville et pays, dans n'importe quel ordre.
  const matchesText = makeSearchMatcher(query);
  const matchesQuery = (b) => matchesText(b.firstName, b.lastName, b.nickname, b.alias, b.city, b.country);

  // Liste de A à Z (décidé par Mehdi, 2026-11-18), classée par prénom, par nom de famille ou par nom d'utilisateur. Les favoris sont en tête sous un titre « Favoris » ET gardent leur place alphabétique dans « Tous mes Bibax ».
  // Pendant une recherche : une seule liste de A à Z (les favoris ne sont pas répétés, le compteur compte chaque Bibax une fois).
  // Sans nom de famille, un Bibax est classé sur son prénom ; sans nom d'utilisateur connu (lecture pas encore faite ou en échec), sur son code Bibax (la valeur de départ du @nom).
  const firstNameOf = (b) => b.alias || b.name || "";
  const sortKeyOf = (b) => (sort === "last" ? b.lastName || firstNameOf(b) : sort === "username" ? (usernames && usernames[b.userId]) || b.code || "" : firstNameOf(b));
  const tieKeyOf = (b) => (sort === "first" ? b.lastName || "" : firstNameOf(b));
  const searching = query.trim() !== "";
  const alphaBibros = [...bibros].filter(matchesQuery).sort((a, b) => bibaxCollator.compare(sortKeyOf(a), sortKeyOf(b)) || bibaxCollator.compare(tieKeyOf(a), tieKeyOf(b)) || bibaxCollator.compare(a.code || "", b.code || ""));
  const favBibros = searching ? [] : alphaBibros.filter((b) => b.isFavorite);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  // Index des lettres sur le bord droit (norme des listes classées de A à Z, à partir de 30 Bibax) : il saute au premier Bibax de la lettre dans « Tous mes Bibax » (la lettre est celle du classement choisi).
  const alphaOn = showAlphaIndex("alpha", alphaBibros.length);
  const alphaLetters = alphaOn ? [...new Set(alphaBibros.map((b) => letterOf(sortKeyOf(b))))] : [];
  const alphaTarget = (letter) => {
    const at = alphaBibros.findIndex((b) => letterOf(sortKeyOf(b)) === letter);
    return at < 0 ? null : listRef.current?.querySelectorAll("[data-bibax-az-row]")[at] || null;
  };
  // Une ligne de la liste (même squelette que DrinkChecks / PlaceChecks) : rond de profil, puis trois lignes (nom ; @nom + surnom ; commune + drapeau). Un favori a, dans la colonne de droite, un cœur plein
  // qu'on touche pour le retirer des favoris (Mehdi, 2026-11-18) ; un Bibax qui n'est pas favori n'a pas de colonne.
  // Classé par nom de famille, le nom s'écrit « Nom Prénom » (la lettre de l'index est la première du nom).
  const bibaxRow = (b, isLast, inAlphaList) => {
    // Trois lignes (Mehdi, 2026-11-18, même modèle que Mes Favoris > Bibax, voir `BibaxLines.jsx`) : 1. nom ; 2. @nom (« @ » vert fluo) puis surnom en italique ; 3. commune (village) puis drapeau du pays.
    // Ligne 4 (Mehdi, 2026-11-18, comme dans Mes Favoris > Bibax) : « N Bibax en commun », « 0 Bibax en commun » compris. La lecture ne rend que ceux qui en ont : une fois lue, un Bibax absent en a 0 ; tant qu'elle n'a pas répondu (ou si elle a échoué : `mutuals` est null), pas de 4ᵉ ligne.
    const lines = [...bibaxDetailParts({ username: usernames && usernames[b.userId], nickname: b.nickname, city: b.city, locality: b.locality, country: b.country }), mutuals ? <MutualPill n={mutuals[b.userId] || 0} /> : null];
    const first = b.firstName || b.name;
    const fullName = (sort === "last" ? [b.lastName, first] : [first, b.lastName]).filter(Boolean).join(" ") || "Bibax";
    return (
      <div key={b.code} {...(inAlphaList ? { "data-bibax-az-row": "" } : {})}>
        <CheckRow
          avatarPhotoUrl={b.avatarUrl}
          fallbackIcon="default-avatar"
          name={fullName}
          lines={lines}
          count={b.isFavorite && onToggleFavorite ? <NavIcon name="heart" size={20} color={COLORS.amber} filled /> : null}
          onCountClick={b.isFavorite && onToggleFavorite ? () => onToggleFavorite(b.code) : null}
          countLabel={`${fullName} : retirer des favoris`}
          isLast={isLast}
          onOpen={() => viewBibro(b.code)}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      {/* Titre, bouton « + » (ajouter un Bibax) et nombre de Bibax : toujours sur une seule ligne, même avec 9.999 Bibax (Mehdi, 2026-11-18). Le « + » est entre le titre et le nombre, rond de 32 px avec 18 px d'écart avec lui (Mehdi, 2026-11-18 : plus petit — essai à 36 puis 32 px — et un peu décalé vers la gauche ; avant : 44 px et 10 px) ; le nombre est en 23 px ; le titre rétrécit un peu sur un écran étroit (26 px jusqu'à 390 px de large, puis 6,7 % de la largeur). */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "min(26px, 6.7vw)", margin: "4px 0 0 0", lineHeight: 1.2, display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>
          <img src={bibaxIconUrl} alt="" style={{ width: "24px", height: "24px", flexShrink: 0 }} />
          <span>
            <span style={{ color: COLORS.ink }}>Mes Biba</span>
            <span style={{ color: COLORS.amber }}>x</span>
          </span>
        </h1>
        <button
          onClick={goToAddBibro}
          title="Ajouter un Bibax"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: COLORS.amber,
            border: "none",
            color: COLORS.paper,
            fontSize: "18px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginRight: "8px",
          }}
        >
          +
        </button>
        <span
          style={{
            fontFamily: "'Urbanist', sans-serif",
            fontSize: "23px",
            color: COLORS.amberDark,
            fontWeight: 700,
            background: COLORS.paperAlt,
            border: `2px solid ${COLORS.amberDark}`,
            borderRadius: "10px",
            padding: "2px 10px",
            flexShrink: 0,
          }}
        >
          {formatCount(bibros.length)}
        </span>
      </div>

      <PillTabs
        tabs={[
          { key: "bibax", label: { prefix: "Biba", accent: "x" } },
          { key: "suggestions", label: "Suggestions" },
          { key: "requests", label: "Demandes", badge: <TabBadge count={requests.pending ? requests.pending.length : 0} background={COLORS.pinkFluo} color="#fff" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "bibax" && (
        <>
          {/* Champ de recherche avec une croix au bout (visible dès qu'il y a du texte) pour l'effacer d'un geste (Mehdi, 2026-11-18). */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, marginBottom: "16px", boxSizing: "border-box" }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : prénom, nom, surnom, ville..."
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", fontSize: "14px", outline: "none", padding: 0 }}
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", margin: "-4px", flexShrink: 0, display: query.length > 0 ? "flex" : "none" }}
            >
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>

          {/* Classement de la liste : prénom (au départ), nom de famille, nom d'utilisateur (Mehdi, 2026-11-18). Inutile avec un seul Bibax. */}
          {bibros.length > 1 && <PillTabs tabs={BIBAX_SORTS} active={sort} onChange={setSort} fine marginBottom="14px" />}

          {bibros.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "16px" }}>Pas encore de Bibax — ajoutez-en un avec son code.</p>}
          {bibros.length > 0 && alphaBibros.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "16px" }}>Aucun Bibax ne correspond à cette recherche.</p>}
          {searching && alphaBibros.length > 0 && (
            <p data-bibax-result-count style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 12px" }}>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber }}>{formatCount(alphaBibros.length)}</span> Bibax
            </p>
          )}
          {alphaBibros.length > 0 && (
            <div ref={listRef} style={{ position: "relative", marginBottom: "16px" }}>
              {alphaOn && <AlphaIndex available={alphaLetters} scrollRef={mainScrollRef} targetFor={alphaTarget} />}
              {favBibros.length > 0 && (
                <CheckGroup label="Favoris" mark isFirst>
                  {favBibros.map((b, i) => bibaxRow(b, i === favBibros.length - 1, false))}
                </CheckGroup>
              )}
              <CheckGroup label={favBibros.length > 0 ? "Tous mes Bibax" : ""} labelNode={<>Tous mes Biba<span style={{ color: COLORS.amber }}>x</span></>} mark isFirst={favBibros.length === 0}>
                {alphaBibros.map((b, i) => bibaxRow(b, i === alphaBibros.length - 1, true))}
              </CheckGroup>
            </div>
          )}
        </>
      )}

      {tab === "suggestions" && (
        <div style={{ marginBottom: "16px" }}>
          <BibaxSuggestionsPanel suggestions={suggestions} busyCode={suggestionBusyCode} onOpenProfile={openBibaxProfile || (() => {})} onAdd={addSuggestion} onDismiss={dismissSuggestion} />
        </div>
      )}

      {tab === "requests" && (
        <div style={{ marginBottom: "16px" }}>
          <BibaxRequestsPanel {...requests} onOpenProfile={openBibaxProfile || (() => {})} />
        </div>
      )}

      <BackFooterLink onClick={onBack} />
    </div>
  );
}

// Retour d'une fiche (norme de l'app, voir `useListReturn`) : la liste se remet à la hauteur où on l'avait laissée ; la flèche retour vers la fiche du Bibax efface la mémoire.
// Une ligne de la liste des Bibax d'un autre Bibax (en commun, ou tous) : le rond (anneau rose s'il a une story active, qui s'ouvre au toucher) puis son identité.
function BibaxLinkRow({ b, stories, onOpen, onOpenStoryAuthor }) {
  const hasStory = stories.length > 0;
  return (
    <div
      onClick={() => onOpen(b.code)}
      style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", cursor: "pointer" }}
    >
      <div
        onClick={hasStory ? (e) => { e.stopPropagation(); onOpenStoryAuthor?.({ authorId: b.userId, authorName: b.name, authorAvatarUrl: b.avatarUrl, stories }); } : undefined}
        style={{
          // Même rond que dans « Mes Bibax » (voir `CARD_AVATAR`) : 48 px en tout ; avec une story, l'anneau rose (2 px + 2 px d'écart) est pris DANS les 48 px, sans story le rond est plein.
          width: `${CARD_AVATAR}px`,
          height: `${CARD_AVATAR}px`,
          borderRadius: "50%",
          border: hasStory ? "2px solid #FF2C8F" : "none",
          padding: hasStory ? "2px" : 0,
          boxSizing: "border-box",
          margin: avatarOverhang(38, 38),
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: hasStory ? "pointer" : "default",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {b.avatarUrl ? <img src={b.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={Math.round((CARD_AVATAR - (hasStory ? 8 : 0)) / 2)} color={COLORS.amber} />}
        </div>
      </div>
      <BibaxIdentity name={b.name} lastName={b.lastName} username={b.username} nickname={b.nickname} city={b.city} locality={b.locality} country={b.country} style={{ flex: 1, fontSize: "15px" }} />
    </div>
  );
}

export function MutualBibaxScreen({ bibros, bibroName, onBack: onBackProp, onViewBibro: onViewBibroProp, onOpenStoryAuthor, mainScrollRef }) {
  const { save, open, leave } = useListReturn("mutualBibax", mainScrollRef, { valid: (m) => m.ctx === `${bibroName}|${bibros.length}` });
  const onBack = leave(onBackProp);
  const onViewBibro = open(onViewBibroProp);
  useEffect(() => {
    save({ ctx: `${bibroName}|${bibros.length}` });
  }, [bibroName, bibros.length]);
  const [pulseStories, setPulseStories] = useState([]);

  useEffect(() => {
    loadPulseStories().then(setPulseStories);
  }, []);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 20px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0, lineHeight: 1.2 }}>
          Bibax en commun {bibroName && <>avec <span style={{ color: COLORS.amber }}>{bibroName}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {bibros.map((b) => (
          <BibaxLinkRow key={b.code} b={b} stories={pulseStories.filter((s) => s.authorId === b.userId)} onOpen={onViewBibro} onOpenStoryAuthor={onOpenStoryAuthor} />
        ))}
      </div>

      <BackFooterLink onClick={onBack} />
    </div>
  );
}

// Le bloc « Bibax » de la fiche d'un Bibax (Mehdi, 2026-11-19) : la liste de SES Bibax, avec les mêmes lignes que « Bibax en commun » (rond, nom, @nom, ville · pays). Elle est lue par
// `get_bibax_of` (script bibamus-sql-bibax-listes-3-bibax), qui respecte son partage « Liste de Bibax » et ne dit jamais qui l'on est soi-même dans la liste ; une personne qui ne la partage
// pas laisse un message à la place de la liste. Une ligne ouvre la fiche de la personne (`onViewBibro` : à Mes Bibax si c'est l'un des miens, sinon son profil public), dont le retour ramène ici.
// Comme dans « Mes Bibax » (Mehdi, 2026-11-19) : un champ de recherche (prénom, nom, surnom, ville, pays ; croix pour l'effacer, nombre de résultats pendant une recherche) et, à partir de 30 Bibax,
// l'index des lettres sur le bord droit (première lettre du prénom). Le classement reste celui du prénom ; la recherche est gardée au retour d'une fiche.
export function BibroBibaxListScreen({ other, onBack: onBackProp, onViewBibro: onViewBibroProp, onOpenStoryAuthor, mainScrollRef }) {
  const { restored, save, open, leave } = useListReturn("bibroBibaxList", mainScrollRef, { valid: (m) => m.ctx === other.userId });
  const onBack = leave(onBackProp);
  const onViewBibro = open(onViewBibroProp);
  const [list, setList] = useState(restored ? restored.list : null); // null = chargement
  const [query, setQuery] = useState(restored ? restored.query || "" : "");
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pulseStories, setPulseStories] = useState([]);

  useEffect(() => {
    loadPulseStories().then(setPulseStories);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadBibroBibaxList(other.userId).then(async (result) => {
      if (cancelled) return;
      if (result?.hidden) {
        setHidden(true);
        setList([]);
        return;
      }
      if (!result) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide ; au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setList((prev) => prev || []);
        }
        return;
      }
      const withNames = await attachUsernames(result.list);
      if (cancelled) return;
      setList((prev) => (prev && JSON.stringify(prev) === JSON.stringify(withNames) ? prev : withNames));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (list === null || error) return;
    save({ list, ctx: other.userId, query });
  }, [list, error, query]);

  // Même règle de recherche que partout dans l'app (voir makeSearchMatcher), même classement que « Mes Bibax » classé par prénom.
  const matchesText = makeSearchMatcher(query);
  const shown = (list || [])
    .filter((b) => matchesText(b.name, b.lastName, b.nickname, b.city, b.country))
    .sort((a, b) => bibaxCollator.compare(a.name || "", b.name || "") || bibaxCollator.compare(a.lastName || "", b.lastName || "") || bibaxCollator.compare(a.code || "", b.code || ""));
  const searching = query.trim() !== "";
  const alphaOn = showAlphaIndex("alpha", shown.length);
  const alphaLetters = alphaOn ? [...new Set(shown.map((b) => letterOf(b.name || "")))] : [];
  const alphaTarget = (letter) => {
    const at = shown.findIndex((b) => letterOf(b.name || "") === letter);
    return at < 0 ? null : listRef.current?.querySelectorAll("[data-bibax-az-row]")[at] || null;
  };

  const note = { fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" };
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle iconUrl={bibaxIconUrl} subtitle={<>de <strong style={{ color: COLORS.ink, fontWeight: 700 }}>{other.name}</strong></>}>
        Biba<span style={{ color: COLORS.amber }}>x</span>
      </ScreenTitle>

      {list === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
      ) : error ? (
        <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
          Impossible de charger les Bibax de {other.name}.{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
            Réessayer
          </button>
        </p>
      ) : hidden ? (
        <p data-check-empty style={note}>{other.name} ne partage pas sa liste de Bibax.</p>
      ) : list.length === 0 ? (
        <p data-check-empty style={note}>{other.name} n'a pas d'autre Bibax que toi pour l'instant.</p>
      ) : (
        <>
          {/* Champ de recherche avec une croix au bout (visible dès qu'il y a du texte), comme dans « Mes Bibax ». */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, marginBottom: "16px", boxSizing: "border-box" }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : prénom, nom, surnom, ville..."
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", fontSize: "14px", outline: "none", padding: 0 }}
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", margin: "-4px", flexShrink: 0, display: query.length > 0 ? "flex" : "none" }}
            >
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          </div>
          {shown.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "16px" }}>Aucun Bibax ne correspond à cette recherche.</p>}
          {searching && shown.length > 0 && (
            <p data-bibax-result-count style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 12px" }}>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber }}>{formatCount(shown.length)}</span> Bibax
            </p>
          )}
          {shown.length > 0 && (
            <div ref={listRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "10px" }}>
              {alphaOn && <AlphaIndex available={alphaLetters} scrollRef={mainScrollRef} targetFor={alphaTarget} />}
              {shown.map((b) => (
                <div key={b.code} data-bibax-az-row="">
                  <BibaxLinkRow b={b} stories={pulseStories.filter((s) => s.authorId === b.userId)} onOpen={onViewBibro} onOpenStoryAuthor={onOpenStoryAuthor} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <BackFooterLink onClick={onBack} />
    </div>
  );
}

// Seuls les rôles d'administrateur et de modérateur s'affichent : un simple membre n'a rien à ajouter au nombre de membres (Mehdi, 2026-11-19, question 6).
const CLUB_ROLE_LABEL = { admin: "Admin", moderator: "Modérateur" };

// Le bloc « BibaClub » de la fiche d'un Bibax (Mehdi, 2026-11-19) : les BibaClub PUBLICS dont cette personne est membre, avec les mêmes lignes que « Mes BibaClub » (rond du club, nom en gras,
// catégorie · mode d'adhésion) et, dessous, le nombre de membres actifs du club et, seulement pour un administrateur ou un modérateur, le rôle de la personne (Mehdi, 2026-11-19 : « oui, les deux », puis « n'afficher que le rôle d'admin et modérateur »). Un club privé n'apparaît jamais ; une demande d'entrée encore en attente ne compte pas. La liste vient de `get_bibax_public_clubs` (script
// bibamus-sql-bibax-clubs-publics), qui exige d'être Bibax confirmé de la personne. Une ligne ouvre la page du club (aperçu « Rejoindre » si l'on n'en fait pas partie), dont le retour ramène ici ;
// la flèche retour de cette page ramène à la fiche (la mémoire de la liste est alors effacée, comme pour les autres sous-listes d'une fiche).
export function BibroClubsScreen({ other, onBack: onBackProp, onOpenClub: onOpenClubProp, mainScrollRef }) {
  const { restored, save, open, leave } = useListReturn("bibroClub", mainScrollRef, { valid: (m) => m.ctx === other.userId });
  const onBack = leave(onBackProp);
  const onOpenClub = open(onOpenClubProp);
  const [list, setList] = useState(restored ? restored.list : null); // null = chargement
  const [error, setError] = useState(false);
  const [hidden, setHidden] = useState(false); // la personne ne partage pas ses BibaClub (Paramètres > Fonctionnalités > BibaClubs)
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadBibroPublicClubs(other.userId).then((result) => {
      if (cancelled) return;
      if (result?.hidden) {
        setHidden(true);
        setList([]);
        return;
      }
      if (!result) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide ; au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setList((prev) => prev || []);
        }
        return;
      }
      setList((prev) => (prev && JSON.stringify(prev) === JSON.stringify(result.list) ? prev : result.list));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (list === null || error) return;
    save({ list, ctx: other.userId });
  }, [list, error]);

  const note = { fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" };
  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle icon={<NavIcon name="crown" size={24} color={COLORS.amber} />} subtitle={<>de <strong style={{ color: COLORS.ink, fontWeight: 700 }}>{other.name}</strong></>}>
        <span style={{ color: COLORS.ink }}>Biba</span>
        <span style={{ color: COLORS.amber }}>Club</span>
      </ScreenTitle>

      {list === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
      ) : error ? (
        <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
          Impossible de charger les BibaClub de {other.name}.{" "}
          <button
            type="button"
            onClick={() => {
              setList(null);
              setAttempt((n) => n + 1);
            }}
            style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}
          >
            Réessayer
          </button>
        </p>
      ) : hidden ? (
        <p data-check-empty style={note}>{other.name} ne partage pas ses BibaClub.</p>
      ) : list.length === 0 ? (
        <p data-check-empty style={note}>{other.name} n'est membre d'aucun BibaClub public pour l'instant.</p>
      ) : (
        <>
          <div data-bibro-clubs style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px", marginBottom: "10px" }}>
            {list.map((c, i) => (
              <div key={c.id} style={{ borderBottom: i === list.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                <ClubRow
                  club={c}
                  subtitle={[c.category, JOIN_MODE_LABEL[c.joinMode]].filter(Boolean).join(" · ")}
                  detail={[`${formatCount(c.memberCount)} ${c.memberCount > 1 ? "membres" : "membre"}`, CLUB_ROLE_LABEL[c.memberRole]].filter(Boolean).join(" · ")}
                  onClick={() => onOpenClub(c.id)}
                />
              </div>
            ))}
          </div>
          <p style={note}>Seuls les BibaClub publics sont affichés : un club privé ne l'est jamais.</p>
        </>
      )}

      <BackFooterLink onClick={onBack} />
    </div>
  );
}

// Fiche d'un Bibax confirmé (« Mes Bibax »). Sous le bloc du rond de profil, trois onglets (mêmes pastilles que Mon Profil) :
//   - Infos     : le bloc des infos de la personne, la relation (Bibax / BibaPing / Bibax en commun), les trois blocs
//                 Bibax / Drink Checks / Place Checks et les deux petits blocs d'accès (BibaClub, Médias grisé « Soon ») ;
//   - Biba360   : ses statistiques partagées (ex-écran « Statistiques de … », devenu l'onglet : plus de petit bloc d'accès) ;
//   - BibaPulse : ses publications dans BibaPulse, en vraies cartes (ex-extrait de trois lignes + écran « Activité de … »).
// Retour sur l'onglet BibaPulse : quand on ouvre un lieu, un produit, une marque ou un producteur depuis une carte puis qu'on revient,
// la fiche se rouvre sur cet onglet, calée sur la carte (pulseReturnEntryId / onRememberPulseEntry, comme sur Mon Profil).
export function BibroDetailScreen({ bibro, myUserId, myBibroCode, onBack, previewNotice, onToggleFavorite, onRemove, goToBibaxPhotos, onBlock, onOpenStoryAuthor, onViewMutualBibax, goToBibroBibaxList, goToBibroDrinkChecks, goToBibroPlaceChecks, goToBibroClub, onOpenVenue, onOpenDrink, onOpenBrand, onOpenProducer, pulseReturnEntryId = null, onRememberPulseEntry }) {
  const [activeTab, setActiveTab] = useState(pulseReturnEntryId ? "bibapulse" : "infos");
  const [mutualCount, setMutualCount] = useState(null);
  const [bibaxCount, setBibaxCount] = useState(null);
  const [stats, setStats] = useState(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showRemoveSheet, setShowRemoveSheet] = useState(false);
  const [notifyPulse, setNotifyPulse] = useState(bibro?.notifyPulse || false);
  const [togglingNotify, setTogglingNotify] = useState(false);
  // La cloche part de son état réel (lu côté serveur) : elle reste grisée le temps de la lecture, pour qu'un appui ne bascule
  // jamais une cloche qu'on croit éteinte alors qu'elle est allumée. Si la lecture échoue, elle redevient utilisable (éteinte au départ).
  const [notifyLoaded, setNotifyLoaded] = useState(false);
  const [activeStories, setActiveStories] = useState([]);

  // BibaPing — l'enveloppe ouvre (ou crée) le tête-à-tête avec cette personne, puis affiche la
  // discussion à la place de la fiche. Même principe que BibaPing : la navigation reste interne
  // au composant, sans passer par le routeur.
  const [openingConversation, setOpeningConversation] = useState(false);
  const [openConversation, setOpenConversation] = useState(null);
  const handleOpenConversation = async () => {
    if (!bibro?.userId) {
      alert("Impossible d'ouvrir une conversation avec ce Bibax pour l'instant.");
      return;
    }
    setOpeningConversation(true);
    const result = await openDirectConversation(bibro.userId);
    setOpeningConversation(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setOpenConversation({ id: result.id, kind: "direct", memberIds: [myUserId, bibro.userId] });
  };

  useEffect(() => {
    if (!bibro?.code) return;
    let cancelled = false;
    setNotifyLoaded(false);
    loadNotifyPulse(bibro.code).then((value) => {
      if (cancelled) return;
      if (value !== null) setNotifyPulse(value);
      setNotifyLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bibro?.code]);

  const handleToggleNotify = async () => {
    setTogglingNotify(true);
    const result = await toggleNotifyPulse(bibro.code);
    setTogglingNotify(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setNotifyPulse(result.notifyPulse);
  };

  useEffect(() => {
    if (!bibro?.userId) return;
    loadMutualBibaxCount(bibro.userId).then(setMutualCount);
    loadBibaxCount(bibro.userId).then(setBibaxCount);
    loadMyProfileStats(bibro.userId).then(setStats);
    loadPulseStories().then((stories) => setActiveStories(stories.filter((s) => s.authorId === bibro.userId)));
  }, [bibro?.userId]);

  const age = bibro.shareAge !== false ? computeAgeFromBirthDate(bibro.birthDate) : null;
  const hasSocials = bibro.facebookUrl || bibro.instagramUrl || bibro.tiktokUrl || bibro.snapchatUrl || bibro.whatsappUrl || bibro.xUrl || bibro.threadsUrl || bibro.linkedinUrl || bibro.pinterestUrl || bibro.twitchUrl;
  const hasInfoBlock = bibro.bio || bibro.birthDate || bibro.city || bibro.registeredAt || hasSocials;

  const StatCard = ({ label, value, onClick }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "12px",
        padding: "8px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ fontSize: "9.5px", color: COLORS.ink, lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", color: COLORS.amber, lineHeight: 1 }}>{value != null ? formatCount(value) : "…"}</span>
    </button>
  );

  // La discussion remplace entièrement la fiche ; le retour ramène ici.
  if (openConversation) {
    return (
      <ConversationScreen
        conversation={openConversation}
        myUserId={myUserId}
        title={[bibro.name, bibro.lastName].filter(Boolean).join(" ")}
        photoUrl={bibro.avatarUrl}
        onOpenProfile={() => setOpenConversation(null)}
        onBack={() => setOpenConversation(null)}
      />
    );
  }

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      {previewNotice && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: COLORS.inkSoft }}>
          {previewNotice}
        </div>
      )}

      <div style={{ position: "relative", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "10px 16px", marginTop: "4px", marginBottom: "10px" }}>
        <button
          onClick={handleToggleNotify}
          disabled={togglingNotify || !notifyLoaded}
          title={notifyPulse ? "Suivi sur Pulse — toutes ses activités apparaissent" : "Suivre sur Pulse"}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            background: "none",
            border: "none",
            cursor: togglingNotify || !notifyLoaded ? "default" : "pointer",
            opacity: notifyLoaded ? 1 : 0.4,
            padding: 0,
          }}
        >
          <NavIcon name="bell" size={26} color={notifyPulse ? COLORS.amber : COLORS.paperAlt} filled={notifyPulse} />
        </button>
        {onToggleFavorite && bibro.userId && (
          <button
            onClick={onToggleFavorite}
            title={bibro.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-label={bibro.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={!!bibro.isFavorite}
            style={{
              position: "absolute",
              top: "12px",
              right: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <NavIcon name="heart" size={26} color={bibro.isFavorite ? COLORS.amber : COLORS.paperAlt} filled={!!bibro.isFavorite} />
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <div
            onClick={activeStories.length > 0 ? () => onOpenStoryAuthor?.({ authorId: bibro.userId, authorName: bibro.name, authorAvatarUrl: bibro.avatarUrl, stories: activeStories }) : undefined}
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "50%",
              border: `3px solid ${activeStories.length > 0 ? "#FF2C8F" : "transparent"}`,
              padding: "2px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeStories.length > 0 ? "pointer" : "default",
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {bibro.avatarUrl ? <img src={bibro.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={48} color={COLORS.amber} />}
            </div>
          </div>
          {/* paddingRight : le nom ne passe jamais sous le cœur et la cloche (placés en haut à droite du bloc) ; un très long nom revient à la ligne. */}
          <div style={{ minWidth: 0, paddingRight: onToggleFavorite && bibro.userId ? "54px" : "36px" }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0, overflowWrap: "anywhere" }}>{bibro.name}</h1>
            {bibro.lastName && <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0, overflowWrap: "anywhere" }}>{bibro.lastName}</h1>}
            {bibro.nickname && <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13.5px", color: COLORS.amber, margin: "3px 0 0" }}>{bibro.nickname}</p>}
          </div>
        </div>
      </div>

      <PillTabs
        tabs={[
          { key: "infos", label: "Infos" },
          { key: "biba360", label: { prefix: "Biba", accent: "360" } },
          { key: "bibapulse", label: { prefix: "Biba", accent: "Pulse" } },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        medium
      />

      {activeTab === "infos" && (
        <>
      {hasInfoBlock && (
        <div
          style={{
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12.5px",
            color: COLORS.inkSoft,
          }}
        >
          {bibro.bio && <p style={{ fontSize: "13px", color: COLORS.ink, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>"{bibro.bio}"</p>}
          {(bibro.birthDate || bibro.city) && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {bibro.birthDate && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <img src={birthdayIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                  {formatSharedBirthDate(bibro.birthDate)}
                  {age != null && ` (${age} ans)`}
                </span>
              )}
              {bibro.birthDate && bibro.city && <span style={{ fontSize: "18px", lineHeight: 1, color: COLORS.paperAlt }}>|</span>}
              {bibro.city && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <img src={residenceIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                  {bibro.city} {bibro.country && <CountryFlagImg country={bibro.country} size={14} />}
                </span>
              )}
            </div>
          )}
          {bibro.registeredAt && <div>Sur Bibamus depuis {formatMemberSince(bibro.registeredAt)}</div>}
          {hasSocials && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
              {bibro.whatsappUrl && (
                <a href={normalizeUrl(bibro.whatsappUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <WhatsappIcon size={24} />
                </a>
              )}
              {bibro.facebookUrl && (
                <a href={normalizeUrl(bibro.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <FacebookIcon size={24} />
                </a>
              )}
              {bibro.instagramUrl && (
                <a href={normalizeUrl(bibro.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <InstagramIcon size={24} />
                </a>
              )}
              {bibro.tiktokUrl && (
                <a href={normalizeUrl(bibro.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TiktokIcon size={24} />
                </a>
              )}
              {bibro.snapchatUrl && (
                <a href={normalizeUrl(bibro.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <SnapchatIcon size={24} />
                </a>
              )}
              {bibro.xUrl && (
                <a href={normalizeUrl(bibro.xUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <XIcon size={24} />
                </a>
              )}
              {bibro.threadsUrl && (
                <a href={normalizeUrl(bibro.threadsUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <ThreadsIcon size={24} />
                </a>
              )}
              {bibro.linkedinUrl && (
                <a href={normalizeUrl(bibro.linkedinUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <LinkedinIcon size={24} />
                </a>
              )}
              {bibro.pinterestUrl && (
                <a href={normalizeUrl(bibro.pinterestUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <PinterestIcon size={24} />
                </a>
              )}
              {bibro.twitchUrl && (
                <a href={normalizeUrl(bibro.twitchUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TwitchIcon size={24} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ligne des trois blocs (Mehdi, 2026-11-18) : « Bibax ✓ » et BibaPing sont étroits (80 et 48 px, ce dernier carré) pour laisser le plus de largeur au bloc « N Bibax en commun », qui doit tenir sur une ligne même avec deux ou trois chiffres sur un iPhone. */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <button
          onClick={() => setShowRemoveSheet(true)}
          style={{
            width: "80px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "14px",
            padding: "12px 6px",
            fontSize: "12.5px",
            fontWeight: 700,
            color: COLORS.amber,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${COLORS.amber}` }}>
            <NavIcon name="check" size={11} color={COLORS.amber} />
          </span>
          Bibax
        </button>
        <button
          onClick={handleOpenConversation}
          disabled={openingConversation}
          title={`Écrire à ${bibro.name}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            flexShrink: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "14px",
            cursor: openingConversation ? "default" : "pointer",
            opacity: openingConversation ? 0.5 : 1,
          }}
        >
          {/* Icône BibaPing plutôt qu'une enveloppe générique — contrainte en hauteur
              uniquement, pour ne pas déformer un ratio non carré. */}
          <img src={bibaPingIconUrl} alt="" style={{ height: "26px" }} />
        </button>
        <div
          onClick={mutualCount > 0 ? () => onViewMutualBibax(bibro.userId, bibro.name) : undefined}
          style={{
            flex: 2,
            display: "flex",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "14px",
            fontSize: "12.5px",
            color: COLORS.inkSoft,
            textAlign: "center",
            cursor: mutualCount > 0 ? "pointer" : "default",
          }}
        >
          {/* L'icône Bibax à gauche, séparée du texte par une barre verticale de la couleur du contour (2 px, de haut en bas du bloc) — Mehdi, 2026-11-18 ; la barre ne prend presque pas de place. Le texte se centre dans la place qui reste. */}
          <div data-mutual-icon-block style={{ width: "34px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: `2px solid ${COLORS.paperAlt}` }}>
            <img src={bibaxIconUrl} alt="" style={{ width: "18px", height: "18px" }} />
          </div>
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 3px" }}>{mutualCount != null ? mutualCount : "…"} Bibax en commun</span>
        </div>
      </div>

      {showRemoveSheet && (
        <div
          onClick={() => setShowRemoveSheet(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
            <button
              onClick={() => {
                setShowRemoveSheet(false);
                onRemove();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "none",
                border: "none",
                padding: "14px 6px",
                fontSize: "15px",
                fontWeight: 600,
                color: COLORS.ink,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <img src={bibaxIconUrl} alt="" style={{ width: "22px", height: "22px" }} />
                <span style={{ position: "absolute", top: "-4px", right: "-8px" }}>
                  <NavIcon name="x" size={13} color={COLORS.wine} />
                </span>
              </span>
              Retirer de mes Bibax
            </button>
            {onBlock && (
              <button
                onClick={() => {
                  setShowRemoveSheet(false);
                  setConfirmingBlock(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "none",
                  border: "none",
                  padding: "14px 6px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: COLORS.ink,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <NavIcon name="no-entry" size={20} color={COLORS.wine} />
                Bloquer {bibro.name} {bibro.lastName}
              </button>
            )}
            <button
              disabled
              title="Bientôt disponible"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "none",
                border: "none",
                padding: "14px 6px",
                fontSize: "15px",
                fontWeight: 600,
                color: COLORS.ink,
                opacity: 0.4,
                cursor: "not-allowed",
                textAlign: "left",
              }}
            >
              <NavIcon name="alert-triangle" size={20} color={COLORS.ink} />
              Signaler {bibro.name} {bibro.lastName}
            </button>
            <button
              onClick={() => setShowRemoveSheet(false)}
              style={{ width: "100%", padding: "14px 6px", background: "none", border: "none", fontSize: "15px", fontWeight: 600, color: COLORS.inkSoft, cursor: "pointer", textAlign: "left" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 14px" }} />
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {/* Les trois blocs ouvrent, en lecture seule, les listes de cette personne — mêmes pages que sur Mon Profil (Mehdi, 2026-11-19). */}
        <StatCard label={<>Biba<span style={{ color: COLORS.amber }}>x</span></>} value={bibaxCount} onClick={goToBibroBibaxList ? () => goToBibroBibaxList(bibro.userId, bibro.name) : undefined} />
        <StatCard label={<>Drink<span style={{ color: COLORS.amber }}>Checks</span></>} value={stats ? stats.tastedDrinksCount : null} onClick={goToBibroDrinkChecks ? () => goToBibroDrinkChecks(bibro.userId, bibro.name) : undefined} />
        <StatCard label={<>Place<span style={{ color: COLORS.amber }}>Checks</span></>} value={stats ? stats.venueCheckinsCount : null} onClick={goToBibroPlaceChecks ? () => goToBibroPlaceChecks(bibro.userId, bibro.name) : undefined} />
      </div>

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 14px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
        {/* Deux blocs, au format de ceux de Mon Profil (Mehdi, 2026-11-19) : « BibaClub » en premier (les BibaClub publics de cette personne), « Médias » à sa droite, grisé avec « Soon »
            (pas encore conçu : plus d'ouverture de ses photos). Plus de bloc « Historique » : l'historique n'a d'intérêt que pour soi. */}
        <ActionCard icon={<NavIcon name="crown" size={20} color={COLORS.amber} />} title="BibaClub" onClick={goToBibroClub ? () => goToBibroClub(bibro.userId, bibro.name) : undefined} singleLine />
        <ActionCard icon={<NavIcon name="camera" size={20} color={COLORS.amber} />} title="Médias" disabled badge="Soon" singleLine />
      </div>

      {onBlock && confirmingBlock && (
        <div style={{ marginTop: "18px" }}>
          <p style={{ fontSize: "13px", color: "#FF3B3B", marginBottom: "10px", textAlign: "center" }}>
            Bloquer {bibro.name} {bibro.lastName} ? Ton lien Bibax sera supprimé et vous ne pourrez plus vous ajouter mutuellement.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setConfirmingBlock(false)}
              style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontWeight: 700, cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                setBlocking(true);
                await onBlock(bibro.userId);
                setBlocking(false);
              }}
              disabled={blocking}
              style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "2px solid #FF3B3B", background: "none", color: "#FF3B3B", fontWeight: 700, cursor: "pointer" }}
            >
              {blocking ? "..." : "Confirmer le blocage"}
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === "biba360" && <BibaxStatsContent userId={bibro.userId} displayName={bibro.alias || bibro.name} />}

      {activeTab === "bibapulse" && (
        <EntityPulseSection
          entityType="bibax"
          entityId={bibro.userId}
          myUserId={myUserId}
          myBibroCode={myBibroCode}
          onOpenVenue={onOpenVenue}
          onOpenDrink={onOpenDrink}
          onOpenBrand={onOpenBrand}
          onOpenProducer={onOpenProducer}
          returnEntryId={pulseReturnEntryId}
          onRememberEntry={onRememberPulseEntry}
        />
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
export function AddBibroScreen({ onAdd, onLookup, onCancel, myBibroCode, bibros = [] }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notFound
  const [foundName, setFoundName] = useState("");
  const [foundSocials, setFoundSocials] = useState({});
  const [foundUsername, setFoundUsername] = useState("");
  const [mutualBibaxCount, setMutualBibaxCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState([]);
  const [nameSearching, setNameSearching] = useState(false);

  useEffect(() => {
    // « @nom » : recherche EXACTE d'un seul compte par son nom d'utilisateur (pas de recherche partielle).
    // Le serveur rend le code Bibax du compte trouvé ; on récupère ensuite le profil comme pour un code
    // saisi (mêmes réglages de confidentialité). Une marque, un lieu ou un producteur qui porte ce @nom
    // n'est pas un Bibax : même réponse que « introuvable ».
    const atName = usernameFromQuery(nameQuery);
    if (atName) {
      let cancelled = false;
      setNameSearching(true);
      const timer = setTimeout(async () => {
        let results = [];
        const found = await lookupUsername(atName);
        if (found && found.kind === "user" && found.bibroCode) {
          const identity = await onLookup(found.bibroCode);
          if (identity && identity.displayName) {
            results = [
              {
                bibroCode: found.bibroCode,
                username: found.username,
                displayName: identity.displayName,
                avatarUrl: identity.avatarUrl,
                firstName: identity.firstName,
                lastName: identity.lastName,
                nickname: identity.nickname,
                city: identity.city,
                country: identity.country,
                mutual: identity.mutualBibaxCount || 0,
              },
            ];
          }
        }
        if (cancelled) return;
        setNameResults(results);
        setNameSearching(false);
      }, 350);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    if (nameQuery.trim().length < 2) {
      setNameResults([]);
      return;
    }
    setNameSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await searchBibaxByName(nameQuery.trim());
      // Le @nom de chaque résultat (ligne 2) : la recherche par nom ne le rend pas, on le lit à part à partir des codes Bibax.
      // Et le nombre de Bibax en commun (ligne 4), lu en même temps.
      const [names, mutuals] = await Promise.all([loadUsernamesByBibroCodes(results.map((r) => r.bibroCode)), loadMutualCountsByBibroCodes(results.map((r) => r.bibroCode))]);
      if (cancelled) return;
      setNameResults(results.map((r) => ({ ...r, username: names[(r.bibroCode || "").toUpperCase()] || "", mutual: mutuals[(r.bibroCode || "").toUpperCase()] ?? null })));
      setNameSearching(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nameQuery]);

  const selectNameResult = (result) => {
    setNameQuery("");
    setNameResults([]);
    setCode(result.bibroCode);
    handleLookup(result.bibroCode);
  };

  const alreadyBibax = status === "found" && bibros.some((b) => b.code === code.trim().toUpperCase());

  const handleLookup = async (explicitCode) => {
    const codeToUse = explicitCode || code;
    if (codeToUse.trim().length !== 6) return;
    setStatus("loading");
    // Le profil et son @nom se lisent en même temps (le @nom : ligne 2 de la carte).
    const [identity, names] = await Promise.all([onLookup(codeToUse.trim()), loadUsernamesByBibroCodes([codeToUse.trim()])]);
    if (identity && identity.displayName) {
      setFoundName(identity.displayName);
      setFoundUsername(names[codeToUse.trim().toUpperCase()] || "");
      setFoundSocials({
        avatarUrl: identity.avatarUrl || null,
        firstName: identity.firstName || "",
        lastName: identity.lastName || "",
        nickname: identity.nickname || "",
        city: identity.city || "",
        country: identity.country || "",
        facebookUrl: identity.facebookUrl || "",
        instagramUrl: identity.instagramUrl || "",
        tiktokUrl: identity.tiktokUrl || "",
        snapchatUrl: identity.snapchatUrl || "",
        whatsappUrl: identity.whatsappUrl || "",
        xUrl: identity.xUrl || "",
        threadsUrl: identity.threadsUrl || "",
        linkedinUrl: identity.linkedinUrl || "",
        pinterestUrl: identity.pinterestUrl || "",
        twitchUrl: identity.twitchUrl || "",
      });
      setMutualBibaxCount(identity.mutualBibaxCount || 0);
      setStatus("found");
    } else {
      setStatus("notFound");
    }
  };

  const handleCodeChange = (value) => {
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    setStatus("idle");
  };

  const handleScanned = (scannedCode) => {
    setScanning(false);
    setCode(scannedCode);
    handleLookup(scannedCode);
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Ajouter un Biba<span style={{ color: COLORS.amber }}>x</span>
        </h1>
      </div>

      <div style={{ position: "relative", marginTop: "22px", marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "12px 14px",
            boxSizing: "border-box",
          }}
        >
          <NavIcon name="search" size={17} color={COLORS.inkSoft} />
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Rechercher un Bibax ou un @nom..."
            style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
          />
        </div>

        {nameQuery.trim().length >= 2 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 5,
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {nameSearching && <p style={{ fontSize: "13px", color: COLORS.inkSoft, padding: "12px 14px", margin: 0 }}>Recherche...</p>}
            {!nameSearching && nameResults.length === 0 && (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Aucun Bibax trouvé.</p>
            )}
            {!nameSearching &&
              nameResults.map((r) => (
                <button
                  key={r.bibroCode}
                  onClick={() => selectNameResult(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderBottom: `1px solid ${COLORS.paperAlt}`,
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {r.avatarUrl ? <img src={r.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={18} color={COLORS.amber} />}
                  </div>
                  <BibaxIdentity
                    name={r.firstName || r.lastName ? r.firstName : r.displayName}
                    lastName={r.firstName || r.lastName ? r.lastName : ""}
                    username={r.username}
                    nickname={r.nickname}
                    city={r.city}
                    country={r.country}
                    mutual={r.mutual}
                    style={{ flex: 1, fontSize: "13.5px", color: COLORS.ink }}
                  />
                </button>
              ))}
          </div>
        )}
      </div>

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 24px" }} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Code Bibax</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: 0 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "0 14px",
            boxSizing: "border-box",
          }}
        >
          <input
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="000000"
            maxLength={6}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "14px 0",
              border: "none",
              background: "none",
              fontSize: "20px",
              fontFamily: "'Urbanist', sans-serif",
              letterSpacing: "4px",
              textAlign: "center",
              outline: "none",
              color: COLORS.ink,
            }}
          />
          <span style={{ width: "1px", height: "24px", background: COLORS.paperAlt, flexShrink: 0 }} />
          <button
            onClick={() => setScanning(true)}
            title="Scanner un QR code Bibax"
            style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
          >
            <NavIcon name="scan-line" size={18} color={COLORS.amber} />
          </button>
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={code.length !== 6 || status === "loading"}
          style={{
            background: code.length === 6 ? COLORS.amber : COLORS.surfaceAlt,
            color: code.length === 6 ? COLORS.paper : COLORS.chalkWhite,
            border: "none",
            borderRadius: "10px",
            padding: "0 18px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: code.length !== 6 ? "default" : "pointer",
            opacity: code.length !== 6 ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "..." : "Chercher"}
        </button>
      </div>

      {scanning && (
        <SalonQrScannerModal
          onClose={() => setScanning(false)}
          onScanned={handleScanned}
          title="Scanner un QR code Bibax"
          instruction="Visez le QR code affiché sur le profil d'un Bibax"
        />
      )}

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "24px 0" }} />

      {status !== "found" && status !== "notFound" && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", margin: 0 }}>Bibax recherché</p>
      )}

      {status === "found" && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "14px 16px", position: "relative" }}>
          {alreadyBibax ? (
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: COLORS.ink }}>Bibax</span>
              <span style={{ color: COLORS.amber }}>✓</span>
            </div>
          ) : (
            <button
              onClick={async () => {
                const result = await onAdd(code.trim(), foundName, "", foundSocials);
                if (result?.error) return;
                if (result?.status === "pending") {
                  alert(`Demande envoyée à ${foundName} — en attente de sa confirmation.`);
                } else if (result?.status === "already_bibax") {
                  alert(`Vous êtes déjà Bibax avec ${foundName}.`);
                } else if (result?.status === "accepted") {
                  alert(`${foundName} avait déjà envoyé une demande — vous êtes maintenant Bibax !`);
                }
                onCancel();
              }}
              title={`Ajouter ${foundName || "ce Bibax"}`}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: COLORS.amber,
                border: "none",
                color: COLORS.paper,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: COLORS.surfaceAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {foundSocials.avatarUrl ? <img src={foundSocials.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={26} color={COLORS.amber} />}
            </div>
            <div style={{ paddingRight: "36px", flex: 1, minWidth: 0 }}>
              <BibaxIdentity
                wrapName
                name={foundSocials.firstName || foundSocials.lastName ? foundSocials.firstName : foundName}
                lastName={foundSocials.firstName || foundSocials.lastName ? foundSocials.lastName : ""}
                username={foundUsername}
                nickname={foundSocials.nickname}
                city={foundSocials.city}
                country={foundSocials.country}
                style={{ fontSize: "17px" }}
              />
              <div style={{ marginTop: "6px" }}>
                <MutualPill n={mutualBibaxCount} />
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "notFound" && (
        <p style={{ fontSize: "13px", color: COLORS.wine, marginBottom: 0 }}>
          Code introuvable. Vérifie qu'il·elle a bien ouvert l'app et configuré son profil.
        </p>
      )}

      {myBibroCode && (
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Ton code Bibax</div>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QRCodeSVG value={myBibroCode} size={72} color={COLORS.paper} background={COLORS.ink} />
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "26px", letterSpacing: "4px", marginTop: "10px" }}>{myBibroCode}</div>
          </div>
        </div>
      )}

      <PageFooterNav onBack={onCancel} hideBorder />
    </div>
  );
}
