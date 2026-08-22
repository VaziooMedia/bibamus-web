// ============================================================
// Sélecteurs supplémentaires — lier une boisson existante,
// choisir une marque, positionner un établissement sur une
// carte (via Leaflet, chargé depuis un CDN). Copiés tels quels
// depuis le prototype Claude.
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS, GENERIC_BRAND_LABEL } from "../constants.js";
import { VerifiedBadge } from "./icons.jsx";
import { normalizeForSearch, normalizeForDuplicateCheck, drinkTypeLabel, ensureLeafletLoaded } from "../utils.js";

export function DrinkLinkPicker({ drinksDirectory, onPick, placeholder = "Rechercher une boisson..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = normalizeForSearch(query.trim());
  const filtered = (q ? drinksDirectory.filter((d) => normalizeForSearch(d.name).includes(q)) : drinksDirectory)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30);

  const pick = (d) => {
    onPick(d);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "11px 14px",
          borderRadius: "10px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          fontSize: "13.5px",
          color: COLORS.inkSoft,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>🔎 Choisir une boisson...</span>
        <span style={{ fontSize: "11px" }}>{open ? "▲" : "▾"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "none", borderBottom: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Aucune boisson trouvée.</p>
            ) : (
              filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => pick(d)}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: COLORS.ink, cursor: "pointer" }}
                >
                  {d.name} <span style={{ fontWeight: 400, color: COLORS.inkSoft, fontSize: "12px" }}>({drinkTypeLabel(d.type)})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandSearchSelect({ value, onChange, brands, onRegister, placeholder = "Sélectionner une marque..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = normalizeForSearch(query.trim());
  const filtered = (q ? brands.filter((b) => normalizeForSearch(b.name).includes(q)) : [...brands])
    .filter((b) => normalizeForDuplicateCheck(b.name) !== normalizeForDuplicateCheck(GENERIC_BRAND_LABEL))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exactMatch = brands.some((b) => normalizeForDuplicateCheck(b.name) === normalizeForDuplicateCheck(query));

  const pick = (name, isNew) => {
    const canonicalName = onRegister ? onRegister(name) : name;
    onChange(canonicalName || name);
    setDuplicateNotice(isNew && canonicalName && canonicalName !== name ? canonicalName : null);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "10px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          fontSize: "14px",
          color: value ? COLORS.ink : COLORS.inkSoft,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{open ? "▲" : "▾"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            maxHeight: "300px",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.trim() && !exactMatch && pick(query.trim())}
            placeholder="Rechercher ou ajouter..."
            autoFocus
            style={{ margin: "8px", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <button
            onClick={() => {
              onChange(GENERIC_BRAND_LABEL);
              setDuplicateNotice(null);
              setOpen(false);
              setQuery("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "calc(100% - 16px)",
              margin: "0 8px 8px 8px",
              textAlign: "left",
              padding: "10px 12px",
              background: value === GENERIC_BRAND_LABEL ? COLORS.amber : COLORS.paperAlt,
              border: `2px dashed ${COLORS.inkSoft}`,
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              color: COLORS.ink,
              cursor: "pointer",
            }}
          >
            <span>🏷️ {GENERIC_BRAND_LABEL}</span>
            <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500 }}>si tu ne sais pas</span>
          </button>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && !query.trim() && (
              <div style={{ padding: "10px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucune marque enregistrée pour l'instant.</div>
            )}
            {filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => pick(b.name, false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background: value === b.name ? COLORS.paperAlt : "transparent",
                  border: "none",
                  fontSize: "13.5px",
                  color: COLORS.ink,
                  cursor: "pointer",
                }}
              >
                {b.name}
                {b.status === "certified" && <VerifiedBadge size={13} />}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                onClick={() => pick(query.trim(), true)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  borderTop: filtered.length > 0 ? `1px dashed ${COLORS.paperAlt}` : "none",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: COLORS.wine,
                  cursor: "pointer",
                }}
              >
                + Ajouter "{query.trim()}"
              </button>
            )}
          </div>
          {value && (
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                borderTop: `1px dashed ${COLORS.paperAlt}`,
                fontSize: "12px",
                color: COLORS.inkSoft,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Effacer la sélection
            </button>
          )}
        </div>
      )}
      {duplicateNotice && (
        <p style={{ fontSize: "11.5px", color: COLORS.wine, fontWeight: 700, marginTop: "6px" }}>
          "{duplicateNotice}" existait déjà — sélectionné plutôt que dupliqué.
        </p>
      )}
    </div>
  );
}

export function VenuePositionPicker({ lat, lng, onChange }) {
  const mapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"

  React.useEffect(() => {
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;
      try {
        const L = window.L;
        const start = lat != null && lng != null ? [lat, lng] : [50.42, 6.09];
        const map = L.map(mapContainerRef.current).setView(start, lat != null ? 15 : 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const placeMarker = (latlng) => {
          if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
          } else {
            markerRef.current = L.marker(latlng, { draggable: true }).addTo(map);
            markerRef.current.on("dragend", () => {
              const pos = markerRef.current.getLatLng();
              onChange(pos.lat, pos.lng);
            });
          }
        };

        if (lat != null && lng != null) placeMarker([lat, lng]);

        map.on("click", (e) => {
          placeMarker(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        setStatus("ready");
      } catch (e) {
        setStatus("error");
      }
    };

    ensureLeafletLoaded(initMap, () => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {status === "error" && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "8px" }}>La carte n'a pas pu se charger.</p>}
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        {lat != null ? "Glissez le repère pour ajuster, ou touchez ailleurs pour le déplacer." : "Touchez la carte à l'emplacement de l'établissement."}
      </p>
      <div ref={mapContainerRef} style={{ width: "100%", height: "220px", borderRadius: "12px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.paperAlt }} />
      {lat != null && (
        <button
          onClick={() => onChange(null, null)}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "8px 0 0 0" }}
        >
          Retirer la position
        </button>
      )}
    </div>
  );
}
