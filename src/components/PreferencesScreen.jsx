// ============================================================
// Écran "Préférences" — accessible depuis Paramètres. Règle
// systématique : seuls les vrais interrupteurs ON/OFF restent en
// ligne sur cette page — tout choix à plusieurs options (unités,
// tri, langue, durée...) vit sur sa propre page dédiée.
// "Suggestions personnalisées" réutilise le même réglage que
// Permissions & consentements (retiré de là-bas pour éviter le
// doublon) — grisé ici en attendant un vrai système IA.
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
// page). La flèche reste toujours visible, même désactivée (grisée par l'opacité globale de la
// ligne) pour indiquer un accès bloqué plutôt qu'une absence de destination.
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
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

// Interrupteur ON/OFF — la seule exception qui reste en ligne, jamais sur une page à part.
function ToggleRow({ icon, title, subtitle, checked, onChange, disabled, badge, trailingLabel, last }) {
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
      {trailingLabel && <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, marginTop: "6px" }}>{trailingLabel}</span>}
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

// Page générique pour tout choix à options multiples — réutilisée pour Langue, Distances,
// Température, Tri des lieux, Durée d'affichage des Stories.
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
            onClick={() => !opt.disabled && onChange(opt.key)}
            disabled={opt.disabled}
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
              cursor: opt.disabled ? "not-allowed" : "pointer",
              color: COLORS.ink,
              fontSize: "14.5px",
              fontWeight: value === opt.key ? 700 : 500,
              opacity: opt.disabled ? 0.5 : 1,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>{opt.label}</span>
            {value === opt.key && <NavIcon name="check" size={18} color={COLORS.amber} />}
          </button>
        ))}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Page dédiée "Volumes" — regroupe le choix d'unité de volume ET de poids (deux préférences
// distinctes), plutôt qu'une simple liste à choix unique.
export function VolumeWeightScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  const Choice = ({ groupValue, onPick, options }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "48px" }}>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onPick(opt.key)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "none",
            border: `2px solid ${groupValue === opt.key ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "10px 12px",
            textAlign: "left",
            cursor: "pointer",
            color: COLORS.ink,
            fontSize: "13.5px",
            fontWeight: groupValue === opt.key ? 700 : 500,
          }}
        >
          {opt.label}
          {groupValue === opt.key && <NavIcon name="check" size={16} color={COLORS.amber} />}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="weight" size={22} color={COLORS.amber} />}>Unités de mesure</PageTitleWithBar>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <NavIcon name="bottle" size={17} color={COLORS.amber} />
        </span>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>Volume</span>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <Choice
          groupValue={p.prefVolumeUnit || "metric"}
          onPick={(v) => update({ prefVolumeUnit: v })}
          options={[
            { key: "metric", label: "Centilitres (cl.) / Litres (L)" },
            { key: "imperial", label: "Fluid ounces (fl oz)" },
          ]}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
          <NavIcon name="weight" size={17} color={COLORS.amber} />
        </span>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>Poids</span>
      </div>
      <div>
        <Choice
          groupValue={p.prefWeightUnit || "metric"}
          onPick={(v) => update({ prefWeightUnit: v })}
          options={[
            { key: "metric", label: "Grammes (gr.) / Kilos (kg)" },
            { key: "imperial", label: "Onces (oz) / Livres (lb)" },
          ]}
        />
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function PreferencesScreen({ profile, onSaveProfile, onBack, goToChoice, goToVolumeWeight, goToStorySettings }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  const venueSortLabels = { distance: "Distance", favorites: "Favoris", popularity: "Popularité", alphabetical: "Alphabétique" };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="sliders" size={22} color={COLORS.amber} />}>Préférences</PageTitleWithBar>

      <PrefGroup title="Langue">
        <NavRow icon={<NavIcon name="world-map" size={17} color={COLORS.amber} />} title="Langue de l'app" value="Français" disabled last />
      </PrefGroup>

      <PrefGroup title="Unités & formats">
        <NavRow icon={<NavIcon name="ruler" size={17} color={COLORS.amber} />} title="Distances" value="Kilomètre (km)" disabled />
        <NavRow icon={<NavIcon name="thermometer" size={17} color={COLORS.amber} />} title="Température" value="Celsius (°C)" disabled />
        <NavRow icon={<NavIcon name="weight" size={17} color={COLORS.amber} />} title="Unités de mesure" onClick={goToVolumeWeight} />
        <NavRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Format date" value="JJ/MM/AAAA" disabled />
        <NavRow icon={<NavIcon name="clock" size={17} color={COLORS.amber} />} title="Format horaire" value="24h" disabled last />
      </PrefGroup>

      <PrefGroup title="Expérience Bibamus">
        <NavRow icon={<NavIcon name="sort" size={17} color={COLORS.amber} />} title="Tri des lieux" value={venueSortLabels[p.prefVenueSort || "distance"]} onClick={() => goToChoice("venueSort")} />
        <ToggleRow icon={<NavIcon name="ai" size={17} color={COLORS.amber} />} title="Suggestions personnalisées" disabled checked={false} onChange={() => {}} />
        <ToggleRow icon={<NavIcon name="play" size={17} color={COLORS.amber} />} title="Lecture auto des aperçus" disabled checked={false} onChange={() => {}} />
        <ToggleRow icon={<NavIcon name="vibrate" size={17} color={COLORS.amber} />} title="Vibrations" disabled checked={false} onChange={() => {}} last />
      </PrefGroup>

      <PrefGroup title="Check-ins & activité">
        <ToggleRow
          icon={<NavIcon name="check" size={17} color={COLORS.amber} />}
          title="Confirmation avant check-in"
          subtitle="Demander une confirmation avant de valider"
          checked={p.prefConfirmCheckin === true}
          onChange={(v) => update({ prefConfirmCheckin: v })}
        />
        <NavRow icon={<NavIcon name="stories" size={17} color={COLORS.amber} />} title="Stories" onClick={goToStorySettings} last />
      </PrefGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Paramètres des Stories — un Bibax peut publier depuis un BibaRoom ou un BibArena.
export function StorySettingsScreen({ profile, onSaveProfile, onBack, goToChoice }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="stories" size={22} color={COLORS.amber} />}>Paramètres des Stories</PageTitleWithBar>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>Un Bibax peut publier des Stories depuis un BibaRoom ou un BibArena.</p>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", marginBottom: "18px" }}>
        <ToggleRow
          icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          title="Afficher le lieu par défaut"
          subtitle="Pré-cochée à la création d'une nouvelle Story"
          checked={p.storyDefaultShowLocation !== false}
          onChange={(v) => update({ storyDefaultShowLocation: v })}
        />
        <ToggleRow
          icon={<NavIcon name="eye" size={17} color={COLORS.amber} />}
          title="Publier en public par défaut"
          subtitle="Visible hors salons également, pré-coché à la création"
          checked={p.storyDefaultPublic !== false}
          onChange={(v) => update({ storyDefaultPublic: v })}
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
