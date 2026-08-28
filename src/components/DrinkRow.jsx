// ============================================================
// Ligne éditable d'un produit dans une carte boissons (nom,
// prix, ABV, brasserie...) — copiée telle quelle depuis le
// prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, BEER_STYLE_TAGS, BEER_TYPES, DRINK_VOLUMES_CL, MENU_CATEGORIES, SERVING_MODE_LABELS, SOFT_DRINK_TAGS, SPIRIT_TAGS, VOLUME_DISPLAY_TYPES, WINE_TAGS } from "../constants.js";
import { BrewerySearchSelect } from "./BrewerySearchSelect.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { capitalizeFirst, drinkTypeLabel, kcalForDrink } from "../utils.js";

export function DrinkRow({
  drink,
  priceStep,
  priceSymbol,
  onChangeName,
  onChangePrice,
  onChangeType,
  onChangeVolume,
  onChangeKcal,
  onChangeServingMode,
  onToggleBeerTag,
  onChangeAbv,
  onChangeBrewery,
  onChangeMenuCategory,
  onRemove,
  breweriesDirectory,
  onRegisterBrewery,
  forceLocked,
}) {
  const [expanded, setExpanded] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  // Local string state, not derived from drink.price/drink.abv on every render — otherwise typing
  // a trailing "," or "." gets silently wiped the instant it's parsed back into a plain number.
  const [priceInput, setPriceInput] = useState(() => String(drink.price ?? "").replace(".", ","));
  const [abvInput, setAbvInput] = useState(() => (drink.abv != null ? String(drink.abv).replace(".", ",") : ""));
  const locked = !!drink.fromDirectory || !!forceLocked;
  const isBeer = BEER_TYPES.includes(drink.type);
  const isSoft = drink.type === "Softs & Eaux";
  const isSpirit = drink.type === "Spiritueux";
  const isWine = drink.type === "Vins & Bulles";
  const hasStyleTags = isBeer || isSoft || isSpirit || isWine;
  const styleTagOptions = isBeer ? BEER_STYLE_TAGS : isSoft ? SOFT_DRINK_TAGS : isSpirit ? SPIRIT_TAGS : isWine ? WINE_TAGS : [];
  const beerTags = drink.beerTags || [];
  const kcalTotal = kcalForDrink(drink);
  // In a forced-lock context (event/session menu), the product is meant to stay generic — only
  // ABV is worth showing at a glance; type/producer/kcal are visible in the expanded detail if
  // needed, but not cluttering the summary line.
  const summaryBits = forceLocked
    ? [drink.abv != null ? `${drink.abv.toFixed(1)}% ABV` : null].filter(Boolean)
    : [
        drink.type ? drinkTypeLabel(drink.type) : null,
        drink.abv != null ? `${drink.abv.toFixed(1)}% ABV` : null,
        drink.servingMode ? SERVING_MODE_LABELS[drink.servingMode] : null,
        beerTags.length ? beerTags.join(", ") : null,
        drink.brewery || null,
        kcalTotal ? `≈ ${kcalTotal} kcal` : null,
      ].filter(Boolean);

  const selectStyle = {
    padding: "8px 10px",
    borderRadius: "8px",
    border: `2px solid ${COLORS.paperAlt}`,
    fontSize: "13px",
    background: COLORS.surface,
    color: COLORS.ink,
    fontFamily: "'Work Sans', sans-serif",
    width: "100%",
  };

  const fieldLabelStyle = { fontSize: "11px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px", display: "block" };
  const requiredMark = <span style={{ color: COLORS.wine }}> *</span>;
  const lockedValueStyle = { fontSize: "13.5px", color: COLORS.ink, padding: "8px 0" };

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {locked ? (
          <div style={{ flex: 1, minWidth: 0, padding: "2px 0" }}>
            <div style={{ fontWeight: 600, fontSize: "14.5px", color: COLORS.ink, display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>{drink.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginTop: "2px" }}>
              {drink.volumeCl && VOLUME_DISPLAY_TYPES.includes(drink.type) && (
                <span style={{ fontSize: "12px", color: COLORS.ink, fontFamily: "'Urbanist', sans-serif", fontWeight: 800 }}>{drink.volumeCl}cl.</span>
              )}
              {isBeer && drink.servingMode && (
                <span style={{ fontSize: "11px", color: COLORS.inkSoft, display: "flex", alignItems: "center", gap: "5px", fontWeight: 500 }}>
                  {drink.volumeCl && <span style={{ fontSize: "4px" }}>●</span>}
                  {SERVING_MODE_LABELS[drink.servingMode]}
                </span>
              )}
              <DrinkBadges drink={drink} size={10} />
            </div>
          </div>
        ) : (
          <>
            <input
              value={drink.name}
              onChange={(e) => onChangeName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => {
                setNameFocused(false);
                if (drink.name) onChangeName(capitalizeFirst(drink.name));
              }}
              style={{
                flex: 1,
                minWidth: 0,
                fontWeight: 600,
                fontSize: "14.5px",
                border: "none",
                borderBottom: `2px solid ${nameFocused ? COLORS.amber : "transparent"}`,
                outline: "none",
                padding: "2px 0",
                fontFamily: "'Work Sans', sans-serif",
                color: COLORS.ink,
                background: "transparent",
              }}
            />
            {drink.volumeCl && VOLUME_DISPLAY_TYPES.includes(drink.type) && (
              <span style={{ fontSize: "12px", color: COLORS.ink, fontFamily: "'Urbanist', sans-serif", fontWeight: 800, flexShrink: 0 }}>{drink.volumeCl}cl.</span>
            )}
            {isBeer && drink.servingMode && (
              <span style={{ fontSize: "11px", color: COLORS.inkSoft, flexShrink: 0, display: "flex", alignItems: "center", gap: "5px" }}>
                {drink.volumeCl && <span style={{ fontSize: "4px" }}>●</span>}
                {SERVING_MODE_LABELS[drink.servingMode]}
              </span>
            )}
          </>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => {
            const raw = e.target.value;
            setPriceInput(raw);
            const parsed = parseFloat(raw.replace(",", "."));
            onChangePrice(isNaN(parsed) ? 0 : parsed);
          }}
          style={{ width: "60px", padding: "8px 8px", borderRadius: "8px 0 0 8px", border: `2px solid ${COLORS.paperAlt}`, borderRight: "none", fontSize: "14px", textAlign: "right", fontFamily: "'Urbanist', sans-serif" }}
        />
        <div style={{ display: "flex", flexDirection: "column", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "0 8px 8px 0" }}>
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
        <span style={{ fontSize: "13px", color: COLORS.inkSoft, minWidth: "16px", marginLeft: "4px" }}>{priceSymbol}</span>
        <button
          onClick={() => setExpanded((s) => !s)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", cursor: "pointer", padding: "4px" }}
          aria-label="Détails"
        >
          {expanded ? "▲" : "▾"}
        </button>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", cursor: "pointer", padding: "0 2px" }} aria-label={`Supprimer ${drink.name}`}>
          ×
        </button>
      </div>

      {!expanded && summaryBits.length > 0 && (
        <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px" }}>{summaryBits.join(" · ")}</div>
      )}

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
          {locked && (
            <div style={{ fontSize: "11.5px", fontWeight: 700, color: COLORS.amberDark, display: "flex", alignItems: "center", gap: "5px" }}>
              📚 Depuis le répertoire — seuls le prix, le volume et le mode de service se modifient ici.
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>Type de boisson</label>
            {locked ? (
              <div style={lockedValueStyle}>{drink.type ? drinkTypeLabel(drink.type) : "—"}</div>
            ) : (
              <select value={drink.type || ""} onChange={(e) => onChangeType(e.target.value)} style={selectStyle}>
                <option value="">Non défini</option>
                {MENU_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {drinkTypeLabel(t)}
                  </option>
                ))}
              </select>
            )}
            {locked && drink.type === "Spiritueux" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => onChangeMenuCategory("")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: `2px solid ${!drink.menuCategory ? COLORS.ink : COLORS.paperAlt}`,
                    background: !drink.menuCategory ? COLORS.amber : COLORS.surface,
                    color: !drink.menuCategory ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  Spiritueux
                </button>
                <button
                  onClick={() => onChangeMenuCategory("Shots")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: `2px solid ${drink.menuCategory === "Shots" ? COLORS.ink : COLORS.paperAlt}`,
                    background: drink.menuCategory === "Shots" ? COLORS.amber : COLORS.surface,
                    color: drink.menuCategory === "Shots" ? COLORS.paper : COLORS.ink,
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  Shot
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={fieldLabelStyle}>
              Volume{(isBeer || isSoft) && requiredMark}
            </label>
            <select value={drink.volumeCl || ""} onChange={(e) => onChangeVolume(e.target.value ? parseFloat(e.target.value) : null)} style={selectStyle}>
              <option value="">Non défini</option>
              {DRINK_VOLUMES_CL.map((v) => (
                <option key={v} value={v}>
                  {String(v).replace(".", ",")} cl.
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Degré d'alcool (% ABV)</label>
            {locked ? (
              <div style={lockedValueStyle}>{drink.abv != null ? `${drink.abv.toFixed(1)}% ABV` : "—"}</div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={abvInput}
                placeholder="Ex. 6.5"
                onChange={(e) => {
                  const raw = e.target.value;
                  setAbvInput(raw);
                  const normalized = raw.replace(",", ".");
                  onChangeAbv(normalized ? parseFloat(normalized) : null);
                }}
                style={{ ...selectStyle, textAlign: "left" }}
              />
            )}
          </div>

          {isBeer && (
            <div>
              <label style={fieldLabelStyle}>
                Type de service{requiredMark}
              </label>
              <select value={drink.servingMode || ""} onChange={(e) => onChangeServingMode(e.target.value)} style={selectStyle}>
                <option value="">Non défini</option>
                {Object.entries(SERVING_MODE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>Producteur</label>
            {locked ? (
              <div style={lockedValueStyle}>{drink.brewery || "—"}</div>
            ) : (
              <BrewerySearchSelect
                value={drink.brewery || ""}
                onChange={onChangeBrewery}
                breweries={breweriesDirectory || []}
                onRegister={onRegisterBrewery}
              />
            )}
          </div>

          <div>
            <label style={fieldLabelStyle}>Kcal / 100ml</label>
            {locked ? (
              <div style={lockedValueStyle}>{drink.kcalPer100ml != null ? drink.kcalPer100ml : "—"}</div>
            ) : (
              <input
                type="number"
                min="0"
                value={drink.kcalPer100ml != null ? drink.kcalPer100ml : ""}
                placeholder="Ex. 42"
                onChange={(e) => onChangeKcal(e.target.value ? parseFloat(e.target.value) : null)}
                style={{ ...selectStyle, textAlign: "left" }}
              />
            )}
          </div>

          {kcalTotal != null && <div style={{ fontSize: "12px", color: COLORS.amberDark, fontWeight: 700 }}>≈ {kcalTotal} kcal pour ce verre (recalculé selon le volume)</div>}

          {hasStyleTags && (
            <div>
              <label style={fieldLabelStyle}>
                Style & caractéristiques{!locked && requiredMark} (plusieurs choix possibles)
              </label>
              {locked ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {beerTags.length === 0 ? (
                    <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>—</span>
                  ) : (
                    beerTags.map((tag) => (
                      <span key={tag} style={{ padding: "5px 10px", borderRadius: "999px", background: COLORS.paperAlt, color: COLORS.inkSoft, fontSize: "12px", fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {styleTagOptions.map((tag) => {
                    const active = beerTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => onToggleBeerTag(tag)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "999px",
                          border: `1.5px solid ${active ? COLORS.amber : COLORS.paperAlt}`,
                          background: active ? COLORS.amber : COLORS.surface,
                          color: active ? COLORS.paper : COLORS.inkSoft,
                          fontSize: "12px",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
