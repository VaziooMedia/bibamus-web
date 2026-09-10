// ============================================================
// Fiche détaillée d'un produit — restructurée sur le même
// visuel que la fiche lieu (VenueDetailScreen.jsx) : bandeau
// photo, avatar superposé, titre + certification, favori,
// bouton d'action principal en bas à droite de la photo.
//
// La notation (étoiles) ne se donne/modifie plus ici — comme
// pour un lieu, elle vit désormais entièrement dans le popup de
// check (DrinkCheckInModal) ; cette fiche n'affiche plus que la
// moyenne, sur le bandeau photo.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, BEER_TYPES, DRINK_FIELD_LABELS } from "../constants.js";
import { NavIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { DrinkCheckInModal } from "./DrinkCheckInModal.jsx";
import { drinkTypeLabel, formatDrinkFieldValue } from "../utils.js";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { loadMyDrinkCheckinCount } from "../data/sharedDirectories.js";
import beerCheckIconUrl from "../assets/brand/beer-check-profil.png";

export function DrinkDetailScreen({
  drink,
  drinksDirectory = [],
  venues = [],
  isAdmin,
  myBibroCode,
  myUserId,
  isOnWishlist,
  onToggleWishlist,
  onRate,
  onUnrate,
  onCheckDrink,
  onBack,
  onEdit,
  onCertify,
  onDecertify,
  onDelete,
  pendingContributions = [],
  onApproveContribution,
  onRejectContribution,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [myCheckCount, setMyCheckCount] = useState(null);
  const isBeer = BEER_TYPES.includes(drink.type);

  const ratingValues = Object.values(drink.ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;
  const rawMyRating = drink.ratings && drink.ratings[myBibroCode];
  const myRating = typeof rawMyRating === "number" && isFinite(rawMyRating) ? rawMyRating : null;

  useEffect(() => {
    let cancelled = false;
    loadMyDrinkCheckinCount(drink.id).then((n) => {
      if (!cancelled) setMyCheckCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  const handleCheckConfirmed = async (result) => {
    setShowCheckModal(false);
    if (!result) return;
    setJustChecked(true);
    await onCheckDrink(drink.id, result.venueId, { publishToPulse: result.publishToPulse });
    setMyCheckCount((n) => (n == null ? 1 : n + 1));
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: drink.photoUrl ? `url(${drink.photoUrl}) center/cover` : COLORS.surfaceAlt,
            filter: drink.photoUrl ? "blur(14px)" : "none",
            transform: drink.photoUrl ? "scale(1.1)" : "none",
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "20px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={drink.photoUrl} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{drink.name}</h1>
            {drink.status === "complete" && <VerifiedBadge size={17} />}
          </div>
          {drink.type && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0" }}>{drinkTypeLabel(drink.type)}</p>}
          {(isBeer || drink.type === "Vins & Bulles" || drink.type === "Spiritueux") && !drink.isGeneric && (
            <button
              onClick={() => onToggleWishlist(drink.id)}
              title={isOnWishlist ? "Retirer de ma liste à goûter" : "Ajouter à ma liste à goûter"}
              style={{ position: "absolute", top: "26px", right: "8px", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
            >
              <NavIcon name="star" size={28} color={COLORS.amber} filled={!!isOnWishlist} />
            </button>
          )}
        </div>
        {ratingAverage != null && (
          <div style={{ position: "absolute", bottom: "8px", right: "68px", left: "108px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(8,19,31,0.72)",
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "8px",
                padding: "3px 8px",
              }}
            >
              <StarsDisplay value={ratingAverage} size={13} />
              <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>
                {ratingAverage.toFixed(2).replace(".", ",")} · {ratingValues.length} avis
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowCheckModal(true)}
          title="Check ce produit"
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src={beerCheckIconUrl} alt="Check" style={{ width: "52px", height: "52px", opacity: justChecked ? 0.55 : 1 }} />
        </button>
      </div>

      <div style={{ marginTop: "76px" }}>
        {pendingContributions.length > 0 && (
          <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginBottom: "10px" }}>📝 {pendingContributions.length > 1 ? "Des modifications sont proposées" : "Une modification est proposée"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pendingContributions.map((c) => (
                <div key={c.id} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "12.5px", color: "#F2C94C", marginBottom: isAdmin ? "6px" : 0 }}>
                    <strong>{DRINK_FIELD_LABELS[c.fieldPath] || c.fieldPath}</strong> : {formatDrinkFieldValue(c.fieldPath, c.previousValue)} → {formatDrinkFieldValue(c.fieldPath, c.proposedValue)}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => onApproveContribution(c)}
                        style={{ flex: 1, background: COLORS.sage, border: "none", borderRadius: "6px", padding: "6px", fontWeight: 700, fontSize: "11.5px", color: "#fff", cursor: "pointer" }}
                      >
                        ✓ Accepter
                      </button>
                      <button
                        onClick={() => onRejectContribution(c)}
                        style={{ flex: 1, background: "none", border: "2px solid #5c4a00", borderRadius: "6px", padding: "5px", fontWeight: 700, fontSize: "11.5px", color: "#F2C94C", cursor: "pointer" }}
                      >
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes checks sur ce produit</span>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber, marginTop: "4px" }}>{myCheckCount ?? "—"}</div>
        </div>

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Lieux qui le proposent</span>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <NavIcon name="map-pin" size={26} color={COLORS.paperAlt} />
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
          </div>
        </div>

        {isAdmin && (
          <div style={{ marginTop: "auto", paddingTop: "20px" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>ADMINISTRATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {drink.status !== "complete" ? (
                <button
                  onClick={onCertify}
                  style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}
                >
                  ✓ Certifier cette fiche
                </button>
              ) : (
                <button
                  onClick={onDecertify}
                  style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.ink, cursor: "pointer" }}
                >
                  ↩️ Décertifier cette fiche
                </button>
              )}
              <button
                onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                style={{ background: "none", border: `2px solid ${COLORS.wine}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.wine, cursor: "pointer" }}
              >
                {confirmDelete ? "Confirmer la suppression ?" : "Supprimer du répertoire"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
          <button
            onClick={() => setClaiming(true)}
            style={{
              display: "inline-block",
              background: "none",
              border: `1.5px solid ${COLORS.paperAlt}`,
              borderRadius: "7px",
              padding: "5px 10px",
              color: COLORS.inkSoft,
              fontWeight: 600,
              fontSize: "10px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Revendiquer la gestion de ce produit
          </button>
          <button
            onClick={() => setShowActionsMenu(true)}
            title="Plus d'options"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
          >
            <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
          </button>
        </div>
        {claiming && <ClaimModal entityType="drink" entityId={drink.id} entityName={drink.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

        {showActionsMenu && (
          <div
            onClick={() => setShowActionsMenu(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: "480px" }}
            >
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: COLORS.paperAlt, margin: "0 auto 16px" }} />
              <button
                onClick={() => {
                  setShowActionsMenu(false);
                  onEdit();
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
              >
                <NavIcon name="pencil" size={20} color={COLORS.amber} />
                Suggérer une modification
              </button>
              <button
                onClick={() => {
                  setShowActionsMenu(false);
                  setReportInitialReason("wrong_info");
                  setReporting(true);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
              >
                <ReportIcon />
                Signaler une erreur ou un changement
              </button>
              <button
                onClick={() => {
                  setShowActionsMenu(false);
                  setReportInitialReason(null);
                  setReporting(true);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
              >
                <ReportIcon />
                Signaler cette fiche
              </button>
            </div>
          </div>
        )}
        {reporting && (
          <ReportModal entityType="drink" entityId={drink.id} myBibroCode={myBibroCode} directory={drinksDirectory} initialReason={reportInitialReason} onClose={() => setReporting(false)} />
        )}
        <div style={{ marginTop: "-14px" }}>
          <BackFooterLink onClick={onBack} />
        </div>
      </div>

      {showCheckModal && (
        <DrinkCheckInModal
          drinkName={drink.name}
          venues={venues}
          myRating={myRating}
          onRate={onRate}
          onUnrate={() => onUnrate(drink.id)}
          onClose={handleCheckConfirmed}
        />
      )}
    </div>
  );
}
