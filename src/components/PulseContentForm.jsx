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

  // Recherche des Bibax à taguer — uniquement de vrais Bibax confirmés qui acceptent d'être tagués.
  useEffect(() => {
    const term = tagQuery.trim();
    if (term.length < 2) {
      setTagResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchBibaxForTagging(term).then((results) => {
        if (cancelled) return;
        setTagResults(results.filter((r) => r.allowStoryTags !== false && !taggedPeople.some((t) => t.id === r.id)).slice(0, 6));
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
      <label style={{ ...labelStyle, marginBottom: "8px" }}>Qui peut le voir ?</label>
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

      <label style={labelStyle}>Commentaire (facultatif)</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="Ton avis, une anecdote..."
        style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px", fontFamily: "inherit", resize: "none" }}
      />
      <p style={{ margin: "2px 0 14px", fontSize: "11px", color: COLORS.inkSoft, textAlign: "right" }}>{comment.length}/280</p>

      <label style={labelStyle}>Photo (facultatif)</label>
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

      <label style={labelStyle}>Avec (facultatif)</label>
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
              {tagResults.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    setTaggedPeople((prev) => [...prev, { id: person.id, name: fullNameOf(person), avatarUrl: person.avatarUrl }]);
                    setTagQuery("");
                    setTagResults([]);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                >
                  <EntityAvatar photoUrl={person.avatarUrl} size={28} />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullNameOf(person)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
