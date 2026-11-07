// ============================================================
// Une ligne de « Ajouter une boisson hors tournée » (tableau de bord d'un salon) : un produit de la carte à un volume, avec son « − », son
// compteur et son « + ». Une bière dont la fiche a des dérivés (Mazout, Tango…) reçoit en plus la rangée de pastilles de BibaRoom / BibaSolo /
// @Home (BeerDerivativePills) : grise inactive, rose fluo active, aucune active au départ (= la bière telle quelle), second appui = désactivée.
// Comme dans la carte de commande de BibaRoom, le compteur, le « + » et le « − » suivent la pastille active (volume + dérivé) ; le dérivé ne
// vaut que pour le verre ajouté, la pastille se désactive juste après. Une ligne « Dans la commande : 2 nature · 1 Mazout » résume les verres.
// Définie hors du tableau de bord : sinon React remonterait la ligne à chaque rendu du parent et la pastille choisie serait perdue.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { BeerDerivativePills } from "./BeerDerivativePills.jsx";
import { drinkIdWithVariant } from "../beerDerivatives.js";
import { volumeUnit } from "../utils.js";

export function PersonalDrinkRow({ drink, derivatives = [], countFor, totalCount, paused, onAdd, onRemove }) {
  const [variantCode, setVariantCode] = useState(null);
  // Un dérivé n'est actif que s'il fait partie de ceux proposés pour ce produit.
  const activeVariant = derivatives.some((d) => d.code === variantCode) ? variantCode : null;
  const orderId = drinkIdWithVariant(drink.id, activeVariant);
  const count = countFor(orderId);
  const choices = derivatives.length > 0 ? [{ code: null, name: "Nature" }, ...derivatives].map((c) => ({ ...c, n: countFor(drinkIdWithVariant(drink.id, c.code)) })) : [];
  const shownTotal = derivatives.length > 0 ? totalCount : count;

  return (
    <div style={{ background: shownTotal > 0 ? COLORS.paperAlt : "transparent", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "8px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
          {drink.name}
          {drink.volumeCl && <span style={{ color: COLORS.amber, fontWeight: 700 }}> {drink.volumeCl}{volumeUnit(drink.type)}</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => onRemove(orderId)}
            disabled={count === 0}
            aria-label={`Retirer un verre : ${drink.name}`}
            style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: COLORS.surface, fontSize: "13px", fontWeight: 700, cursor: count === 0 ? "default" : "pointer" }}
          >
            −
          </button>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", minWidth: "12px", textAlign: "center" }}>{count}</span>
          <button
            onClick={() => {
              if (paused) return;
              onAdd(orderId);
              // Le dérivé ne vaut que pour le verre ajouté : le verre suivant est « nature » sauf nouveau choix.
              setVariantCode(null);
            }}
            disabled={paused}
            aria-label={`Ajouter un verre : ${drink.name}`}
            style={{ width: "22px", height: "22px", borderRadius: "6px", border: "none", background: paused ? COLORS.paperAlt : COLORS.amber, fontSize: "13px", fontWeight: 700, cursor: paused ? "default" : "pointer", color: paused ? COLORS.inkSoft : COLORS.paper }}
          >
            +
          </button>
        </div>
      </div>
      {derivatives.length > 0 && (
        <>
          <BeerDerivativePills derivatives={derivatives} activeCode={activeVariant} onChange={setVariantCode} style={{ marginTop: "6px" }} />
          {totalCount > 0 && (
            <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "4px" }}>
              Dans la commande :{" "}
              {choices
                .filter((c) => c.n > 0)
                .map((c, i) => (
                  <React.Fragment key={c.code || "nature"}>
                    {i > 0 && " · "}
                    <strong style={{ color: COLORS.ink }}>
                      {c.n} {c.code ? c.name : "nature"}
                    </strong>
                  </React.Fragment>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
