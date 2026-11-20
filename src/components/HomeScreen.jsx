// ============================================================
// Écran d'accueil (Home) — copié tel quel depuis le prototype
// Claude, avec juste le nom renommé en HomeScreen pour plus de clarté.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, APP_VERSION } from "../constants.js";
import placeCheckIconUrl from "../assets/brand/place-check.svg";
import drinkCheckIconUrl from "../assets/brand/drink-check.svg";
import loupeIconUrl from "../assets/brand/loupe.svg";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";
import { NavIcon, BibamusLogoFull } from "./icons.jsx";
import { SalonAvatar, CategoryTile } from "./ui.jsx";
import { HomeExtraits } from "./HomeExtraits.jsx";
import { BibaxSuggestionsCarousel } from "./BibaxSuggestionsCarousel.jsx";
import { loadSalon } from "../data/salons.js";
import { loadPulseFeed, loadBibaxSuggestions, attachUsernames, dismissBibaxSuggestion, sendBibaxRequest, loadPulseStories, loadOfficialStories, loadDrinksByIds, loadVenuesByIds } from "../data/sharedDirectories.js";
import { StoriesBar } from "./StoriesBar.jsx";
import { TravelAgeWarning } from "./TravelAgeWarning.jsx";

const CHECKIN_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const isFreshCheckIn = (status) => !!(status && status.checkedInAt && Date.now() - status.checkedInAt < CHECKIN_MAX_AGE_MS);

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return dateStr;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
  } catch {
    return "";
  }
};


// Diamètre du rond de profil d'un bloc BibaLive (px) : il grandit vers la gauche à partir d'un rond de 56 px (voir le bloc BibaLive plus bas).
const BIBALIVE_ROUND = 68;
export function HomeScreen({
  profile,
  events,
  openEvent,
  updateEvent,
  goToBibaxSuggestions,
  onOpenBibaxProfile,
  onOpenVenue,
  onOpenDrink,
  onOpenClub,
  breweriesDirectory = [],
  brandsDirectory = [],
  pulseStoriesRefreshKey,
  onAddStory,
  onOpenStoryAuthor,
  myUserId,
  goToProfile,
  goToGames,
  goToBibaMeet,
  goToBibaClubs,
  goToBibaPulse,
  onOpenPulseEntry,
  bibaMeetVisible = true,
  bibaPulseVisible = true,
  gamesVisible = true,
  storiesEnabled = true,
  goToSettings,
  goToSearch,
  goToDrinkCheck,
  goToPlaceCheck,
  goToBibaSolo,
  bibros,
  bibroStatuses,
  onQuickJoinSalon,
  myName,
  myBibroCode,
  avatarUrl,
  lastName,
}) {
  const [pulseEntries, setPulseEntries] = useState(null);
  // Aperçu borné (dernières entrées Pulse sur l'accueil) — les produits qu'il référence forment
  // un ensemble tout aussi borné, jamais besoin du répertoire complet.
  const [drinksDirectory, setDrinksDirectory] = useState([]);
  useEffect(() => {
    const ids = new Set();
    (pulseEntries || []).forEach((e) => e.objectType === "drink" && e.objectId && ids.add(e.objectId));
    if (ids.size === 0) return;
    loadDrinksByIds([...ids]).then((results) => setDrinksDirectory((prev) => [...prev.filter((d) => !ids.has(d.id)), ...results]));
  }, [pulseEntries]);
  // Même principe pour les lieux — référencés par les événements en cours (BibaLive) et par le
  // fil Pulse, jamais besoin du répertoire complet.
  const [venuesById, setVenuesById] = useState({});
  useEffect(() => {
    const ids = new Set();
    events.forEach((ev) => ev.venueId && ids.add(ev.venueId));
    (pulseEntries || []).forEach((e) => e.objectType === "venue" && e.objectId && ids.add(e.objectId));
    // Le lieu d'un check, d'une publication ou d'un salon (ligne de lieu et rond de la miniature) ; « @home » et « @event » n'ont pas de fiche.
    (pulseEntries || []).forEach((e) => e.venueId && !String(e.venueId).startsWith("@") && ids.add(e.venueId));
    if (ids.size === 0) return;
    loadVenuesByIds([...ids]).then((results) =>
      setVenuesById((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v])) }))
    );
  }, [events, pulseEntries]);
  const [stories, setStories] = useState([]);
  const [officialStories, setOfficialStories] = useState([]);
  useEffect(() => {
    loadPulseStories().then(setStories);
    loadOfficialStories().then(setOfficialStories);
  }, [pulseStoriesRefreshKey]);
  useEffect(() => {
    // 12 extraits au plus : 4 pages de 3 qu'on fait glisser sur le côté (HomeExtraits).
    loadPulseFeed(null, 12).then(setPulseEntries);
  }, []);


  const [bibaxSuggestionsPool, setBibaxSuggestionsPool] = useState(null);
  const [addingBibaxCode, setAddingBibaxCode] = useState(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  useEffect(() => {
    // Charge plus que ce qui est affiché (8 cartes dans le carrousel) — dès qu'on en ajoute une ou qu'on en supprime une,
    // la suivante du lot prend directement sa place, sans nouvel aller-retour serveur.
    loadBibaxSuggestions(20).then(attachUsernames).then(setBibaxSuggestionsPool);
  }, []);
  const bibaxSuggestions = (bibaxSuggestionsPool || []).slice(0, 8);
  const addSuggestedBibax = async (bibroCode) => {
    setAddingBibaxCode(bibroCode);
    await sendBibaxRequest(bibroCode);
    setAddingBibaxCode(null);
    setBibaxSuggestionsPool((prev) => (prev || []).filter((s) => s.bibroCode !== bibroCode));
  };
  const dismissSuggestedBibax = (s) => {
    setBibaxSuggestionsPool((prev) => (prev || []).filter((x) => x.userId !== s.userId));
    dismissBibaxSuggestion(s.userId);
  };

  // Filet de sécurité supplémentaire — vérifie, au retour sur l'accueil, si un événement
  // partagé encore actif de son côté n'a pas déjà été clôturé par un autre participant
  // pendant ce temps (le tableau de bord fait cette même vérification en continu, mais
  // seulement tant qu'il reste ouvert).
  React.useEffect(() => {
    const activeSalonEvents = events.filter((e) => e.salonCode && !e.closed);
    if (activeSalonEvents.length === 0) return;
    activeSalonEvents.forEach((e) => {
      loadSalon(e.salonCode)
        .then((latest) => {
          if (latest?.closed) updateEvent(e.id, (ev) => ({ ...ev, closed: true, closedAt: latest.closedAt }));
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "20px 20px 28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "-16px" }}>
          <div style={{ height: "76px", display: "flex", alignItems: "center", gap: "8px" }}>
            <BibamusLogoFull height={38} />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "11px", color: COLORS.redFluo, border: `2px solid ${COLORS.redFluo}`, borderRadius: "6px", padding: "1px 6px", letterSpacing: "0.5px" }}>
              Test
            </span>
          </div>
          <span style={{ fontSize: "10px", color: COLORS.inkSoft, marginTop: "-8px" }}>Version {APP_VERSION}</span>
        </div>
        <div style={{ position: "relative", width: "76px", height: "76px", flexShrink: 0 }}>
          <button
            onClick={goToProfile}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, margin: 0, display: "flex", alignItems: "center", height: "76px" }}
          >
            <span
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: COLORS.paperAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0,
                border: `2px solid ${COLORS.paperAlt}`,
                overflow: "hidden",
              }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={44} color={COLORS.amber} />}
            </span>
          </button>
          {storiesEnabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStory("global", null);
            }}
            style={{
              position: "absolute",
              bottom: "-2px",
              left: "-2px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#FF2C8F",
              border: `2px solid ${COLORS.paper}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          )}
        </div>
      </div>

      <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "0 -20px 14px" }} />
      <div style={{ display: "flex", justifyContent: "center", gap: "28px", marginBottom: "14px" }}>
        <div data-tour="atlas" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "68px" }}>
          <button
            onClick={goToSearch}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: COLORS.surface, // fond bleuté, comme les blocs de l'accueil (décision de Mehdi, 2026-11-12)
              border: `2px solid ${COLORS.paperAlt}`,
              cursor: "pointer",
            }}
          >
            <img src={loupeIconUrl} alt="BibAtlas" style={{ width: "28px", height: "28px" }} />
          </button>
          <span style={{ fontSize: "9.5px", fontWeight: 600, textAlign: "center" }}>
            <span style={{ color: COLORS.ink }}>Bib</span>
            <span style={{ color: COLORS.amber }}>Atlas</span>
          </span>
        </div>
        <div data-tour="solo" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "68px" }}>
          <button
            onClick={goToBibaSolo}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: COLORS.surface, // fond bleuté, comme les blocs de l'accueil (décision de Mehdi, 2026-11-12)
              border: `2px solid ${COLORS.paperAlt}`,
              cursor: "pointer",
            }}
          >
            <img src={bibaSoloIconUrl} alt="BibaSolo" style={{ width: "28px", height: "28px" }} />
          </button>
          <span style={{ fontSize: "9.5px", fontWeight: 600, textAlign: "center" }}>
            <span style={{ color: COLORS.ink }}>Biba</span>
            <span style={{ color: COLORS.amber }}>Solo</span>
          </span>
        </div>
        <div data-tour="drinkcheck" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "68px" }}>
          <button
            onClick={goToDrinkCheck}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: COLORS.surface, // fond bleuté, comme les blocs de l'accueil (décision de Mehdi, 2026-11-12)
              border: `2px solid ${COLORS.paperAlt}`,
              cursor: "pointer",
            }}
          >
            <img src={drinkCheckIconUrl} alt="Drink Check" style={{ width: "32px", height: "32px" }} />
          </button>
          <span style={{ fontSize: "9.5px", fontWeight: 600, textAlign: "center" }}>
            <span style={{ color: COLORS.ink }}>Drink</span>
            <span style={{ color: COLORS.amber }}>Check</span>
          </span>
        </div>
        <div data-tour="placecheck" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "68px" }}>
          <button
            onClick={goToPlaceCheck}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: COLORS.surface, // fond bleuté, comme les blocs de l'accueil (décision de Mehdi, 2026-11-12)
              border: `2px solid ${COLORS.paperAlt}`,
              cursor: "pointer",
            }}
          >
            <img src={placeCheckIconUrl} alt="Place Check" style={{ width: "32px", height: "32px" }} />
          </button>
          <span style={{ fontSize: "9.5px", fontWeight: 600, textAlign: "center" }}>
            <span style={{ color: COLORS.ink }}>Place</span>
            <span style={{ color: COLORS.amber }}>Check</span>
          </span>
        </div>
      </div>
      <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "0 -20px 18px" }} />

      <TravelAgeWarning profile={profile} />
      {(stories.length > 0 || officialStories.length > 0) && (
        <div>
          {/* Sans Stories : ni barre de Stories ni deuxième trait, un seul trait sous les boutons ronds. */}
          <StoriesBar stories={stories} onOpenStory={onOpenStoryAuthor} myUserId={myUserId} officialStories={officialStories} />

          <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "-10px -20px 18px" }} />
        </div>
      )}

      {bibros.some((b) => bibroStatuses[b.code] && (bibroStatuses[b.code].activeSalonName || isFreshCheckIn(bibroStatuses[b.code]))) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft }}>TES BIBAX EN SOIRÉE</span>
          </div>
          {bibros
            .filter((b) => bibroStatuses[b.code] && (bibroStatuses[b.code].activeSalonName || isFreshCheckIn(bibroStatuses[b.code])))
            .map((b) => {
              const status = bibroStatuses[b.code];
              return (
                <div
                  key={b.code}
                  style={{ background: COLORS.paper, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ fontSize: "14px" }}>
                    {status.activeSalonName ? (
                      <>
                        🎉 <strong>{b.alias || b.name}</strong> — {status.activeSalonName}
                      </>
                    ) : (
                      <>
                        📍 <strong>{b.alias || b.name}</strong> est chez {status.checkedInVenueName}
                      </>
                    )}
                  </span>
                  {status.activeSalonName && (
                    <button
                      onClick={() => onQuickJoinSalon(status.activeSalonCode)}
                      style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}
                    >
                      Rejoindre
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {events.some((ev) => !ev.closed) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", marginBottom: "8px" }}>
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
              <span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Live</span>
            </span>
          </div>
          {/* Blocs un peu plus larges que le texte de la page (8 px de chaque côté en plus : 12 px du bord de l'écran au lieu de 20), sans jamais toucher les bords. */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "0 -8px" }}>
            {[...events]
              .filter((ev) => !ev.closed)
              .reverse()
              .map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => openEvent(ev.id)}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    width: "100%",
                    // Bleuté (COLORS.surface), comme avant le 2026-11-09 : le bloc BibaLive se détache du fond de la page, contrairement aux autres blocs de l'accueil.
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "-7px",
                      right: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: COLORS.paper,
                      background: ev.paused ? "#FF9E2C" : COLORS.amber,
                      borderRadius: "999px",
                      padding: "2px 7px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: COLORS.paper,
                        flexShrink: 0,
                      }}
                    />
                    {ev.paused ? "EN PAUSE" : "EN COURS"}
                  </span>
                  {/* Rond de profil agrandi vers la gauche (la place libre) et vers le haut / le bas : son encombrement reste celui d'un rond de 56 px, donc ni le texte ni la hauteur du bloc ne bougent. */}
                  <span style={{ display: "flex", flexShrink: 0, margin: `${-(BIBALIVE_ROUND - 56) / 2}px 0 ${-(BIBALIVE_ROUND - 56) / 2}px ${-(BIBALIVE_ROUND - 56)}px` }}>
                    <SalonAvatar event={ev} venue={ev.venueId ? venuesById[ev.venueId] : null} size={BIBALIVE_ROUND} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", lineHeight: 1.25, whiteSpace: "normal", wordBreak: "break-word" }}>{ev.name}</div>
                    {(() => {
                      const linkedVenue = ev.venueId ? venuesById[ev.venueId] : null;
                      // N'affiche le nom du lieu que si le titre personnalisé de la session s'en
                      // écarte — sinon, le titre suffit déjà. Dans ce second cas, l'adresse
                      // s'affiche à la place (en grisé), pour ne pas laisser un vide inutile.
                      const showVenue = linkedVenue && linkedVenue.name !== ev.name;
                      const address = linkedVenue ? linkedVenue.city : null;
                      if (showVenue) {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: COLORS.amber, fontWeight: 600, marginTop: "2px" }}>
                            <NavIcon name="map-pin" size={11} color={COLORS.amber} />
                            {linkedVenue.name}
                          </div>
                        );
                      }
                      if (address) {
                        return <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{address}</div>;
                      }
                      return null;
                    })()}
                    {(ev.date || ev.createdAt) && (
                      <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "3px" }}>
                        {ev.date && <div>{formatDate(ev.date)}</div>}
                        {ev.createdAt && <div>{`Start : ${formatTime(ev.createdAt)}`}</div>}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.amber}40`,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <polyline points="4,1.5 11,7 4,12.5" fill="none" stroke={COLORS.amber} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              ))}
          </div>

          <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "18px -20px" }} />
        </>
      )}

      {bibaPulseVisible && (
        <HomeExtraits
          entries={pulseEntries || []}
          drinksDirectory={drinksDirectory}
          venuesById={venuesById}
          breweriesDirectory={breweriesDirectory}
          brandsDirectory={brandsDirectory}
          myUserId={myUserId}
          // Un appui sur un extrait ouvre sa fiche sur la page BibaPulse (la même ouverture qu'une notification : fiche mise en avant, barre verte à gauche).
          onOpenEntry={(entry) => (onOpenPulseEntry ? onOpenPulseEntry(entry.id) : goToBibaPulse())}
          onSeeAll={goToBibaPulse}
        />
      )}

      <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "0 -20px 18px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Club</span></>} subtitle="Tes Clubs privés et publics" onClick={goToBibaClubs} />
        <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Cal</span></>} subtitle="Agenda des events autour de vous" badge="Soon" disabled />
        {gamesVisible && (
          <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Play</span></>} subtitle="Jeux et défis autour d'un verre" onClick={goToGames} badge="Soon" disabled />
        )}
        {bibaMeetVisible && (
          <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Meet</span></>} subtitle="Découvrir et rencontrer des Bibax" onClick={goToBibaMeet} badge="Soon" disabled />
        )}
        <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Care</span></>} subtitle="Suivi santé" badge="Soon" disabled />
        <CategoryTile title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Flash</span></>} subtitle="Infos et anecdotes en bref" badge="Soon" disabled />
      </div>
      {bibaxSuggestions && bibaxSuggestions.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ height: "2px", background: COLORS.pinkFluo, margin: "0 -20px 18px" }} />
          <button
            onClick={() => setSuggestionsExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: suggestionsExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
              <span style={{ color: COLORS.ink }}>Biba</span>
              <span style={{ color: COLORS.amber }}>x</span>
              <span style={{ color: COLORS.inkSoft }}> - Suggestions rapides</span>
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                goToBibaxSuggestions();
              }}
              style={{ marginLeft: "auto", marginRight: "4px", fontSize: "12.5px", fontWeight: 400, color: COLORS.amber, whiteSpace: "nowrap" }}
            >
              Voir tout
            </span>
            <span style={{ display: "inline-flex", transform: `rotate(${suggestionsExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {suggestionsExpanded && (
            <BibaxSuggestionsCarousel
              suggestions={bibaxSuggestions}
              onOpen={onOpenBibaxProfile}
              onAdd={addSuggestedBibax}
              onDismiss={dismissSuggestedBibax}
              busyCode={addingBibaxCode}
              onSeeAll={goToBibaxSuggestions}
            />
          )}
        </div>
      )}
    </div>
  );
}
