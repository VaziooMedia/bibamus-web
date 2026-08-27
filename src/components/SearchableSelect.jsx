import React, { useState, useRef, useEffect } from "react";

// Menu déroulant avec barre de recherche — plus simple à utiliser qu'une liste déroulante
// classique dès que le répertoire (marques, producteurs) devient long.
export function SearchableSelect({ options, value, onChange, placeholder = "Rechercher..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.id === value)?.name || "";
  const filtered = query.trim() ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())) : options;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "2px solid #28405C",
          background: "#0D1B2A",
          color: value ? "#F2F2E8" : "#8792A6",
          fontSize: "14px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{selectedLabel || "Aucun"}</span>
        <span style={{ color: "#8792A6", fontSize: "11px" }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "#16273D",
            border: "2px solid #28405C",
            borderRadius: "8px",
            zIndex: 20,
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", padding: "10px 12px", border: "none", borderBottom: "2px solid #28405C", background: "none", color: "#F2F2E8", fontSize: "13px" }}
          />
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
              setQuery("");
            }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", color: "#8792A6", fontSize: "13px", cursor: "pointer" }}
          >
            Aucun
          </button>
          {filtered.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
                setQuery("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                background: o.id === value ? "#28405C" : "none",
                border: "none",
                color: "#F2F2E8",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {o.name}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px 12px", color: "#8792A6", fontSize: "12.5px", fontStyle: "italic" }}>Aucun résultat.</div>}
        </div>
      )}
    </div>
  );
}

// Variante à choix multiples — pour les producteurs (collaboration possible entre plusieurs).
export function SearchableMultiSelect({ options, values, onChange, placeholder = "Rechercher..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.filter((o) => values.includes(o.id));
  const filtered = query.trim() ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())) : options;

  const toggle = (id) => onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          minHeight: "42px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "2px solid #28405C",
          background: "#0D1B2A",
          cursor: "pointer",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {selected.length === 0 && <span style={{ color: "#8792A6", fontSize: "14px" }}>Aucun</span>}
        {selected.map((o) => (
          <span
            key={o.id}
            style={{ background: "#39FF66", color: "#0D1B2A", borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {o.name}
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.id);
              }}
              style={{ cursor: "pointer" }}
            >
              ✕
            </span>
          </span>
        ))}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "#16273D",
            border: "2px solid #28405C",
            borderRadius: "8px",
            zIndex: 20,
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", padding: "10px 12px", border: "none", borderBottom: "2px solid #28405C", background: "none", color: "#F2F2E8", fontSize: "13px" }}
          />
          {filtered.map((o) => (
            <label key={o.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", fontSize: "13px", color: "#F2F2E8", cursor: "pointer" }}>
              <input type="checkbox" checked={values.includes(o.id)} onChange={() => toggle(o.id)} />
              {o.name}
            </label>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px 12px", color: "#8792A6", fontSize: "12.5px", fontStyle: "italic" }}>Aucun résultat.</div>}
        </div>
      )}
    </div>
  );
}
