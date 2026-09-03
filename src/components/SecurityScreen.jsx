// ============================================================
// Écran "Sécurité & confidentialité" — accessible depuis
// Paramètres. Certaines lignes sont réellement fonctionnelles
// (mot de passe, vérification e-mail, déconnexion des autres
// appareils, export de données) ; les autres n'ont pas encore de
// fonctionnalité réelle derrière et affichent un écran honnête
// "Bientôt disponible" plutôt qu'un bouton trompeur.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";
import { updatePassword, loadMyBlockedUsers, unblockUser } from "../data/sharedDirectories.js";
import { supabase } from "../supabaseClient.js";

const FLUO_RED = "#FF3B3B";

function SecurityRow({ icon, title, subtitle, onClick, titleColor, disabled, badge }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "none",
        border: "none",
        borderBottom: `1px solid ${COLORS.paperAlt}`,
        padding: "14px 4px",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        width: "100%",
        color: COLORS.ink,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "14.5px", color: titleColor || COLORS.ink }}>{title}</span>
          {badge && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, border: `1px solid ${COLORS.amber}`, borderRadius: "999px", padding: "1px 7px" }}>{badge}</span>
          )}
        </div>
        {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>}
      </span>
      {!disabled && <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />}
    </button>
  );
}

function SecurityGroup({ title, children }) {
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

export function SecurityScreen({ session, onBack, goToSubScreen }) {
  const emailVerified = !!session?.user?.email_confirmed_at;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="lock" size={22} color={COLORS.amber} />}>Sécurité & confidentialité</PageTitleWithBar>

      <SecurityGroup title="Sécurité">
        <SecurityRow icon={<NavIcon name="lock" size={17} color={COLORS.amber} />} title="Mot de passe" subtitle="Modifier votre mot de passe" onClick={() => goToSubScreen("password")} />
        <SecurityRow icon={<NavIcon name="faceid" size={17} color={COLORS.amber} />} title="Connexion biométrique" subtitle="Face ID / empreinte — prévu sur l'app native" disabled badge="App native" />
        <div style={{ borderBottom: "none" }}>
          <SecurityRow
            icon={<NavIcon name="mail" size={17} color={COLORS.amber} />}
            title="E-mail vérifié"
            subtitle={emailVerified ? "✓ Vérifié" : "✗ Non vérifié"}
            titleColor={COLORS.ink}
            onClick={() => goToSubScreen("emailVerify")}
          />
        </div>
      </SecurityGroup>

      <SecurityGroup title="Confidentialité">
        <SecurityRow icon={<NavIcon name="eye" size={17} color={COLORS.amber} />} title="Profil public" subtitle="Choisir ce qui est visible" onClick={() => goToSubScreen("publicProfile")} />
        <div style={{ borderBottom: "none" }}>
          <SecurityRow icon={<NavIcon name="no-entry" size={17} color={COLORS.amber} />} title="Utilisateurs bloqués" subtitle="Gérer les comptes bloqués" onClick={() => goToSubScreen("blockedUsers")} />
        </div>
      </SecurityGroup>

      <SecurityGroup title="Appareils & données">
        <SecurityRow icon={<NavIcon name="smartphone" size={17} color={COLORS.amber} />} title="Appareils connectés" subtitle="Prévu sur l'app native" disabled badge="App native" />
        <SecurityRow icon={<NavIcon name="download" size={17} color={COLORS.amber} />} title="Télécharger mes données" subtitle="Exporter mes données Bibamus" onClick={() => goToSubScreen("dataExport")} />
        <SecurityRow icon={<NavIcon name="check" size={17} color={COLORS.amber} />} title="Permissions & consentements" subtitle="Gérer les autorisations et préférences" onClick={() => goToSubScreen("permissions")} />
        <div style={{ borderBottom: "none" }}>
          <SecurityRow
            icon={<NavIcon name="trash" size={17} color={FLUO_RED} />}
            title="Réinitialiser les sessions"
            subtitle="Déconnecter tous les appareils sauf celui-ci"
            titleColor={FLUO_RED}
            onClick={() => goToSubScreen("resetSessions")}
          />
        </div>
      </SecurityGroup>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Utilisateurs bloqués — liste réelle, avec déblocage.
export function BlockedUsersScreen({ onBack }) {
  const [blocked, setBlocked] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    loadMyBlockedUsers().then(setBlocked);
  }, []);

  const handleUnblock = async (userId) => {
    setUnblockingId(userId);
    await unblockUser(userId);
    setBlocked((prev) => prev.filter((b) => b.userId !== userId));
    setUnblockingId(null);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="no-entry" size={22} color={COLORS.amber} />}>Utilisateurs bloqués</PageTitleWithBar>

      {blocked === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : blocked.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: 0 }}>Vous n'avez bloqué personne pour l'instant.</p>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
          {blocked.map((b, i) => (
            <div
              key={b.userId}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 4px", borderBottom: i < blocked.length - 1 ? `1px solid ${COLORS.paperAlt}` : "none" }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {b.avatarUrl ? <img src={b.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={18} color={COLORS.amber} />}
              </div>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "14px" }}>
                {b.name} {b.lastName || ""}
              </span>
              <button
                onClick={() => handleUnblock(b.userId)}
                disabled={unblockingId === b.userId}
                style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}
              >
                {unblockingId === b.userId ? "..." : "Débloquer"}
              </button>
            </div>
          ))}
        </div>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Mot de passe — réellement fonctionnel (supabase.auth.updateUser).
export function PasswordChangeScreen({ onBack }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <PageTitleWithBar icon={<NavIcon name="lock" size={22} color={COLORS.amber} />}>Mot de passe</PageTitleWithBar>
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0 }}>Mot de passe mis à jour.</p>
        </div>
        <PageFooterNav onBack={onBack} />
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="lock" size={22} color={COLORS.amber} />}>Mot de passe</PageTitleWithBar>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Nouveau mot de passe</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px", marginBottom: "16px" }}
      />
      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Confirmer le mot de passe</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "16px" }}
      />
      {error && <p style={{ fontSize: "12.5px", color: FLUO_RED, marginTop: "10px" }}>{error}</p>}

      <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: "20px" }}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// E-mail vérifié — statut réel (session.user.email_confirmed_at), avec renvoi réel du mail de
// confirmation si besoin.
export function EmailVerifyScreen({ session, onBack }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const emailVerified = !!session?.user?.email_confirmed_at;

  const handleResend = async () => {
    setError(null);
    setSending(true);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: session.user.email });
    setSending(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="mail" size={22} color={COLORS.amber} />}>E-mail vérifié</PageTitleWithBar>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: emailVerified ? COLORS.amber : FLUO_RED }}>{emailVerified ? "✓ Vérifié" : "✗ Non vérifié"}</p>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "6px 0 0" }}>{session?.user?.email}</p>
      </div>

      {!emailVerified && !sent && (
        <PrimaryButton onClick={handleResend} disabled={sending} style={{ width: "100%" }}>
          {sending ? "Envoi..." : "Renvoyer l'e-mail de confirmation"}
        </PrimaryButton>
      )}
      {sent && <p style={{ fontSize: "13px", color: COLORS.amber, textAlign: "center" }}>E-mail renvoyé — vérifiez votre boîte de réception.</p>}
      {error && <p style={{ fontSize: "12.5px", color: FLUO_RED, marginTop: "10px" }}>{error}</p>}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Réinitialiser les sessions — réellement fonctionnel (supabase.auth.signOut scope "others").
export function ResetSessionsScreen({ onBack }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    setConfirming(false);
    const { error: err } = await supabase.auth.signOut({ scope: "others" });
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="trash" size={22} color={COLORS.amber} />}>Réinitialiser les sessions</PageTitleWithBar>

      <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, marginBottom: "20px" }}>
        Déconnecte tous les autres appareils actuellement connectés à votre compte — celui-ci reste connecté.
      </p>

      {done ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0 }}>Les autres appareils ont été déconnectés.</p>
        </div>
      ) : confirming ? (
        <>
          <p style={{ fontSize: "13px", color: FLUO_RED, marginBottom: "14px", textAlign: "center" }}>Confirmer la déconnexion de tous les autres appareils ?</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontWeight: 700, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleReset} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `2px solid ${FLUO_RED}`, background: "none", color: FLUO_RED, fontWeight: 700, cursor: "pointer" }}>
              Confirmer
            </button>
          </div>
        </>
      ) : (
        <PrimaryButton onClick={() => setConfirming(true)} style={{ width: "100%" }}>
          Déconnecter les autres appareils
        </PrimaryButton>
      )}
      {error && <p style={{ fontSize: "12.5px", color: FLUO_RED, marginTop: "10px" }}>{error}</p>}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Télécharger mes données — export réel des données déjà disponibles côté client (profil),
// en JSON téléchargeable. Un export plus complet (historique, Stories, etc.) pourrait être
// ajouté plus tard côté serveur.
export function DataExportScreen({ profile, onBack }) {
  const handleExport = () => {
    const data = { profile, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bibamus-mes-donnees.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="download" size={22} color={COLORS.amber} />}>Télécharger mes données</PageTitleWithBar>
      <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, marginBottom: "20px" }}>
        Exporte les informations de votre profil dans un fichier JSON téléchargeable. L'export de l'historique complet (check-ins, dégustations, Stories) arrivera dans une prochaine version.
      </p>
      <PrimaryButton onClick={handleExport} style={{ width: "100%" }}>
        Télécharger mes données
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
