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
import { BibamusLogoFull } from "./components/icons.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { SessionHubScreen, RepertoireHubScreen, ComingSoonScreen } from "./components/HubScreens.jsx";
import { VenueDirectoryScreen } from "./components/VenueDirectoryScreen.jsx";
import { EventDashboardScreen } from "./components/EventDashboardScreen.jsx";
import { RoundComposeScreen } from "./components/RoundComposeScreen.jsx";
import { RoundTicketScreen } from "./components/RoundTicketScreen.jsx";
import { NewEventScreen } from "./components/NewEventScreen.jsx";
import { JoinSalonScreen } from "./components/JoinSalonScreen.jsx";
import { MenuSetupScreen } from "./components/MenuSetupScreen.jsx";
import { DrinksDirectoryScreen } from "./components/DrinksDirectoryScreen.jsx";
import { DrinkFormScreen } from "./components/DrinkFormScreen.jsx";
import { DirectoryVenueFormScreen } from "./components/DirectoryVenueFormScreen.jsx";
import { VenueDetailScreen } from "./components/VenueDetailScreen.jsx";
import { DrinkDetailScreen } from "./components/DrinkDetailScreen.jsx";
import { ProfileHubScreen } from "./components/ProfileHubScreen.jsx";
import { MyProfileScreen } from "./components/MyProfileScreen.jsx";
import { MyStatsScreen } from "./components/MyStatsScreen.jsx";
import { SettingsScreen, EventHistoryScreen, MyProductsHubScreen, EventSettingsScreen } from "./components/MinorScreens.jsx";
import { EventHistoryDetailScreen } from "./components/EventHistoryDetailScreen.jsx";
import { BreweriesAdminScreen, BrandsAdminScreen } from "./components/BreweriesAndBrandsScreens.jsx";
import { BreweryDetailScreen, BrandDetailScreen } from "./components/BreweryBrandDetailScreens.jsx";
import { ImportDataScreen } from "./components/ImportDataScreen.jsx";
import { BibrosListScreen, BibroDetailScreen, AddBibroScreen, AdminUnlockScreen } from "./components/BibrosScreens.jsx";
import { DeleteAccountScreen } from "./components/DeleteAccountScreen.jsx";
import {
  loadPublicVenues,
  loadDrinksDirectory,
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
  emitEvent,
  updateMyProfile,
  signOut,
  loadContributionsForEntity,
  approveContribution,
  rejectContribution,
} from "./data/sharedDirectories.js";
import { loadSalon, createSalon, saveSalon, subscribeToSalon } from "./data/salons.js";
import { randomCode, computeDrinkDiff, todayISO, normalizeEvent, nextId, resolveMenuItem, kcalForDrink } from "./utils.js";
import { BEER_TYPES } from "./constants.js";

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

  // Répertoires partagés (Supabase)
  const [venues, setVenues] = useState([]);
  const [drinksDirectory, setDrinksDirectory] = useState([]);
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

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [v, d, b, m] = await Promise.all([
        loadPublicVenues(),
        loadDrinksDirectory(),
        loadBreweriesDirectory(),
        loadBrandsDirectory(),
      ]);
      setVenues(v);
      setDrinksDirectory(d);
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
      username: profile.username,
      displayNameField: profile.displayNameField,
      sharePrenom: profile.sharePrenom,
      shareNom: profile.shareNom,
      shareSurnom: profile.shareSurnom,
      avatarUrl: profile.avatarUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.lastName, profile.nickname, profile.username, profile.displayNameField, profile.sharePrenom, profile.shareNom, profile.shareSurnom, profile.avatarUrl]);
  useEffect(() => saveLocal("bibamus-events", events), [events]);
  useEffect(() => saveLocal("bibamus-bibros", bibros), [bibros]);

  const [activeCountry, setActiveCountry] = useState(null);
  const [activeCity, setActiveCity] = useState(null);

  const [activeEventId, setActiveEventId] = useState(null);
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
          // Fusionne les participants par union plutôt que d'écraser — une mise à jour arrivée
          // dans le mauvais ordre (course entre deux appareils qui rejoignent en même temps) ne
          // peut alors plus faire "disparaître" quelqu'un qui vient vraiment de rejoindre.
          const merged = { ...e, ...updatedData };
          const byCode = new Map();
          [...(e.participants || []), ...(updatedData.participants || [])].forEach((p) => {
            if (p && p.code) byCode.set(p.code, { ...byCode.get(p.code), ...p });
          });
          merged.participants = Array.from(byCode.values());
          return normalizeEvent(merged);
        })
      );
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.salonCode]);

  const startNewRound = () => {
    const selfEntry = { id: "self", name: profile.name, isSelf: true, code: profile.myBibroCode };
    const rounds = currentEvent?.rounds || [];
    const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const lastOthers = lastRound ? lastRound.friends.filter((f) => !f.isSelf).map((f) => ({ id: nextId(), name: f.name, code: f.code || null })) : [];

    // Also pre-fill with any known participants not already covered by self/last round — easier
    // to remove someone skipping this particular round than to re-add everyone who's actually there.
    // Two sources of "known people": friends typed in manually at creation (knownFriends, names
    // only) and Bibax who joined the shared salon via its code (event.participants, with codes).
    const alreadyNamed = new Set([(profile.name || "").toLowerCase(), ...lastOthers.map((f) => f.name.toLowerCase())]);
    const alreadyCoded = new Set([profile.myBibroCode, ...lastOthers.map((f) => f.code).filter(Boolean)]);

    const knownExtras = (currentEvent?.knownFriends || [])
      .filter((n) => !alreadyNamed.has((n || "").toLowerCase()))
      .map((n) => ({ id: nextId(), name: n, code: null }));

    const salonExtras = (currentEvent?.participants || [])
      .filter((p) => !alreadyCoded.has(p.code) && !alreadyNamed.has((p.name || "").toLowerCase()))
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
      buyerName,
      tip,
      offeredBy,
      createdAt: Date.now(),
    };
    const otherFriends = draftFriends.filter((f) => !f.isSelf);
    const selfOrders = draftOrders
      .filter((o) => o.friendId === "self")
      .map((o) => ({ id: nextId(), drinkId: o.drinkId, timestamp: Date.now(), roundId: round.id }));
    updateEvent(activeEventId, (e) => ({
      ...e,
      rounds: [...e.rounds, round],
      knownFriends: Array.from(new Set([...(e.knownFriends || []), ...otherFriends.map((f) => f.name)])),
      personalOrders: [...(e.personalOrders || []), ...selfOrders],
    }));

    if (currentEvent && currentEvent.venueId && !currentEvent.isHome && currentEvent.venueId !== "@event") {
      const venue = venues.find((v) => v.id === currentEvent.venueId);
      if (venue) {
        const prevStats = venue.stats || {};
        const prevMoney = prevStats.moneySpent || { euro: 0, jeton: 0 };
        const amount = offeredBy ? 0 : finalAmount || 0;
        const newStats = {
          ...prevStats,
          drinksOrdered: (prevStats.drinksOrdered || 0) + draftOrders.length,
          moneySpent: { ...prevMoney, [currentEvent.currency]: (prevMoney[currentEvent.currency] || 0) + amount },
        };
        updatePublicVenue(venue.id, { stats: newStats });
        setVenues((prev) => prev.map((v) => (v.id === venue.id ? { ...v, stats: newStats } : v)));
      }
    }
    setScreen("eventDashboard");
  };

  const createEvent = async (name, currency, date, jetonUnitValue, venueId, mode, participants) => {
    const isSalon = screen === "newSalonEvent";
    const isHome = venueId === "@home";
    const isEventPlace = venueId === "@event";
    const venue = venueId && !isHome && !isEventPlace ? venues.find((v) => v.id === venueId) : null;
    const menu =
      venue && venue.menu && venue.menu.length
        ? venue.menu.map((d) => ({ ...resolveMenuItem(d, drinksDirectory), id: `local-${Date.now()}-${Math.random()}` }))
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
    };

    if (isSalon) {
      const code = randomCode(4);
      newEvent.salonCode = code;
      newEvent.participants = [{ code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() }];
      await createSalon(code, newEvent);
      emitEvent(EVENT_TYPES.BIBAROOM_CREATED, { actorBibroCode: profile.myBibroCode, entityType: "salon", entityId: newEvent.id, payload: { salonCode: code } });
    }

    if (venue) {
      const newStats = { ...(venue.stats || {}), visits: (venue.stats?.visits || 0) + 1 };
      updatePublicVenue(venue.id, { stats: newStats });
      setVenues((prev) => prev.map((v) => (v.id === venue.id ? { ...v, stats: newStats } : v)));
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
      : { ...normalized, participants: [...participants, { code: profile.myBibroCode, name: profile.name, joinedAt: Date.now() }] };
    if (!alreadyIn) {
      await saveSalon(code, withMe);
      emitEvent(EVENT_TYPES.BIBAROOM_JOINED, { actorBibroCode: profile.myBibroCode, entityType: "salon", entityId: withMe.id, payload: { salonCode: code } });
    }
    setEvents((prev) => (prev.some((e) => e.salonCode === code) ? prev : [...prev, withMe]));
    setActiveEventId(withMe.id);
    setScreen("eventDashboard");
  };

  // Met à jour un événement localement, et — si c'est un salon partagé — répercute aussi le
  // changement dans Supabase pour que les autres Bibax connectés le voient.
  const updateEvent = (id, updater) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = updater(e);
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
      setVenues((prev) => [...prev, created]);
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
    setDrinksDirectory((prev) => prev.map((d) => (d.id === drinkId ? { ...d, photoUrl: result.url } : d)));
  };

  const deletePhotoForDrink = (drinkId) => {
    updateDrink(drinkId, { photoUrl: null });
    setDrinksDirectory((prev) => prev.map((d) => (d.id === drinkId ? { ...d, photoUrl: null } : d)));
  };

  const submitDrink = async (drinkData) => {
    const created = await createDrink({ id: `drink-${Date.now()}-${Math.floor(Math.random() * 10000)}`, ...drinkData, status: "to_process" });
    if (created) {
      setDrinksDirectory((prev) => [...prev, created]);
      emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: created.id });
    } else {
      alert("La création du produit a échoué — merci de réessayer ou de contacter le support si le problème persiste.");
      return;
    }
    setScreen("drinksDirectory");
  };

  const [viewedVenueId, setViewedVenueId] = useState(null);
  const [viewedDrinkId, setViewedDrinkId] = useState(null);
  const [viewedHistoryEventId, setViewedHistoryEventId] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [checkIns] = useState([]);
  const [checkedInVenueId, setCheckedInVenueId] = useState(null);
  const [alcoholFreeDays, setAlcoholFreeDays] = useState(() => loadLocal("bibamus-alcohol-free-days", []));

  useEffect(() => saveLocal("bibamus-alcohol-free-days", alcoholFreeDays), [alcoholFreeDays]);

  const toggleAlcoholFreeDay = (dateKey) => {
    setAlcoholFreeDays((prev) => (prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey]));
  };

  const [tastedDrinkIds, setTastedDrinkIds] = useState(() => loadLocal("bibamus-tasted-drinks", []));
  const [wishlistDrinkIds, setWishlistDrinkIds] = useState(() => loadLocal("bibamus-wishlist-drinks", []));

  useEffect(() => saveLocal("bibamus-tasted-drinks", tastedDrinkIds), [tastedDrinkIds]);
  useEffect(() => saveLocal("bibamus-wishlist-drinks", wishlistDrinkIds), [wishlistDrinkIds]);

  const toggleTastedDrink = (id) => {
    setTastedDrinkIds((prev) => {
      const alreadyTasted = prev.includes(id);
      if (!alreadyTasted) emitEvent(EVENT_TYPES.DRINK_CHECKED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: id });
      return alreadyTasted ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };
  const toggleWishlistDrink = (id) => setWishlistDrinkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Note et modes goûtés : partagés sur la fiche du produit elle-même (comme dans le prototype
  // Claude) — chaque Bibax y ajoute sa propre entrée, indexée par son code personnel.
  const rateDrink = (drinkId, value) => {
    setDrinksDirectory((prev) =>
      prev.map((d) =>
        d.id === drinkId
          ? {
              ...d,
              ratings: { ...(d.ratings || {}), [profile.myBibroCode]: value },
              ratingDates: { ...(d.ratingDates || {}), [profile.myBibroCode]: Date.now() },
            }
          : d
      )
    );
    const drink = drinksDirectory.find((d) => d.id === drinkId);
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
    setDrinksDirectory((prev) =>
      prev.map((d) => {
        if (d.id !== drinkId) return d;
        const ratings = { ...(d.ratings || {}) };
        const ratingDates = { ...(d.ratingDates || {}) };
        const ratedServingModes = { ...(d.ratedServingModes || {}) };
        delete ratings[profile.myBibroCode];
        delete ratingDates[profile.myBibroCode];
        delete ratedServingModes[profile.myBibroCode];
        return { ...d, ratings, ratingDates, ratedServingModes };
      })
    );
    const drink = drinksDirectory.find((d) => d.id === drinkId);
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

  const toggleTastedServingMode = (drinkId, mode) => {
    const drink = drinksDirectory.find((d) => d.id === drinkId);
    if (!drink) return;
    const current = (drink.ratedServingModes && drink.ratedServingModes[profile.myBibroCode]) || [];
    const next = current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode];
    const ratedServingModes = { ...(drink.ratedServingModes || {}), [profile.myBibroCode]: next };
    setDrinksDirectory((prev) => prev.map((d) => (d.id === drinkId ? { ...d, ratedServingModes } : d)));
    updateDrink(drinkId, { ratedServingModes });
  };

  const [favoriteVenueIds, setFavoriteVenueIds] = useState(() => loadLocal("bibamus-favorite-venues", []));
  useEffect(() => saveLocal("bibamus-favorite-venues", favoriteVenueIds), [favoriteVenueIds]);
  const toggleVenueFavorite = (venueId) =>
    setFavoriteVenueIds((prev) => (prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]));

  const toggleVenueLike = (venueId) => {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    const likes = venue.likes || [];
    const alreadyLiked = likes.includes(profile.myBibroCode);
    const nextLikes = alreadyLiked ? likes.filter((c) => c !== profile.myBibroCode) : [...likes, profile.myBibroCode];
    if (!alreadyLiked) emitEvent(EVENT_TYPES.PRODUCT_LIKED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: venueId });
    setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, likes: nextLikes } : v)));
    updatePublicVenue(venueId, { likes: nextLikes });
  };

  const [viewedBibroId, setViewedBibroId] = useState(null);
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
    const drink = drinksDirectory.find((d) => d.id === id);
    if (!drink) return;
    const fields = computeDrinkDiff(drink, submittedData);
    if (Object.keys(fields).length === 0) return;
    await proposeContribution("drink", id, fields, drink, profile.myBibroCode || null);
    setDrinksDirectory((prev) => prev.map((d) => (d.id === id ? { ...d, pendingContributionsCount: (d.pendingContributionsCount || 0) + Object.keys(fields).length } : d)));
  };

  const refreshViewedDrinkContributions = async (id) => {
    const list = await loadContributionsForEntity("drink", id);
    setViewedDrinkContributions(list);
  };

  const approveDrinkContribution = async (contribution) => {
    await approveContribution(contribution, profile.myBibroCode || null);
    emitEvent(EVENT_TYPES.CONTRIBUTION_APPROVED, { actorBibroCode: profile.myBibroCode, entityType: "drink", entityId: contribution.entityId, payload: { fieldPath: contribution.fieldPath } });
    setDrinksDirectory((prev) => prev.map((d) => (d.id === contribution.entityId ? { ...d, [contribution.fieldPath]: contribution.proposedValue, pendingContributionsCount: Math.max(0, (d.pendingContributionsCount || 0) - 1) } : d)));
    await refreshViewedDrinkContributions(contribution.entityId);
  };

  const rejectDrinkContribution = async (contribution) => {
    await rejectContribution(contribution, profile.myBibroCode || null);
    setDrinksDirectory((prev) => prev.map((d) => (d.id === contribution.entityId ? { ...d, pendingContributionsCount: Math.max(0, (d.pendingContributionsCount || 0) - 1) } : d)));
    await refreshViewedDrinkContributions(contribution.entityId);
  };

  const certifyDrink = (id) => {
    updateDrink(id, { status: "complete" });
    setDrinksDirectory((prev) => prev.map((d) => (d.id === id ? { ...d, status: "complete" } : d)));
  };
  const decertifyDrink = (id) => {
    updateDrink(id, { status: "to_process" });
    setDrinksDirectory((prev) => prev.map((d) => (d.id === id ? { ...d, status: "to_process" } : d)));
  };
  const removeDrinkFromDirectory = (id) => {
    deleteDrink(id);
    setDrinksDirectory((prev) => prev.filter((d) => d.id !== id));
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
  };

  const editRound = (eventId, roundId, updates) => {
    updateEvent(eventId, (e) => ({
      ...e,
      rounds: e.rounds.map((r) => (r.id === roundId ? { ...r, ...updates } : r)),
    }));
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
    const venue = venues.find((v) => v.id === venueId);
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
      setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, menu: kept } : v)));
    }
    return removed;
  };

  const [initialDrinksCategory, setInitialDrinksCategory] = useState(null);
  const [initialDrinksTagFilter, setInitialDrinksTagFilter] = useState(null);

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

  const adjustVenuePersonalDrink = (venueId, drinkNameLabel, delta, kcalPerServing) => {
    if (!venueId) return;
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    const stats = venue.stats || {};
    const personalDrinksByType = stats.personalDrinksByType || {};
    const current = personalDrinksByType[drinkNameLabel] || 0;
    const next = Math.max(0, current + delta);
    const actualDelta = next - current;
    const caloriesTotal = Math.max(0, (stats.caloriesTotal || 0) + actualDelta * (kcalPerServing || 0));
    const newStats = { ...stats, personalDrinksByType: { ...personalDrinksByType, [drinkNameLabel]: next }, caloriesTotal };
    updatePublicVenue(venueId, { stats: newStats });
    setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, stats: newStats } : v)));
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

  const resetStatField = (field) => {
    setVenues((prev) =>
      prev.map((v) => {
        const stats = { ...(v.stats || {}) };
        if (field === "visits") stats.visits = 0;
        if (field === "drinksOrdered") stats.drinksOrdered = 0;
        if (field === "personalDrinks") stats.personalDrinksByType = {};
        if (field === "calories") stats.caloriesTotal = 0;
        return { ...v, stats };
      })
    );
    setProfile((p) => ({ ...p, statsResetDates: { ...(p.statsResetDates || {}), [field]: Date.now() } }));
  };

  const resetMoneyStats = () => {
    setProfile((p) => ({ ...p, statsResetDates: { ...(p.statsResetDates || {}), money: Date.now() } }));
  };

  const resetVenueStats = (id) => {
    const emptyStats = { visits: 0, drinksOrdered: 0, moneySpent: { euro: 0, jeton: 0 }, personalDrinksByType: {}, caloriesTotal: 0 };
    updatePublicVenue(id, { stats: emptyStats });
    setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, stats: emptyStats, trackingStartDate: todayISO() } : v)));
  };

  const openTagFilter = (type, filter) => {
    setInitialDrinksCategory(type);
    setInitialDrinksTagFilter(filter);
    setScreen("drinksDirectory");
  };

  const checkInVenue = (venueId) => {
    // Personnel, pour l'instant : marque simplement où vous êtes en ce moment, sur cet appareil.
    setCheckedInVenueId(venueId);
    emitEvent(EVENT_TYPES.VENUE_CHECKED, { actorBibroCode: profile.myBibroCode, entityType: "venue", entityId: venueId });
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setProfile({ name: "", avatarUrl: null, myBibroCode: null });
    setProfileLoaded(false);
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

  const addBibro = (code, name, alias, socials) => {
    const newBibro = { code, name, alias: alias || "", ...socials, addedAt: Date.now() };
    setBibros((prev) => [...prev, newBibro]);
    trackEvent("bibax_added", "addBibro", profile.myBibroCode);
  };
  const removeBibro = (code) => setBibros((prev) => prev.filter((b) => b.code !== code));
  const setBibroAlias = (code, alias) => setBibros((prev) => prev.map((b) => (b.code === code ? { ...b, alias } : b)));
  const toggleBibroFavorite = (code) =>
    setBibros((prev) => prev.map((b) => (b.code === code ? { ...b, isFavorite: !b.isFavorite } : b)));

  const refreshVenues = async () => {
    const v = await loadPublicVenues();
    setVenues(v);
  };

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
    const ev = events.find((e) => e.id === id);
    try {
      if (ev && ev.venueId && !ev.isHome && ev.venueId !== "@event") {
        const venue = venues.find((v) => v.id === ev.venueId);
        if (venue) {
          const stats = venue.stats || {};
          const rounds = ev.rounds || [];
          const totalDrinks = rounds.reduce((sum, r) => sum + (r.orders || []).length, 0);
          const totalMoney = rounds.reduce((sum, r) => sum + (r.total || 0), 0);
          const prevMoney = stats.moneySpent || { euro: 0, jeton: 0 };
          const personalDrinksByType = { ...(stats.personalDrinksByType || {}) };
          let caloriesTotal = stats.caloriesTotal || 0;
          (ev.personalOrders || []).forEach((o) => {
            const drink = (ev.menu || []).find((d) => d.id === o.drinkId);
            if (!drink) return;
            const key = drink.name;
            personalDrinksByType[key] = Math.max(0, (personalDrinksByType[key] || 0) - 1);
            const kcal = kcalForDrink(drink);
            if (kcal != null) caloriesTotal = Math.max(0, caloriesTotal - kcal);
          });
          const newStats = {
            ...stats,
            visits: Math.max(0, (stats.visits || 0) - 1),
            drinksOrdered: Math.max(0, (stats.drinksOrdered || 0) - totalDrinks),
            moneySpent: { ...prevMoney, [ev.currency]: Math.max(0, (prevMoney[ev.currency] || 0) - totalMoney) },
            personalDrinksByType,
            caloriesTotal,
          };
          updatePublicVenue(venue.id, { stats: newStats });
          setVenues((prev) => prev.map((v) => (v.id === venue.id ? { ...v, stats: newStats } : v)));
        }
      }
    } catch (e) {
      // Même si l'annulation des statistiques échoue pour une raison ou une autre, la
      // suppression de l'événement lui-même doit quand même avoir lieu.
    }
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
          background: "#0D1B2A",
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
      <ProfileNavContext.Provider value={{ avatarUrl: profile.avatarUrl, goToProfile: () => setScreen("profile") }}>
        <div
          style={{
            fontFamily: "'Work Sans', sans-serif",
            background: "#0D1B2A",
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
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {screen === "home" && (
              <HomeScreen
                events={events}
                eventTotal={() => 0}
                openEvent={(id) => {
                  setActiveEventId(id);
                  setScreen("eventDashboard");
                }}
                goToSessionHub={() => setScreen("sessionHub")}
                goToProfile={() => setScreen("profile")}
                goToRepertoireHub={() => setScreen("repertoireHub")}
                goToGames={() => setScreen("games")}
                goToBibaMeet={() => setScreen("bibaMeet")}
                bibaMeetVisible={featureFlags.nav_bibameet_visible !== false}
                bibaPulseVisible={featureFlags.nav_bibapulse_visible !== false}
                gamesVisible={featureFlags.nav_games_visible !== false}
                goToBibaPulse={() => setScreen("bibaPulse")}
                goToSettings={() => setScreen("settings")}
                bibros={bibros}
                bibroStatuses={bibroStatuses}
                onQuickJoinSalon={(code) => console.log("TODO: rejoindre salon", code)}
                myName={profile.name}
                myBibroCode={profile.myBibroCode}
                avatarUrl={profile.avatarUrl}
                lastName={profile.lastName}
                venues={venues}
              />
            )}
            {screen === "sessionHub" && (
              <SessionHubScreen
                onBack={() => setScreen("home")}
                goToNewSalon={() => setScreen("newSalonEvent")}
                goToJoinSalon={() => setScreen("joinSalon")}
                goToBibArena={() => {}}
              />
            )}
            {screen === "repertoireHub" && (
              <RepertoireHubScreen
                onBack={() => setScreen("home")}
                goToDiscover={() => setScreen("venueDirectory")}
                goToDrinks={() => setScreen("drinksDirectory")}
                goToManageBreweries={() => setScreen("breweries")}
                goToManageBrands={() => setScreen("brands")}
                goToScanBarcode={() => setShowBarcodeScanner(true)}
              />
            )}
            {screen === "newSalonEvent" && (
              <NewEventScreen
                mode={screen === "newSalonEvent" ? "salon" : "solo"}
                onCreate={createEvent}
                onCancel={() => setScreen("sessionHub")}
                venues={venues.filter((v) => favoriteVenueIds.includes(v.id))}
                publicVenues={venues}
                onResolvePublicVenue={(publicVenueOrDraft) =>
                  publicVenueOrDraft && publicVenueOrDraft.id
                    ? venues.find((v) => v.id === publicVenueOrDraft.id) || publicVenueOrDraft
                    : publicVenueOrDraft
                }
                bibros={bibros}
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
                publicVenues={venues}
                myVenues={[]}
                myBibroCode={profile.myBibroCode}
                isAdmin={!!profile.isAdmin}
                addIntent={false}
                onBack={() => setScreen("repertoireHub")}
                onOpenVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                goToSubmit={() => setScreen("submitVenue")}
                goToMap={() => console.log("TODO: carte")}
                onRefresh={refreshVenues}
                activeCountry={activeCountry}
                setActiveCountry={setActiveCountry}
                activeCity={activeCity}
                setActiveCity={setActiveCity}
              />
            )}
            {screen === "eventDashboard" && activeEventId && (
              <EventDashboardScreen
                event={events.find((e) => e.id === activeEventId)}
                venue={venues.find((v) => v.id === events.find((e) => e.id === activeEventId)?.venueId) || null}
                drinksDirectory={drinksDirectory}
                eventTotal={(currentEvent?.rounds || []).reduce((sum, r) => sum + (r.total || 0), 0)}
                onNewRound={startNewRound}
                onManageMenu={() => setScreen("menuSetup")}
                onBack={() => setScreen("home")}
                updateEvent={updateEvent}
                myName={profile.name}
                myBibroCode={profile.myBibroCode}
                bibros={bibros}
                onAdjustVenuePersonalDrink={adjustVenuePersonalDrink}
                onCloseEvent={() => {
                  updateEvent(activeEventId, (e) => ({ ...e, closed: true, closedAt: Date.now() }));
                  setScreen("home");
                }}
                onOpenSettings={() => setScreen("eventSettings")}
                onDeleteRound={(roundId) => deleteRound(activeEventId, roundId)}
                onEditRound={(roundId, updates) => editRound(activeEventId, roundId, updates)}
                onActivateBibaBob={(code, name, tolerance, pin) => activateBibaBob(activeEventId, code, name, tolerance, pin)}
                onDeactivateBibaBob={(code) => deactivateBibaBob(activeEventId, code)}
                goToBibaMusic={() => {}}
              />
            )}
            {screen === "roundCompose" && currentEvent && (
              <RoundComposeScreen
                event={currentEvent}
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
                venue={venues.find((v) => v.id === currentEvent.venueId) || null}
                updateEvent={updateEvent}
                onBack={() => setScreen("eventDashboard")}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                drinksDirectory={drinksDirectory}
                onCleanupDuplicates={() => cleanupDuplicates(currentEvent.venueId)}
              />
            )}
            {screen === "drinksDirectory" && (
              <DrinksDirectoryScreen
                drinks={drinksDirectory}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                onBack={() => setScreen("repertoireHub")}
                onOpenDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                goToSubmit={() => setScreen("submitDrink")}
                onRefresh={async () => setDrinksDirectory(await loadDrinksDirectory())}
                initialCategory={initialDrinksCategory}
                initialTagFilter={initialDrinksTagFilter}
                onSeedConsumed={() => {
                  setInitialDrinksCategory(null);
                  setInitialDrinksTagFilter(null);
                }}
              />
            )}
            {screen === "editVenue" && (
              <DirectoryVenueFormScreen
                venue={resolveEntity(venues, viewedVenueId)}
                drinksDirectory={drinksDirectory}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                addIntent={false}
                suggestMode={!profile.isAdmin && resolveEntity(venues, viewedVenueId)?.status === "complete"}
                onSave={(patch) => {
                  updatePublicVenue(viewedVenueId, patch);
                  setVenues((prev) => prev.map((v) => (v.id === viewedVenueId ? { ...v, ...patch } : v)));
                  setScreen("venueDetail");
                }}
                onCancel={() => setScreen("venueDetail")}
              />
            )}
            {screen === "submitVenue" && (
              <DirectoryVenueFormScreen
                venue={null}
                drinksDirectory={drinksDirectory}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                addIntent={false}
                onSave={submitVenue}
                onCancel={() => setScreen("venueDirectory")}
              />
            )}
            {screen === "editDrink" && (
              <DrinkFormScreen
                drink={resolveEntity(drinksDirectory, viewedDrinkId)}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                brandsDirectory={brandsDirectory}
                onRegisterBrand={registerBrand}
                drinksDirectory={drinksDirectory}
                suggestMode={!profile.isAdmin && resolveEntity(drinksDirectory, viewedDrinkId)?.status === "complete"}
                onSave={(patch) => {
                  if (!profile.isAdmin && resolveEntity(drinksDirectory, viewedDrinkId)?.status === "complete") {
                    suggestDrinkEdit(viewedDrinkId, patch);
                  } else {
                    updateDrink(viewedDrinkId, patch);
                    setDrinksDirectory((prev) => prev.map((d) => (d.id === viewedDrinkId ? { ...d, ...patch } : d)));
                  }
                  setScreen("drinkDetail");
                }}
                onCancel={() => setScreen("drinkDetail")}
              />
            )}
            {screen === "submitDrink" && (
              <DrinkFormScreen
                drink={null}
                breweriesDirectory={breweriesDirectory}
                onRegisterBrewery={registerBrewery}
                brandsDirectory={brandsDirectory}
                onRegisterBrand={registerBrand}
                drinksDirectory={drinksDirectory}
                onSave={submitDrink}
                onCancel={() => setScreen("drinksDirectory")}
              />
            )}
            {screen === "venueDetail" && (
              <VenueDetailScreen
                venue={(() => {
                  const v = resolveEntity(venues, viewedVenueId);
                  return v ? { ...v, isFavorite: favoriteVenueIds.includes(v.id) } : v;
                })()}
                venues={venues}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                onToggleLike={() => toggleVenueLike(viewedVenueId)}
                onCheckIn={() => checkInVenue(viewedVenueId)}
                onBack={() => setScreen("venueDirectory")}
                onEdit={() => setScreen("editVenue")}
                onDelete={() => {
                  deletePublicVenue(viewedVenueId);
                  setVenues((prev) => prev.filter((v) => v.id !== viewedVenueId));
                  setScreen("venueDirectory");
                }}
                onResetStats={() => resetVenueStats(viewedVenueId)}
                onManageMenu={() => setScreen("editVenue")}
                onToggleFavorite={() => toggleVenueFavorite(viewedVenueId)}
                onCleanupDuplicates={() => cleanupDuplicates(viewedVenueId)}
              />
            )}
            {screen === "drinkDetail" && (
              <DrinkDetailScreen
                drink={resolveEntity(drinksDirectory, viewedDrinkId)}
                drinksDirectory={drinksDirectory}
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
                onBack={() => setScreen("drinksDirectory")}
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
              />
            )}
            {screen === "profile" && (
              <ProfileHubScreen
                myName={profile.name}
                profile={profile}
                bibros={bibros}
                checkIns={checkIns}
                onBack={() => setScreen("home")}
                goToMyInfo={() => setScreen("myInfo")}
                goToMyStats={() => setScreen("myStats")}
                goToBibros={() => setScreen("bibrosList")}
                goToProducts={() => setScreen("myProducts")}
                goToVenues={() => setScreen("venueDirectory")}
                goToHistory={() => setScreen("eventHistory")}
                goToSettings={() => setScreen("settings")}
              />
            )}
            {screen === "myInfo" && (
              <MyProfileScreen
                myName={profile.name}
                onRenameMe={(name) => setProfile((p) => ({ ...p, name }))}
                profile={profile}
                onSaveProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                onUploadPhoto={(file) => uploadMyAvatarPhoto(session.user.id, file)}
                onGoToAdminUnlock={() => setScreen("adminUnlock")}
                onLogout={handleLogout}
                onBack={() => setScreen("profile")}
              />
            )}
            {screen === "myStats" && (
              <MyStatsScreen
                venues={venues}
                events={events}
                myName={profile.name}
                profile={profile}
                bibros={bibros}
                checkIns={checkIns}
                alcoholFreeDays={alcoholFreeDays}
                onToggleAlcoholFreeDay={toggleAlcoholFreeDay}
                drinksDirectory={drinksDirectory}
                onResetStatField={resetStatField}
                onResetMoney={resetMoneyStats}
                onBack={() => setScreen("profile")}
                openVenue={(id) => {
                  setViewedVenueId(id);
                  setScreen("venueDetail");
                }}
                openBibro={(code) => {
                  setViewedBibroId(code);
                  setScreen("bibroDetail");
                }}
              />
            )}
            {screen === "settings" && (
              <SettingsScreen onBack={() => setScreen("home")} isAdmin={!!profile.isAdmin} goToImport={() => setScreen("importData")} goToDeleteAccount={() => setScreen("deleteAccount")} />
            )}
            {screen === "deleteAccount" && <DeleteAccountScreen onBack={() => setScreen("settings")} onAccountDeleted={handleAccountDeleted} />}
            {screen === "importData" && (
              <ImportDataScreen
                onBack={async () => {
                  setVenues(await loadPublicVenues());
                  setDrinksDirectory(await loadDrinksDirectory());
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
                venues={venues}
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
                ratedCount={drinksDirectory.filter((d) => d.ratings && d.ratings[profile.myBibroCode] != null).length}
                toTryCount={wishlistDrinkIds.length}
                onBack={() => setScreen("profile")}
                goToRated={() => setScreen("drinksDirectory")}
                goToToTry={() => setScreen("drinksDirectory")}
              />
            )}
            {screen === "eventSettings" && currentEvent && (
              <EventSettingsScreen
                event={currentEvent}
                onSave={(mode, jetonUnitValue) => {
                  updateEvent(activeEventId, (e) => ({ ...e, mode, jetonUnitValue }));
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
            {screen === "brands" && (
              <BrandsAdminScreen
                brands={brandsDirectory}
                drinks={drinksDirectory}
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
                drinks={drinksDirectory}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                onBack={() => setScreen("breweries")}
                onOpenDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onRename={(name) => {
                  updateBrewery(viewedBreweryId, { name });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === viewedBreweryId ? { ...b, name } : b)));
                }}
                onEditCountry={(country) => {
                  updateBrewery(viewedBreweryId, { country });
                  setBreweriesDirectory((prev) => prev.map((b) => (b.id === viewedBreweryId ? { ...b, country } : b)));
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
                  setScreen("breweries");
                }}
              />
            )}
            {screen === "brandDetail" && (
              <BrandDetailScreen
                brand={resolveEntity(brandsDirectory, viewedBrandId)}
                brandsDirectory={brandsDirectory}
                drinks={drinksDirectory}
                isAdmin={!!profile.isAdmin}
                myBibroCode={profile.myBibroCode}
                myUserId={session.user.id}
                onBack={() => setScreen("brands")}
                onOpenDrink={(id) => {
                  setViewedDrinkId(id);
                  setScreen("drinkDetail");
                }}
                onRename={(name) => {
                  updateBrand(viewedBrandId, { name });
                  setBrandsDirectory((prev) => prev.map((b) => (b.id === viewedBrandId ? { ...b, name } : b)));
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
                  setScreen("brands");
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
                myBibros={bibros}
                onBack={() => setScreen("bibrosList")}
                previewNotice={false}
                onToggleFavorite={() => toggleBibroFavorite(viewedBibroId)}
                onRemove={() => {
                  removeBibro(viewedBibroId);
                  setScreen("bibrosList");
                }}
              />
            )}
            {screen === "addBibro" && (
              <AddBibroScreen
                onAdd={addBibro}
                onLookup={lookupBibroCode}
                onCancel={() => setScreen("bibrosList")}
              />
            )}
            {screen === "adminUnlock" && (
              <AdminUnlockScreen
                onCancel={() => setScreen("myInfo")}
              />
            )}
            {["bibaPulse", "games", "bibaMeet"].includes(screen) && (
              <ComingSoonScreen
                onBack={() => setScreen("home")}
                title={screen}
                icon="bibamusic"
                description="Cette fonctionnalité arrive dans un prochain bloc de la migration."
              />
            )}
            {!["home", "sessionHub", "repertoireHub", "venueDirectory", "bibaPulse", "games", "bibaMeet", "newSalonEvent", "joinSalon", "eventDashboard", "roundCompose", "roundTicket", "menuSetup", "drinksDirectory", "submitVenue", "submitDrink", "venueDetail", "drinkDetail", "profile", "myInfo", "myStats", "settings", "eventHistory", "myProducts", "eventSettings", "breweries", "brands", "bibrosList", "bibroDetail", "addBibro", "adminUnlock", "deleteAccount", "editDrink", "editVenue", "breweryDetail", "brandDetail", "importData"].includes(screen) && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8792A6" }}>
                Écran "{screen}" — à venir dans un prochain bloc.
                <br />
                <button onClick={() => setScreen("home")} style={{ marginTop: "16px", background: "#39FF66", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
                  Retour à l'accueil
                </button>
              </div>
            )}
          </div>
          <BottomNav
            screen={screen}
            onNavigate={setScreen}
            onGoToSessionHub={() => setScreen("sessionHub")}
            onCheckVenue={() => setScreen("repertoireHub")}
            onCheckDrink={() => setScreen("repertoireHub")}
          />
        </div>
      </ProfileNavContext.Provider>
      {showBarcodeScanner && (
        <BarcodeScannerModal
          drinksDirectory={drinksDirectory}
          myBibroCode={profile.myBibroCode}
          onClose={() => setShowBarcodeScanner(false)}
          onFoundDrink={(drinkId) => {
            setShowBarcodeScanner(false);
            setViewedDrinkId(drinkId);
            setScreen("drinkDetail");
          }}
        />
      )}
    </NavigationContext.Provider>
  );
}
