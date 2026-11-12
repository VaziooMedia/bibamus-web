// ============================================================
// Fiche d'un BibaRoom en petit, dans une carte « Lancement d'un BibaRoom » du fil BibaPulse (même cadre que la fiche d'un produit ou d'un
// lieu : fond surfaceAlt, bordure paperAlt, rond de 56 px). Rond-profil : la photo du lieu du salon, à défaut son emoji, à défaut la
// maison (salon @Home) ou le feu d'artifice (salon @Event), à défaut la pastille de lieu. Lignes : le nom du salon ; le lieu (pastille
// verte + nom) quand le titre du salon n'est pas déjà le nom du lieu, sinon la ville, grisée ; la date et l'heure du lancement, grisées.
// Pas de pastille du mode (ORBIS, ARCA…) : décision de Mehdi, elle n'apporte rien sur la carte.
// Les données du salon viennent de la carte (jamais le code du salon, qui est la clé d'accès) ; le lieu est lu sur sa fiche.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { SalonAvatar } from "./ui.jsx";
import { NavIcon } from "./icons.jsx";

// « jeudi 12 novembre · 16:34 » (l'année seulement si ce n'est pas l'année en cours) : la date et l'heure du lancement du salon, c'est-à-dire de la
// carte. Le formulaire de création d'un BibaRoom n'a ni champ date ni champ heure : un salon se lance toujours à l'instant.
function launchLabel(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return null;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const day = new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) }).format(d);
  const time = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${day} · ${time}`;
}

export function PulseRoomCard({ name, special = null, venue = null, launchedAt = null }) {
  const showVenue = venue && venue.name !== name;
  const launch = launchLabel(launchedAt);
  return (
    <div
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        background: COLORS.surfaceAlt,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "10px",
        padding: "10px 12px",
        color: COLORS.ink,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <SalonAvatar event={{ isHome: special === "home", venueId: special === "event" ? "@event" : null }} venue={venue} size={56} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{name}</span>
          {showVenue ? (
            <span style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginTop: "3px", fontSize: "11.5px", color: COLORS.amber, fontWeight: 600 }}>
              <span style={{ display: "flex", flexShrink: 0, marginTop: "2px" }}>
                <NavIcon name="map-pin" size={11} color={COLORS.amber} />
              </span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{venue.name}</span>
            </span>
          ) : venue && venue.city ? (
            <span style={{ display: "block", marginTop: "3px", fontSize: "11.5px", color: COLORS.inkSoft, overflowWrap: "anywhere" }}>{venue.city}</span>
          ) : null}
          {launch && <span style={{ display: "block", marginTop: "3px", fontSize: "11.5px", color: COLORS.inkSoft }}>{launch}</span>}
        </span>
      </span>
    </div>
  );
}
