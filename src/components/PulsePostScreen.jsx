// ============================================================
// BibaPulse — publier librement : un texte et/ou une photo, avec jusqu'à 5 tags de fiche (produits,
// marques, producteurs, lieux) et jusqu'à 5 Bibax tagués. Mêmes règles que les checks : 280 caractères,
// photo vérifiée par le serveur (SafeSearch), « Public » ou « Mes Bibax ». Une publication doit contenir
// au moins un texte ou une photo ; les tags (fiches et Bibax) sont facultatifs.
//
// Avec une photo, une case « Partager aussi en Story » est proposée (si les Stories sont actives) : une fois la
// publication enregistrée, l'éditeur de Story s'ouvre avec cette photo et les tags de la publication déjà placés.
//
// Ouvert depuis le bouton « + » de BibaPulse. `onPublished(storyDraft)` est appelé une fois la publication
// enregistrée (storyDraft : { file, tags } si la Story est demandée, sinon null) ; `onBack()` abandonne sans
// rien publier.
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader } from "./ui.jsx";
import { usePulseContentForm, buildPulseContent, PulseContentFields } from "./PulseContentForm.jsx";
import { PulseTagsPicker } from "./PulseTags.jsx";
import { publishPostToPulse, storyTagsFromPost, pickStoryBibax } from "../data/sharedDirectories.js";

export function PulsePostScreen({ onBack, onPublished, canShareStory = false }) {
  const form = usePulseContentForm("public");
  const [tags, setTags] = useState([]); // [{ type, id, name }]
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [shareStory, setShareStory] = useState(false);
  // Garde-fou contre un double envoi : deux clics très rapprochés peuvent partir avant que le bouton ne soit grisé.
  const sending = useRef(false);

  // La case « Story » n'existe que pour une publication avec photo ; sans photo, elle se décoche.
  const showStoryOption = canShareStory && !!form.photo;
  useEffect(() => {
    if (!form.photo) setShareStory(false);
  }, [form.photo]);

  const hasContent = form.comment.trim().length > 0 || !!form.photo;
  const canPublish = hasContent && !publishing;

  const publish = async () => {
    if (!canPublish || sending.current) return;
    sending.current = true;
    setError("");
    form.setError(null);
    setPublishing(true);
    // La photo part d'abord (vérifiée par le serveur) : si elle est refusée, rien n'est publié.
    const built = await buildPulseContent(form, { tags });
    if (built.error) {
      sending.current = false;
      setPublishing(false);
      setError(built.error);
      return;
    }
    const result = await publishPostToPulse({ visibility: form.visibility, content: built.content });
    if (result.error) {
      sending.current = false;
      setPublishing(false);
      setError(result.error);
      return;
    }
    // Partage en Story demandé : on prépare la photo et les tags (la Story n'accepte qu'une fiche par sorte et un
    // Bibax qui accepte les tags des Stories). Même sans cela, la publication est déjà enregistrée.
    let storyDraft = null;
    if (showStoryOption && shareStory) {
      try {
        const bibax = await pickStoryBibax(form.taggedPeople);
        storyDraft = {
          file: new File([form.photo.blob], "publication.jpg", { type: "image/jpeg" }),
          tags: { ...storyTagsFromPost(tags), ...(bibax ? { bibax } : {}) },
        };
      } catch (e) {
        console.error("story draft:", e);
      }
    }
    // Succès : BibaPulse referme cet écran (et ouvre l'éditeur de Story si demandé).
    onPublished(storyDraft);
  };

  const shownError = error || form.error;

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1, boxSizing: "border-box" }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1, color: COLORS.ink }}>Nouvelle publication</h1>
      </div>

      <PulseContentFields form={form} commentLabel="Texte" commentPlaceholder="Qu'as-tu envie de partager ?" />
      <PulseTagsPicker tags={tags} onChange={setTags} />

      {showStoryOption && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={shareStory} onChange={(e) => setShareStory(e.target.checked)} />
            <span style={{ fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>Partager aussi en Story</span>
          </label>
          {shareStory && <p style={{ margin: "4px 0 0 24px", fontSize: "12px", color: COLORS.inkSoft }}>Après « Publier », l'éditeur de Story s'ouvre avec ta photo et tes tags.</p>}
        </div>
      )}

      {shownError && <p style={{ color: COLORS.wine, fontSize: "13px", margin: "0 0 12px" }}>{shownError}</p>}

      <button
        onClick={publish}
        disabled={!canPublish}
        style={{
          width: "100%",
          background: COLORS.amber,
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "14.5px",
          fontWeight: 700,
          color: COLORS.paper,
          cursor: canPublish ? "pointer" : "default",
          opacity: canPublish ? 1 : 0.5,
        }}
      >
        {publishing ? "Publication..." : "Publier"}
      </button>
    </div>
  );
}
