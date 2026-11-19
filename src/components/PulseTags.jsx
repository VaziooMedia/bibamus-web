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
import { COLORS, SUBTYPE_LABELS, NATIONALITY_ELIGIBLE_TYPES } from "../constants.js";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { searchPulseTags, searchPulseVenues, loadPulseTagEntities } from "../data/sharedDirectories.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { SectionLabel, SectionDivider } from "./PulseContentForm.jsx";

// Nombre maximum de tags de fiche dans une publication (le serveur applique la même limite).
export const MAX_POST_TAGS = 5;

export const TAG_TYPE_LABELS = { drink: "Produit", brand: "Marque", producer: "Producteur", venue: "Lieu" };

// Même repère que les Stories : « @ » pour un lieu, « # » pour un produit, une marque ou un producteur.
export const tagSymbol = (type) => (type === "venue" ? "@" : "#");

const tagKey = (t) => `${t.type}:${t.id}`;

// Ligne de détail d'une fiche proposée dans le sélecteur, sous son nom (Mehdi, 2026-11-19) — petits éléments séparés par le petit point vert fluo des
// listes du BibAtlas :
//   - produit : sous-catégorie · drapeau du pays · degré (« 6.2% ABV »), comme la fiche produit d'une carte DrinkCheck (le drapeau seulement pour les
//     catégories où le pays est affiché dans l'app) ;
//   - marque, producteur : drapeau du pays ;
//   - lieu : commune · drapeau du pays.
// Le drapeau du pays : « International » / « Autre » ont le globe ; un pays sans drapeau connu garde son nom écrit ; pays non renseigné : rien.
// Un élément sans donnée n'est pas affiché, et la ligne entière disparaît quand il n'en reste aucun.
function tagDetailParts(r) {
  const info = r.info || {};
  const parts = [];
  const flag = (country) => {
    if (!country || country === "Non renseigné") return;
    const known = !!COUNTRY_ISO_CODES[country] || country === "International" || country === "Autre";
    parts.push(
      known ? (
        <span key="flag" title={country} style={{ display: "inline-flex", flexShrink: 0 }}>
          <CountryFlagImg country={country} size={16} />
        </span>
      ) : (
        <span key="flag" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{country}</span>
      )
    );
  };
  if (r.type === "drink") {
    const subtypeLabel = SUBTYPE_LABELS[info.subtype] || info.drinkType || "";
    if (subtypeLabel) parts.push(<span key="sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtypeLabel}</span>);
    if (NATIONALITY_ELIGIBLE_TYPES.includes(info.drinkType)) flag(info.country);
    if (info.abv != null) parts.push(<span key="abv" style={{ whiteSpace: "nowrap" }}>{`${Number(info.abv).toFixed(1)}% ABV`}</span>);
  } else if (r.type === "venue") {
    if (info.city) parts.push(<span key="city" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.city}</span>);
    flag(info.country);
  } else {
    flag(info.country);
  }
  return parts;
}

function TagDetailLine({ result }) {
  const parts = tagDetailParts(result);
  if (parts.length === 0) return null;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "1px", fontSize: "11.5px", color: COLORS.inkSoft, minWidth: 0 }}>
      {parts.map((part, i) => (
        <React.Fragment key={part.key}>
          {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
          {part}
        </React.Fragment>
      ))}
    </span>
  );
}

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


// Liste des propositions d'une recherche (sélecteur de tags et sélecteur de lieu) : jusqu'à 10 fiches par sorte, la liste défile (hauteur limitée) au lieu
// d'allonger la page. Chaque ligne : le nom, sa ligne de détail (drapeau…) et, avec `showType`, la sorte de fiche à droite.
function TagResultsList({ results, onPick, showType = true }) {
  return (
    <div style={{ marginTop: "4px", background: COLORS.paper, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", overflowX: "hidden", overflowY: "auto", maxHeight: "min(50vh, 340px)", overscrollBehavior: "contain" }}>
      {results.map((r) => (
        <button
          key={tagKey(r)}
          onClick={() => onPick(r)}
          style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <TagDetailLine result={r} />
          </span>
          {showType && <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>{TAG_TYPE_LABELS[r.type]}</span>}
        </button>
      ))}
    </div>
  );
}

// Section « Lieu » de l'écran de rédaction d'une publication libre (Mehdi, 2026-11-19 : « à la place de mettre le lieu dans les tags », sous « Photo ») : UN seul lieu,
// choisi dans une recherche (2 lettres au moins) qui propose jusqu'à 10 lieux, du plus proche au plus loin quand la position est connue (demandée une seule fois, quand
// on touche le champ). Le lieu choisi s'affiche en pastille « @ Nom » avec une croix. `venue` : { id, name } ou null. `blocked` : les 5 tags du serveur sont déjà pris
// par d'autres fiches (le lieu en compte un) — la recherche est alors remplacée par un message.
export function PulseVenuePicker({ venue, onChange, blocked = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const term = query.trim();
  const { status: geoStatus, position, requestPosition } = useGeolocation();
  const askPosition = () => {
    if (geoStatus === "idle") requestPosition();
  };

  useEffect(() => {
    if (term.length < 2 || venue || blocked) {
      setResults([]);
      setStatus("idle");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(() => {
      searchPulseVenues(term, 10, position).then((found) => {
        if (cancelled) return;
        setResults(found);
        setStatus("done");
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, venue, blocked, position]);

  const pick = (r) => {
    onChange({ id: r.id, name: r.name });
    setQuery("");
    setResults([]);
    setStatus("idle");
  };

  return (
    <div>
      <SectionLabel icon="map-pin">Lieu</SectionLabel>
      {venue && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", maxWidth: "100%", background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 6px 4px 11px", fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}>
          <span style={{ color: COLORS.amber, flexShrink: 0 }}>{tagSymbol("venue")}</span>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venue.name}</span>
          <button onClick={() => onChange(null)} aria-label={"Retirer " + venue.name} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 6px", flexShrink: 0 }}>
            ×
          </button>
        </span>
      )}
      {!venue && blocked && <p style={{ margin: 0, fontSize: "12px", color: COLORS.inkSoft }}>{MAX_POST_TAGS} tags déjà choisis : retire-en un pour ajouter un lieu.</p>}
      {!venue && !blocked && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={askPosition}
            placeholder="Rechercher un lieu"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
          />
          {status === "loading" && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Recherche...</p>}
          {status === "done" && results.length === 0 && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft }}>Aucun lieu pour « {term} ».</p>}
          {status === "done" && results.length > 0 && <TagResultsList results={results} onPick={pick} showType={false} />}
        </>
      )}
    </div>
  );
}

// Sélecteur de l'écran de rédaction : une seule recherche pour les produits, les marques et les producteurs (les lieux ont leur section « Lieu », voir
// PulseVenuePicker), jusqu'à `max` tags (5 au plus : le serveur applique la même limite à l'ensemble des fiches de la publication, lieu compris).
export function PulseTagsPicker({ tags, onChange, endDivider = false, max = MAX_POST_TAGS }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  // "idle" : pas de recherche en cours · "loading" · "done" (résultats, éventuellement vides, affichés)
  const [status, setStatus] = useState("idle");
  const term = query.trim();
  const full = tags.length >= max;
  // Position de la personne, demandée UNE fois, au moment où elle touche le champ (jamais en silence à l'ouverture de l'écran) : les lieux et les
  // producteurs sont classés du plus proche au plus loin (décidé par Mehdi, 2026-11-19). Sans autorisation ou sans position, l'ordre habituel.
  const { status: geoStatus, position, requestPosition } = useGeolocation();
  const askPosition = () => {
    if (geoStatus === "idle") requestPosition();
  };

  useEffect(() => {
    if (term.length < 2 || full) {
      setResults([]);
      setStatus("idle");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(() => {
      searchPulseTags(term, 10, position).then((found) => {
        if (cancelled) return;
        setResults(found);
        setStatus("done");
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, full, position]);

  const chosen = new Set(tags.map(tagKey));
  const proposals = results.filter((r) => !chosen.has(tagKey(r)));

  const add = (r) => {
    if (tags.length >= max || chosen.has(tagKey(r))) return;
    onChange([...tags, { type: r.type, id: r.id, name: r.name }]);
    setQuery("");
    setResults([]);
    setStatus("idle");
  };

  return (
    <div style={{ marginBottom: endDivider ? "0" : "20px" }}>
      <SectionLabel icon="tag">
        Tags <span style={{ fontWeight: 400 }}>— produits, marques, producteurs</span>
      </SectionLabel>

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
            onFocus={askPosition}
            placeholder="Rechercher une fiche à taguer"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
          />
          {status === "loading" && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Recherche...</p>}
          {status === "done" && proposals.length === 0 && <p style={{ margin: "6px 2px 0", fontSize: "12px", color: COLORS.inkSoft }}>Aucune fiche pour « {term} ».</p>}
          {status === "done" && proposals.length > 0 && <TagResultsList results={proposals} onPick={add} />}
        </>
      )}
      {full && <p style={{ margin: 0, fontSize: "12px", color: COLORS.inkSoft }}>{MAX_POST_TAGS} tags{max < MAX_POST_TAGS ? " (lieu compris)" : ""} : retire-en un pour en ajouter un autre.</p>}
      {endDivider && <SectionDivider />}
    </div>
  );
}
