// ============================================================
// Composant principal de l'app — pour l'instant : charge les
// répertoires partagés depuis Supabase et affiche la page Home.
// Les autres écrans seront branchés au fur et à mesure des
// prochains blocs.
// ============================================================
import React, { useState, useEffect } from "react";
import { NavigationContext, ProfileNavContext } from "./contexts.js";
import { EVENT_TYPES } from "./events.js";
import { BottomNav } from "./components/ui.jsx";
import { ErrorBoundary, installGlobalCrashReporting } from "./components/ErrorBoundary.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { BarcodeScannerModal } from "./components/BarcodeScannerModal.jsx";
import { LinkedScanResultsModal } from "./components/LinkedScanResultsModal.jsx";
import { VenueMapScreen } from "./components/VenueMapScreen.jsx";
import { BibamusLogoFull, NavIcon } from "./components/icons.jsx";
import { COLORS } from "./constants.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { SessionHubScreen, RepertoireHubScreen, ComingSoonScreen } from "./components/HubScreens.jsx";
import { VenueDirectoryScreen } from "./components/VenueDirectoryScreen.jsx";
import { EventDashboardScreen } from "./components/EventDashboardScreen.jsx";
import { DrinkCheckScreen } from "./components/DrinkCheckScreen.jsx";
import { SalonTabsScreen } from "./components/SalonTabsScreen.jsx";
import { BibaMusicScreen } from "./components/BibaMusicScreen.jsx";
import { BibaPulseScreen } from "./components/BibaPulseScreen.jsx";
import { BibaPingScreen } from "./components/BibaPingScreen.jsx";
import { BibaxAllSuggestionsScreen } from "./components/BibaxAllSuggestionsScreen.jsx";
import { StoryCreateScreen } from "./components/StoryCreateScreen.jsx";
import { StoriesBar } from "./components/StoriesBar.jsx";
import { StoryViewer } from "./components/StoryViewer.jsx";
import { BibaxProfilePreviewScreen } from "./components/BibaxProfilePreviewScreen.jsx";
import { RoundComposeScreen } from "./components/RoundComposeScreen.jsx";
import { RoundTicketScreen } from "./components/RoundTicketScreen.jsx";
import { NewEventScreen } from "./components/NewEventScreen.jsx";
import { JoinSalonScreen } from "./components/JoinSalonScreen.jsx";
import { BibaPlayHubScreen } from "./components/BibaPlayHubScreen.jsx";
import { PredictHubScreen, PredictGameScreen, ANSWER_DURATION_SECONDS } from "./components/PredictScreens.jsx";
import { MenuSetupScreen } from "./components/MenuSetupScreen.jsx";
import { DrinksDirectoryScreen } from "./components/DrinksDirectoryScreen.jsx";
import { DrinkFormScreen } from "./components/DrinkFormScreen.jsx";
import { SubmitDrinkWizardScreen } from "./components/SubmitDrinkWizardScreen.jsx";
import { SubmitVenueWizardScreen } from "./components/SubmitVenueWizardScreen.jsx";
import { SubmitBreweryWizardScreen } from "./components/SubmitBreweryWizardScreen.jsx";
import { SubmitBrandWizardScreen } from "./components/SubmitBrandWizardScreen.jsx";
import { DirectoryVenueFormScreen } from "./components/DirectoryVenueFormScreen.jsx";
import { VenueDetailScreen } from "./components/VenueDetailScreen.jsx";
import { VenueMenuCategoriesScreen } from "./components/VenueMenuCategoriesScreen.jsx";
import { VenueCategoryDrinksScreen } from "./components/VenueCategoryDrinksScreen.jsx";
import { DrinkDetailScreen } from "./components/DrinkDetailScreen.jsx";
import { ProfileHubScreen } from "./components/ProfileHubScreen.jsx";
import { BibaClubsListScreen } from "./components/BibaClubsListScreen.jsx";
import { CreateClubScreen } from "./components/CreateClubScreen.jsx";
import { ClubDetailScreen } from "./components/ClubDetailScreen.jsx";
import { MyProfileScreen } from "./components/MyProfileScreen.jsx";
import { MyPhotosScreen } from "./components/MyPhotosScreen.jsx";
import { MyStatsScreen } from "./components/MyStatsScreen.jsx";
import { WrappedScreen } from "./components/WrappedScreen.jsx";
import { SettingsScreen, EventHistoryScreen, MyProductsHubScreen, EventSettingsScreen, WaterAlertSettingsScreen } from "./components/MinorScreens.jsx";
import { AccountScreen, FieldEditScreen, GenderEditScreen, EmailViewScreen, PhoneEditScreen, LocationEditScreen, PhotoEditScreen, DeactivateAccountScreen, SettingsComingSoonScreen, PublicProfileScreen, SocialLinkEditScreen } from "./components/AccountScreen.jsx";
import { SecurityScreen, PasswordChangeScreen, EmailVerifyScreen, ResetSessionsScreen, DataExportScreen, BlockedUsersScreen, PermissionsScreen, MyStatsPrivacyScreen, StoryTagsPrivacyScreen } from "./components/SecurityScreen.jsx";
import { NotificationsScreen } from "./components/NotificationsScreen.jsx";
import { PreferencesScreen, StorySettingsScreen, ChoiceScreen, VolumeWeightScreen } from "./components/PreferencesScreen.jsx";
import { AppearanceScreen } from "./components/AppearanceScreen.jsx";
import { ConnectScreen, SpotifyDetailScreen } from "./components/ConnectScreen.jsx";
import { HelpSupportScreen, ContactFormScreen, AboutScreen } from "./components/HelpSupportScreen.jsx";
import { SearchScreen } from "./components/SearchScreen.jsx";
import { NotificationsFeedScreen } from "./components/NotificationsFeedScreen.jsx";
import { BibaSoloScreen } from "./components/BibaSoloScreen.jsx";
import { EventHistoryDetailScreen } from "./components/EventHistoryDetailScreen.jsx";
import { BreweriesAdminScreen, BrandsAdminScreen } from "./components/BreweriesAndBrandsScreens.jsx";
import { BreweryDirectoryScreen } from "./components/BreweryDirectoryScreen.jsx";
import { BrandDirectoryScreen } from "./components/BrandDirectoryScreen.jsx";
import { BreweryDetailScreen, BrandDetailScreen } from "./components/BreweryBrandDetailScreens.jsx";
import { ImportDataScreen } from "./components/ImportDataScreen.jsx";
import { BibrosListScreen, BibroDetailScreen, BibroStatsScreen, BibroPulseScreen, AddBibroScreen, AdminUnlockScreen, MutualBibaxScreen } from "./components/BibrosScreens.jsx";
import { DeleteAccountScreen } from "./components/DeleteAccountScreen.jsx";
import {
  loadMyTastedDrinkIds,
  setDrinkTastedServer,
  loadBreweriesDirectory,
  loadBrandsDirectory,
  createBrewery,
  createPublicVenue,
  createDrink,
  createBrand,
  updateDrink,
  updatePublicVenue,
  updateBrewery,
  updateBrand,
  deleteBrewery,
  deleteBrand,
  deleteDrink,
  deletePublicVenue,
  uploadDrinkPhoto,
  proposeContribution,
  getSession,
  onAuthStateChange,
  loadMyProfile,
  lookupBibroCode,
  uploadMyAvatarPhoto,
  loadFeatureFlags,
  trackEvent,
  sendBibaxRequest,
  respondBibaxRequest,
  removeBibax,
  removeBibaxByCode,
  blockUser,
  loadMyBibax,
  loadPendingBibaxRequests,
  loadSentBibaxRequests,
  loadBibaxSuggestions,
  geocodeCityForProfile,
  loadRoomStories,
  loadPulseStories,
  emitEvent,
  updateMyProfile,
  signOut,
  loadContributionsForEntity,
  approveContribution,
  rejectContribution,
  countMyUnreadNotifications,
  subscribeToMyNotifications,
  loadClubMembers,
  linkSalonToClub,
  loadMutualBibaxList,
  recordVenueCheckIn,
  publishVenueCheckInToPulse,
  recordDrinkCheckIn,
  publishDrinkCheckInToPulse,
  loadDrinksByIds,
  sendPushNotification,
  countMyRatedDrinks,
  loadVenuesByIds,
  recordRoundOrders,
  markRoundPaid,
  recordPartialPayment,
  recordRoundTip,
  deleteRoundTip,
  deleteRoundOrders,
  deleteRoundOrdersByEvent,
  loadDrinkLinkedEntities,
  sendNotification,
} from "./data/sharedDirectories.js";
import { loadSalon, createSalon, saveSalon, subscribeToSalon, loadMyActiveSalons } from "./data/salons.js";
import { loadPredictGame, createPredictGame, savePredictGame, subscribeToPredictGame, generatePredictGameCode } from "./data/predictGames.js";
import { completeSpotifyAuth } from "./data/spotify.js";
import { randomCode, computeDrinkDiff, todayISO, normalizeEvent, nextId, resolveMenuItem, genderAgree } from "./utils.js";
import { BEER_TYPES, COUNTRY_ISO_CODES } from "./constants.js";

// ---------- Données personnelles (restent sur cet appareil, pas partagées) ----------
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // best-effort
  }
}

// Résout une fiche par identifiant, en suivant automatiquement un éventuel tombstone (fiche
// fusionnée dans une autre) vers la fiche réellement conservée — pour qu'un ancien favori, un
// check-in resté en local, ou tout simple lien vers l'ancien identifiant continue d'aboutir à
// la bonne fiche plutôt qu'à un écran vide ou obsolète.
function resolveEntity(directory, id) {
  let current = directory.find((e) => e.id === id);
  let hops = 0;
  while (current && current.status === "duplicate" && current.duplicateOfId && hops < 5) {
    current = directory.find((e) => e.id === current.duplicateOfId);
    hops++;
  }
  return current;
}

export default function App() {
  // Permet d'accéder directement à la suppression de compte via l'URL bibamus.app/delete-account
  // (exigence Google : accessible même sans ouvrir l'app normalement) — la connexion reste
  // requise, mais on atterrit directement sur cet écran plutôt que sur l'accueil.
  const [screen, setScreen] = useState(() => {
    if (window.location.pathname === "/delete-account") {
      // Nettoie immédiatement l'URL — sinon un simple rechargement de page renverrait sans
      // fin vers cet écran, l'app ne changeant jamais l'URL du navigateur par elle-même.
      window.history.replaceState(null, "", "/");
      return "deleteAccount";
    }
    return "home";
  });

  // Changer d'écran ne recharge jamais vraiment la page (tout reste dans le même conteneur
  // défilant) — sans ça, un écran hérite de la position de défilement laissée par le précédent,
  // au lieu de toujours démarrer en haut.
  const mainScrollRef = React.useRef(null);
  useEffect(() => {
    mainScrollRef.current?.scrollTo(0, 0);
  }, [screen]);

  // BibaMusic — retour de la connexion Spotify (OAuth PKCE). Le code d'autorisation arrive en
  // paramètre d'URL sur bibamus.app/spotify-callback ; on le conserve ici jusqu'à ce que la
  // session soit chargée, seul moment où on peut réellement finaliser l'échange.
  const [spotifyAuthCode, setSpotifyAuthCode] = useState(() => {
    if (window.location.pathname === "/spotify-callback") {
      const code = new URLSearchParams(window.location.search).get("code");
      window.history.replaceState(null, "", "/");
      return code;
    }
    return null;
  });

  // Répertoires partagés (Supabase)
  const [breweriesDirectory, setBreweriesDirectory] = useState([]);
  const [brandsDirectory, setBrandsDirectory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session (Supabase Auth) — l'app entière reste bloquée tant qu'aucun compte réel n'est
  // connecté. authChecked distingue "en cours de vérification" de "vérifié, pas connecté".
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [featureFlags, setFeatureFlags] = useState({});

  useEffect(() => {
    loadFeatureFlags().then(setFeatureFlags);
  }, []);

  // Références toujours à jour (contrairement à des variables normales, qui resteraient
  // figées à leur valeur du montage dans les gestionnaires installés une seule fois ci-dessous).
  const screenRef = React.useRef(screen);
  const bibroCodeRef = React.useRef(null);
  useEffect(() => {
    screenRef.current = screen;
  });
  useEffect(() => {
    trackEvent("screen_view", screen, bibroCodeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  useEffect(() => {
    installGlobalCrashReporting(() => ({ screen: screenRef.current, bibroCode: bibroCodeRef.current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Données personnelles — le profil (avec le code Bibax) vient désormais du serveur, lié au
  // compte, plutôt que d'être généré localement à chaque appareil. profileLoaded distingue "en
  // cours de récupération" de "récupéré" — évite d'afficher un instant l'écran d'onboarding
  // (nom vide) pendant le bref délai où le profil n'est pas encore arrivé du serveur.
  const [profile, setProfile] = useState({ name: "", avatarUrl: null, myBibroCode: null });

  // Recharge les feature flags une fois le pays connu — une éventuelle surcharge par pays ne
  // peut s'appliquer qu'à partir de ce moment.
  useEffect(() => {
    if (profile.country) loadFeatureFlags(profile.country).then(setFeatureFlags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.country]);
  useEffect(() => {
    bibroCodeRef.current = profile.myBibroCode;
  }, [profile.myBibroCode]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [spotifyConnectResult, setSpotifyConnectResult] = useState(null);
  const [viewedBibaxProfileCode, setViewedBibaxProfileCode] = useState(null);
  const [screenBeforeBibaxSuggestions, setScreenBeforeBibaxSuggestions] = useState("home");
  const [storyCreateContext, setStoryCreateContext] = useState(null); // {contextType, contextId, returnScreen}
  const [viewedStoryAuthor, setViewedStoryAuthor] = useState(null); // {authorId, authorName, authorAvatarUrl, stories}
  // Vraie mémoire du visionneur quand on quitte une Story pour voir la fiche d'un tag — permet
  // au vrai bouton "retour" de la fiche de rouvrir la story exacte plutôt que de renvoyer vers
  // l'écran précédent habituel.
  const [storyResumeState, setStoryResumeState] = useState(null); // {stories, index} | null
  const [pulseStoriesRefreshKey, setPulseStoriesRefreshKey] = useState(0);
  const [screenBeforeVenueDetail, setScreenBeforeVenueDetail] = useState("venueDirectory");
  const [screenBeforeBibaSolo, setScreenBeforeBibaSolo] = useState("sessionHub");
  const [viewedClubId, setViewedClubId] = useState(null);
  const [spotifyReturnContext, setSpotifyReturnContext] = useState({ screen: "connectSpotify", eventId: null });
  const [screenBeforeVenueDirectory, setScreenBeforeVenueDirectory] = useState("repertoireHub");
  const [screenBeforeSearch, setScreenBeforeSearch] = useState("home");
  const [screenBeforeDrinksDirectory, setScreenBeforeDrinksDirectory] = useState("repertoireHub");
  const [screenBeforeDrinkDetail, setScreenBeforeDrinkDetail] = useState("drinksDirectory");

  // Finalise la connexion Spotify dès que la session est prête — ne peut pas se faire plus tôt,
  // l'échange du code nécessite de savoir à quel compte Bibamus l'associer.
  useEffect(() => {
    if (!spotifyAuthCode || !profileLoaded || !session?.user?.id) return;
    const code = spotifyAuthCode;
    setSpotifyAuthCode(null);
    const returnScreen = localStorage.getItem("bibamus-spotify-return-screen");
    const returnEventId = localStorage.getItem("bibamus-spotify-return-event-id");
    localStorage.removeItem("bibamus-spotify-return-screen");
    localStorage.removeItem("bibamus-spotify-return-event-id");
    completeSpotifyAuth(code, session.user.id).then((result) => {
      setSpotifyConnectResult(result);
      if (returnEventId) setActiveEventId(returnEventId);
      if (returnScreen) setScreen(returnScreen);
      if (result.ok) {
        alert(`Compte Spotify connecté${result.displayName ? ` : ${result.displayName}` : ""} !`);
      } else if (result.error) {
        alert(result.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyAuthCode, profileLoaded, session?.user?.id]);

  const [events, setEvents] = useState(() => loadLocal("bibamus-events", []).map(normalizeEvent));
  const [bibros, setBibros] = useState(() => loadLocal("bibamus-bibros", []));
  const [bibroStatuses] = useState({});

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setAuthChecked(true);
    });
    const subscription = onAuthStateChange((s) => setSession(s));
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadMyProfile(session.user.id).then((serverProfile) => {
      if (serverProfile) setProfile((p) => ({ ...p, ...serverProfile }));
      setProfileLoaded(true);
    });
  }, [session]);

  // Rapatrie les BibaRoom actifs créés ou rejoints depuis un AUTRE appareil connecté au même
  // compte — sans ça, un salon créé sur le téléphone n'apparaîtrait jamais dans BibaLive sur
  // l'ordinateur, chaque appareil ne connaissant jusqu'ici que sa propre liste locale.
  useEffect(() => {
    if (!profileLoaded || !profile.myBibroCode) return;
    const fetchActiveSalons = () => {
      loadMyActiveSalons(profile.myBibroCode).then((salons) => {
        if (!salons || salons.length === 0) return;
        setEvents((prev) => {
          const knownSalonCodes = new Set(prev.filter((e) => e.salonCode).map((e) => e.salonCode));
          const missing = salons.filter((s) => s.salonCode && !knownSalonCodes.has(s.salonCode)).map(normalizeEvent);
          return missing.length > 0 ? [...prev, ...missing] : prev;
        });
      });
    };
    fetchActiveSalons();
    const interval = setInterval(fetchActiveSalons, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, profile.myBibroCode]);

  // Migration unique — les Bibax déjà ajoutés localement avant l'introduction du système
  // mutuel deviennent de vraies demandes envoyées à l'autre, qui n'a plus qu'à confirmer.
  // Ne tourne qu'une seule fois par compte (drapeau local), pour ne jamais renvoyer en boucle.
  useEffect(() => {
    if (!profileLoaded || !profile.myBibroCode) return;
    const migrationKey = `bibamus-bibax-migration-${profile.myBibroCode}`;
    if (loadLocal(migrationKey, false)) return;
    (async () => {
      for (const b of bibros) {
        await sendBibaxRequest(b.code);
      }
      saveLocal(migrationKey, true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, profile.myBibroCode]);

  // Synchronise les demandes mutuelles déjà confirmées (envoyées par vous, ou reçues et
  // acceptées) vers la liste locale — sans ça, un Bibax accepté par l'autre personne
  // n'apparaîtrait jamais tant qu'on ne l'aurait pas re-ajouté soi-même.
  useEffect(() => {
    if (!profileLoaded || !profile.myBibroCode) return;
    const syncBibax = () => {
      loadMyBibax().then((confirmed) => {
        setBibros((prev) => {
          const byCode = new Map(prev.map((b) => [b.code, b]));
          confirmed.forEach((c) => {
            if (!c.bibroCode) return;
            const existing = byCode.get(c.bibroCode);
            byCode.set(c.bibroCode, {
              ...existing,
              code: c.bibroCode,
              userId: c.userId,
              name: c.name,
              firstName: c.name,
              lastName: c.lastName || "",
              nickname: c.nickname || "",
              avatarUrl: c.avatarUrl || null,
              city: c.city || "",
              locality: c.locality || "",
              country: c.country || "",
              birthDate: c.birthDate || null,
              shareAge: c.shareAge,
              bio: c.bio || "",
              registeredAt: c.registeredAt || null,
              facebookUrl: c.facebookUrl || "",
              instagramUrl: c.instagramUrl || "",
              tiktokUrl: c.tiktokUrl || "",
              snapchatUrl: c.snapchatUrl || "",
              whatsappUrl: c.whatsappUrl || "",
              xUrl: c.xUrl || "",
              threadsUrl: c.threadsUrl || "",
              linkedinUrl: c.linkedinUrl || "",
              alias: existing?.alias || "",
              addedAt: existing?.addedAt || Date.now(),
            });
          });
          return Array.from(byCode.values());
        });
      });
    };
    syncBibax();
    const interval = setInterval(syncBibax, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, profile.myBibroCode]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [b, m] = await Promise.all([loadBreweriesDirectory(), loadBrandsDirectory()]);
      setBreweriesDirectory(b);
      setBrandsDirectory(m);
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => saveLocal("bibamus-profile", profile), [profile]);
  useEffect(() => {
    if (!session) return;
    updateMyProfile(session.user.id, {
      name: profile.name,
      lastName: profile.lastName,
      nickname: profile.nickname,
      email: profile.email,
      phone: profile.phone,
      birthDate: profile.birthDate,
      country: profile.country,
      city: profile.city,
      locality: profile.locality,
      bio: profile.bio,
      gender: profile.gender,
      genderCustom: profile.genderCustom,
      facebookUrl: profile.facebookUrl,
      instagramUrl: profile.instagramUrl,
      tiktokUrl: profile.tiktokUrl,
      snapchatUrl: profile.snapchatUrl,
      whatsappUrl: profile.whatsappUrl,
      xUrl: profile.xUrl,
      threadsUrl: profile.threadsUrl,
      linkedinUrl: profile.linkedinUrl,
      pinterestUrl: profile.pinterestUrl,
      twitchUrl: profile.twitchUrl,
      displayNameField: profile.displayNameField,
      sharePrenom: profile.sharePrenom,
      shareNom: profile.shareNom,
      shareSurnom: profile.shareSurnom,
      shareEmail: profile.shareEmail,
      shareBirthDate: profile.shareBirthDate,
      birthDateSharePrecision: profile.birthDateSharePrecision,
      shareAge: profile.shareAge,
      shareCountry: profile.shareCountry,
      shareRegion: profile.shareRegion,
      shareCity: profile.shareCity,
      shareBio: profile.shareBio,
      consentPersonalizedSuggestions: profile.consentPersonalizedSuggestions,
      consentUsageData: profile.consentUsageData,
      consentPartnerComms: profile.consentPartnerComms,
      consentSurveys: profile.consentSurveys,
      consentLocation: profile.consentLocation,
      salonDisplayMode: profile.salonDisplayMode,
      notifEnabled: profile.notifEnabled,
      notifMentions: profile.notifMentions,
      notifComments: profile.notifComments,
      notifNewBibax: profile.notifNewBibax,
      notifMessages: profile.notifMessages,
      notifInvitations: profile.notifInvitations,
      notifBibaxActivity: profile.notifBibaxActivity,
      notifNews: profile.notifNews,
      notifPartners: profile.notifPartners,
      notifEmailSummary: profile.notifEmailSummary,
      notifEmailSummaryFrequency: profile.notifEmailSummaryFrequency,
      notifEmailSummaryAddress: profile.notifEmailSummaryAddress,
      prefDistanceUnit: profile.prefDistanceUnit,
      prefTemperatureUnit: profile.prefTemperatureUnit,
      prefVolumeUnit: profile.prefVolumeUnit,
      prefWeightUnit: profile.prefWeightUnit,
      prefEnergyUnit: profile.prefEnergyUnit,
      storyDefaultShowLocationRoom: profile.storyDefaultShowLocationRoom,
      storyDefaultPublicRoom: profile.storyDefaultPublicRoom,
      storyDefaultShowLocationArena: profile.storyDefaultShowLocationArena,
      storyDefaultPublicArena: profile.storyDefaultPublicArena,
      storyDefaultPublic: profile.storyDefaultPublic,
      prefTimeFormat24h: profile.prefTimeFormat24h,
      prefVenueSort: profile.prefVenueSort,
      prefAutoplayPreviews: profile.prefAutoplayPreviews,
      prefVibrations: profile.prefVibrations,
      prefConfirmCheckin: profile.prefConfirmCheckin,
      storyDefaultShowLocation: profile.storyDefaultShowLocation,
      storyViewDurationSeconds: profile.storyViewDurationSeconds,
      storyDefaultSharePublic: profile.storyDefaultSharePublic,
      shareFacebook: profile.shareFacebook,
      shareInstagram: profile.shareInstagram,
      shareTiktok: profile.shareTiktok,
      shareSnapchat: profile.shareSnapchat,
      shareWhatsapp: profile.shareWhatsapp,
      shareX: profile.shareX,
      shareThreads: profile.shareThreads,
      shareLinkedin: profile.shareLinkedin,
      sharePinterest: profile.sharePinterest,
      shareTwitch: profile.shareTwitch,
      allowStoryTags: profile.allowStoryTags,
      allowProfileViaTag: profile.allowProfileViaTag,
      shareStatsOverview: profile.shareStatsOverview,
      shareStatsRecords: profile.shareStatsRecords,
      shareStatsDrinks: profile.shareStatsDrinks,
      shareStatsVenues: profile.shareStatsVenues,
      shareStatsSocial: profile.shareStatsSocial,
      avatarUrl: profile.avatarUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile.name,
    profile.lastName,
    profile.nickname,
    profile.email,
    profile.phone,
    profile.birthDate,
    profile.country,
    profile.city,
    profile.locality,
    profile.bio,
    profile.gender,
    profile.genderCustom,
    profile.facebookUrl,
    profile.instagramUrl,
    profile.tiktokUrl,
    profile.snapchatUrl,
    profile.whatsappUrl,
    profile.xUrl,
    profile.threadsUrl,
    profile.linkedinUrl,
    profile.pinterestUrl,
    profile.twitchUrl,
    profile.displayNameField,
    profile.sharePrenom,
    profile.shareNom,
    profile.shareSurnom,
    profile.shareEmail,
    profile.shareBirthDate,
    profile.birthDateSharePrecision,
    profile.shareAge,
    profile.shareCountry,
    profile.shareRegion,
    profile.shareCity,
    profile.shareBio,
    profile.consentPersonalizedSuggestions,
    profile.consentUsageData,
    profile.consentPartnerComms,
    profile.consentSurveys,
    profile.consentLocation,
    profile.salonDisplayMode,
    profile.notifEnabled,
    profile.notifMentions,
    profile.notifComments,
    profile.notifNewBibax,
    profile.notifMessages,
    profile.notifInvitations,
    profile.notifBibaxActivity,
    profile.notifNews,
    profile.notifPartners,
    profile.notifEmailSummary,
    profile.notifEmailSummaryFrequency,
    profile.notifEmailSummaryAddress,
    profile.prefDistanceUnit,
    profile.prefTemperatureUnit,
    profile.prefVolumeUnit,
    profile.prefWeightUnit,
    profile.prefEnergyUnit,
    profile.storyDefaultShowLocationRoom,
    profile.storyDefaultPublicRoom,
    profile.storyDefaultShowLocationArena,
    profile.storyDefaultPublicArena,
    profile.storyDefaultPublic,
    profile.prefTimeFormat24h,
    profile.prefVenueSort,
    profile.prefAutoplayPreviews,
    profile.prefVibrations,
    profile.prefConfirmCheckin,
    profile.storyDefaultShowLocation,
    profile.storyViewDurationSeconds,
    profile.storyDefaultSharePublic,
    profile.shareFacebook,
    profile.shareInstagram,
    profile.shareTiktok,
    profile.shareSnapchat,
    profile.shareWhatsapp,
    profile.shareX,
    profile.shareThreads,
    profile.shareLinkedin,
    profile.sharePinterest,
    profile.shareTwitch,
    profile.allowStoryTags,
    profile.allowProfileViaTag,
    profile.shareStatsOverview,
    profile.shareStatsRecords,
    profile.shareStatsDrinks,
    profile.shareStatsVenues,
    profile.shareStatsSocial,
    profile.avatarUrl,
  ]);

  // Géocode la ville déclarée pour permettre de vraies suggestions Bibax par proximité
  // géographique (ex. Waimes/Malmedy, deux villes voisines mais distinctes) plutôt qu'une
  // correspondance exacte sur le nom de ville. Ne regéocode pas si des coordonnées existent
  // déjà — seulement quand ville/pays changent réellement.
  useEffect(() => {
    if (!session || !profile.city || !profile.country) return;
    const isoCode = COUNTRY_ISO_CODES[profile.country];
    if (!isoCode) return;
    geocodeCityForProfile(profile.city, isoCode).then((coords) => {
      if (coords) setProfile((p) => ({ ...p, latitude: coords.lat, longitude: coords.lng }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile.city, profile.country]);

  useEffect(() => saveLocal("bibamus-events", events), [events]);
  useEffect(() => saveLocal("bibamus-bibros", bibros), [bibros]);

  const [activeCountry, setActiveCountry] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [activeBreweryCountry, setActiveBreweryCountry] = useState(null);
  const [activeBrandCountry, setActiveBrandCountry] = useState(null);

  const [activeEventId, setActiveEventId] = useState(null);
  const [activePredictGame, setActivePredictGame] = useState(null);
  const [screenBeforePredict, setScreenBeforePredict] = useState("home");
  const [bibaPlayLinkedSalonCode, setBibaPlayLinkedSalonCode] = useState(null);
  const [draftFriends, setDraftFriends] = useState([]);
  const [draftOrders, setDraftOrders] = useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);

  const currentEvent = events.find((e) => e.id === activeEventId) || null;

  // Synchronisation en direct : dès qu'un autre Bibax modifie ce salon (nouvelle tournée, quelqu'un
  // qui rejoint...), on le voit apparaître ici automatiquement, sans devoir rafraîchir.
  React.useEffect(() => {
    if (!currentEvent || !currentEvent.salonCode) return;
    const unsubscribe = subscribeToSalon(currentEvent.salonCode, (updatedData) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== currentEvent.id) return e;
          // Postgres garantit déjà l'ordre réel des événements — pas besoin de revérifier avec
          // une horloge client, qui compare les horloges de DEUX appareils physiques différents
          // (celui qui écrit, celui qui reçoit) : si elles ne sont pas parfaitement synchronisées
          // (vraisemblable entre deux vrais téléphones), une mise à jour légitime peut être
          // rejetée silencieusement, sans aucune erreur visible — c'était probablement la vraie
          // cause d'un départ qui ne se propageait jamais chez l'autre participant.
          const merged = { ...e, ...updatedData, participants: updatedData.participants || e.participants || [] };
          return normalizeEvent(merged);
        })
      );
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.salonCode]);

  // Même principe pour une partie BibaPlay en cours — les autres joueurs (et les autres
  // participants du salon, si la partie y est liée) voient les changements en direct.
  React.useEffect(() => {
    if (!activePredictGame?.code) return;
    const unsubscribe = subscribeToPredictGame(activePredictGame.code, (updatedData) => {
      setActivePredictGame((prev) => (prev && prev.code === updatedData.code ? updatedData : prev));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePredictGame?.code]);

  // Réconciliation réactive : si la partie Predict est liée à ce salon et encore en attente,
  // quiconque rejoint le salon APRÈS que la partie ait été créée doit quand même s'y retrouver
  // automatiquement — pas seulement celui qui retouche le bouton BibaPlay. Sans ça, quelqu'un
  // qui rejoint le salon une fois la partie déjà créée resterait invisible pour toujours.
  // Seuls les vrais participants (event.participants, une vraie session par personne) comptent
  // ici — un invité sans compte (event.knownFriends) n'a justement pas de téléphone à lui pour
  // jouer, ça n'aurait aucun sens de l'y ajouter.
  const salonParticipantCodes = (currentEvent?.participants || []).map((p) => p.code).join(",");
  React.useEffect(() => {
    if (!activePredictGame || activePredictGame.status !== "waiting" || !activePredictGame.linkedSalonCode) return;
    if (!currentEvent || currentEvent.salonCode !== activePredictGame.linkedSalonCode) return;
    const existingCodes = new Set((activePredictGame.participants || []).map((p) => p.code));
    const missing = (currentEvent.participants || []).filter((p) => !existingCodes.has(p.code));
    if (missing.length === 0) return;
    (async () => {
      const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
      const freshExisting = new Set((fresh.participants || []).map((p) => p.code));
      const stillMissing = missing.filter((p) => !freshExisting.has(p.code)).map((p) => ({ code: p.code, name: p.name, joinedAt: Date.now() }));
      if (stillMissing.length === 0) return;
      const updated = { ...fresh, participants: [...(fresh.participants || []), ...stillMissing] };
      await savePredictGame(activePredictGame.code, updated);
      setActivePredictGame((prev) => (prev && prev.code === updated.code ? updated : prev));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonParticipantCodes, activePredictGame?.code, activePredictGame?.status]);

  const startNewRound = () => {
    const selfEntry = { id: "self", name: profile.name, isSelf: true, code: profile.myBibroCode };
    const rounds = currentEvent?.rounds || [];
    const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const myNameLower = (profile.name || "").trim().toLowerCase();
    // Filet supplémentaire : exclut toute entrée correspondant à mon propre nom ou code, même
    // si elle n'était pas correctement marquée "isSelf" dans une tournée passée (corruption
    // historique désormais corrigée à la source, mais qui pouvait déjà s'être propagée ici).
    const lastOthers = lastRound
      ? lastRound.friends
          .filter((f) => !f.isSelf && (f.name || "").trim().toLowerCase() !== myNameLower && f.code !== profile.myBibroCode)
          .map((f) => ({ id: nextId(), name: f.name, code: f.code || null }))
      : [];

    // Also pre-fill with any known participants not already covered by self/last round — easier
    // to remove someone skipping this particular round than to re-add everyone who's actually there.
    // Two sources of "known people": friends typed in manually at creation (knownFriends, names
    // only) and Bibax who joined the shared salon via its code (event.participants, with codes).
    const alreadyNamed = new Set([myNameLower, ...lastOthers.map((f) => (f.name || "").trim().toLowerCase())]);
    const alreadyCoded = new Set([profile.myBibroCode, ...lastOthers.map((f) => f.code).filter(Boolean)]);

    const knownExtras = (currentEvent?.knownFriends || [])
      .filter((n) => !alreadyNamed.has((n || "").trim().toLowerCase()))
      .map((n) => ({ id: nextId(), name: n, code: null }));

    const salonExtras = (currentEvent?.participants || [])
      .filter((p) => !alreadyCoded.has(p.code) && !alreadyNamed.has((p.name || "").trim().toLowerCase()))
      .map((p) => ({ id: nextId(), name: p.name, code: p.code || null }));

    setDraftFriends([selfEntry, ...lastOthers, ...knownExtras, ...salonExtras]);
    setDraftOrders([]);
    setActiveFriendId("self");
    setScreen("roundCompose");
  };

  const finishRound = (finalAmount, settledDirectly, buyerName, tip, offeredBy) => {
    const round = {
      id: `round-${Date.now()}`,
      friends: draftFriends,
      orders: draftOrders,
      total: finalAmount,
      settledDirectly,
      // Suivi du montant réellement payé sur cette tournée — jamais tout-ou-rien : une tournée
      // sur la note peut être soldée progressivement (ex. un paiement partiel en quittant le
      // lieu), pas seulement marquée payée d'un coup.
      amountPaid: settledDirectly !== false ? finalAmount : 0,
      paidByPot: currentEvent?.mode === "cagnotte" && settledDirectly,
      createdInMode: currentEvent?.mode,
      buyerName,
      tip,
      offeredBy,
      createdAt: Date.now(),
    };
    const otherFriends = draftFriends.filter((f) => !f.isSelf && (f.name || "").trim().toLowerCase() !== (profile.name || "").trim().toLowerCase());
    const selfOrders = draftOrders
      .filter((o) => o.friendId === "self")
      .map((o) => ({ id: nextId(), drinkId: o.drinkId, timestamp: Date.now(), roundId: round.id }));
    updateEvent(activeEventId, (e) => ({
      ...e,
      rounds: [...e.rounds, round],
      knownFriends: Array.from(new Set([...(e.knownFriends || []), ...otherFriends.map((f) => f.name)])),
      personalOrders: [...(e.personalOrders || []), ...selfOrders],
      // Une nouvelle dette qui démarre rend caduque toute "note finale" encodée précédemment —
      // sinon ce montant, qui concernait un paiement déjà réglé, resterait affiché comme si il
      // concernait cette nouvelle note en cours.
      ...(settledDirectly === false && e.finalTotal != null ? { finalTotal: null, tip: 0 } : {}),
    }));

    // Fondation statistiques — une vraie ligne par produit commandé, à côté du JSON de
    // l'événement ci-dessus (inchangé). Chaque participant est résolu vers son vrai compte
    // Bibax quand il en a un (via son code), sinon juste son prénom (invité sans compte).
    // drink_id doit être le vrai identifiant du catalogue (drinks_directory), jamais l'id local
    // du menu de cet événement (régénéré à chaque création d'événement, donc toujours absent du
    // catalogue) — sinon chaque insertion échoue silencieusement sur la contrainte de clé
    // étrangère, et round_orders reste vide malgré des tournées bien fermées.
    // "@home"/"@event" sont de vraies lignes dans public_venues (voir bibamus-schema-home-event-
    // venues-and-tips.sql) — on les transmet donc littéralement, ce qui les fait apparaître dans
    // les mêmes stats de lieux que BibaSolo, plutôt que de les réduire à null comme avant.
    const realVenueId = currentEvent?.isHome ? "@home" : currentEvent?.venueId === "@event" ? "@event" : currentEvent?.venueId || null;
    const ordersForLog = draftOrders.map((o) => {
      const friend = draftFriends.find((f) => f.id === o.friendId);
      const drink = (currentEvent?.menu || []).find((d) => d.id === o.drinkId);
      return {
        bibro_code: friend?.code || null,
        guest_name: friend?.code ? null : friend?.name || null,
        drink_id: drink?.fromDirectory && drink?.sourceDrinkId ? drink.sourceDrinkId : null,
        unit_price: drink?.price ?? null,
        unit_volume_cl: drink?.volumeCl ?? null,
        unit_kcal_per_100ml: drink?.kcalPer100ml ?? null,
      };
    });
    recordRoundOrders(ordersForLog, { venueId: realVenueId, eventId: activeEventId, roundId: round.id, currency: currentEvent?.currency, paid: round.settledDirectly !== false });

    // Pourboire — n'existe que sur une tournée déjà réglée directement (tip vaut toujours 0
    // sinon, imposé côté écran de fermeture de tournée), toujours attribué à celui qui paie.
    if (tip > 0 && currentEvent?.currency === "euro") {
      const buyer = draftFriends.find((f) => f.name === buyerName);
      if (buyer?.code) recordRoundTip(round.id, realVenueId, activeEventId, buyer.code, tip);
    }

    setScreen("eventDashboard");
  };

  const createEvent = async (name, currency, date, jetonUnitValue, venueId, mode, participants, clubId) => {
    const isSalon = screen === "newSalonEvent";
    const isHome = venueId === "@home";
    const isEventPlace = venueId === "@event";
    const venue = venueId && !isHome && !isEventPlace ? (await loadVenuesByIds([venueId]))[0] || null : null;
    const venueDrinkIds = [...new Set((venue?.menu || []).filter((d) => d.fromDirectory && d.sourceDrinkId).map((d) => d.sourceDrinkId))];
    const venueDrinks = venueDrinkIds.length > 0 ? await loadDrinksByIds(venueDrinkIds) : [];
    const menu =
      venue && venue.menu && venue.menu.length
        ? venue.menu.map((d) => ({ ...resolveMenuItem(d, venueDrinks), id: `local-${Date.now()}-${Math.random()}` }))
        : [];

    const newEvent = {
      id: `local-${Date.now()}`,
      name,
      currency,
      date,
      jetonUnitValue: jetonUnitValue || 0,
      mode,
      pot: mode === "cagnotte" ? { contributions: [] } : null,
      splitParticipants: mode === "addition" ? [] : null,
      menu,
      rounds: [],
      knownFriends: participants || [],
      personalOrders: [],
      ticketPurchases: [],
      finalTotal: null,
      venueId: isHome ? null : venueId || null,
      isHome,
      salonCode: null,
      closed: false,
      tip: 0,
      closedAt: null,
      createdAt: Date.now(),
      bibaBob: {},
      paused: false,
      participants: [],
      playlist: [],
      spotifyPlaylistId: null,
      spotifyPlaylistUrl: null,
      nowPlayingUri: null,
      nowPlayingTrack: null,
      playedUris: [],
      djCode: null,
    };

    if (isSalon) {
      const code = randomCode(6);
      newEvent.salonCode = code;
      newEvent.participants = [{ code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() }];
      if (clubId) {
        const clubMembers = await loadClubMembers(clubId);
        const memberNames = clubMembers.filter((m) => m.userId !== session.user.id).map((m) => m.name).filter(Boolean);
        newEvent.knownFriends = Array.from(new Set([...(newEvent.knownFriends || []), ...memberNames]));
      }
      await createSalon(code, newEvent);
      if (clubId) await linkSalonToClub(clubId, code, session.user.id);
      emitEvent(EVENT_TYPES.BIBAROOM_CREATED, { actorBibroCode: profile.myBibroCode, entityType: "salon", entityId: newEvent.id, payload: { salonCode: code } });
    }

    setEvents((prev) => [...prev, normalizeEvent(newEvent)]);
    setActiveEventId(newEvent.id);
    setScreen("eventDashboard");
  };

  const joinSalon = async (code) => {
    const salonData = await loadSalon(code);
    if (!salonData) {
      throw new Error("Salon introuvable — vérifie le code.");
    }
    const normalized = normalizeEvent(salonData);
    const participants = normalized.participants || [];
    const alreadyIn = participants.some((p) => p.code === profile.myBibroCode);
    const withMe = alreadyIn
      ? normalized
      : {
          ...normalized,
          participants: [...participants, { code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() }],
          // Retire l'invitation en attente à mon nom, si j'en avais bien reçu une pour rejoindre
          // — sinon je resterais listé comme "Invité" alors que je viens de rejoindre pour de bon.
          pendingBibaxInvites: (normalized.pendingBibaxInvites || []).filter((p) => p.userId !== session.user.id),
          systemNotices: [...(normalized.systemNotices || []), { id: `notice-${Date.now()}`, type: "joined", name: profile.name, at: Date.now() }].slice(-10),
        };
    if (!alreadyIn) {
      await saveSalon(code, withMe);
      emitEvent(EVENT_TYPES.BIBAROOM_JOINED, { actorBibroCode: profile.myBibroCode, entityType: "salon", entityId: withMe.id, payload: { salonCode: code } });
    }
    setEvents((prev) => (prev.some((e) => e.salonCode === code) ? prev : [...prev, withMe]));
    setActiveEventId(withMe.id);
    setScreen("eventDashboard");
  };

  // Quitter un salon partagé — il faut d'abord se retirer soi-même de la vraie liste de
  // participants côté serveur (sinon le salon reste actif à mon nom là-bas, et réapparaît en
  // double dans BibaLive au prochain chargement, quoi qu'on fasse localement), puis retirer la
  // copie locale de "events" (pas la transformer en événement solo vide — la faire disparaître
  // complètement, exactement comme demandé).
  const leaveSalonFn = async (eventId, salonCode, noticeType = "left") => {
    const salonData = await loadSalon(salonCode);
    if (salonData) {
      const notice = { id: `notice-${Date.now()}`, type: noticeType, name: profile.name, gender: profile.gender, at: Date.now() };
      const updated = {
        ...salonData,
        participants: (salonData.participants || []).filter((p) => p.code !== profile.myBibroCode),
        systemNotices: [...(salonData.systemNotices || []), notice].slice(-10),
        updatedAt: Date.now(),
      };
      await saveSalon(salonCode, updated);
      if (noticeType === "safe") {
        const others = (salonData.participants || []).filter((p) => p.code !== profile.myBibroCode);
        if (others.length > 0) sendPushNotification(others.map((p) => p.code), "BibaRoom", `${profile.name} signale être bien ${genderAgree(profile.gender, "arrivé", "arrivée")} à destination.`);
      }
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setActiveEventId(null);
    setScreen("home");
  };

  // Depuis le fil de notifications, en réponse à une invitation à rejoindre un salon reçue
  // via "Participants" — "Rejoindre" fait exactement ce que ferait taper le code manuellement ;
  // "Décliner" retire seulement l'invitation en attente côté salon (l'hôte peut réinviter plus
  // tard s'il le souhaite).
  const respondSalonInviteFn = async (salonCode, accept) => {
    if (accept) {
      await joinSalon(salonCode);
      return;
    }
    const salonData = await loadSalon(salonCode);
    if (!salonData) return;
    const updated = { ...salonData, pendingBibaxInvites: (salonData.pendingBibaxInvites || []).filter((p) => p.userId !== session.user.id), updatedAt: Date.now() };
    await saveSalon(salonCode, updated);
  };

  // Jalon 1 BibaPlay — pas encore de vraie logique de jeu, juste créer/rejoindre/démarrer.
  // linkedSalonCode est fourni quand la partie est lancée depuis un salon déjà ouvert ; sinon
  // elle est indépendante (créée depuis la tuile Home) et se rejoint avec son propre code.
  const createPredictGameFn = async (linkedSalonCode, testMode, initialParticipants) => {
    const code = await generatePredictGameCode();
    const gameData = {
      code,
      linkedSalonCode: linkedSalonCode || null,
      hostBibroCode: profile.myBibroCode,
      status: "waiting",
      testMode: !!testMode,
      participants: initialParticipants || [
        { code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() },
        ...(testMode ? [{ code: "__test_bot__", name: "Bibax test 🤖", joinedAt: Date.now(), isTestBot: true }] : []),
      ],
      createdAt: Date.now(),
    };
    await createPredictGame(code, gameData, linkedSalonCode);
    setActivePredictGame(gameData);
    setScreenBeforePredict(screen);
    setScreen("predictGame");
    return code;
  };

  const joinPredictGameFn = async (code) => {
    const gameData = await loadPredictGame(code);
    if (!gameData) throw new Error("Partie introuvable — vérifie le code.");
    const participants = gameData.participants || [];
    const alreadyIn = participants.some((p) => p.code === profile.myBibroCode);
    const withMe = alreadyIn
      ? gameData
      : { ...gameData, participants: [...participants, { code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() }] };
    if (!alreadyIn) await savePredictGame(code, withMe);
    setActivePredictGame(withMe);
    setScreenBeforePredict(screen);
    setScreen("predictGame");
  };

  const startPredictGameFn = async (teamA, teamB) => {
    if (!activePredictGame) return;
    const updated = { ...activePredictGame, status: "active", startedAt: Date.now(), teamA: (teamA || "").trim() || null, teamB: (teamB || "").trim() || null };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(updated);
  };

  // L'hôte lance un nouveau pronostic — 15 secondes pour répondre, un chrono partagé (lockAt)
  // que tous les téléphones lisent de la même donnée, plutôt que de compter chacun de leur côté.
  const launchPredictionFn = async (template) => {
    if (!activePredictGame) return;
    const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
    const updated = {
      ...fresh,
      activePrediction: {
        id: `pred_${Date.now()}`,
        title: template.title,
        choices: template.choices,
        basePoints: template.basePoints,
        lockAt: Date.now() + ANSWER_DURATION_SECONDS * 1000,
        answers: [],
        correctChoiceId: null,
      },
    };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(updated);
  };

  // Répond au pronostic en cours — repart de l'état partagé le plus frais possible avant
  // d'écrire, pour ne pas écraser la réponse d'un ami soumise au même instant (le blob est
  // partagé, pas une ligne par réponse) ; même précaution que la fusion des participants
  // d'un salon.
  const submitPredictAnswerFn = async (choiceId, userCode) => {
    if (!activePredictGame?.activePrediction) return;
    const actorCode = userCode || profile.myBibroCode;
    const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
    if (!fresh.activePrediction || fresh.activePrediction.correctChoiceId) return;
    const otherAnswers = (fresh.activePrediction.answers || []).filter((a) => a.userCode !== actorCode);
    const updated = {
      ...fresh,
      activePrediction: {
        ...fresh.activePrediction,
        answers: [...otherAnswers, { userCode: actorCode, choiceId, submittedAt: Date.now() }],
      },
    };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(updated);
  };

  // L'hôte valide la bonne réponse — distribue les points à qui avait trouvé, puis range le
  // pronostic dans l'historique (le classement et le feedback s'appuient dessus).
  const resolvePredictionFn = async (correctChoiceId) => {
    if (!activePredictGame?.activePrediction) return;
    const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
    const prediction = fresh.activePrediction;
    if (!prediction || prediction.correctChoiceId) return;
    const answers = prediction.answers || [];
    const participants = (fresh.participants || []).map((p) => {
      const answer = answers.find((a) => a.userCode === p.code);
      const correct = answer && answer.choiceId === correctChoiceId;
      return correct ? { ...p, score: (p.score || 0) + prediction.basePoints } : p;
    });
    const resolved = { ...prediction, correctChoiceId, resolvedAt: Date.now() };
    const updated = { ...fresh, participants, activePrediction: null, history: [...(fresh.history || []), resolved] };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(updated);
  };

  // L'hôte retire un participant qui ne souhaite pas jouer (uniquement pendant l'attente,
  // avant le début de la partie).
  const removePredictParticipantFn = async (participantCode) => {
    if (!activePredictGame) return;
    const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
    const updated = { ...fresh, participants: (fresh.participants || []).filter((p) => p.code !== participantCode) };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(updated);
  };

  // Un participant se retire lui-même s'il ne veut pas jouer (utile car, venant d'un salon,
  // tout le monde y est ajouté automatiquement sans l'avoir demandé).
  const leavePredictGameFn = async () => {
    if (!activePredictGame) return;
    const fresh = (await loadPredictGame(activePredictGame.code)) || activePredictGame;
    const updated = { ...fresh, participants: (fresh.participants || []).filter((p) => p.code !== profile.myBibroCode) };
    await savePredictGame(activePredictGame.code, updated);
    setActivePredictGame(null);
    setScreen(screenBeforePredict);
  };

  // Depuis un salon déjà ouvert : tous les participants déjà enregistrés du salon (de vrais
  // comptes Bibax, pas les invités sans compte) se retrouvent directement dans la partie —
  // sans code ni QR à scanner, vu qu'ils sont déjà réunis dans le même salon. Rejoint la
  // partie déjà en cours si quelqu'un d'autre l'a lancée (en y ajoutant qui manquerait encore
  // à l'appel), sinon en crée une nouvelle liée à ce salon.
  const goToBibaPlayFromSalonFn = async () => {
    if (!currentEvent) return;
    const salonParticipants = (currentEvent.participants || []).map((p) => ({ code: p.code, name: p.name, joinedAt: Date.now() }));
    if (currentEvent.activeBibaPlayCode) {
      const fresh = await loadPredictGame(currentEvent.activeBibaPlayCode);
      if (fresh) {
        const existingCodes = new Set((fresh.participants || []).map((p) => p.code));
        const missing = salonParticipants.filter((p) => !existingCodes.has(p.code));
        const updated = missing.length > 0 ? { ...fresh, participants: [...fresh.participants, ...missing] } : fresh;
        if (missing.length > 0) await savePredictGame(currentEvent.activeBibaPlayCode, updated);
        setActivePredictGame(updated);
        setScreenBeforePredict(screen);
        setScreen("predictGame");
        return;
      }
    }
    const code = await createPredictGameFn(currentEvent.salonCode, false, salonParticipants);
    updateEvent(currentEvent.id, (e) => ({ ...e, activeBibaPlayCode: code }));
  };

  // Met à jour un événement localement, et — si c'est un salon partagé — répercute aussi le
  // changement dans Supabase pour que les autres Bibax connectés le voient.
  const updateEvent = (id, updater) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...updater(e), updatedAt: Date.now() };
        if (updated.salonCode) saveSalon(updated.salonCode, updated);
        return updated;
      })
    );
  };

  const registerBrand = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return trimmed;
    const normalized = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const existing = brandsDirectory.find(
      (b) => (b.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") === normalized
    );
    if (existing) return existing.name;
    const newBrand = { id: `local-${Date.now()}`, name: trimmed, status: "to_process" };
    setBrandsDirectory((prev) => [...prev, newBrand]);
    emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "brand", entityId: newBrand.id });
    createBrand(newBrand).then((created) => {
      if (created) setBrandsDirectory((prev) => prev.map((b) => (b.id === newBrand.id ? created : b)));
    });
    return trimmed;
  };

  const submitVenue = async (venueData) => {
    const created = await createPublicVenue({
      id: `venue-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...venueData,
      status: "to_process",
      menu: venueData.menu || [],
      likes: [],
    });
    if (created) {
      emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: created.id });
    } else {
      alert("La création de l'établissement a échoué — merci de réessayer ou de contacter le support si le problème persiste.");
      return;
    }
    setScreen("venueDirectory");
  };

  const uploadPhotoForDrink = async (drinkId, file) => {
    const result = await uploadDrinkPhoto(drinkId, file);
    if (result.error) {
      alert(result.error);
      return;
    }
    updateDrink(drinkId, { photoUrl: result.url });
    setViewedDrink((prev) => (prev && prev.id === drinkId ? { ...prev, photoUrl: result.url } : prev));
  };

  const deletePhotoForDrink = (drinkId) => {
    updateDrink(drinkId, { photoUrl: null });
    setViewedDrink((prev) => (prev && prev.id === drinkId ? { ...prev, photoUrl: null } : prev));
  };

  const submitDrink = async (drinkData) => {
    const created = await createDrink({ id: `drink-${Date.now()}-${Math.floor(Math.random() * 10000)}`, ...drinkData, status: "to_process" });
    if (created) {
      emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: created.id });
    } else {
      alert("La création du produit a échoué — merci de réessayer ou de contacter le support si le problème persiste.");
      return;
    }
    setScreen("drinksDirectory");
  };

  const [viewedVenueId, setViewedVenueId] = useState(null);
  // Charge le lieu consulté (avec résolution de doublon, comme le faisait resolveEntity sur le
  // répertoire complet) — même principe que viewedDrink.
  const [viewedVenue, setViewedVenue] = useState(null);
  useEffect(() => {
    if (!viewedVenueId) {
      setViewedVenue(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let current = (await loadVenuesByIds([viewedVenueId]))[0] || null;
      let hops = 0;
      while (current && current.status === "duplicate" && current.duplicateOfId && hops < 5) {
        current = (await loadVenuesByIds([current.duplicateOfId]))[0] || null;
        hops++;
      }
      if (!cancelled) setViewedVenue(current || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewedVenueId]);
  // Cache ciblé — un lieu n'y entre que s'il est vraiment référencé quelque part (fiche
  // consultée, événements en cours), jamais le répertoire complet.
  const [venuesById, setVenuesById] = useState({});
  useEffect(() => {
    const ids = new Set();
    if (viewedVenueId) ids.add(viewedVenueId);
    events.forEach((ev) => ev.venueId && ids.add(ev.venueId));
    const missing = [...ids].filter((id) => !venuesById[id]);
    if (missing.length === 0) return;
    loadVenuesByIds(missing).then((results) =>
      setVenuesById((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v])) }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedVenueId, events]);

  // Mes favoris — ensemble toujours restreint, chargé séparément du cache ci-dessus.
  const [myFavoriteVenues, setMyFavoriteVenues] = useState([]);
  const [viewedMenuCategory, setViewedMenuCategory] = useState(null);
  const [viewedDrinkId, setViewedDrinkId] = useState(null);
  const [myRatedCount, setMyRatedCount] = useState(0);
  useEffect(() => {
    if (screen === "myProducts" && profile.myBibroCode) {
      countMyRatedDrinks(profile.myBibroCode).then(setMyRatedCount);
    }
  }, [screen, profile.myBibroCode]);
  // Charge uniquement le produit consulté (avec résolution de doublon, comme le faisait
  // resolveEntity sur le répertoire complet) — jamais besoin du répertoire entier pour ça.
  const [viewedDrink, setViewedDrink] = useState(null);
  useEffect(() => {
    if (!viewedDrinkId) {
      setViewedDrink(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let current = (await loadDrinksByIds([viewedDrinkId]))[0] || null;
      let hops = 0;
      while (current && current.status === "duplicate" && current.duplicateOfId && hops < 5) {
        current = (await loadDrinksByIds([current.duplicateOfId]))[0] || null;
        hops++;
      }
      if (!cancelled) setViewedDrink(current || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewedDrinkId]);
  const [viewedHistoryEventId, setViewedHistoryEventId] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanMode, setScanMode] = useState("direct"); // "direct" | "linked" — "linked" affiche produit+marque+producteur au lieu d'aller directement à la fiche
  const [linkedScanResults, setLinkedScanResults] = useState(null);
  const [searchInitialTab, setSearchInitialTab] = useState("lieux");
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [focusPulseEntry, setFocusPulseEntry] = useState(null);
  useEffect(() => {
    if (screen !== "bibaPulse" && focusPulseEntry) setFocusPulseEntry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  useEffect(() => {
    if (!session?.user?.id) return;
    countMyUnreadNotifications().then(setUnreadNotificationsCount);
    const unsubscribe = subscribeToMyNotifications(session.user.id, () => {
      setUnreadNotificationsCount((n) => n + 1);
    });
    return unsubscribe;
  }, [session?.user?.id]);
  const prevScreenRef = React.useRef(screen);
  useEffect(() => {
    if (prevScreenRef.current === "notificationsFeed" && screen !== "notificationsFeed" && session?.user?.id) {
      countMyUnreadNotifications().then(setUnreadNotificationsCount);
    }
    prevScreenRef.current = screen;
  }, [screen, session?.user?.id]);
  const [checkIns] = useState([]);
  const [checkedInVenueId, setCheckedInVenueId] = useState(null);
  const [alcoholFreeDays, setAlcoholFreeDays] = useState(() => loadLocal("bibamus-alcohol-free-days", []));

  useEffect(() => saveLocal("bibamus-alcohol-free-days", alcoholFreeDays), [alcoholFreeDays]);

  const toggleAlcoholFreeDay = (dateKey) => {
    setAlcoholFreeDays((prev) => (prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey]));
  };

  const [tastedDrinkIds, setTastedDrinkIds] = useState([]);
  const [wishlistDrinkIds, setWishlistDrinkIds] = useState(() => loadLocal("bibamus-wishlist-drinks", []));

  useEffect(() => {
    if (!session) return;
    loadMyTastedDrinkIds().then(setTastedDrinkIds);
  }, [session]);
  useEffect(() => saveLocal("bibamus-wishlist-drinks", wishlistDrinkIds), [wishlistDrinkIds]);

  const toggleTastedDrink = (id) => {
    setTastedDrinkIds((prev) => {
      const alreadyTasted = prev.includes(id);
      setDrinkTastedServer(id, !alreadyTasted);
      if (!alreadyTasted) emitEvent(EVENT_TYPES.DRINK_CHECKED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: id });
      return alreadyTasted ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };
  const toggleWishlistDrink = (id) => setWishlistDrinkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Note et modes goûtés : partagés sur la fiche du produit elle-même (comme dans le prototype
  // Claude) — chaque Bibax y ajoute sa propre entrée, indexée par son code personnel.
  const rateDrink = (drinkId, value) => {
    setViewedDrink((prev) =>
      prev && prev.id === drinkId
        ? {
            ...prev,
            ratings: { ...(prev.ratings || {}), [profile.myBibroCode]: value },
            ratingDates: { ...(prev.ratingDates || {}), [profile.myBibroCode]: Date.now() },
          }
        : prev
    );
    const drink = viewedDrink?.id === drinkId ? viewedDrink : null;
    if (drink) {
      updateDrink(drinkId, {
        ratings: { ...(drink.ratings || {}), [profile.myBibroCode]: value },
        ratingDates: { ...(drink.ratingDates || {}), [profile.myBibroCode]: Date.now() },
      });
      // Noter une bière n'a de sens que si on l'a goûtée — les deux restent synchronisés plutôt
      // que de risquer une bière notée mais jamais marquée dégustée, ou encore sur la liste d'envie.
      if (BEER_TYPES.includes(drink.type) && !tastedDrinkIds.includes(drinkId)) {
        toggleTastedDrink(drinkId);
      }
    }
  };

  const unrateDrink = (drinkId) => {
    setViewedDrink((prev) => {
      if (!prev || prev.id !== drinkId) return prev;
      const ratings = { ...(prev.ratings || {}) };
      const ratingDates = { ...(prev.ratingDates || {}) };
      const ratedServingModes = { ...(prev.ratedServingModes || {}) };
      delete ratings[profile.myBibroCode];
      delete ratingDates[profile.myBibroCode];
      delete ratedServingModes[profile.myBibroCode];
      return { ...prev, ratings, ratingDates, ratedServingModes };
    });
    const drink = viewedDrink?.id === drinkId ? viewedDrink : null;
    if (drink) {
      const ratings = { ...(drink.ratings || {}) };
      const ratingDates = { ...(drink.ratingDates || {}) };
      const ratedServingModes = { ...(drink.ratedServingModes || {}) };
      delete ratings[profile.myBibroCode];
      delete ratingDates[profile.myBibroCode];
      delete ratedServingModes[profile.myBibroCode];
      updateDrink(drinkId, { ratings, ratingDates, ratedServingModes });
    }
  };

  // Même chose que rateDrink/unrateDrink, mais prenant le vrai produit directement en
  // paramètre plutôt que de compter sur viewedDrink — utilisé par Drink Check, qui note
  // depuis un salon sans être passé par la fiche détail du produit.
  const rateDrinkStandalone = (drinkId, value, drink) => {
    updateDrink(drinkId, {
      ratings: { ...(drink.ratings || {}), [profile.myBibroCode]: value },
      ratingDates: { ...(drink.ratingDates || {}), [profile.myBibroCode]: Date.now() },
    });
    if (BEER_TYPES.includes(drink.type) && !tastedDrinkIds.includes(drinkId)) {
      toggleTastedDrink(drinkId);
    }
  };

  const unrateDrinkStandalone = (drinkId, drink) => {
    const ratings = { ...(drink.ratings || {}) };
    const ratingDates = { ...(drink.ratingDates || {}) };
    const ratedServingModes = { ...(drink.ratedServingModes || {}) };
    delete ratings[profile.myBibroCode];
    delete ratingDates[profile.myBibroCode];
    delete ratedServingModes[profile.myBibroCode];
    updateDrink(drinkId, { ratings, ratingDates, ratedServingModes });
  };

  const toggleTastedServingMode = (drinkId, mode) => {
    const drink = viewedDrink?.id === drinkId ? viewedDrink : null;
    if (!drink) return;
    const current = (drink.ratedServingModes && drink.ratedServingModes[profile.myBibroCode]) || [];
    const next = current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode];
    const ratedServingModes = { ...(drink.ratedServingModes || {}), [profile.myBibroCode]: next };
    setViewedDrink((prev) => (prev && prev.id === drinkId ? { ...prev, ratedServingModes } : prev));
    updateDrink(drinkId, { ratedServingModes });
  };

  const [favoriteVenueIds, setFavoriteVenueIds] = useState(() => loadLocal("bibamus-favorite-venues", []));
  useEffect(() => saveLocal("bibamus-favorite-venues", favoriteVenueIds), [favoriteVenueIds]);
  useEffect(() => {
    if (favoriteVenueIds.length === 0) {
      setMyFavoriteVenues([]);
      return;
    }
    loadVenuesByIds(favoriteVenueIds).then(setMyFavoriteVenues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteVenueIds]);
  const toggleVenueFavorite = (venueId) =>
    setFavoriteVenueIds((prev) => (prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]));

  const toggleVenueLike = (venueId) => {
    const venue = venuesById[venueId];
    if (!venue) return;
    const likes = venue.likes || [];
    const alreadyLiked = likes.includes(profile.myBibroCode);
    const nextLikes = alreadyLiked ? likes.filter((c) => c !== profile.myBibroCode) : [...likes, profile.myBibroCode];
    if (!alreadyLiked) emitEvent(EVENT_TYPES.PRODUCT_LIKED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: venueId });
    setVenuesById((prev) => ({ ...prev, [venueId]: { ...prev[venueId], likes: nextLikes } }));
    updatePublicVenue(venueId, { likes: nextLikes });
  };

  const [viewedBibroId, setViewedBibroId] = useState(null);
  const [viewedBibaxPhotos, setViewedBibaxPhotos] = useState(null);
  const [mutualBibaxData, setMutualBibaxData] = useState(null);
  const [viewedSettingsCategory, setViewedSettingsCategory] = useState(null);
  const [viewedAccountField, setViewedAccountField] = useState(null);
  const [viewedSecuritySub, setViewedSecuritySub] = useState(null);
  const [viewedChoiceKey, setViewedChoiceKey] = useState(null);
  const [viewedBreweryId, setViewedBreweryId] = useState(null);
  const [viewedBrandId, setViewedBrandId] = useState(null);

  useEffect(() => {
    if (viewedBreweryId && profile.isAdmin) {
      loadContributionsForEntity("producer", viewedBreweryId).then(setViewedBreweryContributions);
    } else {
      setViewedBreweryContributions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedBreweryId, profile.isAdmin]);

  useEffect(() => {
    if (viewedBrandId && profile.isAdmin) {
      loadContributionsForEntity("brand", viewedBrandId).then(setViewedBrandContributions);
    } else {
      setViewedBrandContributions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedBrandId, profile.isAdmin]);

  const [viewedDrinkContributions, setViewedDrinkContributions] = useState([]);

  useEffect(() => {
    if (viewedDrinkId && profile.isAdmin) {
      loadContributionsForEntity("drink", viewedDrinkId).then(setViewedDrinkContributions);
    } else {
      setViewedDrinkContributions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedDrinkId, profile.isAdmin]);

  const suggestDrinkEdit = async (id, submittedData) => {
    const drink = viewedDrink?.id === id ? viewedDrink : null;
    if (!drink) return;
    const fields = computeDrinkDiff(drink, submittedData);
    if (Object.keys(fields).length === 0) return;
    await proposeContribution("drink", id, fields, drink, profile.myBibroCode || null);
    setViewedDrink((prev) => (prev && prev.id === id ? { ...prev, pendingContributionsCount: (prev.pendingContributionsCount || 0) + Object.keys(fields).length } : prev));
  };

  const refreshViewedDrinkContributions = async (id) => {
    const list = await loadContributionsForEntity("drink", id);
    setViewedDrinkContributions(list);
  };

  const approveDrinkContribution = async (contribution) => {
    await approveContribution(contribution, profile.myBibroCode || null);
    emitEvent(EVENT_TYPES.CONTRIBUTION_APPROVED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: contribution.entityId, payload: { fieldPath: contribution.fieldPath } });
    setViewedDrink((prev) =>
      prev && prev.id === contribution.entityId
        ? { ...prev, [contribution.fieldPath]: contribution.proposedValue, pendingContributionsCount: Math.max(0, (prev.pendingContributionsCount || 0) - 1) }
        : prev
    );
    await refreshViewedDrinkContributions(contribution.entityId);
  };

  const rejectDrinkContribution = async (contribution) => {
    await rejectContribution(contribution, profile.myBibroCode || null);
    setViewedDrink((prev) => (prev && prev.id === contribution.entityId ? { ...prev, pendingContributionsCount: Math.max(0, (prev.pendingContributionsCount || 0) - 1) } : prev));
    await refreshViewedDrinkContributions(contribution.entityId);
  };

  const certifyDrink = (id) => {
    updateDrink(id, { status: "complete" });
    setViewedDrink((prev) => (prev && prev.id === id ? { ...prev, status: "complete" } : prev));
  };
  const decertifyDrink = (id) => {
    updateDrink(id, { status: "to_process" });
    setViewedDrink((prev) => (prev && prev.id === id ? { ...prev, status: "to_process" } : prev));
  };
  const removeDrinkFromDirectory = (id) => {
    deleteDrink(id);
    setScreen("drinksDirectory");
  };

  // Version simplifiée : ne touche pas aux statistiques personnelles par lieu (ce système n'existe
  // pas encore côté web — "mes lieux" est ici le répertoire partagé, pas une liste personnelle avec
  // ses propres compteurs). Le cœur (retirer/modifier une tournée, et synchroniser le salon partagé)
  // fonctionne pleinement.
  const deleteRound = (eventId, roundId) => {
    updateEvent(eventId, (e) => ({
      ...e,
      rounds: e.rounds.filter((r) => r.id !== roundId),
      personalOrders: (e.personalOrders || []).filter((o) => o.roundId !== roundId),
    }));
    deleteRoundOrders(roundId);
    deleteRoundTip(roundId);
  };

  const editRound = (eventId, roundId, updates) => {
    updateEvent(eventId, (e) => ({
      ...e,
      rounds: e.rounds.map((r) =>
        r.id === roundId
          ? { ...r, ...updates, ...(updates.settledDirectly !== undefined ? { amountPaid: updates.settledDirectly ? r.total : 0 } : {}) }
          : r
      ),
      // Même logique que finishRound — remettre une tournée sur la note rend caduque une note
      // finale déjà encodée.
      ...(updates.settledDirectly === false && e.finalTotal != null ? { finalTotal: null, tip: 0 } : {}),
    }));
    // "Argent dépensé" ne doit compter que ce qui est réellement payé — répercuter le nouveau
    // statut de règlement côté serveur, sans quoi cette édition ne change rien aux vraies stats.
    if (updates.settledDirectly !== undefined) markRoundPaid(roundId, updates.settledDirectly);
  };

  // "Note finale du bar" — régler d'un coup toutes les tournées encore sur la note de cet
  // événement, plutôt que de devoir éditer chaque tournée une par une en quittant le lieu.
  // "Note finale du bar" — applique un montant (partiel ou total) contre les tournées encore
  // ouvertes de cet événement, la plus ancienne en premier, jusqu'à épuisement du montant. Une
  // tournée ne repasse en "réglée" (verte) qu'une fois entièrement soldée — un paiement partiel
  // réduit juste ce qu'il lui reste à devoir, elle reste sur la note pour le solde.
  const payTabAmount = (eventId, amount, buyerName) => {
    updateEvent(eventId, (e) => {
      let remaining = amount;
      const updates = new Map();
      [...e.rounds]
        .filter((r) => r.buyerName === buyerName)
        .sort((a, b) => a.createdAt - b.createdAt)
        .forEach((r) => {
          const paidSoFar = r.amountPaid ?? (r.settledDirectly !== false ? r.total : 0);
          const owed = r.total - paidSoFar;
          if (remaining <= 0 || owed <= 0) return;
          const applied = Math.min(remaining, owed);
          remaining -= applied;
          const newPaid = paidSoFar + applied;
          updates.set(r.id, { amountPaid: newPaid, settledDirectly: newPaid >= r.total - 0.01 });
        });
      return {
        ...e,
        rounds: e.rounds.map((r) => (updates.has(r.id) ? { ...r, ...updates.get(r.id) } : r)),
      };
    });
    recordPartialPayment(eventId, amount);
  };

  const activateBibaBob = (eventId, code, name, tolerance, pin) => {
    updateEvent(eventId, (e) => ({
      ...e,
      bibaBob: { ...(e.bibaBob || {}), [code]: { name, tolerance, pin, jokerUsed: false, activatedAt: Date.now() } },
    }));
  };

  const deactivateBibaBob = (eventId, code) => {
    updateEvent(eventId, (e) => {
      const bibaBob = { ...(e.bibaBob || {}) };
      delete bibaBob[code];
      return { ...e, bibaBob };
    });
  };

  const useBibaBobJoker = (eventId, code) => {
    updateEvent(eventId, (e) => ({
      ...e,
      bibaBob: { ...(e.bibaBob || {}), [code]: { ...(e.bibaBob || {})[code], jokerUsed: true } },
    }));
  };

  // Version simplifiée : dans l'app web, "venues" EST déjà le répertoire partagé (pas de couche
  // "mes lieux personnels" séparée comme dans le prototype) — donc ça opère directement dessus.
  const cleanupDuplicates = (venueId) => {
    const venue = venuesById[venueId];
    if (!venue) return 0;
    const groups = new Map();
    (venue.menu || []).forEach((d) => {
      const key = `${d.name.trim().toLowerCase()}__${d.volumeCl || ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    });
    let removed = 0;
    const kept = [];
    groups.forEach((items) => {
      if (items.length === 1) {
        kept.push(items[0]);
        return;
      }
      const best = [...items].sort((a, b) => {
        if ((b.price > 0) !== (a.price > 0)) return b.price > 0 ? 1 : -1;
        if (!!b.fromDirectory !== !!a.fromDirectory) return b.fromDirectory ? 1 : -1;
        return 0;
      })[0];
      kept.push(best);
      removed += items.length - 1;
    });
    if (removed > 0) {
      updatePublicVenue(venueId, { menu: kept });
      setVenuesById((prev) => ({ ...prev, [venueId]: { ...prev[venueId], menu: kept } }));
    }
    return removed;
  };

  const [drinksDirQuery, setDrinksDirQuery] = useState("");
  const [drinksDirCategory, setDrinksDirCategory] = useState(null);
  const [drinksDirTagFilter, setDrinksDirTagFilter] = useState(null);
  const [drinksDirLetter, setDrinksDirLetter] = useState(null);

  const suggestBreweryEdit = async (id, name, country) => {
    const b = breweriesDirectory.find((x) => x.id === id);
    if (!b) return;
    const fields = {};
    const trimmedName = (name || "").trim();
    const trimmedCountry = (country || "").trim();
    if (trimmedName && trimmedName !== b.name) fields.name = trimmedName;
    if (trimmedCountry !== (b.country || "")) fields.country = trimmedCountry;
    if (Object.keys(fields).length === 0) return;
    await proposeContribution("producer", id, fields, b, profile.myBibroCode || null);
    setBreweriesDirectory((prev) => prev.map((x) => (x.id === id ? { ...x, pendingContributionsCount: (x.pendingContributionsCount || 0) + Object.keys(fields).length } : x)));
  };

  const suggestBrandEdit = async (id, name) => {
    const b = brandsDirectory.find((x) => x.id === id);
    if (!b) return;
    const trimmedName = (name || "").trim();
    if (!trimmedName || trimmedName === b.name) return;
    await proposeContribution("brand", id, { name: trimmedName }, b, profile.myBibroCode || null);
    setBrandsDirectory((prev) => prev.map((x) => (x.id === id ? { ...x, pendingContributionsCount: (x.pendingContributionsCount || 0) + 1 } : x)));
  };

  const [viewedBreweryContributions, setViewedBreweryContributions] = useState([]);
  const [viewedBrandContributions, setViewedBrandContributions] = useState([]);

  const refreshViewedBreweryContributions = async (id) => {
    const list = await loadContributionsForEntity("producer", id);
    setViewedBreweryContributions(list);
  };

  const approveBreweryContribution = async (contribution) => {
    await approveContribution(contribution, profile.myBibroCode || null);
    emitEvent(EVENT_TYPES.CONTRIBUTION_APPROVED, { actorBibroCode: profile.myBibroCode, entityType: "producer", entityId: contribution.entityId, payload: { fieldPath: contribution.fieldPath } });
    setBreweriesDirectory((prev) => prev.map((x) => (x.id === contribution.entityId ? { ...x, [contribution.fieldPath]: contribution.proposedValue, pendingContributionsCount: Math.max(0, (x.pendingContributionsCount || 0) - 1) } : x)));
    await refreshViewedBreweryContributions(contribution.entityId);
  };

  const rejectBreweryContribution = async (contribution) => {
    await rejectContribution(contribution, profile.myBibroCode || null);
    setBreweriesDirectory((prev) => prev.map((x) => (x.id === contribution.entityId ? { ...x, pendingContributionsCount: Math.max(0, (x.pendingContributionsCount || 0) - 1) } : x)));
    await refreshViewedBreweryContributions(contribution.entityId);
  };

  const refreshViewedBrandContributions = async (id) => {
    const list = await loadContributionsForEntity("brand", id);
    setViewedBrandContributions(list);
  };

  const approveBrandContribution = async (contribution) => {
    await approveContribution(contribution, profile.myBibroCode || null);
    emitEvent(EVENT_TYPES.CONTRIBUTION_APPROVED, { actorBibroCode: profile.myBibroCode, entityType: "brand", entityId: contribution.entityId, payload: { fieldPath: contribution.fieldPath } });
    setBrandsDirectory((prev) => prev.map((x) => (x.id === contribution.entityId ? { ...x, [contribution.fieldPath]: contribution.proposedValue, pendingContributionsCount: Math.max(0, (x.pendingContributionsCount || 0) - 1) } : x)));
    await refreshViewedBrandContributions(contribution.entityId);
  };

  const rejectBrandContribution = async (contribution) => {
    await rejectContribution(contribution, profile.myBibroCode || null);
    setBrandsDirectory((prev) => prev.map((x) => (x.id === contribution.entityId ? { ...x, pendingContributionsCount: Math.max(0, (x.pendingContributionsCount || 0) - 1) } : x)));
    await refreshViewedBrandContributions(contribution.entityId);
  };

  const openTagFilter = (type, filter) => {
    setDrinksDirCategory(type);
    setDrinksDirTagFilter(filter);
    setDrinksDirLetter(null);
    setDrinksDirQuery("");
    setScreen("drinksDirectory");
  };

  const checkInVenue = async (venueId, { publishToPulse = true } = {}) => {
    // Marquage local existant, conservé tel quel (présence en temps réel sur cet appareil).
    setCheckedInVenueId(venueId);
    emitEvent(EVENT_TYPES.VENUE_CHECKED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: venueId, skipPulse: !publishToPulse });
    // Persistance réelle en base — c'est elle qui autorise ensuite à laisser un avis sur ce lieu.
    await recordVenueCheckIn(venueId);
  };

  // À partir du 2e check-in, la publication BibaPulse est confirmée séparément (case cochée
  // par défaut dans le popup de check-in) plutôt qu'automatique — voir checkInVenue ci-dessus,
  // appelé avec publishToPulse: false dans ce cas.
  const publishCheckInPulse = (venueId) => {
    publishVenueCheckInToPulse(venueId);
  };

  // Miroir de checkInVenue, mais pour un produit — répétable (pas de marquage local "présence
  // en temps réel" comme pour un lieu), et venueId optionnel.
  const checkInDrink = async (drinkId, venueId, { publishToPulse = true, volumeCl = null } = {}) => {
    emitEvent(EVENT_TYPES.DRINK_CHECKED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: drinkId, skipPulse: !publishToPulse });
    await recordDrinkCheckIn(drinkId, venueId, volumeCl);
    if (publishToPulse) publishDrinkCheckInToPulse(drinkId, venueId);
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setProfile({ name: "", avatarUrl: null, myBibroCode: null });
    setProfileLoaded(false);
    setTastedDrinkIds([]);
  };

  const handleAccountDeleted = async () => {
    // Le compte n'existe plus côté serveur — on nettoie simplement l'état local et on retourne
    // à l'écran de connexion, comme une déconnexion classique.
    setSession(null);
    setProfile({ name: "", avatarUrl: null, myBibroCode: null });
    setProfileLoaded(false);
  };

  // Le statut admin vient désormais exclusivement du rôle vérifié côté serveur (chargé avec le
  // profil) — cette fonction ne peut plus l'accorder elle-même, une passphrase locale ne
  // suffit plus à contourner la vérification faite par la base de données.
  const unlockAdmin = () => false;

  // "Ajouter un Bibax" envoie désormais une vraie demande mutuelle (façon Facebook) — l'ajout
  // local ne se fait que si la relation est immédiatement mutuelle (l'autre avait déjà envoyé
  // sa propre demande, ou vous êtes déjà Bibax) ; sinon, ça reste "en attente" jusqu'à ce que
  // l'autre confirme, et se synchronise automatiquement une fois accepté (voir plus bas).
  const addBibro = async (code, name, alias, socials) => {
    const result = await sendBibaxRequest(code);
    if (result.error) {
      alert(result.error);
      return { error: result.error };
    }
    if (result.status === "accepted" || result.status === "already_bibax") {
      const newBibro = { code, name, alias: alias || "", ...socials, addedAt: Date.now() };
      setBibros((prev) => (prev.some((b) => b.code === code) ? prev : [...prev, newBibro]));
    }
    trackEvent("bibax_added", "addBibro", profile.myBibroCode);
    return result;
  };
  // Retirer un Bibax doit aussi supprimer la vraie relation mutuelle côté serveur — sinon, la
  // synchronisation périodique des demandes acceptées le ferait automatiquement réapparaître.
  const removeBibro = (code) => {
    setBibros((prev) => prev.filter((b) => b.code !== code));
    removeBibaxByCode(code);
  };
  const setBibroAlias = (code, alias) => setBibros((prev) => prev.map((b) => (b.code === code ? { ...b, alias } : b)));
  const toggleBibroFavorite = (code) =>
    setBibros((prev) => prev.map((b) => (b.code === code ? { ...b, isFavorite: !b.isFavorite } : b)));

  // Synchrone en apparence (comme dans le prototype Claude) : vérifie d'abord si une brasserie
  // très proche existe déjà en mémoire et renvoie son nom canonique immédiatement — sinon, l'ajoute
  // optimistiquement en local tout de suite (pour un retour visuel instantané) et la persiste dans
  // Supabase en arrière-plan.
  const reopenEvent = (id) => {
    updateEvent(id, (e) => ({ ...e, closed: false, closedAt: null }));
  };

  // Supprimer un événement annule aussi exactement ce qu'il avait contribué aux statistiques
  // de son établissement — la visite, les verres/argent de chaque tournée, les verres/calories
  // personnels — pour que les totaux du lieu restent justes plutôt que de garder une trace
  // fantôme d'un événement qui n'existe plus.
  const deleteEvent = (id) => {
    deleteRoundOrdersByEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const registerBrewery = (name, country) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return trimmed;
    const normalized = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const existing = breweriesDirectory.find(
      (b) => (b.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") === normalized
    );
    if (existing) return existing.name;
    const newBrewery = { id: `local-${Date.now()}`, name: trimmed, country: (country || "").trim(), status: "to_process" };
    setBreweriesDirectory((prev) => [...prev, newBrewery]);
    emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "producer", entityId: newBrewery.id });
    createBrewery(newBrewery).then((created) => {
      if (created) setBreweriesDirectory((prev) => prev.map((b) => (b.id === newBrewery.id ? created : b)));
    });
    return trimmed;
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F2E8", fontFamily: "sans-serif" }}>
        Chargement...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} signupsEnabled={featureFlags.signups_enabled !== false} />;
  }

  if (loading || !profileLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F2E8", fontFamily: "sans-serif" }}>
        Chargement...
      </div>
    );
  }

  const stillBlocked = profile.active === false && (!profile.blockedUntil || new Date(profile.blockedUntil) > new Date());

  if (stillBlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "#08131F",
          color: "#F2F2E8",
          textAlign: "center",
        }}
      >
        <BibamusLogoFull height={38} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "28px", margin: "32px 0 12px" }}>Compte bloqué</h1>
        <p style={{ fontSize: "14px", color: "#8792A6", marginBottom: "20px", maxWidth: "320px", lineHeight: 1.6 }}>
          {profile.blockedUntil ? (
            <>
              Votre compte a été suspendu par Bibamus jusqu'au{" "}
              <strong style={{ color: "#F2F2E8" }}>{new Date(profile.blockedUntil).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong>.
              <br />
              Il redeviendra actif automatiquement à cette date.
            </>
          ) : (
            "Votre accès à Bibamus a été suspendu définitivement par un administrateur."
          )}
          {profile.blockedReason && (
            <>
              <br />
              <br />
              Raison :
              <br />
              {profile.blockedReason}
            </>
          )}
        </p>
        <button
          onClick={handleLogout}
          style={{ background: "#FF3B4E", border: "none", borderRadius: "10px", padding: "13px 24px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <NavigationContext.Provider value={() => setScreen("home")}>
      <ProfileNavContext.Provider
        value={{
          avatarUrl: profile.avatarUrl,
          goToProfile: () => setScreen("profile"),
          goToSpotifyConnect: (returnScreen = "connectSpotify", returnEventId = null) => {
            setSpotifyReturnContext({ screen: returnScreen, eventId: returnEventId });
            setScreen("connectSpotify");
          },
        }}
      >
        <div
          style={{
            fontFamily: "'Work Sans', sans-serif",
            background: "#08131F",
            color: "#F2F2E8",
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              height: "100dvh",
              display: "flex",
              flexDirection: "column",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div ref={mainScrollRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column" }}>
            {screen === "home" && (
              <HomeScreen
                profile={profile}
                events={events}
                updateEvent={updateEvent}
                myUserId={session.user.id}
                pulseStoriesRefreshKey={pulseStoriesRefreshKey}
                onAddStory={(contextType, contextId) => {
                  setStoryCreateContext({ contextType, contextId, returnScreen: "home" });
                  setScreen("storyCreate");
                }}
                onOpenStoryAuthor={setViewedStoryAuthor}
                goToBibaxAllSuggestions={() => {
                  setScreenBeforeBibaxSuggestions("home");
                  setScreen("bibaxAllSuggestions");
                }}
                onOpenBibaxProfile={(code) => {
                  setViewedBibaxProfileCode(code);
                  setScreen("bibaxProfilePreview");
                }}
                onOpenVenue={(id) => {
                  setScreenBeforeVenueDetail("home");
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("home");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                breweriesDirectory={breweriesDirectory}
                brandsDirectory={brandsDirectory}
                openEvent={(id) => {
                  setActiveEventId(id);
                  setScreen("eventDashboard");
                }}
                goToSessionHub={() => setScreen("sessionHub")}
                goToProfile={() => setScreen("profile")}
                goToRepertoireHub={() => setScreen("repertoireHub")}
                goToGames={() => {
                  setBibaPlayLinkedSalonCode(null);
                  setScreen("games");
                }}
                goToBibaMeet={() => setScreen("bibaMeet")}
                bibaMeetVisible={featureFlags.nav_bibameet_visible !== false}
                bibaPulseVisible={featureFlags.nav_bibapulse_visible !== false}
                gamesVisible={featureFlags.nav_games_visible !== false}
                goToBibaPulse={() => setScreen("bibaPulse")}
                goToBibaPing={() => setScreen("bibaPing")}                
                goToSettings={() => setScreen("settings")}
                goToSearch={() => {
                  setSearchInitialTab("lieux");
                  setScreenBeforeSearch("home");
                  setScreen("search");
                }}
                goToDrinkCheck={() => {
                  setScreenBeforeDrinksDirectory("home");
                  setScreen("drinksDirectory");
                }}
                goToBibaSolo={() => {
                  setScreenBeforeBibaSolo("home");
                  setScreen("bibaSolo");
                }}
                goToPlaceCheck={() => {
                  setScreenBeforeVenueDirectory("home");
                  setScreen("venueDirectory");
                }}
                bibros={bibros}
                bibroStatuses={bibroStatuses}
                onQuickJoinSalon={(code) => console.log("TODO: rejoindre salon", code)}
                myName={profile.name}
                myBibroCode={profile.myBibroCode}
                avatarUrl={profile.avatarUrl}
                lastName={profile.lastName}
              />
            )}
            {screen === "sessionHub" && (
              <SessionHubScreen
                onBack={() => setScreen("home")}
                goToNewSalon={() => setScreen("newSalonEvent")}
                goToJoinSalon={() => setScreen("joinSalon")}
                goToBibArena={() => {}}
                goToBibaSolo={() => {
                  setScreenBeforeBibaSolo("sessionHub");
                  setScreen("bibaSolo");
                }}
              />
            )}
            {screen === "repertoireHub" && (
              <RepertoireHubScreen
                onBack={() => setScreen("home")}
                goToDiscover={() => {
                  setScreenBeforeVenueDirectory("repertoireHub");
                  setScreen("venueDirectory");
                }}
                goToDrinks={() => {
                  setScreenBeforeDrinksDirectory("repertoireHub");
                  setScreen("drinksDirectory");
                }}
                goToManageBreweries={() => setScreen("breweryDirectory")}
                goToManageBrands={() => setScreen("brandDirectory")}
                goToSearch={() => {
                  setScreenBeforeSearch("repertoireHub");
                  setScreen("search");
                }}
                goToScanLinked={() => {
                  setScanMode("linked");
                  setShowBarcodeScanner(true);
                }}
              />
            )}
            {screen === "newSalonEvent" && (
              <NewEventScreen
                mode={screen === "newSalonEvent" ? "salon" : "solo"}
                onCreate={createEvent}
                onCancel={() => setScreen("sessionHub")}
                venues={myFavoriteVenues}
                onResolvePublicVenue={(publicVenueOrDraft) => publicVenueOrDraft}
                bibros={bibros}
                myUserId={session.user.id}
              />
            )}
            {screen === "joinSalon" && (
              <JoinSalonScreen
                onJoin={joinSalon}
                onCancel={() => setScreen("sessionHub")}
                myName={profile.name}
              />
            )}
            {screen === "venueDirectory" && (
              <VenueDirectoryScreen
                myVenues={[]}
                myBibroCode={profile.myBibroCode}
                isAdmin={!!profile.isAdmin}
                addIntent={false}
                onBack={() => setScreen(screenBeforeVenueDirectory)}
                onOpenVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                goToSubmit={() => setScreen("submitVenue")}
                goToMap={() => setScreen("venueMap")}
                activeCountry={activeCountry}
                setActiveCountry={setActiveCountry}
                activeCity={activeCity}
                setActiveCity={setActiveCity}
              />
            )}
            {screen === "venueMap" && (
              <VenueMapScreen
                onBack={() => setScreen("venueDirectory")}
                onOpenVenue={(id) => {
                  setScreenBeforeVenueDetail("venueMap");
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
              />
            )}
            {screen === "eventDashboard" && activeEventId && (
              <SalonTabsScreen
                event={events.find((e) => e.id === activeEventId)}
                venue={venuesById[events.find((e) => e.id === activeEventId)?.venueId] || null}
                onNewRound={startNewRound}
                onManageMenu={() => setScreen("menuSetup")}
                onBack={() => setScreen("home")}
                updateEvent={updateEvent}
                myName={profile.name}
                profile={profile}
                myUserId={session.user.id}
                myBibroCode={profile.myBibroCode}
                bibros={bibros}
                onCloseEvent={() => {
                  updateEvent(activeEventId, (e) => ({ ...e, closed: true, closedAt: Date.now() }));
                  setScreen("home");
                }}
                onOpenSettings={() => setScreen("eventSettings")}
                onOpenVenue={(id) => {
                  setViewedVenueId(id);
                  setScreenBeforeVenueDetail("eventDashboard");
                  setScreen("venueDetail");
                }}
                onOpenWaterAlertSettings={() => setScreen("waterAlertSettings")}
                onDeleteRound={(roundId) => deleteRound(activeEventId, roundId)}
                onEditRound={(roundId, updates) => editRound(activeEventId, roundId, updates)}
                onPayTabAmount={(amount) => payTabAmount(activeEventId, amount, profile.name)}
                onCheckDrink={(drinkId, venueId, opts) => checkInDrink(drinkId, venueId, opts)}
                onActivateBibaBob={(code, name, tolerance, pin) => activateBibaBob(activeEventId, code, name, tolerance, pin)}
                onDeactivateBibaBob={(code) => deactivateBibaBob(activeEventId, code)}
                onGoToBibaMusic={() => setScreen("bibaMusic")}
                onGoToBibaPlay={() => {
                  setBibaPlayLinkedSalonCode(currentEvent?.salonCode || null);
                  setScreen("games");
                }}
                onGoToDrinkCheck={() => setScreen("drinkCheck")}
                onLeaveSalon={(noticeType) => leaveSalonFn(activeEventId, currentEvent?.salonCode, noticeType)}
                onAddStory={(contextType, contextId) => {
                  setStoryCreateContext({ contextType, contextId, returnScreen: "eventDashboard" });
                  setScreen("storyCreate");
                }}
                onOpenStoryAuthor={setViewedStoryAuthor}
              />
            )}
            {screen === "drinkCheck" && currentEvent && (
              <DrinkCheckScreen
                drinkIds={(() => {
                  const localIds = new Set();
                  (currentEvent.rounds || []).forEach((r) => {
                    (r.orders || []).filter((o) => o.friendId === "self").forEach((o) => localIds.add(o.drinkId));
                  });
                  (currentEvent.personalOrders || []).forEach((o) => localIds.add(o.drinkId));
                  return [...localIds]
                    .map((localId) => (currentEvent.menu || []).find((d) => d.id === localId))
                    .filter((d) => d?.fromDirectory && d?.sourceDrinkId)
                    .map((d) => d.sourceDrinkId);
                })()}
                presetVenue={(() => {
                  const venue = venuesById[currentEvent?.venueId] || null;
                  if (venue) return { id: currentEvent.venueId, name: venue.name };
                  if (currentEvent.isHome) return { id: "@home", name: "@Home" };
                  if (currentEvent.venueId === "@event") return { id: "@event", name: "@Event" };
                  return null;
                })()}
                myBibroCode={profile.myBibroCode}
                onBack={() => setScreen("eventDashboard")}
                onRateDrink={rateDrinkStandalone}
                onUnrateDrink={unrateDrinkStandalone}
              />
            )}
            {screen === "bibaMusic" && currentEvent && (
              <BibaMusicScreen
                event={currentEvent}
                updateEvent={updateEvent}
                myBibroCode={profile.myBibroCode}
                myName={profile.name}
                myUserId={session.user.id}
                onBack={() => setScreen("eventDashboard")}
              />
            )}
            {screen === "roundCompose" && currentEvent && (
              <RoundComposeScreen
                event={currentEvent}
                mainScrollRef={mainScrollRef}
                draftFriends={draftFriends}
                setDraftFriends={setDraftFriends}
                draftOrders={draftOrders}
                setDraftOrders={setDraftOrders}
                activeFriendId={activeFriendId}
                setActiveFriendId={setActiveFriendId}
                bibros={bibros}
                myBibroCode={profile.myBibroCode}
                onBack={() => setScreen("eventDashboard")}
                onSeeTicket={() => setScreen("roundTicket")}
                onUseBibaBobJoker={(code) => useBibaBobJoker(activeEventId, code)}
              />
            )}
            {screen === "roundTicket" && currentEvent && (
              <RoundTicketScreen
                event={currentEvent}
                draftFriends={draftFriends}
                draftOrders={draftOrders}
                onEdit={() => setScreen("roundCompose")}
                onFinish={finishRound}
              />
            )}
            {screen === "menuSetup" && currentEvent && (
              <MenuSetupScreen
                event={currentEvent}
                venue={venuesById[currentEvent.venueId] || null}
                updateEvent={updateEvent}
                onBack={() => setScreen("eventDashboard")}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                onCleanupDuplicates={() => cleanupDuplicates(currentEvent.venueId)}
              />
            )}
            {screen === "drinksDirectory" && (
              <DrinksDirectoryScreen
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                onBack={() => setScreen(screenBeforeDrinksDirectory)}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("drinksDirectory");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                goToSubmit={() => setScreen("submitDrink")}
                goToScanBarcode={() => setShowBarcodeScanner(true)}
                query={drinksDirQuery}
                setQuery={setDrinksDirQuery}
                activeCategory={drinksDirCategory}
                setActiveCategory={setDrinksDirCategory}
                activeTagFilter={drinksDirTagFilter}
                setActiveTagFilter={setDrinksDirTagFilter}
                activeLetter={drinksDirLetter}
                setActiveLetter={setDrinksDirLetter}
              />
            )}
            {screen === "editVenue" && viewedVenue && (
              <DirectoryVenueFormScreen
                venue={viewedVenue}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                addIntent={false}
                suggestMode={!profile.isAdmin && viewedVenue?.status === "complete"}
                onSave={(patch) => {
                  updatePublicVenue(viewedVenueId, patch);
                  setVenuesById((prev) => ({ ...prev, [viewedVenueId]: { ...prev[viewedVenueId], ...patch } }));
                  setScreen("venueDetail");
                }}
                onCancel={() => setScreen("venueDetail")}
              />
            )}
            {screen === "submitVenue" && (
              <SubmitVenueWizardScreen
                onDone={(createdId) => {
                  emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: createdId });
                  setScreen("venueDirectory");
                }}
                onCancel={() => setScreen("venueDirectory")}
              />
            )}
            {screen === "editDrink" && viewedDrink && (
              <DrinkFormScreen
                drink={viewedDrink}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                brandsDirectory={brandsDirectory}
                onRegisterBrand={registerBrand}
                suggestMode={!profile.isAdmin && viewedDrink?.status === "complete"}
                onSave={(patch) => {
                  if (!profile.isAdmin && viewedDrink?.status === "complete") {
                    suggestDrinkEdit(viewedDrinkId, patch);
                  } else {
                    updateDrink(viewedDrinkId, patch);
                    setViewedDrink((prev) => (prev && prev.id === viewedDrinkId ? { ...prev, ...patch } : prev));
                  }
                  setScreen("drinkDetail");
                }}
                onCancel={() => setScreen("drinkDetail")}
              />
            )}
            {screen === "submitDrink" && (
              <SubmitDrinkWizardScreen
                breweriesDirectory={breweriesDirectory}
                brandsDirectory={brandsDirectory}
                onDone={(createdId) => {
                  emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: createdId });
                  setScreen("drinksDirectory");
                }}
                onCancel={() => setScreen("drinksDirectory")}
              />
            )}
            {screen === "venueDetail" && !viewedVenue && (
              <div style={{ padding: "28px 20px", textAlign: "center", color: COLORS.inkSoft }}>Chargement...</div>
            )}
            {screen === "venueDetail" && viewedVenue && (
              <VenueDetailScreen
                venue={(() => {
                  const v = viewedVenue;
                  return v ? { ...v, isFavorite: favoriteVenueIds.includes(v.id) } : v;
                })()}
                myBibroCode={profile.myBibroCode}
                isAdmin={!!profile.isAdmin}
                myUserId={session.user.id}
                onToggleLike={() => toggleVenueLike(viewedVenueId)}
                onCheckIn={(opts) => checkInVenue(viewedVenueId, opts)}
                onPublishCheckInPulse={() => publishCheckInPulse(viewedVenueId)}
                onBack={() => {
                  if (storyResumeState) {
                    setViewedStoryAuthor(storyResumeState.stories);
                    setStoryResumeState(null);
                    setScreen("home");
                  } else {
                    setScreen(screenBeforeVenueDetail);
                  }
                }}
                onEdit={() => setScreen("editVenue")}
                onDelete={() => {
                  deletePublicVenue(viewedVenueId);
                  setVenuesById((prev) => {
                    const next = { ...prev };
                    delete next[viewedVenueId];
                    return next;
                  });
                  setScreen("venueDirectory");
                }}
                onManageMenu={() => setScreen("venueMenuCategories")}
                onToggleFavorite={() => toggleVenueFavorite(viewedVenueId)}
                onCleanupDuplicates={() => cleanupDuplicates(viewedVenueId)}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
              />
            )}
            {screen === "venueMenuCategories" && viewedVenue && (
              <VenueMenuCategoriesScreen
                venue={viewedVenue}
                onBack={() => setScreen("venueDetail")}
                onOpenCategory={(cat) => {
                  setViewedMenuCategory(cat);
                  setScreen("venueCategoryDrinks");
                }}
              />
            )}
            {screen === "venueCategoryDrinks" && viewedVenue && (
              <VenueCategoryDrinksScreen
                venue={viewedVenue}
                category={viewedMenuCategory}
                onBack={() => setScreen("venueMenuCategories")}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("venueCategoryDrinks");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
              />
            )}
            {screen === "drinkDetail" && !viewedDrink && (
              <div style={{ padding: "28px 20px", textAlign: "center", color: COLORS.inkSoft }}>Chargement...</div>
            )}
            {screen === "drinkDetail" && viewedDrink && (
              <DrinkDetailScreen
                drink={viewedDrink}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                isTasted={tastedDrinkIds.includes(viewedDrinkId)}
                onToggleTasted={() => toggleTastedDrink(viewedDrinkId)}
                isOnWishlist={wishlistDrinkIds.includes(viewedDrinkId)}
                onToggleWishlist={() => toggleWishlistDrink(viewedDrinkId)}
                onRate={(value) => rateDrink(viewedDrinkId, value)}
                onUnrate={() => unrateDrink(viewedDrinkId)}
                onToggleMode={(mode) => toggleTastedServingMode(viewedDrinkId, mode)}
                onCheckDrink={(drinkId, venueId, opts) => checkInDrink(drinkId, venueId, opts)}
                onBack={() => {
                  if (storyResumeState) {
                    setViewedStoryAuthor(storyResumeState.stories);
                    setStoryResumeState(null);
                    setScreen("home");
                  } else {
                    setScreen(screenBeforeDrinkDetail);
                  }
                }}
                onEdit={() => setScreen("editDrink")}
                onCertify={() => certifyDrink(viewedDrinkId)}
                onDecertify={() => decertifyDrink(viewedDrinkId)}
                onDelete={() => removeDrinkFromDirectory(viewedDrinkId)}
                pendingContributions={viewedDrinkContributions}
                onApproveContribution={approveDrinkContribution}
                onRejectContribution={rejectDrinkContribution}
                onOpenTagFilter={openTagFilter}
                onUploadPhoto={(file) => uploadPhotoForDrink(viewedDrinkId, file)}
                onDeletePhoto={() => deletePhotoForDrink(viewedDrinkId)}
                onOpenBrand={(id) => {
                  setViewedBrandId(id);
                  setScreen("brandDetail");
                }}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
                onOpenVenue={(id) => {
                  setViewedVenueId(id);
                  setScreenBeforeVenueDetail("drinkDetail");
                  setScreen("venueDetail");
                }}
              />
            )}
            {screen === "profile" && (
              <ProfileHubScreen
                myName={profile.name}
                profile={profile}
                bibros={bibros}
                checkIns={checkIns}
                myUserId={session.user.id}
                onBack={() => setScreen("home")}
                goToMyInfo={() => setScreen("myInfo")}
                goToMyStats={() => setScreen("myStats")}
                goToBibros={() => setScreen("bibrosList")}
                goToBibaClubs={() => setScreen("bibaClubsList")}
                goToProducts={() => setScreen("myProducts")}
                goToVenues={() => setScreen("venueDirectory")}
                goToHistory={() => setScreen("eventHistory")}
                goToPhotos={() => setScreen("myPhotos")}
                goToSettings={() => setScreen("settings")}
                onOpenMyStory={setViewedStoryAuthor}
              />
            )}
            {screen === "bibaClubsList" && (
              <BibaClubsListScreen
                myUserId={session.user.id}
                onBack={() => setScreen("profile")}
                onOpenClub={(clubId) => {
                  setViewedClubId(clubId);
                  setScreen("clubDetail");
                }}
                onCreateClub={() => setScreen("createClub")}
              />
            )}
            {screen === "createClub" && (
              <CreateClubScreen
                myUserId={session.user.id}
                onBack={() => setScreen("bibaClubsList")}
                onCreated={(clubId) => {
                  setViewedClubId(clubId);
                  setScreen("clubDetail");
                }}
              />
            )}
            {screen === "clubDetail" && viewedClubId && (
              <ClubDetailScreen clubId={viewedClubId} myUserId={session.user.id} onBack={() => setScreen("bibaClubsList")} />
            )}
            {screen === "myPhotos" && <MyPhotosScreen onBack={() => setScreen("profile")} />}
            {screen === "myInfo" && (
              <MyProfileScreen
                myName={profile.name}
                myUserId={session.user.id}
                onRenameMe={(name) => setProfile((p) => ({ ...p, name }))}
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onUploadPhoto={(file) => uploadMyAvatarPhoto(session.user.id, file)}
                onGoToAdminUnlock={() => setScreen("adminUnlock")}
                onGoToSettings={() => setScreen("settings")}
                onLogout={handleLogout}
                onBack={() => setScreen("profile")}
              />
            )}
            {screen === "myStats" && (
              <MyStatsScreen
                events={events}
                myName={profile.name}
                profile={profile}
                bibros={bibros}
                checkIns={checkIns}
                alcoholFreeDays={alcoholFreeDays}
                onToggleAlcoholFreeDay={toggleAlcoholFreeDay}
                onBack={() => setScreen("profile")}
                openVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                openDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                openBibro={(code) => {
                  setViewedBibroId(code);
                  setScreen("bibroDetail");
                }}
                onOpenWrapped={() => setScreen("myStatsWrapped")}
              />
            )}
            {screen === "myStatsWrapped" && (
              <WrappedScreen
                onBack={() => setScreen("myStats")}
                bibros={bibros}
                events={events}
                openVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                openDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                openBibro={(code) => {
                  setViewedBibroId(code);
                  setScreen("bibroDetail");
                }}
              />
            )}
            {screen === "settings" && (
              <SettingsScreen
                myName={profile.name}
                profile={profile}
                myUserId={session.user.id}
                onOpenMyStory={setViewedStoryAuthor}
                onBack={() => setScreen("profile")}
                isAdmin={!!profile.isAdmin}
                goToImport={() => setScreen("importData")}
                goToDeleteAccount={() => setScreen("deleteAccount")}
                onLogout={handleLogout}
                goToCategory={(key) => {
                  if (key === "account") {
                    setScreen("account");
                    return;
                  }
                  if (key === "security") {
                    setScreen("security");
                    return;
                  }
                  if (key === "notifications") {
                    setScreen("notifications");
                    return;
                  }
                  if (key === "preferences") {
                    setScreen("preferences");
                    return;
                  }
                  if (key === "appearance") {
                    setScreen("appearance");
                    return;
                  }
                  if (key === "connect") {
                    setScreen("connect");
                    return;
                  }
                  if (key === "help") {
                    setScreen("help");
                    return;
                  }
                  setViewedSettingsCategory(key);
                  setScreen("settingsCategory");
                }}
              />
            )}
            {screen === "notifications" && (
              <NotificationsScreen
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("settings")}
              />
            )}
            {screen === "appearance" && <AppearanceScreen onBack={() => setScreen("settings")} />}
            {screen === "search" && (
              <SearchScreen
                breweriesDirectory={breweriesDirectory}
                brandsDirectory={brandsDirectory}
                onOpenVenue={(id) => {
                  setScreenBeforeVenueDetail("search");
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("search");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
                onOpenBrand={(id) => {
                  setViewedBrandId(id);
                  setScreen("brandDetail");
                }}
                onOpenBibaxProfile={(code) => {
                  setViewedBibaxProfileCode(code);
                  setScreen("bibaxProfilePreview");
                }}
                goToScan={() => setShowBarcodeScanner(true)}
                goToAtlas={() => setScreen("repertoireHub")}
                hideBibaxAndAtlas={screenBeforeSearch === "repertoireHub"}
                initialTab={searchInitialTab}
                onBack={() => setScreen(screenBeforeSearch)}
              />
            )}
            {screen === "connect" && (
              <ConnectScreen
                onBack={() => setScreen("settings")}
                goToSpotify={() => {
                  setSpotifyReturnContext({ screen: "connectSpotify", eventId: null });
                  setScreen("connectSpotify");
                }}
              />
            )}
            {screen === "connectSpotify" && (
              <SpotifyDetailScreen
                myUserId={session.user.id}
                onBack={() => setScreen("connect")}
                returnScreen={spotifyReturnContext.screen}
                returnEventId={spotifyReturnContext.eventId}
              />
            )}
            {screen === "help" && (
              <HelpSupportScreen
                onBack={() => setScreen("settings")}
                goToContact={() => setScreen("helpContact")}
                goToReport={() => setScreen("helpReport")}
                goToAbout={() => setScreen("helpAbout")}
              />
            )}
            {screen === "helpContact" && <ContactFormScreen type="contact" myUserId={session.user.id} profile={profile} onBack={() => setScreen("help")} />}
            {screen === "helpReport" && <ContactFormScreen type="report" myUserId={session.user.id} profile={profile} onBack={() => setScreen("help")} />}
            {screen === "helpAbout" && <AboutScreen onBack={() => setScreen("help")} />}
            {screen === "preferences" && (
              <PreferencesScreen
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("settings")}
                goToChoice={(key) => {
                  setViewedChoiceKey(key);
                  setScreen("preferencesChoice");
                }}
                goToVolumeWeight={() => setScreen("preferencesVolumeWeight")}
                goToStorySettings={() => setScreen("preferencesStorySettings")}
              />
            )}
            {screen === "preferencesVolumeWeight" && (
              <VolumeWeightScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("preferences")} />
            )}
            {screen === "preferencesStorySettings" && (
              <StorySettingsScreen
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("preferences")}
                goToChoice={(key) => {
                  setViewedChoiceKey(key);
                  setScreen("preferencesChoice");
                }}
              />
            )}
            {screen === "preferencesChoice" &&
              (() => {
                const configs = {
                  language: {
                    icon: <NavIcon name="info" size={22} color={COLORS.amber} />,
                    title: "Langue de l'app",
                    options: [{ key: "fr", label: "Français" }],
                    value: "fr",
                    field: null,
                    back: "preferences",
                  },
                  distance: {
                    icon: <NavIcon name="ruler" size={22} color={COLORS.amber} />,
                    title: "Distances",
                    options: [
                      { key: "km", label: "Kilomètre (km)" },
                      { key: "mi", label: "Miles (mi)" },
                    ],
                    field: "prefDistanceUnit",
                    back: "preferences",
                  },
                  temperature: {
                    icon: <NavIcon name="thermometer" size={22} color={COLORS.amber} />,
                    title: "Température",
                    options: [
                      { key: "celsius", label: "Celsius (°C)" },
                      { key: "fahrenheit", label: "Fahrenheit (°F)" },
                    ],
                    field: "prefTemperatureUnit",
                    back: "preferences",
                  },
                  venueSort: {
                    icon: <NavIcon name="sort" size={22} color={COLORS.amber} />,
                    title: "Tri des lieux",
                    options: [
                      { key: "distance", label: "Distance" },
                      { key: "favorites", label: "Favoris" },
                      { key: "popularity", label: "Popularité", disabled: true },
                      { key: "alphabetical", label: "Alphabétique" },
                    ],
                    field: "prefVenueSort",
                    back: "preferences",
                  },
                  storyDuration: {
                    icon: <NavIcon name="clock" size={22} color={COLORS.amber} />,
                    title: "Durée d'affichage à la lecture",
                    options: [
                      { key: 5, label: "5 secondes" },
                      { key: 7, label: "7 secondes" },
                      { key: 10, label: "10 secondes" },
                    ],
                    field: "storyViewDurationSeconds",
                    back: "preferencesStorySettings",
                  },
                };
                const cfg = configs[viewedChoiceKey];
                if (!cfg) return null;
                return (
                  <ChoiceScreen
                    icon={cfg.icon}
                    title={cfg.title}
                    options={cfg.options}
                    value={cfg.field ? profile[cfg.field] : cfg.value}
                    onChange={(v) => cfg.field && setProfile((p) => ({ ...p, [cfg.field]: v }))}
                    onBack={() => setScreen(cfg.back)}
                  />
                );
              })()}
            {screen === "security" && (
              <SecurityScreen
                session={session}
                onBack={() => setScreen("settings")}
                goToSubScreen={(sub) => {
                  const realScreens = {
                    password: "securityPassword",
                    emailVerify: "securityEmailVerify",
                    resetSessions: "securityResetSessions",
                    publicProfile: "securityPublicProfile",
                    myStats: "securityMyStats",
                    storyTagsPrivacy: "securityStoryTagsPrivacy",
                    blockedUsers: "securityBlockedUsers",
                    permissions: "securityPermissions",
                  };
                  if (realScreens[sub]) {
                    setScreen(realScreens[sub]);
                    return;
                  }
                  setViewedSecuritySub(sub);
                  setScreen("securityComingSoon");
                }}
              />
            )}
            {screen === "securityPassword" && <PasswordChangeScreen onBack={() => setScreen("security")} />}
            {screen === "securityEmailVerify" && <EmailVerifyScreen session={session} onBack={() => setScreen("security")} />}
            {screen === "securityResetSessions" && <ResetSessionsScreen onBack={() => setScreen("security")} />}
            {screen === "securityDataExport" && <DataExportScreen profile={profile} onBack={() => setScreen("securityPermissions")} />}
            {screen === "securityPublicProfile" && (
              <PublicProfileScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("security")} />
            )}
            {screen === "securityMyStats" && (
              <MyStatsPrivacyScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("security")} />
            )}
            {screen === "securityStoryTagsPrivacy" && (
              <StoryTagsPrivacyScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("security")} />
            )}
            {screen === "securityBlockedUsers" && <BlockedUsersScreen onBack={() => setScreen("security")} />}
            {screen === "securityPermissions" && (
              <PermissionsScreen
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("security")}
                goToDataExport={() => setScreen("securityDataExport")}
              />
            )}
            {screen === "securityComingSoon" && (
              <SettingsComingSoonScreen
                icon={
                  <NavIcon
                    name={
                      {
                        biometric: "faceid",
                        publicProfile: "eye",
                        checkinVisibility: "map-pin-check",
                        bibaxVisibility: "users",
                        bibaxInvites: "user-plus",
                        blockedUsers: "no-entry",
                        devices: "smartphone",
                        permissions: "check",
                      }[viewedSecuritySub] || "lock"
                    }
                    size={22}
                    color={COLORS.amber}
                  />
                }
                title={
                  {
                    biometric: "Connexion biométrique",
                    publicProfile: "Profil public",
                    checkinVisibility: "Visibilité des check-ins",
                    bibaxVisibility: "Visibilité des Bibax",
                    bibaxInvites: "Invitations Bibax",
                    blockedUsers: "Utilisateurs bloqués",
                    devices: "Appareils connectés",
                    permissions: "Permissions & consentements",
                  }[viewedSecuritySub] || ""
                }
                onBack={() => setScreen("security")}
              />
            )}
            {screen === "settingsCategory" && (
              <SettingsComingSoonScreen
                icon={
                  <NavIcon
                    name={
                      {
                        notifications: "bell",
                        preferences: "sliders",
                        appearance: "brush",
                        connect: "link",
                        help: "help-circle",
                        about: "info",
                        features: "grid",
                      }[viewedSettingsCategory] || "settings"
                    }
                    size={22}
                    color={COLORS.amber}
                  />
                }
                title={
                  {
                    account: "Compte",
                    security: "Sécurité & confidentialité",
                    notifications: "Notifications",
                    preferences: "Préférences",
                    appearance: "Apparence",
                    connect: "Connecter",
                    help: "Aide & support",
                    about: "À propos",
                    features: "Fonctionnalités",
                  }[viewedSettingsCategory] || ""
                }
                onBack={() => setScreen("settings")}
              />
            )}
            {screen === "account" && (
              <AccountScreen
                myName={profile.name}
                profile={profile}
                myUserId={session.user.id}
                onOpenMyStory={setViewedStoryAuthor}
                onBack={() => setScreen("settings")}
                goToField={(field) => {
                  setViewedAccountField(field);
                  const socialKeys = ["whatsapp", "facebook", "instagram", "tiktok", "snapchat", "x", "threads", "linkedin", "pinterest", "twitch"];
                  setScreen(
                    field === "location"
                      ? "accountLocation"
                      : field === "photo"
                      ? "accountPhoto"
                      : field === "email"
                      ? "accountEmail"
                      : field === "phone"
                      ? "accountPhone"
                      : field === "gender"
                      ? "accountGender"
                      : socialKeys.includes(field)
                      ? "accountSocial"
                      : "accountField"
                  );
                }}
                goToDeactivate={() => setScreen("accountDeactivate")}
                goToDeleteAccount={() => setScreen("deleteAccount")}
              />
            )}
            {screen === "accountField" && (
              <FieldEditScreen
                field={viewedAccountField}
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("account")}
              />
            )}
            {screen === "accountGender" && (
              <GenderEditScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("account")} />
            )}
            {screen === "accountLocation" && (
              <LocationEditScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("account")} />
            )}
            {screen === "accountEmail" && <EmailViewScreen profile={profile} onBack={() => setScreen("account")} />}
            {screen === "accountPhone" && (
              <PhoneEditScreen profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("account")} />
            )}
            {screen === "accountSocial" && (
              <SocialLinkEditScreen field={viewedAccountField} profile={profile} onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))} onBack={() => setScreen("account")} />
            )}
            {screen === "accountPhoto" && (
              <PhotoEditScreen
                profile={profile}
                onUploadPhoto={(file) => uploadMyAvatarPhoto(session.user.id, file)}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onBack={() => setScreen("account")}
              />
            )}
            {screen === "accountDeactivate" && <DeactivateAccountScreen onBack={() => setScreen("account")} />}
            {screen === "deleteAccount" && <DeleteAccountScreen onBack={() => setScreen("settings")} onAccountDeleted={handleAccountDeleted} />}
            {screen === "importData" && (
              <ImportDataScreen
                onBack={async () => {
                  setBreweriesDirectory(await loadBreweriesDirectory());
                  setBrandsDirectory(await loadBrandsDirectory());
                  setScreen("settings");
                }}
              />
            )}
            {screen === "eventHistory" && (
              <EventHistoryScreen
                myName={profile.name}
                profile={profile}
                bibros={bibros}
                checkIns={checkIns}
                events={events}
                displayTotalFor={() => 0}
                onBack={() => setScreen("profile")}
                openEvent={(id) => {
                  setViewedHistoryEventId(id);
                  setScreen("eventHistoryDetail");
                }}
                onDeleteEvent={deleteEvent}
              />
            )}
            {screen === "eventHistoryDetail" && (
              <EventHistoryDetailScreen
                event={events.find((e) => e.id === viewedHistoryEventId)}
                displayTotal={0}
                roundsSum={(events.find((e) => e.id === viewedHistoryEventId)?.rounds || []).reduce((s, r) => s + (r.total || 0), 0)}
                onBack={() => setScreen("eventHistory")}
                openVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                onReopen={() => {
                  reopenEvent(viewedHistoryEventId);
                  setActiveEventId(viewedHistoryEventId);
                  setScreen("eventDashboard");
                }}
                onDelete={() => {
                  deleteEvent(viewedHistoryEventId);
                  setScreen("eventHistory");
                }}
                onDeleteRound={(roundId) => deleteRound(viewedHistoryEventId, roundId)}
              />
            )}
            {screen === "myProducts" && (
              <MyProductsHubScreen
                ratedCount={myRatedCount}
                toTryCount={wishlistDrinkIds.length}
                onBack={() => setScreen("profile")}
                goToRated={() => setScreen("drinksDirectory")}
                goToToTry={() => setScreen("drinksDirectory")}
              />
            )}
            {screen === "eventSettings" && currentEvent && (
              <EventSettingsScreen
                event={currentEvent}
                venues={myFavoriteVenues}
                onResolvePublicVenue={(publicVenueOrDraft) => publicVenueOrDraft}
                onSave={async (mode, currency, jetonUnitValue, selectedVenueId) => {
                  const currentVenueRef = currentEvent.isHome ? "@home" : currentEvent.venueId === "@event" ? "@event" : currentEvent.venueId || null;
                  const isHome = selectedVenueId === "@home";
                  const isEventPlace = selectedVenueId === "@event";
                  let venue = null;
                  let venueDrinks = [];
                  if (selectedVenueId !== currentVenueRef) {
                    venue = selectedVenueId && !isHome && !isEventPlace ? (await loadVenuesByIds([selectedVenueId]))[0] || null : null;
                    const venueDrinkIds = [...new Set((venue?.menu || []).filter((d) => d.fromDirectory && d.sourceDrinkId).map((d) => d.sourceDrinkId))];
                    venueDrinks = venueDrinkIds.length > 0 ? await loadDrinksByIds(venueDrinkIds) : [];
                  }
                  updateEvent(activeEventId, (e) => {
                    if (selectedVenueId === currentVenueRef) {
                      // Lieu inchangé — on ne touche pas à la carte déjà en place.
                      return { ...e, mode, currency, jetonUnitValue };
                    }
                    const menu =
                      venue && venue.menu && venue.menu.length
                        ? venue.menu.map((d) => ({ ...resolveMenuItem(d, venueDrinks), id: `local-${Date.now()}-${Math.random()}` }))
                        : [];
                    return {
                      ...e,
                      mode,
                      currency,
                      jetonUnitValue,
                      venueId: isHome ? null : selectedVenueId || null,
                      isHome,
                      menu,
                    };
                  });
                  setScreen("eventDashboard");
                }}
                onBack={() => setScreen("eventDashboard")}
              />
            )}
            {screen === "waterAlertSettings" && currentEvent && (
              <WaterAlertSettingsScreen
                event={currentEvent}
                onSave={(waterAlert) => {
                  updateEvent(activeEventId, (e) => ({ ...e, waterAlert }));
                  setScreen("eventDashboard");
                }}
                onBack={() => setScreen("eventDashboard")}
              />
            )}
            {screen === "breweries" && (
              <BreweriesAdminScreen
                breweries={breweriesDirectory}
                isAdmin={!!profile.isAdmin}
                onBack={() => setScreen("repertoireHub")}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
                onRename={(id, name) => {
                  updateBrewery(id, { name });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
                }}
                onSetCountry={(id, country) => {
                  updateBrewery(id, { country });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === id ? { ...b, country } : b)));
                }}
                onSuggestEdit={suggestBreweryEdit}
                onCreate={registerBrewery}
                onCertify={(id) => {
                  updateBrewery(id, { status: "complete" });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === id ? { ...b, status: "complete" } : b)));
                }}
                onDelete={(id) => {
                  deleteBrewery(id);
                  setBreweriesDirectory((prev) => prev.filter((b) => b.id !== id));
                }}
                onRefresh={async () => setBreweriesDirectory(await loadBreweriesDirectory())}
              />
            )}
            {screen === "breweryDirectory" && (
              <BreweryDirectoryScreen
                myBreweries={[]}
                isAdmin={!!profile.isAdmin}
                onBack={() => setScreen("repertoireHub")}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
                activeCountry={activeBreweryCountry}
                setActiveCountry={setActiveBreweryCountry}
                goToSubmit={() => setScreen("submitBrewery")}
              />
            )}
            {screen === "submitBrewery" && (
              <SubmitBreweryWizardScreen
                breweriesDirectory={breweriesDirectory}
                onDone={(createdId) => {
                  emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "brewery", entityId: createdId });
                  setScreen("breweryDirectory");
                }}
                onCancel={() => setScreen("breweryDirectory")}
              />
            )}
            {screen === "brandDirectory" && (
              <BrandDirectoryScreen
                myBrands={[]}
                isAdmin={!!profile.isAdmin}
                onBack={() => setScreen("repertoireHub")}
                onOpenBrand={(id) => {
                  setViewedBrandId(id);
                  setScreen("brandDetail");
                }}
                activeCountry={activeBrandCountry}
                setActiveCountry={setActiveBrandCountry}
                goToSubmit={() => setScreen("submitBrand")}
              />
            )}
            {screen === "submitBrand" && (
              <SubmitBrandWizardScreen
                brandsDirectory={brandsDirectory}
                breweriesDirectory={breweriesDirectory}
                onDone={(createdId) => {
                  emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "brand", entityId: createdId });
                  setScreen("brandDirectory");
                }}
                onCancel={() => setScreen("brandDirectory")}
              />
            )}
            {screen === "brands" && (
              <BrandsAdminScreen
                brands={brandsDirectory}
                isAdmin={!!profile.isAdmin}
                onBack={() => setScreen("repertoireHub")}
                onOpenBrand={(id) => {
                  setViewedBrandId(id);
                  setScreen("brandDetail");
                }}
                onRename={(id, name) => {
                  updateBrand(id, { name });
                  setBrandsDirectory((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
                }}
                onSuggestEdit={suggestBrandEdit}
                onCreate={registerBrand}
                onCertify={(id) => {
                  updateBrand(id, { status: "complete" });
                  setBrandsDirectory((prev) => prev.map((b) => (b.id === id ? { ...b, status: "complete" } : b)));
                }}
                onDelete={(id) => {
                  deleteBrand(id);
                  setBrandsDirectory((prev) => prev.filter((b) => b.id !== id));
                }}
                onRefresh={async () => setBrandsDirectory(await loadBrandsDirectory())}
              />
            )}
            {screen === "breweryDetail" && (
              <BreweryDetailScreen
                brewery={resolveEntity(breweriesDirectory, viewedBreweryId)}
                breweriesDirectory={breweriesDirectory}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                onBack={() => {
                  if (storyResumeState) {
                    setViewedStoryAuthor(storyResumeState.stories);
                    setStoryResumeState(null);
                    setScreen("home");
                  } else {
                    setScreen("breweryDirectory");
                  }
                }}
                onOpenDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onOpenBrand={(id) => {
                  setViewedBrandId(id);
                  setScreen("brandDetail");
                }}
                onOpenVenue={(id) => {
                  setViewedVenueId(id);
                  setScreenBeforeVenueDetail("breweryDetail");
                  setScreen("venueDetail");
                }}
                onSuggestEdit={(name, country) => suggestBreweryEdit(viewedBreweryId, name, country)}
                pendingContributions={viewedBreweryContributions}
                onApproveContribution={approveBreweryContribution}
                onRejectContribution={rejectBreweryContribution}
                onCertify={() => {
                  updateBrewery(viewedBreweryId, { status: "complete" });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === viewedBreweryId ? { ...b, status: "complete" } : b)));
                }}
                onDelete={() => {
                  deleteBrewery(viewedBreweryId);
                  setBreweriesDirectory((prev) => prev.filter((b) => b.id !== viewedBreweryId));
                  setScreen("breweryDirectory");
                }}
              />
            )}
            {screen === "brandDetail" && (
              <BrandDetailScreen
                brand={resolveEntity(brandsDirectory, viewedBrandId)}
                brandsDirectory={brandsDirectory}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                onBack={() => {
                  if (storyResumeState) {
                    setViewedStoryAuthor(storyResumeState.stories);
                    setStoryResumeState(null);
                    setScreen("home");
                  } else {
                    setScreen("brandDirectory");
                  }
                }}
                onOpenDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onOpenBrewery={(id) => {
                  setViewedBreweryId(id);
                  setScreen("breweryDetail");
                }}
                onSuggestEdit={(name) => suggestBrandEdit(viewedBrandId, name)}
                pendingContributions={viewedBrandContributions}
                onApproveContribution={approveBrandContribution}
                onRejectContribution={rejectBrandContribution}
                onCertify={() => {
                  updateBrand(viewedBrandId, { status: "complete" });
                  setBrandsDirectory((prev) => prev.map((b) => (b.id === viewedBrandId ? { ...b, status: "complete" } : b)));
                }}
                onDelete={() => {
                  deleteBrand(viewedBrandId);
                  setBrandsDirectory((prev) => prev.filter((b) => b.id !== viewedBrandId));
                  setScreen("brandDirectory");
                }}
              />
            )}
            {screen === "bibrosList" && (
              <BibrosListScreen
                myName={profile.name}
                profile={profile}
                checkIns={checkIns}
                myBibroCode={profile.myBibroCode}
                bibros={bibros}
                bibroStatuses={{}}
                goToAddBibro={() => setScreen("addBibro")}
                onBibaxAdded={() => {
                  loadMyBibax().then((confirmed) => {
                    setBibros((prev) => {
                      const byCode = new Map(prev.map((b) => [b.code, b]));
                      confirmed.forEach((c) => {
                        if (!c.bibroCode) return;
                        const existing = byCode.get(c.bibroCode);
                        byCode.set(c.bibroCode, {
                          ...existing,
                          code: c.bibroCode,
                          name: c.name,
                          firstName: c.name,
                          lastName: c.lastName || "",
                          nickname: c.nickname || "",
                          avatarUrl: c.avatarUrl || null,
                          city: c.city || "",
                          locality: c.locality || "",
                          alias: existing?.alias || "",
                          addedAt: existing?.addedAt || Date.now(),
                        });
                      });
                      return Array.from(byCode.values());
                    });
                  });
                }}
                onOpenBibaxProfile={(code) => {
                  setViewedBibaxProfileCode(code);
                  setScreen("bibaxProfilePreview");
                }}
                onSeeAllSuggestions={() => {
                  setScreenBeforeBibaxSuggestions("bibrosList");
                  setScreen("bibaxAllSuggestions");
                }}
                onRemoveBibro={removeBibro}
                onSetAlias={setBibroAlias}
                onToggleFavorite={toggleBibroFavorite}
                onJoinSalon={joinSalon}
                onViewBibro={(code) => {
                  setViewedBibroId(code);
                  setScreen("bibroDetail");
                }}
                onBack={() => setScreen("profile")}
              />
            )}
            {screen === "bibroDetail" && (
              <BibroDetailScreen
                bibro={bibros.find((b) => b.code === viewedBibroId)}
                myUserId={session.user.id}
                onBack={() => setScreen("bibrosList")}
                previewNotice={false}
                onRemove={() => {
                  removeBibro(viewedBibroId);
                  setScreen("bibrosList");
                }}
                goToBibaxPhotos={(userId, name) => {
                  setViewedBibaxPhotos({ userId, name });
                  setScreen("bibaxPhotos");
                }}
                onBlock={async (userId) => {
                  const result = await blockUser(userId);
                  if (result?.error) {
                    alert(result.error);
                    return;
                  }
                  setBibros((prev) => prev.filter((b) => b.userId !== userId));
                  setScreen("bibrosList");
                }}
                onOpenStoryAuthor={setViewedStoryAuthor}
                onViewMutualBibax={async (userId, name) => {
                  const list = await loadMutualBibaxList(userId);
                  setMutualBibaxData({ list, name });
                  setScreen("mutualBibax");
                }}
                goToBibroStats={() => setScreen("bibroStats")}
                goToBibroMedia={() => {
                  const bibro = bibros.find((b) => b.code === viewedBibroId);
                  setViewedBibaxPhotos({ userId: bibro?.userId, name: bibro?.name });
                  setScreen("bibaxPhotos");
                }}
                goToBibroClub={() => setScreen("bibroClub")}
                goToBibroHistory={() => setScreen("bibroHistory")}
                goToBibroPulse={() => setScreen("bibroPulse")}
              />
            )}
            {screen === "bibroStats" && (
              <BibroStatsScreen bibro={bibros.find((b) => b.code === viewedBibroId)} onBack={() => setScreen("bibroDetail")} />
            )}
            {screen === "bibroPulse" && (
              <BibroPulseScreen bibro={bibros.find((b) => b.code === viewedBibroId)} onBack={() => setScreen("bibroDetail")} />
            )}
            {screen === "bibroClub" && (
              <SettingsComingSoonScreen title="BibaClub" onBack={() => setScreen("bibroDetail")} />
            )}
            {screen === "bibroHistory" && (
              <SettingsComingSoonScreen title="Historique" onBack={() => setScreen("bibroDetail")} />
            )}
            {screen === "mutualBibax" && (
              <MutualBibaxScreen
                bibros={mutualBibaxData?.list || []}
                bibroName={mutualBibaxData?.name}
                onBack={() => setScreen("bibroDetail")}
                onViewBibro={(code) => {
                  setViewedBibroId(code);
                  setScreen("bibroDetail");
                }}
                onOpenStoryAuthor={setViewedStoryAuthor}
              />
            )}
            {screen === "bibaxPhotos" && (
              <MyPhotosScreen otherUserId={viewedBibaxPhotos?.userId} otherName={viewedBibaxPhotos?.name} onBack={() => setScreen("bibroDetail")} />
            )}
            {screen === "addBibro" && (
              <AddBibroScreen
                onAdd={addBibro}
                onLookup={lookupBibroCode}
                onCancel={() => setScreen("bibrosList")}
                myBibroCode={profile.myBibroCode}
                bibros={bibros}
              />
            )}
            {screen === "adminUnlock" && (
              <AdminUnlockScreen
                onCancel={() => setScreen("myInfo")}
              />
            )}
            {screen === "bibaMeet" && (
              <ComingSoonScreen
                onBack={() => setScreen("home")}
                title={screen}
                icon="bibamusic"
                description="Cette fonctionnalité arrive dans un prochain bloc de la migration."
              />
            )}
            {screen === "games" && (
              <BibaPlayHubScreen
                onBack={() => setScreen("home")}
                onSelectPredict={() => (bibaPlayLinkedSalonCode ? goToBibaPlayFromSalonFn() : setScreen("predictHub"))}
              />
            )}
            {screen === "predictHub" && (
              <PredictHubScreen
                onBack={() => setScreen("games")}
                onCreate={(testMode) => createPredictGameFn(null, testMode)}
                onJoin={joinPredictGameFn}
              />
            )}
            {screen === "predictGame" && activePredictGame && (
              <PredictGameScreen
                game={activePredictGame}
                myBibroCode={profile.myBibroCode}
                onBack={() => {
                  setActivePredictGame(null);
                  setScreen(screenBeforePredict);
                }}
                onStart={startPredictGameFn}
                onLaunchPrediction={launchPredictionFn}
                onSubmitAnswer={submitPredictAnswerFn}
                onBotAnswer={(choiceId) => submitPredictAnswerFn(choiceId, "__test_bot__")}
                onRemoveParticipant={removePredictParticipantFn}
                onLeave={leavePredictGameFn}
                onResolvePrediction={resolvePredictionFn}
              />
            )}
                        {screen === "bibaPing" && (
              <BibaPingScreen
                myUserId={session.user.id}
                onBack={() => setScreen("home")}
                onOpenConversation={(id) => console.log("conversation", id)}
              />
            )}
              {screen === "bibaPulse" && (
              <BibaPulseScreen
                onBack={() => {
                  setFocusPulseEntry(null);
                  setScreen("home");
                }}
                breweriesDirectory={breweriesDirectory}
                brandsDirectory={brandsDirectory}
                focusEntryId={focusPulseEntry?.id}
                openCommentsOnFocus={focusPulseEntry?.openComments}
                onOpenVenue={(id) => {
                  setScreenBeforeVenueDetail("bibaPulse");
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("bibaPulse");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
              />
            )}
            {screen === "bibaxAllSuggestions" && (
              <BibaxAllSuggestionsScreen
                onBack={() => setScreen(screenBeforeBibaxSuggestions)}
                onOpenProfile={(code) => {
                  setViewedBibaxProfileCode(code);
                  setScreen("bibaxProfilePreview");
                }}
              />
            )}
            {screen === "bibaSolo" && (
              <BibaSoloScreen
                myUserId={session.user.id}
                myBibroCode={profile.myBibroCode}
                onRateDrink={rateDrinkStandalone}
                onUnrateDrink={unrateDrinkStandalone}
                onOpenDrink={(id) => {
                  setScreenBeforeDrinkDetail("bibaSolo");
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onBack={() => setScreen(screenBeforeBibaSolo)}
              />
            )}
            {screen === "notificationsFeed" && (
              <NotificationsFeedScreen
                onBack={() => setScreen("home")}
                onRespondSalonInvite={respondSalonInviteFn}
                onOpenPulseEntry={(entryId, openComments) => {
                  setFocusPulseEntry({ id: entryId, openComments: !!openComments });
                  setScreen("bibaPulse");
                }}
                onOpenBibaxProfile={(code) => {
                  setViewedBibaxProfileCode(code);
                  setScreen("bibaxProfilePreview");
                }}
              />
            )}
            {screen === "bibaxProfilePreview" && viewedBibaxProfileCode && (
              <BibaxProfilePreviewScreen
                bibroCode={viewedBibaxProfileCode}
                onBack={() => {
                  if (storyResumeState) {
                    setViewedStoryAuthor(storyResumeState.stories);
                    setStoryResumeState(null);
                    setScreen("home");
                  } else {
                    setScreen("home");
                  }
                }}
              />
            )}
            {screen === "storyCreate" && storyCreateContext && (
              <StoryCreateScreen
                contextType={storyCreateContext.contextType}
                contextId={storyCreateContext.contextId}
                venueName={
                  storyCreateContext.contextType === "room"
                    ? venuesById[events.find((e) => e.salonCode === storyCreateContext.contextId)?.venueId]?.name || null
                    : null
                }
                myUserId={session.user.id}
                onBack={() => setScreen(storyCreateContext.returnScreen)}
                onPublished={() => {
                  setPulseStoriesRefreshKey((k) => k + 1);
                  setScreen(storyCreateContext.returnScreen);
                }}
              />
            )}
            {!["home", "sessionHub", "repertoireHub", "venueDirectory", "venueMap", "breweryDirectory", "brandDirectory", "bibaPulse", "bibaPing", "bibaxAllSuggestions", "bibaxProfilePreview", "storyCreate", "games", "predictHub", "predictGame", "bibaMeet", "newSalonEvent", "joinSalon", "eventDashboard", "drinkCheck", "bibaMusic", "roundCompose", "roundTicket", "menuSetup", "drinksDirectory", "submitVenue", "submitDrink", "submitBrewery", "submitBrand", "venueDetail", "venueMenuCategories", "venueCategoryDrinks", "drinkDetail", "profile", "myInfo", "myPhotos", "bibaxPhotos", "myStats", "settings", "settingsCategory", "notifications", "notificationsEmailSummary", "appearance", "connect", "connectSpotify", "help", "helpContact", "helpReport", "helpAbout", "search", "notificationsFeed", "bibaSolo", "bibaClubsList", "createClub", "clubDetail", "preferences", "preferencesStorySettings", "preferencesVolumeWeight", "preferencesChoice", "account", "accountField", "accountLocation", "accountEmail", "accountPhone", "accountSocial", "accountPhoto", "accountDeactivate", "security", "securityPassword", "securityEmailVerify", "securityResetSessions", "securityDataExport", "securityPublicProfile", "securityStoryTagsPrivacy", "securityBlockedUsers", "securityPermissions", "securityComingSoon", "eventHistory", "myProducts", "eventSettings", "waterAlertSettings", "breweries", "brands", "bibrosList", "bibroDetail", "bibroStats", "bibroPulse", "bibroClub", "bibroHistory", "mutualBibax", "addBibro", "adminUnlock", "deleteAccount", "editDrink", "editVenue", "breweryDetail", "brandDetail", "importData"].includes(screen) && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8792A6" }}>
                Écran "{screen}" — à venir dans un prochain bloc.
                <br />
                <button onClick={() => setScreen("home")} style={{ marginTop: "16px", background: "#39FF66", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
                  Retour à l'accueil
                </button>
              </div>
            )}
            </div>
            <BottomNav screen={screen} onNavigate={setScreen} onGoToSessionHub={() => setScreen("sessionHub")} unreadNotifications={unreadNotificationsCount} />
          </div>
        </div>
      </ProfileNavContext.Provider>
      {showBarcodeScanner && (
        <BarcodeScannerModal
          myBibroCode={profile.myBibroCode}
          onClose={() => {
            setShowBarcodeScanner(false);
            setScanMode("direct");
          }}
          onFoundDrink={async (drinkId) => {
            setShowBarcodeScanner(false);
            if (scanMode === "linked") {
              setScanMode("direct");
              const linked = await loadDrinkLinkedEntities(drinkId);
              setLinkedScanResults(linked);
            } else {
              setViewedDrinkId(drinkId);
              setScreen("drinkDetail");
            }
          }}
        />
      )}
      {linkedScanResults && (
        <LinkedScanResultsModal
          results={linkedScanResults}
          onClose={() => setLinkedScanResults(null)}
          onSelect={(kind, id) => {
            setLinkedScanResults(null);
            if (kind === "drink") {
              setViewedDrinkId(id);
              setScreen("drinkDetail");
            } else if (kind === "brand") {
              setViewedBrandId(id);
              setScreen("brandDetail");
            } else if (kind === "producer") {
              setViewedBreweryId(id);
              setScreen("breweryDetail");
            }
          }}
        />
      )}
      {viewedStoryAuthor && (
        <StoryViewer
          stories={viewedStoryAuthor}
          myUserId={session.user.id}
          onClose={() => setViewedStoryAuthor(null)}
          onChanged={() => setPulseStoriesRefreshKey((k) => k + 1)}
          initialIndex={storyResumeState?.index ?? 0}
          onOpenTag={(entityType, entityId, index) => {
            setStoryResumeState({ stories: viewedStoryAuthor, index });
            setViewedStoryAuthor(null);
            if (entityType === "bibax") {
              setViewedBibaxProfileCode(entityId);
              setScreen("bibaxProfilePreview");
            } else if (entityType === "venue") {
              setViewedVenueId(entityId);
              setScreen("venueDetail");
            } else if (entityType === "drink") {
              setViewedDrinkId(entityId);
              setScreen("drinkDetail");
            } else if (entityType === "brand") {
              setViewedBrandId(entityId);
              setScreen("brandDetail");
            } else if (entityType === "producer") {
              setViewedBreweryId(entityId);
              setScreen("breweryDetail");
            }
          }}
        />
      )}
    </NavigationContext.Provider>
  );
}
