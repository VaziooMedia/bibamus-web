import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader } from "./ui.jsx";
import { uploadStoryMedia, createStory, searchVenues, searchDrinks, searchBrands, searchBreweries } from "../data/sharedDirectories.js";
import { MobileImageEditor } from "./MobileImageEditor.jsx";
import { MobileTagPill } from "./MobileTagPill.jsx";

// Vrai tag "recherche + sélection unique" — vrai libellé au-dessus, vrai champ de recherche ou
// vraie pastille choisie en dessous. Recherche dès 2 caractères, comme les autres pickers de
// l'app.
function TagPicker({ label, searchFn, selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    searchFn(query).then((r) => {
      if (!cancelled) setResults(r.slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, [query, searchFn]);

  return (
    <div>
      <p style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px" }}>{label}</p>
      {selected ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: COLORS.surfaceAlt, borderRadius: "999px", padding: "6px 6px 6px 14px" }}>
          <span style={{ fontSize: "13.5px", color: COLORS.ink, fontWeight: 700 }}>{selected.name}</span>
          <button
            onClick={() => onSelect(null)}
            style={{ width: "20px", height: "20px", borderRadius: "50%", border: "none", background: COLORS.paper, color: COLORS.inkSoft, cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", background: COLORS.surface, color: COLORS.ink, outline: "none" }}
          />
          {results.length > 0 && (
            <div style={{ marginTop: "4px", background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.paperAlt}`, overflow: "hidden" }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelect(r);
                    setQuery("");
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", color: COLORS.ink, fontSize: "13.5px", cursor: "pointer" }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Les 4 vrais tags de fiche possibles, avec leur vrai symbole propre — la légende n'en a pas,
// vu que c'est un vrai texte libre plutôt qu'une référence à une fiche précise.
const TAG_TYPES = [
  { key: "venue", label: "Taguer un lieu", symbol: "@", searchFn: searchVenues },
  { key: "drink", label: "Taguer un produit", symbol: "#", searchFn: searchDrinks },
  { key: "brand", label: "Taguer une marque", symbol: "#", searchFn: searchBrands },
  { key: "producer", label: "Taguer un producteur", symbol: "#", searchFn: searchBreweries },
];

// Création d'une Story — depuis Home (contexte "global", destinée à BibaPulse) ou depuis un
// BibaRoom (contexte "room", salon uniquement par défaut, avec choix explicite pour aussi la
// diffuser dans BibaPulse). La confidentialité est toujours privilégiée par défaut.
//
// En 2 vraies étapes comme côté plateforme de gestion : cadrage (position/zoom/rotation/fond,
// au doigt plutôt qu'au curseur), puis légende + taguage avec placement visuel de chaque tag
// directement sur l'image.
export function StoryCreateScreen({ contextType, contextId, venueName, myUserId, onBack, onPublished }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState("edit");
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState("#0D1B2A");
  const [selectedTags, setSelectedTags] = useState({}); // { venue: {id,name}, drink: {...}, ... }
  const [tagPositions, setTagPositions] = useState({});
  const [sharedToPulse, setSharedToPulse] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);

  const activeLabelFor = (key) => {
    if (key === "caption") return caption.trim() || null;
    return selectedTags[key]?.name || null;
  };

  // Ajoute une vraie position par défaut (étagée verticalement) dès qu'un tag devient actif, et
  // retire sa position dès qu'il est désactivé — même vrai mécanisme que côté plateforme de
  // gestion.
  useEffect(() => {
    setTagPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      const activeKeys = ["caption", ...TAG_TYPES.map((t) => t.key)].filter((key) => activeLabelFor(key));
      activeKeys.forEach((key, i) => {
        if (!next[key]) {
          next[key] = { x: 0.5, y: 0.2 + i * 0.1, scale: 1, rotation: 0, color: "#F2F2E8" };
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!activeKeys.includes(key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, selectedTags]);

  const handlePick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    setFile(f);
    setError(null);
  };

  const publish = async () => {
    setUploading(true);
    setError(null);
    try {
      const blob = await editorRef.current.getFinalBlob();
      if (!blob) {
        setError("Impossible de préparer l'image.");
        return;
      }
      const uploadResult = await uploadStoryMedia(myUserId, blob);
      if (uploadResult.error) {
        setError(uploadResult.error);
        return;
      }
      const result = await createStory({
        contextType,
        contextId,
        mediaUrl: uploadResult.url,
        caption: caption.trim(),
        sharedToPulse: contextType === "room" ? sharedToPulse : false,
        pulseVisibility: "relations",
        locationName: contextType === "room" && sharedToPulse && includeLocation ? venueName : null,
        tags: {
          taggedVenueId: selectedTags.venue?.id || null,
          taggedDrinkId: selectedTags.drink?.id || null,
          taggedBrandId: selectedTags.brand?.id || null,
          taggedProducerId: selectedTags.producer?.id || null,
          tagPositions,
        },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onPublished();
    } catch (e) {
      console.error("publish story:", e);
      setError("Erreur : " + (e?.message || String(e)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={file && step === "tags" ? () => setStep("edit") : onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0", color: COLORS.ink }}>
        {!file ? "Nouvelle Story" : step === "edit" ? "Cadrer l'image" : "Légende & taguage"}
      </h1>

      {!file && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: COLORS.surface,
            border: `2px dashed ${COLORS.paperAlt}`,
            borderRadius: "16px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          <NavIcon name="plus" size={32} color={COLORS.amber} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.inkSoft }}>Choisir une photo</span>
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePick} />

      {file && (
        <>
          <MobileImageEditor ref={editorRef} file={file} interactive={step === "edit"} backgroundColor={bgColor}>
            {step === "tags" && tagPositions.caption && caption.trim() && (
              <MobileTagPill label={caption.trim()} symbol="" pos={tagPositions.caption} onChange={(p) => setTagPositions((prev) => ({ ...prev, caption: p }))} />
            )}
            {step === "tags" &&
              TAG_TYPES.map((t) => {
                const label = activeLabelFor(t.key);
                const pos = tagPositions[t.key];
                if (!label || !pos) return null;
                return <MobileTagPill key={t.key} label={label} symbol={t.symbol} pos={pos} onChange={(p) => setTagPositions((prev) => ({ ...prev, [t.key]: p }))} />;
              })}
          </MobileImageEditor>

          {step === "edit" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.ink }}>Couleur de fond</span>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: "32px", height: "22px", padding: 0, border: "none", borderRadius: "6px", cursor: "pointer" }} />
              </div>
              <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 16px" }}>Un doigt pour déplacer, deux doigts pour zoomer et pivoter.</p>
              <button
                onClick={() => setStep("tags")}
                style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "14px", fontWeight: 700, fontSize: "14.5px", color: COLORS.paper, cursor: "pointer" }}
              >
                Continuer
              </button>
            </>
          ) : (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ajouter une légende (optionnel)"
                style={{ padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", background: COLORS.surface, color: COLORS.ink, outline: "none" }}
              />
              {tagPositions.caption && <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: 0 }}>Un doigt pour déplacer la légende sur l'image, deux doigts pour la redimensionner et la faire pivoter.</p>}

              {TAG_TYPES.map((t) => (
                <TagPicker key={t.key} label={t.label} searchFn={t.searchFn} selected={selectedTags[t.key]} onSelect={(item) => setSelectedTags((prev) => ({ ...prev, [t.key]: item }))} />
              ))}

              {contextType === "room" && (
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: COLORS.ink, marginBottom: "8px" }}>Qui peut voir cette Story ?</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      onClick={() => setSharedToPulse(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: `2px solid ${!sharedToPulse ? COLORS.amber : COLORS.paperAlt}`,
                        background: !sharedToPulse ? COLORS.surfaceAlt : "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>🔒</span>
                      <span style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink }}>Ce salon uniquement</span>
                    </button>
                    <button
                      onClick={() => setSharedToPulse(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: `2px solid ${sharedToPulse ? COLORS.amber : COLORS.paperAlt}`,
                        background: sharedToPulse ? COLORS.surfaceAlt : "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>🌍</span>
                      <span style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink }}>Ce salon + BibaPulse</span>
                    </button>
                  </div>
                  {sharedToPulse && venueName && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", cursor: "pointer" }}>
                      <input type="checkbox" checked={includeLocation} onChange={(e) => setIncludeLocation(e.target.checked)} />
                      <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>
                        Indiquer le lieu (<strong style={{ color: COLORS.ink }}>{venueName}</strong>)
                      </span>
                    </label>
                  )}
                </div>
              )}

              {error && <p style={{ fontSize: "12.5px", color: COLORS.wine, margin: 0 }}>{error}</p>}

              <button
                onClick={publish}
                disabled={uploading}
                style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "14px", fontWeight: 700, fontSize: "14.5px", color: COLORS.paper, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? "Publication..." : "Publier"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
