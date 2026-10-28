import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { formatAddress } from "../utils.js";
import { loadVenueMapPins, loadVenuesByIds, loadEstablishmentOpeningHours, loadVenueListsOnce } from "../data/sharedDirectories.js";
import { VENUE_TYPE_LIST_KEY, registerVenueTypeNames, venueTypeDisplayName } from "../venueLists.js";
import { openStatusOf, splitTypeTags, mapCardLabel } from "../venueMapCard.js";

// Icône personnalisée en SVG inline — évite le souci classique des icônes par défaut de
// Leaflet, dont les chemins d'image ne se résolvent pas correctement avec les bundlers
// modernes (Vite compris) sans configuration supplémentaire.
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${COLORS.amber};transform:rotate(-45deg);border:2px solid ${COLORS.paper};box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Centre par défaut si aucun lieu n'a encore de coordonnées (Belgique, cœur du réseau actuel).
const DEFAULT_CENTER = [50.5039, 4.4699];
// Niveau de zoom volontairement pas trop serré une fois centré sur la position — le but est de
// voir les lieux alentour, pas seulement la rue où l'on se trouve.
const MY_LOCATION_ZOOM = 13;

// Quand on touche une épingle, la carte se décale juste assez pour que l'épingle reste visible : au-dessus du cadre (sa
// hauteur réelle + sa marge) et à gauche des boutons de zoom (≈ 68 px) ; la pointe de l'épingle est à 26 px sous son sommet.
const CARD_GAP_PX = 12;
// Le cadre se pose au-dessus de la ligne de crédit d'OpenStreetMap (≈ 16 px), qui doit rester lisible.
const CARD_BOTTOM_PX = 22;
const PIN_SAFE_TOP_PX = 40;
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

// Un toucher sur la carte elle-même (pas sur une épingle) referme le cadre.
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

// Le cadre du lieu choisi : rond-profil, nom et sous-titre, adresse postale, tags de type (très fins) et la pastille
// ouvert / fermé. Tout le cadre est un seul bouton qui ouvre la fiche du lieu.
function VenueMapCard({ cardRef, pin, venue, status, typeLabels, onOpen }) {
  const loaded = !!venue;
  const address = loaded ? formatAddress(venue) : "";
  const { shown, extra } = splitTypeTags(typeLabels);
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
      data-testid="venue-map-card"
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
      {loaded || venue === false ? (
        <EntityAvatar photoUrl={venue ? venue.profilePhotoUrl : null} photoEmoji={venue ? venue.avatarEmoji : null} size={52} />
      ) : (
        <span aria-hidden="true" style={{ width: "52px", height: "52px", borderRadius: "50%", background: COLORS.paperAlt, border: `2px solid ${COLORS.paperAlt}`, flexShrink: 0, boxSizing: "border-box" }} />
      )}
      <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pin.name}</span>
        {loaded && venue.subtitle && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.chalkWhite, fontStyle: "italic", fontWeight: 600, minWidth: 0 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venue.subtitle}</span>
          </span>
        )}
        {address && <span style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "1px" }}>{address}</span>}
        {shown.length > 0 && (
          <span data-testid="venue-map-tags" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
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

export function VenueMapScreen({ onBack, onOpenVenue }) {
  const [pins, setPins] = useState(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const cardRef = useRef(null);

  // Le lieu dont le cadre est ouvert (null = aucun). Sa fiche complète (adresse, sous-titre, photo, types) et ses horaires
  // sont lus à la demande, une seule fois par lieu : les épingles ne portent que le nom et la position.
  const [selectedId, setSelectedId] = useState(null);
  const [venuesById, setVenuesById] = useState({});
  const [hoursById, setHoursById] = useState({});
  const requestedRef = useRef(new Set());
  const aliveRef = useRef(true);
  const [, setTypeNamesTick] = useState(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadVenueMapPins().then(setPins);
  }, []);

  const center = useMemo(() => {
    if (!pins || pins.length === 0) return DEFAULT_CENTER;
    const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
    const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
    return [avgLat, avgLng];
  }, [pins]);

  const selectedPin = useMemo(() => (selectedId && pins ? pins.find((p) => p.id === selectedId) || null : null), [selectedId, pins]);
  const selectedVenue = selectedId ? venuesById[selectedId] : undefined;
  const selectedHours = selectedId ? hoursById[selectedId] : undefined;

  // Lit la fiche du lieu puis ses horaires. Un échec n'est pas gardé : le toucher suivant sur ce lieu réessaie.
  useEffect(() => {
    if (!selectedId || requestedRef.current.has(selectedId)) return;
    const id = selectedId;
    requestedRef.current.add(id);
    (async () => {
      let venue = false;
      try {
        const rows = await loadVenuesByIds([id]);
        venue = (rows && rows[0]) || false;
      } catch (e) {
        venue = false;
      }
      if (!aliveRef.current) return;
      if (!venue) requestedRef.current.delete(id);
      setVenuesById((prev) => ({ ...prev, [id]: venue }));
      if (!venue || !venue.googlePlaceId) return;
      let hours = null;
      try {
        hours = await loadEstablishmentOpeningHours(venue.googlePlaceId);
      } catch (e) {
        hours = null;
      }
      if (!aliveRef.current || !hours) return;
      setHoursById((prev) => ({ ...prev, [id]: hours }));
    })();
  }, [selectedId]);

  // Les noms des types d'établissement : ceux de la plateforme de gestion (type ajouté, type renommé) l'emportent sur la
  // liste de départ. Lus une fois par session, seulement quand un lieu choisi a des types.
  const hasTypes = !!(selectedVenue && (selectedVenue.venueTypes || []).length > 0);
  useEffect(() => {
    if (!hasTypes) return undefined;
    let cancelled = false;
    loadVenueListsOnce().then((lists) => {
      if (lists && registerVenueTypeNames(lists[VENUE_TYPE_LIST_KEY].rows) && !cancelled && aliveRef.current) setTypeNamesTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [hasTypes, selectedId]);
  // Un type dont le nom n'est pas encore chargé n'a pas de nom à montrer (null, écarté par le cadre) : jamais son code technique.
  const typeLabels = selectedVenue ? (selectedVenue.venueTypes || []).map((code) => venueTypeDisplayName(code)) : [];

  // Décale la carte pour que l'épingle choisie reste visible au-dessus du cadre. Refait chaque fois que le cadre change de
  // hauteur (la fiche arrive : adresse, tags ; les noms de type arrivent : tags plus longs) ; sans effet si l'épingle est
  // déjà bien placée.
  useEffect(() => {
    const map = mapRef.current;
    const el = cardRef.current;
    if (!map || !el) return undefined;
    const keepPinVisible = () => {
      map.panInside([selectedPin.lat, selectedPin.lng], {
        paddingTopLeft: [PIN_SAFE_SIDE_PX, PIN_SAFE_TOP_PX],
        paddingBottomRight: [PIN_SAFE_RIGHT_PX, el.offsetHeight + CARD_BOTTOM_PX + CARD_GAP_PX],
      });
    };
    keepPinVisible();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(keepPinVisible);
    observer.observe(el);
    return () => observer.disconnect();
  }, [selectedPin]);

  const markers = useMemo(
    () => (pins || []).map((p) => <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon} eventHandlers={{ click: () => setSelectedId(p.id) }} />),
    [pins]
  );

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

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Lieux sur la carte</h1>
      </div>

      {pins === null ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : (
        <div style={{ flex: 1, minHeight: "300px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
          <MapContainer ref={mapRef} center={center} zoom={pins.length > 0 ? 7 : 6} zoomControl={false} style={{ width: "100%", height: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickCloser onClick={() => setSelectedId(null)} />
            {markers}
          </MapContainer>
          {/* Boutons de la carte puis cadre du lieu, empilés en bas ; la zone elle-même laisse passer les touchers vers la carte (la
              propriété est héritée : les boutons et le cadre la remettent à « auto »). */}
          <style>{STATUS_DOT_CSS}</style>
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
                <VenueMapCard
                  cardRef={cardRef}
                  pin={selectedPin}
                  venue={selectedVenue}
                  status={openStatusOf(selectedHours)}
                  typeLabels={typeLabels}
                  onOpen={() => onOpenVenue(selectedPin.id)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
