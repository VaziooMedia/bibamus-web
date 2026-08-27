import React, { useState, useRef } from "react";

export function AdminPhotoField({ label, photoUrl, aspect = "square", onUpload, onDelete, uploading }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const displayUrl = previewUrl || photoUrl;
  const height = aspect === "banner" ? "140px" : "160px";
  const width = aspect === "banner" ? "100%" : "160px";

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    onUpload(file);
    e.target.value = "";
  };

  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "12.5px", color: "#8792A6", marginBottom: "6px", display: "block", fontWeight: 600 }}>{label}</label>
      <div
        style={{
          width,
          height,
          borderRadius: "10px",
          border: "2px solid #28405C",
          background: displayUrl ? `#16273D url(${displayUrl}) center/cover no-repeat` : "#16273D",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ position: "absolute", inset: 0, background: "none", border: "none", cursor: uploading ? "default" : "pointer", padding: 0 }}
        >
          {!displayUrl && !uploading && <span style={{ color: "#8792A6", fontSize: "12px" }}>Ajouter</span>}
          {uploading && <span style={{ color: "#F2F2E8", fontSize: "12px" }}>Envoi...</span>}
        </button>
        {photoUrl && !uploading && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{ position: "absolute", top: "6px", right: "6px", background: "#FF3B4E", border: "none", borderRadius: "6px", width: "22px", height: "22px", color: "#fff", cursor: "pointer", fontSize: "12px" }}
          >
            ✕
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
    </div>
  );
}
