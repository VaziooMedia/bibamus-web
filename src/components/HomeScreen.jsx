// ============================================================
// Écran d'accueil (Home) — copié tel quel depuis le prototype
// Claude, avec juste le nom renommé en HomeScreen pour plus de clarté.
// ============================================================
import React from "react";
import { COLORS, APP_VERSION } from "../constants.js";
import { NavIcon, BibamusLogoFull } from "./icons.jsx";
import { EntityAvatar, CategoryTile } from "./ui.jsx";

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


function computePulseEntries(bibros, bibroStatuses) {
  const entries = [];
  bibros.forEach((b) => {
    const status = bibroStatuses[b.code];
    if (!status) return;
    const label = b.alias || b.name;
    if (isFreshCheckIn(status)) {
      entries.push({
        id: `checkin-${b.code}`,
        timestamp: status.checkedInAt,
        icon: "📍",
        text: (
          <>
            <strong>{label}</strong> vient de se checker à {status.checkedInVenueName}
          </>
        ),
      });
    }
    if (status.activeSalonName) {
      entries.push({
        id: `salon-${b.code}`,
        timestamp: status.updatedAt || status.checkedInAt || 0,
        icon: "🎉",
        text: (
          <>
            <strong>{label}</strong> est en soirée : {status.activeSalonName}
          </>
        ),
      });
    }
  });
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

export function HomeScreen({
  events,
  eventTotal,
  openEvent,
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
              border: `2px solid ${COLORS.paperAlt}`, // will become a colored ring when a story is available
            }}
          >
            <NavIcon name="default-avatar" size={44} color={COLORS.amber} />
          </span>
        </button>
      </div>

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
                    textAlign: "left",
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
                  <EntityAvatar photoEmoji={ev.venueId ? venues.find((v) => v.id === ev.venueId)?.avatarEmoji : null} size={56} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>
                      {ev.name}
                      {ev.salonCode ? " 🎉" : ""}
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: ev.paused ? "#FF9E2C" : "#22c55e",
                          boxShadow: ev.paused ? "0 0 0 3px rgba(255, 158, 44, 0.28)" : "0 0 0 3px rgba(34, 197, 94, 0.28)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: ev.paused ? "#FF9E2C" : COLORS.amber }}>{ev.paused ? "En pause" : "En cours"}</span>
                    </div>
                    {(ev.date || ev.createdAt) && (
                      <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "3px" }}>
                        {ev.date && <div>{formatDate(ev.date)}</div>}
                        {ev.createdAt && <div>{`Start : ${formatTime(ev.createdAt)}`}</div>}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.amber}40`,
                      flexShrink: 0,
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
          const pulseEntries = computePulseEntries(bibros, bibroStatuses).slice(0, 3);
          return (
            <button
              onClick={goToBibaPulse}
              style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", marginBottom: "18px", display: "block", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>
                  <span style={{ color: COLORS.ink }}>Biba</span>
                  <span style={{ color: COLORS.amber }}>Pulse</span>
                </span>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", color: COLORS.redFluo, background: COLORS.paperAlt, borderRadius: "999px", padding: "3px 8px" }}>Soon</span>
              </div>
              {pulseEntries.length === 0 ? (
                <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", fontStyle: "italic", margin: 0 }}>En attente des premières activités.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pulseEntries.map((entry) => (
                    <div key={entry.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span style={{ fontSize: "15px", flexShrink: 0 }}>{entry.icon}</span>
                      <span style={{ fontSize: "13.5px", color: COLORS.ink }}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
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
    </div>
  );
}