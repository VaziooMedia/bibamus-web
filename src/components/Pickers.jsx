// ============================================================
// Composants de sélection réutilisables — copiés tels quels
// depuis le prototype Claude (choisir des Bibax, des participants,
// ou un établissement existant dans le répertoire).
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, VerifiedBadge } from "./icons.jsx";
import { normalizeForSearch, capitalizeFirst, sameVenueByNameCity } from "../utils.js";

export function BibaxSearchPicker({ bibros, excludeCodes = [], onPick, placeholder = "Rechercher un Bibax..." }) {
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

  const available = bibros.filter((b) => !excludeCodes.includes(b.code));
  const q = normalizeForSearch(query.trim());
  const filtered = (q ? available.filter((b) => normalizeForSearch(b.alias || b.name).includes(q)) : available).sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return (a.alias || a.name).localeCompare(b.alias || b.name);
  });

  const pick = (b) => {
    onPick(b);
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
        <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <NavIcon name="search" size={14} color={COLORS.amber} />
          Ajouter depuis tes Bibax...
        </span>
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
            {available.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Tous tes Bibax sont déjà ajoutés.</p>
            ) : filtered.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Aucun Bibax trouvé.</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.code}
                  onClick={() => pick(b)}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: COLORS.ink, cursor: "pointer" }}
                >
                  {b.isFavorite ? "⭐ " : ""}
                  {b.alias || b.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ParticipantsEditor({ names, onChange, placeholder = "Participants sans compte - Prénom ou surnom", selfName, bibros }) {
  const [nameInput, setNameInput] = useState("");

  const addName = () => {
    const trimmed = capitalizeFirst(nameInput.trim());
    if (!trimmed) return;
    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setNameInput("");
      return;
    }
    onChange([...names, trimmed]);
    setNameInput("");
  };

  const removeName = (n) => onChange(names.filter((x) => x !== n));

  return (
    <div>
      {bibros && bibros.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <BibaxSearchPicker
            bibros={bibros.filter((b) => !names.some((n) => n.toLowerCase() === (b.alias || b.name).toLowerCase()))}
            onPick={(b) => {
              const label = capitalizeFirst(b.alias || b.name);
              if (!names.some((n) => n.toLowerCase() === label.toLowerCase())) onChange([...names, label]);
            }}
          />
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addName()}
          placeholder={placeholder}
          style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14.5px", outline: "none" }}
        />
        <button onClick={addName} style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, border: "none", borderRadius: "10px", padding: "0 18px", fontWeight: 700, fontSize: "18px", cursor: "pointer" }}>
          +
        </button>
      </div>
      {(names.length > 0 || selfName) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {selfName && (
            <div
              style={{
                background: COLORS.paperAlt,
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              {selfName} (moi)
            </div>
          )}
          {names.map((n) => (
            <div
              key={n}
              style={{
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "6px 8px 6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              {n}
              <button onClick={() => removeName(n)} style={{ background: COLORS.paperAlt, border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", color: COLORS.inkSoft, fontSize: "12px" }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicVenueSearchPicker({ publicVenues, myVenues, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = normalizeForSearch(query.trim());
  const filtered = q
    ? publicVenues.filter((v) => normalizeForSearch(v.name).includes(q) || normalizeForSearch(v.city).includes(q) || normalizeForSearch(v.postalCode).includes(q))
    : publicVenues;

  const alreadyTracked = (v) =>
    myVenues.some((mv) => mv.sourcePublicVenueId === v.id) ||
    myVenues.some((mv) => sameVenueByNameCity(mv, v));

  const pick = (v) => {
    onPick(v);
    setOpen(false);
    setQuery("");
  };

  const startCreating = () => {
    setNewName(query.trim());
    setNewCity("");
    setCreating(true);
  };

  const confirmCreate = () => {
    if (!newName.trim()) return;
    onPick({ name: newName.trim(), city: newCity.trim() });
    setOpen(false);
    setCreating(false);
    setQuery("");
    setNewName("");
    setNewCity("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "center",
          padding: "11px",
          borderRadius: "9px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          color: COLORS.amber,
          fontWeight: 700,
          fontSize: "13.5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <NavIcon name="search" size={16} color={COLORS.amber} />
        Répertoire des lieux
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
            maxHeight: "320px",
          }}
        >
          {creating ? (
            <div style={{ padding: "12px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, marginBottom: "8px" }}>Nouvel établissement</div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom"
                autoFocus
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none", marginBottom: "8px" }}
              />
              <input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && confirmCreate()}
                placeholder="Ville (facultatif)"
                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none", marginBottom: "10px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setCreating(false)}
                  style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, fontSize: "13px", cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmCreate}
                  disabled={!newName.trim()}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "8px",
                    border: "none",
                    background: newName.trim() ? COLORS.amber : COLORS.paperAlt,
                    color: COLORS.ink,
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: newName.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Créer
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, ville ou code postal..."
                autoFocus
                style={{ margin: "8px", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
              />
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.length === 0 && (
                  <div style={{ padding: "10px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun résultat.</div>
                )}
                {filtered.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => pick(v)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13.5px", color: COLORS.ink }}>
                      {v.name}
                      {v.status === "complete" && <VerifiedBadge size={13} />}
                    </div>
                    <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "1px" }}>
                      {[v.city, alreadyTracked(v) ? "✓ déjà utilisé" : null].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={startCreating}
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
                + Ajouter un nouvel établissement{query.trim() ? ` "${query.trim()}"` : ""}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
