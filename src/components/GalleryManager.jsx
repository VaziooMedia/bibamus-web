import React, { useRef } from "react";

// photos: tableau d'URLs. Grille simple avec bouton "Ajouter" et une croix de suppression sur
// chaque vignette.
export function GalleryManager({ photos, onUpload, onRemove, uploading }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onUpload(file);
    e.target.value = "";
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "10px" }}>
        {photos.map((url, i) => (
          <div key={url} style={{ position: "relative", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "2px solid #28405C" }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <button
              onClick={() => onRemove(i)}
              style={{ position: "absolute", top: "4px", right: "4px", background: "#FF3B4E", border: "none", borderRadius: "6px", width: "22px", height: "22px", color: "#fff", cursor: "pointer", fontSize: "12px" }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            aspectRatio: "1",
            borderRadius: "8px",
            border: "2px dashed #28405C",
            background: "none",
            color: "#39FF66",
            cursor: uploading ? "default" : "pointer",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          {uploading ? "…" : "+"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
      {photos.length === 0 && <p style={{ fontSize: "12px", color: "#8792A6", fontStyle: "italic" }}>Aucune photo dans la galerie pour l'instant.</p>}
    </div>
  );
}
