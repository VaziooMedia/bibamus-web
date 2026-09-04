// ============================================================
// Écran "Aide & Support" — accessible depuis Paramètres.
// Bloc 1 (FAQ, Guides, Astuces, État des services) : aucun
// contenu n'existe encore, grisé. Bloc 2 : formulaires réels
// (stockés, consultables côté plateforme de gestion) + mailto
// direct. Bloc 3 : documents juridiques grisés (pas encore
// rédigés), "À propos" réel.
// ============================================================
import React, { useState } from "react";
import { COLORS, APP_VERSION } from "../constants.js";
import { NavIcon, BibamusLogoFull } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { PageTitleWithBar } from "./AccountScreen.jsx";
import { submitSupportMessage } from "../data/sharedDirectories.js";

const SUPPORT_EMAIL = "support@bibamus.app";

function HelpGroup({ title, children }) {
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

function HelpRow({ icon, title, disabled, onClick, last }) {
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
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "14px" }}>{title}</span>
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

export function HelpSupportScreen({ onBack, goToContact, goToReport, goToAbout }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name="help-circle" size={22} color={COLORS.amber} />}>Aide & support</PageTitleWithBar>

      <HelpGroup title="Aide rapide">
        <HelpRow icon={<NavIcon name="help-circle" size={17} color={COLORS.amber} />} title="FAQ" disabled />
        <HelpRow icon={<NavIcon name="book-open" size={17} color={COLORS.amber} />} title="Guides & tutoriels" disabled />
        <HelpRow icon={<NavIcon name="lightbulb" size={17} color={COLORS.amber} />} title="Astuces & conseils" disabled />
        <HelpRow icon={<NavIcon name="activity" size={17} color={COLORS.amber} />} title="État des services" disabled last />
      </HelpGroup>

      <HelpGroup title="Contactez-nous">
        <HelpRow icon={<NavIcon name="message-square" size={17} color={COLORS.amber} />} title="Nous écrire" onClick={goToContact} />
        <HelpRow
          icon={<NavIcon name="mail" size={17} color={COLORS.amber} />}
          title="Envoyer un e-mail"
          onClick={() => {
            window.location.href = `mailto:${SUPPORT_EMAIL}`;
          }}
        />
        <HelpRow icon={<NavIcon name="alert-triangle" size={17} color={COLORS.amber} />} title="Signaler un problème" onClick={goToReport} last />
      </HelpGroup>

      <HelpGroup title="Ressources">
        <HelpRow icon={<NavIcon name="shield-check" size={17} color={COLORS.amber} />} title="Politique de confidentialité" disabled />
        <HelpRow icon={<NavIcon name="file-text" size={17} color={COLORS.amber} />} title="Conditions d'utilisation" disabled />
        <HelpRow icon={<NavIcon name="info" size={17} color={COLORS.amber} />} title="À propos de Bibamus" disabled last />
      </HelpGroup>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "18px", textAlign: "center", marginBottom: "18px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>© 2026 Bibamus</p>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "4px 0" }}>Tous droits réservés</p>
        <a href="https://bibamus.app" target="_blank" rel="noreferrer" style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, textDecoration: "none" }}>
          bibamus.app
        </a>
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

// Formulaire partagé — "Nous écrire" (type="contact") et "Signaler un problème"
// (type="report") ne diffèrent que par le titre, l'icône et le texte d'intro.
export function ContactFormScreen({ type, myUserId, profile, onBack }) {
  const isReport = type === "report";
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(profile?.email || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Merci de décrire votre message.");
      return;
    }
    setSending(true);
    setError(null);
    const result = await submitSupportMessage(myUserId, type, message.trim(), contactEmail.trim());
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <PageTitleWithBar icon={<NavIcon name={isReport ? "alert-triangle" : "message-square"} size={22} color={COLORS.amber} />}>{isReport ? "Signaler un problème" : "Nous écrire"}</PageTitleWithBar>
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <NavIcon name="check" size={28} color={COLORS.amber} />
          <p style={{ fontSize: "14px", fontWeight: 700, margin: "10px 0 0" }}>Message envoyé</p>
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "6px 0 0" }}>Merci — nous reviendrons vers vous si nécessaire.</p>
        </div>
        <PageFooterNav onBack={onBack} />
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <PageTitleWithBar icon={<NavIcon name={isReport ? "alert-triangle" : "message-square"} size={22} color={COLORS.amber} />}>{isReport ? "Signaler un problème" : "Nous écrire"}</PageTitleWithBar>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
        {isReport ? (
          <>Décrivez le problème rencontré.<br />Plus vous êtes précis, plus vite nous pourrons y remédier.</>
        ) : (
          <>Une question, une suggestion ?<br />Écrivez-nous, nous vous répondrons dans les plus brefs délais.</>
        )}
      </p>

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Votre message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        placeholder={isReport ? "Ce qui s'est passé, sur quel écran..." : "Votre message"}
        style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", resize: "vertical", fontFamily: "inherit" }}
      />

      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, margin: "14px 0 6px", display: "block" }}>E-mail de contact (optionnel)</label>
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        placeholder="votre@email.com"
        style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
      />

      {error && <p style={{ fontSize: "12.5px", color: "#FF3B3B", marginTop: "10px" }}>{error}</p>}

      <PrimaryButton onClick={handleSubmit} disabled={sending} style={{ width: "100%", marginTop: "20px" }}>
        {sending ? "Envoi..." : "Envoyer"}
      </PrimaryButton>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function AboutScreen({ onBack }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1, alignItems: "center" }}>
      <div style={{ alignSelf: "flex-start", width: "100%" }}>
        <PageHeader onBack={onBack} />
      </div>
      <div style={{ marginTop: "20px", marginBottom: "16px" }}>
        <BibamusLogoFull height={48} />
      </div>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "24px" }}>Version {APP_VERSION}</p>
      <p style={{ fontSize: "13.5px", color: COLORS.ink, textAlign: "center", maxWidth: "320px", lineHeight: 1.5 }}>
        Bibamus est une application belge dédiée aux amateurs de bonnes boissons — check-ins, découvertes, et moments partagés entre Bibax.
      </p>
      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "24px" }}>© {new Date().getFullYear()} Bibamus</p>
      <div style={{ marginTop: "auto", width: "100%" }}>
        <PageFooterNav onBack={onBack} />
      </div>
    </div>
  );
}
