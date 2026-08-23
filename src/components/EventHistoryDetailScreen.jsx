// ============================================================
// Fiche détaillée d'un événement passé (historique) — copiée
// telle quelle depuis le prototype Claude. Contrairement au
// tableau de bord d'un événement actif, celle-ci est en lecture
// (avec réouverture et suppression possibles).
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, BackFooterLink, MoneyAmount } from "./ui.jsx";
import { formatDate, formatTime, formatDuration, formatMoney, kcalForDrink } from "../utils.js";

export function EventHistoryDetailScreen({ event, venues, displayTotal, roundsSum, onBack, openVenue, onReopen, onDelete, onDeleteRound }) {
  const venue = event.venueId ? venues.find((v) => v.id === event.venueId) : null;
  const isOpenBar = event.mode === "openbar";
  const isCagnotte = event.mode === "cagnotte";
  const isAddition = event.mode === "addition";
  const [expandedRoundIds, setExpandedRoundIds] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteRoundId, setConfirmDeleteRoundId] = useState(null);
  const toggleRoundExpanded = (id) =>
    setExpandedRoundIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const attendees = [];
  const seen = new Set();
  event.rounds.forEach((r) =>
    r.friends.forEach((f) => {
      const key = f.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        attendees.push(f.name);
      }
    })
  );

  const caloriesInfo = event.personalOrders.reduce(
    (acc, order) => {
      const drink = event.menu.find((d) => d.id === order.drinkId);
      const kcal = drink ? kcalForDrink(drink) : null;
      if (kcal != null) acc.total += kcal;
      else acc.missing += 1;
      return acc;
    },
    { total: 0, missing: 0 }
  );

  const drinkName = (id) => event.menu.find((d) => d.id === id)?.name || id;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>
        {event.date ? formatDate(event.date).toUpperCase() : "ÉVÉNEMENT"}
      </span>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "4px 0 6px 0", lineHeight: 1 }}>{event.name}</h1>
      {event.closed ? (
        <button
          onClick={onReopen}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "12px" }}
        >
          Terminé · réouvrir cet événement
        </button>
      ) : (
        <div style={{ fontSize: "12.5px", color: COLORS.sage, fontWeight: 600, marginBottom: "12px" }}>En cours</div>
      )}
      {(event.createdAt || event.closedAt) && (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "-8px", marginBottom: "16px" }}>
          {event.createdAt && `Débutée à ${formatTime(event.createdAt)}`}
          {event.closedAt && ` · Terminée à ${formatTime(event.closedAt)}`}
          {event.createdAt && event.closedAt && formatDuration(event.createdAt, event.closedAt) && ` · ${formatDuration(event.createdAt, event.closedAt)}`}
        </p>
      )}
      {venue && (
        <button
          onClick={() => openVenue(venue.id)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "16px" }}
        >
          📖 {venue.name}
        </button>
      )}

      <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px", marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.55 }}>TOTAL DÉPENSÉ</div>
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "38px", color: COLORS.amber, lineHeight: 1.3 }}><MoneyAmount value={displayTotal} currency={event.currency} /></div>
        {event.currency === "euro" && event.finalTotal != null && Math.abs(displayTotal - roundsSum) > 0.01 && (
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", opacity: 0.7 }}>Tournées suivies : <MoneyAmount value={roundsSum} currency={event.currency} /></div>
        )}
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", opacity: 0.7, marginTop: "6px" }}>
          {event.rounds.length} tournée{event.rounds.length !== 1 ? "s" : ""} · {attendees.length} personne{attendees.length !== 1 ? "s" : ""}
        </div>
      </div>

      {isAddition && event.splitParticipants && event.splitParticipants.length > 0 && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px", textAlign: "center" }}>
            Addition partagée{event.tip > 0 && ` (dont ${formatMoney(event.tip, "euro")} de pourboire)`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {event.splitParticipants.map((p) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>{p.name}</span>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, color: COLORS.amberDark }}>{formatMoney(p.amount, "euro")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(event.personalOrders.length > 0 || caloriesInfo.total > 0) && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Mes verres ce jour-là</div>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px" }}>{event.personalOrders.length}</div>
          {caloriesInfo.total > 0 && (
            <div style={{ fontSize: "12px", color: COLORS.inkSoft }}>
              ≈ {caloriesInfo.total} kcal{caloriesInfo.missing > 0 && ` (${caloriesInfo.missing} sans info)`}
            </div>
          )}
        </div>
      )}

      {attendees.length > 0 && (
        <>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
            QUI ÉTAIT LÀ
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
            {attendees.map((name) => (
              <span
                key={name}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "999px", padding: "6px 12px", fontSize: "13px", fontWeight: 600 }}
              >
                {name}
              </span>
            ))}
          </div>
        </>
      )}

      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        DÉTAIL DES TOURNÉES
      </div>
      {event.rounds.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune tournée enregistrée.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...event.rounds].reverse().map((r, i) => {
            const counts = {};
            r.orders.forEach((o) => (counts[o.drinkId] = (counts[o.drinkId] || 0) + 1));
            const expanded = expandedRoundIds.has(r.id);
            return (
              <div key={r.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    <strong>Tournée {event.rounds.length - i}</strong>
                    {r.offeredBy && (
                      <span style={{ color: COLORS.inkSoft }}> · {r.offeredBy.type === "venue" ? "offerte par la maison" : "offerte par un tiers"}</span>
                    )}
                    {!r.offeredBy && r.buyerName && <span style={{ color: COLORS.inkSoft }}> · offerte par {r.buyerName}</span>}
                    {!r.offeredBy && r.paidByPot && <span style={{ color: COLORS.inkSoft }}> · payée par la cagnotte</span>}
                    {!r.offeredBy && !r.buyerName && !r.paidByPot && <span style={{ color: COLORS.inkSoft }}> · Free</span>}
                  </span>
                  {!isOpenBar && (
                    <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, color: r.offeredBy ? COLORS.sage : isAddition || r.settledDirectly === false ? COLORS.wine : COLORS.sage }}>
                      <MoneyAmount value={r.total} currency={event.currency} />
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  <button
                    onClick={() => toggleRoundExpanded(r.id)}
                    style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    {expanded ? "Cacher le détail" : "Voir le détail"}
                  </button>
                  {onDeleteRound && (
                    <button
                      onClick={() => (confirmDeleteRoundId === r.id ? onDeleteRound(r.id) : setConfirmDeleteRoundId(r.id))}
                      style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0, marginLeft: "auto" }}
                    >
                      {confirmDeleteRoundId === r.id ? "Confirmer ?" : "Supprimer"}
                    </button>
                  )}
                </div>
                {expanded && (
                  <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
                    {r.friends.map((f) => (
                      <div key={f.id} style={{ fontSize: "13px", color: COLORS.inkSoft, padding: "2px 0" }}>
                        {f.name}
                      </div>
                    ))}
                    <div style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "6px" }}>
                      {Object.entries(counts).map(([id, n]) => `${drinkName(id)}${n > 1 ? ` ×${n}` : ""}`).join(" · ")}
                    </div>
                    {event.currency === "euro" && !isOpenBar && !r.offeredBy && (
                      <div style={{ fontSize: "11px", color: isAddition || r.settledDirectly === false ? COLORS.wine : COLORS.sage, fontWeight: 600, marginTop: "6px" }}>
                        {isAddition ? "En attente du partage" : r.settledDirectly === false ? "Sur la note" : "Réglée directement"}
                      </div>
                    )}
                    {r.offeredBy && r.offeredBy.label && (
                      <p style={{ fontSize: "12px", color: COLORS.ink, fontStyle: "italic", marginTop: "6px" }}>"{r.offeredBy.label}"</p>
                    )}
                    {r.offeredBy && (
                      <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "6px" }}>Montant informatif — ne compte dans aucun total d'argent dépensé.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
        {confirmDelete && (
          <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "10px", fontWeight: 600 }}>
            ⚠️ Les statistiques liées à cet événement{venue ? ` (visites, boissons, argent dépensé de ${venue.name})` : ""} seront aussi supprimées. Cette action est irréversible.
          </p>
        )}
        <button
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          style={{ background: "none", border: `2px solid ${COLORS.wine}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.wine, cursor: "pointer", width: "100%" }}
        >
          {confirmDelete ? "Confirmer la suppression" : "Supprimer cet événement"}
        </button>
      </div>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
