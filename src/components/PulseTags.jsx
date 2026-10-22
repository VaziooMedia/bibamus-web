// ============================================================
// Tags de fiche d'une publication libre BibaPulse : produits, marques, producteurs, lieux.
//
//   <PulseTagsPicker tags={tags} onChange={setTags} />     // sélecteur de l'écran de rédaction (5 tags au plus)
//   const tagEntities = usePostTagEntities(entries);       // noms des fiches taguées dans une liste de cartes
//   <PulseTagPills tags={meta.tags} entities={tagEntities} handlers={{ drink, venue, brand, producer }} />
//
// Un tag est { type: "drink" | "brand" | "producer" | "venue", id }. Il est stocké dans la publication
// (metadata.tags, vérifié par le serveur) sans son nom : le nom est relu à l'affichage, pour suivre les
// renommages de fiche.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { searchPulseTags, loadPulseTagEntities } from "../data/sharedDirectories.js";

// Nombre maximum de tags de fiche dans une publication (le serveur applique la même limite).
export const MAX_POST_TAGS = 5;

export const TAG_TYPE_LABELS = { drink: "Produit", brand: "Marque", producer: "Producteur", venue: "Lieu" };

// Même repère que les Stories : « @ » pour un lieu, « # » pour un produit, une marque ou un producteur.
export const tagSymbol = (type) => (type === "venue" ? "@" : "#");

const tagKey = (t) => `${t.type}:${t.id}`;

// Tags valides d'une publication, tels que le serveur les a enregistrés — tout le reste est ignoré.
export function postTagsOf(entry) {
  const raw = entry && entry.eventType === "post" && entry.metadata && Array.isArray(entry.metadata.tags) ? entry.metadata.tags : [];
  const seen = new Set();
  const tags = [];
  for (const t of raw) {
    if (!t || typeof t.id !== "string" || !TAG_TYPE_LABELS[t.type] || seen.has(tagKey(t))) continue;
    seen.add(tagKey(t));
    tags.push({ type: t.type, id: t.id });
    if (tags.length >= MAX_POST_TAGS) break;
  }
  return tags;
}

// Charge (une seule fois par fiche) le nom des fiches taguées dans une liste de publications.
// Renvoie { "type:id": { id, name } } ; une fiche introuvable ou masquée n'y figure pas.
export function usePostTagEntities(entries) {
  const [entities, setEntities] = useState({});
  const requested = useRef(new Set());
  // Le fil se rafraîchit toutes les 10 secondes : un chargement en cours ne doit jamais être abandonné
  // à ce moment-là (ses fiches sont déjà notées comme demandées) — seulement quand l'écran se ferme.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const missing = [];
    (entries || []).forEach((entry) =>
      postTagsOf(entry).forEach((t) => {
        if (requested.current.has(tagKey(t))) return;
        requested.current.add(tagKey(t));
        missing.push(t);
      })
    );
    if (missing.length === 0) return;
    loadPulseTagEntities(missing).then((found) => {
      if (alive.current) setEntities((prev) => ({ ...prev, ...found }));
    });
  }, [entries]);

  return entities;
}

// Les tags d'une carte, en pastilles. Une pastille mène à la fiche quand l'écran hôte sait l'ouvrir.
// handlers : { drink, venue, brand, producer } — chacun reçoit l'identifiant de la fiche.
export function PulseTagPills({ tags, entities, handlers = {} }) {
  const shown = tags.filter((t) => entities[tagKey(t)]);
  if (shown.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {shown.map((t) => {
        const entity = entities[tagKey(t)];
        const open = handlers[t.type];
        const pillStyle = {
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          maxWidth: "100%",
          background: COLORS.paperAlt,
          border: "none",
          borderRadius: "999px",
          padding: "3px 10px",
          fontSize: "12px",
          fontWeight: 700,
          color: COLORS.ink,
          cursor: open ? "pointer" : "default",
        };
        const content = (
          <>
            <span style={{ color: COLORS.amber, flexShrink: 0 }}>{tagSymbol(t.type)}</span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.name}</span>
          </>
        );
        return open ? (
          <button key={tagKey(t)} onClick={() => open(t.id)} style={pillStyle}>
            {content}
          </button>
        ) : (
          <span key={tagKey(t)} style={pillStyle}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

const labelStyle = { fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" };

// Sélecteur de l'écran de rédaction : une seule recherche pour les quatre sortes de fiche, jusqu'à 5 tags.
export function PulseTagsPicker({ tags, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  // "idle" : pas de recherche en cours · "loading" · "done" (résultats, éventuellement vides, affichés)
  const [status, setStatus] = useState("idle");
  const term = query.trim();
  const full = tags.length >= MAX_POST_TAGS;

  useEffect(() => {
    if (term.length < 2 || full) {
      setResults([]);
      setStatus("idle");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(() => {
      searchPulseTags(term).then((found) => {
        if (cancelled) return;
        setResults(found);
        setStatus("done");
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, full]);

  const chosen = new Set(tags.map(tagKey));
  const proposals = results.filter((r) => !chosen.has(tagKey(r)));

  const add = (r) => {
    if (tags.length >= MAX_POST_TAGS || chosen.has(tagKey(r))) return;
    onChange([...tags, { type: r.type, id: r.id, name: r.name }]);
    setQuery("");
    setResults([]);
    setStatus("idle");
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={labelStyle}>
        Tags <span style={{ fontWeight: 400 }}>— produits, marques, producteurs, lieux ({MAX_POST_TAGS} au plus)</span>
      </label>

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          {tags.map((t) => (
            <span
              key={tagKey(t)}
              style={{ display: "inline-flex", alignItems: "center", gap: "3px", maxWidth: "100%", background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 6px 4px 11px", fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}
            >
              <span style={{ color: COLORS.amber, flexShrink: 0 }}>{tagSymbol(t.type)}</span>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              <button
                onClick={() => onChange(tags.filter((x) => tagKey(x) !== tagKey(t)))}
                aria-label={"Retirer " + t.name}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 6px", flexShrink: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!full && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche à taguer"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
          />
          {status === "loading" && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Recherche...</p>}
          {status === "done" && proposals.length === 0 && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft }}>Aucune fiche pour « {term} ».</p>}
          {status === "done" && proposals.length > 0 && (
            <div style={{ marginTop: "4px", background: COLORS.paper, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", overflow: "hidden" }}>
              {proposals.map((r) => (
                <button
                  key={tagKey(r)}
                  onClick={() => add(r)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    {r.detail && <span style={{ display: "block", fontSize: "11.5px", color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.detail}</span>}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>{TAG_TYPE_LABELS[r.type]}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {full && <p style={{ margin: 0, fontSize: "12px", color: COLORS.inkSoft }}>{MAX_POST_TAGS} tags : retire-en un pour en ajouter un autre.</p>}
    </div>
  );
}
