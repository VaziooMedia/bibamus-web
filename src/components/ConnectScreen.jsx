// ============================================================
// Écran "Connecter" — accessible depuis Paramètres. Seul
// Spotify est réellement connecté (OAuth PKCE déjà construit
// pour BibaMusic, réutilisé ici tel quel). Les réseaux sociaux
// (vraie connexion OAuth, pas juste le lien de profil déjà
// existant dans Profil public), Google, Apple, Contacts et
// Calendrier n'ont aucune intégration construite pour l'instant.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, XIcon, ThreadsIcon, SpotifyIcon, GoogleIcon, AppleIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";
import { redirectToSpotifyAuth, getMySpotifyStatus, disconnectSpotify } from "../data/spotify.js";

function ConnectGroup({ title, children }) {
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

function ConnectRow({ icon, title, subtitle, value, disabled, badge, onClick, last }) {
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
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
        color: COLORS.ink,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{title}</span>
          {badge && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>{badge}</span>}
        </div>
        {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>}
      </span>
      {value && <span style={{ fontSize: "12.5px", color: COLORS.amber, fontWeight: 700, marginRight: "2px" }}>{value}</span>}
      {onClick && !disabled && <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />}
    </button>
  );
}

export function ConnectScreen({ myUserId, onBack }) {
  const [spotifyStatus, setSpotifyStatus] = useState(null);
  useEffect(() => {
    getMySpotifyStatus().then(setSpotifyStatus);
  }, []);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="link" size={22} color={COLORS.amber} />}>Connecter</PageTitleWithBar>

      <ConnectGroup title="Réseaux sociaux">
        <ConnectRow icon={<FacebookIcon size={22} />} title="Facebook" disabled badge="Bientôt" />
        <ConnectRow icon={<InstagramIcon size={22} />} title="Instagram" disabled badge="Bientôt" />
        <ConnectRow icon={<TiktokIcon size={22} />} title="TikTok" disabled badge="Bientôt" />
        <ConnectRow icon={<SnapchatIcon size={22} />} title="Snapchat" disabled badge="Bientôt" />
        <ConnectRow icon={<XIcon size={22} />} title="X" disabled badge="Bientôt" />
        <ConnectRow icon={<ThreadsIcon size={22} />} title="Threads" disabled badge="Bientôt" last />
      </ConnectGroup>

      <ConnectGroup title="Services">
        <ConnectRow
          icon={<SpotifyIcon size={22} />}
          title="Spotify"
          value={spotifyStatus?.connected ? "Connecté" : "Connecter"}
          onClick={
            spotifyStatus?.connected
              ? async () => {
                  await disconnectSpotify(myUserId);
                  setSpotifyStatus({ connected: false });
                }
              : redirectToSpotifyAuth
          }
        />
        <ConnectRow icon={<GoogleIcon size={22} />} title="Google" disabled badge="Bientôt" />
        <ConnectRow icon={<AppleIcon size={22} />} title="Apple" disabled badge="Bientôt" last />
      </ConnectGroup>

      <ConnectGroup title="Autres">
        <ConnectRow icon={<NavIcon name="user-plus" size={17} color={COLORS.amber} />} title="Contacts" subtitle="Retrouver ou inviter des Bibax depuis vos contacts" disabled badge="App native" />
        <ConnectRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Calendrier" subtitle="Ajouter des évènements à votre calendrier" disabled badge="App native" last />
      </ConnectGroup>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: `2px solid ${COLORS.amber}`,
            marginBottom: "10px",
            lineHeight: 0,
          }}
        >
          <NavIcon name="lock" size={17} color={COLORS.amber} />
        </span>
        <p style={{ fontSize: "13.5px", fontWeight: 700, margin: 0 }}>Vos données sont en sécurité</p>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "6px", marginBottom: 0 }}>
          Bibamus ne publie rien sans votre autorisation. Vous pouvez déconnecter un service à tout moment.
        </p>
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
