import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { uploadStoryMedia, createStory, searchBibaxForTagging, searchVenues, searchDrinks, searchBrands, searchBreweries } from "../data/sharedDirectories.js";
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
      <p style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, margin: "0 0 6px", display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ width: "3px", height: "12px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        {label}
      </p>
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
              {results.map((r) => {
                // Un Bibax ayant désactivé "Autoriser les tags" apparaît grisé, non
                // sélectionnable — sa vraie préférence de confidentialité prime.
                const disabled = r.allowStoryTags === false;
                return (
                  <button
                    key={r.id}
                    onClick={
                      disabled
                        ? undefined
                        : () => {
                            onSelect(r);
                            setQuery("");
                          }
                    }
                    disabled={disabled}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      color: disabled ? COLORS.inkSoft : COLORS.ink,
                      fontSize: "13.5px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Les 5 vrais tags de fiche possibles, avec leur vrai symbole propre — la légende n'en a pas,
// vu que c'est un vrai texte libre plutôt qu'une référence à une fiche précise.
const TAG_TYPES = [
  { key: "bibax", label: "Taguer un Bibax", symbol: "@", searchFn: searchBibaxForTagging },
  { key: "venue", label: "Taguer un lieu", symbol: "@", searchFn: searchVenues },
  { key: "drink", label: "Taguer un produit", symbol: "#", searchFn: searchDrinks },
  { key: "brand", label: "Taguer une marque", symbol: "#", searchFn: searchBrands },
  { key: "producer", label: "Taguer un producteur", symbol: "#", searchFn: searchBreweries },
];

// Vrai bouton rond flottant réutilisé pour les 3 vrais contrôles du haut — même vrai style,
// juste l'icône qui change.
function RoundButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: "none",
        background: "rgba(13,27,42,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function TagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l5.59-5.59a2 2 0 0 0 0-2.82Z" />
      <circle cx="7.5" cy="7.5" r="1" fill="#fff" />
    </svg>
  );
}

// Création d'une Story — depuis Home (contexte "global", destinée à BibaPulse) ou depuis un
// BibaRoom (contexte "room", salon uniquement par défaut, avec choix explicite pour aussi la
// diffuser dans BibaPulse). La confidentialité est toujours privilégiée par défaut.
//
// Vraie page unique, en plein écran fixe : l'image occupe tout l'espace, avec les vrais
// réglages en boutons ronds flottants plutôt qu'en dessous d'elle — sinon, sur mobile, l'image
// remplissant tout l'écran, atteindre un vrai réglage plus bas obligeait à toucher l'image
// elle-même pour y arriver, ce qui la déplaçait à chaque fois. Les tags et la légende vivent
// dans une vraie mini-page qui glisse depuis le bas, sans jamais faire défiler la page entière.
export function StoryCreateScreen({ contextType, contextId, venueName, myUserId, onBack, onPublished }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [imageLocked, setImageLocked] = useState(false);
  const [selectedTagKey, setSelectedTagKey] = useState(null);
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState("#0D1B2A");
  const [selectedTags, setSelectedTags] = useState({}); // { venue: {id,name}, drink: {...}, ... }
  const [tagPositions, setTagPositions] = useState({});
  const [sharedToPulse, setSharedToPulse] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const captionInputRef = useRef(null);

  const activeLabelFor = (key) => {
    if (key === "caption") return caption.trim() || null;
    return selectedTags[key]?.name || null;
  };

  // Ajoute une vraie position par défaut (étagée verticalement) dès qu'un tag devient actif, et
  // retire sa position dès qu'il est désactivé.
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
    // "Choisir un fichier" n'a volontairement aucune vraie restriction de type (pour laisser
    // parcourir Fichiers/iCloud Drive librement) — donc une vraie vérification est nécessaire
    // ici, sinon un vrai fichier non-image casserait silencieusement l'éditeur juste après.
    if (!f.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
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
          taggedBibaxCode: selectedTags.bibax?.bibroCode || null,
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

  if (!file) {
    return (
      <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }} title="Retour" aria-label="Retour">
            <NavIcon name="back-triangle" size={22} color={COLORS.amber} />
          </button>
        </div>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0", color: COLORS.ink, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "22px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
          Nouvelle Story
        </h1>

        {error && <p style={{ fontSize: "12.5px", color: COLORS.wine, marginBottom: "10px" }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginTop: "28px" }}>
          {/* Ouvre le vrai sélecteur natif du téléphone, sans capture — c'est lui qui affiche
              la vraie galerie et les vrais fichiers. Un seul vrai bloc pour les deux : sur la
              plupart des vrais téléphones, le navigateur affiche le vrai même menu (Photothèque
              / Fichiers) quel que soit celui des deux qu'on visait — aucun standard web ne
              permet de vraiment les distinguer, donc 2 vrais boutons distincts n'auraient fait
              que reproduire le vrai même résultat deux fois. */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            style={{
              width: "140px",
              aspectRatio: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: COLORS.surfaceAlt,
              border: `2px solid ${COLORS.pinkFluo}`,
              borderRadius: "14px",
              cursor: "pointer",
              padding: "10px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.pinkFluo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.pinkFluo, textAlign: "center" }}>Photothèque / Fichiers</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            style={{
              width: "140px",
              aspectRatio: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: COLORS.surfaceAlt,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: "14px",
              cursor: "pointer",
              padding: "10px",
            }}
          >
            <NavIcon name="camera" size={28} color={COLORS.amber} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, textAlign: "center" }}>Prendre une photo</span>
          </button>
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePick} />
        <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePick} />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100 }}>
      <MobileImageEditor ref={editorRef} file={file} interactive={!tagsSheetOpen && !imageLocked} backgroundColor={bgColor}>
        {tagPositions.caption && caption.trim() && (
          <MobileTagPill
            label={caption.trim()}
            symbol=""
            pos={tagPositions.caption}
            onChange={(p) => setTagPositions((prev) => ({ ...prev, caption: p }))}
            selected={selectedTagKey === "caption"}
            onTap={() => setSelectedTagKey((k) => (k === "caption" ? null : "caption"))}
          />
        )}
        {TAG_TYPES.map((t) => {
          const label = activeLabelFor(t.key);
          const pos = tagPositions[t.key];
          if (!label || !pos) return null;
          return (
            <MobileTagPill
              key={t.key}
              label={label}
              symbol={t.symbol}
              pos={pos}
              onChange={(p) => setTagPositions((prev) => ({ ...prev, [t.key]: p }))}
              selected={selectedTagKey === t.key}
              onTap={() => setSelectedTagKey((k) => (k === t.key ? null : t.key))}
            />
          );
        })}
      </MobileImageEditor>

      <button
        onClick={onBack}
        title="Fermer"
        aria-label="Fermer"
        style={{ position: "absolute", top: "16px", left: "16px", width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "rgba(13,27,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          title="Couleur de fond"
          aria-label="Couleur de fond"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "2px solid #fff",
            padding: 0,
            cursor: "pointer",
            WebkitAppearance: "none",
            appearance: "none",
            overflow: "hidden",
            background: "none",
          }}
        />

        <RoundButton onClick={() => setImageLocked((v) => !v)} title={imageLocked ? "Déverrouiller l'image" : "Verrouiller l'image"}>
          {imageLocked ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 7.4-2" />
            </svg>
          )}
        </RoundButton>

        <div>
          <RoundButton onClick={() => setTagsSheetOpen(true)} title="Tags">
            <TagIcon />
          </RoundButton>

          {selectedTagKey && tagPositions[selectedTagKey] && (
            // Couleur/inversion du vrai tag sélectionné (tap sur sa vraie pastille) — fusionnée
            // avec le bouton Tags juste au-dessus (aucun vrai espace entre les deux), pour que
            // le vrai lien saute aux yeux. Gérées ici plutôt que dans la vraie mini-page du bas,
            // pour que le tag reste visible sur l'image pendant le réglage plutôt que d'être
            // caché ou assombri derrière elle.
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "rgba(13,27,42,0.75)", borderRadius: "22px", padding: "10px 8px", marginTop: "10px" }}>
              <input
                type="color"
                value={tagPositions[selectedTagKey].color || "#F2F2E8"}
                onChange={(e) => setTagPositions((prev) => ({ ...prev, [selectedTagKey]: { ...prev[selectedTagKey], color: e.target.value } }))}
                title="Couleur du tag"
                aria-label="Couleur du tag"
                style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #fff", padding: 0, cursor: "pointer", WebkitAppearance: "none", appearance: "none", overflow: "hidden", background: "none" }}
              />
              <button
                onClick={() => setTagPositions((prev) => ({ ...prev, [selectedTagKey]: { ...prev[selectedTagKey], invert: !prev[selectedTagKey].invert } }))}
                title="Inverser les couleurs"
                aria-label="Inverser les couleurs"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: `2px solid ${tagPositions[selectedTagKey].invert ? "#39FF66" : "#fff"}`,
                  background: tagPositions[selectedTagKey].invert ? "#39FF66" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke={tagPositions[selectedTagKey].invert ? "#0D1B2A" : "#fff"} strokeWidth="2" />
                  <path d="M12 3a9 9 0 0 1 0 18Z" fill={tagPositions[selectedTagKey].invert ? "#0D1B2A" : "#fff"} />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Légende — tout en bas, à gauche de Publier, plutôt que dans la mini-page des tags :
          c'est ce qu'on tape le plus souvent, autant y accéder sans avoir à ouvrir quoi que ce
          soit. La vraie flèche referme le clavier pour voir tout de suite le vrai tag apparu
          sur l'image (déjà placé automatiquement dès que le texte n'est plus vide). */}
      <div style={{ position: "absolute", bottom: "20px", left: "16px", right: "90px" }}>
        <div style={{ position: "relative" }}>
          <input
            ref={captionInputRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajouter une légende"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 46px 12px 14px",
              borderRadius: "999px",
              border: "none",
              fontSize: "14px",
              background: "rgba(13,27,42,0.75)",
              color: "#fff",
              outline: "none",
            }}
          />
          <button
            onClick={() => captionInputRef.current?.blur()}
            title="Envoyer sur l'image"
            aria-label="Envoyer sur l'image"
            style={{
              position: "absolute",
              top: "50%",
              right: "4px",
              transform: "translateY(-50%)",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Publier, séparé de la pile d'outils du haut — en bas à droite, vraie flèche pointant
          vers la droite plutôt que vers le haut. */}
      <div style={{ position: "absolute", bottom: "20px", right: "16px" }}>
        <button
          onClick={uploading ? undefined : publish}
          title="Publier"
          aria-label="Publier"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: "#39FF66",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D1B2A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {error && (
        <div style={{ position: "absolute", bottom: "90px", left: "16px", right: "16px", background: "rgba(255,59,78,0.95)", borderRadius: "10px", padding: "10px 14px" }}>
          <p style={{ fontSize: "12.5px", color: "#fff", margin: 0 }}>{error}</p>
        </div>
      )}

      {tagsSheetOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 110 }} onClick={() => setTagsSheetOpen(false)}>
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "72vh", overflowY: "auto", background: COLORS.paper, borderRadius: "16px 16px 0 0", padding: "18px 20px 28px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {tagPositions.caption && (
                <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: 0 }}>
                  Un doigt pour déplacer la légende sur l'image, deux doigts pour la redimensionner et la faire pivoter — tapez dessus pour en régler la couleur.
                </p>
              )}

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

              <button
                onClick={() => setTagsSheetOpen(false)}
                style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
