import React, { useState, useEffect, useRef } from "react";

// allColumns: [{ key, label, render? }]
// fetchPage({ search, sortKey, sortDir, page, pageSize }) → Promise<{ items, total }>
// refreshKey: changez cette valeur pour forcer un rechargement (ex. après une catégorie changée ailleurs)
export function ServerDataTable({ allColumns, forcedKeys = [], defaultVisibleKeys, fetchPage, onRowClick, onAdd, searchPlaceholder = "Rechercher...", pageSize = 50, refreshKey }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visibleKeys, setVisibleKeys] = useState(defaultVisibleKeys || allColumns.map((c) => c.key));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const [sortKey, setSortKey] = useState(allColumns[0]?.key);
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const columns = allColumns.filter((c) => forcedKeys.includes(c.key) || visibleKeys.includes(c.key));

  // Recherche différée de 350ms — évite de relancer une requête à chaque frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage({ search: debouncedQuery, sortKey, sortDir, page, pageSize }).then(({ items: newItems, total: newTotal }) => {
      if (cancelled) return;
      setItems(newItems);
      setTotal(newTotal);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sortKey, sortDir, page, refreshKey]);

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

  const toggleSort = (key) => {
    setPage(0);
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : page * pageSize + 1;
  const toIdx = Math.min(total, (page + 1) * pageSize);

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
        <div style={{ fontSize: "13px", color: "#8792A6" }}>
          {total} résultat{total > 1 ? "s" : ""}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{ background: "#39FF66", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#0D1B2A", cursor: "pointer", fontSize: "14px", fontWeight: 800 }}
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
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#8792A6", fontStyle: "italic" }}>
                Chargement...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#8792A6", fontStyle: "italic" }}>
                Aucun résultat.
              </td>
            </tr>
          ) : (
            items.map((item) => (
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
            ))
          )}
        </tbody>
      </table>

      {total > pageSize && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
          <span style={{ fontSize: "12.5px", color: "#8792A6" }}>
            {fromIdx}–{toIdx} sur {total}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "7px 12px", color: "#F2F2E8", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, fontSize: "13px" }}
            >
              ← Précédent
            </button>
            <span style={{ fontSize: "12.5px", color: "#8792A6", padding: "7px 4px" }}>
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                background: "none",
                border: "2px solid #28405C",
                borderRadius: "8px",
                padding: "7px 12px",
                color: "#F2F2E8",
                cursor: page >= totalPages - 1 ? "default" : "pointer",
                opacity: page >= totalPages - 1 ? 0.4 : 1,
                fontSize: "13px",
              }}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
