import React, { useState } from "react";

// tags: tableau de chaînes. Tapez une valeur puis Entrée (ou virgule) pour l'ajouter — pour les
// listes ouvertes (variétés de houblon, malts...) où aucune liste fermée ne suffirait.
export function FreeTagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  };

  const remove = (t) => onChange(tags.filter((x) => x !== t));

  return (
    <div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
          {tags.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#39FF66", color: "#0D1B2A", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
              {t}
              <button onClick={() => remove(t)} style={{ background: "none", border: "none", color: "#0D1B2A", cursor: "pointer", padding: 0, fontWeight: 800 }}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        style={{ padding: "9px 12px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "13px", width: "100%" }}
      />
    </div>
  );
}
