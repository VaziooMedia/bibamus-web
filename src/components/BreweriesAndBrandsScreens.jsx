// ============================================================
// Écrans "Brasseries & Producteurs" et "Marques" — copiés tels
// quels depuis le prototype Claude (classement par pays,
// fusion de doublons, création à la volée).
// ============================================================
import React, { useState } from "react";
import { COLORS, COUNTRY_FLAGS } from "../constants.js";
import { NavIcon, FlagIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton } from "./ui.jsx";
import { normalizeForSearch } from "../utils.js";

export function BreweriesAdminScreen({ breweries, isAdmin, onBack, onOpenBrewery, onRename, onSetCountry, onSuggestEdit, onCreate, onCertify, onDelete, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [activeCountry, setActiveCountry] = useState(null);
  const [query, setQuery] = useState("");

  const countryOf = (b) => b.country || "Non renseigné";
  const countries = Array.from(new Set(breweries.map(countryOf))).sort((a, b) => a.localeCompare(b));
  const skipCountryLevel = countries.length <= 1;
  const effectiveCountry = skipCountryLevel ? countries[0] : activeCountry;

  const sortedIn = (country) => breweries.filter((b) => countryOf(b) === country).sort((a, b) => a.name.localeCompare(b.name));
  const countFor = (country) => breweries.filter((b) => countryOf(b) === country).length;

  const q = normalizeForSearch(query.trim());
  const searching = q.length > 0;
  const searchResultsAll = searching ? breweries.filter((b) => normalizeForSearch(b.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const searchResultsInCountry = searching && effectiveCountry ? sortedIn(effectiveCountry).filter((b) => normalizeForSearch(b.name).includes(q)) : [];

  const goToCountry = (country) => {
    setQuery("");
    setActiveCountry(country);
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditCountry(b.country || "");
  };

  const submitEdit = (id, isLocked) => {
    if (isLocked) {
      onSuggestEdit(id, editName, editCountry);
    } else {
      onRename(id, editName);
      onSetCountry(id, editCountry);
    }
    setEditingId(null);
  };

  const [duplicateNotice, setDuplicateNotice] = useState(null);

  const submitCreate = () => {
    if (!newName.trim() || !newCountry.trim()) return;
    const canonicalName = onCreate(newName.trim(), newCountry.trim());
    if (canonicalName && canonicalName !== newName.trim()) {
      setDuplicateNotice(canonicalName);
    } else {
      setDuplicateNotice(null);
    }
    setCreating(false);
    setNewName("");
    setNewCountry("");
  };

  const startCreating = () => {
    setNewCountry(effectiveCountry && effectiveCountry !== "Non renseigné" ? effectiveCountry : "");
    setNewName("");
    setCreating(true);
  };

  const handleBack = () => {
    if (!skipCountryLevel && activeCountry) {
      setQuery("");
      return setActiveCountry(null);
    }
    return onBack();
  };

  const renderBreweryRow = (b) => {
    const isLocked = !isAdmin && b.status === "certified";
    return (
      <div key={b.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px" }}>
        {editingId === b.id ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {isLocked && <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: 0 }}>Certifié — ton changement sera soumis à validation.</p>}
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEdit(b.id, isLocked)}
              placeholder="Nom"
              autoFocus
              style={{ padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEdit(b.id, isLocked)}
                placeholder="Pays d'origine"
                style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none" }}
              />
              <button
                onClick={() => submitEdit(b.id, isLocked)}
                style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}
              >
                {isLocked ? "Suggérer" : "OK"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => onOpenBrewery(b.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14.5px", color: COLORS.ink }}>{b.name}</span>
                {b.status === "certified" && <VerifiedBadge size={14} />}
                {b.status === "pending" && <span style={{ fontSize: "10px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
                {b.pendingEdit && <span style={{ fontSize: "12px" }} title="Une modification est proposée">📝</span>}
              </div>
            </button>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button onClick={() => startEdit(b)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title={isLocked ? "Suggérer une modification" : "Éditer"} aria-label={isLocked ? "Suggérer une modification" : "Éditer"}>
                <NavIcon name="pencil" size={15} color={COLORS.redFluo} />
              </button>
              {isAdmin && b.status !== "certified" && (
                <button onClick={() => onCertify(b.id)} style={{ background: "none", border: "none", color: COLORS.sage, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  Certifier
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => (confirmDeleteId === b.id ? onDelete(b.id) : setConfirmDeleteId(b.id))}
                  style={{ background: "none", border: "none", color: COLORS.redFluo, fontSize: "16px", cursor: "pointer", padding: 0 }}
                >
                  {confirmDeleteId === b.id ? "?" : "×"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={handleBack} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>
            {!skipCountryLevel && activeCountry ? activeCountry : "Brasseries & Producteurs"}
          </h1>
        </div>
        <button onClick={onRefresh} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} title="Actualiser" aria-label="Actualiser">
          <NavIcon name="refresh" size={18} color={COLORS.redFluo} />
        </button>
      </div>

      {creating ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700, marginBottom: "8px" }}>Nouveau producteur</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom"
            autoFocus
            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none", marginBottom: "8px" }}
          />
          <input
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCreate()}
            placeholder="Pays d'origine"
            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none", marginBottom: "10px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCreating(false)}
              style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, fontSize: "13px", cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              onClick={submitCreate}
              disabled={!newName.trim() || !newCountry.trim()}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "8px",
                border: "none",
                background: newName.trim() && newCountry.trim() ? COLORS.amber : COLORS.paperAlt,
                color: COLORS.ink,
                fontWeight: 700,
                fontSize: "13px",
                cursor: newName.trim() && newCountry.trim() ? "pointer" : "not-allowed",
              }}
            >
              Créer
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <button
            onClick={startCreating}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Créer un producteur"
            aria-label="Créer un producteur"
          >
            +
          </button>
        </div>
      )}
      {duplicateNotice && (
        <p style={{ fontSize: "12.5px", color: COLORS.wine, fontWeight: 700, marginTop: "-8px", marginBottom: "16px" }}>
          "{duplicateNotice}" existait déjà dans le répertoire — aucun doublon créé.
        </p>
      )}

      {breweries.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune brasserie enregistrée pour l'instant.</p>}

      {!skipCountryLevel && !activeCountry ? (
        <>
          {breweries.length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un producteur"
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px" }}
            />
          )}
          {searching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {searchResultsAll.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur trouvé.</p>
              ) : (
                searchResultsAll.map(renderBreweryRow)
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {countries.map((country) => (
                <button
                  key={country}
                  onClick={() => goToCountry(country)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "14.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {COUNTRY_FLAGS[country] ? <FlagIcon flag={COUNTRY_FLAGS[country]} size={16} /> : <span>🌍</span>}
                    {country}
                  </span>
                  <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(country)} →</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {sortedIn(effectiveCountry || "").length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher dans ${effectiveCountry}`}
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {effectiveCountry &&
              (searching ? (
                searchResultsInCountry.length === 0 ? (
                  <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur trouvé dans ce pays.</p>
                ) : (
                  searchResultsInCountry.map(renderBreweryRow)
                )
              ) : (
                sortedIn(effectiveCountry).map(renderBreweryRow)
              ))}
          </div>
        </>
      )}

      {(!skipCountryLevel && !activeCountry) || (skipCountryLevel && breweries.length > 6) || (!skipCountryLevel && activeCountry) ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={startCreating}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Créer un producteur"
            aria-label="Créer un producteur"
          >
            +
          </button>
        </div>
      ) : null}

      {((!skipCountryLevel && activeCountry) || (skipCountryLevel && breweries.length > 6) || (!skipCountryLevel && !activeCountry && breweries.length > 6)) && <ScrollToTopButton />}
      <BackFooterLink onClick={onBack} />
    </div>
  );
}

export function BrandsAdminScreen({ brands, drinks, isAdmin, onBack, onOpenBrand, onRename, onSuggestEdit, onCreate, onCertify, onDelete, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [activeCountry, setActiveCountry] = useState(null);

  // Brands don't carry their own country field (a product's own nationality already covers that —
  // no need to duplicate it). So a brand's "country" here is derived from whichever nationality its
  // linked products most commonly use, falling back to "Non renseigné" if none is set yet.
  const countryOf = (b) => {
    const linked = drinks.filter((d) => d.brand === b.name && d.nationality);
    if (linked.length === 0) return "Non renseigné";
    const counts = {};
    linked.forEach((d) => (counts[d.nationality] = (counts[d.nationality] || 0) + 1));
    return Object.entries(counts).sort((a, b2) => b2[1] - a[1])[0][0];
  };

  const countries = Array.from(new Set(brands.map(countryOf))).sort((a, b) => a.localeCompare(b));
  const skipCountryLevel = countries.length <= 1;
  const effectiveCountry = skipCountryLevel ? countries[0] : activeCountry;

  const sortedIn = (country) => brands.filter((b) => countryOf(b) === country).sort((a, b) => a.name.localeCompare(b.name));
  const countFor = (country) => brands.filter((b) => countryOf(b) === country).length;

  const q = normalizeForSearch(query.trim());
  const searching = q.length > 0;
  const searchResultsAll = searching ? brands.filter((b) => normalizeForSearch(b.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const searchResultsInCountry = searching && effectiveCountry ? sortedIn(effectiveCountry).filter((b) => normalizeForSearch(b.name).includes(q)) : [];

  const goToCountry = (country) => {
    setQuery("");
    setActiveCountry(country);
  };

  const handleBack = () => {
    if (!skipCountryLevel && activeCountry) {
      setQuery("");
      return setActiveCountry(null);
    }
    return onBack();
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditName(b.name);
  };

  const submitEdit = (id, isLocked) => {
    if (isLocked) {
      onSuggestEdit(id, editName);
    } else {
      onRename(id, editName);
    }
    setEditingId(null);
  };

  const [duplicateNotice, setDuplicateNotice] = useState(null);

  const submitCreate = () => {
    if (!newName.trim()) return;
    const canonicalName = onCreate(newName.trim());
    if (canonicalName && canonicalName !== newName.trim()) {
      setDuplicateNotice(canonicalName);
    } else {
      setDuplicateNotice(null);
    }
    setCreating(false);
    setNewName("");
  };

  const renderBrandRow = (b) => {
    const isLocked = !isAdmin && b.status === "certified";
    return (
      <div key={b.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px" }}>
        {editingId === b.id ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEdit(b.id, isLocked)}
              placeholder="Nom"
              autoFocus
              style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none" }}
            />
            <button
              onClick={() => submitEdit(b.id, isLocked)}
              style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}
            >
              {isLocked ? "Suggérer" : "OK"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => onOpenBrand(b.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "14.5px", color: COLORS.ink }}>{b.name}</span>
                {b.status === "certified" && <VerifiedBadge size={14} />}
                {b.status === "pending" && <span style={{ fontSize: "10px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
                {b.pendingEdit && <span style={{ fontSize: "12px" }} title="Une modification est proposée">📝</span>}
              </div>
            </button>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button onClick={() => startEdit(b)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title={isLocked ? "Suggérer une modification" : "Éditer"} aria-label={isLocked ? "Suggérer une modification" : "Éditer"}>
                <NavIcon name="pencil" size={15} color={COLORS.redFluo} />
              </button>
              {isAdmin && b.status !== "certified" && (
                <button onClick={() => onCertify(b.id)} style={{ background: "none", border: "none", color: COLORS.sage, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  Certifier
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => (confirmDeleteId === b.id ? onDelete(b.id) : setConfirmDeleteId(b.id))}
                  style={{ background: "none", border: "none", color: COLORS.redFluo, fontSize: "16px", cursor: "pointer", padding: 0 }}
                >
                  {confirmDeleteId === b.id ? "?" : "×"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCreateBlock = () =>
    creating ? (
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
        <div style={{ fontSize: "13.5px", fontWeight: 700, marginBottom: "8px" }}>Nouvelle marque</div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCreate()}
          placeholder="Nom"
          autoFocus
          style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none", marginBottom: "10px" }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCreating(false)}
            style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, fontSize: "13px", cursor: "pointer" }}
          >
            Annuler
          </button>
          <button
            onClick={submitCreate}
            disabled={!newName.trim()}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: "8px",
              border: "none",
              background: newName.trim() ? COLORS.amber : COLORS.paperAlt,
              color: COLORS.ink,
              fontWeight: 700,
              fontSize: "13px",
              cursor: newName.trim() ? "pointer" : "not-allowed",
            }}
          >
            Créer
          </button>
        </div>
      </div>
    ) : (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <button
          onClick={() => setCreating(true)}
          style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
          title="Créer une marque"
          aria-label="Créer une marque"
        >
          +
        </button>
      </div>
    );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={handleBack} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>
            {!skipCountryLevel && activeCountry ? activeCountry : "Marques"}
          </h1>
        </div>
        <button onClick={onRefresh} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} title="Actualiser" aria-label="Actualiser">
          <NavIcon name="refresh" size={18} color={COLORS.redFluo} />
        </button>
      </div>

      {renderCreateBlock()}
      {duplicateNotice && (
        <p style={{ fontSize: "12.5px", color: COLORS.wine, fontWeight: 700, marginTop: "-8px", marginBottom: "16px" }}>
          "{duplicateNotice}" existait déjà dans le répertoire — aucun doublon créé.
        </p>
      )}

      {brands.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune marque enregistrée pour l'instant.</p>}

      {!skipCountryLevel && !activeCountry ? (
        <>
          {brands.length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une marque"
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px" }}
            />
          )}
          {searching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {searchResultsAll.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune marque trouvée.</p>
              ) : (
                searchResultsAll.map(renderBrandRow)
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {countries.map((country) => (
                <button
                  key={country}
                  onClick={() => goToCountry(country)}
                  style={{
                    textAlign: "left",
                    background: COLORS.surface,
                    border: `2px solid ${COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "14.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {COUNTRY_FLAGS[country] ? <FlagIcon flag={COUNTRY_FLAGS[country]} size={16} /> : <span>🌍</span>}
                    {country}
                  </span>
                  <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(country)} →</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {sortedIn(effectiveCountry || "").length > 6 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher dans ${effectiveCountry}`}
              style={{ padding: "11px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "14px" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {effectiveCountry &&
              (searching ? (
                searchResultsInCountry.length === 0 ? (
                  <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune marque trouvée dans ce pays.</p>
                ) : (
                  searchResultsInCountry.map(renderBrandRow)
                )
              ) : (
                sortedIn(effectiveCountry).map(renderBrandRow)
              ))}
          </div>
        </>
      )}

      {(!skipCountryLevel && !activeCountry) || (skipCountryLevel && brands.length > 6) || (!skipCountryLevel && activeCountry) ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={() => setCreating(true)}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Créer une marque"
            aria-label="Créer une marque"
          >
            +
          </button>
        </div>
      ) : null}

      {((!skipCountryLevel && activeCountry) || (skipCountryLevel && brands.length > 6) || (!skipCountryLevel && !activeCountry && brands.length > 6)) && <ScrollToTopButton />}
      <BackFooterLink onClick={handleBack} />
    </div>
  );
}
