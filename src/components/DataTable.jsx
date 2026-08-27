import React, { useState, useMemo, useRef, useEffect } from "react";

// allColumns: [{ key, label, render? }] — la liste complète des colonnes possibles.
// forcedKeys: clés toujours affichées, non désactivables (ex. ["name", "status"]).
// defaultVisibleKeys: clés affichées par défaut au premier chargement.
export function DataTable({ items, allColumns, forcedKeys = [], defaultVisibleKeys, onRowClick, onAdd, searchPlaceholder = "Rechercher..." }) {
  const [query, setQuery] = useState("");
  const [visibleKeys, setVisibleKeys] = useState(defaultVisibleKeys || allColumns.map((c) => c.key));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  const columns = allColumns.filter((c) => forcedKeys.includes(c.key) || visibleKeys.includes(c.key));
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [sortDir, setSortDir] = useState(1);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleColumn = (key) => {
    if (forcedKeys.includes(key)) return;
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((item) =>
        columns.some((col) => {
          const val = item[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
  }, [items, query, sortKey, sortDir, columns]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "14px", width: "320px" }}
          />
          <div ref={pickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setPickerOpen((o) => !o)}
              style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "10px 14px", color: "#F2F2E8", cursor: "pointer", fontSize: "13px" }}
            >
              Colonnes ▾
            </button>
            {pickerOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "6px",
                  background: "#16273D",
                  border: "2px solid #28405C",
                  borderRadius: "8px",
                  padding: "10px",
                  zIndex: 10,
                  minWidth: "220px",
                }}
              >
                {allColumns.map((col) => {
                  const forced = forcedKeys.includes(col.key);
                  const checked = forced || visibleKeys.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "13px", color: forced ? "#8792A6" : "#F2F2E8", cursor: forced ? "default" : "pointer" }}
                    >
                      <input type="checkbox" checked={checked} disabled={forced} onChange={() => toggleColumn(col.key)} />
                      {col.label}
                      {forced && <span style={{ fontSize: "10.5px", opacity: 0.7 }}>(toujours affiché)</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#8792A6" }}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</div>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              background: "#39FF66",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              color: "#0D1B2A",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            +
          </button>
        )}
      </div>
      <table>
        <thead>
          <tr style={{ borderBottom: "2px solid #28405C" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                style={{ textAlign: "left", padding: "10px 12px", fontSize: "12.5px", color: "#8792A6", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
              >
                {col.label} {sortKey === col.key ? (sortDir === 1 ? "▲" : "▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick(item)}
              style={{ borderBottom: "1px solid #16273D", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#16273D")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "10px 12px", fontSize: "14px" }}>
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#8792A6", fontStyle: "italic" }}>
                Aucun résultat.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }) {
  const config = {
    certified: { bg: "#39FF66", symbol: "✓", title: "Certifié" },
    reviewed: { bg: "#FF3B4E", symbol: "✕", title: "Non certifié" },
    pending: { bg: "#00C8FF", symbol: "–", title: "À vérifier" },
  }[status] || { bg: "#00C8FF", symbol: "–", title: "À vérifier" };
  return (
    <span
      title={config.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: config.bg,
        color: "#0D1B2A",
        fontSize: "12px",
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {config.symbol}
    </span>
  );
}
