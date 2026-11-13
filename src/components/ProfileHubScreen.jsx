// ============================================================
// Hub BibaMe (« Mon Profil »).
//
// Sous le bloc du rond de profil, trois onglets (les mêmes pastilles que les fiches Produit et Lieu, `PillTabs`) :
//   - Infos     : le bloc des infos de la personne (citation, date de naissance…), les trois blocs Bibax / Drink Checks /
//                 Place Checks et les petits blocs d'accès (BibaClub, Produits, Favoris, Historique, Photos…), puis
//                 le raccourci des paramètres ;
//   - Biba360   : toutes les statistiques (ex-écran « Mes Statistiques », devenu l'onglet : plus de petit bloc d'accès) ;
//   - BibaPulse : les publications de la personne dans BibaPulse (cartes du fil, via `EntityPulseSection` en mode « mine »).
//
// Retour sur l'onglet : quand on quitte le profil depuis Biba360 ou BibaPulse (fiche d'un lieu, d'un produit, année Bibamus…),
// l'écran se rouvre sur le même onglet. `initialTab` vient de l'écran hôte (App), lu une seule fois ; `onTabConsumed` le remet à
// zéro pour qu'une ouverture ultérieure du profil reparte de « Infos ».
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, ActionCard } from "./ui.jsx";
import { ProfileHeader, ProfileInfoBlock, ProfileStatCards } from "./ProfileParts.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { MyStatsContent } from "./MyStatsScreen.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import settingsIconUrl from "../assets/brand/settings-icon.png";

export function ProfileHubScreen({
  myName,
  profile,
  bibros,
  events,
  alcoholFreeDays,
  onToggleAlcoholFreeDay,
  myUserId,
  myBibroCode,
  initialTab = "infos",
  onTabConsumed,
  onBack,
  goToMyInfo,
  goToBibros,
  goToProducts,
  goToVenues,
  goToHistory,
  goToPhotos,
  goToSettings,
  onOpenMyStory,
  goToBibaClubs,
  onOpenWrapped,
  onOpenStatsVenue,
  onOpenStatsDrink,
  onOpenStatsBibro,
  onOpenVenue,
  onOpenDrink,
  onOpenBrand,
  onOpenProducer,
  pulseReturnEntryId = null,
  onRememberPulseEntry,
}) {
  const [activeTab, setActiveTab] = useState(pulseReturnEntryId ? "bibapulse" : initialTab);
  useEffect(() => {
    if (onTabConsumed) onTabConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ProfileHeader myName={myName} profile={profile} myUserId={myUserId} onOpenMyStory={onOpenMyStory} />

      <PillTabs
        tabs={[
          { key: "infos", label: "Infos" },
          { key: "biba360", label: { prefix: "Biba", accent: "360" } },
          { key: "bibapulse", label: { prefix: "Biba", accent: "Pulse" } },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "infos" && (
        <>
          <ProfileInfoBlock profile={profile} />
          <ProfileStatCards bibros={bibros} myUserId={myUserId} goToBibros={goToBibros} goToProducts={goToProducts} goToVenues={goToVenues} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <ActionCard icon={<NavIcon name="crown" size={20} color={COLORS.amber} />} title={<>Mes<br />BibaClub</>} onClick={goToBibaClubs} />
            <ActionCard
              icon={
                <span style={{ display: "inline-flex", width: "20px", justifyContent: "center" }}>
                  <NavIcon name="bottle" size={20} color={COLORS.amber} />
                </span>
              }
              title={<>Mes<br />Produits</>}
              onClick={goToProducts}
            />
            <ActionCard icon={<NavIcon name="heart" size={20} color={COLORS.amber} />} title={<>Mes<br />Favoris</>} onClick={goToVenues} />
            <ActionCard icon={<NavIcon name="calendar" size={20} color={COLORS.amber} />} title={<>Mon<br />Historique</>} onClick={goToHistory} />
            <ActionCard icon={<NavIcon name="camera" size={20} color={COLORS.amber} />} title={<>Mes<br />Photos</>} onClick={goToPhotos} />
            <ActionCard icon={<NavIcon name="activity" size={20} color={COLORS.inkSoft} />} title="BibaCare" disabled badge="Bientôt" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              onClick={goToSettings}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
              title="Paramètres"
              aria-label="Paramètres"
            >
              <img src={settingsIconUrl} alt="" style={{ width: "24px", height: "24px" }} />
            </button>
          </div>
        </>
      )}

      {activeTab === "biba360" && (
        <MyStatsContent
          events={events}
          bibros={bibros}
          alcoholFreeDays={alcoholFreeDays}
          onToggleAlcoholFreeDay={onToggleAlcoholFreeDay}
          openVenue={onOpenStatsVenue}
          openDrink={onOpenStatsDrink}
          openBibro={onOpenStatsBibro}
          onOpenWrapped={onOpenWrapped}
        />
      )}

      {activeTab === "bibapulse" && (
        <EntityPulseSection
          entityType="mine"
          myUserId={myUserId}
          myBibroCode={myBibroCode}
          onOpenVenue={onOpenVenue}
          onOpenDrink={onOpenDrink}
          onOpenBrand={onOpenBrand}
          onOpenProducer={onOpenProducer}
          returnEntryId={pulseReturnEntryId}
          onRememberEntry={onRememberPulseEntry}
        />
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
