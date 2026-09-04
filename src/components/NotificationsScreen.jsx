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

export function NotificationsScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

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
          checked={p.notifMentions !== false}
          onChange={(v) => update({ notifMentions: v })}
        />
        <NotifRow
          icon={<NavIcon name="comment" size={17} color={COLORS.amber} />}
          title="Commentaires"
          subtitle="Sur vos checks, publications, stories..."
          checked={p.notifComments !== false}
          onChange={(v) => update({ notifComments: v })}
        />
        <NotifRow
          icon={<NavIcon name="user-plus" size={17} color={COLORS.amber} />}
          title="Nouveaux Bibax"
          subtitle="Ajout et acceptation"
          checked={p.notifNewBibax !== false}
          onChange={(v) => update({ notifNewBibax: v })}
        />
        <NotifRow
          icon={<NavIcon name="mail" size={17} color={COLORS.amber} />}
          title="Messages"
          subtitle="Nouveaux messages privés"
          checked={p.notifMessages !== false}
          onChange={(v) => update({ notifMessages: v })}
        />
        <NotifRow
          icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />}
          title="Invitations"
          subtitle="Invitations à rejoindre un BibaRoom ou BibArena"
          checked={p.notifInvitations !== false}
          onChange={(v) => update({ notifInvitations: v })}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="activity" size={17} color={COLORS.amber} />}
            title="Activités de vos Bibax"
            subtitle="Ce que font vos Bibax"
            checked={p.notifBibaxActivity !== false}
            onChange={(v) => update({ notifBibaxActivity: v })}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Promotions & nouveautés">
        <NotifRow
          icon={<NavIcon name="info" size={17} color={COLORS.amber} />}
          title="Actualités Bibamus"
          subtitle="Nouveautés de l'app et annonces"
          checked={p.notifNews !== false}
          onChange={(v) => update({ notifNews: v })}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="megaphone" size={17} color={COLORS.amber} />}
            title="Partenaires"
            subtitle="Offres et évènements partenaires"
            checked={p.notifPartners === true}
            onChange={(v) => update({ notifPartners: v })}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Fréquence récapitulative">
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="clock" size={17} color={COLORS.amber} />}
            title="Récapitulatif par e-mail"
            subtitle="Recevoir un récapitulatif de vos activités"
            checked={p.notifEmailSummary !== false}
            onChange={(v) => update({ notifEmailSummary: v })}
          />
        </div>
      </NotifGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
