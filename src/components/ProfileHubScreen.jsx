// ============================================================
// Hub BibaMe — copié tel quel depuis le prototype Claude.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ActionCard } from "./ui.jsx";
import { ProfileHeader } from "./ProfileParts.jsx";

export function ProfileHubScreen({ myName, profile, bibros, checkIns, myUserId, onBack, goToMyInfo, goToMyStats, goToBibros, goToProducts, goToVenues, goToHistory, goToSettings }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader
        onBack={onBack}
        right={
          <button onClick={goToMyInfo} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }} title="Paramètres" aria-label="Paramètres">
            <NavIcon name="settings" size={20} color={COLORS.inkSoft} />
          </button>
        }
      />
      <ProfileHeader myName={myName} profile={profile} bibros={bibros} checkIns={checkIns} myUserId={myUserId} goToBibros={goToBibros} goToProducts={goToProducts} goToVenues={goToVenues} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <ActionCard icon={<NavIcon name="crown" size={20} color={COLORS.amber} />} title="BibaClub" subtitle="Mes groupes de Bibax" disabled badge="Soon" />
        <ActionCard icon={<NavIcon name="bar-chart" size={20} color={COLORS.amber} />} title="Mes Statistiques" subtitle="Verres, calories, dépenses, records" onClick={goToMyStats} />
        <ActionCard icon={<NavIcon name="users" size={20} color={COLORS.amber} />} title="Mes Bibax" subtitle="Tes amis, et qui est en soirée" onClick={goToBibros} />
        <ActionCard icon={<NavIcon name="bottle" size={20} color={COLORS.amber} />} title="Mes produits" subtitle="Notés ou à goûter" onClick={goToProducts} />
        <ActionCard icon={<NavIcon name="heart" size={20} color={COLORS.amber} />} title="Mes favoris" subtitle="Tes lieux habitués" onClick={goToVenues} />
        <ActionCard icon={<NavIcon name="calendar" size={20} color={COLORS.amber} />} title="Historique" subtitle="Tes soirées passées" onClick={goToHistory} />
      </div>

      <div style={{ marginTop: "10px" }}>
        <ActionCard icon={<NavIcon name="settings" size={20} color={COLORS.inkSoft} />} title="Réglages" subtitle="Informations sur l'app, export des données" onClick={goToSettings} />
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
