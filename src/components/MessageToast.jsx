import React, { useEffect, useState } from "react";
import { COLORS } from "../constants.js";

// ============================================================
// Message court en bas de l'écran (2026-11-25). Remplace la boîte native du navigateur `alert(...)` : l'app ne sera plus dans un navigateur
// (Mehdi : « on ne sera plus sur navigateur dans le futur »), et `alert` bloque l'écran sans pouvoir être mis aux couleurs de l'app.
// Même cadre que la popup « Check confirmé » (`CheckConfirmedToast` : fond `surface`, cadre de 2 px, coins arrondis, ombre), posée au-dessus de la
// barre basse.
//
// Usage (le composant `MessageToastHost` est monté une seule fois, dans `main.jsx`) :
//   notify("La création du lieu a échoué — merci de réessayer.");            // erreur (cadre rose fluo, le défaut)
//   notify("Demande envoyée à Marie.", "info");                                // information (cadre vert fluo)
// Le message disparaît seul (de 6 à 10 s selon sa longueur) ou d'un toucher ; plusieurs messages s'empilent (3 au plus, les plus anciens partent).
// Les retours à la ligne du texte sont conservés. Un texte vide ou absent n'affiche rien.
// ============================================================

const MAX_SHOWN = 3;
let items = []; // { id, text, kind }
let listener = null;
let nextId = 1;

function emit() {
  if (listener) listener([...items]);
}

export function dismissMessage(id) {
  items = items.filter((m) => m.id !== id);
  emit();
}

export function notify(message, kind = "error") {
  const text = typeof message === "string" ? message : message == null ? "" : String(message?.message || message);
  if (!text.trim()) return;
  if (!listener) {
    // Filet de sécurité : aucun Host monté (ne doit pas arriver, il est dans main.jsx).
    if (typeof window !== "undefined" && typeof window.alert === "function") window.alert(text);
    return;
  }
  items = [...items, { id: nextId++, text, kind: kind === "info" ? "info" : "error" }].slice(-MAX_SHOWN);
  emit();
}

function durationFor(text) {
  return Math.min(10000, Math.max(6000, 3500 + text.length * 45));
}

function MessageItem({ item }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissMessage(item.id), durationFor(item.text));
    return () => clearTimeout(timer);
  }, [item.id, item.text]);
  const accent = item.kind === "info" ? COLORS.amber : COLORS.pinkFluo;
  return (
    <div
      role={item.kind === "info" ? "status" : "alert"}
      onClick={() => dismissMessage(item.id)}
      style={{
        pointerEvents: "auto",
        background: COLORS.surface,
        border: `2px solid ${accent}`,
        borderRadius: "14px",
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        maxWidth: "440px",
        width: "100%",
        boxSizing: "border-box",
        cursor: "pointer",
        fontSize: "13.5px",
        lineHeight: 1.4,
        color: COLORS.ink,
        whiteSpace: "pre-line",
        overflowWrap: "anywhere",
      }}
    >
      {item.text}
    </div>
  );
}

export function MessageToastHost() {
  const [list, setList] = useState([]);
  useEffect(() => {
    listener = setList;
    return () => {
      if (listener === setList) listener = null;
    };
  }, []);
  if (list.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
        zIndex: 3100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      {list.map((m) => (
        <MessageItem key={m.id} item={m} />
      ))}
    </div>
  );
}
