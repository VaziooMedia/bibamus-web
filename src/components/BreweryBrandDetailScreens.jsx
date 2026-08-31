// ============================================================
// Fiches détaillées d'une brasserie/producteur et d'une marque
// — copiées telles quelles depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, BREWERY_FIELD_LABELS, BRAND_FIELD_LABELS } from "../constants.js";
import { VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { drinkSummaryLine } from "../utils.js";

export function BreweryDetailScreen({ brewery, drinks, isAdmin, onBack, onOpenDrink, onRename, onEditCountry, onSuggestEdit, pendingContributions = [], onApproveContribution, onRejectContribution, onCertify, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(brewery.name || "");
  const [countryValue, setCountryValue] = useState(brewery.country || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isLocked = !isAdmin && brewery.status === "complete";

  const relatedDrinks = drinks.filter((d) => d.brewery && d.brewery.toLowerCase() === brewery.name.toLowerCase());

  const submitEdit = () => {
    if (isLocked) {
      onSuggestEdit(nameValue, countryValue);
    } else {
      onRename(nameValue);
      onEditCountry(countryValue);
    }
    setEditing(false);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      {pendingContributions.length > 0 && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginBottom: "10px" }}>📝 {pendingContributions.length > 1 ? "Des modifications sont proposées" : "Une modification est proposée"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingContributions.map((c) => (
              <div key={c.id} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "12.5px", color: "#F2C94C", marginBottom: isAdmin ? "6px" : 0 }}>
                  <strong>{BREWERY_FIELD_LABELS[c.fieldPath] || c.fieldPath}</strong> : {c.previousValue || "—"} → {c.proposedValue || "—"}
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: 0, lineHeight: 1 }}>{brewery.name}</h1>
        {brewery.country && <span style={{ fontSize: "16px", fontWeight: 500, color: COLORS.inkSoft }}>{brewery.country}</span>}
        {brewery.status === "complete" && <VerifiedBadge size={22} />}
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {isLocked && <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: 0 }}>Certifiée — tes changements seront soumis à validation.</p>}
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Nom"
            style={{ padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={countryValue}
              onChange={(e) => setCountryValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEdit()}
              placeholder="Pays d'origine"
              style={{ flex: 1, padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
            />
            <button onClick={submitEdit} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}>
              {isLocked ? "Suggérer" : "OK"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "20px" }}
        >
          {isLocked ? "📝 Suggérer une modification" : "✏️ Modifier"}
        </button>
      )}

      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        SES PRODUITS ({relatedDrinks.length})
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "8px" }}>Touchez une boisson pour la corriger, la peaufiner ou la certifier.</p>
      {relatedDrinks.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "20px" }}>
          Aucune boisson de cette brasserie enregistrée pour l'instant.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {relatedDrinks.map((d) => (
            <button
              key={d.id}
              onClick={() => onOpenDrink(d.id)}
              style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {d.name}
                {d.status === "complete" && <VerifiedBadge size={13} />}
                {d.status === "to_process" && <span style={{ fontSize: "10px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                <DrinkBadges drink={d} />
              </div>
              {drinkSummaryLine(d) && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{drinkSummaryLine(d)}</div>}
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: "auto", paddingTop: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {brewery.status !== "complete" && (
              <button
                onClick={onCertify}
                style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}
              >
                ✓ Certifier cette brasserie
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

export function BrandDetailScreen({ brand, drinks, isAdmin, onBack, onOpenDrink, onRename, onSuggestEdit, pendingContributions = [], onApproveContribution, onRejectContribution, onCertify, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(brand.name || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isLocked = !isAdmin && brand.status === "complete";

  const relatedDrinks = drinks.filter((d) => d.brand && d.brand.toLowerCase() === brand.name.toLowerCase());

  const submitEdit = () => {
    if (isLocked) {
      onSuggestEdit(nameValue);
    } else {
      onRename(nameValue);
    }
    setEditing(false);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      {pendingContributions.length > 0 && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#F2C94C", marginBottom: "10px" }}>📝 {pendingContributions.length > 1 ? "Des modifications sont proposées" : "Une modification est proposée"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingContributions.map((c) => (
              <div key={c.id} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "12.5px", color: "#F2C94C", marginBottom: isAdmin ? "6px" : 0 }}>
                  <strong>{BRAND_FIELD_LABELS[c.fieldPath] || c.fieldPath}</strong> : {c.previousValue || "—"} → {c.proposedValue || "—"}
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: 0, lineHeight: 1 }}>{brand.name}</h1>
        {brand.status === "complete" && <VerifiedBadge size={22} />}
      </div>

      {editing ? (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEdit()}
            placeholder="Nom"
            autoFocus
            style={{ flex: 1, padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <button onClick={submitEdit} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}>
            {isLocked ? "Suggérer" : "OK"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "20px" }}
        >
          {isLocked ? "📝 Suggérer une modification" : "✏️ Modifier"}
        </button>
      )}

      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        SES PRODUITS ({relatedDrinks.length})
      </div>
      <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "-4px", marginBottom: "8px" }}>Touchez une boisson pour la corriger, la peaufiner ou la certifier.</p>
      {relatedDrinks.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "20px" }}>
          Aucune boisson de cette marque enregistrée pour l'instant.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {relatedDrinks.map((d) => (
            <button
              key={d.id}
              onClick={() => onOpenDrink(d.id)}
              style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {d.name}
                {d.status === "complete" && <VerifiedBadge size={13} />}
                {d.status === "to_process" && <span style={{ fontSize: "10px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                <DrinkBadges drink={d} />
              </div>
              {drinkSummaryLine(d) && <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>{drinkSummaryLine(d)}</div>}
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: "auto", paddingTop: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {brand.status !== "complete" && (
              <button
                onClick={onCertify}
                style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer" }}
              >
                ✓ Certifier cette marque
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
