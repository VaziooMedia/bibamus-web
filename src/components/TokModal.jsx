// ============================================================
// Tok — la feuille qui s'ouvre depuis le bouton du BibaRoom.
//
// Règle directrice du cahier des charges : plus il faut réfléchir avant
// d'envoyer un Tok, moins ça marche. D'où un seul écran, sans confirmation —
// on touche un nom, le Tok part.
//
// La même feuille sert à répondre aux Tok reçus : ils apparaissent en haut,
// avant la liste des participants.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { sendTok, respondTok, TOK_ACTIONS } from "../data/toks.js";
import tokIconUrl from "../assets/brand/tok.svg";

const ACTION_LABELS = Object.fromEntries(TOK_ACTIONS.map((a) => [a.key, a.label]));

export function TokModal({ salonCode, targets, pending, myName, onClose, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [action, setAction] = useState(TOK_ACTIONS[0].key);
  // Sélection rapide : on coche un ou plusieurs noms, puis on envoie d'un coup.
  const [selected, setSelected] = useState(() => new Set());

  const toggleTarget = (userId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  const [error, setError] = useState(null);
  // Animation courte après un envoi ou une acceptation : { withName }
  const [flash, setFlash] = useState(null);

  const showFlash = (withName) => {
    setFlash({ withName });
    setTimeout(() => setFlash(null), 1800);
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setBusyId("send");
    setError(null);
    const result = await sendTok(salonCode, [...selected], action);
    setBusyId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    const names = targets.filter((t) => selected.has(t.userId)).map((t) => t.name);
    setSelected(new Set());
    showFlash(names.length > 2 ? `${names.length} Bibax` : names.join(" × "));
    onChanged?.();
  };

  const handleRespond = async (tok, accept) => {
    setBusyId(tok.id);
    setError(null);
    const result = await respondTok(tok.id, accept);
    setBusyId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onChanged?.();
    // Répondre clôt l'échange : la feuille se referme d'elle-même, après l'animation si le
    // Tok a été accepté, immédiatement s'il a été ignoré.
    if (accept && result.status === "ACCEPTED") {
      setFlash({ withName: tok.senderName });
      setTimeout(() => {
        setFlash(null);
        onClose();
      }, 1800);
      return;
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px", maxHeight: "80vh", overflowY: "auto" }}
      >
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />

        {flash ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <img src={tokIconUrl} alt="" style={{ height: "46px" }} />
            <p style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "10px 0 0", color: COLORS.amber }}>Tok !</p>
            <p style={{ fontSize: "14px", color: COLORS.ink, margin: "6px 0 0" }}>
              {/* Le séparateur est en vert fluo ; withName peut déjà contenir plusieurs noms
                  pour un Tok collectif, d'où le découpage. */}
              {[myName, ...String(flash.withName).split(" × ")].map((name, i) => (
                <React.Fragment key={`${name}-${i}`}>
                  {i > 0 && <span style={{ color: COLORS.amber, fontWeight: 800 }}> × </span>}
                  {name}
                </React.Fragment>
              ))}
            </p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.ink }}>Tok reçus ({pending.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pending.map((t) => (
                    <div key={t.id} style={{ background: COLORS.surfaceAlt, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <EntityAvatar photoUrl={t.senderAvatarUrl} size={32} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13.5px", fontWeight: 700, color: COLORS.ink }}>
                            <img src={tokIconUrl} alt="" style={{ height: "14px" }} />
                            {t.senderName} t'envoie un Tok
                          </span>
                          <span style={{ display: "block", fontSize: "12px", color: COLORS.inkSoft, marginTop: "1px" }}>
                            {ACTION_LABELS[t.action] || "Interaction en attente"}
                          </span>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button
                          onClick={() => handleRespond(t, true)}
                          disabled={busyId === t.id}
                          style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px", fontWeight: 700, fontSize: "13px", color: COLORS.paper, cursor: "pointer" }}
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleRespond(t, false)}
                          disabled={busyId === t.id}
                          style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "7px", fontWeight: 700, fontSize: "13px", color: COLORS.inkSoft, cursor: "pointer" }}
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ width: "4px", height: "14px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.ink }}>Envoyer un Tok</span>
            </div>

            {/* Le choix reste facultatif : "Petite gorgée" est sélectionné d'emblée, on peut
                donc toucher un nom directement. */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              {TOK_ACTIONS.map((a) => {
                const selected = action === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAction(a.key)}
                    style={{
                      flex: 1,
                      background: selected ? COLORS.amber : "none",
                      color: selected ? COLORS.paper : COLORS.inkSoft,
                      border: `2px solid ${selected ? COLORS.amber : COLORS.paperAlt}`,
                      borderRadius: "999px",
                      padding: "7px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {a.short}
                  </button>
                );
              })}
            </div>

            {error && <p style={{ fontSize: "12.5px", color: COLORS.wine, margin: "0 0 8px" }}>{error}</p>}

            {targets.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 0", margin: 0 }}>
                Personne à qui envoyer un Tok pour l'instant.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {targets.map((t) => {
                  const isSelected = selected.has(t.userId);
                  return (
                    <button
                      key={t.userId}
                      onClick={() => toggleTarget(t.userId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        textAlign: "left",
                        width: "100%",
                        background: COLORS.surfaceAlt,
                        border: `2px solid ${isSelected ? COLORS.amber : COLORS.paperAlt}`,
                        borderRadius: "12px",
                        padding: "10px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <EntityAvatar photoUrl={t.avatarUrl} size={32} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>{t.name}</span>
                      {/* Repère, jamais une interdiction : une 0.0 % s'affone aussi. */}
                      {t.bibaZero && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: COLORS.amber,
                            border: `2px solid ${COLORS.amber}`,
                            borderRadius: "6px",
                            padding: "1px 6px",
                            flexShrink: 0,
                          }}
                        >
                          ZERO
                        </span>
                      )}
                      {isSelected ? (
                        <img src={tokIconUrl} alt="" style={{ height: "18px" }} />
                      ) : (
                        <span style={{ width: "18px", height: "18px", borderRadius: "50%", border: `2px solid ${COLORS.paperAlt}`, flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {targets.length > 0 && (
              <button
                onClick={handleSend}
                disabled={selected.size === 0 || busyId === "send"}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  background: selected.size > 0 ? COLORS.amber : "none",
                  border: `2px solid ${selected.size > 0 ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "12px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: selected.size > 0 ? COLORS.paper : COLORS.inkSoft,
                  cursor: selected.size > 0 ? "pointer" : "default",
                }}
              >
                {busyId === "send" ? "..." : selected.size > 1 ? `Envoyer le Tok (${selected.size})` : "Envoyer le Tok"}
              </button>
            )}

            <button
              onClick={onClose}
              style={{ width: "100%", padding: "14px 6px 0", background: "none", border: "none", fontSize: "15px", fontWeight: 600, color: COLORS.inkSoft, cursor: "pointer", textAlign: "left" }}
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
