import React, { useRef } from "react";

// Calcule un vrai noir ou blanc contrastant avec la couleur donnée — même vrai principe que
// côté plateforme de gestion, pour les vrais tags aux couleurs inversées (fond plein).
function contrastColor(hex) {
  const h = (hex || "#F2F2E8").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140 ? "#0D1B2A" : "#F2F2E8";
}

// Même vrai style que StoryTagPill (affichage), mais manipulable ici : un vrai doigt la
// déplace, deux vrais doigts la redimensionnent et la font pivoter en même temps — même vrai
// principe tactile que pour l'image elle-même, plutôt que des vrais sliders séparés. Un vrai
// tap simple (sans vrai déplacement) la sélectionne — sa vraie couleur se gère alors depuis la
// vraie palette à droite de l'image, pour la garder visible pendant le réglage.
export function MobileTagPill({ label, symbol = "#", pos, onChange, selected, onTap }) {
  const gestureRef = useRef(null);
  const tapRef = useRef(null);
  const color = pos.color || "#F2F2E8";
  const inverted = !!pos.invert;

  const touchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const touchAngle = (t1, t2) => (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;

  const onTouchStart = (e) => {
    e.stopPropagation();
    const frameEl = e.currentTarget.offsetParent;
    const rect = frameEl.getBoundingClientRect();
    if (e.touches.length === 1) {
      gestureRef.current = { mode: "drag", rect, startX: e.touches[0].clientX, startY: e.touches[0].clientY, origX: pos.x, origY: pos.y };
      tapRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTime: Date.now(), moved: false };
    } else if (e.touches.length === 2) {
      const [t1, t2] = e.touches;
      gestureRef.current = { mode: "pinch", startDist: touchDist(t1, t2), startAngle: touchAngle(t1, t2), origScale: pos.scale || 1, origRotation: pos.rotation || 0 };
      tapRef.current = null;
    }
  };

  const onTouchMove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const g = gestureRef.current;
    if (!g) return;
    if (g.mode === "drag" && e.touches.length === 1) {
      const dx = (e.touches[0].clientX - g.startX) / g.rect.width;
      const dy = (e.touches[0].clientY - g.startY) / g.rect.height;
      onChange({ ...pos, x: Math.min(1, Math.max(0, g.origX + dx)), y: Math.min(1, Math.max(0, g.origY + dy)) });
      if (tapRef.current && Math.hypot(e.touches[0].clientX - tapRef.current.startX, e.touches[0].clientY - tapRef.current.startY) > 8) {
        tapRef.current.moved = true;
      }
    } else if (g.mode === "pinch" && e.touches.length === 2) {
      const [t1, t2] = e.touches;
      const newDist = touchDist(t1, t2);
      const newAngle = touchAngle(t1, t2);
      onChange({ ...pos, scale: Math.min(1.8, Math.max(0.6, g.origScale * (newDist / g.startDist))), rotation: g.origRotation + (newAngle - g.startAngle) });
    }
  };

  const onTouchEnd = (e) => {
    e.stopPropagation();
    if (e.touches.length === 0) {
      gestureRef.current = null;
      // Vrai tap = pas de vrai déplacement notable, et un vrai geste bref — sinon c'était un
      // vrai glissement, pas une vraie sélection.
      if (tapRef.current && !tapRef.current.moved && Date.now() - tapRef.current.startTime < 400 && onTap) onTap();
      tapRef.current = null;
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "absolute",
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${pos.rotation || 0}deg) scale(${pos.scale || 1})`,
        background: inverted ? color : `${color}33`,
        border: `1.5px solid ${color}`,
        borderRadius: "999px",
        padding: "6px 14px",
        fontSize: "14px",
        fontWeight: 700,
        color: inverted ? contrastColor(color) : color,
        whiteSpace: "nowrap",
        touchAction: "none",
        userSelect: "none",
        boxShadow: selected ? "0 0 0 3px #39FF66" : "none",
      }}
    >
      {symbol ? `${symbol} ${label}` : label}
    </div>
  );
}
