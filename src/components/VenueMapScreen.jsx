import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader } from "./ui.jsx";
import { loadVenueMapPins } from "../data/sharedDirectories.js";

// Icône personnalisée en SVG inline — évite le souci classique des icônes par défaut de
// Leaflet, dont les chemins d'image ne se résolvent pas correctement avec les bundlers
// modernes (Vite compris) sans configuration supplémentaire.
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${COLORS.amber};transform:rotate(-45deg);border:2px solid ${COLORS.paper};box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26],
});

// Centre par défaut si aucun lieu n'a encore de coordonnées (Belgique, cœur du réseau actuel).
const DEFAULT_CENTER = [50.5039, 4.4699];
// Niveau de zoom volontairement pas trop serré une fois centré sur la position — le but est de
// voir les lieux alentour, pas seulement la rue où l'on se trouve.
const MY_LOCATION_ZOOM = 13;

export function VenueMapScreen({ onBack, onOpenVenue }) {
  const [pins, setPins] = useState(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    loadVenueMapPins().then(setPins);
  }, []);

  const center = useMemo(() => {
    if (!pins || pins.length === 0) return DEFAULT_CENTER;
    const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
    const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
    return [avgLat, avgLng];
  }, [pins]);

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
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>Lieux sur la carte</h1>
      </div>

      {pins === null ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : (
        <div style={{ flex: 1, minHeight: "300px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
          <MapContainer ref={mapRef} center={center} zoom={pins.length > 0 ? 7 : 6} style={{ width: "100%", height: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pins.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon}>
                <Popup>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <button
                      onClick={() => onOpenVenue(p.id)}
                      style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "12.5px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
                    >
                      Voir la fiche
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <button
            onClick={centerOnMyLocation}
            disabled={locating}
            title="Centrer sur ma position"
            aria-label="Centrer sur ma position"
            style={{
              position: "absolute",
              bottom: "16px",
              right: "16px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: COLORS.surfaceAlt,
              border: `2px solid ${COLORS.paperAlt}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: locating ? "default" : "pointer",
              zIndex: 1000,
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            <NavIcon name="crosshair" size={20} color={locating ? COLORS.inkSoft : COLORS.amber} />
          </button>
        </div>
      )}
    </div>
  );
}
