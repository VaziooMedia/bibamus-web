// ============================================================
// Écran "Notifications" — accessible depuis Paramètres. Toutes
// les préférences sont réellement stockées dès maintenant, même
// si le système de notification lui-même (centre interne, envoi)
// n'est pas encore construit. Seule "Notifications push" est
// grisée — impossible sur le web pour une bonne partie du public
// (iPhone en UE), prévue pour l'app native.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";

function NotifRow({ icon, title, subtitle, checked, onChange, disabled, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 4px", borderBottom: `1px solid ${COLORS.paperAlt}`, opacity: disabled ? 0.55 : 1 }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: COLORS.paperAlt,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
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

function NotifGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
          <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>{title}</h2>
        </div>
      )}
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>{children}</div>
    </div>
  );
}

export function NotificationsScreen({ profile, onSaveProfile, onBack, goToEmailSummary }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };
  const masterEnabled = p.notifEnabled !== false;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="bell" size={22} color={COLORS.amber} />}>Notifications</PageTitleWithBar>

      <NotifGroup>
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="bell" size={17} color={COLORS.amber} />}
            title="Autoriser les notifications"
            subtitle="Recevoir des notifications de Bibamus"
            checked={p.notifEnabled !== false}
            onChange={(v) => update({ notifEnabled: v })}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Activités">
        <NotifRow icon={<NavIcon name="smartphone" size={17} color={COLORS.amber} />} title="Notifications push" subtitle="Prévu sur l'app native" disabled badge="App native" checked={false} onChange={() => {}} />
        <NotifRow
          icon={<NavIcon name="tag" size={17} color={COLORS.amber} />}
          title="Mentions"
          subtitle="Quand un Bibax vous mentionne"
          checked={masterEnabled && p.notifMentions !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifMentions: v })}
        />
        <NotifRow
          icon={<NavIcon name="comment" size={17} color={COLORS.amber} />}
          title="Commentaires"
          subtitle="Sur vos checks, publications, stories..."
          checked={masterEnabled && p.notifComments !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifComments: v })}
        />
        <NotifRow
          icon={<NavIcon name="user-plus" size={17} color={COLORS.amber} />}
          title="Nouveaux Bibax"
          subtitle="Ajout et acceptation"
          checked={masterEnabled && p.notifNewBibax !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifNewBibax: v })}
        />
        <NotifRow
          icon={<NavIcon name="mail" size={17} color={COLORS.amber} />}
          title="Messages"
          subtitle="Nouveaux messages privés"
          checked={masterEnabled && p.notifMessages !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifMessages: v })}
        />
        <NotifRow
          icon={<NavIcon name="bibago-nav" size={15} color={COLORS.amber} />}
          title="Invitations"
          subtitle="Invitations à rejoindre un BibaRoom ou BibArena"
          checked={masterEnabled && p.notifInvitations !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifInvitations: v })}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="activity" size={17} color={COLORS.amber} />}
            title="Activités de vos Bibax"
            subtitle="Ce que font vos Bibax"
            checked={masterEnabled && p.notifBibaxActivity !== false}
            disabled={!masterEnabled}
            onChange={(v) => update({ notifBibaxActivity: v })}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Promotions & nouveautés">
        <NotifRow
          icon={<NavIcon name="info" size={17} color={COLORS.amber} />}
          title="Actualités Bibamus"
          subtitle="Nouveautés de l'app et annonces"
          checked={masterEnabled && p.notifNews !== false}
          disabled={!masterEnabled}
          onChange={(v) => update({ notifNews: v })}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="megaphone" size={17} color={COLORS.amber} />}
            title="Partenaires"
            subtitle="Offres et évènements partenaires"
            checked={masterEnabled && p.notifPartners === true}
            disabled={!masterEnabled}
            onChange={(v) => update({ notifPartners: v })}
          />
        </div>
      </NotifGroup>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>Fréquence récapitulative</h2>
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", opacity: masterEnabled ? 1 : 0.55 }}>
        <button
          onClick={() => masterEnabled && goToEmailSummary()}
          disabled={!masterEnabled}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            background: "none",
            border: "none",
            padding: "14px 4px",
            textAlign: "left",
            cursor: masterEnabled ? "pointer" : "not-allowed",
            color: COLORS.ink,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
            <NavIcon name="at" size={17} color={COLORS.amber} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>Récapitulatif par email</div>
            <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>Recevoir un récapitulatif de vos activités</div>
          </span>
          <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
        </button>
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Récapitulatif par email — page dédiée : fréquence + adresse email tierce optionnelle.
export function EmailSummaryScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="at" size={22} color={COLORS.amber} />}>Récapitulatif par email</PageTitleWithBar>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>Recevoir un récapitulatif de vos activités.</p>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Fréquence</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "week", label: "Semaine" },
          { key: "month", label: "Mois" },
          { key: "quarter", label: "Trimestre" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => update({ notifEmailSummaryFrequency: opt.key })}
            style={{
              flex: 1,
              background: (p.notifEmailSummaryFrequency || "week") === opt.key ? COLORS.amber : "none",
              color: (p.notifEmailSummaryFrequency || "week") === opt.key ? "#0D1B2A" : COLORS.ink,
              border: `2px solid ${(p.notifEmailSummaryFrequency || "week") === opt.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "9px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Email de réception (optionnel, différent de votre email de connexion)</label>
      <input
        type="email"
        value={p.notifEmailSummaryAddress || ""}
        onChange={(e) => setP((prev) => ({ ...prev, notifEmailSummaryAddress: e.target.value }))}
        onBlur={() => update({ notifEmailSummaryAddress: p.notifEmailSummaryAddress })}
        placeholder={profile.email || "vous@exemple.com"}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
      />

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
