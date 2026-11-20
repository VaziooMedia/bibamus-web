// ============================================================
// « BibaPulse - Extraits » de l'accueil (piste B, Mehdi, 2026-11-20).
//
// Une bande pleine largeur par extrait (fond `surface`, 2 px `paperAlt` en haut et en bas, comme avant) :
//   - à gauche, le rond de profil de l'auteur (48 px, il déborde de la bande : place prise 40 px, le texte démarre à 64 px) ;
//   - au centre, 3 lignes : ① le nom de l'auteur puis l'heure (« · 2 h ») ; ② une phrase (« a checké Orval », « a découvert … », « a rejoint le BibaClub … ») avec
//     l'objet en vert fluo ; ③ le lieu (pastille de lieu verte + nom) ou, pour un PlaceCheck, l'avis de l'auteur sur le lieu (flamme + libellé), et à droite les compteurs
//     ♥ (Bix) et commentaires, en simple lecture, seulement s'ils sont supérieurs à 0 ;
//   - à droite, une miniature : le rond du produit (photo, emoji ou bouteille) avec la note de l'auteur en pastille (★ 4,5) pour un DrinkCheck ; le rond du lieu pour un
//     PlaceCheck ; le rond du salon pour un BibaRoom ; la photo (carré arrondi) d'une publication libre. Pas de miniature pour une arrivée dans un BibaClub.
// Tout le bloc reste cliquable (il ouvre la fiche sur la page BibaPulse) ; rien d'autre n'y est cliquable (décision du 2026-11-12), les compteurs sont donc de la lecture seule.
//
// Défilement (Mehdi, 2026-11-20) : 6 extraits au plus, en pages de 3 qu'on fait glisser VERS LE HAUT dans une fenêtre fixe (la hauteur de l'accueil ne change pas avec le nombre d'extraits) ; chaque page
// s'arrête au bord haut de la fenêtre (`scroll-snap` vertical). Le début de la bande suivante dépasse sous la 3ᵉ bande (20 px de plus en hauteur) pour montrer qu'il y a une suite ; sous la dernière page,
// cet espace reste vide. Les points de page, l'un en dessous de l'autre, sont dans la ligne de titre, à gauche de la flèche. Ordre chronologique du fil. Avec 3 extraits ou moins : pas de défilement ni de points.
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
import { formatCount } from "../utils.js";

// Rond de profil de l'auteur : 40 px dans la mise en page, 48 px à l'écran (il déborde vers la gauche, le haut et le bas — voir l'ancienne règle du 2026-11-12).
const EXTRAIT_BASE = 40;
const EXTRAIT_ROUND = 48;
// Extraits par page, et nombre de pages (6 extraits au plus).
export const EXTRAITS_PER_PAGE = 3;
export const EXTRAITS_PAGES = 2;
// Hauteur d'une bande (px, bordures comprises) : celle d'une bande de 3 lignes, la même pour toutes (une page = 3 × 65 + 2 × 6 = 207 px, contre 204 px pour les 3 bandes de 2 lignes d'avant), et espace entre deux bandes.
const EXTRAIT_BAND_H = 65;
const EXTRAIT_GAP = 6;
// Ce qui dépasse sous la 3ᵉ bande pour montrer le début de la suivante (px, espace de 6 px compris) ; hauteur de la fenêtre ; distance d'une page à la suivante.
const EXTRAIT_PEEK = 20;
const EXTRAIT_PAGE_H = EXTRAITS_PER_PAGE * EXTRAIT_BAND_H + (EXTRAITS_PER_PAGE - 1) * EXTRAIT_GAP;
const EXTRAIT_WINDOW_H = EXTRAIT_PAGE_H + EXTRAIT_PEEK;
const EXTRAIT_PAGE_STRIDE = EXTRAIT_PAGE_H + EXTRAIT_GAP;
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

function Counter({ icon, count, size }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
      <NavIcon name={icon} size={size} color={COLORS.inkSoft} />
      <span style={{ color: COLORS.ink, fontWeight: 700 }}>{formatCount(count)}</span>
    </span>
  );
}

function ExtraitBand({ entry, obj, venue, isNew, snapStart, onOpen }) {
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
  const showVenue = !!venueLabel && !(isRoom && venueLabel === roomName);
  const line3Left = showVenue ? { icon: "map-pin", text: venueLabel, size: 13 } : placeRating ? { icon: "flame", text: placeRating.fr, size: 13, filled: true } : null;
  const hasCounters = entry.bixCount > 0 || entry.commentsCount > 0;
  const hasLine3 = !!line3Left || hasCounters;

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
      style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderLeft: "none", borderRight: "none", borderRadius: 0, padding: "7px 14px", height: `${EXTRAIT_BAND_H}px`, flexShrink: 0, display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", boxSizing: "border-box", ...(snapStart ? { scrollSnapAlign: "start", scrollSnapStop: "always" } : {}) }}
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
            {line3Left && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                <span style={{ display: "flex", flexShrink: 0 }}>
                  <NavIcon name={line3Left.icon} size={line3Left.size} color={COLORS.amber} filled={!!line3Left.filled} />
                </span>
                <span style={ellipsis}>{line3Left.text}</span>
              </span>
            )}
            {hasCounters && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexShrink: 0 }}>
                {entry.bixCount > 0 && <Counter icon="heart" count={entry.bixCount} size={12} />}
                {entry.commentsCount > 0 && <Counter icon="comment" count={entry.commentsCount} size={12} />}
              </span>
            )}
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

// Points de page, l'un en dessous de l'autre (le défilement est vertical) : celui de la page affichée est vert fluo.
function PageDots({ count, page }) {
  return (
    <span data-extraits-dots aria-hidden="true" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "5px", marginLeft: "auto", marginRight: "4px", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === page ? COLORS.amber : COLORS.paperAlt }} />
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

  // Plusieurs pages : fenêtre fixe qui défile. Sous la dernière page, un espace vide assez haut pour qu'elle puisse s'arrêter au bord haut de la fenêtre (20 px avec 6 extraits).
  const pageCount = Math.ceil(list.length / EXTRAITS_PER_PAGE);
  const scrolls = pageCount > 1;
  const listH = list.length * EXTRAIT_BAND_H + (list.length - 1) * EXTRAIT_GAP;
  const tailPad = scrolls ? Math.max(0, (pageCount - 1) * EXTRAIT_PAGE_STRIDE + EXTRAIT_WINDOW_H - listH) : 0;
  const onScroll = (e) => {
    const i = Math.min(pageCount - 1, Math.round(e.currentTarget.scrollTop / EXTRAIT_PAGE_STRIDE));
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: scrolls ? 0 : "auto",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: `2px solid ${COLORS.amber}`,
          }}
        >
          <NavIcon name="chevron-right" size={12} color={COLORS.amber} />
        </span>
      </button>

      {list.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", margin: 0 }}>En attente des premières activités.</p>
        </div>
      ) : (
        // Bandes en pleine largeur (sortent de la marge de 20 px), 6 px entre deux bandes ; une page = 3 bandes, chaque page s'arrête au bord haut de la fenêtre (Mehdi, 2026-11-20).
        <div
          data-extraits-scroller
          role="region"
          aria-label="Extraits BibaPulse"
          onScroll={scrolls ? onScroll : undefined}
          style={{ margin: "0 -20px", ...(scrolls ? { height: `${EXTRAIT_WINDOW_H}px`, overflowY: "auto", overflowX: "hidden", scrollSnapType: "y mandatory", scrollbarWidth: "none" } : {}) }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: `${EXTRAIT_GAP}px`, paddingBottom: tailPad ? `${tailPad}px` : undefined }}>
            {list.map((entry, i) => (
              <ExtraitBand
                key={entry.id}
                entry={entry}
                obj={resolveObject(entry)}
                venue={entry.venueId ? venuesById[entry.venueId] || null : null}
                isNew={isNew(entry)}
                snapStart={scrolls && i % EXTRAITS_PER_PAGE === 0}
                onOpen={(e) => {
                  markSeen([e.id]);
                  onOpenEntry(e);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
