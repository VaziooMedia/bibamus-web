// ============================================================
// Écran "Drink Check" — réutilisé depuis un salon comme depuis BibaSolo. Liste
// les vrais produits déjà consommés (drinkIds, résolus par l'appelant — chaque
// contexte a sa propre vraie façon de les calculer), pour en choisir un à noter.
// "Déjà noté" s'affiche si une vraie note existe déjà (drink.ratings[myBibroCode]).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { DrinkCheckInModal } from "./DrinkCheckInModal.jsx";
import { loadDrinksByIds } from "../data/sharedDirectories.js";

// onCheckDrink (facultatif) : quand il est fourni, la fenêtre de check est la même que sur les fiches
// produit et depuis l'accueil — avec photo, commentaire, visibilité, Bibax tagués — et la confirmation
// publie la carte dans BibaPulse. Sans lui, l'écran garde son comportement d'origine (note seule).
export function DrinkCheckScreen({ drinkIds, presetVenue = null, myBibroCode, onBack, onRateDrink, onUnrateDrink, onCheckDrink = null }) {
  const [drinks, setDrinks] = useState(null);
  const [checking, setChecking] = useState(null);

  useEffect(() => {
    const uniqueIds = [...new Set(drinkIds || [])];
    if (uniqueIds.length === 0) {
      setDrinks([]);
      return;
    }
    loadDrinksByIds(uniqueIds).then(setDrinks);
  }, [drinkIds]);

  const ratingFor = (drink) => {
    const raw = drink.ratings && drink.ratings[myBibroCode];
    return typeof raw === "number" && isFinite(raw) ? raw : null;
  };

  const refreshOne = (drinkId, patch) => {
    setDrinks((prev) => prev.map((d) => (d.id === drinkId ? { ...d, ...patch } : d)));
  };

  // Fermeture de la fenêtre de check : result = null si elle a été fermée sans confirmer, sinon
  // { publishToPulse, venueId, visibility, content } — comme sur la fiche produit.
  const handleCheckClosed = async (result) => {
    const drink = checking;
    setChecking(null);
    if (!result || !onCheckDrink) return;
    const pulseResult = await onCheckDrink(drink.id, result.venueId, {
      publishToPulse: result.publishToPulse,
      visibility: result.visibility,
      content: result.content,
    });
    // La note est enregistrée ; seule la publication dans BibaPulse a échoué.
    if (pulseResult && pulseResult.error) {
      alert("Ton check est enregistré, mais sa publication dans BibaPulse a échoué : " + pulseResult.error);
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>
          Drink<span style={{ color: COLORS.amber }}>Check</span>
        </h1>
      </div>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>Choisis un produit que tu as consommé pour le noter.</p>

      {drinks === null ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : drinks.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun produit du répertoire consommé pour l'instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {drinks.map((d) => {
            const already = ratingFor(d) != null;
            return (
              <button
                key={d.id}
                onClick={() => setChecking(d)}
                style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
              >
                <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={36} fallbackIcon="bottle" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  {already && (
                    <span data-already-rated="1" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: COLORS.amber, fontWeight: 600 }}>
                      <NavIcon name="check" size={12} color={COLORS.amber} />
                      Déjà noté
                    </span>
                  )}
                </span>
                <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
              </button>
            );
          })}
        </div>
      )}

      {checking && (
        <DrinkCheckInModal
          drinkName={checking.name}
          drinkPhotoUrl={checking.photoUrl}
          drinkEmoji={checking.avatarEmoji}
          drinkType={checking.type}
          myRating={ratingFor(checking)}
          presetVenue={presetVenue}
          enableContent={!!onCheckDrink}
          onRate={(value) => {
            // Avec le check complet, la fenêtre publie elle-même UNE carte : la note ne doit pas en publier une de plus.
            onRateDrink(checking.id, value, checking, { skipDiscoveryPulse: !!onCheckDrink });
            refreshOne(checking.id, { ratings: { ...(checking.ratings || {}), [myBibroCode]: value } });
          }}
          onUnrate={() => {
            onUnrateDrink(checking.id, checking);
            const ratings = { ...(checking.ratings || {}) };
            delete ratings[myBibroCode];
            refreshOne(checking.id, { ratings });
          }}
          onClose={handleCheckClosed}
        />
      )}

      <BackFooterLink onClick={onBack} />
    </div>
  );
}
