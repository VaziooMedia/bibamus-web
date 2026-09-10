// ============================================================
// Fiche détaillée d'un produit — restructurée sur le même
// visuel que la fiche lieu (VenueDetailScreen.jsx) : bandeau
// photo, avatar superposé, titre + certification, favori,
// bouton d'action principal en bas à droite de la photo.
// Le système de notation 5 étoiles (StarRating) reste inchangé,
// tel qu'il existait avant cette refonte.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, BEER_TYPES, DRINK_FIELD_LABELS, RATABLE_DRINK_TYPES, SERVING_MODE_LABELS, VOLUME_DISPLAY_TYPES } from "../constants.js";
import { NavIcon, VerifiedBadge, TokenPinkIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { PhotoUploadField } from "./PhotoUploadField.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { StarRating } from "./StarRating.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { DrinkCheckInModal } from "./DrinkCheckInModal.jsx";
import { drinkTypeLabel, formatDrinkFieldValue } from "../utils.js";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { loadMyDrinkCheckinCount } from "../data/sharedDirectories.js";
import drinkCheckIconUrl from "../assets/brand/drink-check.svg";

export function DrinkDetailScreen({
  drink,
  drinksDirectory = [],
  venues = [],
  isAdmin,
  myBibroCode,
  myUserId,
  isTasted,
  onToggleTasted,
  isOnWishlist,
  onToggleWishlist,
  onRate,
  onUnrate,
  onToggleMode,
  onCheckDrink,
  onBack,
  onEdit,
  onCertify,
  onDecertify,
  onDelete,
  pendingContributions = [],
  onApproveContribution,
  onRejectContribution,
  onOpenTagFilter,
  onUploadPhoto,
  onDeletePhoto,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [myCheckCount, setMyCheckCount] = useState(null);
  const isBeer = BEER_TYPES.includes(drink.type);
  const isLockedForMe = !isAdmin && drink.status === "complete";

  const ratingValues = Object.values(drink.ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;

  useEffect(() => {
    let cancelled = false;
    loadMyDrinkCheckinCount(drink.id).then((n) => {
      if (!cancelled) setMyCheckCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [drink.id]);

  const handlePhotoUpload = async (file) => {
    setUploadingPhoto(true);
    await onUploadPhoto(file);
    setUploadingPhoto(false);
  };

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
          <img src={drinkCheckIconUrl} alt="Check" style={{ width: "52px", height: "52px", opacity: justChecked ? 0.55 : 1 }} />
        </button>
      </div>

      <div style={{ marginTop: "76px" }}>
        <PhotoUploadField photoUrl={drink.photoUrl} onUpload={handlePhotoUpload} onDelete={onDeletePhoto} uploading={uploadingPhoto} label="" />

        {drink.status === "to_process" && (
          <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: COLORS.inkSoft }}>
            En attente de validation par un administrateur — les informations n'ont pas encore été vérifiées.
          </div>
        )}

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

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          <DrinkBadges drink={drink} onTagClick={onOpenTagFilter} size={12} />
        </div>

        {RATABLE_DRINK_TYPES.includes(drink.type) && !drink.isGeneric && (
          <StarRating
            ratings={drink.ratings}
            ratingDates={drink.ratingDates}
            ratedServingModes={drink.ratedServingModes}
            myBibroCode={myBibroCode}
            isBeer={BEER_TYPES.includes(drink.type)}
            onRate={(v) => onRate(v)}
            onUnrate={() => onUnrate(drink.id)}
            onToggleMode={(mode) => onToggleMode(mode)}
          />
        )}

        {isBeer && (
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => onToggleTasted(drink.id)}
              style={{
                background: isTasted ? COLORS.amber : COLORS.surface,
                border: `2px solid ${isTasted ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "12px 16px",
                cursor: "pointer",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 700,
                fontSize: "13.5px",
                color: isTasted ? COLORS.paper : COLORS.ink,
              }}
            >
              {isTasted ? "✓ Déjà goûtée" : "○ Pas encore goûtée"}
            </button>
          </div>
        )}

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Caractéristiques</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drink.type && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Type</span>
                <span style={{ fontWeight: 600 }}>{drinkTypeLabel(drink.type)}</span>
              </div>
            )}
            {drink.abv != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Degré d'alcool</span>
                <span style={{ fontWeight: 600 }}>{drink.abv.toFixed(1)}% ABV</span>
              </div>
            )}
            {drink.brand && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Marque</span>
                <span style={{ fontWeight: 600 }}>{drink.brand}</span>
              </div>
            )}
            {drink.brewery && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Producteur</span>
                <span style={{ fontWeight: 600 }}>{drink.brewery}</span>
              </div>
            )}
            {drink.nationality && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Pays d'origine</span>
                <span style={{ fontWeight: 600 }}>{drink.nationality}</span>
              </div>
            )}
            {drink.volumeCl != null && VOLUME_DISPLAY_TYPES.includes(drink.type) && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Volume par défaut</span>
                <span style={{ fontWeight: 600 }}>{String(drink.volumeCl).replace(".", ",")} cl.</span>
              </div>
            )}
            {drink.servingMode && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Type de service par défaut</span>
                <span style={{ fontWeight: 600 }}>{SERVING_MODE_LABELS[drink.servingMode] || drink.servingMode}</span>
              </div>
            )}
            {drink.kcalPer100ml != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Kcal / 100ml</span>
                <span style={{ fontWeight: 600 }}>{drink.kcalPer100ml}</span>
              </div>
            )}
            {drink.snackType && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Type de produit</span>
                <span style={{ fontWeight: 600 }}>{drink.snackType}</span>
              </div>
            )}
            {drink.weightG != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Poids</span>
                <span style={{ fontWeight: 600 }}>{drink.weightG} g.</span>
              </div>
            )}
            {drink.isGeneric && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Produit générique</span>
                <span style={{ fontWeight: 600 }}>Oui</span>
              </div>
            )}
            {drink.isGeneric && drink.averagePrice != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Prix indicatif</span>
                <span style={{ fontWeight: 600 }}>{String(drink.averagePrice).replace(".", ",")} €</span>
              </div>
            )}
            {drink.isGeneric && drink.averageJetonValue != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Valeur en jetons</span>
                <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  {drink.averageJetonValue} <TokenPinkIcon size={14} />
                </span>
              </div>
            )}
          </div>
          {drink.beerTags && drink.beerTags.length > 0 && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>STYLE & CARACTÉRISTIQUES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {drink.beerTags.map((tag) => (
                  <span key={tag} style={{ background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {drink.description && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
              <p style={{ fontSize: "13.5px", color: COLORS.ink, lineHeight: 1.5, margin: 0 }}>{drink.description}</p>
            </div>
          )}
        </div>

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Événements</span>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <NavIcon name="calendar" size={26} color={COLORS.paperAlt} />
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
          </div>
        </div>

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Médias</span>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <NavIcon name="camera" size={26} color={COLORS.paperAlt} />
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
          </div>
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

        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes checks sur ce produit</span>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber, marginTop: "4px" }}>{myCheckCount ?? "—"}</div>
        </div>

        <button
          onClick={onEdit}
          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontWeight: 600, fontSize: "13.5px", color: COLORS.ink, cursor: "pointer", marginBottom: "16px" }}
        >
          {isLockedForMe ? "📝 Suggérer une modification" : "✏️ Modifier cette fiche"}
        </button>
        {isLockedForMe && (
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "-10px", marginBottom: "16px" }}>
            Ce produit est certifié — tes changements seront soumis à validation plutôt qu'appliqués directement.
          </p>
        )}

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
        <button
          onClick={() => setReporting(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "14px 0 0 0", textAlign: "left" }}
        >
          <ReportIcon /> Signaler cette fiche
        </button>
        {reporting && <ReportModal entityType="drink" entityId={drink.id} myBibroCode={myBibroCode} directory={drinksDirectory} onClose={() => setReporting(false)} />}
        <button
          onClick={() => setClaiming(true)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "10px 0 0 0", textAlign: "left" }}
        >
          Ce produit vous appartient ? Revendiquez cette fiche
        </button>
        {claiming && <ClaimModal entityType="drink" entityId={drink.id} entityName={drink.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}
        <BackFooterLink onClick={onBack} />
      </div>

      {showCheckModal && <DrinkCheckInModal drinkName={drink.name} venues={venues} onClose={handleCheckConfirmed} />}
    </div>
  );
}
