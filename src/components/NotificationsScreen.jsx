// ============================================================
// Écran "Notifications" — accessible depuis Paramètres.
//
// Règle appliquée ici : un réglage n'est actif que s'il pilote réellement
// quelque chose. Les autres sont grisés et marqués "Bientôt" — un
// interrupteur muet est pire qu'absent, puisqu'il laisse croire qu'on a coupé
// une notification qui continue d'arriver.
//
// Ce que l'écran règle, et ce qu'il ne règle pas :
//   - Les pastilles dans l'app (BibaPing, cloche) et le centre de notifications
//     ne dépendent d'aucun réglage : ils sont toujours actifs.
//   - Les réglages ne concernent que l'alerte "push" envoyée sur le téléphone.
//
// Aujourd'hui, trois réglages seulement sont branchés :
//   - "Notifications push" (bloc "Sur cet appareil") : demande la permission et
//     enregistre le jeton FCM de l'appareil (voir firebaseClient.js). Sur iPhone,
//     ne fonctionne que si l'app a été ajoutée à l'écran d'accueil (iOS 16.4+).
//     C'est l'interrupteur général : il remplace l'ancien "Autoriser les
//     notifications" (profil.notif_enabled), que le serveur lit toujours et que
//     l'activation du push remet à vrai.
//   - "Messages" (bloc "Alertes à recevoir") : respecté côté serveur par
//     get_message_push_targets, qui écarte des destinataires ceux qui l'ont
//     désactivé.
//   - "Invitations BibaClub" (bloc "Alertes à recevoir") : respecté côté serveur par
//     get_club_invitation_push_target, que l'app de la personne qui invite interroge
//     avant d'envoyer l'alerte. L'invitation reste toujours dans le centre de
//     notifications (avec Accepter / Refuser) et sur les pastilles.
// Les alertes par sujet sont grisées tant que le push est coupé.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";
import { requestNotificationPermissionAndGetToken } from "../firebaseClient.js";
import { upsertPushSubscription, hasActivePushSubscription, deleteMyPushSubscriptions } from "../data/sharedDirectories.js";

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

  // Le toggle "Notifications push" ne se fie pas au profil (jamais vraiment persisté côté
  // serveur) mais à l'existence réelle d'une souscription push enregistrée pour ce compte —
  // sinon il pouvait sembler se désactiver tout seul au rechargement.
  const [pushRegistered, setPushRegistered] = useState(null); // null = pas encore vérifié
  useEffect(() => {
    hasActivePushSubscription().then(setPushRegistered);
  }, []);
  // Le serveur n'envoie rien à un compte dont notif_enabled vaut faux (ancien interrupteur
  // "Autoriser les notifications", disparu de l'écran) : même avec une souscription, le push
  // est alors réellement coupé, et l'écran doit l'afficher tel quel.
  const pushOn = pushRegistered === true && p.notifEnabled !== false;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="bell" size={22} color={COLORS.amber} />}>Notifications</PageTitleWithBar>

      <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px" }}>
        Dans l'app, tu vois toujours tes nouveautés (pastilles, centre de notifications). Les réglages ci-dessous ne concernent que les alertes envoyées sur ton téléphone.
      </p>

      <NotifGroup title="Sur cet appareil">
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="smartphone" size={17} color={COLORS.amber} />}
            title="Notifications push"
            subtitle="Sur iPhone, ajoute d'abord Bibamus à ton écran d'accueil"
            checked={pushOn}
            onChange={async (v) => {
              if (v) {
                const token = await requestNotificationPermissionAndGetToken();
                if (token) {
                  await upsertPushSubscription(token, "web");
                  setPushRegistered(true);
                  // Un compte qui avait coupé l'ancien interrupteur général le retrouve actif.
                  if (p.notifEnabled === false) update({ notifEnabled: true });
                } else if (Notification?.permission === "denied") {
                  alert("Notifications refusées — active-les dans les réglages de ton navigateur ou de ton téléphone pour Bibamus.");
                }
              } else {
                await deleteMyPushSubscriptions();
                setPushRegistered(false);
              }
            }}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Alertes à recevoir">
        {pushRegistered !== null && !pushOn && (
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, padding: "12px 4px 0" }}>Active d'abord « Notifications push » pour choisir tes alertes.</div>
        )}
        {/* Seuls réglages de cette liste, avec les notifications push, à piloter réellement
            quelque chose : Messages et Invitations BibaClub (le serveur écarte des destinataires
            ceux qui les ont désactivés). */}
        <NotifRow
          icon={<NavIcon name="mail" size={17} color={COLORS.amber} />}
          title="Messages"
          subtitle="Messages reçus dans BibaPing"
          checked={pushOn && p.notifMessages !== false}
          disabled={!pushOn}
          onChange={(v) => update({ notifMessages: v })}
        />
        <NotifRow
          icon={<NavIcon name="crown" size={17} color={COLORS.amber} />}
          title="Invitations BibaClub"
          subtitle="Quand un Bibax t'invite à rejoindre un BibaClub"
          checked={pushOn && p.notifClubInvitations !== false}
          disabled={!pushOn}
          onChange={(v) => update({ notifClubInvitations: v })}
        />
        <NotifRow
          icon={<NavIcon name="tag" size={17} color={COLORS.amber} />}
          title="Mentions"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="comment" size={17} color={COLORS.amber} />}
          title="Commentaires"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="user-plus" size={17} color={COLORS.amber} />}
          title="Nouveaux Bibax"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="bibago-nav" size={15} color={COLORS.amber} />}
          title="Invitations"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="activity" size={17} color={COLORS.amber} />}
          title="Bibax favoris"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="map-pin" size={17} color={COLORS.amber} />}
          title="Lieux favoris"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <NotifRow
          icon={<NavIcon name="star" size={17} color={COLORS.amber} />}
          title="Producteurs favoris"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="bottle" size={17} color={COLORS.amber} />}
            title="Produits favoris"
            subtitle="Pas encore disponible"
            disabled
            badge="Bientôt"
            checked={false}
            onChange={() => {}}
          />
        </div>
      </NotifGroup>

      <NotifGroup title="Promotions & nouveautés">
        <NotifRow
          icon={<NavIcon name="info" size={17} color={COLORS.amber} />}
          title="Actualités Bibamus"
          subtitle="Pas encore disponible"
          disabled
          badge="Bientôt"
          checked={false}
          onChange={() => {}}
        />
        <div style={{ borderBottom: "none" }}>
          <NotifRow
            icon={<NavIcon name="megaphone" size={17} color={COLORS.amber} />}
            title="Partenaires"
            subtitle="Pas encore disponible"
            disabled
            badge="Bientôt"
            checked={false}
            onChange={() => {}}
          />
        </div>
      </NotifGroup>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        <span style={{ width: "4px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>Fréquence récapitulative</h2>
      </div>
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", opacity: 0.55 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "14px 4px" }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
            <NavIcon name="at" size={17} color={COLORS.amber} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "14px" }}>Récapitulatif par e-mail</span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>Bientôt</span>
            </div>
            <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>Pas encore disponible</div>
          </span>
        </div>
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Récapitulatif par email — page dédiée : fréquence + adresse email tierce optionnelle.
export function EmailSummaryScreen({ profile, onSaveProfile, onBack }) {
  const [p, setP] = useState(profile);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const address = p.notifEmailSummaryAddress || "";
  const isValid = address === "" || emailRegex.test(address);

  const update = (patch) => {
    setP((prev) => ({ ...prev, ...patch }));
    onSaveProfile(patch);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="at" size={22} color={COLORS.amber} />}>Récapitulatif par e-mail</PageTitleWithBar>
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
              color: (p.notifEmailSummaryFrequency || "week") === opt.key ? "#08131F" : COLORS.ink,
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

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>E-mail de réception (optionnel, différent de votre e-mail de connexion)</label>
      <div style={{ position: "relative" }}>
        <input
          type="email"
          value={address}
          onChange={(e) => setP((prev) => ({ ...prev, notifEmailSummaryAddress: e.target.value }))}
          onBlur={() => {
            if (isValid) update({ notifEmailSummaryAddress: address });
          }}
          placeholder={profile.email || "vous@exemple.com"}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px",
            paddingRight: "44px",
            borderRadius: "12px",
            border: `2px solid ${address && !isValid ? "#FF3B3B" : address && isValid ? COLORS.amber : COLORS.paperAlt}`,
            background: COLORS.surface,
            color: COLORS.ink,
            fontSize: "16px",
          }}
        />
        {address && (
          <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", lineHeight: 1 }}>
            {isValid ? <NavIcon name="check" size={18} color={COLORS.amber} /> : <NavIcon name="x" size={18} color="#FF3B3B" />}
          </span>
        )}
      </div>
      {address && !isValid && <p style={{ fontSize: "12px", color: "#FF3B3B", marginTop: "6px" }}>Cette adresse ne semble pas valide.</p>}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
