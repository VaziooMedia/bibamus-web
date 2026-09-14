// ============================================================
// Predict — le premier jeu de la plateforme BibaPlay (pronostics
// sportifs entre amis). Jalon 1 : le socle (créer/rejoindre une
// partie, écran d'attente avec le code et les participants). Pas
// encore de vraie logique de jeu (questions, chrono, scoring) —
// ça viendra dans un prochain jalon, une fois ce socle validé.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";

// --- Écran d'entrée pour Predict : créer ou rejoindre une partie avec un code, comme pour un
// BibaRoom classique. Atteint soit depuis la liste des jeux BibaPlay (partie indépendante),
// soit directement depuis un salon déjà ouvert (partie liée à ce salon). ---
export function PredictHubScreen({ onBack, onCreate, onJoin }) {
  const [mode, setMode] = useState(null); // null | "join"
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      await onCreate();
    } catch (e) {
      setError(e.message || "Impossible de créer la partie — réessaie.");
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const finalCode = code.trim();
    if (!finalCode) return;
    setLoading(true);
    setError("");
    try {
      await onJoin(finalCode.toUpperCase());
    } catch (e) {
      setError(e.message || "Code introuvable. Vérifie auprès de tes amis.");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={mode === "join" ? () => setMode(null) : onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 8px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>Predict</h1>
      </div>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px" }}>Pronostics entre amis, sans argent réel — juste des points et un classement.</p>

      {mode !== "join" ? (
        <>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
              cursor: loading ? "default" : "pointer",
              textAlign: "left",
            }}
          >
            <NavIcon name="plus" size={22} color={COLORS.amber} />
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: 700, color: COLORS.ink }}>Créer une partie</div>
              <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>Tu deviens l'hôte, tes amis rejoignent avec un code</div>
            </div>
          </button>
          <button
            onClick={() => setMode("join")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "16px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <NavIcon name="scan-line" size={22} color={COLORS.amber} />
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: 700, color: COLORS.ink }}>Rejoindre avec un code</div>
              <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>Un ami a déjà créé la partie</div>
            </div>
          </button>
          {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginTop: "12px" }}>{error}</p>}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "0 16px",
              marginBottom: "16px",
              boxSizing: "border-box",
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="000000"
              maxLength={6}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "16px 0",
                border: "none",
                background: "none",
                fontSize: "24px",
                fontFamily: "'Urbanist', sans-serif",
                letterSpacing: "6px",
                textAlign: "center",
                outline: "none",
                color: COLORS.ink,
              }}
            />
          </div>
          {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "12px" }}>{error}</p>}
          <PrimaryButton onClick={handleJoin} disabled={!code.trim() || loading} style={{ width: "100%" }}>
            {loading ? "..." : "Rejoindre →"}
          </PrimaryButton>
        </>
      )}
      <PageFooterNav onBack={mode === "join" ? () => setMode(null) : onBack} />
    </div>
  );
}

// --- Écran de la partie Predict elle-même : code (si indépendante), participants déjà
// présents, et bouton "Démarrer" pour l'hôte. Jalon 1 seulement — pas encore de vraies
// questions après le démarrage. ---
export function PredictGameScreen({ game, myBibroCode, onBack, onStart }) {
  const [copied, setCopied] = useState(false);
  const isHost = game.hostBibroCode === myBibroCode;
  const participants = game.participants || [];

  const copyCode = () => {
    navigator.clipboard?.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 22px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>Predict</h1>
      </div>

      {!game.linkedSalonCode && (
        <button
          onClick={copyCode}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "18px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "11px", color: COLORS.inkSoft, fontWeight: 600 }}>Code de la partie</span>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", letterSpacing: "6px", color: COLORS.amber }}>{game.code}</span>
          <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{copied ? "Copié !" : "Touche pour copier"}</span>
        </button>
      )}

      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>
        Participants ({participants.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
        {participants.map((p) => (
          <div
            key={p.code}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              padding: "10px 14px",
            }}
          >
            <span style={{ fontSize: "13.5px", fontWeight: p.code === myBibroCode ? 700 : 500 }}>
              {p.name}
              {p.code === myBibroCode && <span style={{ fontSize: "11px", fontWeight: 500, color: COLORS.inkSoft }}> (toi)</span>}
            </span>
            {p.code === game.hostBibroCode && (
              <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, letterSpacing: "0.5px" }}>HÔTE</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        {game.status === "waiting" ? (
          isHost ? (
            <PrimaryButton onClick={onStart} disabled={participants.length < 2} style={{ width: "100%" }}>
              Démarrer la partie
            </PrimaryButton>
          ) : (
            <p style={{ textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>En attente que l'hôte démarre la partie...</p>
          )
        ) : (
          <p style={{ textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>
            La partie a démarré — les pronostics arrivent dans un prochain bloc Predict.
          </p>
        )}
      </div>
      <PageFooterNav onBack={onBack} />
    </div>
  );
}
