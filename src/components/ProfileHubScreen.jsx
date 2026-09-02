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
      <ProfileHeader myName={myName} profile={profile} bibros={bibros} checkIns={checkIns} myUserId={myUserId} />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <ActionCard
          icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
          title="BibaClub"
          subtitle="Mes groupes de Bibax"
          disabled
          badge="Soon"
        />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Mes Statistiques" subtitle="Verres, calories, dépenses, records et classements" onClick={goToMyStats} />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Mes Bibax" subtitle="Tes amis sur l'app, et qui est en soirée" onClick={goToBibros} />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Mes produits" subtitle="Bières, vins & spiritueux notés ou à goûter" onClick={goToProducts} />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Mes lieux favoris" subtitle="Tes habitués, avec adresse, carte boissons et stats" onClick={goToVenues} />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Mes Événements - Historique" subtitle="Combien tu as dépensé, et avec qui, soirée par soirée" onClick={goToHistory} />
        <ActionCard icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />} title="Réglages" subtitle="Informations sur l'app, export des données" onClick={goToSettings} />
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
