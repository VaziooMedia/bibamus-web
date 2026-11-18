// « Mon Historique » (Mon Profil) — toute l'activité de la personne dans UNE SEULE chronologie, du plus récent au plus ancien, regroupée par
// période (6 h → 6 h) sous une barre datée, comme l'Historique de BibaSolo : verres BibaSolo, DrinkChecks, PlaceChecks et soirées BibaRoom.
// Aucun montant (les anciens « 0,00 € » n'existaient pas vraiment) et aucune suppression ici : la fiche d'une soirée garde la sienne.
// Chaque ligne porte sa « sorte » juste sous le titre (BibaSolo, DrinkCheck, PlaceCheck, BibaRoom : icône + nom).
// Les verres / DrinkChecks / PlaceChecks viennent de la fonction `get_my_history` (par pages de HISTORY_PAGE_SIZE, bouton « Voir plus ») ;
// les soirées viennent de la liste `events` déjà en mémoire, insérées à leur date tant qu'elles ne sont pas plus anciennes que la dernière
// page chargée (sans quoi une soirée ancienne apparaîtrait avant des verres qu'on n'a pas encore reçus).
// Retour d'une fiche (produit, lieu, soirée) : l'écran se rouvre comme on l'avait laissé — mêmes pages chargées, même position — puis se met à
// jour en silence (un DrinkCheck fait sur la fiche apparaît). La mémoire (`historyMemory`) est effacée à chaque entrée depuis Mon Profil.
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ScrollToTopButton, EntityAvatar, SalonAvatar } from "./ui.jsx";
import { ScreenTitle } from "./MyFavoritesScreen.jsx";
import { HistoryCalendar, dayKeyOf } from "./HistoryCalendar.jsx";
import { loadMyHistory, loadMyHistoryDays, loadDrinksByIds, loadVenuesByIds } from "../data/sharedDirectories.js";
import { SoloCheckinRow, SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE, formatPeriodDay, soloPeriodStartOf, formatDateOnly, formatTimeOnly, QUICK_VENUE_IDS, HISTORY_PAGE_SIZE } from "./BibaSoloScreen.jsx";
import beerCheckIconUrl from "../assets/brand/beer-check-profil.png";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";
import bibaGoIconUrl from "../assets/brand/bibago-carte.svg";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";

// Mémoire de l'écran entre une visite et le retour d'une fiche : { rows, received, hasMore, drinksById, venuesById, scrollTop }.
let historyMemory = null;
export const clearMyHistoryMemory = () => {
  historyMemory = null;
};
export const hasMyHistoryMemory = () => historyMemory !== null;

const AMBER_DOT = <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block", flexShrink: 0 }} />;

// Instant d'une soirée : son heure de création quand on l'a ; à défaut sa date (sans heure connue).
function eventMoment(ev) {
  if (Number.isFinite(ev.createdAt)) return { at: ev.createdAt, timeKnown: true };
  const fromDate = ev.date ? Date.parse(`${ev.date}T12:00:00`) : NaN;
  return { at: fromDate, timeKnown: false };
}

// Éléments séparés par des points vert fluo (même rendu que les lignes de BibaSolo).
function DotLine({ parts, line }) {
  if (parts.length === 0) return null;
  return (
    <div data-history-line={line} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.inkSoft, flexWrap: "wrap" }}>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && AMBER_DOT}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}

// « Sorte » de la ligne : icône + nom (« Check » / « Room » / « Solo » en vert fluo), en tête de la ligne qui suit le titre.
const typePart = (icon, prefix, suffix) => (
  <span key="type" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 700, color: COLORS.ink }}>
    <img src={icon} alt="" width="16" height="16" style={{ display: "block", flexShrink: 0, objectFit: "contain" }} />
    <span>
      {prefix}
      <span style={{ color: COLORS.amber }}>{suffix}</span>
    </span>
  </span>
);

// Ligne d'un DrinkCheck, d'un PlaceCheck ou d'une soirée BibaRoom — même squelette que SoloCheckinRow : rond de 40 px à gauche, à droite le
// titre (gras), la ligne « type » (icône + nom du type, puis les détails), le lieu (icône vert fluo) et la date + l'heure.
// Le « / » des dates (« Lundi 16/11 », « 16/11/2026 ») s'écrit en blanc (`ink`), le reste du texte garde sa couleur (Mehdi, 2026-11-18).
function slashWhite(text) {
  return String(text)
    .split("/")
    .map((chunk, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span style={{ color: COLORS.ink }}>/</span>}
        {chunk}
      </React.Fragment>
    ));
}

// Le texte d'une barre de période : le nom du jour en blanc (`ink`), la date (« 17/11 », avec l'année si ce n'est pas l'année en cours) en `amber` avec ses « / » en blanc ;
// « Aujourd'hui » est tout en blanc (Mehdi, 2026-11-18, variante B).
function periodLabel(text) {
  const white = { color: COLORS.ink };
  const m = /^(\S+) (\d{2}\/\d{2}(?:\/\d{4})?)$/.exec(text);
  if (!m) return <span style={white}>{text}</span>;
  return (
    <>
      <span style={white}>{m[1]}</span> {slashWhite(m[2])}
    </>
  );
}

function HistoryRow({ avatar, title, typeIcon, typePrefix, typeSuffix, details = [], venueName, dateParts, isLast, onOpen, kind }) {
  return (
    <button
      type="button"
      data-history-row={kind}
      onClick={onOpen || undefined}
      disabled={!onOpen}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        width: "100%",
        padding: "12px 0",
        background: "none",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
        textAlign: "left",
        color: "inherit",
        font: "inherit",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <span style={{ flexShrink: 0, marginTop: "2px", display: "flex" }}>{avatar}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{title}</span>
        <DotLine line="type" parts={[typePart(typeIcon, typePrefix, typeSuffix), ...details]} />
        {venueName && (
          <div data-history-line="venue" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: COLORS.inkSoft, minWidth: 0 }}>
            <span style={{ display: "flex", flexShrink: 0 }}>
              <NavIcon name="map-pin" size={12} color={COLORS.amber} />
            </span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venueName}</span>
          </div>
        )}
        <DotLine line="date" parts={dateParts.map((p, i) => <span key={i}>{slashWhite(p)}</span>)} />
      </div>
    </button>
  );
}

export function MyHistoryScreen({ events = [], mainScrollRef, onBack, onOpenDrink, onOpenVenue, onOpenEvent }) {
  // Retour d'une fiche : on repart de ce qui était affiché (voir `historyMemory`). Lu une seule fois, au premier rendu.
  const restored = useRef(historyMemory).current;
  const [rows, setRows] = useState(restored ? restored.rows : null); // null = chargement de la première page
  const [received, setReceived] = useState(restored ? restored.received : 0); // lignes reçues du serveur (sert de décalage pour la page suivante)
  const [hasMore, setHasMore] = useState(restored ? restored.hasMore : false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [drinksById, setDrinksById] = useState(restored ? restored.drinksById : {});
  const [venuesById, setVenuesById] = useState(restored ? restored.venuesById : {});

  // Le calendrier (« Aller à un jour ») : ouvert ou non ; les jours actifs lus sur le serveur (`serverDays` : [{ day, n }], null tant qu'ils ne sont pas lus) ; le jour en cours de chargement
  // (`jumping`) ; l'erreur éventuelle (`calError` : « days » = les jours n'ont pas pu être lus, « jump » = l'historique n'a pas pu être chargé jusqu'au jour touché) ; le jour où défiler (`scrollTo`).
  const [calOpen, setCalOpen] = useState(false);
  const [serverDays, setServerDays] = useState(null);
  const [daysLoading, setDaysLoading] = useState(false);
  const [jumping, setJumping] = useState(null);
  const [calError, setCalError] = useState(null);
  const [scrollTo, setScrollTo] = useState(null);
  const lastPicked = useRef(null);

  const loadPage = async (offset) => {
    setLoadingMore(true);
    const page = await loadMyHistory(offset, HISTORY_PAGE_SIZE);
    setLoadingMore(false);
    if (page === null) {
      setError(true);
      if (offset === 0) setRows((prev) => prev || []);
      return;
    }
    setError(false);
    setRows((prev) => (offset === 0 ? page.items : [...(prev || []), ...page.items]));
    setReceived(offset + page.rawCount);
    setHasMore(page.rawCount === HISTORY_PAGE_SIZE);
  };

  // Les jours qui ont de l'activité (une seule requête, légère, quelle que soit la longueur de l'historique).
  const fetchDays = async () => {
    setDaysLoading(true);
    setCalError(null);
    const list = await loadMyHistoryDays();
    setDaysLoading(false);
    if (list === null) setCalError("days");
    else setServerDays(list);
  };

  // Charge l'historique jusqu'au jour demandé (et pas plus loin) : le nombre de lignes à lire se déduit des jours connus, les pages de 100 sont demandées par quatre à la fois ;
  // puis une vérification page par page au cas où une ligne ajoutée entre-temps aurait décalé le compte. Rend false si une page n'a pas pu être lue.
  const loadUntil = async (day) => {
    const needed = (serverDays || []).filter((d) => d.day >= day).reduce((sum, d) => sum + d.n, 0);
    const fresh = [];
    let offset = received;
    let more = hasMore;
    while (more && offset < needed) {
      const offsets = [];
      for (let o = offset; o < needed && offsets.length < 4; o += 100) offsets.push(o);
      const pages = await Promise.all(offsets.map((o) => loadMyHistory(o, 100)));
      if (pages.some((pg) => pg === null)) return false;
      for (const pg of pages) {
        fresh.push(...pg.items);
        offset += pg.rawCount;
        if (pg.rawCount < 100) more = false;
      }
    }
    let all = [...(rows || []), ...fresh];
    const oldestDay = () => (all.length > 0 ? dayKeyOf(soloPeriodStartOf(all[all.length - 1].createdAt)) : null);
    while (more && oldestDay() !== null && oldestDay() > day) {
      const pg = await loadMyHistory(offset, 100);
      if (pg === null) return false;
      all = [...all, ...pg.items];
      offset += pg.rawCount;
      more = pg.rawCount === 100;
    }
    if (all.length > (rows || []).length) {
      setRows(all);
      setReceived(offset);
      setHasMore(more);
    }
    return true;
  };

  // Échap ferme le calendrier.
  useEffect(() => {
    if (!calOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setCalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calOpen]);
  const openCalendar = () => {
    setCalOpen(true);
    if (serverDays === null && !daysLoading) fetchDays();
  };

  // Première visite : la première page. Retour d'une fiche : on recharge en silence tout ce qui était affiché (par lots de 100 au plus) et on ne remplace
  // la liste que si elle a changé (un DrinkCheck fait sur la fiche, une ligne supprimée) ; si le chargement échoue, on garde ce qu'on avait.
  useEffect(() => {
    if (!restored) {
      loadPage(0);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const target = Math.max(restored.received, HISTORY_PAGE_SIZE);
      const fresh = [];
      let offset = 0;
      let more = true;
      while (offset < target) {
        const limit = Math.min(100, target - offset);
        const page = await loadMyHistory(offset, limit);
        if (cancelled || page === null) return;
        fresh.push(...page.items);
        offset += page.rawCount;
        if (page.rawCount < limit) {
          more = false;
          break;
        }
      }
      const signature = (list) => list.map((it) => it.id).join(",");
      if (cancelled || signature(fresh) === signature(restored.rows)) return;
      setRows(fresh);
      setReceived(offset);
      setHasMore(more);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La mémoire suit l'écran ; la position de défilement s'y ajoute au moment où l'on ouvre une fiche (`remembered`).
  useEffect(() => {
    if (rows === null) return;
    historyMemory = { ...(historyMemory || {}), rows, received, hasMore, drinksById, venuesById };
  }, [rows, received, hasMore, drinksById, venuesById]);
  // Retour d'une fiche : on se replace à la hauteur où l'on était (App ne remonte pas en haut dans ce cas).
  useLayoutEffect(() => {
    if (restored) mainScrollRef?.current?.scrollTo(0, restored.scrollTop || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const remembered = (open) => (id) => {
    if (historyMemory) historyMemory.scrollTop = mainScrollRef?.current?.scrollTop || 0;
    if (open) open(id);
  };
  const openDrink = onOpenDrink ? remembered(onOpenDrink) : null;
  const openVenue = onOpenVenue ? remembered(onOpenVenue) : null;
  const openEvent = onOpenEvent ? remembered(onOpenEvent) : null;

  // La chronologie : éléments du serveur + soirées, du plus récent au plus ancien (égalité : l'ordre du serveur, puis les soirées).
  const timeline = useMemo(() => {
    if (rows === null || (error && rows.length === 0)) return [];
    const server = rows.map((it, order) => ({ ...it, at: Date.parse(it.createdAt), timeKnown: true, order }));
    const oldestLoaded = server.length > 0 ? server[server.length - 1].at : -Infinity;
    const rooms = [];
    for (const ev of events) {
      const { at, timeKnown } = eventMoment(ev);
      if (!Number.isFinite(at)) continue;
      if (hasMore && at < oldestLoaded) continue; // plus ancienne que la dernière page chargée : elle viendra avec la suite
      rooms.push({ kind: "room", id: `room-${ev.id}`, ev, at, timeKnown, order: Infinity });
    }
    return [...server, ...rooms].sort((a, b) => b.at - a.at || a.order - b.order);
  }, [rows, events, hasMore, error]);

  // Produits et lieux affichés : seulement ceux qu'on n'a pas encore demandés.
  useEffect(() => {
    const drinkIds = new Set();
    const venueIds = new Set();
    for (const it of timeline) {
      if (it.kind === "solo") {
        if (it.checkin.drinkId) drinkIds.add(String(it.checkin.drinkId));
        if (it.checkin.venueId) venueIds.add(String(it.checkin.venueId));
      } else if (it.kind === "drink") {
        if (it.drinkId) drinkIds.add(String(it.drinkId));
        if (it.venueId) venueIds.add(String(it.venueId));
      } else if (it.kind === "venue") {
        if (it.venueId) venueIds.add(String(it.venueId));
      } else if (it.kind === "room" && it.ev.venueId) venueIds.add(String(it.ev.venueId));
    }
    const missingDrinks = [...drinkIds].filter((id) => !(id in drinksById));
    if (missingDrinks.length > 0) {
      loadDrinksByIds(missingDrinks).then((results) =>
        setDrinksById((prev) => {
          const next = { ...prev };
          missingDrinks.forEach((id) => (next[id] = null));
          results.forEach((d) => (next[String(d.id)] = d));
          return next;
        })
      );
    }
    const missingVenues = [...venueIds].filter((id) => !QUICK_VENUE_IDS.includes(id) && !(id in venuesById));
    if (missingVenues.length > 0) {
      loadVenuesByIds(missingVenues).then((results) =>
        setVenuesById((prev) => {
          const next = { ...prev };
          missingVenues.forEach((id) => (next[id] = null));
          results.forEach((v) => (next[String(v.id)] = v));
          return next;
        })
      );
    }
  }, [timeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const out = [];
    for (const it of timeline) {
      const start = soloPeriodStartOf(it.at);
      const last = out[out.length - 1];
      if (last && last.key === start.getTime()) last.items.push(it);
      else out.push({ key: start.getTime(), start, items: [it] });
    }
    return out;
  }, [timeline]);
  const currentKey = soloPeriodStartOf(new Date()).getTime();
  const thisYear = new Date().getFullYear();
  const groupLabel = (g) => {
    if (g.key === currentKey) return "Aujourd'hui";
    const label = formatPeriodDay(g.start.toISOString());
    return g.start.getFullYear() === thisYear ? label : `${label}/${g.start.getFullYear()}`;
  };

  // Calendrier : les jours (AAAA-MM-JJ, jour de 6 h à 6 h) qui ont de l'activité — ceux du serveur, ceux des soirées BibaRoom et ceux déjà affichés — et le saut vers la barre d'un jour.
  const todayDay = dayKeyOf(soloPeriodStartOf(new Date()));
  const activeDays = useMemo(() => {
    const set = new Set((serverDays || []).map((d) => d.day));
    for (const ev of events) {
      const { at } = eventMoment(ev);
      if (Number.isFinite(at)) set.add(dayKeyOf(soloPeriodStartOf(at)));
    }
    for (const g of groups) set.add(dayKeyOf(g.start));
    return set;
  }, [serverDays, events, groups]);
  const sortedDays = useMemo(() => [...activeDays].sort(), [activeDays]);
  const oldestDay = sortedDays.length > 0 ? sortedDays[0] : todayDay;
  const newestDay = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : todayDay;
  const dayToGroupKey = useMemo(() => new Map(groups.map((g) => [dayKeyOf(g.start), g.key])), [groups]);
  const pickDay = async (day) => {
    lastPicked.current = day;
    setCalError(null);
    if (!dayToGroupKey.has(day)) {
      setJumping(day);
      const ok = await loadUntil(day);
      setJumping(null);
      if (!ok) {
        setCalError("jump");
        return;
      }
    }
    setCalOpen(false);
    setScrollTo(day);
  };
  const retryCalendar = () => (calError === "jump" && jumping === null && lastPicked.current ? pickDay(lastPicked.current) : fetchDays());
  // Dès que la barre du jour touché est affichée, la liste défile jusqu'à elle (12 px sous le haut de l'écran).
  useLayoutEffect(() => {
    if (scrollTo === null) return;
    const key = dayToGroupKey.get(scrollTo);
    if (key === undefined) return;
    const container = mainScrollRef?.current;
    const bar = document.querySelector(`[data-history-bar="${key}"]`);
    if (container && bar) container.scrollTop += bar.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
    setScrollTo(null);
  }, [scrollTo, dayToGroupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const venueOf = (id) => (id ? venuesById[String(id)] : null);
  const shownVenueName = (id) => (id && !QUICK_VENUE_IDS.includes(String(id)) ? venueOf(id)?.name || null : null);
  const dateParts = (at, timeKnown = true) => {
    const iso = new Date(at).toISOString();
    return [formatDateOnly(iso), timeKnown ? formatTimeOnly(iso) : null].filter(Boolean);
  };

  const renderItem = (it, isLast) => {
    if (it.kind === "solo") {
      const c = it.checkin;
      return (
        <SoloCheckinRow
          key={it.id}
          c={c}
          drink={drinksById[String(c.drinkId)]}
          venue={c.venueId ? venueOf(c.venueId) : null}
          isLast={isLast}
          onOpenDrink={openDrink}
          typeLine={<DotLine line="type" parts={[typePart(bibaSoloIconUrl, "Biba", "Solo")]} />}
        />
      );
    }
    if (it.kind === "drink") {
      const drink = drinksById[String(it.drinkId)];
      return (
        <HistoryRow
          key={it.id}
          kind="drink"
          avatar={<EntityAvatar photoUrl={drink?.photoUrl} photoEmoji={drink?.avatarEmoji} size={40} fallbackIcon="bottle" />}
          title={drink?.name || "Boisson"}
          typeIcon={beerCheckIconUrl}
          typePrefix="Drink"
          typeSuffix="Check"
          details={it.volumeCl ? [<span key="vol" style={{ fontWeight: 700, color: COLORS.amber, whiteSpace: "nowrap" }}>{it.volumeCl}cl</span>] : []}
          venueName={shownVenueName(it.venueId)}
          dateParts={dateParts(it.at)}
          isLast={isLast}
          onOpen={drink && openDrink ? () => openDrink(drink.id) : null}
        />
      );
    }
    if (it.kind === "venue") {
      const venue = venueOf(it.venueId);
      return (
        <HistoryRow
          key={it.id}
          kind="venue"
          avatar={<EntityAvatar photoUrl={venue?.profilePhotoUrl} photoEmoji={venue?.avatarEmoji} size={40} fallbackIcon="map-pin" />}
          title={venue?.name || "Lieu"}
          typeIcon={placeCheckIconUrl}
          typePrefix="Place"
          typeSuffix="Check"
          dateParts={dateParts(it.at)}
          isLast={isLast}
          onOpen={venue && openVenue ? () => openVenue(venue.id) : null}
        />
      );
    }
    // Soirée BibaRoom : s'ouvre sur sa fiche (EventHistoryDetailScreen), où se trouve la suppression.
    const ev = it.ev;
    const roundCount = (ev.rounds || []).length;
    const details = [<span key="rounds">{roundCount} tournée{roundCount > 1 ? "s" : ""}</span>];
    if (!ev.closed) details.push(<span key="live" style={{ fontSize: "10px", fontWeight: 700, color: COLORS.sage }}>EN COURS</span>);
    return (
      <HistoryRow
        key={it.id}
        kind="room"
        avatar={<SalonAvatar event={ev} venue={venueOf(ev.venueId)} size={40} />}
        title={ev.name}
        typeIcon={bibaGoIconUrl}
        typePrefix="Biba"
        typeSuffix="Room"
        details={details}
        venueName={shownVenueName(ev.venueId)}
        dateParts={dateParts(it.at, it.timeKnown)}
        isLast={isLast}
        onOpen={openEvent ? () => openEvent(ev.id) : null}
      />
    );
  };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div data-history-day-picker style={{ position: "relative" }}>
        <ScreenTitle
          icon={<NavIcon name="calendar" size={24} color={COLORS.amber} />}
          right={
            rows !== null && groups.length > 0 ? (
              <button
                type="button"
                data-history-day-trigger
                aria-label="Aller à un jour"
                aria-expanded={calOpen}
                onClick={() => (calOpen ? setCalOpen(false) : openCalendar())}
                style={{ background: "none", border: "none", padding: "4px", margin: "-4px", cursor: "pointer", display: "inline-flex" }}
              >
                <NavIcon name="calendar" size={24} color={COLORS.pinkFluo} />
              </button>
            ) : null
          }
        >
          Mon Historique
        </ScreenTitle>
        {calOpen && (
          <>
            <div onClick={() => setCalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
            <div
              style={{ position: "absolute", top: "calc(100% - 8px)", right: 0, width: "100%", maxWidth: "340px", boxSizing: "border-box", zIndex: 30, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
            >
              <HistoryCalendar
                activeDays={activeDays}
                todayDay={todayDay}
                minDay={oldestDay}
                maxDay={newestDay > todayDay ? newestDay : todayDay}
                loading={daysLoading || (serverDays === null && calError === null)}
                busy={jumping !== null}
                error={calError}
                onRetry={retryCalendar}
                onPick={pickDay}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {rows === null ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : groups.length === 0 && !error ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px", lineHeight: 1.5 }}>
            Rien dans ton historique pour l'instant.
            <br />
            Tes verres, DrinkChecks, PlaceChecks et BibaRooms apparaîtront ici.
          </p>
        ) : (
          groups.map((g, gi) => (
            <React.Fragment key={g.key}>
              <div data-history-bar={g.key} style={{ display: "flex", alignItems: "center", gap: "10px", margin: gi === 0 ? "0 0 18px" : "20px 0 18px" }}>
                <span aria-hidden="true" style={{ width: "3px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0, marginRight: "-2px" }} />
                <span data-history-label="1" style={SOLO_BAR_LABEL_STYLE}>{periodLabel(groupLabel(g))}</span>
                <div style={SOLO_BAR_LINE_STYLE} />
              </div>
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                {g.items.map((it, i) => renderItem(it, i === g.items.length - 1))}
              </div>
            </React.Fragment>
          ))
        )}
        {error && (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", marginTop: "16px" }}>
            Impossible de charger l'historique.{" "}
            <button type="button" onClick={() => loadPage(received)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        )}
        {hasMore && !error && (
          <button
            type="button"
            data-history-more="1"
            disabled={loadingMore || jumping !== null}
            onClick={() => loadPage(received)}
            style={{ width: "100%", marginTop: "18px", padding: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", color: COLORS.ink, fontSize: "13px", fontWeight: 700, cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1 }}
          >
            {loadingMore ? "Chargement..." : "Voir plus"}
          </button>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
      {rows !== null && groups.length > 0 && <ScrollToTopButton hideNearBottom={false} />}
    </div>
  );
}
