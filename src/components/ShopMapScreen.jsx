// ============================================================
// « Shops sur la carte » : même carte que « Lieux sur la carte » (VenueMapScreen), avec des repères rose fluo pour les distinguer des Lieux.
// Seuls les shops qui ont un magasin avec des coordonnées y figurent (une boutique en ligne n'a pas de repère). Un toucher sur un repère ouvre un cadre
// (rond-profil, nom, sous-titre, adresse, catégories) ; un toucher sur le cadre ouvre la fiche. Au retour de la fiche, la carte retrouve son zoom, son centre
// et son cadre ouvert (`initialView`).
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS, SHOP_CATEGORIES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { formatAddress } from "../utils.js";
import { loadShopMapPins, loadShopById, loadShopListsOnce } from "../data/sharedDirectories.js";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";
import { resolveTagLabels } from "./BreweryBrandDetailScreens.jsx";
import { splitTypeTags } from "../venueMapCard.js";
import {
  MapClickCloser,
  floatingButtonStyle,
  DEFAULT_CENTER,
  MY_LOCATION_ZOOM,
  CARD_GAP_PX,
  CARD_BOTTOM_PX,
  PIN_SAFE_TOP_PX,
  PIN_SAFE_SIDE_PX,
  PIN_SAFE_RIGHT_PX,
} from "./VenueMapScreen.jsx";

// Même repère que celui des Lieux (goutte en SVG inline), en rose fluo.
const shopPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${COLORS.pinkFluo};transform:rotate(-45deg);border:2px solid ${COLORS.paper};box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Le cadre du shop choisi : rond-profil, nom et sous-titre, adresse postale et catégories (très fines). Tout le cadre est un seul bouton qui ouvre la fiche.
function ShopMapCard({ cardRef, pin, shop, categoryLabels, onOpen }) {
  const loaded = !!shop;
  const address = loaded ? formatAddress(shop) : "";
  const { shown, extra } = splitTypeTags(categoryLabels);
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
      data-testid="shop-map-card"
      onClick={onOpen}
      aria-label={`Voir la fiche de ${pin.name}`}
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
      {loaded || shop === false ? (
        <EntityAvatar photoUrl={shop ? shop.profilePhotoUrl : null} size={52} />
      ) : (
        <span aria-hidden="true" style={{ width: "52px", height: "52px", borderRadius: "50%", background: COLORS.paperAlt, border: `2px solid ${COLORS.paperAlt}`, flexShrink: 0, boxSizing: "border-box" }} />
      )}
      <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pin.name}</span>
        {loaded && shop.subtitle && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.chalkWhite, fontStyle: "italic", fontWeight: 600, minWidth: 0 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.pinkFluo, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shop.subtitle}</span>
          </span>
        )}
        {address && <span style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "1px" }}>{address}</span>}
        {shown.length > 0 && (
          <span data-testid="shop-map-tags" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            {shown.map((label) => (
              <span key={label} style={tagStyle}>
                {label}
              </span>
            ))}
            {extra > 0 && <span style={tagStyle}>+{extra}</span>}
          </span>
        )}
      </span>
    </button>
  );
}

// `initialView` : l'état de la carte au moment où l'on a quitté l'écran pour la fiche d'un shop (voir `onOpenShop`), pour retomber exactement dessus au retour :
// même zoom, même centre, même cadre ouvert. `null` = carte neuve.
export function ShopMapScreen({ onBack, onOpenShop, initialView = null }) {
  const [pins, setPins] = useState(initialView?.pins ?? null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const cardRef = useRef(null);

  // Le shop dont le cadre est ouvert (null = aucun). Sa fiche est lue à la demande, une seule fois par shop : les repères ne portent que le nom et la position.
  const [selectedId, setSelectedId] = useState(initialView?.selectedId ?? null);
  const [shopsById, setShopsById] = useState(initialView?.shopsById ?? {});
  const [lists, setLists] = useState(null);
  const requestedRef = useRef(new Set());
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Au retour d'une fiche, les repères d'avant s'affichent tout de suite puis la liste à jour les remplace ; une lecture qui échoue (liste vide) ne vide pas la carte.
  useEffect(() => {
    loadShopMapPins().then((fresh) => setPins((previous) => (previous && fresh.length === 0 ? previous : fresh)));
  }, []);

  const center = useMemo(() => {
    if (!pins || pins.length === 0) return DEFAULT_CENTER;
    const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
    const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
    return [avgLat, avgLng];
  }, [pins]);

  const selectedPin = useMemo(() => (selectedId && pins ? pins.find((p) => p.id === selectedId) || null : null), [selectedId, pins]);
  const selectedShop = selectedId ? shopsById[selectedId] : undefined;

  // Lit la fiche du shop. Un échec n'est pas gardé : le toucher suivant sur ce shop réessaie.
  useEffect(() => {
    if (!selectedId || shopsById[selectedId] || requestedRef.current.has(selectedId)) return;
    const id = selectedId;
    requestedRef.current.add(id);
    (async () => {
      let shop = false;
      try {
        shop = (await loadShopById(id)) || false;
      } catch (e) {
        shop = false;
      }
      if (!aliveRef.current) return;
      if (!shop) requestedRef.current.delete(id);
      setShopsById((prev) => ({ ...prev, [id]: shop }));
    })();
  }, [selectedId]);

  // Les noms des catégories : ceux de la plateforme de gestion (élément ajouté, élément renommé) l'emportent sur la liste de départ. Lus une fois par session,
  // seulement quand un shop choisi a des catégories.
  const hasCategories = !!(selectedShop && (selectedShop.categories || []).length > 0);
  useEffect(() => {
    if (!hasCategories) return undefined;
    let cancelled = false;
    loadShopListsOnce().then((l) => {
      if (l && !cancelled && aliveRef.current) setLists(l);
    });
    return () => {
      cancelled = true;
    };
  }, [hasCategories]);
  const categoryLabels = selectedShop ? resolveTagLabels(lists, selectedShop.categories, SHOP_CATEGORIES, SHOP_CATEGORY_LIST_KEY) : [];

  // Décale la carte pour que le repère choisi reste visible au-dessus du cadre (même règle que pour les Lieux : voir VenueMapScreen). Le cadre retrouvé au retour
  // d'une fiche ne décale rien tant qu'il ne change pas de hauteur.
  const restoredIdRef = useRef(initialView?.selectedId ?? null);
  useEffect(() => {
    const map = mapRef.current;
    const el = cardRef.current;
    if (!map || !el) return undefined;
    const leaveAsIs = restoredIdRef.current === selectedPin.id;
    restoredIdRef.current = null;
    const keepPinVisible = () => {
      map.panInside([selectedPin.lat, selectedPin.lng], {
        paddingTopLeft: [PIN_SAFE_SIDE_PX, PIN_SAFE_TOP_PX],
        paddingBottomRight: [PIN_SAFE_RIGHT_PX, el.offsetHeight + CARD_BOTTOM_PX + CARD_GAP_PX],
      });
    };
    if (!leaveAsIs) keepPinVisible();
    if (typeof ResizeObserver === "undefined") return undefined;
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
    () => (pins || []).map((p) => <Marker key={p.id} position={[p.lat, p.lng]} icon={shopPinIcon} eventHandlers={{ click: () => setSelectedId(p.id) }} />),
    [pins]
  );

  // Ouvre la fiche du shop choisi en laissant à l'appelant de quoi retrouver la carte telle qu'elle est (voir `initialView`).
  const openSelectedShop = () => {
    const map = mapRef.current;
    const mapCenter = map ? map.getCenter() : null;
    onOpenShop(selectedPin.id, {
      selectedId: selectedPin.id,
      center: mapCenter ? [mapCenter.lat, mapCenter.lng] : null,
      zoom: map ? map.getZoom() : null,
      pins,
      shopsById,
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

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Shops sur la carte</h1>
      </div>

      {pins === null ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : (
        <div style={{ flex: 1, minHeight: "300px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
          <MapContainer
            ref={mapRef}
            center={initialView?.center || center}
            zoom={initialView?.zoom ?? (pins.length > 0 ? 7 : 6)}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickCloser onClick={() => setSelectedId(null)} />
            {markers}
          </MapContainer>
          {/* Boutons de la carte puis cadre du shop, empilés en bas ; la zone elle-même laisse passer les touchers vers la carte (la propriété est héritée :
              les boutons et le cadre la remettent à « auto »). */}
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
                <ShopMapCard cardRef={cardRef} pin={selectedPin} shop={selectedShop} categoryLabels={categoryLabels} onOpen={openSelectedShop} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
