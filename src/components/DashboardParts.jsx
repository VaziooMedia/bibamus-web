// ============================================================
// Sous-composants du tableau de bord d'un salon — copiés depuis
// le prototype Claude, avec les anciennes fonctions de stockage
// (fetchRoom/saveRoom/generateRoomCode, basées sur window.storage)
// remplacées par les équivalents Supabase (loadSalon/saveSalon/
// generateRoomCode) — mêmes noms côté salons.js pour un portage
// aussi fidèle que possible.
//
// Note : le QR code du salon est temporairement affiché en texte
// brut — le vrai générateur de QR code sera porté dans un bloc
// dédié plus tard (c'est un module autonome assez conséquent).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { MoneyAmount, PrimaryButton } from "./ui.jsx";
import { formatMoney, nextId } from "../utils.js";
import { loadSalon, saveSalon, generateRoomCode } from "../data/salons.js";
import { QRCodeSVG } from "./QRCodeSVG.jsx";

export function PotCard({ event, updateEvent, myName }) {
  const [room, setRoom] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContributions, setShowContributions] = useState(false);
  const [contribName, setContribName] = useState(myName || "");
  const [contribAmount, setContribAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const salonCode = event.salonCode;

  const refresh = async () => {
    if (!salonCode) return;
    try {
      const r = await loadSalon(salonCode);
      if (r) setRoom(r);
    } catch (e) {
      // silent fail on background refresh
    }
  };

  React.useEffect(() => {
    if (!salonCode) return;
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonCode]);

  const contributions = salonCode ? (room?.pot?.contributions || event.pot?.contributions || []) : event.pot?.contributions || [];
  const potTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
  const spent = event.rounds.filter((r) => r.paidByPot).reduce((sum, r) => sum + (r.offeredBy ? 0 : r.total) + (r.tip || 0), 0);
  const balance = potTotal - spent - (event.tip || 0);
  const unit = event.currency === "jeton" ? "jeton" : "euro";
  const attendeeNames = new Set();
  event.rounds.forEach((r) => r.friends.forEach((f) => attendeeNames.add(f.name.toLowerCase())));
  const attendeesCount = attendeeNames.size;

  const addContribution = async () => {
    const amount = parseFloat(contribAmount.replace(",", "."));
    const name = contribName.trim();
    if (!name || !amount || amount <= 0) return;
    setSaving(true);
    const contribution = { id: nextId(), name, amount, timestamp: Date.now() };
    if (salonCode) {
      try {
        const fresh = (await loadSalon(salonCode)) || room;
        const updatedRoom = { ...fresh, pot: { contributions: [...(fresh?.pot?.contributions || []), contribution] } };
        await saveSalon(salonCode, updatedRoom);
        setRoom(updatedRoom);
      } catch (e) {
        // best-effort: a salon sync hiccup shouldn't block the local flow
      }
    } else {
      updateEvent(event.id, (e) => ({ ...e, pot: { contributions: [...(e.pot?.contributions || []), contribution] } }));
    }
    setContribAmount("");
    setShowAddForm(false);
    setSaving(false);
  };

  return (
    <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px 18px", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, opacity: 0.7, textAlign: "center" }}>Solde de la cagnotte</div>
      <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "42px", color: balance < 0 ? "#e08585" : COLORS.amber, lineHeight: 1.3, textAlign: "center" }}>
        <MoneyAmount value={balance} currency={unit} />
      </div>
      <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "2px", textAlign: "center" }}>
        {unit === "jeton" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <NavIcon name="jeton" size={17} color={COLORS.jetonFluo} /> {potTotal} versés · 🔴 {spent} dépensés · 🟢 {balance} restants
          </span>
        ) : (
          <>
            {formatMoney(potTotal, unit)} versés · {formatMoney(spent, unit)} dépensés{event.tip > 0 && ` · ${formatMoney(event.tip, unit)} de pourboire`}
          </>
        )}
      </div>
      {balance < potTotal * 0.15 && potTotal > 0 && (
        <div style={{ fontSize: "12px", color: "#e08585", fontWeight: 700, marginTop: "8px" }}>
          {balance <= 0 ? "⚠️ La cagnotte est à sec — pensez à remettre au pot !" : "⚠️ Il ne reste plus grand-chose dans la cagnotte."}
        </div>
      )}

      {event.rounds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${COLORS.chalkWhite}25` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.chalkWhite, lineHeight: 1 }}>{event.rounds.length}</div>
            <div style={{ fontSize: "10.5px", opacity: 0.65, fontWeight: 600, marginTop: "2px", lineHeight: 1.4 }}>
              TOURNÉE{event.rounds.length !== 1 ? "S" : ""}
              <br />
              OFFERTE{event.rounds.length !== 1 ? "S" : ""}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.chalkWhite, lineHeight: 1 }}>{attendeesCount}</div>
            <div style={{ fontSize: "10.5px", opacity: 0.65, fontWeight: 600, marginTop: "2px", lineHeight: 1.4 }}>
              BIBAX
            </div>
          </div>
        </div>
      )}

      {contributions.length > 0 && (
        <button
          onClick={() => setShowContributions((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", color: COLORS.chalkWhite, opacity: 0.8, fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "10px 0 0 0" }}
        >
          Détails
          <span style={{ display: "inline-flex", transform: `rotate(${showContributions ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
            <NavIcon name="back-triangle" size={11} color={COLORS.amber} />
          </span>
        </button>
      )}
      {showContributions && (
        <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: `1px solid ${COLORS.chalkWhite}25` }}>
          {(() => {
            const byName = [];
            const indexByName = {};
            contributions.forEach((c) => {
              if (indexByName[c.name] === undefined) {
                indexByName[c.name] = byName.length;
                byName.push({ name: c.name, amount: c.amount });
              } else {
                byName[indexByName[c.name]].amount += c.amount;
              }
            });
            return byName.map((c) => (
              <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "2px 0" }}>
                <span style={{ opacity: 0.85 }}>{c.name}</span>
                <span style={{ fontWeight: 700 }}>
                  <MoneyAmount value={c.amount} currency={unit} />
                </span>
              </div>
            ));
          })()}
        </div>
      )}

      {showAddForm ? (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${COLORS.chalkWhite}25` }}>
          <div style={{ fontSize: "12px", opacity: 0.75, marginBottom: "8px" }}>Qui verse ?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {[myName, ...(event.knownFriends || [])].filter(Boolean).map((n) => (
              <button
                key={n}
                onClick={() => setContribName(n)}
                style={{
                  background: contribName === n ? COLORS.amber : "none",
                  color: contribName === n ? COLORS.paper : COLORS.chalkWhite,
                  border: `2px solid ${contribName === n ? COLORS.amber : `${COLORS.chalkWhite}40`}`,
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {n === myName ? `${n} (moi)` : n}
              </button>
            ))}
          </div>
          <input
            value={contribAmount}
            onChange={(e) => setContribAmount(e.target.value.replace(",", "."))}
            placeholder={unit === "jeton" ? "Nombre de jetons" : "Montant en €"}
            inputMode="decimal"
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13.5px",
              outline: "none",
              marginBottom: "10px",
              boxSizing: "border-box",
              background: COLORS.surface,
              color: COLORS.ink,
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowAddForm(false)}
              style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `1.5px solid ${COLORS.chalkWhite}40`, background: "none", color: COLORS.chalkWhite, fontSize: "13px", cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              onClick={addContribution}
              disabled={saving || !contribName.trim() || !contribAmount}
              style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
            >
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: "12px", width: "100%", padding: "10px", borderRadius: "9px", border: `2px dashed ${COLORS.chalkWhite}50`, background: "none", color: COLORS.chalkWhite, fontWeight: 700, fontSize: "13.5px", cursor: "pointer" }}
        >
          + Remettre dans la cagnotte
        </button>
      )}
    </div>
  );
}

export function SalonSection({ event, updateEvent, myName, myBibroCode, bibros }) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null); // null | 'join'
  const [codeInput, setCodeInput] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const salonCode = event.salonCode;

  const refresh = async (code) => {
    try {
      const r = await loadSalon(code);
      if (r) setRoom(r);
    } catch (e) {
      // silent fail on background refresh
    }
  };

  React.useEffect(() => {
    if (!salonCode) return;
    refresh(salonCode);
    const interval = setInterval(() => refresh(salonCode), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonCode]);

  const createSalon = async () => {
    setLoading(true);
    setError("");
    try {
      const code = await generateRoomCode();
      const newRoom = {
        code,
        participants: [{ code: myBibroCode, name: myName, joinedAt: Date.now() }],
        roundLog: [],
        pot: { contributions: (event.pot && event.pot.contributions) || [] },
        config: { name: event.name, date: event.date, currency: event.currency, jetonUnitValue: event.jetonUnitValue, menu: event.menu, mode: event.mode },
      };
      await saveSalon(code, newRoom);
      updateEvent(event.id, (e) => ({ ...e, salonCode: code, mySalonName: myName, myParticipantCode: myBibroCode }));
      setRoom(newRoom);
    } catch (e) {
      setError("Impossible de créer le BibaRoom. Réessayez.");
    }
    setLoading(false);
  };

  const joinSalon = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const existing = await loadSalon(code);
      if (!existing) {
        setError("Code introuvable. Vérifie auprès de tes amis.");
        setLoading(false);
        return;
      }
      const already = existing.participants.some((p) => p.code === myBibroCode);
      let updated = existing;
      if (!already) {
        updated = { ...existing, participants: [...existing.participants, { code: myBibroCode, name: myName, joinedAt: Date.now() }] };
        await saveSalon(code, updated);
      }
      updateEvent(event.id, (e) => ({ ...e, salonCode: code, mySalonName: myName, myParticipantCode: myBibroCode }));
      setRoom(updated);
      setMode(null);
    } catch (e) {
      setError("Impossible de rejoindre le BibaRoom. Réessayez.");
    }
    setLoading(false);
  };

  const leaveSalon = () => {
    updateEvent(event.id, (e) => ({ ...e, salonCode: null, mySalonName: null, myParticipantCode: null }));
    setRoom(null);
    setMode(null);
  };

  // Self-pause: a Bibax stepping away temporarily (joining another group for a bit, say) without
  // leaving the room. Paused people are skipped for "next up" and can't be picked as a drinker
  // when composing a round — either for themselves or by someone else ordering on their behalf.
  const togglePauseSelf = async () => {
    if (!room) return;
    const updated = { ...room, participants: room.participants.map((p) => (p.code === myBibroCode ? { ...p, paused: !p.paused } : p)) };
    setRoom(updated);
    await saveSalon(salonCode, updated);
  };

  if (!salonCode) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px" }}>BibaRoom partagé</div>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "10px" }}>
          Tu le rejoindras en tant que <strong>{myName}</strong>.
        </p>
        {!mode && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={createSalon}
              disabled={loading}
              style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "9px", padding: "11px", fontWeight: 700, fontSize: "13.5px", cursor: "pointer", color: COLORS.paper }}
            >
              {loading ? "..." : "Créer un BibaRoom"}
            </button>
            <button
              onClick={() => setMode("join")}
              style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "9px", padding: "9px", fontWeight: 700, fontSize: "13.5px", cursor: "pointer", color: COLORS.ink }}
            >
              Rejoindre
            </button>
          </div>
        )}
        {mode === "join" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && joinSalon()}
              placeholder="Code du BibaRoom (4 caractères)"
              autoFocus
              maxLength={4}
              style={{ padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", fontFamily: "'Urbanist', sans-serif", letterSpacing: "2px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setMode(null)} style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "10px", fontSize: "13px", cursor: "pointer" }}>
                Annuler
              </button>
              <button
                onClick={joinSalon}
                disabled={!codeInput.trim() || loading}
                style={{ flex: 1, background: COLORS.amber, border: "none", borderRadius: "8px", padding: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}
              >
                {loading ? "..." : "Rejoindre"}
              </button>
            </div>
          </div>
        )}
        {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginTop: "8px" }}>{error}</p>}
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Connexion au BibaRoom {salonCode}...</p>
      </div>
    );
  }

  const order = [...room.participants].sort((a, b) => a.joinedAt - b.joinedAt);
  const activeOrder = order.filter((p) => !p.paused);
  const currentIndex = activeOrder.length ? room.roundLog.length % activeOrder.length : 0;
  const currentParticipant = activeOrder.length ? activeOrder[currentIndex] : null;
  const myEntry = room.participants.find((p) => p.code === myBibroCode);
  const roundsBought = (p) => room.roundLog.filter((r) => (r.buyerCode ? r.buyerCode === p.code : r.buyerName === p.name)).length;

  const resolvedName = (p) => {
    const bibro = (bibros || []).find((b) => b.code === p.code);
    return bibro && bibro.alias ? bibro.alias : p.name;
  };

  // Same resolved label used by more than one participant: add a short code suffix so they stay distinguishable.
  const nameCounts = {};
  order.forEach((p) => {
    const key = resolvedName(p).toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });
  const labelFor = (p) => {
    const base = resolvedName(p);
    return nameCounts[base.toLowerCase()] > 1 && p.code ? `${base} ·${p.code.slice(-2)}` : base;
  };

  return (
    <>
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: COLORS.inkSoft, fontWeight: 600 }}>Suggestion pour la prochaine tournée</div>
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.amber }}>
          {currentParticipant ? labelFor(currentParticipant) : "?"}
          {currentParticipant && currentParticipant.code === myBibroCode ? (
            <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: COLORS.inkSoft }}> (vous)</span>
          ) : (
            ""
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
        {order.map((p, i) => {
          const isMe = p.code === myBibroCode;
          const isCurrent = currentParticipant && p.code === currentParticipant.code;
          return (
            <div
              key={p.code || p.name}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13.5px", padding: "6px 8px", borderRadius: "8px", background: isCurrent ? COLORS.paperAlt : "transparent", opacity: p.paused ? 0.55 : 1 }}
            >
              <span style={{ fontWeight: isMe ? 700 : 500, display: "flex", alignItems: "center", gap: "6px" }}>
                {i + 1}. {labelFor(p)}
                {isMe && <span style={{ fontSize: "11px", fontWeight: 500, color: COLORS.inkSoft }}> (vous)</span>}
                {p.paused && <NavIcon name="pause" size={12} color={COLORS.bobYellow} />}
              </span>
              <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber }}>{roundsBought(p)}</span> tournée{roundsBought(p) > 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Inviter des Bibax à rejoindre ce BibaRoom</div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <QRCodeSVG value={salonCode} size={64} color={COLORS.paper} background={COLORS.ink} />
        <div>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "3px" }}>{salonCode}</div>
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: "4px 0 0 0" }}>Partagez ce code ou faites scanner ce QR.</p>
        </div>
      </div>

      <div style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", borderTop: `1px dashed ${COLORS.paperAlt}`, paddingTop: "12px" }}>
        <span style={{ color: COLORS.amber }}>{myName}</span> — Faire une pause ou quitter la session
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={togglePauseSelf}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            background: "none",
            border: `2px solid ${myEntry && myEntry.paused ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "8px",
            padding: "9px 10px",
            color: myEntry && myEntry.paused ? COLORS.amber : COLORS.ink,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="S'absenter un moment sans quitter le BibaRoom — bloque ton nom dans les tournées le temps de ta pause"
        >
          <NavIcon name={myEntry && myEntry.paused ? "play" : "pause"} size={13} color={COLORS.amber} />
          {myEntry && myEntry.paused ? "Reprendre" : "Pause"}
        </button>
        <button
          onClick={() => (confirmLeave ? leaveSalon() : setConfirmLeave(true))}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            background: "none",
            border: `2px solid ${confirmLeave ? COLORS.redFluo : COLORS.paperAlt}`,
            borderRadius: "8px",
            padding: "9px 10px",
            color: confirmLeave ? COLORS.redFluo : COLORS.ink,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <NavIcon name="stop" size={13} color={confirmLeave ? COLORS.redFluo : COLORS.amber} />
          {confirmLeave ? "Confirmer ?" : "Quitter"}
        </button>
      </div>
      {confirmLeave && (
        <p style={{ fontSize: "11px", color: COLORS.redFluo, marginTop: "8px", textAlign: "center" }}>
          Tes tournées déjà offertes restent enregistrées.{" "}
          <button
            onClick={() => setConfirmLeave(false)}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, textDecoration: "underline", fontSize: "11px", cursor: "pointer", padding: 0 }}
          >
            Annuler
          </button>
        </p>
      )}
    </div>
    </>
  );
}

export function FinalTotalCard({ event, updateEvent, roundsSum }) {
  const [value, setValue] = useState(event.finalTotal != null ? String(event.finalTotal) : "");
  const [tipValue, setTipValue] = useState(event.tip ? String(event.tip) : "");

  const save = () => {
    const parsedTotal = parseFloat(value);
    const parsedTip = parseFloat(tipValue);
    updateEvent(event.id, (e) => ({
      ...e,
      finalTotal: isNaN(parsedTotal) ? null : parsedTotal,
      tip: isNaN(parsedTip) ? 0 : parsedTip,
    }));
  };

  const clear = () => {
    setValue("");
    updateEvent(event.id, (e) => ({ ...e, finalTotal: null }));
  };

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px" }}>Note finale du bar</div>
      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "10px" }}>
        Facultatif — encode le montant de l'addition quand tu le connais, pour le comparer à tes tournées sur la note ({formatMoney(roundsSum, "euro")}). Les tournées déjà réglées au comptoir n'y comptent pas.
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "10.5px", color: COLORS.inkSoft, marginBottom: "3px" }}>Addition</div>
          <div style={{ display: "flex", alignItems: "center", width: "88px", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 8px" }}>
            <input
              type="number"
              min="0"
              step="0.10"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              style={{ width: "100%", minWidth: 0, border: "none", padding: "10px 0", fontSize: "14px", fontFamily: "'Urbanist', sans-serif", outline: "none" }}
            />
            <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>€</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "10.5px", color: COLORS.inkSoft, marginBottom: "3px" }}>Pourboire</div>
          <div style={{ display: "flex", alignItems: "center", width: "88px", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 8px" }}>
            <input
              type="number"
              min="0"
              step="0.10"
              value={tipValue}
              onChange={(e) => setTipValue(e.target.value)}
              placeholder="0,00"
              style={{ width: "100%", minWidth: 0, border: "none", padding: "10px 0", fontSize: "14px", fontFamily: "'Urbanist', sans-serif", outline: "none" }}
            />
            <span style={{ fontSize: "12px", color: COLORS.inkSoft, flexShrink: 0 }}>€</span>
          </div>
        </div>
        <button onClick={save} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "11px 16px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper, flexShrink: 0 }}>
          Valider
        </button>
      </div>
      {event.finalTotal != null && (
        <button onClick={clear} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", cursor: "pointer", padding: "8px 0 0 0" }}>
          Effacer la note finale
        </button>
      )}
    </div>
  );
}

export function SplitBillCard({ event, updateEvent, total }) {
  const [newName, setNewName] = useState("");
  const [tipValue, setTipValue] = useState(event.tip ? String(event.tip) : "");
  const [editingAmountName, setEditingAmountName] = useState(null);
  const [editingAmountValue, setEditingAmountValue] = useState("");
  const [splitMethod, setSplitMethod] = useState(null); // null | "equal" | "proportional"

  const totalWithTip = total + (event.tip || 0);

  // Now {name, amount}[] instead of plain names — each share is independently editable, e.g.
  // for someone who arrived late and wants to pay less than an equal split.
  const participants = event.splitParticipants || [];

  const suggested = [];
  const seen = new Set();
  event.rounds.forEach((r) =>
    r.friends.forEach((f) => {
      const key = f.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        suggested.push(f.name);
      }
    })
  );
  const suggestable = suggested.filter((name) => !participants.some((p) => p.name.toLowerCase() === name.toLowerCase()));

  // Round-up-to-a-clean-number-per-person proposals, based on how many people are splitting.
  // Three increasingly generous options — round up to the next 10c, 50c, then whole euro per
  // person — so the smallest one barely changes anything (just kills the coins) and the largest
  // is a proper round tip. Each total tip shown is for the whole group, not per person.
  const tipProposals = (() => {
    const n = participants.length;
    if (n === 0) return [];
    const baseShare = total / n;
    const steps = [0.1, 0.5, 1];
    const proposals = [];
    const seenShares = new Set();
    steps.forEach((step) => {
      let share = Math.ceil((baseShare - 0.001) / step) * step;
      if (share <= baseShare + 0.001) share += step;
      share = Math.round(share * 100) / 100;
      const key = share.toFixed(2);
      if (seenShares.has(key)) return;
      seenShares.add(key);
      const proposedTotal = Math.round(share * n * 100) / 100;
      const tip = Math.round((proposedTotal - total) * 100) / 100;
      if (tip > 0.001) proposals.push({ share, tip });
    });
    return proposals;
  })();

  // What each known name actually drank across every round, used for the proportional split.
  const consumptionByName = {};
  event.rounds.forEach((r) => {
    r.orders.forEach((o) => {
      const friend = r.friends.find((f) => f.id === o.friendId);
      if (!friend) return;
      const drink = event.menu.find((d) => d.id === o.drinkId);
      const price = drink ? drink.price : 0;
      consumptionByName[friend.name] = (consumptionByName[friend.name] || 0) + price;
    });
  });

  const setParticipants = (list) => updateEvent(event.id, (e) => ({ ...e, splitParticipants: list }));

  const saveTip = () => {
    const parsed = parseFloat(tipValue.replace(",", "."));
    const newTip = isNaN(parsed) ? 0 : parsed;
    const newTotalWithTip = total + newTip;
    updateEvent(event.id, (e) => {
      if (splitMethod === "equal" && participants.length > 0) {
        const share = Math.round((newTotalWithTip / participants.length) * 100) / 100;
        return { ...e, tip: newTip, splitParticipants: participants.map((p) => ({ ...p, amount: share })) };
      }
      if (splitMethod === "proportional" && participants.length > 0) {
        const sumConsumption = participants.reduce((s, p) => s + (consumptionByName[p.name] || 0), 0);
        if (sumConsumption > 0) {
          return {
            ...e,
            tip: newTip,
            splitParticipants: participants.map((p) => ({ ...p, amount: Math.round(((consumptionByName[p.name] || 0) / sumConsumption) * newTotalWithTip * 100) / 100 })),
          };
        }
      }
      return { ...e, tip: newTip };
    });
  };

  const applyTipProposal = (proposal) => {
    updateEvent(event.id, (e) => ({ ...e, tip: proposal.tip, splitParticipants: participants.map((p) => ({ ...p, amount: proposal.share })) }));
    setTipValue(String(proposal.tip));
    setSplitMethod("equal");
  };

  // True while every current participant still has the same amount — i.e. nobody has manually
  // customized a share yet, so it's safe to keep auto-recalculating as people join or leave.
  const stillEqualSplit = participants.length === 0 || participants.every((p) => Math.abs(p.amount - participants[0].amount) < 0.02);

  const addParticipant = (name) => {
    const trimmed = name.trim();
    if (!trimmed || participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const nextCount = participants.length + 1;
    const equalShare = Math.round((totalWithTip / nextCount) * 100) / 100;
    const updatedExisting = stillEqualSplit ? participants.map((p) => ({ ...p, amount: equalShare })) : participants;
    setParticipants([...updatedExisting, { name: trimmed, amount: equalShare }]);
  };

  const removeParticipant = (name) => {
    const remaining = participants.filter((p) => p.name !== name);
    if (stillEqualSplit && remaining.length > 0) {
      const equalShare = Math.round((totalWithTip / remaining.length) * 100) / 100;
      setParticipants(remaining.map((p) => ({ ...p, amount: equalShare })));
    } else {
      setParticipants(remaining);
    }
  };

  const updateAmount = (name, rawValue) => {
    const amount = parseFloat(rawValue.replace(",", "."));
    setParticipants(participants.map((p) => (p.name === name ? { ...p, amount: isNaN(amount) ? 0 : amount } : p)));
    setSplitMethod(null);
  };

  const applyEqualSplit = () => {
    if (participants.length === 0) return;
    const share = Math.round((totalWithTip / participants.length) * 100) / 100;
    setParticipants(participants.map((p) => ({ ...p, amount: share })));
    setSplitMethod("equal");
  };

  const applyProportionalSplit = () => {
    if (participants.length === 0) return;
    const sumConsumption = participants.reduce((s, p) => s + (consumptionByName[p.name] || 0), 0);
    if (sumConsumption <= 0) return;
    setParticipants(
      participants.map((p) => ({ ...p, amount: Math.round(((consumptionByName[p.name] || 0) / sumConsumption) * totalWithTip * 100) / 100 }))
    );
    setSplitMethod("proportional");
  };

  const distributed = participants.reduce((s, p) => s + (p.amount || 0), 0);
  const matches = Math.abs(distributed - totalWithTip) < 0.01;

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px" }}>Addition partagée</div>
      <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "10px" }}>
        Total accumulé ce soir :{" "}
        <strong style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber }}>
          <MoneyAmount value={total} currency="euro" />
        </strong>
        .
        <br />
        Ajustez qui partage l'addition ci-dessous.
      </p>

      <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Qui partage l'addition ?</label>
      {participants.length === 0 && <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", marginBottom: "8px" }}>Personne pour l'instant — ajoutez des noms ci-dessous.</p>}

      {participants.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
          {participants.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: COLORS.ink }}>{p.name}</span>
              <div style={{ display: "flex", alignItems: "center", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 8px" }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingAmountName === p.name ? editingAmountValue : p.amount.toFixed(2).replace(".", ",")}
                  onFocus={() => {
                    setEditingAmountName(p.name);
                    setEditingAmountValue(p.amount.toFixed(2).replace(".", ","));
                  }}
                  onChange={(e) => {
                    setEditingAmountValue(e.target.value);
                    updateAmount(p.name, e.target.value);
                  }}
                  onBlur={() => setEditingAmountName(null)}
                  style={{ width: "68px", border: "none", padding: "7px 0", fontSize: "13.5px", fontFamily: "'Urbanist', sans-serif", outline: "none", textAlign: "right" }}
                />
              </div>
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>€</span>
              <button onClick={() => removeParticipant(p.name)} style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "18px", cursor: "pointer", padding: "0 2px 0 6px", lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestable.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "6px" }}>Repérés dans les tournées :</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {suggestable.map((name) => {
              const hadDrinks = (consumptionByName[name] || 0) > 0;
              return (
                <button
                  key={name}
                  onClick={() => addParticipant(name)}
                  style={{ background: COLORS.surface, border: `2px dashed ${COLORS.paperAlt}`, borderRadius: "999px", padding: "5px 12px", fontSize: "12.5px", fontWeight: 600, color: hadDrinks ? COLORS.redFluo : "#fff", cursor: "pointer" }}
                >
                  + {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addParticipant(newName);
              setNewName("");
            }
          }}
          placeholder="Ajouter un nom"
          style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
        />
        <button
          onClick={() => {
            addParticipant(newName);
            setNewName("");
          }}
          disabled={!newName.trim()}
          style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}
        >
          Ajouter
        </button>
      </div>

      {participants.length > 0 && (
        <>
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <button
              onClick={applyEqualSplit}
              style={{ flex: 1, background: "none", border: `2px solid ${splitMethod === "equal" ? COLORS.amber : "#fff"}`, borderRadius: "8px", padding: "9px", fontWeight: 600, fontSize: "12.5px", color: COLORS.ink, cursor: "pointer" }}
            >
              À parts égales
            </button>
            <button
              onClick={applyProportionalSplit}
              disabled={Object.keys(consumptionByName).length === 0}
              style={{ flex: 1, background: "none", border: `2px solid ${splitMethod === "proportional" ? COLORS.amber : "#fff"}`, borderRadius: "8px", padding: "9px", fontWeight: 600, fontSize: "12.5px", color: COLORS.ink, cursor: "pointer" }}
            >
              Selon consommation
            </button>
          </div>

          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px dashed ${COLORS.paperAlt}`, textAlign: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: 600 }}>
              <span style={{ color: COLORS.chalkWhite }}>Réparti : </span>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: matches ? COLORS.amber : COLORS.redFluo }}>
                <MoneyAmount value={distributed} currency="euro" />
              </span>
              <span style={{ color: COLORS.chalkWhite }}> / </span>
              <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: matches ? COLORS.amber : COLORS.redFluo }}>
                <MoneyAmount value={totalWithTip} currency="euro" />
              </span>
              {matches ? (
                <span style={{ color: COLORS.amber }}> ✓</span>
              ) : (
                <span style={{ color: COLORS.chalkWhite }}>
                  {" "}
                  (écart de <span style={{ color: COLORS.redFluo, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>
                    <MoneyAmount value={Math.abs(distributed - total)} currency="euro" />
                  </span>
                  )
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Envie d'arrondir avec un pourboire ?</label>

            {tipProposals.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                {tipProposals.map((p) => (
                  <button
                    key={p.share}
                    onClick={() => applyTipProposal(p)}
                    style={{
                      background: Math.abs((event.tip || 0) - p.tip) < 0.005 ? COLORS.amber : COLORS.surface,
                      color: Math.abs((event.tip || 0) - p.tip) < 0.005 ? COLORS.paper : COLORS.ink,
                      border: `2px solid ${Math.abs((event.tip || 0) - p.tip) < 0.005 ? COLORS.ink : COLORS.paperAlt}`,
                      borderRadius: "10px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "13.5px" }}>{formatMoney(p.share, "euro")}/pers.</div>
                    <div style={{ fontSize: "10.5px", opacity: 0.75 }}>+{formatMoney(p.tip, "euro")} au total</div>
                  </button>
                ))}
              </div>
            )}

            <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginBottom: "6px" }}>Montant précis :</p>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", width: "80px", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "0 8px" }}>
                <input
                  type="number"
                  min="0"
                  step="0.10"
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value)}
                  placeholder="0,00"
                  style={{ width: "100%", minWidth: 0, border: "none", padding: "9px 0", fontSize: "13.5px", fontFamily: "'Urbanist', sans-serif", outline: "none" }}
                />
              </div>
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginRight: "6px" }}>€</span>
              <button onClick={saveTip} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 700, fontSize: "12.5px", cursor: "pointer", color: COLORS.paper }}>
                Valider
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BibaBobModal({ friendName, storedPin, mode, onActivate, onDeactivate, onClose }) {
  const [code, setCode] = useState("");
  const [tolerance, setTolerance] = useState(null);
  const [error, setError] = useState("");

  const submit = () => {
    if (!code.trim()) {
      setError("Entrez un code.");
      return;
    }
    if (mode === "activate") {
      if (!tolerance) {
        setError("Choisissez une option.");
        return;
      }
      onActivate(tolerance, code.trim());
    } else {
      if (code.trim() !== (storedPin || "")) {
        setError("Code incorrect.");
        return;
      }
      onDeactivate();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: COLORS.surface, borderRadius: "20px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 900, fontSize: "32px", lineHeight: 1 }}>
            <span style={{ color: COLORS.ink }}>Biba</span>
            <span style={{ color: COLORS.amber }}>ZERO</span>
          </span>
        </div>

        {mode === "activate" && (
          <>
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", marginBottom: "14px" }}>
              Tant que ce mode est actif, seules les boissons ≤ 0,5% seront proposées pour <span style={{ color: COLORS.amber, fontWeight: 700 }}>{friendName}</span>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <button
                onClick={() => setTolerance("zero")}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: `2px solid ${tolerance === "zero" ? COLORS.bobBlue : COLORS.paperAlt}`,
                  background: tolerance === "zero" ? COLORS.surfaceAlt : COLORS.surface,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Tolérance zéro</div>
                <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>Aucune exception possible lors de cette session.</div>
              </button>
              <button
                onClick={() => setTolerance("joker")}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: `2px solid ${tolerance === "joker" ? COLORS.bobBlue : COLORS.paperAlt}`,
                  background: tolerance === "joker" ? COLORS.surfaceAlt : COLORS.surface,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "14px" }}>Avec 1 joker</div>
                <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "2px" }}>
                  Un verre alcoolisé exceptionnel possible.
                  <br />
                  Une fois utilisé, retour à la tolérance zéro.
                </div>
              </button>
            </div>
          </>
        )}

        {mode === "deactivate" && (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", marginBottom: "14px" }}>
            Le mode BibaZERO sera désactivé pour <span style={{ color: COLORS.amber, fontWeight: 700 }}>{friendName}</span>.
          </p>
        )}

        <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>
          {mode === "activate" ? "Code à 4 chiffres" : "Entre le même code utilisé lors de l'activation"}
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^0-9]/g, ""));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ex. 1234"
          autoFocus
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${error ? COLORS.wine : COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "6px", fontFamily: "'Urbanist', sans-serif" }}
        />
        {error && <p style={{ fontSize: "12px", color: COLORS.wine, fontWeight: 600, margin: "0 0 10px 0" }}>{error}</p>}
        {mode === "activate" && (
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "-2px", marginBottom: "10px" }}>
            Ce code sera nécessaire pour désactiver le mode.
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "13px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            Annuler
          </button>
          <PrimaryButton onClick={submit} style={{ flex: 1 }}>
            {mode === "activate" ? "Activer" : "Désactiver"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
