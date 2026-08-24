// ============================================================
// Fiche détaillée d'un produit — copiée telle quelle depuis
// le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, BEER_TYPES, DRINK_FIELD_LABELS, RATABLE_DRINK_TYPES, SERVING_MODE_LABELS, VOLUME_DISPLAY_TYPES } from "../constants.js";
import { NavIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { PhotoUploadField } from "./PhotoUploadField.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { StarRating } from "./StarRating.jsx";
import { drinkTypeLabel, formatDrinkFieldValue } from "../utils.js";

export function DrinkDetailScreen({ drink, isAdmin, myBibroCode, isTasted, onToggleTasted, isOnWishlist, onToggleWishlist, onRate, onUnrate, onToggleMode, onBack, onEdit, onCertify, onDecertify, onDelete, onAcceptEdit, onRejectEdit, onOpenTagFilter, onUploadPhoto, onDeletePhoto }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const isBeer = BEER_TYPES.includes(drink.type);
  const isLockedForMe = !isAdmin && drink.status === "certified";
  const pendingEdit = drink.pendingEdit;

  const handlePhotoUpload = async (file) => {
    setUploadingPhoto(true);
    await onUploadPhoto(file);
    setUploadingPhoto(false);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <PhotoUploadField photoUrl={drink.photoUrl} onUpload={handlePhotoUpload} onDelete={onDeletePhoto} uploading={uploadingPhoto} label="" />

      {drink.status === "pending" && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: COLORS.inkSoft }}>
          En attente de validation par un administrateur — les informations n'ont pas encore été vérifiées.
        </div>
      )}

      {pendingEdit && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginBottom: "8px" }}>📝 Une modification est proposée</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: isAdmin ? "12px" : 0 }}>
            {Object.entries(pendingEdit.fields).map(([field, value]) => (
              <div key={field} style={{ fontSize: "12.5px", color: "#F2C94C" }}>
                <strong>{DRINK_FIELD_LABELS[field]}</strong> : {formatDrinkFieldValue(field, drink[field])} → {formatDrinkFieldValue(field, value)}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => onAcceptEdit(drink.id)}
                style={{ flex: 1, background: COLORS.sage, border: "none", borderRadius: "8px", padding: "9px", fontWeight: 700, fontSize: "12.5px", color: "#fff", cursor: "pointer" }}
              >
                ✓ Accepter
              </button>
              <button
                onClick={() => onRejectEdit(drink.id)}
                style={{ flex: 1, background: "none", border: "2px solid #5c4a00", borderRadius: "8px", padding: "9px", fontWeight: 700, fontSize: "12.5px", color: "#F2C94C", cursor: "pointer" }}
              >
                ✕ Refuser
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: 0, lineHeight: 1, flex: 1, minWidth: 0 }}>{drink.name}</h1>
        {drink.status === "certified" && <VerifiedBadge size={22} />}
      </div>
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
          onRate={(v) => onRate(drink.id, v)}
          onUnrate={() => onUnrate(drink.id)}
          onToggleMode={(mode) => onToggleMode(drink.id, mode)}
        />
      )}

      {isBeer && (
        <div style={{ marginBottom: "10px" }}>
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

      {(() => {
        const wishlistEligibleType = isBeer || drink.type === "Vins & bulles" || drink.type === "Spiritueux";
        if (!wishlistEligibleType || drink.isGeneric) return null;
        // Already tasted (beers) or already rated (wines/spirits) means "à goûter" no longer applies.
        const alreadyEngaged = isBeer ? isTasted : drink.ratings && drink.ratings[myBibroCode] != null;
        if (alreadyEngaged) return null;
        return (
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => onToggleWishlist(drink.id)}
              style={{
                background: isOnWishlist ? COLORS.amber : COLORS.surface,
                border: `2px solid ${isOnWishlist ? COLORS.amber : COLORS.paperAlt}`,
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
                color: isOnWishlist ? COLORS.paper : COLORS.ink,
              }}
            >
              {isOnWishlist ? "🎯 Présente dans ma liste à goûter" : "+ Ajouter à ma liste à goûter"}
            </button>
          </div>
        );
      })()}


      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
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
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                {drink.averageJetonValue} <NavIcon name="jeton" size={14} color={COLORS.jetonFluo} />
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
            {drink.status !== "certified" ? (
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
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
