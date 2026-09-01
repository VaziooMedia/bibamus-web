import React, { useState, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader } from "./ui.jsx";
import { uploadStoryMedia, createStory } from "../data/sharedDirectories.js";

// Création d'une Story — depuis Home (contexte "global", destinée à BibaPulse) ou depuis un
// BibaRoom (contexte "room", salon uniquement par défaut, avec choix explicite pour aussi la
// diffuser dans BibaPulse). La confidentialité est toujours privilégiée par défaut.
export function StoryCreateScreen({ contextType, contextId, myUserId, onBack, onPublished }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [sharedToPulse, setSharedToPulse] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handlePick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  const publish = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const uploadResult = await uploadStoryMedia(myUserId, file);
    if (uploadResult.error) {
      setUploading(false);
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
    });
    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onPublished();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 18px 0", color: COLORS.ink }}>
        Nouvelle Story
      </h1>

      {!previewUrl ? (
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
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", marginBottom: "20px" }}>
          <img src={previewUrl} alt="" style={{ width: "100%", flex: 1, objectFit: "cover", borderRadius: "16px", marginBottom: "14px" }} />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajouter une légende (optionnel)"
            style={{ padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", background: COLORS.surface, color: COLORS.ink, outline: "none" }}
          />
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePick} />

      {previewUrl && contextType === "room" && (
        <div style={{ marginBottom: "16px" }}>
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
        </div>
      )}

      {error && <p style={{ fontSize: "12.5px", color: COLORS.wine, marginBottom: "12px" }}>{error}</p>}

      {previewUrl && (
        <button
          onClick={publish}
          disabled={uploading}
          style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "14px", fontWeight: 700, fontSize: "14.5px", color: COLORS.paper, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Publication..." : "Publier"}
        </button>
      )}
    </div>
  );
}
