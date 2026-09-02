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
      <PageHeader onBack={onBack} />
      <ProfileHeader
        myName={myName}
        profile={profile}
        bibros={bibros}
        checkIns={checkIns}
        myUserId={myUserId}
        goToBibros={goToBibros}
        goToProducts={goToProducts}
        goToVenues={goToVenues}
        onGoToSettings={goToMyInfo}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <ActionCard icon={<NavIcon name="crown" size={20} color={COLORS.amber} />} title={<>Mes<br />BibaClub</>} disabled badge="Soon" />
        <ActionCard icon={<NavIcon name="bar-chart" size={20} color={COLORS.amber} />} title={<>Mes<br />Statistiques</>} onClick={goToMyStats} />
        <ActionCard icon={<NavIcon name="bottle" size={20} color={COLORS.amber} />} title={<>Mes<br />Produits</>} onClick={goToProducts} />
        <ActionCard icon={<NavIcon name="heart" size={20} color={COLORS.amber} />} title={<>Mes<br />Favoris</>} onClick={goToVenues} />
        <ActionCard icon={<NavIcon name="calendar" size={20} color={COLORS.amber} />} title={<>Mon<br />Historique</>} onClick={goToHistory} />
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
