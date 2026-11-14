// ============================================================
// Pulse d'une fiche (Produit, Lieu, Producteur, Marque) — mêmes cartes que le fil principal (BibaPulseScreen),
// filtrées à cette seule fiche, avec deux onglets : « Tous » (tout ce que je peux voir) et « Mes Bibax »
// (mes Bibax confirmés seulement). Ne se recharge jamais tout seul (contrairement au fil principal,
// qui l'actualise toutes les 10 secondes) : cette section est consultée une fois, pas surveillée en continu.
//
// Mode « mine » (entityType = "mine", onglet BibaPulse de Mon Profil, depuis le 2026-11-13) : les publications de la personne
// elle-même, tous types de cartes, de la plus récente à la plus ancienne (fonction SQL get_my_pulse_posts), sans liste
// « Tout le monde / Mes Bibax » et sans rond de profil cliquable (on est déjà sur son profil). Le reste est identique.
//
// selfEntity (facultatif) : la fiche elle-même, déjà en mémoire (le produit d'une fiche Produit,
// le lieu d'une fiche Lieu). Sert à afficher un nom juste immédiatement, sans attendre un aller-retour
// réseau, pour les publications qui la concernent directement. Forme : { type: "drink" | "venue", object }.
// Sans effet pour une fiche Producteur ou Marque : leurs cartes portent sur des produits différents, jamais
// sur le producteur ou la marque eux-mêmes.
//
// Mode « bibax » (entityType = "bibax", entityId = identifiant de compte de la personne, onglet BibaPulse de la fiche d'un Bibax et de son
// profil public, depuis le 2026-11-13) : les publications de cette personne, telles que le serveur accepte de les montrer à la
// personne qui regarde (fonction SQL get_bibax_pulse_activity), sans liste « Tout le monde / Mes Bibax » et sans rond de profil
// cliquable sur ses propres cartes (on est déjà sur son profil). Le reste est identique.
//
// Retour sur la carte (returnEntryId, onRememberEntry) : quand on ouvre une autre fiche (produit, lieu, marque, producteur, son propre
// profil) depuis une carte de cette liste, puis qu'on revient (flèche retour), la fiche se rouvre sur cet onglet et la liste se
// replace sur la carte d'où l'on est parti — comme le fil principal (BibaPulseScreen). L'écran hôte garde l'identifiant de la carte
// (onRememberEntry l'écrit, returnEntryId le rend) le temps de l'aller-retour ; la section le lit une fois puis le remet à zéro.
//
// Les publications libres qui TAGUENT cette fiche s'y affichent aussi (le serveur les ajoute au fil de la fiche).
// Leurs propres tags (autres produits, marques, producteurs, lieux) sont des pastilles, cliquables seulement
// pour les sortes de fiche que l'écran hôte sait ouvrir (onOpenDrink, onOpenVenue, onOpenBrand, onOpenProducer).
// ============================================================
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { loadEntityPulse, loadMyPulsePosts, loadBibaxPulseActivity, loadDrinksByIds, loadVenuesByIds, getSession } from "../data/sharedDirectories.js";
import { PulseCard } from "./BibaPulseScreen.jsx";
import { usePostTagEntities } from "./PulseTags.jsx";
import { usePulseProducersById, pulseDrinkIdsOf } from "./PulseProductCard.jsx";
import { usePulseVenueRatingsById } from "./PulseVenueCard.jsx";
import { BibaxProfilePreviewScreen } from "./BibaxProfilePreviewScreen.jsx";
import { ProfileNavContext } from "../contexts.js";

const SPECIAL_VENUE_LABELS = { "@home": "@Home", "@event": "@Event" };
const SCOPES = [
  { key: "all", label: "Tout le monde" },
  { key: "bibax", label: "Mes Bibax" },
];

export function EntityPulseSection({ entityType, entityId, myUserId: myUserIdProp, myBibroCode, onOpenVenue, onOpenDrink, onOpenBrand, onOpenProducer, selfEntity, returnEntryId = null, onRememberEntry }) {
  const [scope, setScope] = useState("all");
  // L'identifiant du compte vient de l'écran hôte ; à défaut (profil public ouvert depuis le fil, une discussion…), de la session.
  const [sessionUserId, setSessionUserId] = useState(null);
  useEffect(() => {
    if (myUserIdProp) return;
    getSession().then((s) => setSessionUserId(s?.user?.id || null));
  }, [myUserIdProp]);
  const myUserId = myUserIdProp || sessionUserId;
  const [entries, setEntries] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewedProfileCode, setViewedProfileCode] = useState(null);
  const { goToProfile } = React.useContext(ProfileNavContext);

  // Retour d'une fiche ouverte depuis une carte : identifiant lu une fois, puis remis à zéro chez l'hôte.
  const [returnTarget] = useState(returnEntryId || null);
  useEffect(() => {
    if (returnTarget && onRememberEntry) onRememberEntry(null, { consumed: returnTarget });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Mémorise la carte avant d'ouvrir une fiche, pour y revenir.
  const rememberThen = (entryId, fn, opts) => (fn ? (...args) => { if (onRememberEntry) onRememberEntry(entryId, opts); return fn(...args); } : undefined);
  const listRef = useRef(null);
  const alignTo = (id) => {
    const card = listRef.current ? listRef.current.querySelector(`[data-pulse-entry="${id}"]`) : null;
    if (card) card.scrollIntoView({ block: "start" });
  };
  // Profil d'un Bibax ouvert ici même (rond de profil, personne taguée) : au retour, on remet la carte à l'écran.
  const profileFromEntry = useRef(null);
  const openProfileFrom = (entryId, code) => {
    profileFromEntry.current = entryId;
    setViewedProfileCode(code);
  };
  useLayoutEffect(() => {
    if (viewedProfileCode || !profileFromEntry.current) return;
    const id = profileFromEntry.current;
    profileFromEntry.current = null;
    alignTo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedProfileCode]);

  const seedDrinks = selfEntity?.type === "drink" ? [selfEntity.object] : [];
  const seedVenues = selfEntity?.type === "venue" ? { [selfEntity.object.id]: selfEntity.object } : {};
  const [drinksDirectory, setDrinksDirectory] = useState(seedDrinks);
  const [venuesById, setVenuesById] = useState(seedVenues);

  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => pulseDrinkIdsOf(e).forEach((id) => ids.add(id)));
    seedDrinks.forEach((d) => ids.delete(d.id)); // déjà en mémoire, pas besoin de les recharger
    if (ids.size === 0) return;
    loadDrinksByIds([...ids]).then((results) => setDrinksDirectory((prev) => [...prev.filter((d) => !ids.has(d.id)), ...results]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);
  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => {
      if (e.objectType === "venue" && e.objectId) ids.add(e.objectId);
      else if (e.venueId && !SPECIAL_VENUE_LABELS[e.venueId]) ids.add(e.venueId);
    });
    Object.keys(seedVenues).forEach((id) => ids.delete(id));
    if (ids.size === 0) return;
    loadVenuesByIds([...ids]).then((results) => setVenuesById((prev) => ({ ...prev, ...Object.fromEntries(results.map((v) => [v.id, v])) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // Noms des fiches taguées dans les publications libres de cette liste.
  const tagEntities = usePostTagEntities(entries);

  // Producteurs des produits checkés (ligne « Producteur » de la fiche produit des cartes DrinkCheck).
  const producersById = usePulseProducersById(entries, drinksDirectory);
  // Sur la fiche d'un lieu, la fiche du lieu n'est pas répétée dans ses PlaceCheck : inutile d'en lire l'appréciation.
  const venueRatingsById = usePulseVenueRatingsById(selfEntity?.type === "venue" ? null : entries);

  const directories = { venuesById, drinksDirectory, breweriesDirectory: [], brandsDirectory: [], tagEntities, producersById, venueRatingsById };

  const isMine = entityType === "mine";
  const isBibax = entityType === "bibax";
  const fetchEntries = (before = null) => (isMine ? loadMyPulsePosts(before) : isBibax ? loadBibaxPulseActivity(entityId, before) : loadEntityPulse(entityType, entityId, scope, before));

  useEffect(() => {
    setEntries(null);
    fetchEntries().then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
  }, [entityType, entityId, scope]);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    const oldest = entries[entries.length - 1].createdAt;
    const more = await fetchEntries(oldest);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  };

  // La carte d'où l'on vient n'est pas forcément dans la première page : on charge des pages supplémentaires jusqu'à la trouver
  // (10 au plus), puis on la cale en haut de l'écran, sans animation et avant l'affichage. Les produits, lieux et producteurs des
  // cartes se chargent après la liste et changent leur hauteur : on réaligne à chaque chargement, jusqu'à ce que la personne
  // touche l'écran ou, au plus, 4 secondes.
  const focusAttempts = useRef(0);
  useEffect(() => {
    if (!returnTarget || !entries || loadingMore) return;
    if (entries.some((e) => e.id === returnTarget)) return;
    if (!hasMore || focusAttempts.current >= 10) return;
    focusAttempts.current += 1;
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnTarget, entries, hasMore, loadingMore]);
  const keepAligning = useRef(!!returnTarget);
  useLayoutEffect(() => {
    if (!keepAligning.current || !returnTarget) return;
    alignTo(returnTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, drinksDirectory, venuesById, producersById, venueRatingsById]);
  useEffect(() => {
    if (!keepAligning.current) return undefined;
    const stop = () => {
      keepAligning.current = false;
    };
    const timer = setTimeout(stop, 4000);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  // Une de mes publications vient d'être supprimée : elle quitte la liste.
  const removeEntry = (id) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  };

  if (viewedProfileCode) {
    // Les cartes du profil ouvert ici ouvrent lieux, produits, marques et producteurs comme les cartes de cette liste. Au retour d'une
    // fiche, on retrouve la carte d'où l'on était parti (celle qui a ouvert ce profil), la liste étant rouverte à sa place.
    const fromProfile = (fn) => (fn ? (...args) => { if (onRememberEntry && profileFromEntry.current) onRememberEntry(profileFromEntry.current); return fn(...args); } : undefined);
    return (
      <BibaxProfilePreviewScreen
        bibroCode={viewedProfileCode}
        onBack={() => setViewedProfileCode(null)}
        myUserId={myUserId}
        myBibroCode={myBibroCode}
        onOpenVenue={fromProfile(onOpenVenue)}
        onOpenDrink={fromProfile(onOpenDrink)}
        onOpenBrand={fromProfile(onOpenBrand)}
        onOpenProducer={fromProfile(onOpenProducer)}
      />
    );
  }

  return (
    <div ref={listRef}>
      {/* Liste déroulante plutôt que des boutons, pour bien la distinguer des onglets principaux
          Infos / BibaPulse, au-dessus. */}
      {!isMine && !isBibax && (
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        style={{ width: "165px", boxSizing: "border-box", padding: "4px 10px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "9px", marginBottom: "14px" }}
      >
        {SCOPES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      )}

      {entries === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : entries.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", margin: 0 }}>
            {isMine ? "Tu n'as encore rien publié dans BibaPulse." : isBibax ? "Aucune activité visible pour l'instant." : scope === "bibax" ? "Aucun de tes Bibax n'a encore publié ici." : "Aucune publication pour l'instant."}
          </p>
        </div>
      ) : (
        <>
          {/* Comme le fil BibaPulse : publications à plat, pleine largeur (le fil sort de la marge de 20 px de la fiche), séparées par un trait. */}
          <div style={{ margin: "0 -20px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          {entries.map((entry) => (
            <PulseCard
              key={entry.id}
              flat
              entry={entry}
              hideProduct={(selfEntity?.type === "drink" && entry.objectType === "drink" && entry.objectId === selfEntity.object.id) || (selfEntity?.type === "venue" && entry.eventType === "venue_visit" && entry.objectType === "venue" && entry.objectId === selfEntity.object.id)}
              directories={directories}
              myUserId={myUserId}
              myBibroCode={myBibroCode}
              onOpenVenue={rememberThen(entry.id, onOpenVenue)}
              onOpenDrink={rememberThen(entry.id, onOpenDrink)}
              onOpenBrand={rememberThen(entry.id, onOpenBrand)}
              onOpenProducer={rememberThen(entry.id, onOpenProducer)}
              onOpenTagged={(person) => {
                if (person.id === myUserId) rememberThen(entry.id, goToProfile, { profile: true })();
                else if (person.bibro_code) openProfileFrom(entry.id, person.bibro_code);
              }}
              onOpenProfile={entry.actorId === myUserId ? (isMine ? undefined : rememberThen(entry.id, goToProfile, { profile: true })) : isBibax && entry.actorId === entityId ? undefined : (code) => openProfileFrom(entry.id, code)}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
              onDeleted={removeEntry}
            />
          ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ display: "block", width: "100%", marginTop: "14px", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
            >
              {loadingMore ? "Chargement..." : "Voir plus"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
