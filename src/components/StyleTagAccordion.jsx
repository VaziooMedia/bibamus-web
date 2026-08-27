import React, { useState, useMemo } from "react";

// groups: [{ title, tags: [{ code, fr }] }] — selected est un tableau de codes.
// Barre de recherche en haut (avec des centaines de tags, s'y retrouver autrement serait
// pénible) — tape un mot, seuls les groupes contenant une correspondance restent visibles,
// dépliés automatiquement. Bouton "Tout déplier / Tout replier" pour parcourir librement.
export function StyleTagAccordion({ groups, selected, onToggle }) {
  const [query, setQuery] = useState("");
  const [openIndices, setOpenIndices] = useState(new Set());

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return groups.map((g, i) => ({ ...g, index: i }));
    return groups.map((g, i) => ({ ...g, index: i, tags: g.tags.filter((t) => t.fr.toLowerCase().includes(q)) })).filter((g) => g.tags.length > 0);
  }, [groups, q]);

  const isOpen = (i) => (q ? true : openIndices.has(i));

  const toggleGroup = (i) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const allOpen = openIndices.size === groups.length;
  const toggleAll = () => setOpenIndices(allOpen ? new Set() : new Set(groups.map((_, i) => i)));

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un style (ex. IPA, Sour, Normand...)"
          style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "13px" }}
        />
        {!q && (
          <button
            onClick={toggleAll}
            style={{ background: "none", border: "2px solid #28405C", borderRadius: "8px", padding: "9px 12px", color: "#F2F2E8", fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {allOpen ? "Tout replier" : "Tout déplier"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filteredGroups.length === 0 && <p style={{ fontSize: "12.5px", color: "#8792A6", fontStyle: "italic" }}>Aucun style ne correspond à "{query}".</p>}
        {filteredGroups.map((group) => {
          const open = isOpen(group.index);
          const selectedInGroup = group.tags.filter((t) => selected.includes(t.code)).length;
          return (
            <div key={group.title} style={{ border: "2px solid #28405C", borderRadius: "8px", overflow: "hidden" }}>
              <button
                onClick={() => toggleGroup(group.index)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#16273D",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#F2F2E8" }}>
                  {group.title}
                  {selectedInGroup > 0 && <span style={{ color: "#39FF66", fontWeight: 800 }}> ({selectedInGroup})</span>}
                </span>
                <span style={{ color: "#39FF66", fontSize: "11px" }}>{open ? "▼" : "▶"}</span>
              </button>
              {open && (
                <div style={{ padding: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {group.tags.map((tag) => {
                    const checked = selected.includes(tag.code);
                    return (
                      <button
                        key={tag.code}
                        onClick={() => onToggle(tag.code)}
                        style={{
                          background: checked ? "#39FF66" : "none",
                          border: `2px solid ${checked ? "#39FF66" : "#28405C"}`,
                          borderRadius: "999px",
                          padding: "5px 11px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          color: checked ? "#0D1B2A" : "#F2F2E8",
                          cursor: "pointer",
                        }}
                      >
                        {tag.fr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
