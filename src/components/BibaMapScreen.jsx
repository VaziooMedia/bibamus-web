// ============================================================
// BibaMap : les Lieux (vert fluo), les Shops (rose fluo) et les Producteurs (bleu fluo) sur une seule carte, avec une légende à cases à cocher
// pour afficher ou masquer chaque catégorie. Accessible depuis « Voir sur la carte » des Lieux, des Shops et des Producteurs : seule la catégorie d'où l'on vient
// est cochée à l'ouverture (`startKind`), les autres se cochent dans la légende.
// `react-leaflet`, tuiles raster OpenStreetMap. Un repère ne porte que le nom et la position ; la fiche (et les horaires Google pour les lieux et les magasins)
// n'est lue qu'au toucher du repère. Seuls les shops qui ont un magasin avec des coordonnées ont un repère (une boutique en ligne n'en a pas).
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS, SHOP_CATEGORIES, PRODUCER_TYPES, PRODUCER_PROFILES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { formatAddress } from "../utils.js";
import {
  loadVenueMapPins,
  loadShopMapPins,
  loadBreweryMapPins,
  loadVenuesByIds,
  loadShopById,
  loadBreweryById,
  loadEstablishmentOpeningHours,
  loadVenueListsOnce,
  loadShopListsOnce,
  loadProducerListsOnce,
} from "../data/sharedDirectories.js";
import { VENUE_TYPE_LIST_KEY, registerVenueTypeNames, venueTypeDisplayName } from "../venueLists.js";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";
import { PRODUCER_TYPE_LIST_KEY, PRODUCER_PROFILE_LIST_KEY } from "../producerLists.js";
import { resolveTagLabels } from "./BreweryBrandDetailScreens.jsx";
import { openStatusOf, splitTypeTags, mapCardLabel } from "../venueMapCard.js";

// Les trois catégories de la carte, dans l'ordre de la légende. La couleur est celle du repère, de la case de la légende et du petit point du cadre.
const LAYERS = [
  { key: "venue", label: "Lieux", color: COLORS.amber, none: "Aucun lieu localisé pour l'instant." },
  { key: "shop", label: "Shops", color: COLORS.pinkFluo, none: "Aucun shop localisé pour l'instant." },
  { key: "producer", label: "Producteurs", color: COLORS.jetonFluo, none: "Aucun producteur localisé pour l'instant." },
];
const KINDS = LAYERS.map((l) => l.key);
// À l'ouverture, seule la catégorie d'où l'on vient est cochée (sans catégorie connue : tout est coché).
const enabledFrom = (startKind) => (KINDS.includes(startKind) ? Object.fromEntries(KINDS.map((k) => [k, k === startKind])) : Object.fromEntries(KINDS.map((k) => [k, true])));
const keyOf = (kind, id) => `${kind}:${id}`;

// Repère en SVG inline (évite le souci classique des icônes par défaut de Leaflet, dont les chemins d'image ne se résolvent pas avec les bundlers
// modernes comme Vite) : une goutte de la couleur de la catégorie.
const makePinIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid ${COLORS.paper};box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
const PIN_ICONS = Object.fromEntries(LAYERS.map((l) => [l.key, makePinIcon(l.color)]));

// Centre par défaut si aucun repère n'a de coordonnées (Belgique, cœur du réseau actuel).
const DEFAULT_CENTER = [50.5039, 4.4699];
// Niveau de zoom volontairement pas trop serré une fois centré sur la position — le but est de voir ce qui est alentour, pas seulement la rue où l'on se trouve.
const MY_LOCATION_ZOOM = 13;

// Quand on touche un repère, la carte se décale juste assez pour qu'il reste visible : sous la légende, au-dessus du cadre (sa hauteur réelle + sa marge) et à
// gauche des boutons de zoom (≈ 68 px) ; la pointe du repère est à 26 px sous son sommet.
const CARD_GAP_PX = 12;
// Le cadre se pose au-dessus de la ligne de crédit d'OpenStreetMap (≈ 16 px), qui doit rester lisible.
const CARD_BOTTOM_PX = 22;
const PIN_SAFE_TOP_PX = 64;
const PIN_SAFE_SIDE_PX = 24;
const PIN_SAFE_RIGHT_PX = 80;

const floatingButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: COLORS.surfaceAlt,
  border: `2px solid ${COLORS.paperAlt}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
  padding: 0,
};

// Un toucher sur la carte elle-même (pas sur un repère) referme le cadre.
function MapClickCloser({ onClick }) {
  useMapEvents({ click: onClick });
  return null;
}

// Le clignotement de la pastille (le halo suit la couleur de la pastille) ; immobile si la personne a demandé moins
// d'animations dans son système.
const STATUS_DOT_CSS = `
  @keyframes venueMapStatusBlink {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(0,0,0,0.25), 0 0 12px 3px currentColor; }
    50% { opacity: 0.3; box-shadow: 0 0 0 2px rgba(0,0,0,0.25), 0 0 3px 0 currentColor; }
  }
  .venue-map-status-dot { animation: venueMapStatusBlink 1.4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .venue-map-status-dot { animation: none; } }
`;

// La pastille « ouvert » (verte) ou « fermé » (rouge), en surbrillance et clignotante.
function OpenStatusDot({ status }) {
  const color = status === "open" ? COLORS.amber : COLORS.redFluo;
  return (
    <span
      className="venue-map-status-dot"
      data-testid="venue-map-status"
      data-status={status}
      role="img"
      aria-label={status === "open" ? "Ouvert" : "Fermé"}
      style={{ width: "12px", height: "12px", borderRadius: "50%", background: "currentColor", color, boxShadow: "0 0 0 2px rgba(0,0,0,0.25), 0 0 10px 2px currentColor", display: "inline-block", flexShrink: 0 }}
    />
  );
}

// Le cadre de l'élément choisi (lieu, shop ou producteur) : rond-profil, nom et sous-titre (précédé d'un point de la couleur de la catégorie), adresse postale,
// tags très fins (types d'établissement, catégories de shop, types et profils de producteur) et la pastille ouvert / fermé quand on la connaît.
// Tout le cadre est un seul bouton qui ouvre la fiche. `item` : undefined = fiche pas encore lue ; false = lecture échouée (le nom seul reste).
function MapCard({ cardRef, kind, pin, item, status, tagLabels, onOpen }) {
  const loaded = !!item;
  const layer = LAYERS.find((l) => l.key === kind);
  const address = loaded ? formatAddress(item) : "";
  const { shown, extra } = splitTypeTags(tagLabels);
  const tagStyle = {
    padding: "1px 7px",
    borderRadius: "999px",
    border: `1px solid ${COLORS.paperAlt}`,
    color: COLORS.inkSoft,
    fontSize: "9.5px",
    fontWeight: 500,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  };
  return (
    <button
      ref={cardRef}
      type="button"
      data-testid="map-card"
      data-kind={kind}
      onClick={onOpen}
      aria-label={mapCardLabel(pin.name, status)}
      style={{
        pointerEvents: "auto",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "14px",
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 -2px 14px rgba(0,0,0,0.35)",
        color: COLORS.chalkWhite,
        font: "inherit",
      }}
    >
      {loaded || item === false ? (
        <EntityAvatar photoUrl={item ? item.profilePhotoUrl : null} photoEmoji={item ? item.avatarEmoji : null} size={52} />
      ) : (
        <span aria-hidden="true" style={{ width: "52px", height: "52px", borderRadius: "50%", background: COLORS.paperAlt, border: `2px solid ${COLORS.paperAlt}`, flexShrink: 0, boxSizing: "border-box" }} />
      )}
      <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pin.name}</span>
        {loaded && item.subtitle && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.chalkWhite, fontStyle: "italic", fontWeight: 600, minWidth: 0 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: layer.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle}</span>
          </span>
        )}
        {address && <span style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "1px" }}>{address}</span>}
        {shown.length > 0 && (
          <span data-testid="map-card-tags" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            {shown.map((label) => (
              <span key={label} style={tagStyle}>
                {label}
              </span>
            ))}
            {extra > 0 && <span style={tagStyle}>+{extra}</span>}
          </span>
        )}
      </span>
      {status && (
        <span style={{ alignSelf: "flex-start", marginTop: "3px", display: "flex" }}>
          <OpenStatusDot status={status} />
        </span>
      )}
    </button>
  );
}

// La légende : une case à cocher par catégorie, de la couleur de ses repères. Décocher une catégorie masque ses repères (et referme son cadre).
function MapLegend({ enabled, onToggle }) {
  return (
    <div role="group" aria-label="Catégories affichées sur la carte" data-testid="map-legend" style={{ display: "flex", flexWrap: "wrap", gap: "6px", pointerEvents: "auto" }}>
      {LAYERS.map((l) => {
        const on = !!enabled[l.key];
        return (
          <button
            key={l.key}
            type="button"
            role="checkbox"
            aria-checked={on}
            data-testid={`map-legend-${l.key}`}
            onClick={() => onToggle(l.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 11px 6px 8px",
              borderRadius: "999px",
              border: `2px solid ${COLORS.paperAlt}`,
              background: COLORS.surface,
              color: on ? COLORS.chalkWhite : COLORS.inkSoft,
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              font: "inherit",
              fontFamily: "inherit",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "5px",
                border: `2px solid ${l.color}`,
                background: on ? l.color : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            >
              {on && <NavIcon name="check" size={12} color={COLORS.paper} />}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700 }}>{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// `initialView` : l'état de la carte au moment où l'on a quitté l'écran pour une fiche (voir `onOpenItem`), pour retomber exactement dessus au retour : même zoom,
// même centre, mêmes catégories cochées, même cadre ouvert. `null` = carte neuve (seule la catégorie `startKind` est cochée).
export function BibaMapScreen({ onBack, onOpenItem, initialView = null, startKind = null }) {
  const [pins, setPins] = useState(initialView?.pins ?? null); // { venue: [], shop: [], producer: [] } ; null = lecture en cours
  const [enabled, setEnabled] = useState(initialView?.enabled ?? enabledFrom(startKind));
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const cardRef = useRef(null);

  // L'élément dont le cadre est ouvert ({ kind, id } ; null = aucun). Sa fiche complète et, pour un lieu ou un magasin lié à Google, ses horaires sont lus à la
  // demande, une seule fois par élément : les repères ne portent que le nom et la position.
  const [selected, setSelected] = useState(initialView?.selected ?? null);
  const [itemsByKey, setItemsByKey] = useState(initialView?.itemsByKey ?? {});
  const [hoursByKey, setHoursByKey] = useState(initialView?.hoursByKey ?? {});
  const requestedRef = useRef(new Set());
  const aliveRef = useRef(true);
  const [, setListsTick] = useState(0);
  const [shopLists, setShopLists] = useState(null);
  const [producerLists, setProducerLists] = useState(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Au retour d'une fiche, les repères d'avant s'affichent tout de suite puis les listes à jour les remplacent ; une lecture qui échoue (liste vide) ne vide pas la carte.
  useEffect(() => {
    Promise.all([loadVenueMapPins(), loadShopMapPins(), loadBreweryMapPins()]).then(([venue, shop, producer]) => {
      if (!aliveRef.current) return;
      const fresh = { venue, shop, producer };
      setPins((previous) => {
        if (!previous) return fresh;
        return Object.fromEntries(KINDS.map((k) => [k, previous[k] && fresh[k].length === 0 ? previous[k] : fresh[k]]));
      });
    });
  }, []);

  const center = useMemo(() => {
    const all = pins ? KINDS.flatMap((k) => pins[k]) : [];
    if (all.length === 0) return DEFAULT_CENTER;
    const avgLat = all.reduce((s, p) => s + p.lat, 0) / all.length;
    const avgLng = all.reduce((s, p) => s + p.lng, 0) / all.length;
    return [avgLat, avgLng];
  }, [pins]);
  const pinCount = pins ? KINDS.reduce((n, k) => n + pins[k].length, 0) : 0;

  const selectedPin = useMemo(
    () => (selected && pins && enabled[selected.kind] ? pins[selected.kind].find((p) => p.id === selected.id) || null : null),
    [selected, pins, enabled]
  );
  const selectedKey = selected ? keyOf(selected.kind, selected.id) : null;
  const selectedItem = selectedKey ? itemsByKey[selectedKey] : undefined;
  const selectedHours = selectedKey ? hoursByKey[selectedKey] : undefined;

  // Lit la fiche de l'élément puis, pour un lieu ou un magasin lié à Google, ses horaires. Un échec n'est pas gardé : le toucher suivant sur cet élément réessaie.
  useEffect(() => {
    if (!selected || itemsByKey[selectedKey] || requestedRef.current.has(selectedKey)) return;
    const { kind, id } = selected;
    const key = selectedKey;
    requestedRef.current.add(key);
    (async () => {
      let item = false;
      try {
        if (kind === "venue") item = ((await loadVenuesByIds([id])) || [])[0] || false;
        else if (kind === "shop") item = (await loadShopById(id)) || false;
        else item = (await loadBreweryById(id)) || false;
      } catch (e) {
        item = false;
      }
      if (!aliveRef.current) return;
      if (!item) requestedRef.current.delete(key);
      setItemsByKey((prev) => ({ ...prev, [key]: item }));
      if (!item || kind === "producer" || !item.googlePlaceId) return;
      let hours = null;
      try {
        hours = await loadEstablishmentOpeningHours(item.googlePlaceId);
      } catch (e) {
        hours = null;
      }
      if (!aliveRef.current || !hours) return;
      setHoursByKey((prev) => ({ ...prev, [key]: hours }));
    })();
  }, [selectedKey]);

  // Les noms des tags du cadre : ceux de la plateforme de gestion (élément ajouté, élément renommé) l'emportent sur la liste de départ. Lus une fois par session,
  // seulement quand l'élément choisi a des tags.
  const listsNeeded = !selected || !selectedItem
    ? null
    : selected.kind === "venue"
      ? (selectedItem.venueTypes || []).length > 0 && "venue"
      : selected.kind === "shop"
        ? (selectedItem.categories || []).length > 0 && "shop"
        : (selectedItem.producerTypes || []).length + (selectedItem.producerProfiles || []).length > 0 && "producer";
  useEffect(() => {
    if (!listsNeeded) return undefined;
    let cancelled = false;
    if (listsNeeded === "venue") {
      loadVenueListsOnce().then((lists) => {
        if (lists && registerVenueTypeNames(lists[VENUE_TYPE_LIST_KEY].rows) && !cancelled && aliveRef.current) setListsTick((t) => t + 1);
      });
    } else if (listsNeeded === "shop") {
      loadShopListsOnce().then((lists) => {
        if (lists && !cancelled && aliveRef.current) setShopLists(lists);
      });
    } else {
      loadProducerListsOnce().then((lists) => {
        if (lists && !cancelled && aliveRef.current) setProducerLists(lists);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [listsNeeded, selectedKey]);

  // Un type de lieu dont le nom n'est pas encore chargé n'a pas de nom à montrer (null, écarté par le cadre) : jamais son code technique.
  let tagLabels = [];
  if (selectedItem && selected) {
    if (selected.kind === "venue") tagLabels = (selectedItem.venueTypes || []).map((code) => venueTypeDisplayName(code));
    else if (selected.kind === "shop") tagLabels = resolveTagLabels(shopLists, selectedItem.categories, SHOP_CATEGORIES, SHOP_CATEGORY_LIST_KEY);
    else
      tagLabels = [
        ...resolveTagLabels(producerLists, selectedItem.producerTypes, PRODUCER_TYPES, PRODUCER_TYPE_LIST_KEY),
        ...resolveTagLabels(producerLists, selectedItem.producerProfiles, PRODUCER_PROFILES, PRODUCER_PROFILE_LIST_KEY),
      ];
  }

  // Décale la carte pour que le repère choisi reste visible au-dessus du cadre. Refait chaque fois que le cadre change de hauteur (la fiche arrive : adresse, tags ;
  // les noms de tags arrivent : tags plus longs) ; sans effet si le repère est déjà bien placé. Exception : le cadre retrouvé au retour d'une fiche ne décale rien
  // tant qu'il ne change pas de hauteur, la carte reste exactement comme on l'a quittée.
  const restoredKeyRef = useRef(initialView?.selected ? keyOf(initialView.selected.kind, initialView.selected.id) : null);
  useEffect(() => {
    const map = mapRef.current;
    const el = cardRef.current;
    if (!map || !el) return undefined;
    const leaveAsIs = restoredKeyRef.current === selectedKey;
    restoredKeyRef.current = null;
    const keepPinVisible = () => {
      map.panInside([selectedPin.lat, selectedPin.lng], {
        paddingTopLeft: [PIN_SAFE_SIDE_PX, PIN_SAFE_TOP_PX],
        paddingBottomRight: [PIN_SAFE_RIGHT_PX, el.offsetHeight + CARD_BOTTOM_PX + CARD_GAP_PX],
      });
    };
    if (!leaveAsIs) keepPinVisible();
    if (typeof ResizeObserver === "undefined") return undefined;
    // L'observateur annonce d'abord la taille de départ : sans changement, il n'y a rien à corriger.
    let firstReport = true;
    const observer = new ResizeObserver(() => {
      if (firstReport) {
        firstReport = false;
        if (leaveAsIs) return;
      }
      keepPinVisible();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [selectedPin]);

  const markers = useMemo(
    () =>
      pins
        ? KINDS.flatMap((kind) =>
            enabled[kind] ? pins[kind].map((p) => <Marker key={keyOf(kind, p.id)} position={[p.lat, p.lng]} icon={PIN_ICONS[kind]} eventHandlers={{ click: () => setSelected({ kind, id: p.id }) }} />) : []
          )
        : [],
    [pins, enabled]
  );

  const toggleLayer = (kind) => {
    setEnabled((prev) => ({ ...prev, [kind]: !prev[kind] }));
    if (selected && selected.kind === kind) setSelected(null);
  };

  // Ouvre la fiche de l'élément choisi en laissant à l'appelant de quoi retrouver la carte telle qu'elle est (voir `initialView`).
  const openSelected = () => {
    const map = mapRef.current;
    const mapCenter = map ? map.getCenter() : null;
    onOpenItem(selected.kind, selected.id, {
      selected,
      center: mapCenter ? [mapCenter.lat, mapCenter.lng] : null,
      zoom: map ? map.getZoom() : null,
      pins,
      enabled,
      itemsByKey,
      hoursByKey,
    });
  };

  const centerOnMyLocation = () => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], MY_LOCATION_ZOOM);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  // Le message posé sur la carte quand il n'y a rien à montrer : aucune case cochée, ou aucun repère dans la ou les catégories cochées.
  const enabledLayers = LAYERS.filter((l) => enabled[l.key]);
  const shownCount = pins ? enabledLayers.reduce((n, l) => n + pins[l.key].length, 0) : 0;
  const emptyMessage =
    pins === null || shownCount > 0
      ? null
      : enabledLayers.length === 0
        ? "Cochez une catégorie pour voir ses repères."
        : enabledLayers.length === 1
          ? enabledLayers[0].none
          : "Aucun repère localisé pour l'instant.";

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Map</span>
        </h1>
      </div>

      {pins === null ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : (
        <div style={{ flex: 1, minHeight: "300px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
          <MapContainer
            ref={mapRef}
            center={initialView?.center || center}
            zoom={initialView?.zoom ?? (pinCount > 0 ? 7 : 6)}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickCloser onClick={() => setSelected(null)} />
            {markers}
          </MapContainer>
          {/* Légende en haut, puis boutons de la carte et cadre de l'élément, empilés en bas ; les zones elles-mêmes laissent passer les touchers vers la carte (la
              propriété est héritée : la légende, les boutons et le cadre la remettent à « auto »). */}
          <style>{STATUS_DOT_CSS}</style>
          <div style={{ position: "absolute", left: 10, right: 10, top: 10, zIndex: 1000, pointerEvents: "none" }}>
            <MapLegend enabled={enabled} onToggle={toggleLayer} />
          </div>
          {emptyMessage && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "42%", display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none", padding: "0 24px" }}>
              <p
                data-testid="map-empty"
                style={{ margin: 0, padding: "10px 14px", borderRadius: "12px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, color: COLORS.inkSoft, fontSize: "13px", fontStyle: "italic", textAlign: "center" }}
              >
                {emptyMessage}
              </p>
            </div>
          )}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 1000, pointerEvents: "none" }}>
            <div
              style={{
                alignSelf: "flex-end",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                margin: `0 16px ${selectedPin ? CARD_GAP_PX : 16}px 0`,
                pointerEvents: "auto",
              }}
            >
              <button onClick={() => mapRef.current?.zoomIn()} title="Zoomer" aria-label="Zoomer" style={floatingButtonStyle}>
                <NavIcon name="plus" size={20} color={COLORS.amber} />
              </button>
              <button onClick={() => mapRef.current?.zoomOut()} title="Dézoomer" aria-label="Dézoomer" style={floatingButtonStyle}>
                <NavIcon name="minus" size={20} color={COLORS.amber} />
              </button>
              <button
                onClick={centerOnMyLocation}
                disabled={locating}
                title="Centrer sur ma position"
                aria-label="Centrer sur ma position"
                style={{ ...floatingButtonStyle, width: "52px", height: "52px", cursor: locating ? "default" : "pointer" }}
              >
                <NavIcon name="crosshair" size={24} color={locating ? COLORS.inkSoft : COLORS.amber} />
              </button>
            </div>
            {selectedPin && (
              <div style={{ margin: `0 ${CARD_GAP_PX}px ${CARD_BOTTOM_PX}px` }}>
                <MapCard
                  cardRef={cardRef}
                  kind={selected.kind}
                  pin={selectedPin}
                  item={selectedItem}
                  status={selected.kind === "producer" ? null : openStatusOf(selectedHours)}
                  tagLabels={tagLabels}
                  onOpen={openSelected}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
