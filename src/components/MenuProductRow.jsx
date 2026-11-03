// ============================================================
// Ligne d'un produit dans la Carte boissons d'un événement (BibaRoom / Produits), version simplifiée — sans cadre propre :
// c'est le bloc qui la contient (catégorie, « Tous les produits ajoutés », résultats de recherche) qui la cadre, et un trait fin la sépare des autres lignes.
//   1ʳᵉ ligne : rond-profil du produit + nom + croix de suppression (tout à droite)
//   2ᵉ ligne  : flèche de déroulement (vert fluo, à gauche) + prix modifiable (à droite) ; le cadre du prix est rose fluo tant que le prix
//               n'a pas été vérifié/adapté (c'est peut-être un prix par défaut, à contrôler), vert fluo ensuite (`drink.priceChecked`).
//   déroulé   : dans un « tiroir » creusé (fond plus sombre, sans trait) : volume (texte libre, clavier numérique) + type de
//               service ; pour un spiritueux, le choix Spiritueux / Shot. Rien d'autre.
// DrinkRow (plus complète) reste utilisée par le répertoire de produits.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { SERVING_MODE_OPTIONS, safeServingMode, sanitizeDecimalText, parsePositiveText } from "../utils.js";

// Même présentation que la fenêtre « Ajouter à la carte » de BibAtlas (Nouvelle tournée) : champ étroit pour le volume, valeur centrée.
const VOLUME_BLOCK_W = 92;
// Le type de service n'a pas besoin de toute la largeur : un bloc étroit, resté à l'extrême droite du tiroir (il rétrécit un peu si l'écran est très étroit).
const SERVICE_BLOCK_W = 136;
// Champ du déroulé : le titre (bandeau grisé) et le champ ne forment qu'un seul bloc arrondi — le titre en est le haut.
const titleStyle = { background: COLORS.paperAlt, color: COLORS.ink, fontSize: "11.5px", fontWeight: 600, lineHeight: 1.3, padding: "3px 8px", textAlign: "center", whiteSpace: "nowrap" };
function FusedField({ title, htmlFor, width, shrink = false, focused, onFocus, onBlur, children }) {
  return (
    <div
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ flex: `0 ${shrink ? 1 : 0} ${width}px`, minWidth: 0, display: "flex", flexDirection: "column", borderRadius: "12px", border: `2px solid ${focused ? COLORS.amber : COLORS.paperAlt}`, background: COLORS.surface, overflow: "hidden", transition: "border-color 0.15s ease" }}
    >
      <label htmlFor={htmlFor} style={titleStyle}>
        {title}
      </label>
      {children}
    </div>
  );
}
const fieldStyle = { width: "100%", height: "40px", boxSizing: "border-box", padding: "0 10px", borderRadius: 0, border: "none", background: "transparent", color: COLORS.ink, fontSize: "14px", textAlign: "center", outline: "none" };
const smallButtonStyle = { display: "flex", alignItems: "center", justifyContent: "center", minWidth: "40px", height: "36px", background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer", padding: 0 };

// Chevron dessiné en traits (pointe vers la droite) ; `turn` le fait pivoter : 90 = vers le bas, -90 = vers le haut.
function Chevron({ size, color, turn = 0, stroke = 2.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ display: "block", transform: `rotate(${turn}deg)`, transition: "transform 0.15s ease", flexShrink: 0 }}>
      <path d="M7 3.5 L13.5 10 L7 16.5" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Bouton ▲ / ▼ du prix : moitié de la hauteur du champ, chevron vert fluo.
const stepButtonStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" };

export function MenuProductRow({ drink, priceStep, priceSymbol, onChangePrice, onChangeVolume, onChangeServingMode, onChangeMenuCategory, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  // Textes saisis gardés tels quels dans l'état local : sinon une virgule tapée en dernier serait effacée dès qu'elle est relue comme nombre.
  const [priceInput, setPriceInput] = useState(() => String(drink.price ?? "").replace(".", ","));
  const [volumeInput, setVolumeInput] = useState(() => (drink.volumeCl != null ? String(drink.volumeCl).replace(".", ",") : ""));
  const isSpirit = drink.type === "Spiritueux";
  const isShot = drink.menuCategory === "Shots";
  // Cadre du prix : rose fluo tant que le prix n'a pas été vérifié/adapté, vert fluo une fois que c'est fait. Il ne change pas au simple
  // toucher du champ (un prix encore à contrôler ne doit pas passer au vert sans que rien n'ait été modifié).
  const priceFrameColor = drink.priceChecked ? COLORS.amber : COLORS.pinkFluo;

  return (
    <div data-menu-row="1" style={{ padding: "10px 0" }}>
      {/* 1ʳᵉ ligne : rond-profil + nom + croix de suppression (tout à droite, dans le coin) */}
      <div data-menu-row-line="1" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <EntityAvatar photoUrl={drink.photoUrl} photoEmoji={drink.avatarEmoji} size={36} fallbackIcon="bottle" />
        <div
          data-menu-row-name="1"
          style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "14.5px", color: COLORS.ink, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {drink.name}
        </div>
        <button
          onClick={onRemove}
          style={{ ...smallButtonStyle, minWidth: "30px", width: "30px", height: "30px", justifyContent: "flex-end", alignSelf: "flex-start", marginTop: "-6px", fontSize: "18px" }}
          aria-label={`Supprimer ${drink.name}`}
        >
          ×
        </button>
      </div>

      {/* 2ᵉ ligne : flèche de déroulement (à gauche, vert fluo) + prix (à droite) */}
      <div data-menu-row-line="2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "6px" }}>
        {/* Flèche de dépliage : vers la droite quand c'est replié, vers le bas quand c'est déplié ; centrée sous le rond-profil */}
        <button onClick={() => setExpanded((s) => !s)} style={{ ...smallButtonStyle, minWidth: "36px", width: "36px", height: "44px" }} aria-label="Détails" aria-expanded={expanded}>
          <Chevron size={22} color={COLORS.amber} turn={expanded ? 90 : 0} />
        </button>
        {/* Prix : un seul champ arrondi — montant + symbole, puis les deux flèches empilées à droite */}
        <div
          data-menu-price="1"
          style={{ display: "flex", alignItems: "stretch", height: "44px", flexShrink: 0, borderRadius: "12px", border: `2px solid ${priceFrameColor}`, background: COLORS.surfaceAlt, overflow: "hidden", transition: "border-color 0.15s ease" }}
        >
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
            style={{ width: "50px", minWidth: 0, padding: "0 0 0 8px", border: "none", background: "transparent", outline: "none", fontSize: "15px", fontWeight: 700, textAlign: "right", fontFamily: "'Urbanist', sans-serif", color: COLORS.ink }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "22px", padding: "0 3px 0 2px", fontSize: "13px", color: COLORS.inkSoft }}>{priceSymbol}</span>
          <div style={{ display: "flex", flexDirection: "column", width: "30px", borderLeft: `2px solid ${COLORS.paperAlt}` }}>
            <button
              onClick={() => {
                const current = parseFloat(priceInput.replace(",", ".")) || 0;
                const next = Math.round((current + parseFloat(priceStep)) * 100) / 100;
                setPriceInput(String(next).replace(".", ","));
                onChangePrice(next);
              }}
              style={{ ...stepButtonStyle, borderBottom: `1px solid ${COLORS.paperAlt}` }}
              aria-label="Augmenter le prix"
            >
              <Chevron size={14} color={COLORS.amber} turn={-90} stroke={3} />
            </button>
            <button
              onClick={() => {
                const current = parseFloat(priceInput.replace(",", ".")) || 0;
                const next = Math.max(0, Math.round((current - parseFloat(priceStep)) * 100) / 100);
                setPriceInput(String(next).replace(".", ","));
                onChangePrice(next);
              }}
              style={stepButtonStyle}
              aria-label="Diminuer le prix"
            >
              <Chevron size={14} color={COLORS.amber} turn={90} stroke={3} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div data-menu-row-details="1" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", padding: "12px", borderRadius: "12px", background: COLORS.paper }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
            <FusedField title="Volume (cl.)" htmlFor={`menu-volume-${drink.id}`} width={VOLUME_BLOCK_W} focused={focusedField === "volume"} onFocus={() => setFocusedField("volume")} onBlur={() => setFocusedField(null)}>
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
            </FusedField>
            <FusedField title="Type de service" htmlFor={`menu-service-${drink.id}`} width={SERVICE_BLOCK_W} shrink focused={focusedField === "service"} onFocus={() => setFocusedField("service")} onBlur={() => setFocusedField(null)}>
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
            </FusedField>
          </div>

          {isSpirit && (
            <div data-menu-row-spirit="1" style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", width: "max-content", gap: "8px" }}>
              {[
                { label: "Spiritueux", active: !isShot, value: "" },
                { label: "Shot", active: isShot, value: "Shots" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onChangeMenuCategory(opt.value)}
                  aria-pressed={opt.active}
                  style={{
                    padding: "4px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${opt.active ? COLORS.ink : COLORS.paperAlt}`,
                    background: opt.active ? COLORS.amber : COLORS.surface,
                    color: opt.active ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "11.5px",
                    lineHeight: 1.3,
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
