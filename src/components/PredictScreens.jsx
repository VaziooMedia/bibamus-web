// ============================================================
// Predict — le premier jeu de la plateforme BibaPlay (pronostics
// sportifs entre amis). Jalon 2 : la vraie boucle de jeu — l'hôte
// lance un pronostic parmi quelques modèles prédéfinis, chacun a
// 15 secondes pour répondre, puis l'hôte valide manuellement la
// bonne réponse (pas d'API football pour l'instant — le mode
// manuel de secours du cahier des charges, construit en premier).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { SalonQrScannerModal } from "./SalonQrScannerModal.jsx";
import { QRCodeSVG } from "./QRCodeSVG.jsx";

export const ANSWER_DURATION_SECONDS = 15;

// Modèles de pronostics — un petit jeu curaté pour ce jalon, plutôt que le générateur
// dynamique complet du cahier des charges (viendra plus tard une fois la boucle de base
// éprouvée). teamA/teamB remplacent les noms génériques par ceux saisis par l'hôte.
const getQuestionTemplates = (teamA, teamB) => [
  {
    id: "next_event",
    title: "Quel sera le prochain événement ?",
    basePoints: 40,
    choices: [
      { id: "goal", label: "But" },
      { id: "card", label: "Carton" },
      { id: "corner", label: "Corner" },
      { id: "none", label: "Aucun de ces événements" },
    ],
  },
  {
    id: "next_goal",
    title: "Qui marquera le prochain but ?",
    basePoints: 30,
    choices: [
      { id: "team_a", label: teamA },
      { id: "team_b", label: teamB },
      { id: "no_goal", label: "Aucun but" },
    ],
  },
  {
    id: "next_card",
    title: "Quelle équipe recevra le prochain carton ?",
    basePoints: 20,
    choices: [
      { id: "team_a", label: teamA },
      { id: "team_b", label: teamB },
      { id: "no_card", label: "Aucun carton" },
    ],
  },
  {
    id: "match_winner",
    title: "Qui va gagner le match ?",
    basePoints: 50,
    choices: [
      { id: "team_a", label: teamA },
      { id: "draw", label: "Match nul" },
      { id: "team_b", label: teamB },
    ],
  },
];


// --- Écran d'entrée pour Predict : créer ou rejoindre une partie avec un code, comme pour un
// BibaRoom classique. Atteint soit depuis la liste des jeux BibaPlay (partie indépendante),
// soit directement depuis un salon déjà ouvert (partie liée à ce salon). ---
export function PredictHubScreen({ onBack, onCreate, onJoin }) {
  const [mode, setMode] = useState(null); // null | "join"
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      await onCreate(testMode);
    } catch (e) {
      setError(e.message || "Impossible de créer la partie — réessaie.");
      setLoading(false);
    }
  };

  const handleJoin = async (codeToJoin) => {
    const finalCode = (codeToJoin || code).trim();
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

  const handleScanned = (scannedCode) => {
    setScanning(false);
    setCode(scannedCode);
    handleJoin(scannedCode);
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
            onClick={() => setTestMode((t) => !t)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: COLORS.surface,
              border: `2px solid ${testMode ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.ink, textAlign: "left" }}>
              Mode test solo
              <div style={{ fontSize: "11px", fontWeight: 400, color: COLORS.inkSoft, marginTop: "2px" }}>Ajoute un joueur fictif qui répond seul, pour tester sans un 2ᵉ téléphone</div>
            </span>
            <span
              style={{
                width: "38px",
                height: "22px",
                borderRadius: "11px",
                background: testMode ? COLORS.amber : COLORS.paperAlt,
                position: "relative",
                flexShrink: 0,
                marginLeft: "10px",
              }}
            >
              <span style={{ position: "absolute", top: "2px", left: testMode ? "18px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: COLORS.paper, transition: "left 0.15s ease" }} />
            </span>
          </button>
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
            <span style={{ width: "1px", height: "24px", background: COLORS.paperAlt, flexShrink: 0 }} />
            <button
              onClick={() => setScanning(true)}
              title="Scanner le QR code"
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
            >
              <NavIcon name="scan-line" size={20} color={COLORS.amber} />
            </button>
          </div>
          {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "12px" }}>{error}</p>}
          <PrimaryButton onClick={() => handleJoin()} disabled={!code.trim() || loading} style={{ width: "100%" }}>
            {loading ? "..." : "Rejoindre →"}
          </PrimaryButton>
        </>
      )}
      <PageFooterNav onBack={mode === "join" ? () => setMode(null) : onBack} />
      {scanning && (
        <SalonQrScannerModal
          onClose={() => setScanning(false)}
          onScanned={handleScanned}
          title="Rejoindre une partie Predict"
          instruction="Visez le QR code affiché par l'hôte de la partie"
        />
      )}
    </div>
  );
}

// --- Écran de la partie Predict elle-même. En attente : code (si indépendante), participants,
// et formulaire de démarrage pour l'hôte (noms des deux équipes). Une fois active : classement
// en direct, et la question en cours (ou le bouton pour en lancer une, côté hôte). ---
export function PredictGameScreen({ game, myBibroCode, onBack, onStart, onLaunchPrediction, onSubmitAnswer, onResolvePrediction, onBotAnswer }) {
  const [copied, setCopied] = useState(false);
  const [teamAInput, setTeamAInput] = useState("");
  const [teamBInput, setTeamBInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const isHost = game.hostBibroCode === myBibroCode;
  const participants = game.participants || [];
  const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
  const prediction = game.activePrediction;
  const lastResolved = game.history && game.history.length > 0 ? game.history[game.history.length - 1] : null;

  // Chrono affiché — se base sur lockAt (un vrai instant partagé, écrit une seule fois par
  // l'hôte au lancement), pas sur un décompte local : tous les téléphones restent d'accord
  // sur le temps restant, même si l'un d'eux a mis quelques secondes à recevoir la mise à jour.
  useEffect(() => {
    if (!prediction || prediction.correctChoiceId) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [prediction?.id, prediction?.correctChoiceId]);

  // Mode test solo — le joueur fictif "répond" tout seul après un délai aléatoire, pour
  // pouvoir dérouler toute la boucle (chrono, verrouillage, scoring) sans un vrai 2ᵉ téléphone.
  useEffect(() => {
    if (!game.testMode || !prediction || prediction.correctChoiceId || !onBotAnswer) return;
    const alreadyAnswered = prediction.answers?.some((a) => a.userCode === "__test_bot__");
    if (alreadyAnswered) return;
    const delayMs = 2000 + Math.random() * 6000;
    const timeout = setTimeout(() => {
      const choice = prediction.choices[Math.floor(Math.random() * prediction.choices.length)];
      onBotAnswer(choice.id);
    }, delayMs);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction?.id, game.testMode]);

  const copyCode = () => {
    navigator.clipboard?.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (game.status === "waiting") {
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
            <div style={{ background: COLORS.ink, borderRadius: "10px", padding: "10px", margin: "6px 0" }}>
              <QRCodeSVG value={game.code} size={120} color={COLORS.paper} background={COLORS.ink} />
            </div>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", letterSpacing: "6px", color: COLORS.amber }}>{game.code}</span>
            <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{copied ? "Copié !" : "Touche pour copier"}</span>
          </button>
        )}

        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Participants ({participants.length})</div>
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
              {p.code === game.hostBibroCode && <span style={{ fontSize: "10px", fontWeight: 700, color: COLORS.amber, letterSpacing: "0.5px" }}>HÔTE</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto" }}>
          {isHost ? (
            <>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Les deux équipes (optionnel)</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <input
                  value={teamAInput}
                  onChange={(e) => setTeamAInput(e.target.value)}
                  placeholder="Équipe A"
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "13.5px", outline: "none" }}
                />
                <input
                  value={teamBInput}
                  onChange={(e) => setTeamBInput(e.target.value)}
                  placeholder="Équipe B"
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "13.5px", outline: "none" }}
                />
              </div>
              <PrimaryButton onClick={() => onStart(teamAInput, teamBInput)} disabled={participants.length < 2} style={{ width: "100%" }}>
                Démarrer la partie
              </PrimaryButton>
            </>
          ) : (
            <p style={{ textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>En attente que l'hôte démarre la partie...</p>
          )}
        </div>
        <PageFooterNav onBack={onBack} />
      </div>
    );
  }

  // --- Partie active ---
  const templates = getQuestionTemplates(game.teamA || "Équipe A", game.teamB || "Équipe B");
  const myAnswer = prediction?.answers?.find((a) => a.userCode === myBibroCode);
  const remainingMs = prediction ? prediction.lockAt - now : 0;
  const isLocked = prediction && (remainingMs <= 0 || prediction.correctChoiceId);
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 4px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>Predict</h1>
      </div>
      {(game.teamA || game.teamB) && (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "18px" }}>
          {game.teamA || "Équipe A"} 🆚 {game.teamB || "Équipe B"}
        </p>
      )}

      {/* Classement — toujours visible pendant la partie */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "18px" }}>
        {sortedParticipants.map((p, i) => (
          <div
            key={p.code}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              padding: "8px 12px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: p.code === myBibroCode ? 700 : 500, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: COLORS.inkSoft, fontSize: "12px" }}>{i + 1}.</span>
              {p.name}
              {p.code === myBibroCode && <span style={{ fontSize: "11px", fontWeight: 500, color: COLORS.inkSoft }}> (toi)</span>}
            </span>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "14px", color: COLORS.amber }}>{p.score || 0} pts</span>
          </div>
        ))}
      </div>

      {/* Feedback sur le dernier pronostic résolu */}
      {lastResolved && !prediction && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "12.5px", color: COLORS.inkSoft }}>
          <strong style={{ color: COLORS.ink }}>{lastResolved.title}</strong>
          <br />
          Bonne réponse : <span style={{ color: COLORS.amber, fontWeight: 700 }}>{lastResolved.choices.find((c) => c.id === lastResolved.correctChoiceId)?.label}</span>
        </div>
      )}

      {/* Question en cours, ou bouton pour en lancer une (hôte) / attente (les autres) */}
      {prediction ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "18px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{prediction.title}</span>
            {!isLocked && (
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", color: remainingSeconds <= 5 ? COLORS.redFluo : COLORS.amber }}>
                {remainingSeconds}s
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {prediction.choices.map((choice) => {
              const isMine = myAnswer?.choiceId === choice.id;
              const isCorrect = prediction.correctChoiceId === choice.id;
              const showResult = !!prediction.correctChoiceId;
              return (
                <button
                  key={choice.id}
                  onClick={() => {
                    if (isLocked && isHost && !prediction.correctChoiceId) onResolvePrediction(choice.id);
                    else if (!isLocked) onSubmitAnswer(choice.id);
                  }}
                  disabled={isLocked && !(isHost && !prediction.correctChoiceId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `2px solid ${showResult && isCorrect ? COLORS.amber : isMine ? COLORS.amber : COLORS.paperAlt}`,
                    background: showResult && isCorrect ? `${COLORS.amber}22` : isMine ? `${COLORS.amber}15` : "none",
                    color: COLORS.ink,
                    fontSize: "13.5px",
                    fontWeight: isMine ? 700 : 500,
                    cursor: isLocked ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  {choice.label}
                  {isMine && !showResult && <NavIcon name="check" size={16} color={COLORS.amber} />}
                  {showResult && isCorrect && <NavIcon name="check" size={16} color={COLORS.amber} />}
                </button>
              );
            })}
          </div>
          {isHost && isLocked && !prediction.correctChoiceId && (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "12px", textAlign: "center" }}>
              Touche la bonne réponse ci-dessus pour valider et distribuer les points.
            </p>
          )}
          {!isHost && isLocked && !prediction.correctChoiceId && (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "12px", textAlign: "center" }}>En attente que l'hôte valide la bonne réponse...</p>
          )}
        </div>
      ) : isHost ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "2px" }}>Lancer un pronostic</div>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onLaunchPrediction(template)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>{template.title}</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>+{template.basePoints}</span>
            </button>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>En attente de la prochaine question...</p>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
