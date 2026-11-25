import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants.js";

// ============================================================
// Fenêtre de confirmation commune (2026-11-25). Remplace la boîte native du navigateur `window.confirm` : l'app ne sera plus dans un navigateur
// (Mehdi : « on ne sera plus sur navigateur dans le futur »), et la boîte native ne se met ni aux couleurs de l'app ni dans sa langue visuelle.
// Même présentation que la fenêtre « Supprimer ce check de BibaPulse ? » : feuille posée en bas de l'écran, barre verte devant le titre.
//
// Usage (le composant `ConfirmDialogHost` est monté une seule fois, dans `main.jsx`) :
//   if (!(await askConfirm({ title: "Retirer Marie du club ?", message: "Cette personne ne sera plus membre.", confirmLabel: "Retirer", danger: true }))) return;
// `askConfirm` rend une promesse : true (bouton de confirmation) ou false (Annuler, toucher à côté, touche Échap).
//   - `danger: true` : bouton de confirmation en rose fluo (action destructrice) ; sinon vert fluo.
//   - Plusieurs demandes à la suite sont affichées l'une après l'autre.
// ============================================================

let pending = []; // demandes en attente : { opts, resolve }
let listener = null; // le Host monté, s'il y en a un

function notify() {
  if (listener) listener([...pending]);
}

export function askConfirm(opts) {
  if (!listener) {
    // Filet de sécurité : aucun Host monté (ne doit pas arriver, il est dans main.jsx) — on ne bloque pas l'action pour autant.
    const text = [opts?.title, opts?.message].filter((x) => typeof x === "string").join(" ");
    return Promise.resolve(typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(text) : false);
  }
  return new Promise((resolve) => {
    pending.push({ opts: opts || {}, resolve });
    notify();
  });
}

export function ConfirmDialogHost() {
  const [queue, setQueue] = useState([]);
  const safeRef = useRef(null);

  useEffect(() => {
    listener = setQueue;
    return () => {
      if (listener === setQueue) listener = null;
    };
  }, []);

  const current = queue[0] || null;

  const answer = (value) => {
    if (!current) return;
    pending = pending.filter((p) => p !== pending[0]);
    current.resolve(value);
    notify();
  };

  useEffect(() => {
    if (!current) return undefined;
    safeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;
  const { title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false } = current.opts;
  const accent = danger ? COLORS.pinkFluo : COLORS.amber;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={message ? "confirm-dialog-message" : undefined}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3200 }}
      onClick={() => answer(false)}
    >
      <div
        style={{ background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))", width: "100%", maxWidth: "480px", boxSizing: "border-box" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", color: COLORS.ink, margin: message ? "0 0 8px" : "0 0 14px", display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.3 }}>
          <span style={{ width: "4px", alignSelf: "stretch", minHeight: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
          <span>{title}</span>
        </h2>
        {message && (
          <p id="confirm-dialog-message" style={{ fontSize: "13.5px", color: COLORS.inkSoft, margin: "0 0 14px 14px", lineHeight: 1.4 }}>
            {message}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => answer(true)}
            style={{ background: accent, border: `2px solid ${accent}`, borderRadius: "12px", padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: danger ? "#fff" : COLORS.paper, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
          <button
            ref={safeRef}
            onClick={() => answer(false)}
            style={{ background: "none", border: "none", padding: "10px", fontSize: "14px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
