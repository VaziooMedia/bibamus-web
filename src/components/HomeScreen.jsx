// ============================================================
// Écran d'accueil (Home) — copié tel quel depuis le prototype
// Claude, avec juste le nom renommé en HomeScreen pour plus de clarté.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, APP_VERSION } from "../constants.js";
import { NavIcon, BibamusLogoFull } from "./icons.jsx";
import { EntityAvatar, CategoryTile, BibaxName } from "./ui.jsx";
import { loadSalon } from "../data/salons.js";
import { loadPulseFeed, loadBibaxSuggestions, sendBibaxRequest, loadPulseStories } from "../data/sharedDirectories.js";
import { StoriesBar } from "./StoriesBar.jsx";
import { TravelAgeWarning } from "./TravelAgeWarning.jsx";

function pulseTimeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `Il y a ${secs} sec.`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Il y a ${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

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


export function HomeScreen({
  profile,
  events,
  eventTotal,
  openEvent,
  updateEvent,
  goToBibaxAllSuggestions,
  onOpenBibaxProfile,
  onOpenVenue,
  onOpenDrink,
  drinksDirectory = [],
  breweriesDirectory = [],
  brandsDirectory = [],
  pulseStoriesRefreshKey,
  onAddStory,
  onOpenStoryAuthor,
  myUserId,
  goToSessionHub,
  goToProfile,
  goToRepertoireHub,
  goToGames,
  goToBibaMeet,
  goToBibaPulse,
  bibaMeetVisible = true,
  bibaPulseVisible = true,
  gamesVisible = true,
  goToSettings,
  bibros,
  bibroStatuses,
  onQuickJoinSalon,
  myName,
  myBibroCode,
  avatarUrl,
  lastName,
  venues,
}) {
  const [pulseEntries, setPulseEntries] = useState(null);
  const [stories, setStories] = useState([]);
  useEffect(() => {
    loadPulseStories().then(setStories);
  }, [pulseStoriesRefreshKey]);
  useEffect(() => {
    loadPulseFeed(null, 3).then(setPulseEntries);
  }, []);

  const [bibaxSuggestionsPool, setBibaxSuggestionsPool] = useState(null);
  const [addingBibaxCode, setAddingBibaxCode] = useState(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  useEffect(() => {
    // Charge un peu plus que nécessaire (5 affichées) — dès qu'on en ajoute une, la suivante
    // du lot prend directement sa place, sans nouvel aller-retour serveur.
    loadBibaxSuggestions(20).then(setBibaxSuggestionsPool);
  }, []);
  const bibaxSuggestions = (bibaxSuggestionsPool || []).slice(0, 3);
  const addSuggestedBibax = async (bibroCode) => {
    setAddingBibaxCode(bibroCode);
    await sendBibaxRequest(bibroCode);
    setAddingBibaxCode(null);
    setBibaxSuggestionsPool((prev) => (prev || []).filter((s) => s.bibroCode !== bibroCode));
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
        </div>
      </div>

      <TravelAgeWarning profile={profile} />
      <StoriesBar stories={stories} onOpenStory={onOpenStoryAuthor} myUserId={myUserId} />

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 18px 0" }} />

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
                  style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", marginBottom: "8px" }}>
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
              <span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Live</span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                      top: "-8px",
                      right: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: COLORS.paper,
                      background: ev.paused ? "#FF9E2C" : COLORS.amber,
                      borderRadius: "999px",
                      padding: "3px 9px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: COLORS.paper,
                        flexShrink: 0,
                      }}
                    />
                    {ev.paused ? "EN PAUSE" : "EN COURS"}
                  </span>
                  <EntityAvatar
                    photoUrl={ev.venueId ? venues.find((v) => v.id === ev.venueId)?.profilePhotoUrl : null}
                    photoEmoji={ev.venueId ? venues.find((v) => v.id === ev.venueId)?.avatarEmoji : null}
                    size={56}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", lineHeight: 1.25, whiteSpace: "normal", wordBreak: "break-word" }}>{ev.name}</div>
                    {(() => {
                      const linkedVenue = ev.venueId ? venues.find((v) => v.id === ev.venueId) : null;
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

          <div style={{ height: "1px", background: COLORS.paperAlt, margin: "18px 0" }} />
        </>
      )}

      {bibaPulseVisible &&
        (() => {
          const entries = pulseEntries || [];
          const resolveObject = (entry) => {
            const map = { venue: venues, drink: drinksDirectory, producer: breweriesDirectory, brand: brandsDirectory };
            const objType = entry.eventType === "venue_visit" ? "venue" : entry.objectType;
            return (map[objType] || []).find((x) => x.id === (entry.venueId || entry.objectId)) || null;
          };
          const actionFor = (entry) => ({ product_discovered: "Découverte", venue_visit: "Check", database_contribution: "Ajout" }[entry.eventType] || "Activité");

          return (
            <div style={{ marginBottom: "18px" }}>
              <button
                onClick={goToBibaPulse}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", marginBottom: "8px" }}
              >
                <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>
                  <span style={{ color: COLORS.ink }}>Biba</span>
                  <span style={{ color: COLORS.amber }}>Pulse</span>
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: "auto",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: `2px solid ${COLORS.amber}`,
                  }}
                >
                  <NavIcon name="chevron-right" size={12} color={COLORS.amber} />
                </span>
              </button>

              {entries.length === 0 ? (
                <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", margin: 0 }}>En attente des premières activités.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {entries.map((entry) => {
                    const obj = resolveObject(entry);
                    const objName = obj?.name || (entry.eventType === "venue_visit" ? "un établissement" : entry.eventType === "database_contribution" ? "une fiche" : "un produit");
                    const objType = entry.eventType === "venue_visit" ? "venue" : entry.objectType;
                    const openHandler = objType === "venue" ? onOpenVenue : objType === "drink" ? onOpenDrink : null;
                    const objClickable = obj && openHandler;
                    return (
                      <div key={entry.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <button
                          onClick={() => (entry.actorId === myUserId ? goToProfile() : onOpenBibaxProfile(entry.actorBibroCode))}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
                        >
                          <EntityAvatar photoUrl={entry.actorAvatarUrl} size={28} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {[entry.actorName, entry.actorLastName].filter(Boolean).join(" ") || "Quelqu'un"}
                          </p>
                          <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: COLORS.ink }}>
                            {actionFor(entry)} @{" "}
                            {objClickable ? (
                              <button onClick={() => openHandler(obj.id)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}>
                                {objName}
                              </button>
                            ) : (
                              <strong style={{ color: COLORS.amber }}>{objName}</strong>
                            )}
                          </p>
                        </div>
                        <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, flexShrink: 0 }}>{pulseTimeAgo(entry.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 18px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        <CategoryTile icon="ti-door-enter" title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Go</span></>} subtitle="Créer et rejoindre" onClick={goToSessionHub} />
        {gamesVisible && (
          <CategoryTile icon="ti-device-gamepad" title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Play</span></>} subtitle="Jeux et défis autour d'un verre" onClick={goToGames} badge="Soon" disabled />
        )}
        {bibaMeetVisible && (
          <CategoryTile icon="ti-users" title={<><span style={{ color: COLORS.ink }}>Biba</span><span style={{ color: COLORS.amber }}>Meet</span></>} subtitle="Découvrir et rencontrer des Bibax" onClick={goToBibaMeet} badge="Soon" disabled />
        )}
        <CategoryTile icon="ti-map" title={<><span style={{ color: COLORS.ink }}>Bib</span><span style={{ color: COLORS.amber }}>Atlas</span></>} subtitle="Lieux, produits, marques et producteurs" onClick={goToRepertoireHub} />
      </div>
      {bibaxSuggestions && bibaxSuggestions.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <button
            onClick={() => setSuggestionsExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: suggestionsExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
              <span style={{ color: COLORS.ink }}>Biba</span>
              <span style={{ color: COLORS.amber }}>x</span>
              <span style={{ color: COLORS.inkSoft }}> - Suggestions rapides</span>
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                goToBibaxAllSuggestions();
              }}
              style={{ marginLeft: "auto", marginRight: "8px", fontSize: "12.5px", fontWeight: 400, color: COLORS.amber }}
            >
              Voir tout
            </span>
            <span style={{ display: "inline-flex", transform: `rotate(${suggestionsExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {suggestionsExpanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bibaxSuggestions.map((s) => (
                <button
                  key={s.userId}
                  onClick={() => onOpenBibaxProfile(s.bibroCode)}
                  style={{
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "12px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <EntityAvatar photoUrl={s.avatarUrl} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <BibaxName name={s.name} lastName={s.lastName} nickname={s.nickname} city={s.city} locality={s.locality} style={{ fontSize: "13px", color: COLORS.ink }} />
                    <p style={{ margin: "1px 0 0", fontSize: "10.5px", color: COLORS.inkSoft }}>{s.mutualCount > 0 ? `${s.mutualCount} Bibax en commun` : s.distanceKm != null ? `à ${s.distanceKm} km` : ""}</p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      addSuggestedBibax(s.bibroCode);
                    }}
                    style={{
                      background: "none",
                      border: `2px solid ${COLORS.amber}`,
                      borderRadius: "8px",
                      padding: "6px 11px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: COLORS.amber,
                      cursor: "pointer",
                      opacity: addingBibaxCode === s.bibroCode ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    Ajouter
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}