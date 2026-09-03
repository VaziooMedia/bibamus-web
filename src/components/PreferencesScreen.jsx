// ============================================================
// Écran "Préférences" — accessible depuis Paramètres. Règle
// systématique : seuls les vrais interrupteurs ON/OFF restent en
// ligne sur cette page — tout choix à plusieurs options (unités,
// tri, langue, durée...) vit sur sa propre page dédiée, via le
// composant générique ChoiceScreen ci-dessous, sans exception.
// "Suggestions personnalisées" réutilise le même réglage que
// Permissions & consentements (retiré de là-bas pour éviter le
// doublon).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";

function PrefGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>{children}</div>
    </div>
  );
}

// Ligne de navigation — pour tout réglage qui n'est pas un simple ON/OFF (mène à sa propre
// page), affiche la valeur actuelle en fin de ligne.
function NavRow({ icon, title, value, onClick, disabled, badge, last }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}`,
        padding: "14px 4px",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        color: COLORS.ink,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>{title}</span>
        {badge && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>{badge}</span>}
      </span>
      {value && <span style={{ fontSize: "13px", color: COLORS.inkSoft, marginRight: "2px" }}>{value}</span>}
      {!disabled && <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />}
    </button>
  );
}

// Interrupteur ON/OFF — la seule exception qui reste en ligne, jamais sur une page à part.
function ToggleRow({ icon, title, subtitle, checked, onChange, last }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 4px", borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}` }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: "42px",
          height: "24px",
          borderRadius: "999px",
          border: "none",
          background: checked ? COLORS.amber : COLORS.paperAlt,
          position: "relative",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <span style={{ position: "absolute", top: "3px", left: checked ? "21px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
      </button>
    </div>
  );
}

// Page générique pour tout choix à options multiples — réutilisée pour Langue, Distances,
// Température, Volume, Tri des lieux, Durée d'affichage des Stories, plutôt que 6 pages quasi
// identiques écrites à la main.
export function ChoiceScreen({ icon, title, description, options, value, onChange, onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={icon}>{title}</PageTitleWithBar>
      {description && <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>{description}</p>}

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
        {options.map((opt, i) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "none",
              border: "none",
              borderBottom: i < options.length - 1 ? `1px solid ${COLORS.paperAlt}` : "none",
              padding: "16px 4px",
              textAlign: "left",
              cursor: "pointer",
              color: COLORS.ink,
              fontSize: "14.5px",
              fontWeight: value === opt.key ? 700 : 500,
            }}
          >
            {opt.label}
            {value === opt.key && <NavIcon name="check" size={18} color={COLORS.amber} />}
          </button>
        ))}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function PreferencesScreen({ profile, onSaveProfile, onBack, goToChoice, goToStorySettings }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  const distanceLabels = { km: "Kilomètres", mi: "Miles" };
  const temperatureLabels = { celsius: "°C", fahrenheit: "°F" };
  const volumeLabels = { metric: "cl / L", imperial: "fl oz" };
  const venueSortLabels = { distance: "Distance", popularity: "Popularité", alphabetical: "Alphabétique" };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="sliders" size={22} color={COLORS.amber} />}>Préférences</PageTitleWithBar>

      <PrefGroup title="Langue">
        <NavRow icon={<NavIcon name="info" size={17} color={COLORS.amber} />} title="Langue de l'app" value="Français" onClick={() => goToChoice("language")} last />
      </PrefGroup>

      <PrefGroup title="Unités">
        <NavRow icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />} title="Distances" value={distanceLabels[p.prefDistanceUnit || "km"]} onClick={() => goToChoice("distance")} />
        <NavRow icon={<NavIcon name="activity" size={17} color={COLORS.amber} />} title="Température" value={temperatureLabels[p.prefTemperatureUnit || "celsius"]} onClick={() => goToChoice("temperature")} />
        <NavRow icon={<NavIcon name="bottle" size={17} color={COLORS.amber} />} title="Volume" value={volumeLabels[p.prefVolumeUnit || "metric"]} onClick={() => goToChoice("volume")} />
        <NavRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Format date" disabled badge="Bientôt" />
        <ToggleRow
          icon={<NavIcon name="clock" size={17} color={COLORS.amber} />}
          title="Format horaire 24h"
          subtitle="Désactivé, affichage sur 12h (AM/PM)"
          checked={p.prefTimeFormat24h !== false}
          onChange={(v) => update({ prefTimeFormat24h: v })}
          last
        />
      </PrefGroup>

      <PrefGroup title="Expérience Bibamus">
        <NavRow icon={<NavIcon name="map-pin-check" size={17} color={COLORS.amber} />} title="Tri des lieux" value={venueSortLabels[p.prefVenueSort || "distance"]} onClick={() => goToChoice("venueSort")} />
        <ToggleRow
          icon={<NavIcon name="ai" size={17} color={COLORS.amber} />}
          title="Suggestions personnalisées"
          subtitle="Basées sur vos goûts et activités"
          checked={p.consentPersonalizedSuggestions !== false}
          onChange={(v) => update({ consentPersonalizedSuggestions: v })}
        />
        <ToggleRow
          icon={<NavIcon name="play" size={17} color={COLORS.amber} />}
          title="Lecture auto des aperçus"
          subtitle="Vidéos et Stories en avant-première"
          checked={p.prefAutoplayPreviews !== false}
          onChange={(v) => update({ prefAutoplayPreviews: v })}
        />
        <ToggleRow
          icon={<NavIcon name="smartphone" size={17} color={COLORS.amber} />}
          title="Vibrations"
          subtitle="Non disponible sur iPhone (limite du navigateur)"
          checked={p.prefVibrations !== false}
          onChange={(v) => update({ prefVibrations: v })}
          last
        />
      </PrefGroup>

      <PrefGroup title="Check-ins & activité">
        <ToggleRow
          icon={<NavIcon name="check" size={17} color={COLORS.amber} />}
          title="Confirmation avant check-in"
          subtitle="Demander une confirmation avant de valider"
          checked={p.prefConfirmCheckin !== false}
          onChange={(v) => update({ prefConfirmCheckin: v })}
        />
        <NavRow icon={<NavIcon name="camera" size={17} color={COLORS.amber} />} title="Stories" onClick={goToStorySettings} last />
      </PrefGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Paramètres des Stories — affichage par défaut du lieu (ON/OFF, reste en ligne) et durée
// d'affichage à la lecture (choix à options, sa propre page via goToChoice).
export function StorySettingsScreen({ profile, onSaveProfile, onBack, goToChoice }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="camera" size={22} color={COLORS.amber} />}>Paramètres des Stories</PageTitleWithBar>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", marginBottom: "18px" }}>
        <ToggleRow
          icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          title="Afficher le lieu par défaut"
          subtitle="Pré-cochée à la création d'une nouvelle Story"
          checked={p.storyDefaultShowLocation !== false}
          onChange={(v) => update({ storyDefaultShowLocation: v })}
          last
        />
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
        <NavRow
          icon={<NavIcon name="clock" size={17} color={COLORS.amber} />}
          title="Durée d'affichage à la lecture"
          value={`${p.storyViewDurationSeconds || 5}s`}
          onClick={() => goToChoice("storyDuration")}
          last
        />
      </div>

      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "14px" }}>La durée de vie d'une Story (24h) n'est pas modifiable.</p>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
