// ============================================================
// Écran "Préférences" — accessible depuis Paramètres. Toutes les
// préférences sont réellement stockées, même quand l'endroit qui
// les consomme n'existe pas encore (tri des lieux, format
// horaire...) — prêtes à être branchées. "Suggestions
// personnalisées" réutilise le même réglage que Permissions &
// consentements (retiré de là-bas pour éviter le doublon).
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

function ToggleRow({ icon, title, subtitle, checked, onChange, disabled, badge, last }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 4px", borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}`, opacity: disabled ? 0.55 : 1 }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{title}</span>
          {badge && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>{badge}</span>}
        </div>
        {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
          width: "42px",
          height: "24px",
          borderRadius: "999px",
          border: "none",
          background: checked ? COLORS.amber : COLORS.paperAlt,
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
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

function ChoiceRow({ icon, title, subtitle, options, value, onChange, disabled, badge, last }) {
  return (
    <div style={{ padding: "14px 4px", borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}`, opacity: disabled ? 0.55 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>{title}</span>
            {badge && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>{badge}</span>}
          </div>
          {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginLeft: "48px" }}>
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => !disabled && onChange(opt.key)}
            disabled={disabled}
            style={{
              background: value === opt.key ? COLORS.amber : "none",
              color: value === opt.key ? "#0D1B2A" : COLORS.ink,
              border: `2px solid ${value === opt.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PreferencesScreen({ profile, onSaveProfile, onBack, goToStorySettings }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="sliders" size={22} color={COLORS.amber} />}>Préférences</PageTitleWithBar>

      <PrefGroup title="Langue">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 4px" }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
            <NavIcon name="info" size={17} color={COLORS.amber} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>Français</div>
            <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>Seule langue disponible pour l'instant</div>
          </div>
        </div>
      </PrefGroup>

      <PrefGroup title="Unités">
        <ChoiceRow
          icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          title="Distances"
          options={[
            { key: "km", label: "Kilomètres" },
            { key: "mi", label: "Miles" },
          ]}
          value={p.prefDistanceUnit || "km"}
          onChange={(v) => update({ prefDistanceUnit: v })}
        />
        <ChoiceRow
          icon={<NavIcon name="activity" size={17} color={COLORS.amber} />}
          title="Température"
          options={[
            { key: "celsius", label: "°C" },
            { key: "fahrenheit", label: "°F" },
          ]}
          value={p.prefTemperatureUnit || "celsius"}
          onChange={(v) => update({ prefTemperatureUnit: v })}
        />
        <ChoiceRow
          icon={<NavIcon name="bottle" size={17} color={COLORS.amber} />}
          title="Volume"
          options={[
            { key: "metric", label: "cl / L" },
            { key: "imperial", label: "fl oz" },
          ]}
          value={p.prefVolumeUnit || "metric"}
          onChange={(v) => update({ prefVolumeUnit: v })}
        />
        <ChoiceRow
          icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />}
          title="Format date"
          subtitle="Prévu plus tard"
          disabled
          badge="Bientôt"
          options={[{ key: "ddmmyyyy", label: "JJ/MM/AAAA" }]}
          value="ddmmyyyy"
          onChange={() => {}}
        />
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
        <ChoiceRow
          icon={<NavIcon name="map-pin-check" size={17} color={COLORS.amber} />}
          title="Tri des lieux"
          options={[
            { key: "distance", label: "Distance" },
            { key: "popularity", label: "Popularité" },
            { key: "alphabetical", label: "Alphabétique" },
          ]}
          value={p.prefVenueSort || "distance"}
          onChange={(v) => update({ prefVenueSort: v })}
        />
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
        <button
          onClick={goToStorySettings}
          style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", background: "none", border: "none", padding: "14px 4px", textAlign: "left", cursor: "pointer", color: COLORS.ink }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
            <NavIcon name="camera" size={17} color={COLORS.amber} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>Stories</div>
            <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>Affichage par défaut du lieu, timing...</div>
          </span>
          <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
        </button>
      </PrefGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Paramètres des Stories — affichage par défaut du lieu, durée d'affichage à la lecture.
export function StorySettingsScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="camera" size={22} color={COLORS.amber} />}>Paramètres des Stories</PageTitleWithBar>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
        <ToggleRow
          icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          title="Afficher le lieu par défaut"
          subtitle="Pré-cochée à la création d'une nouvelle Story"
          checked={p.storyDefaultShowLocation !== false}
          onChange={(v) => update({ storyDefaultShowLocation: v })}
        />
        <div style={{ padding: "14px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
              <NavIcon name="clock" size={17} color={COLORS.amber} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Durée d'affichage à la lecture</div>
              <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>Avant de passer automatiquement à la suivante</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginLeft: "48px" }}>
            {[5, 7, 10].map((sec) => (
              <button
                key={sec}
                onClick={() => update({ storyViewDurationSeconds: sec })}
                style={{
                  background: (p.storyViewDurationSeconds || 5) === sec ? COLORS.amber : "none",
                  color: (p.storyViewDurationSeconds || 5) === sec ? "#0D1B2A" : COLORS.ink,
                  border: `2px solid ${(p.storyViewDurationSeconds || 5) === sec ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "999px",
                  padding: "7px 14px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "14px" }}>La durée de vie d'une Story (24h) n'est pas modifiable.</p>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
