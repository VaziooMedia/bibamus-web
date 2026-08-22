// ============================================================
// Écran "Ticket" (récapitulatif + règlement d'une tournée) —
// copié tel quel depuis le prototype Claude, avec fetchRoom
// remplacé par loadSalon (Supabase).
// ============================================================
import React, { useState } from "react";
import { COLORS, VOLUME_DISPLAY_TYPES } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PrimaryButton, MoneyAmount } from "./ui.jsx";
import { formatMoney } from "../utils.js";
import { loadSalon } from "../data/salons.js";

export function RoundTicketScreen({ event, draftFriends, draftOrders, onEdit, onFinish }) {
  const [pausedCodes, setPausedCodes] = useState(new Set());

  React.useEffect(() => {
    if (!event.salonCode) return;
    let cancelled = false;
    loadSalon(event.salonCode)
      .then((r) => {
        if (!cancelled && r) setPausedCodes(new Set((r.participants || []).filter((p) => p.paused).map((p) => p.code)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event.salonCode]);

  const drinkName = (id) => event.menu.find((d) => d.id === id)?.name || id;
  const drinkPrice = (id) => event.menu.find((d) => d.id === id)?.price || 0;
  const drinkVolume = (id) => {
    const d = event.menu.find((d) => d.id === id);
    return d && VOLUME_DISPLAY_TYPES.includes(d.type) ? d.volumeCl || null : null;
  };
  const ordersForFriend = (friendId) => draftOrders.filter((o) => o.friendId === friendId);

  const tally = {};
  draftOrders.forEach((o) => (tally[o.drinkId] = (tally[o.drinkId] || 0) + 1));

  const estimatedTotal = draftOrders.reduce((sum, o) => sum + drinkPrice(o.drinkId), 0);
  const isEuro = event.currency === "euro";
  const isCagnotte = event.mode === "cagnotte";
  const isAddition = event.mode === "addition";
  const [amount, setAmount] = useState(estimatedTotal > 0 ? estimatedTotal.toFixed(2) : "");
  const [settledDirectly, setSettledDirectly] = useState(true);
  const [buyerId, setBuyerId] = useState(draftFriends.find((f) => f.isSelf)?.id || draftFriends[0]?.id || null);
  const buyerName = draftFriends.find((f) => f.id === buyerId)?.name || null;
  const [offeredByType, setOfferedByType] = useState(null); // null | "venue" | "thirdParty"
  const [offeredByLabel, setOfferedByLabel] = useState("");

  const finalAmount = isEuro ? parseFloat(amount) || 0 : estimatedTotal;
  const undefinedDrinkIds = new Set(Object.keys(tally).filter((id) => drinkPrice(id) === 0));
  const hasUndefinedPrice = undefinedDrinkIds.size > 0;

  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showFriendDetail, setShowFriendDetail] = useState(false);

  // Four round-up-to-the-next-0.50 proposals, so paying with cash lands on a clean number.
  const tipProposals = (() => {
    if (!finalAmount) return [];
    const proposals = [];
    let target = Math.ceil((finalAmount + 0.001) / 0.5) * 0.5;
    for (let i = 0; i < 3; i++) {
      const rounded = Math.round(target * 100) / 100;
      const proposalTip = Math.round((rounded - finalAmount) * 100) / 100;
      if (proposalTip > 0.001) proposals.push({ target: rounded, tip: proposalTip });
      target += 0.5;
    }
    return proposals;
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: COLORS.chalkBg, color: COLORS.chalkWhite, padding: "24px 20px 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <NavIcon name="back-triangle" size={16} color={COLORS.amber} />
          <span style={{ color: COLORS.chalkWhite, fontSize: "14px", fontWeight: 700 }}>Modifier</span>
        </button>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "20px", fontWeight: 800, color: COLORS.chalkWhite }}>TICKET</span>
      </div>

      <div style={{ border: `3px solid ${COLORS.chalkWhite}30`, borderRadius: "14px", padding: "20px 18px", marginTop: "14px", background: COLORS.chalkBgAlt, flex: 1, display: "flex", flexDirection: "column" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "27px", margin: "0 0 2px 0", color: COLORS.amber }}>{event.name}</h1>
        <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", opacity: 0.55, marginTop: 0, marginBottom: "16px" }}>
          {draftOrders.length} conso{draftOrders.length > 1 ? "s" : ""} · {draftFriends.filter((f) => ordersForFriend(f.id).length > 0).length} personne
          {draftFriends.filter((f) => ordersForFriend(f.id).length > 0).length > 1 ? "s" : ""}
        </p>

        {!isCagnotte && !isAddition && (
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, opacity: 0.7, marginBottom: "8px" }}>Qui offre cette tournée ?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
              {draftFriends.length > 1 &&
                draftFriends.map((f) => {
                  const isPaused = f.code && pausedCodes.has(f.code);
                  return (
                    <button
                      key={f.id}
                      disabled={isPaused}
                      onClick={() => {
                        setBuyerId(f.id);
                        setOfferedByType(null);
                      }}
                      title={isPaused ? "En pause — ne peut pas se voir attribuer une tournée" : undefined}
                      style={{
                        background: !offeredByType && buyerId === f.id && !isPaused ? COLORS.amber : "transparent",
                        color: !offeredByType && buyerId === f.id && !isPaused ? COLORS.paper : COLORS.chalkWhite,
                        border: `2px solid ${!offeredByType && buyerId === f.id && !isPaused ? COLORS.amber : COLORS.chalkWhite + "40"}`,
                        borderRadius: "999px",
                        padding: "6px 13px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: isPaused ? "default" : "pointer",
                        opacity: isPaused ? 0.4 : 1,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {isPaused && <NavIcon name="pause" size={11} color={COLORS.chalkWhite} />}
                        {f.isSelf ? "Moi" : f.name}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
              <button
                onClick={() => setOfferedByType(offeredByType === "venue" ? null : "venue")}
                style={{
                  background: offeredByType === "venue" ? COLORS.amber : "transparent",
                  color: offeredByType === "venue" ? COLORS.paper : COLORS.chalkWhite,
                  border: `2px dashed ${offeredByType === "venue" ? COLORS.amber : COLORS.chalkWhite + "40"}`,
                  borderRadius: "999px",
                  padding: "6px 13px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Offert par la maison
              </button>
              <button
                onClick={() => setOfferedByType(offeredByType === "thirdParty" ? null : "thirdParty")}
                style={{
                  background: offeredByType === "thirdParty" ? COLORS.amber : "transparent",
                  color: offeredByType === "thirdParty" ? COLORS.paper : COLORS.chalkWhite,
                  border: `2px dashed ${offeredByType === "thirdParty" ? COLORS.amber : COLORS.chalkWhite + "40"}`,
                  borderRadius: "999px",
                  padding: "6px 13px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Un tiers
              </button>
            </div>
            {offeredByType && (
              <input
                value={offeredByLabel}
                onChange={(e) => setOfferedByLabel(e.target.value)}
                placeholder="Précision (facultatif)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: `2px solid ${COLORS.chalkWhite}40`,
                  background: "transparent",
                  color: COLORS.chalkWhite,
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            )}
            {offeredByType && (
              <p style={{ fontSize: "11px", opacity: 0.65, marginTop: "6px", marginBottom: 0 }}>
                Cette tournée ne comptera dans aucun total d'argent dépensé — juste une trace du geste.
              </p>
            )}
          </div>
        )}

          <div style={{ border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" }}>
              <div style={{ flex: 1, fontSize: "13px", fontWeight: 700, opacity: 0.8 }}>TOTAL COMPTOIR</div>
              <div style={{ width: "28px", textAlign: "center", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "15px", color: COLORS.amber, flexShrink: 0 }}>
                × {draftOrders.length}
              </div>
              <div style={{ width: "58px", flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "18px" }}>
              {Object.entries(tally).map(([id, n]) => {
                const undefinedPrice = undefinedDrinkIds.has(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "15px", fontWeight: 700 }}>
                    <span style={{ flex: 1 }}>
                      {drinkName(id)}
                      {drinkVolume(id) && <span style={{ fontWeight: 800, color: COLORS.amber, fontSize: "13px" }}> {drinkVolume(id)}cl.</span>}
                      {undefinedPrice && (
                        <span style={{ color: COLORS.alert, fontWeight: 700, fontSize: "11px", marginLeft: "8px", fontFamily: "'Work Sans', sans-serif" }}>
                          prix non défini
                        </span>
                      )}
                    </span>
                    <span style={{ width: "28px", textAlign: "center", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.chalkWhite, opacity: 1, fontSize: "13px", flexShrink: 0 }}>
                      × {n}
                    </span>
                    <span style={{ width: "58px", textAlign: "right", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber, flexShrink: 0 }}>
                      {!undefinedPrice && <MoneyAmount value={drinkPrice(id) * n} currency={event.currency} />}
                    </span>
                  </div>
                );
              })}
            </div>

            {isEuro && (
              <>
                {offeredByType ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.amber }}>Offert</span>
                    <span style={{ fontSize: "13px", opacity: 0.65 }}>Rien à payer</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: hasUndefinedPrice ? COLORS.alert : COLORS.amber }}>À payer</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.10"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: "95px",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: `2px solid ${hasUndefinedPrice ? COLORS.alert : COLORS.chalkWhite + "40"}`,
                            background: COLORS.chalkBg,
                            color: hasUndefinedPrice ? COLORS.alert : COLORS.chalkWhite,
                            fontSize: "18px",
                            fontFamily: "'Urbanist', sans-serif",
                            fontWeight: 800,
                            textAlign: "right",
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <button
                            onClick={() => setAmount(((parseFloat(amount) || 0) + 0.1).toFixed(2))}
                            style={{ width: "22px", height: "17px", borderRadius: "5px", border: "none", background: COLORS.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          >
                            <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
                              <NavIcon name="back-triangle" size={9} color={COLORS.paper} />
                            </span>
                          </button>
                          <button
                            onClick={() => setAmount(Math.max(0, (parseFloat(amount) || 0) - 0.1).toFixed(2))}
                            style={{ width: "22px", height: "17px", borderRadius: "5px", border: "none", background: COLORS.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          >
                            <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
                              <NavIcon name="back-triangle" size={9} color={COLORS.paper} />
                            </span>
                          </button>
                        </div>
                        <span style={{ fontSize: "13px", color: COLORS.chalkWhite, opacity: 0.55 }}>€</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "6px", color: hasUndefinedPrice ? COLORS.alert : COLORS.chalkWhite, opacity: hasUndefinedPrice ? 1 : 0.6, fontWeight: hasUndefinedPrice ? 700 : 400 }}>
                      {hasUndefinedPrice ? (
                        "⚠️ Montant incorrect : une ou plusieurs boissons n'ont pas de prix défini ci-dessus. Vérifiez le montant réel avant de valider."
                      ) : (
                        <>
                          {estimatedTotal > 0 && <div>- Pré-rempli avec l'estimation du menu.</div>}
                          <div>- Ajuster avec le montant réel annoncé.</div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {!isEuro && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", fontWeight: 700, color: hasUndefinedPrice ? COLORS.alert : COLORS.amber }}>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px" }}>À payer</span>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}><MoneyAmount value={estimatedTotal} currency={event.currency} /></span>
              </div>
            )}
          </div>


        <div style={{ border: `2px solid ${COLORS.chalkWhite}30`, borderRadius: "12px", padding: "12px 14px", marginBottom: "18px" }}>
          <button
            onClick={() => setShowFriendDetail((s) => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, opacity: 0.8 }}>Détail par participant</span>
            <span style={{ display: "inline-flex", transform: `rotate(${showFriendDetail ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="back-triangle" size={14} color={COLORS.amber} />
            </span>
          </button>

          {showFriendDetail && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              {draftFriends.map((f) => {
                const list = ordersForFriend(f.id);
                if (list.length === 0) return null;
                const counts = {};
                list.forEach((o) => (counts[o.drinkId] = (counts[o.drinkId] || 0) + 1));
                return (
                  <div key={f.id} style={{ borderBottom: `1px dashed ${COLORS.chalkWhite}25`, paddingBottom: "8px" }}>
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "2px" }}>
                      {f.name}
                      {f.isSelf && <span style={{ fontSize: "13px", fontWeight: 500, color: COLORS.inkSoft }}> (vous)</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {Object.entries(counts).map(([id, n]) => (
                        <div key={id} style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "14px", opacity: 0.9 }}>
                          <span style={{ flex: 1 }}>
                            {drinkName(id)}
                            {drinkVolume(id) && <span style={{ color: COLORS.amber, fontWeight: 700 }}> {drinkVolume(id)}cl.</span>}
                          </span>
                          <span style={{ width: "28px", textAlign: "center", fontFamily: "'Urbanist', sans-serif", opacity: 0.7, flexShrink: 0 }}>×{n}</span>
                          <span style={{ width: "58px", textAlign: "right", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.amber, flexShrink: 0 }}>
                            <MoneyAmount value={drinkPrice(id) * n} currency={event.currency} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `2px solid ${COLORS.chalkWhite}30` }}>

          {isEuro ? (
            <div>
              {!isAddition && !offeredByType && (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", marginTop: "12px", cursor: "pointer" }}>
                    <input type="checkbox" checked={!settledDirectly} onChange={(e) => setSettledDirectly(!e.target.checked)} style={{ width: "16px", height: "16px", accentColor: COLORS.amber }} />
                    Je mets cette tournée sur ma note
                  </label>
                  {!settledDirectly && (
                    <p style={{ fontSize: "11px", opacity: 0.55, marginTop: "4px" }}>
                      {isCagnotte
                        ? "Ce montant ne comptera pas encore dans ce que la cagnotte a dépensé — il attend la note finale."
                        : "Ce montant ne comptera pas dans tes tournées déjà réglées — il attend la note finale."}
                    </p>
                  )}
                </>
              )}
              {isAddition && (
                <p style={{ fontSize: "12.5px", marginTop: "10px", opacity: 0.75 }}>
                  Ce montant s'ajoute au total à partager à la fin de la soirée.
                </p>
              )}
              {isCagnotte &&
                (() => {
                  const potTotal = (event.pot?.contributions || []).reduce((sum, c) => sum + c.amount, 0);
                  const alreadySpent = event.rounds.reduce((sum, r) => sum + r.total, 0);
                  const balanceAfter = potTotal - alreadySpent - (settledDirectly ? finalAmount : 0);
                  return (
                    <p style={{ fontSize: "12.5px", marginTop: "10px", color: balanceAfter < 0 ? COLORS.alert : COLORS.chalkWhite, opacity: balanceAfter < 0 ? 1 : 0.75, fontWeight: balanceAfter < 0 ? 700 : 400 }}>
                      {balanceAfter < 0
                        ? `⚠️ La cagnotte n'a plus assez — il manquerait ${formatMoney(Math.abs(balanceAfter), "euro")}.`
                        : `Solde de la cagnotte après cette tournée : ${formatMoney(balanceAfter, "euro")}.`}
                    </p>
                  );
                })()}

              {!isAddition && !offeredByType && settledDirectly && (
                <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px dashed ${COLORS.chalkWhite}30` }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, opacity: 0.8, marginBottom: "8px" }}>POURBOIRE</div>
                  {tipProposals.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                      {tipProposals.map((p) => (
                        <button
                          key={p.target}
                          onClick={() => {
                            setTip(p.tip);
                            setCustomTip(String(p.tip));
                          }}
                          style={{
                            background: Math.abs(tip - p.tip) < 0.005 ? COLORS.amber : "transparent",
                            color: Math.abs(tip - p.tip) < 0.005 ? COLORS.paper : COLORS.chalkWhite,
                            border: `2px solid ${Math.abs(tip - p.tip) < 0.005 ? COLORS.amber : COLORS.chalkWhite + "40"}`,
                            borderRadius: "10px",
                            padding: "7px 11px",
                            cursor: "pointer",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "13px" }}>+{formatMoney(p.tip, "euro")}</div>
                          <div style={{ fontSize: "10px", opacity: 0.75 }}>→ {formatMoney(p.target, "euro")}</div>
                        </button>
                      ))}
                      {tip > 0 && (
                        <button
                          onClick={() => {
                            setTip(0);
                            setCustomTip("");
                          }}
                          style={{ background: "transparent", color: COLORS.chalkWhite, opacity: 0.6, border: "none", fontSize: "12px", cursor: "pointer", padding: "7px 4px" }}
                        >
                          Aucun
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "110px", border: `2px solid ${COLORS.chalkWhite}40`, borderRadius: "8px", padding: "0 10px" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.10"
                        value={customTip}
                        onChange={(e) => {
                          setCustomTip(e.target.value);
                          const parsed = parseFloat(e.target.value.replace(",", "."));
                          setTip(isNaN(parsed) ? 0 : parsed);
                        }}
                        placeholder="Précis"
                        style={{ width: "100%", border: "none", padding: "8px 0", fontSize: "14px", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, outline: "none", background: "transparent", color: COLORS.chalkWhite }}
                      />
                      <span style={{ fontSize: "12.5px", color: COLORS.chalkWhite, opacity: 0.7 }}>€</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <button
                        onClick={() => {
                          const next = ((parseFloat(customTip) || 0) + 0.1).toFixed(2);
                          setCustomTip(next);
                          setTip(parseFloat(next));
                        }}
                        style={{ width: "22px", height: "17px", borderRadius: "5px", border: "none", background: COLORS.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
                          <NavIcon name="back-triangle" size={9} color={COLORS.paper} />
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const next = Math.max(0, (parseFloat(customTip) || 0) - 0.1).toFixed(2);
                          setCustomTip(next);
                          setTip(parseFloat(next));
                        }}
                        style={{ width: "22px", height: "17px", borderRadius: "5px", border: "none", background: COLORS.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>
                          <NavIcon name="back-triangle" size={9} color={COLORS.paper} />
                        </span>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${COLORS.chalkWhite}30` }}>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "28px", color: COLORS.amber }}>
                      TOTAL <span style={{ fontSize: "13px", fontWeight: 500, color: COLORS.chalkWhite, opacity: 0.6 }}>(note + pourboire)</span>
                    </span>
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "24px", fontWeight: 800, color: COLORS.amber }}>
                      <MoneyAmount value={finalAmount + tip} currency="euro" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {hasUndefinedPrice && (
                <p style={{ fontSize: "11px", color: COLORS.alert, fontWeight: 700, marginTop: "6px" }}>
                  ⚠️ Montant incorrect : une ou plusieurs boissons n'ont pas de prix défini. Corrigez-le dans "Gérer les boissons".
                </p>
              )}
              {isCagnotte &&
                (() => {
                  const potTotal = (event.pot?.contributions || []).reduce((sum, c) => sum + c.amount, 0);
                  const alreadySpent = event.rounds.reduce((sum, r) => sum + r.total, 0);
                  const balanceAfter = potTotal - alreadySpent - estimatedTotal;
                  return (
                    <p style={{ fontSize: "12.5px", marginTop: "10px", color: balanceAfter < 0 ? COLORS.alert : COLORS.chalkWhite, opacity: balanceAfter < 0 ? 1 : 0.75, fontWeight: balanceAfter < 0 ? 700 : 400 }}>
                      {balanceAfter < 0
                        ? `⚠️ La cagnotte n'a plus assez — il manquerait ${formatMoney(Math.abs(balanceAfter), "jeton")}.`
                        : `Payée par la cagnotte — il restera ${formatMoney(balanceAfter, "jeton")}.`}
                    </p>
                  );
                })()}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber, textAlign: "center", marginTop: "16px", marginBottom: 0 }}>
        {offeredByType
          ? offeredByType === "venue"
            ? "Offerte par la maison"
            : "Offerte par un tiers"
          : isAddition
          ? "Ajoutée au total"
          : isEuro && !settledDirectly
          ? "Tournée sur la note"
          : isCagnotte
          ? "Payée par la cagnotte"
          : "Tournée payée"}
      </p>
      <PrimaryButton
        onClick={() =>
          onFinish(
            finalAmount,
            isEuro ? settledDirectly : true,
            isCagnotte || isAddition || offeredByType ? null : buyerName,
            isEuro && settledDirectly && !offeredByType ? tip : 0,
            offeredByType ? { type: offeredByType, label: offeredByLabel.trim() } : null
          )
        }
        style={{ marginTop: "6px", width: "100%" }}
      >
        Retour à la session
      </PrimaryButton>
    </div>
  );
}
