// ============================================================
// « BibaPulse - Extraits » de l'accueil (piste B, Mehdi, 2026-11-20).
//
// Une bande pleine largeur par extrait (fond `surface`, 2 px `paperAlt` en haut et en bas, comme avant) :
//   - à gauche, le rond de profil de l'auteur (48 px, il déborde de la bande : place prise 40 px, le texte démarre à 64 px) ;
//   - au centre, 3 lignes : ① le nom de l'auteur puis l'heure (« · 2 h ») ; ② une phrase (« a checké Orval », « a découvert … », « a rejoint le BibaClub … ») avec
//     l'objet en vert fluo ; ③ le lieu (son rond de profil + nom ; l'épingle pour @Home / @Event) ou, pour un PlaceCheck, l'avis de l'auteur sur le lieu (flamme + libellé). Pas de compteurs ♥ ni
//     commentaires sur l'accueil (Mehdi, 2026-11-20 : « pas nécessaires », leur absence incite à ouvrir la page Pulse) ;
//     PlaceCheck avec une phrase prédéfinie (la pastille rose de la carte, `metadata.interaction`) : l'avis reste en ③ et la pastille vient EN DERNIER, sur une 4ᵉ ligne (bande plus haute) ;
//   - à droite, une miniature : le rond du produit (photo, emoji ou bouteille) avec la note de l'auteur en pastille (★ 4,5) pour un DrinkCheck ; le rond du lieu pour un
//     PlaceCheck ; le rond du salon pour un BibaRoom ; la photo (carré arrondi) d'une publication libre. Pas de miniature pour une arrivée dans un BibaClub.
// Tout le bloc reste cliquable (il ouvre la fiche sur la page BibaPulse) ; rien d'autre n'y est cliquable (décision du 2026-11-12).
//
// Défilement (Mehdi, 2026-11-20) : 12 extraits au plus, en pages de 3 (4 pages) qu'on fait glisser SUR LE CÔTÉ (comme le carrousel des suggestions Bibax) ; chaque page s'arrête au bord (`scroll-snap`
// horizontal). Un balayage vertical posé sur les extraits fait défiler l'accueil : le défilement vertical dans une fenêtre fixe, essayé le même jour, captait le doigt et gênait (Mehdi). Chaque page garde la
// hauteur de la plus haute page (3 bandes de 3 lignes = 207 px ; une bande à 4 lignes est plus haute), donc la hauteur de l'accueil ne change pas en balayant ni avec le nombre d'extraits. Les points de page, l'un à côté de l'autre (4 avec 12 extraits), sont dans la ligne de titre, à gauche de la
// flèche, sans en changer la hauteur. Ordre chronologique du fil. Avec 3 extraits ou moins : pas de défilement ni de points.
//
// Repère « nouveau » : un petit point vert sur le coin du rond de profil. Un extrait est nouveau s'il est arrivé après la première ouverture de l'accueil sur cet appareil, qu'il
// n'est pas de moi, et que je ne l'ai pas encore ouvert (appui sur la bande) ni ouvert la page BibaPulse par le titre ou la flèche (qui marque tous les extraits affichés comme vus).
// L'état est gardé sur l'appareil (localStorage, par compte) : `{ since, ids }`.
//
// Props : `entries` (le fil, du plus récent au plus ancien) ; `drinksDirectory`, `venuesById`, `breweriesDirectory`, `brandsDirectory` (pour retrouver l'objet de chaque extrait) ;
// `myUserId` ; `onOpenEntry(entry)` : appui sur une bande ; `onSeeAll()` : titre et flèche.
// ============================================================
import React, { useState } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar, SalonAvatar } from "./ui.jsx";
import { pulseClubName } from "../data/sharedDirectories.js";
import { PLACE_INTERACTIONS } from "../placeInteractions.js";
import { PulseInteractionPill } from "./PulseInteractionPill.jsx";

// Rond de profil de l'auteur : 40 px dans la mise en page, 48 px à l'écran (il déborde vers la gauche, le haut et le bas — voir l'ancienne règle du 2026-11-12).
const EXTRAIT_BASE = 40;
const EXTRAIT_ROUND = 48;
// Extraits par page, et nombre de pages (12 extraits au plus : 4 pages de 3).
export const EXTRAITS_PER_PAGE = 3;
export const EXTRAITS_PAGES = 4;
// Hauteur d'une bande (px, bordures comprises) : celle d'une bande de 3 lignes, la même pour toutes (une page = 3 × 65 + 2 × 6 = 207 px, contre 204 px pour les 3 bandes de 2 lignes d'avant), et espace entre deux bandes.
const EXTRAIT_BAND_H = 65;
// Bande de 4 lignes (PlaceCheck avec avis ET phrase prédéfinie : nom, phrase, avis, pastille rose) : 15 px de plus.
const EXTRAIT_BAND_H_TALL = 80;
const EXTRAIT_GAP = 6;
// Rond de profil du lieu devant son nom (ligne ③) : 18 px, il déborde de la ligne (marges négatives) sans la grandir.
const VENUE_ROUND = 18;
// Séparation entre deux pages (Mehdi, 2026-11-20 : le décalage de lignes entre deux trios de bandes, en balayant, dérangeait ; style « A » choisi) : une colonne de 16 px portant une barre verticale vert fluo de 4 px, aux coins arrondis.
const PAGE_SEP = 16;
// Points de page : diamètre et écart (px).
const DOT_SIZE = 6;
const DOT_GAP = 5;
// Bouton-flèche de la ligne de titre (px) : il ouvre la page BibaPulse. Mehdi, 2026-11-20 : « plus visible » → rond vert fluo plein, flèche sombre (comme les boutons « + »), 30 px au lieu de 22 px cerclé.
const ARROW_SIZE = 30;
// Miniature de droite (px).
const EXTRAIT_THUMB = 44;
// Lieux « spéciaux » d'un check ou d'un salon : pas de vraie fiche de lieu (même libellés que le fil, sans le « @ »).
const SPECIAL_VENUE_LABELS = { "@home": "Home", "@event": "Event" };

// L'heure, sans « Il y a » : « 2 h », « 5 min. », « 3 j », « À l'instant ».
function timeShort(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5) return "À l'instant";
  if (secs < 60) return `${secs} sec.`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

// ---- « nouveau » : extraits déjà vus, gardés sur l'appareil ----
const seenKey = (userId) => `bibamus-home-extraits-seen-${userId || ""}`;
const SEEN_MAX_IDS = 60;
function writeSeen(userId, state) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(state));
  } catch {
    /* stockage indisponible : le repère « nouveau » ne se souvient simplement de rien */
  }
}
function readSeen(userId) {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.since === "number" && Array.isArray(parsed.ids)) return parsed;
    }
  } catch {
    /* on repart de zéro */
  }
  // Première ouverture sur cet appareil : ce qui existe déjà n'est pas « nouveau », seul ce qui arrive après le sera.
  const fresh = { since: Date.now(), ids: [] };
  writeSeen(userId, fresh);
  return fresh;
}

function ExtraitBand({ entry, obj, venue, isNew, onOpen }) {
  const meta = entry.metadata || {};
  const type = entry.eventType;
  const isClubJoin = type === "club_joined";
  const isPost = type === "post";
  const isRoomLaunch = type === "room_launched";
  const isRoomJoin = type === "room_joined";
  const isRoom = isRoomLaunch || isRoomJoin;
  const isPlaceCheck = type === "venue_visit";
  const isDrinkEvent = type === "drink_checked" || type === "product_discovered" || (type === "database_contribution" && entry.objectType === "drink");
  const isKnownCheck = isPlaceCheck || isDrinkEvent || type === "database_contribution";
  const objName = obj?.name || (isPlaceCheck ? "un établissement" : type === "database_contribution" ? "une fiche" : "un produit");
  const clubName = isClubJoin ? pulseClubName(entry) : null;
  const roomName = isRoom && typeof meta.room_name === "string" ? meta.room_name : "";
  const postText = isPost && typeof meta.comment === "string" ? meta.comment.replace(/\s+/g, " ").trim() : "";
  const isDiscovery = type === "product_discovered" || (isPlaceCheck && meta.discovery === true);
  const verb = type === "database_contribution" ? "a ajouté" : isDiscovery ? "a découvert" : "a checké";
  const strong = (text) => <strong style={{ color: COLORS.amber }}>{text}</strong>;

  // Ligne ③ gauche : le lieu du check / de la publication / du salon (pastille de lieu verte + nom) ; pour un PlaceCheck, l'avis de l'auteur sur le lieu (flamme + libellé).
  const venueLabel = entry.objectType !== "venue" && entry.venueId ? SPECIAL_VENUE_LABELS[entry.venueId] || venue?.name || null : null;
  const placeRating = isPlaceCheck ? RATING_LABELS.find((l) => l.value === meta.venue_rating) || null : null;
  const placeInteraction = isPlaceCheck ? PLACE_INTERACTIONS.find((i) => i.code === meta.interaction) || null : null;
  const showVenue = !!venueLabel && !(isRoom && venueLabel === roomName);
  // PlaceCheck avec une phrase prédéfinie : l'avis (flamme + libellé) reste sur la ligne ③ et la pastille rose de la phrase vient EN DERNIER, sur une ligne ④, dans une bande plus haute
  // (Mehdi, 2026-11-20 : « la phrase pastille rose en dernier, après l'appréciation »). Sans avis, la pastille prend la ligne ③ et la bande garde 3 lignes.
  const avisLine = placeRating ? { icon: "flame", text: placeRating.fr, size: 13, filled: true } : null;
  const phraseLine = placeInteraction ? { phrase: placeInteraction.label } : null;
  // Lieu : son rond de profil (photo, sinon emoji, sinon le « B » Bibamus) à la place de l'épingle (Mehdi, 2026-11-20, comme dans BibaSolo) ; @Home et @Event n'ont pas de fiche : ils gardent l'épingle.
  const line3Left = showVenue ? { icon: "map-pin", text: venueLabel, size: 13, venueRound: venue && !SPECIAL_VENUE_LABELS[entry.venueId] ? venue : null } : avisLine || phraseLine;
  const line4 = avisLine && phraseLine ? phraseLine : null;
  const hasLine3 = !!line3Left;
  const bandH = line4 ? EXTRAIT_BAND_H_TALL : EXTRAIT_BAND_H;

  // Miniature de droite.
  const photoUrl = isPost && typeof meta.photo_url === "string" && meta.photo_url.startsWith("https://") ? meta.photo_url : null;
  const rating = isDrinkEvent && typeof meta.rating === "number" ? String(meta.rating).replace(".", ",") : null;
  let thumb = null;
  if (isDrinkEvent) thumb = <EntityAvatar photoUrl={obj?.photoUrl} photoEmoji={obj?.avatarEmoji} size={EXTRAIT_THUMB} fallbackIcon="bottle" />;
  else if (isPlaceCheck || (type === "database_contribution" && entry.objectType === "venue")) thumb = <EntityAvatar photoUrl={obj?.profilePhotoUrl} photoEmoji={obj?.avatarEmoji} size={EXTRAIT_THUMB} fallbackIcon="map-pin" />;
  else if (isRoom) thumb = <SalonAvatar event={{ isHome: entry.venueId === "@home", venueId: entry.venueId === "@event" ? "@event" : null }} venue={venue} size={EXTRAIT_THUMB} />;
  else if (photoUrl)
    thumb = <span style={{ display: "block", width: `${EXTRAIT_THUMB}px`, height: `${EXTRAIT_THUMB}px`, boxSizing: "border-box", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: `${COLORS.paperAlt} url(${photoUrl}) center/cover no-repeat`, flexShrink: 0 }} />;

  const fullName = [entry.actorName, entry.actorLastName].filter(Boolean).join(" ") || "Quelqu'un";
  const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

  return (
    <div
      data-home-extrait
      data-new={isNew ? "1" : undefined}
      role="button"
      tabIndex={0}
      // Tout le bloc ouvre la fiche Pulse de cet extrait, sur la page BibaPulse (barre verte à gauche) — Mehdi, 2026-11-12. Rien d'autre n'est cliquable dans le bloc.
      onClick={() => onOpen(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(entry);
        }
      }}
      style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderLeft: "none", borderRight: "none", borderRadius: 0, padding: "7px 14px", height: `${bandH}px`, flexShrink: 0, display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", boxSizing: "border-box" }}
    >
      <span style={{ position: "relative", display: "flex", flexShrink: 0, margin: `${-(EXTRAIT_ROUND - EXTRAIT_BASE) / 2}px 0 ${-(EXTRAIT_ROUND - EXTRAIT_BASE) / 2}px ${-(EXTRAIT_ROUND - EXTRAIT_BASE)}px` }}>
        <EntityAvatar photoUrl={entry.actorAvatarUrl} size={EXTRAIT_ROUND} />
        {isNew && <span role="img" aria-label="Nouveau" style={{ position: "absolute", top: "1px", right: "-1px", width: "11px", height: "11px", borderRadius: "50%", background: COLORS.amber, border: `2px solid ${COLORS.surface}`, boxSizing: "content-box" }} />}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "5px", minWidth: 0, lineHeight: 1.2 }}>
          <span style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, minWidth: 0, ...ellipsis }}>{fullName}</span>
          <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, flexShrink: 0, whiteSpace: "nowrap" }}>· {timeShort(entry.createdAt)}</span>
        </div>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: "12.5px",
            lineHeight: 1.2,
            color: COLORS.ink,
            // Une publication libre : son texte sur 2 lignes s'il n'y a pas de ligne ③, sur 1 sinon ; les autres phrases tiennent sur une ligne.
            ...(isPost && !hasLine3 ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" } : ellipsis),
          }}
        >
          {isClubJoin ? (
            <>a rejoint le BibaClub {strong(clubName || "un club")}</>
          ) : isRoomLaunch ? (
            <>a lancé le BibaRoom {strong(roomName || "sans titre")}</>
          ) : isRoomJoin ? (
            <>a rejoint le BibaRoom {strong(roomName || "sans titre")}</>
          ) : isPost ? (
            postText
          ) : isKnownCheck ? (
            <>
              {verb} {strong(objName)}
            </>
          ) : (
            "Nouvelle activité"
          )}
        </p>
        {hasLine3 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1px", fontSize: "11.5px", lineHeight: 1.2, color: COLORS.inkSoft, minWidth: 0 }}>
            {line3Left.phrase ? (
              <span style={{ display: "flex", minWidth: 0 }}>
                <PulseInteractionPill label={line3Left.phrase} compact />
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                <span style={{ display: "flex", flexShrink: 0 }}>
                  {line3Left.venueRound ? (
                    <span style={{ display: "flex", margin: `${-(VENUE_ROUND - 14) / 2}px 0` }}>
                      <EntityAvatar photoUrl={line3Left.venueRound.profilePhotoUrl} photoEmoji={line3Left.venueRound.avatarEmoji} size={VENUE_ROUND} />
                    </span>
                  ) : (
                    <NavIcon name={line3Left.icon} size={line3Left.size} color={COLORS.amber} filled={!!line3Left.filled} />
                  )}
                </span>
                <span style={ellipsis}>{line3Left.text}</span>
              </span>
            )}
          </div>
        )}
        {line4 && (
          <div style={{ display: "flex", alignItems: "center", marginTop: "1px", minWidth: 0 }}>
            <span style={{ display: "flex", minWidth: 0 }}>
              <PulseInteractionPill label={line4.phrase} compact />
            </span>
          </div>
        )}
      </div>

      {thumb && (
        <span style={{ position: "relative", display: "flex", flexShrink: 0 }}>
          {thumb}
          {rating && (
            <span style={{ position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: "2px", background: COLORS.paper, border: `1.5px solid ${COLORS.amber}`, color: COLORS.amber, borderRadius: "999px", fontSize: "9.5px", fontWeight: 700, padding: "0 5px", lineHeight: "14px", whiteSpace: "nowrap" }}>
              <NavIcon name="star" size={9} color={COLORS.amber} filled />
              {rating}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Points de page, l'un à côté de l'autre (Mehdi, 2026-11-20 : horizontaux, pour indiquer qu'on balaie de gauche à droite et non de haut en bas) : celui de la page affichée est vert fluo, les autres `paperAlt`.
// À 36 px de la flèche (« encore un peu plus » à gauche) ; ils tiennent dans la hauteur de la ligne de titre (22 px).
function PageDots({ count, page }) {
  return (
    <span data-extraits-dots aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: `${DOT_GAP}px`, marginLeft: "auto", marginRight: "28px", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: `${DOT_SIZE}px`, height: `${DOT_SIZE}px`, borderRadius: "50%", background: i === page ? COLORS.amber : COLORS.paperAlt }} />
      ))}
    </span>
  );
}

export function HomeExtraits({ entries, drinksDirectory = [], venuesById = {}, breweriesDirectory = [], brandsDirectory = [], myUserId, onOpenEntry, onSeeAll }) {
  const list = (entries || []).slice(0, EXTRAITS_PER_PAGE * EXTRAITS_PAGES);
  const [seen, setSeen] = useState(() => readSeen(myUserId));
  const [page, setPage] = useState(0);

  // On écrit tout de suite dans le stockage (et non dans une fonction de mise à jour de l'état) : un appui sur une bande quitte l'accueil aussitôt, avant tout nouveau rendu.
  const markSeen = (ids) => {
    const next = { since: seen.since, ids: [...new Set([...seen.ids, ...ids])].slice(-SEEN_MAX_IDS) };
    writeSeen(myUserId, next);
    setSeen(next);
  };
  const isNew = (entry) => entry.actorId !== myUserId && new Date(entry.createdAt).getTime() > seen.since && !seen.ids.includes(entry.id);

  const resolveObject = (entry) => {
    const objType = entry.eventType === "venue_visit" ? "venue" : entry.objectType;
    // Pour un lieu : son identifiant. Pour un produit ou une fiche : toujours l'objet lui-même, même quand la publication précise aussi le lieu où le check a été fait.
    const id = objType === "venue" ? entry.venueId || entry.objectId : entry.objectId;
    if (objType === "venue") return venuesById[id] || null;
    const map = { drink: drinksDirectory, producer: breweriesDirectory, brand: brandsDirectory };
    return (map[objType] || []).find((x) => x.id === id) || null;
  };

  // Pages de 3 bandes, côte à côte, qu'on fait glisser sur le côté.
  const pages = [];
  for (let i = 0; i < list.length; i += EXTRAITS_PER_PAGE) pages.push(list.slice(i, i + EXTRAITS_PER_PAGE));
  const pageCount = pages.length;
  const scrolls = pageCount > 1;
  const onScroll = (e) => {
    const el = e.currentTarget;
    const i = Math.min(pageCount - 1, Math.round(el.scrollLeft / ((el.clientWidth || 1) + PAGE_SEP)));
    setPage((p) => (p === i ? p : i));
  };

  return (
    <div style={{ marginBottom: "18px" }}>
      <button
        onClick={() => {
          markSeen(list.map((e) => e.id));
          onSeeAll();
        }}
        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", marginBottom: "8px" }}
      >
        <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Pulse</span>
          <span style={{ color: COLORS.inkSoft }}> - Extraits</span>
        </span>
        {scrolls && <PageDots count={pageCount} page={page} />}
        <span
          data-extraits-arrow
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: scrolls ? 0 : "auto",
            // Plus grand que l'ancien rond de 22 px (marges négatives : la ligne de titre garde sa hauteur).
            width: `${ARROW_SIZE}px`,
            height: `${ARROW_SIZE}px`,
            margin: `${-(ARROW_SIZE - 22) / 2}px 0 ${-(ARROW_SIZE - 22) / 2}px ${scrolls ? 0 : "auto"}`,
            borderRadius: "50%",
            flexShrink: 0,
            boxSizing: "border-box",
            background: COLORS.amber,
          }}
        >
          <NavIcon name="chevron-right" size={15} color={COLORS.paper} />
        </span>
      </button>

      {list.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", margin: 0 }}>En attente des premières activités.</p>
        </div>
      ) : (
        // Bandes en pleine largeur (sortent de la marge de 20 px), 6 px entre deux bandes d'une page ; les pages se font glisser sur le côté et s'arrêtent chacune au bord (Mehdi, 2026-11-20).
        <div
          data-extraits-scroller
          role="region"
          aria-label="Extraits BibaPulse"
          onScroll={scrolls ? onScroll : undefined}
          style={{ display: "flex", overflowX: scrolls ? "auto" : "visible", overflowY: scrolls ? "hidden" : "visible", scrollSnapType: scrolls ? "x mandatory" : undefined, margin: "0 -20px", scrollbarWidth: "none", overscrollBehaviorX: "contain" }}
        >
          {pages.map((pageEntries, pi) => (
            <React.Fragment key={pi}>
            <div data-extraits-page style={{ flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "start", scrollSnapStop: "always", display: "flex", flexDirection: "column", gap: `${EXTRAIT_GAP}px` }}>
              {pageEntries.map((entry) => (
                <ExtraitBand
                  key={entry.id}
                  entry={entry}
                  obj={resolveObject(entry)}
                  venue={entry.venueId ? venuesById[entry.venueId] || null : null}
                  isNew={isNew(entry)}
                  onOpen={(e) => {
                    markSeen([e.id]);
                    onOpenEntry(e);
                  }}
                />
              ))}
            </div>
            {pi < pages.length - 1 && (
              <div data-extraits-sep aria-hidden="true" style={{ flex: `0 0 ${PAGE_SEP}px`, display: "flex", justifyContent: "center" }}>
                <span style={{ width: "4px", borderRadius: "2px", background: COLORS.amber }} />
              </div>
            )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
