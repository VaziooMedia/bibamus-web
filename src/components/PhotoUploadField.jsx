import React, { useState, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Composant d'upload de photo réutilisable — affiche la photo actuelle (ou un espace vide),
// avec un bouton pour en choisir une nouvelle depuis la galerie ou l'appareil photo.
export function PhotoUploadField({ photoUrl, onUpload, onDelete, uploading, label = "Photo du produit" }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    onUpload(file);
    e.target.value = "";
  };

  const displayUrl = previewUrl || photoUrl;

  return (
    <div style={{ marginBottom: "16px" }}>
      {label && <label style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "6px", display: "block", fontWeight: 600 }}>{label}</label>}
      <div
        style={{
          width: "100%",
          height: "180px",
          borderRadius: "14px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: displayUrl ? `${COLORS.surface} url(${displayUrl}) center/cover no-repeat` : COLORS.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ position: "absolute", inset: 0, background: "none", border: "none", cursor: uploading ? "default" : "pointer", padding: 0 }}
        >
          {!displayUrl && !uploading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: COLORS.inkSoft }}>
              <NavIcon name="camera" size={28} color={COLORS.inkSoft} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>Ajouter une photo</span>
            </div>
          )}
          {uploading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(13,27,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.ink, fontSize: "13px", fontWeight: 700 }}>
              Envoi en cours...
            </div>
          )}
          {displayUrl && !uploading && (
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(13,27,42,0.75)",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                color: COLORS.ink,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <NavIcon name="camera" size={13} color={COLORS.ink} /> Changer
            </div>
          )}
        </button>
        {photoUrl && !uploading && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDelete) {
                onDelete();
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
              }
            }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: confirmDelete ? COLORS.redFluo : "rgba(13,27,42,0.75)",
              border: "none",
              borderRadius: "8px",
              padding: confirmDelete ? "6px 10px" : "6px 8px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            {confirmDelete ? "Confirmer ?" : "✕"}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} style={{ display: "none" }} />
    </div>
  );
}
