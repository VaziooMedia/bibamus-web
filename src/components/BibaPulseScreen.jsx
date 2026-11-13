import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { COLORS, RATING_LABELS } from "../constants.js";
import { PLACE_INTERACTIONS } from "../placeInteractions.js";
import { PulseInteractionPill } from "./PulseInteractionPill.jsx";
import { NavIcon, CheersIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { loadPulseFeed, togglePulseBix, togglePulseIncoming, toggleSanteReaction, loadPulseReactors, loadPulseComments, postPulseComment, deleteMyPulsePost, previewMyPulseCheckDeletion, deleteMyPulseCheck, loadDrinksByIds, loadVenuesByIds, getSession, pulseClubName } from "../data/sharedDirectories.js";
import { BibaxProfilePreviewScreen } from "./BibaxProfilePreviewScreen.jsx";
import { ProfileNavContext } from "../contexts.js";
import { mergePulseFeedTop, appendOlderPulsePage } from "../pulseFeedMerge.js";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { PulsePostScreen } from "./PulsePostScreen.jsx";
import { PulseTagPills, postTagsOf, usePostTagEntities } from "./PulseTags.jsx";
import { PulseProductCard, PulseDrinkLine, usePulseProducersById, pulseDrinkIdsOf } from "./PulseProductCard.jsx";
import { PulseVenueCard, usePulseVenueRatingsById } from "./PulseVenueCard.jsx";
import beerCheckIconUrl from "../assets/brand/beer-check-profil.png";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";
import bibAtlasIconUrl from "../assets/brand/bibatlas-carte.svg";
import bibaGoIconUrl from "../assets/brand/bibago-carte.svg";
import { PulseRoomCard } from "./PulseRoomCard.jsx";

// Résout l'objet concerné (produit/établissement/marque/producteur) depuis les répertoires déjà
// chargés en mémoire — jamais de duplication de la donnée métier dans BibaPulse lui-même,
// uniquement une référence (object_type/object_id) vers la vraie fiche.
function resolveObject(entry, directories) {
  if (!entry.objectType || !entry.objectId) return null;
  if (entry.objectType === "venue") return directories.venuesById[entry.objectId] || null;
  const map = { drink: directories.drinksDirectory, producer: directories.breweriesDirectory, brand: directories.brandsDirectory };
  return (map[entry.objectType] || []).find((x) => x.id === entry.objectId) || null;
}

// Gabarit textuel par type d'événement — jamais de phrase figée stockée en base, uniquement
// reconstruite ici à partir des données structurées (prêt pour une traduction future).
// Cartes de check : celles que l'on peut supprimer soi-même, avec ou sans la consommation des statistiques.
const CHECK_EVENT_TYPES = ["product_discovered", "drink_checked", "venue_visit"];

// Format neutre "Nom - Action @ Objet" — évite les problèmes d'accord (masculin/féminin,
// préposition selon le nom du lieu) qu'une vraie phrase française poserait.
function pulseActionFor(entry) {
  return { product_discovered: "Découverte", drink_checked: "Check", venue_visit: "Check", database_contribution: "Ajout" }[entry.eventType] || "Activité";
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 5) return "À l'instant";
  if (secs < 60) return `Il y a ${secs} sec.`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Il y a ${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

// Petite liste de personnes (utilisée pour les Bix et les "J'arrive") — nom + avatar.
function ReactorsList({ people, emptyLabel }) {
  if (people.length === 0) return <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "10px 0" }}>{emptyLabel}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
      {people.map((p) => (
        <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <EntityAvatar photoUrl={p.avatarUrl} size={26} />
          <span style={{ fontSize: "13px", color: COLORS.ink }}>{[p.name, p.lastName].filter(Boolean).join(" ")}</span>
        </div>
      ))}
    </div>
  );
}

// Lieux "spéciaux" proposés au check d'un produit : ce ne sont pas de vraies fiches de lieu.
const SPECIAL_VENUE_LABELS = { "@home": "@Home", "@event": "@Event" };

// Contenu d'une publication : photo, note, commentaire, Bibax tagués. Tout vient de entry.metadata,
// déjà vérifié par le serveur (create-pulse-event) — une publication sans contenu n'affiche rien
// de plus. Les textes passent par React (jamais interprétés comme du code).
// Une publication libre porte aussi des tags de fiche (metadata.tags) : leurs noms viennent de tagEntities
// (voir usePostTagEntities), et une pastille mène à la fiche quand tagHandlers sait l'ouvrir.
// Photo et commentaire ajoutés par l'auteur de la carte.
function pulseNoteOf(entry) {
  const meta = entry.metadata || {};
  return {
    comment: typeof meta.comment === "string" ? meta.comment : "",
    photoUrl: typeof meta.photo_url === "string" && meta.photo_url.startsWith("https://") ? meta.photo_url : null,
  };
}

function PulseContent({ entry, onOpenTagged, tagEntities = {}, tagHandlers = {}, hideRating = false, hideNote = false }) {
  const meta = entry.metadata || {};
  const note = pulseNoteOf(entry);
  // hideNote : la photo et le commentaire sont montrés ailleurs dans la carte (sous le bloc du produit, pour un DrinkCheck).
  const comment = hideNote ? "" : note.comment;
  const photoUrl = hideNote ? null : note.photoUrl;
  // hideRating : la note de l'auteur est déjà montrée ailleurs dans la carte (ligne « DrinkCheck »).
  const rating = !hideRating && typeof meta.rating === "number" ? meta.rating : null;
  const tagged = Array.isArray(meta.tagged) ? meta.tagged : [];
  const postTags = postTagsOf(entry).filter((t) => tagEntities[`${t.type}:${t.id}`]);
  if (!comment && !photoUrl && rating === null && tagged.length === 0 && postTags.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
      {photoUrl && (
        <img src={photoUrl} alt="Photo de la publication" loading="lazy" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "10px", display: "block" }} />
      )}
      {rating !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StarsDisplay value={rating} size={16} />
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}>{String(rating).replace(".", ",")}/5</span>
        </div>
      )}
      {comment && <p style={{ margin: 0, fontSize: "13px", color: COLORS.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{comment}</p>}
      {postTags.length > 0 && <PulseTagPills tags={postTags} entities={tagEntities} handlers={tagHandlers} />}
      {tagged.length > 0 && (
        <p style={{ margin: 0, fontSize: "12.5px", color: COLORS.inkSoft }}>
          avec{" "}
          {tagged.map((person, i) => (
            <React.Fragment key={person.id}>
              {i > 0 && ", "}
              {/* Sans code de profil (la personne a refusé l'accès à son profil via un tag) : le tag reste affiché,
                  mais ce n'est plus un lien. */}
              {person.bibro_code ? (
                <button
                  onClick={() => onOpenTagged && onOpenTagged(person)}
                  style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.ink, cursor: onOpenTagged ? "pointer" : "default" }}
                >
                  {[person.name, person.last_name].filter(Boolean).join(" ")}
                </button>
              ) : (
                <span style={{ fontWeight: 700, color: COLORS.ink }}>{[person.name, person.last_name].filter(Boolean).join(" ")}</span>
              )}
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
}

// Icône de la ligne « Découverte » : l'icône du rond-profil par défaut (bouteille pour un produit, épingle pour un lieu) dans un rond vert fluo
// de 22 px, comme l'icône du check des deux autres cartes (décidé par Mehdi, 2026-11-12 : « une icône Lieu entourée et une icône Drink entourée »).
function PulseRoundIcon({ name }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: "22px", height: "22px", boxSizing: "border-box", borderRadius: "50%", border: `2px solid ${COLORS.amber}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
    >
      <NavIcon name={name} size={13} color={COLORS.amber} />
    </span>
  );
}

export const PulseCard = React.forwardRef(function PulseCard({ entry, directories, myUserId, myBibroCode, onOpenVenue, onOpenTagged, onOpenDrink, onOpenBrand, onOpenProducer, onOpenProfile, onOpenClub, onUpdate, onDeleted, initialShowComments, highlighted, flat, separatorColor = COLORS.paperAlt, hideProduct }, ref) {
  const [showReactors, setShowReactors] = useState(false);
  const [reactorsTab, setReactorsTab] = useState("bix");
  const [reactors, setReactors] = useState(null);
  const [showComments, setShowComments] = useState(!!initialShowComments);
  const [comments, setComments] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [posting, setPosting] = useState(false);
  // Signalement en cours : { type: "pulse_event" | "pulse_comment", id }
  const [reportTarget, setReportTarget] = useState(null);
  // Suppression de SA publication libre. Le verrou évite un double envoi si l'on touche deux fois très vite.
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  // Suppression de SON check : fenêtre de choix ouverte après l'aperçu du serveur. { withStats, choice } — withStats =
  // une consommation de ses statistiques correspond à cette carte (3 boutons) ; choice = bouton touché, pendant l'envoi.
  const [checkDialog, setCheckDialog] = useState(null);

  const obj = resolveObject(entry, directories);
  // hideProduct : on est déjà sur la fiche de cet objet (onglet BibaPulse d'une fiche Produit pour un DrinkCheck, d'une fiche Lieu pour un
  // PlaceCheck) — inutile de la remontrer dans chaque carte.
  const showProductBlock = !!obj && !hideProduct;

  const canOpenObject = obj && ((entry.objectType === "venue" && onOpenVenue) || (entry.objectType === "drink" && onOpenDrink));
  // Lieu où le check a été fait (produit checké dans un lieu) : affiché à la suite du produit.
  const checkVenue = entry.objectType !== "venue" && entry.venueId ? directories.venuesById[entry.venueId] || null : null;
  const checkVenueName = entry.objectType !== "venue" && entry.venueId ? SPECIAL_VENUE_LABELS[entry.venueId] || checkVenue?.name || null : null;
  const openCheckVenue = checkVenue && onOpenVenue ? () => onOpenVenue(checkVenue.id) : null;
  const openObject = canOpenObject
    ? () => {
        if (entry.objectType === "venue") onOpenVenue(obj.id);
        if (entry.objectType === "drink") onOpenDrink(obj.id);
      }
    : null;

  // Carte « a rejoint le BibaClub Y » : le nom du club est dans la carte, la fiche du club s'ouvre par son identifiant.
  const isClubJoin = entry.eventType === "club_joined";
  const clubName = isClubJoin ? pulseClubName(entry) : null;
  const openClub = isClubJoin && onOpenClub && entry.objectId ? () => onOpenClub(entry.objectId) : null;

  // Publication libre : pas d'objet propre, seulement des tags de fiche dans son contenu.
  const isPost = entry.eventType === "post";
  const isCheck = CHECK_EVENT_TYPES.includes(entry.eventType);
  // Découverte d'un PRODUIT (premier check, case « Je goûte ce produit pour la première fois » cochée, `product_discovered`) : même carte que le
  // DrinkCheck (même fiche du produit en petit, même note à droite, Cheers en premier), seule la ligne « Découverte » change.
  // Découverte d'un LIEU (premier passage, case « Je découvre ce lieu pour la première fois » cochée) : même carte que le PlaceCheck ; c'est un
  // `venue_visit` marqué `metadata.discovery = true` par le serveur (create-pulse-event v10), donc toutes ses réactions et ses lectures sont celles
  // d'un PlaceCheck.
  const isVenueDiscovery = entry.eventType === "venue_visit" && entry.metadata?.discovery === true;
  const isDiscovery = entry.eventType === "product_discovered" || isVenueDiscovery;
  // DrinkCheck (check d'un produit après le premier) : « DrinkCheck » avec l'icône du check, puis la fiche du produit en petit, puis le lieu du
  // check. La Découverte d'un produit passe par les mêmes lignes de code (`isDrinkCheck` couvre `drink_checked` et `product_discovered`) ; celle
  // d'un lieu passe par celles du PlaceCheck (`isPlaceCheck`). `isDiscovery` ne change que la ligne « Découverte » (libellé et icône).
  const isDrinkCheck = entry.eventType === "drink_checked" || entry.eventType === "product_discovered";
  // PlaceCheck (check d'un lieu sans produit, `venue_visit`) : même présentation que le DrinkCheck — « PlaceCheck » avec l'icône du check
  // de lieu, puis la fiche du lieu en petit.
  const isPlaceCheck = entry.eventType === "venue_visit";
  // Contribution à BibAtlas (ajout d'un PRODUIT ou d'un LIEU à la base, `database_contribution`) : même présentation que le DrinkCheck et le
  // PlaceCheck — ligne « Contribution à BibAtlas » avec l'icône de BibAtlas, puis la fiche ajoutée en petit. Les ajouts de marque et de
  // producteur gardent pour l'instant l'ancienne carte (« Ajout @ nom »).
  const isContribution = entry.eventType === "database_contribution" && (entry.objectType === "drink" || entry.objectType === "venue");
  // Lancement d'un BibaRoom (`room_launched`, nouvelle carte) : même présentation que les autres cartes refaites — ligne « Lancement d'un BibaRoom »
  // avec l'icône BibaGo, puis la fiche du salon en petit (nom, lieu, date et heure ; jamais le code du salon, qui est la clé d'accès).
  const isRoomLaunch = entry.eventType === "room_launched";
  // Le lancement d'un BibaRoom se supprime avec la même fonction Edge que les checks (delete-pulse-check, version 3), sans statistiques à retirer.
  // Cartes refaites (une sorte de carte à la fois) : en-tête sur une seule ligne, ligne « DrinkCheck » / « Découverte » / « PlaceCheck » /
  // « Contribution à BibAtlas », bloc de la fiche.
  const isRedesigned = isDrinkCheck || isPlaceCheck || isContribution || isRoomLaunch;
  // DrinkCheck et PlaceCheck : photo et commentaire de l'auteur, montrés sous le bloc de la fiche (voir plus bas).
  const checkNote = isRedesigned ? pulseNoteOf(entry) : { comment: "", photoUrl: null };
  // PlaceCheck avec un produit : la carte reste centrée sur le lieu ; le produit bu (metadata.drink_id) n'est qu'un petit texte sous le bloc
  // du lieu, et l'avis de l'auteur sur le lieu (metadata.venue_rating, de 1 à 5) est affiché à droite de la ligne « PlaceCheck ».
  const placeDrinkId = isPlaceCheck && typeof entry.metadata?.drink_id === "string" ? entry.metadata.drink_id : null;
  const placeDrink = placeDrinkId ? (directories.drinksDirectory || []).find((d) => d.id === placeDrinkId) || null : null;
  const openPlaceDrink = placeDrink && onOpenDrink ? () => onOpenDrink(placeDrink.id) : null;
  const placeRating = isPlaceCheck ? RATING_LABELS.find((l) => l.value === entry.metadata?.venue_rating) || null : null;
  // Interaction prédéfinie du PlaceCheck (metadata.interaction : un code, la phrase est reconstruite ici) : une pastille dans le sous-bloc de
  // l'auteur, à droite de l'éventuelle photo, comme un commentaire ; elle ouvre les commentaires, où elle est rappelée en tête.
  const placeInteraction = isPlaceCheck ? PLACE_INTERACTIONS.find((i) => i.code === entry.metadata?.interaction) || null : null;
  const tagHandlers = { drink: onOpenDrink, venue: onOpenVenue, brand: onOpenBrand, producer: onOpenProducer };

  const handleDelete = async () => {
    if (deleteLock.current) return;
    if (!window.confirm("Supprimer cette publication ? Ses réactions et ses commentaires seront supprimés aussi.")) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError("");
    const result = isRoomLaunch ? await deleteMyPulseCheck(entry.id, { alsoStats: false }) : await deleteMyPulsePost(entry.id);
    if (result.error) {
      deleteLock.current = false;
      setDeleting(false);
      setDeleteError("La publication n'a pas pu être supprimée. Réessaie dans un instant.");
      return;
    }
    // La carte disparaît du fil (le parent la retire de sa liste).
    if (onDeleted) onDeleted(entry.id);
  };

  // Suppression de SON check : on demande d'abord au serveur si une consommation des statistiques correspond à la
  // carte, pour ne proposer le choix « et de mes statistiques » que dans ce cas.
  const handleDeleteCheck = async () => {
    if (deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError("");
    const preview = await previewMyPulseCheckDeletion(entry.id);
    if (preview.error) {
      deleteLock.current = false;
      setDeleting(false);
      setDeleteError("Le check n'a pas pu être supprimé. Réessaie dans un instant.");
      return;
    }
    if (!preview.exists) {
      // Déjà supprimé ailleurs : on retire simplement la carte du fil.
      if (onDeleted) onDeleted(entry.id);
      return;
    }
    deleteLock.current = false;
    setDeleting(false);
    setCheckDialog({ withStats: preview.statsMatch, choice: null });
  };

  const confirmDeleteCheck = async (alsoStats) => {
    if (deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setCheckDialog((d) => (d ? { ...d, choice: alsoStats ? "stats" : "pulse" } : d));
    const result = await deleteMyPulseCheck(entry.id, { alsoStats });
    if (result.error) {
      deleteLock.current = false;
      setDeleting(false);
      setCheckDialog(null);
      setDeleteError("Le check n'a pas pu être supprimé. Réessaie dans un instant.");
      return;
    }
    setCheckDialog(null);
    if (onDeleted) onDeleted(entry.id);
  };

  const handleBix = () => {
    onUpdate({ iBixed: !entry.iBixed, bixCount: entry.iBixed ? entry.bixCount - 1 : entry.bixCount + 1 });
    togglePulseBix(entry.id, entry.iBixed);
  };

  const handleIncoming = () => {
    onUpdate({ iAmIncoming: !entry.iAmIncoming, incomingCount: entry.iAmIncoming ? entry.incomingCount - 1 : entry.incomingCount + 1 });
    togglePulseIncoming(entry.id, entry.iAmIncoming);
  };

  const handleSante = () => {
    onUpdate({ iSaidSante: !entry.iSaidSante, santeCount: entry.iSaidSante ? entry.santeCount - 1 : entry.santeCount + 1 });
    toggleSanteReaction(entry.id);
  };

  const openReactors = async (tab) => {
    setReactorsTab(tab);
    setShowReactors(true);
    if (!reactors) setReactors(await loadPulseReactors(entry.id));
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !comments) setComments(await loadPulseComments(entry.id));
  };

  useEffect(() => {
    if (initialShowComments) loadPulseComments(entry.id).then(setComments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitComment = async () => {
    const body = commentInput.trim();
    if (!body) return;
    setPosting(true);
    const result = await postPulseComment(entry.id, body);
    setPosting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setCommentInput("");
    onUpdate({ commentsCount: entry.commentsCount + 1 });
    setComments(await loadPulseComments(entry.id));
  };

  // Bouton Cheers : sur les Découvertes et sur les DrinkCheck (en premier de la rangée).
  const cheersButton = (
    <button
      onClick={handleSante}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "none",
        border: `2px solid ${entry.santeCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
        borderRadius: "999px",
        padding: "4px 10px",
        fontSize: "11.5px",
        fontWeight: 700,
        color: entry.santeCount > 0 ? COLORS.amber : COLORS.inkSoft,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
        <CheersIcon size={16} active={entry.santeCount > 0} />
      </span>
      {entry.santeCount > 0 && <span style={{ color: "#fff" }}>{entry.santeCount}</span>}
    </button>
  );
  // Ligne-résumé « N Cheers » : sur un DrinkCheck elle passe avant « Bixé par » (comme les boutons), sur les autres cartes elle reste après.
  const santeSummary =
    entry.santeCount > 0 ? (
      <button
        onClick={() => openReactors("sante")}
        style={{ display: "block", background: "none", border: "none", padding: isDrinkCheck ? "6px 0 0" : "4px 0 0", textAlign: "left", cursor: "pointer" }}
      >
        <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
          <strong style={{ color: COLORS.ink }}>{entry.santeCount}</strong> Cheers
        </span>
      </button>
    ) : null;

  // Bouton « J'arrive ! » (PlaceCheck uniquement) : en premier de la rangée, comme Cheers sur un DrinkCheck. Grisé pour l'auteur du check.
  const incomingButton = (
    <button
      onClick={entry.actorId !== myUserId ? handleIncoming : undefined}
      disabled={entry.actorId === myUserId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: entry.iAmIncoming ? COLORS.amber : "none",
        border: `2px solid ${entry.incomingCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
        borderRadius: "999px",
        padding: "4px 10px",
        fontSize: "11.5px",
        fontWeight: 700,
        color: entry.iAmIncoming ? COLORS.paper : entry.incomingCount > 0 ? COLORS.amber : COLORS.inkSoft,
        cursor: entry.actorId === myUserId ? "default" : "pointer",
        opacity: entry.actorId === myUserId ? 0.45 : 1,
      }}
    >
      J'arrive !{entry.incomingCount > 0 && <span style={{ color: "#fff" }}>{` ${entry.incomingCount}`}</span>}
    </button>
  );
  // Ligne-résumé « N Bibax arrivent » : sur un PlaceCheck elle passe avant « Bixé par » (comme les boutons).
  const incomingSummary =
    entry.incomingCount > 0 ? (
      <button
        onClick={() => openReactors("incoming")}
        style={{ display: "block", background: "none", border: "none", padding: isPlaceCheck ? "6px 0 0" : "4px 0 0", textAlign: "left", cursor: "pointer" }}
      >
        <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
          <strong style={{ color: COLORS.ink }}>{entry.incomingCount}</strong> Bibax {entry.incomingCount > 1 ? "arrivent" : "arrive"}
        </span>
      </button>
    ) : null;

  return (
    <div
      ref={ref}
      data-pulse-entry={entry.id}
      style={
        flat
          ? {
              // Publication « à plat » (fil BibaPulse) : ni bloc, ni bordure, ni coins arrondis — seulement un trait de séparation en dessous. La publication ouverte depuis une notification garde une barre verte à gauche.
              position: "relative",
              padding: "14px",
              borderBottom: `1px solid ${separatorColor}`, // couleur du trait sous la publication : rose fluo sur la page BibaPulse (Mehdi, 2026-11-13), gris ailleurs
              background: highlighted ? COLORS.surface : "none",
              boxShadow: highlighted ? `inset 3px 0 0 ${COLORS.amber}` : "none",
            }
          : {
              position: "relative",
              background: COLORS.surface,
              border: `2px solid ${highlighted ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "14px",
              padding: "14px",
            }
      }
    >
      <span style={{ position: "absolute", top: isRedesigned ? "25px" : "12px", right: "14px", fontSize: "11px", color: COLORS.inkSoft }}>{timeAgo(entry.createdAt)}</span>

      <div style={{ display: "flex", alignItems: isRedesigned ? "center" : "flex-start", gap: "10px", marginBottom: "10px" }}>
        {/* Le rond de profil mène à la fiche de son auteur. */}
        <EntityAvatar
          photoUrl={entry.actorAvatarUrl}
          size={36}
          onClick={entry.actorBibroCode && onOpenProfile ? () => onOpenProfile(entry.actorBibroCode) : undefined}
        />
        <div style={{ flex: 1, minWidth: 0, paddingRight: "60px" }}>
          <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[entry.actorName, entry.actorLastName].filter(Boolean).join(" ") || "Quelqu'un"}
          </p>
          {!isRedesigned && (
            <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: COLORS.ink }}>
              {isClubJoin ? (
                <>
                  A rejoint le BibaClub{" "}
                  {clubName && openClub ? (
                    <button onClick={openClub} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}>
                      {clubName}
                    </button>
                  ) : (
                    <strong style={{ color: COLORS.amber }}>{clubName || "un club"}</strong>
                  )}
                </>
              ) : isPost ? null : (
                <>
                  {pulseActionFor(entry)} @{" "}
                  {obj && openObject ? (
                    <button onClick={openObject} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}>
                      {obj.name}
                    </button>
                  ) : (
                    <strong style={{ color: COLORS.amber }}>{obj?.name || "une fiche"}</strong>
                  )}
                </>
              )}
              {checkVenueName && (
                <>
                  <span style={{ color: COLORS.inkSoft }}>{" — "}</span>
                  {openCheckVenue ? (
                    <button onClick={openCheckVenue} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}>
                      {checkVenueName}
                    </button>
                  ) : (
                    <span style={{ fontWeight: 700 }}>{checkVenueName}</span>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* DrinkCheck / PlaceCheck : une ligne à part sous l'en-tête — « DrinkCheck » ou « PlaceCheck » (icône du check de la fiche, « Check » en vert fluo) à gauche, la note de l'auteur à l'extrême droite. */}
      {isRedesigned && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13.5px", color: COLORS.ink }}>
            {isDiscovery ? (
              <PulseRoundIcon name={isVenueDiscovery ? "map-pin" : "bottle"} />
            ) : (
              <img src={isContribution ? bibAtlasIconUrl : isRoomLaunch ? bibaGoIconUrl : isPlaceCheck ? placeCheckIconUrl : beerCheckIconUrl} alt="" width="22" height="22" style={{ display: "block", flexShrink: 0 }} />
            )}
            {isContribution ? (
              <span>
                Contribution à Bib
                <span style={{ color: COLORS.amber }}>Atlas</span>
              </span>
            ) : isRoomLaunch ? (
              <span>
                Lancement d'un Biba
                <span style={{ color: COLORS.amber }}>Room</span>
              </span>
            ) : isDiscovery ? (
              <span>Découverte</span>
            ) : (
              <span>
                {isPlaceCheck ? "Place" : "Drink"}
                <span style={{ color: COLORS.amber }}>Check</span>
              </span>
            )}
          </span>
          {placeRating && (
            <span title="Avis de l'auteur sur le lieu" style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <NavIcon name="flame" size={15} color={COLORS.amber} filled />
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "12.5px", color: COLORS.ink }}>{placeRating.fr}</span>
            </span>
          )}
          {typeof entry.metadata?.rating === "number" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <StarsDisplay value={entry.metadata.rating} size={16} />
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}>
                {String(entry.metadata.rating).replace(".", ",")}
                <span style={{ color: COLORS.amber }}>/</span>5
              </span>
            </span>
          )}
        </div>
      )}

      {isRedesigned && (showProductBlock || isRoomLaunch || checkNote.photoUrl || checkNote.comment || checkVenueName || placeDrink || placeInteraction) && (
        <div style={{ marginBottom: "18px" }}>
          {isRoomLaunch && (
            <PulseRoomCard
              name={typeof entry.metadata?.room_name === "string" ? entry.metadata.room_name : "BibaRoom"}
              special={entry.venueId === "@home" ? "home" : entry.venueId === "@event" ? "event" : null}
              venue={checkVenue}
              launchedAt={entry.createdAt}
            />
          )}
          {showProductBlock && isDrinkCheck && <PulseProductCard drink={obj} producers={(obj.producerIds || []).map((id) => directories.producersById?.[id]).filter(Boolean)} onOpen={openObject || undefined} />}
          {showProductBlock && (isPlaceCheck || (isContribution && entry.objectType === "venue")) && <PulseVenueCard venue={obj} rating={directories.venueRatingsById?.[obj.id] || null} onOpen={openObject || undefined} />}
          {showProductBlock && isContribution && entry.objectType === "drink" && <PulseProductCard drink={obj} producers={(obj.producerIds || []).map((id) => directories.producersById?.[id]).filter(Boolean)} onOpen={openObject || undefined} />}
          {/* Photo et commentaire de l'auteur : un sous-bloc juste sous le bloc du produit, même cadre que lui. La photo y est entière (jamais recadrée),
              en petit et collée à gauche, le commentaire à sa droite. */}
          {(checkNote.photoUrl || checkNote.comment || placeInteraction) && (
            <div
              style={{
                margin: showProductBlock ? "8px 0 0" : 0,
                background: COLORS.surfaceAlt,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "8px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                // Photo seule : le cadre épouse la photo au lieu de s'étendre sur toute la largeur.
                width: checkNote.comment ? undefined : "fit-content",
                maxWidth: "100%",
              }}
            >
              {checkNote.photoUrl && (
                <img
                  src={checkNote.photoUrl}
                  alt="Photo de la publication"
                  loading="lazy"
                  style={{ flexShrink: 0, maxWidth: "112px", maxHeight: "160px", width: "auto", height: "auto", borderRadius: "8px", display: "block" }}
                />
              )}
              {(checkNote.comment || placeInteraction) && (
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  {placeInteraction && <PulseInteractionPill label={placeInteraction.label} active={showComments} onClick={toggleComments} />}
                  {checkNote.comment && (
                    <p style={{ alignSelf: "stretch", margin: 0, padding: "2px 4px", fontSize: "13px", color: COLORS.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{checkNote.comment}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {placeDrink && <PulseDrinkLine drink={placeDrink} onOpen={openPlaceDrink || undefined} gapAbove={showProductBlock || !!checkNote.photoUrl || !!checkNote.comment || !!placeInteraction} />}
          {checkVenueName && !isRoomLaunch && (
            <p style={{ margin: showProductBlock || checkNote.photoUrl || checkNote.comment || placeDrink ? "14px 0 0" : 0, display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12.5px", color: COLORS.ink }}>
              {/* Lieu du check : pastille de lieu en vert fluo (la même que sur les fiches), à la place du « @ ». « @Home » / « @Event » : sans le « @ ». */}
              <span style={{ display: "flex", flexShrink: 0, marginTop: "1px" }}>
                <NavIcon name="map-pin" size={16} color={COLORS.amber} />
              </span>
              {openCheckVenue ? (
                <button onClick={openCheckVenue} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}>
                  {checkVenueName.replace(/^@/, "")}
                </button>
              ) : (
                <span style={{ fontWeight: 700 }}>{checkVenueName.replace(/^@/, "")}</span>
              )}
            </p>
          )}
        </div>
      )}

      <PulseContent entry={entry} onOpenTagged={onOpenTagged} tagEntities={directories.tagEntities || {}} tagHandlers={tagHandlers} hideRating={isRedesigned} hideNote={isRedesigned} />

      {/* Bloc d'actions : boutons de réaction, puis résumés (« Bixé par… »). L'icône Supprimer / Signaler est toujours dans son coin bas droit,
          quel que soit le nombre de lignes. */}
      <div style={{ position: "relative", marginTop: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isDrinkCheck && cheersButton}
          {isPlaceCheck && incomingButton}
          <button
            onClick={handleBix}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: `2px solid ${entry.bixCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
              <NavIcon name="heart" size={15} color={entry.bixCount > 0 ? COLORS.amber : COLORS.inkSoft} filled={entry.bixCount > 0} />
            </span>
            {entry.bixCount > 0 && <span style={{ color: "#fff" }}>{entry.bixCount}</span>}
          </button>

          <button
            onClick={toggleComments}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: `2px solid ${entry.commentsCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
              <NavIcon name="comment" size={14} color={entry.commentsCount > 0 ? COLORS.amber : COLORS.inkSoft} />
            </span>
            {entry.commentsCount > 0 && <span style={{ color: "#fff" }}>{entry.commentsCount}</span>}
          </button>
        </div>

        {deleteError && <p style={{ color: COLORS.wine, fontSize: "12px", margin: "8px 0 0" }}>{deleteError}</p>}

        {/* Résumé façon Instagram — plus facile à toucher qu'un petit nombre isolé, et ouvre la
        liste complète des personnes concernées. */}
        <div style={{ paddingRight: "30px" }}>
        {isDrinkCheck && santeSummary}
        {isPlaceCheck && incomingSummary}
        {entry.bixCount > 0 && (
          <button
            onClick={() => openReactors("bix")}
            style={{ display: "block", background: "none", border: "none", padding: (isDrinkCheck && entry.santeCount > 0) || (isPlaceCheck && entry.incomingCount > 0) ? "4px 0 0" : "6px 0 0", textAlign: "left", cursor: "pointer" }}
          >
            <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
              Bixé par <strong style={{ color: COLORS.ink }}>{entry.lastBixerName || "quelqu'un"}</strong>
              {entry.bixCount > 1 && (
                <>
                  {" "}
                  et <strong style={{ color: COLORS.ink }}>{entry.bixCount - 1} autre{entry.bixCount > 2 ? "s Bibax" : " Bibax"}</strong>
                </>
              )}
            </span>
          </button>
        )}
        {!isPlaceCheck && incomingSummary}
        {!isDrinkCheck && santeSummary}
        </div>

        {myUserId && (isPost || isCheck || isRoomLaunch) && entry.actorId === myUserId && (
          <button
            onClick={isPost || isRoomLaunch ? handleDelete : handleDeleteCheck}
            disabled={deleting}
            aria-label={isPost || isRoomLaunch ? "Supprimer ma publication" : "Supprimer mon check"}
            title="Supprimer"
            style={{ position: "absolute", right: 0, bottom: 0, display: "flex", alignItems: "center", background: "none", border: "none", padding: "4px", opacity: deleting ? 0.3 : 0.6, cursor: deleting ? "default" : "pointer" }}
          >
            <NavIcon name="trash" size={15} color={COLORS.inkSoft} />
          </button>
        )}

        {myUserId && entry.actorId !== myUserId && (
          <button
            onClick={() => setReportTarget({ type: "pulse_event", id: entry.id })}
            aria-label="Signaler cette publication"
            title="Signaler"
            style={{ position: "absolute", right: 0, bottom: 0, display: "flex", alignItems: "center", background: "none", border: "none", padding: "4px", color: COLORS.inkSoft, opacity: 0.5, cursor: "pointer" }}
          >
            <ReportIcon size={12} />
          </button>
        )}
      </div>

      {showComments && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          {/* Interaction du PlaceCheck rappelée en tête : on voit à quoi les commentaires répondent. */}
          {placeInteraction && (
            <div style={{ marginBottom: "10px" }}>
              <PulseInteractionPill label={placeInteraction.label} />
            </div>
          )}
          {comments === null ? (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
              {comments.length === 0 ? (
                <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun commentaire pour l'instant.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: "8px" }}>
                    <EntityAvatar photoUrl={c.userAvatarUrl} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}>{c.userName}</span>
                      <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: COLORS.ink }}>{c.body}</p>
                    </div>
                    {myUserId && c.userId !== myUserId && (
                      <button
                        onClick={() => setReportTarget({ type: "pulse_comment", id: c.id })}
                        aria-label="Signaler ce commentaire"
                        title="Signaler"
                        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", background: "none", border: "none", padding: "2px", color: COLORS.inkSoft, opacity: 0.5, cursor: "pointer" }}
                      >
                        <ReportIcon size={11} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Commenter ..."
              style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "12.5px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
            />
            <button
              onClick={submitComment}
              disabled={!commentInput.trim() || posting}
              style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "0 14px", fontWeight: 700, fontSize: "12.5px", color: COLORS.paper, cursor: "pointer", opacity: commentInput.trim() ? 1 : 0.5 }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}

      {showReactors && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 300 }} onClick={() => setShowReactors(false)}>
          <div style={{ background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: "16px 20px 28px", width: "100%", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "8px", borderBottom: `2px solid ${COLORS.paperAlt}` }}>
              <button
                onClick={() => setReactorsTab("bix")}
                style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "bix" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "bix" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
              >
                Bix ({entry.bixCount})
              </button>
              {entry.eventType === "venue_visit" && (
                <button
                  onClick={() => setReactorsTab("incoming")}
                  style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "incoming" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "incoming" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
                >
                  J'arrive ! ({entry.incomingCount})
                </button>
              )}
              {isDrinkCheck && (
                <button
                  onClick={() => setReactorsTab("sante")}
                  style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "sante" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "sante" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
                >
                  Cheers ! ({entry.santeCount})
                </button>
              )}
            </div>
            {reactors === null ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "10px 0" }}>Chargement...</p>
            ) : (
              <ReactorsList
                people={reactorsTab === "bix" ? reactors.bix : reactorsTab === "incoming" ? reactors.incoming : reactors.sante}
                emptyLabel={reactorsTab === "bix" ? "Personne n'a encore Bix." : reactorsTab === "incoming" ? "Personne n'a encore signalé son arrivée." : "Personne n'a encore trinqué."}
              />
            )}
          </div>
        </div>
      )}

      {checkDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Supprimer ce check de Pulse ?"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}
          onClick={() => {
            if (!deleting) setCheckDialog(null);
          }}
        >
          <div
            style={{ background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))", width: "100%", maxWidth: "480px", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", color: COLORS.ink, margin: "0 0 14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
              Supprimer ce check de Pulse ?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {checkDialog.withStats ? (
                <>
                  <button
                    onClick={() => confirmDeleteCheck(false)}
                    disabled={deleting}
                    style={{ background: "none", border: `2px solid ${COLORS.wine}`, borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: COLORS.wine, cursor: deleting ? "default" : "pointer", opacity: deleting && checkDialog.choice !== "pulse" ? 0.4 : 1 }}
                  >
                    {checkDialog.choice === "pulse" ? "Suppression..." : "Supprimer de Pulse seulement"}
                  </button>
                  <button
                    onClick={() => confirmDeleteCheck(true)}
                    disabled={deleting}
                    style={{ background: COLORS.wine, border: `2px solid ${COLORS.wine}`, borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: deleting ? "default" : "pointer", opacity: deleting && checkDialog.choice !== "stats" ? 0.4 : 1 }}
                  >
                    {checkDialog.choice === "stats" ? "Suppression..." : "Supprimer de Pulse et de mes statistiques"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => confirmDeleteCheck(false)}
                  disabled={deleting}
                  style={{ background: COLORS.wine, border: `2px solid ${COLORS.wine}`, borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: deleting ? "default" : "pointer" }}
                >
                  {checkDialog.choice === "pulse" ? "Suppression..." : "Supprimer"}
                </button>
              )}
              <button
                onClick={() => setCheckDialog(null)}
                disabled={deleting}
                style={{ background: "none", border: "none", padding: "10px", fontSize: "14px", fontWeight: 700, color: COLORS.inkSoft, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.4 : 1 }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {reportTarget &&
        ReactDOM.createPortal(
          <ReportModal entityType={reportTarget.type} entityId={reportTarget.id} myBibroCode={myBibroCode} onClose={() => setReportTarget(null)} />,
          document.body
        )}
    </div>
  );
});

export function BibaPulseScreen({
  onBack,
  breweriesDirectory = [],
  brandsDirectory = [],
  myUserId: myUserIdProp,
  myBibroCode,
  onOpenVenue,
  onOpenDrink,
  onOpenBrand,
  onOpenProducer,
  onOpenClub,
  focusEntryId,
  openCommentsOnFocus,
  returnEntryId,
  onRememberEntry,
  storiesEnabled = true,
  onShareStory,
}) {
  const [entries, setEntries] = useState(null);
  // Écran de rédaction d'une publication libre (bouton « + »). Affiché ici même, comme la fiche d'un Bibax :
  // la navigation reste interne à BibaPulse, et le fil continue de se rafraîchir en dessous.
  const [composing, setComposing] = useState(false);
  // Cartes supprimées pendant cette visite (pour qu'un rafraîchissement déjà parti ne les ramène pas).
  const deletedIds = useRef(new Set());
  const topRef = React.useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [focusAttempts, setFocusAttempts] = useState(0);
  // Fiche d'un Bibax ouverte depuis un rond de profil du fil. Affichée ici même plutôt que
  // remontée au routeur : la navigation reste interne à BibaPulse.
  const [viewedProfileCode, setViewedProfileCode] = useState(null);
  // Mon propre rond de profil mène à MON profil, pas à la fiche publique d'un autre Bibax.
  const { goToProfile } = React.useContext(ProfileNavContext);
  // Le routeur ne transmet pas encore cet identifiant à cet écran : on le lit depuis la
  // session, tout en respectant la propriété si elle est fournie un jour.
  const [sessionUserId, setSessionUserId] = useState(null);
  useEffect(() => {
    if (myUserIdProp) return;
    getSession().then((s) => setSessionUserId(s?.user?.id || null));
  }, [myUserIdProp]);
  const myUserId = myUserIdProp || sessionUserId;
  const focusedCardRef = React.useRef(null);
  const hasScrolledToFocus = React.useRef(false);
  // Retour d'une fiche (produit, lieu, marque, producteur, profil…) ouverte depuis une carte : le fil se rouvre sur cette carte, pas en
  // haut. L'identifiant vient de l'application (returnEntryId) ; on le lit une fois et on le remet à zéro. Toute arrivée sur le fil
  // efface aussi une mémoire laissée par une fiche (on n'y revient pas par ici).
  const [returnTarget] = useState(returnEntryId || null);
  useEffect(() => {
    if (onRememberEntry) onRememberEntry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const targetId = focusEntryId || returnTarget;
  // Mémorise la carte avant d'ouvrir une fiche, pour y revenir.
  const rememberThen = (entryId, fn, opts) => (fn ? (...args) => { if (onRememberEntry) onRememberEntry(entryId, opts); return fn(...args); } : undefined);
  // Profil d'un Bibax ouvert ici même (rond de profil, personne taguée) : au retour, on remet la carte à l'écran.
  const profileFromEntry = React.useRef(null);
  const openProfileFrom = (entryId, code) => {
    profileFromEntry.current = entryId;
    setViewedProfileCode(code);
  };
  React.useLayoutEffect(() => {
    if (viewedProfileCode || !profileFromEntry.current) return;
    const id = profileFromEntry.current;
    profileFromEntry.current = null;
    const card = document.querySelector(`[data-pulse-entry="${id}"]`);
    if (card) card.scrollIntoView({ block: "start" });
  }, [viewedProfileCode]);
  // Le fil ne charge jamais qu'une poignée d'entrées à la fois (pagination) — les produits qu'il
  // référence forment donc un ensemble tout aussi borné, jamais besoin du répertoire complet.
  const [drinksDirectory, setDrinksDirectory] = useState([]);
  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => pulseDrinkIdsOf(e).forEach((id) => ids.add(id)));
    if (ids.size === 0) return;
    loadDrinksByIds([...ids]).then((results) => setDrinksDirectory((prev) => [...prev.filter((d) => !ids.has(d.id)), ...results]));
  }, [entries]);
  const [venuesById, setVenuesById] = useState({});
  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => {
      if (e.objectType === "venue" && e.objectId) ids.add(e.objectId);
      // Lieu où un produit a été checké (hors "@Home" / "@Event", qui n'ont pas de fiche).
      else if (e.venueId && !SPECIAL_VENUE_LABELS[e.venueId]) ids.add(e.venueId);
    });
    if (ids.size === 0) return;
    loadVenuesByIds([...ids]).then((results) => setVenuesById((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v])) })));
  }, [entries]);

  // Noms des fiches taguées dans les publications libres du fil.
  const tagEntities = usePostTagEntities(entries);

  // Producteurs des produits checkés (ligne « Producteur » de la fiche produit des cartes DrinkCheck).
  const producersById = usePulseProducersById(entries, drinksDirectory);
  const venueRatingsById = usePulseVenueRatingsById(entries);

  const directories = { venuesById, drinksDirectory, breweriesDirectory, brandsDirectory, tagEntities, producersById, venueRatingsById };

  useEffect(() => {
    loadPulseFeed().then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
    // Rafraîchit périodiquement le haut du fil — sans ça, un Bix ou un commentaire d'un ami ne
    // se refléterait jamais tant qu'on ne recharge pas la page à la main. Fusionne les
    // nouvelles données dans la liste déjà chargée, sans perdre les pages plus anciennes.
    const interval = setInterval(() => {
      loadPulseFeed().then((freshTopAll) => {
        // Une carte que je viens de supprimer ne revient pas, même si cette réponse a été demandée juste avant.
        const freshTop = freshTopAll.filter((e) => !deletedIds.current.has(e.id));
        // Garde en tête le bloc des marques et des producteurs en favori (voir pulseFeedMerge.js).
        setEntries((prev) => mergePulseFeedTop(prev, freshTop));
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    const oldest = entries[entries.length - 1].createdAt;
    const more = await loadPulseFeed(oldest);
    setEntries((prev) => appendOlderPulsePage(prev, more));
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  };

  // Si on arrive depuis une notification pointant vers une publication précise, celle-ci n'est
  // pas forcément dans les 20 premières du fil — on charge des pages supplémentaires jusqu'à la
  // trouver (borné à 10 tentatives), puis on y défile.
  useEffect(() => {
    if (!targetId || !entries) return;
    if (entries.some((e) => e.id === targetId)) return;
    if (!hasMore || focusAttempts >= 10) return;
    setFocusAttempts((n) => n + 1);
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, entries, hasMore]);

  // Retour d'une fiche : la carte est remise en haut de l'écran, sans animation et avant l'affichage. Les produits, lieux et
  // producteurs des cartes se chargent après le fil et changent leur hauteur : on réaligne à chaque chargement, jusqu'à ce que la
  // personne touche l'écran ou, au plus, 4 secondes.
  const keepAligning = React.useRef(!!returnTarget && !focusEntryId);
  React.useLayoutEffect(() => {
    if (!keepAligning.current || !focusedCardRef.current) return;
    focusedCardRef.current.scrollIntoView({ block: "start" });
  }, [entries, drinksDirectory, venuesById, producersById, venueRatingsById]);
  useEffect(() => {
    if (!keepAligning.current) return undefined;
    const stop = () => {
      keepAligning.current = false;
    };
    const timer = setTimeout(stop, 4000);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  useEffect(() => {
    if (!focusEntryId || hasScrolledToFocus.current) return;
    if (focusedCardRef.current) {
      focusedCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolledToFocus.current = true;
    }
  }, [focusEntryId, entries]);

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  // Une de mes publications vient d'être supprimée : elle quitte le fil.
  const removeEntry = (id) => {
    deletedIds.current.add(id);
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  };

  // Une publication vient d'être enregistrée : on referme la rédaction et on recharge le haut du fil, pour
  // qu'elle y apparaisse tout de suite (sans attendre le prochain rafraîchissement automatique).
  // storyDraft ({ file, tags }) : l'auteur a coché « Partager aussi en Story » — l'application ouvre alors l'éditeur de Story.
  const handlePublished = (storyDraft) => {
    setComposing(false);
    // L'éditeur de Story prend tout l'écran ; au retour, BibaPulse se rouvre et recharge son fil, publication comprise.
    if (storyDraft && onShareStory) {
      onShareStory(storyDraft);
      return;
    }
    loadPulseFeed().then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
  };

  // Retour de la rédaction au fil : on repart du haut de la page (le fil prend la place d'un écran plus court).
  // Rien à faire à l'ouverture de BibaPulse, où l'application remonte déjà la page toute seule.
  const wasComposing = React.useRef(false);
  useEffect(() => {
    if (composing) {
      wasComposing.current = true;
      return;
    }
    if (wasComposing.current) {
      wasComposing.current = false;
      if (topRef.current) topRef.current.scrollIntoView({ block: "start" });
    }
  }, [composing]);

  if (viewedProfileCode) {
    return <BibaxProfilePreviewScreen bibroCode={viewedProfileCode} onBack={() => setViewedProfileCode(null)} />;
  }

  // Arrivée depuis une notification : la carte visée est introuvable alors que tout le fil est chargé (supprimée par son
  // auteur, ou masquée). Une carte que je viens moi-même de supprimer ici ne compte pas.
  const focusMissing = !!focusEntryId && entries !== null && !hasMore && !deletedIds.current.has(focusEntryId) && !entries.some((e) => e.id === focusEntryId);

  if (composing) {
    return <PulsePostScreen onBack={() => setComposing(false)} onPublished={handlePublished} canShareStory={storiesEnabled && !!onShareStory} />;
  }

  return (
    <div ref={topRef} style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: COLORS.paperAlt,
            flexShrink: 0,
          }}
        >
          <NavIcon name="activity" size={22} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Pulse</span>
        </h1>
        <button
          onClick={() => setComposing(true)}
          title="Nouvelle publication"
          aria-label="Nouvelle publication"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "none",
            border: `2px solid ${COLORS.amber}`,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.amber} strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {focusMissing && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "10px" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13px", margin: 0 }}>Cette publication n'est plus disponible.</p>
        </div>
      )}

      {entries === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : entries.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", margin: 0 }}>
            Aucune activité pour l'instant. Suivez d'autres Bibax ou attendez vos premières découvertes !
          </p>
        </div>
      ) : (
        <>
          {/* Pleine largeur : le fil sort de la marge de 20 px de la page, les traits de séparation vont d'un bord de l'écran à l'autre. */}
          <div style={{ margin: "0 -20px", borderTop: `1px solid ${COLORS.pinkFluo}` }}>
          {entries.map((entry) => (
            <PulseCard
              key={entry.id}
              flat
              separatorColor={COLORS.pinkFluo}
              ref={entry.id === targetId ? focusedCardRef : null}
              entry={entry}
              directories={directories}
              myUserId={myUserId}
              myBibroCode={myBibroCode}
              onOpenVenue={rememberThen(entry.id, onOpenVenue)}
              onOpenTagged={(person) => {
                if (person.id === myUserId) rememberThen(entry.id, goToProfile, { profile: true })();
                else if (person.bibro_code) openProfileFrom(entry.id, person.bibro_code);
              }}
              onOpenDrink={rememberThen(entry.id, onOpenDrink)}
              onOpenBrand={rememberThen(entry.id, onOpenBrand)}
              onOpenProducer={rememberThen(entry.id, onOpenProducer)}
              onOpenClub={rememberThen(entry.id, onOpenClub)}
              onOpenProfile={entry.actorId === myUserId ? rememberThen(entry.id, goToProfile, { profile: true }) : (code) => openProfileFrom(entry.id, code)}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
              onDeleted={removeEntry}
              highlighted={entry.id === focusEntryId}
              initialShowComments={entry.id === focusEntryId && openCommentsOnFocus}
            />
          ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ marginTop: "14px", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
            >
              {loadingMore ? "Chargement..." : "Voir plus"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
