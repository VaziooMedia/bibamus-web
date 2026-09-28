// ============================================================
// Formulaire de contenu d'une publication BibaPulse — partagé par les fenêtres de check (produit
// et lieu) : qui peut la voir, commentaire, photo, Bibax tagués.
//
//   const form = usePulseContentForm("public");     // état du formulaire
//   <PulseContentFields form={form} />              // les champs
//   const built = await buildPulseContent(form, { rating });   // -> { content } ou { error }
//
// buildPulseContent envoie d'abord la photo (vérifiée côté serveur) : à appeler AVANT de valider
// le check, pour que rien ne soit enregistré si la photo est refusée.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { searchBibaxForTagging, uploadPulsePhoto } from "../data/sharedDirectories.js";
import { fileToResizedJpegBlob } from "../imageUtils.js";

// Nombre maximum de Bibax tagués dans une publication (le serveur en accepte jusqu'à 10).
export const MAX_TAGS = 5;

// Échelle des notes de produit : de 0,25 à 5, par pas de 0,25 (le serveur refuse le reste).
export const isOnRatingScale = (v) => Number.isFinite(v) && v >= 0.25 && v <= 5 && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

// Nom affiché d'un Bibax dans le sélecteur : prénom + nom quand le nom est visible — pour ne pas
// confondre deux Bibax qui ont le même prénom.
const fullNameOf = (person) => [person.name, person.lastName].filter(Boolean).join(" ");

export function usePulseContentForm(defaultVisibility = "public") {
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null); // { blob, previewUrl }
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState([]);
  const [taggedPeople, setTaggedPeople] = useState([]); // [{ id, name, avatarUrl }]
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Recherche des Bibax à taguer — uniquement de vrais Bibax confirmés. Ceux qui ont restreint leurs tags
  // (allowStoryTags === false) restent affichés mais GRISÉS et non sélectionnables, pour prévenir l'utilisateur.
  useEffect(() => {
    const term = tagQuery.trim();
    if (term.length < 2) {
      setTagResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchBibaxForTagging(term, "pulse").then((results) => {
        if (cancelled) return;
        setTagResults(results.filter((r) => !taggedPeople.some((t) => t.id === r.id)).slice(0, 6));
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tagQuery, taggedPeople]);

  // Libère l'aperçu de la photo quand elle change ou quand la fenêtre se ferme.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);

  const handlePhotoPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    try {
      const blob = await fileToResizedJpegBlob(file);
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
      setError(null);
    } catch (_) {
      setError("Impossible de lire cette photo.");
    }
  };

  return { visibility, setVisibility, comment, setComment, photo, setPhoto, tagQuery, setTagQuery, tagResults, setTagResults, taggedPeople, setTaggedPeople, error, setError, fileInputRef, handlePhotoPick };
}

// Prépare le contenu à envoyer : seulement ce qui a été renseigné. Envoie la photo si besoin.
// Renvoie { content } (content vaut undefined s'il n'y a rien) ou { error } si la photo est refusée.
export async function buildPulseContent(form, { rating = null } = {}) {
  const built = {};
  const trimmedComment = form.comment.trim();
  if (trimmedComment) built.comment = trimmedComment;
  if (rating != null && isOnRatingScale(rating)) built.rating = rating;
  if (form.taggedPeople.length > 0) built.taggedIds = form.taggedPeople.map((p) => p.id);
  if (form.photo) {
    const uploaded = await uploadPulsePhoto(form.photo.blob);
    if (uploaded.error) return { error: uploaded.error };
    built.photoUrl = uploaded.url;
  }
  return { content: Object.keys(built).length > 0 ? built : undefined };
}

const labelStyle = { fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" };

export function PulseContentFields({ form }) {
  const { visibility, setVisibility, comment, setComment, photo, setPhoto, tagQuery, setTagQuery, tagResults, setTagResults, taggedPeople, setTaggedPeople, fileInputRef, handlePhotoPick } = form;
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>Confidentialité</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[
          { key: "public", label: "Public" },
          { key: "relations", label: "Mes Bibax" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setVisibility(opt.key)}
            style={{
              flex: 1,
              background: visibility === opt.key ? COLORS.amber : "none",
              color: visibility === opt.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${visibility === opt.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "9px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label style={labelStyle}>Commentaire</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="Ton avis, une anecdote..."
        style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px", fontFamily: "inherit", resize: "none" }}
      />
      <p style={{ margin: "2px 0 14px", fontSize: "11px", color: COLORS.inkSoft, textAlign: "right" }}>{comment.length}/280</p>

      <label style={labelStyle}>Photo</label>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoPick} />
      {photo ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <img src={photo.previewUrl} alt="Aperçu de la photo" style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", flexShrink: 0 }} />
          <button
            onClick={() => setPhoto(null)}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12.5px", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            Retirer la photo
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{ display: "block", width: "100%", background: "none", border: `2px dashed ${COLORS.paperAlt}`, borderRadius: "10px", padding: "11px", color: COLORS.inkSoft, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", marginBottom: "16px" }}
        >
          Ajouter une photo
        </button>
      )}

      <label style={labelStyle}>Bibax</label>
      {taggedPeople.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          {taggedPeople.map((person) => (
            <span key={person.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 6px 4px 5px", fontSize: "12.5px", color: COLORS.ink }}>
              <EntityAvatar photoUrl={person.avatarUrl} size={20} />
              {person.name}
              <button
                onClick={() => setTaggedPeople((prev) => prev.filter((p) => p.id !== person.id))}
                aria-label={"Retirer " + person.name}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 6px" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {taggedPeople.length < MAX_TAGS && (
        <div style={{ position: "relative" }}>
          <input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="Taguer un Bibax"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
          />
          {tagResults.length > 0 && (
            <div style={{ marginTop: "4px", background: COLORS.paper, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", overflow: "hidden" }}>
              {tagResults.map((person) => {
                // Un Bibax qui a restreint ses tags apparaît grisé, non sélectionnable — même rendu que dans les Stories.
                const restricted = person.allowStoryTags === false;
                return (
                  <button
                    key={person.id}
                    disabled={restricted}
                    title={restricted ? "Ce Bibax a restreint ses tags" : undefined}
                    onClick={
                      restricted
                        ? undefined
                        : () => {
                            setTaggedPeople((prev) => [...prev, { id: person.id, name: fullNameOf(person), avatarUrl: person.avatarUrl }]);
                            setTagQuery("");
                            setTagResults([]);
                          }
                    }
                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: restricted ? "not-allowed" : "pointer", fontSize: "13.5px", color: restricted ? COLORS.inkSoft : COLORS.ink, opacity: 1 }}
                  >
                    {/* Seuls le rond-profil et le nom sont atténués : le repère « Tags » qui explique le grisé reste bien visible. */}
                    <span style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, opacity: restricted ? 0.5 : 1 }}>
                      <EntityAvatar photoUrl={person.avatarUrl} size={28} />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullNameOf(person)}</span>
                    </span>
                    {restricted && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0, fontSize: "12px", fontWeight: 700, color: COLORS.pinkFluo }}>
                        Tags
                        {/* Rond et croix sont dessinés ENSEMBLE, dans le même repère (centre exact : 8,8). Un rond en CSS avec une
                            icône posée dedans laissait la croix décalée d'un demi-pixel : deux mesures qui s'arrondissent chacune à leur façon. */}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
                          <circle cx="8" cy="8" r="7.25" stroke={COLORS.pinkFluo} strokeWidth="1.5" />
                          <path d="M5.375 5.375 10.625 10.625M10.625 5.375 5.375 10.625" stroke={COLORS.pinkFluo} strokeWidth="0.75" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
