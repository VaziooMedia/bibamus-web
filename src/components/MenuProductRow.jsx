// ============================================================
// Ligne d'un produit dans la Carte boissons d'un événement (BibaRoom / Produits), version simplifiée :
//   1ʳᵉ ligne : rond-profil du produit + nom + prix (modifiable)
//   2ᵉ ligne  : flèche de déroulement + croix de suppression
//   déroulé   : volume (texte libre, clavier numérique) + type de service ; pour un spiritueux, le choix Spiritueux / Shot.
//               Rien d'autre.
// DrinkRow (plus complète) reste utilisée par le répertoire de produits et par le formulaire de carte d'un lieu.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { SERVING_MODE_OPTIONS, safeServingMode, sanitizeDecimalText, parsePositiveText } from "../utils.js";

// Même présentation que la fenêtre « Ajouter à la carte » de BibAtlas (Nouvelle tournée) : champ étroit pour le volume, valeur centrée.
const VOLUME_BLOCK_W = 84;
const fieldLabelStyle = { fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, display: "block", marginBottom: "6px", whiteSpace: "nowrap" };
const fieldStyle = { width: "100%", height: "46px", boxSizing: "border-box", padding: "0 10px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" };
const smallButtonStyle = { display: "flex", alignItems: "center", justifyContent: "center", minWidth: "40px", height: "32px", background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: 0 };

export function MenuProductRow({ drink, priceStep, priceSymbol, onChangePrice, onChangeVolume, onChangeServingMode, onChangeMenuCategory, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  // Textes saisis gardés tels quels dans l'état local : sinon une virgule tapée en dernier serait effacée dès qu'elle est relue comme nombre.
  const [priceInput, setPriceInput] = useState(() => String(drink.price ?? "").replace(".", ","));
  const [volumeInput, setVolumeInput] = useState(() => (drink.volumeCl != null ? String(drink.volumeCl).replace(".", ",") : ""));
  const isSpirit = drink.type === "Spiritueux";
  const isShot = drink.menuCategory === "Shots";

  return (
    <div data-menu-row="1" style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 12px" }}>
      {/* 1ʳᵉ ligne : rond-profil + nom + prix */}
      <div data-menu-row-line="1" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <EntityAvatar photoUrl={drink.photoUrl} photoEmoji={drink.avatarEmoji} size={36} fallbackIcon="bottle" />
        <div
          data-menu-row-name="1"
          style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "14.5px", color: COLORS.ink, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {drink.name}
        </div>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Prix de ${drink.name}`}
          value={priceInput}
          onChange={(e) => {
            const raw = e.target.value;
            setPriceInput(raw);
            const parsed = parseFloat(raw.replace(",", "."));
            onChangePrice(isNaN(parsed) ? 0 : parsed);
          }}
          style={{ width: "60px", padding: "8px 8px", borderRadius: "8px 0 0 8px", border: `2px solid ${COLORS.paperAlt}`, borderRight: "none", fontSize: "14px", textAlign: "right", fontFamily: "'Urbanist', sans-serif", flexShrink: 0 }}
        />
        <div style={{ display: "flex", flexDirection: "column", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "0 8px 8px 0", flexShrink: 0, marginLeft: "-10px" }}>
          <button
            onClick={() => {
              const current = parseFloat(priceInput.replace(",", ".")) || 0;
              const next = Math.round((current + parseFloat(priceStep)) * 100) / 100;
              setPriceInput(String(next).replace(".", ","));
              onChangePrice(next);
            }}
            style={{ background: "none", border: "none", borderBottom: `1px solid ${COLORS.paperAlt}`, cursor: "pointer", padding: "1px 5px", fontSize: "9px", lineHeight: 1.4, color: COLORS.inkSoft }}
            aria-label="Augmenter le prix"
          >
            ▲
          </button>
          <button
            onClick={() => {
              const current = parseFloat(priceInput.replace(",", ".")) || 0;
              const next = Math.max(0, Math.round((current - parseFloat(priceStep)) * 100) / 100);
              setPriceInput(String(next).replace(".", ","));
              onChangePrice(next);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "1px 5px", fontSize: "9px", lineHeight: 1.4, color: COLORS.inkSoft }}
            aria-label="Diminuer le prix"
          >
            ▼
          </button>
        </div>
        <span style={{ fontSize: "13px", color: COLORS.inkSoft, minWidth: "16px", flexShrink: 0, display: "flex", alignItems: "center" }}>{priceSymbol}</span>
      </div>

      {/* 2ᵉ ligne : flèche de déroulement (à gauche) + croix de suppression (à droite) */}
      <div data-menu-row-line="2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <button onClick={() => setExpanded((s) => !s)} style={{ ...smallButtonStyle, fontSize: "12px" }} aria-label="Détails" aria-expanded={expanded}>
          {expanded ? "▲" : "▾"}
        </button>
        <button onClick={onRemove} style={{ ...smallButtonStyle, fontSize: "18px" }} aria-label={`Supprimer ${drink.name}`}>
          ×
        </button>
      </div>

      {expanded && (
        <div data-menu-row-details="1" style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "6px", paddingTop: "12px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <div style={{ flex: `0 0 ${VOLUME_BLOCK_W}px`, minWidth: 0 }}>
              <label htmlFor={`menu-volume-${drink.id}`} style={fieldLabelStyle}>
                Volume (cl.)
              </label>
              <input
                id={`menu-volume-${drink.id}`}
                type="text"
                inputMode="decimal"
                value={volumeInput}
                onChange={(e) => {
                  const text = sanitizeDecimalText(e.target.value, 6);
                  setVolumeInput(text);
                  onChangeVolume(parsePositiveText(text));
                }}
                placeholder="00"
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor={`menu-service-${drink.id}`} style={fieldLabelStyle}>
                Type de service
              </label>
              <select
                id={`menu-service-${drink.id}`}
                value={safeServingMode(drink.servingMode)}
                onChange={(e) => onChangeServingMode(e.target.value)}
                style={{ ...fieldStyle, textAlign: "left", padding: "0 8px" }}
              >
                <option value="">Non défini</option>
                {SERVING_MODE_OPTIONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isSpirit && (
            <div data-menu-row-spirit="1" style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "Spiritueux", active: !isShot, value: "" },
                { label: "Shot", active: isShot, value: "Shots" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onChangeMenuCategory(opt.value)}
                  aria-pressed={opt.active}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: `2px solid ${opt.active ? COLORS.ink : COLORS.paperAlt}`,
                    background: opt.active ? COLORS.amber : COLORS.surface,
                    color: opt.active ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
