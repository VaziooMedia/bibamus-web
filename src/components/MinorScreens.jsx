// ============================================================
// Écrans annexes — Paramètres, Historique des événements, Hub
// "Mes produits". Copiés tels quels depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ActionCard, MoneyAmount, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { ProfileHeader } from "./ProfileParts.jsx";
import { formatDate } from "../utils.js";

export function SettingsScreen({ myName, profile, onBack, isAdmin, goToImport, onLogout, goToCategory }) {
  const SettingsRow = ({ icon, title, subtitle, onClick, danger }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "none",
        border: "none",
        borderBottom: `1px solid ${COLORS.paperAlt}`,
        padding: "14px 4px",
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        color: COLORS.ink,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "14.5px", color: danger ? COLORS.wine : COLORS.ink }}>{title}</div>
        <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{subtitle}</div>
      </span>
      {!danger && <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />}
    </button>
  );

  const SettingsGroup = ({ children }) => (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px", marginBottom: "16px" }}>{children}</div>
  );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "16px", marginTop: "4px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: `2px solid ${COLORS.amber}`, padding: "2px", flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={32} color={COLORS.amber} />}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", lineHeight: 1.25, margin: 0 }}>{myName}</h1>
            {profile.lastName && <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", lineHeight: 1.25, margin: 0 }}>{profile.lastName}</h1>}
            {profile.nickname && <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", color: COLORS.amber, margin: "3px 0 0" }}>{profile.nickname}</p>}
          </div>
        </div>
      </div>

      <SettingsGroup>
        <SettingsRow icon={<NavIcon name="user" size={18} color={COLORS.amber} />} title="Compte" subtitle="Informations personnelles" onClick={() => goToCategory("account")} />
        <SettingsRow icon={<NavIcon name="lock" size={18} color={COLORS.amber} />} title="Sécurité & confidentialité" subtitle="Mot de passe, confidentialité, données" onClick={() => goToCategory("security")} />
        <SettingsRow icon={<NavIcon name="bell" size={18} color={COLORS.amber} />} title="Notifications" subtitle="Alertes, mentions, rappels" onClick={() => goToCategory("notifications")} />
        <SettingsRow icon={<NavIcon name="sliders" size={18} color={COLORS.amber} />} title="Préférences" subtitle="Langue, unités, affichage" onClick={() => goToCategory("preferences")} />
        <SettingsRow icon={<NavIcon name="brush" size={18} color={COLORS.amber} />} title="Apparence" subtitle="Thème, couleurs, icônes" onClick={() => goToCategory("appearance")} />
        <div style={{ borderBottom: "none" }}>
          <SettingsRow icon={<NavIcon name="link" size={18} color={COLORS.amber} />} title="Connecter" subtitle="Services extérieurs" onClick={() => goToCategory("connect")} />
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon={<NavIcon name="help-circle" size={18} color={COLORS.amber} />} title="Aide & support" subtitle="FAQ, assistance, contact" onClick={() => goToCategory("help")} />
        <div style={{ borderBottom: "none" }}>
          <SettingsRow icon={<NavIcon name="info" size={18} color={COLORS.amber} />} title="À propos" subtitle="Version, mentions légales" onClick={() => goToCategory("about")} />
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <div style={{ borderBottom: "none" }}>
          <SettingsRow icon={<NavIcon name="logout" size={18} color={COLORS.wine} />} title="Déconnexion" subtitle="Se déconnecter de Bibamus" onClick={onLogout} danger />
        </div>
      </SettingsGroup>

      {isAdmin && (
        <button
          onClick={goToImport}
          style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "14px 16px", textAlign: "left", cursor: "pointer", color: COLORS.ink, marginBottom: "10px" }}
        >
          <div style={{ fontWeight: 700, fontSize: "14.5px", marginBottom: "4px" }}>⬆️ Importer des données</div>
          <div style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Charger un export JSON depuis l'artefact Claude (admin uniquement)</div>
        </button>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function EventHistoryScreen({ myName, profile, bibros, checkIns, events, displayTotalFor, onBack, openEvent, onDeleteEvent }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const sorted = [...events].sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>HISTORIQUE</span>

      <ProfileHeader myName={myName} profile={profile} bibros={bibros} checkIns={checkIns} />

      <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "34px", margin: "0 0 6px 0", lineHeight: 1 }}>Tes soirées passées</h2>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
        Retrouve combien tu as dépensé et avec qui, soirée par soirée — pratique pour ta comptabilité de fin de mois.
      </p>

      {sorted.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun événement enregistré pour l'instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map((ev) => (
            <div key={ev.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px 16px" }}>
              <button
                onClick={() => openEvent(ev.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>
                    {ev.name}
                    {ev.salonCode ? " 🎉" : ""}
                    {!ev.closed && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.sage, marginLeft: "6px" }}>EN COURS</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "2px" }}>
                    {ev.date && `${formatDate(ev.date)} · `}
                    {ev.rounds.length} tournée{ev.rounds.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, color: COLORS.amberDark }}><MoneyAmount value={displayTotalFor(ev)} currency={ev.currency} /></div>
              </button>
              <button
                onClick={() => (confirmDeleteId === ev.id ? onDeleteEvent(ev.id) : setConfirmDeleteId(ev.id))}
                style={{
                  marginTop: "8px",
                  background: "none",
                  border: confirmDeleteId === ev.id ? `2px solid ${COLORS.wine}` : "none",
                  borderRadius: "8px",
                  padding: confirmDeleteId === ev.id ? "6px 10px" : 0,
                  color: COLORS.wine,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {confirmDeleteId === ev.id ? "Confirmer la suppression ?" : "Supprimer"}
              </button>
            </div>
          ))}
        </div>
      )}
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function MyProductsHubScreen({ ratedCount, toTryCount, onBack, goToRated, goToToTry }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>MES PRODUITS</span>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", margin: "4px 0 18px 0", lineHeight: 1 }}>Bières, vins & spiritueux</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <ActionCard icon="⭐" title="Mes produits notés" subtitle={`${ratedCount} produit${ratedCount > 1 ? "s" : ""} — visible par tes Bibax`} onClick={goToRated} />
        <ActionCard icon="🎯" title="Mes produits à goûter" subtitle={`${toTryCount} produit${toTryCount > 1 ? "s" : ""} mis de côté`} onClick={goToToTry} />
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}


export function EventSettingsScreen({ event, onSave, onBack }) {
  const [eventMode, setEventMode] = useState(event.mode || "tournees");
  const [jetonUnitValueInput, setJetonUnitValueInput] = useState(event.jetonUnitValue ? String(event.jetonUnitValue).replace(".", ",") : "");

  const modes = [
    { key: "tournees", label: "Mode ORBIS", desc: "Tournées" },
    { key: "cagnotte", label: "Mode ARCA", desc: "Cagnotte" },
    { key: "addition", label: "Mode PARTES", desc: "Addition partagée" },
    { key: "openbar", label: "Mode LIBER", desc: "Open bar" },
  ];

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0", lineHeight: 1.2 }}>Choix du mode</h1>

      <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "16px" }}>
        Changer de mode ne modifie que ce qui se passe à partir de maintenant.
        <br />
        Les tournées déjà offertes gardent leur historique tel quel.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setEventMode(m.key)}
            style={{
              textAlign: "left",
              background: eventMode === m.key ? COLORS.amber : COLORS.surface,
              color: eventMode === m.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${eventMode === m.key ? COLORS.ink : COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "14.5px" }}>
              {eventMode === m.key ? (
                m.label
              ) : (
                <>
                  Mode <span style={{ color: COLORS.amber }}>{m.label.replace("Mode ", "")}</span>
                </>
              )}
            </div>
            <div style={{ fontSize: "12px", marginTop: "2px", opacity: eventMode === m.key ? 0.85 : 0.65 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {event.currency === "jeton" && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Valeur du jeton</label>
          <input
            type="text"
            inputMode="decimal"
            value={jetonUnitValueInput}
            onChange={(e) => setJetonUnitValueInput(e.target.value.replace(",", "."))}
            placeholder="0.00"
            style={{ width: "140px", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none" }}
          />
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px" }}>
            À renseigner ou corriger ici — que ce soit parce que tu ne connaissais pas encore le prix à la création, ou pour corriger une valeur erronée. Ne change rien aux jetons déjà achetés, juste leur valeur en €.
          </p>
        </div>
      )}

      <PrimaryButton onClick={() => onSave(eventMode, parseFloat(jetonUnitValueInput) || 0)} style={{ width: "100%" }}>
        Valider
      </PrimaryButton>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
