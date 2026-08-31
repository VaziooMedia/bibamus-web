import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";

const VIEWPORT = 260;
const OUTPUT = 500;

// Outil de recadrage — glisser pour repositionner l'image, curseur pour zoomer, avant l'envoi
// définitif. Produit une image déjà carrée et recadrée, prête à être envoyée telle quelle.
export function PhotoCropModal({ file, onCancel, onConfirm }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = img ? Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight) : 1;
  const effectiveScale = baseScale * zoom;
  const scaledW = img ? img.naturalWidth * effectiveScale : 0;
  const scaledH = img ? img.naturalHeight * effectiveScale : 0;
  const maxOffsetX = Math.max(0, (scaledW - VIEWPORT) / 2);
  const maxOffsetY = Math.max(0, (scaledH - VIEWPORT) / 2);

  const clamp = (o, mx, my) => ({ x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) });

  // Reclampe la position à chaque changement de zoom — sinon un dézoom pourrait laisser un
  // espace vide sur les bords si l'image avait été déplacée près de sa limite avant.
  useEffect(() => {
    setOffset((o) => clamp(o, maxOffsetX, maxOffsetY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, img]);

  const handlePointerDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp({ x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy }, maxOffsetX, maxOffsetY));
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    const outputScale = OUTPUT / VIEWPORT;
    const drawScale = effectiveScale * outputScale;
    const drawWidth = img.naturalWidth * drawScale;
    const drawHeight = img.naturalHeight * drawScale;
    const drawX = OUTPUT / 2 - drawWidth / 2 + offset.x * outputScale;
    const drawY = OUTPUT / 2 - drawHeight / 2 + offset.y * outputScale;
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    canvas.toBlob((blob) => onConfirm(blob), "image/jpeg", 0.88);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,42,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
      <p style={{ color: COLORS.chalkWhite, fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Ajustez votre photo</p>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: `${VIEWPORT}px`,
          height: `${VIEWPORT}px`,
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          touchAction: "none",
          background: "#000",
          cursor: "grab",
          border: `3px solid ${COLORS.amber}`,
        }}
      >
        {img && (
          <img
            src={img.src}
            draggable={false}
            alt=""
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${scaledW}px`,
              height: `${scaledH}px`,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <input
        type="range"
        min="1"
        max="3"
        step="0.01"
        value={zoom}
        onChange={(e) => setZoom(parseFloat(e.target.value))}
        style={{ width: `${VIEWPORT}px`, marginTop: "20px", accentColor: COLORS.amber }}
      />
      <p style={{ color: COLORS.inkSoft, fontSize: "11.5px", marginTop: "4px" }}>Glissez pour repositionner, le curseur pour zoomer</p>

      <div style={{ display: "flex", gap: "10px", marginTop: "24px", width: `${VIEWPORT}px` }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: "none", border: `2px solid ${COLORS.inkSoft}`, borderRadius: "10px", padding: "12px", color: COLORS.chalkWhite, fontWeight: 700, cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!img}
          style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", color: COLORS.paper, fontWeight: 700, cursor: "pointer", opacity: img ? 1 : 0.5 }}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
