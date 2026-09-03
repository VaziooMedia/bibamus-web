// ============================================================
// Écran "Connecter" — accessible depuis Paramètres. Chaque
// service a sa propre page (le connect/déconnect s'y passe),
// avec un badge de statut (vert = connecté, rouge = non
// connecté) et une flèche systématique. Seul Spotify est
// réellement connecté pour l'instant (OAuth PKCE déjà construit
// pour BibaMusic, réutilisé ici tel quel) — les autres n'ont pas
// d'intégration construite, d'où le statut "non connecté" figé.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, XIcon, ThreadsIcon, SpotifyIcon, GoogleIcon, AppleIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
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

function StatusBadge({ connected }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        border: `2px solid ${connected ? COLORS.amber : "#FF3B3B"}`,
        flexShrink: 0,
      }}
    >
      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "block", lineHeight: 0 }}>
        <NavIcon name={connected ? "check" : "x"} size={11} color={connected ? COLORS.amber : "#FF3B3B"} />
      </span>
    </span>
  );
}

function ConnectRow({ icon, title, connected, disabled, onClick, last }) {
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
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "14px" }}>{title}</span>
      <StatusBadge connected={connected} />
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

export function ConnectScreen({ onBack, goToSpotify }) {
  const [spotifyStatus, setSpotifyStatus] = useState(null);
  useEffect(() => {
    getMySpotifyStatus().then(setSpotifyStatus);
  }, []);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="link" size={22} color={COLORS.amber} />}>Connecter</PageTitleWithBar>

      <ConnectGroup title="Réseaux sociaux">
        <ConnectRow icon={<FacebookIcon size={22} />} title="Facebook" connected={false} disabled />
        <ConnectRow icon={<InstagramIcon size={22} />} title="Instagram" connected={false} disabled />
        <ConnectRow icon={<TiktokIcon size={22} />} title="TikTok" connected={false} disabled />
        <ConnectRow icon={<SnapchatIcon size={22} />} title="Snapchat" connected={false} disabled />
        <ConnectRow icon={<XIcon size={22} />} title="X" connected={false} disabled />
        <ConnectRow icon={<ThreadsIcon size={22} />} title="Threads" connected={false} disabled last />
      </ConnectGroup>

      <ConnectGroup title="Services">
        <ConnectRow icon={<SpotifyIcon size={22} />} title="Spotify" connected={!!spotifyStatus?.connected} onClick={goToSpotify} />
        <ConnectRow icon={<GoogleIcon size={22} />} title="Google" connected={false} disabled />
        <ConnectRow icon={<AppleIcon size={22} />} title="Apple" connected={false} disabled last />
      </ConnectGroup>

      <ConnectGroup title="Autres">
        <ConnectRow icon={<NavIcon name="user-plus" size={17} color={COLORS.amber} />} title="Contacts" connected={false} disabled />
        <ConnectRow icon={<NavIcon name="calendar" size={17} color={COLORS.amber} />} title="Calendrier" connected={false} disabled last />
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

// Spotify — seule intégration réellement fonctionnelle. Connexion/déconnexion se passent ici,
// pas sur la liste.
export function SpotifyDetailScreen({ myUserId, onBack }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    getMySpotifyStatus().then(setStatus);
  }, []);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<SpotifyIcon size={22} />}>Spotify</PageTitleWithBar>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
        <p style={{ fontSize: "13.5px", fontWeight: 700, margin: 0, color: status?.connected ? COLORS.amber : "#FF3B3B" }}>
          {status?.connected ? "Connecté" : "Non connecté"}
        </p>
        {status?.connected && status?.displayName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "6px 0 0" }}>{status.displayName}</p>}
      </div>

      {status?.connected ? (
        <button
          onClick={async () => {
            await disconnectSpotify(myUserId);
            setStatus({ connected: false });
          }}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "2px solid #FF3B3B", background: "none", color: "#FF3B3B", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          Déconnecter Spotify
        </button>
      ) : (
        <PrimaryButton onClick={redirectToSpotifyAuth} style={{ width: "100%" }}>
          Connecter Spotify
        </PrimaryButton>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
