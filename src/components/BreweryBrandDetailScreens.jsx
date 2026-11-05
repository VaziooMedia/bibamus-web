// ============================================================
// Fiches détaillées d'une brasserie/producteur et d'une marque
// — copiées telles quelles depuis le prototype Claude.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, BREWERY_FIELD_LABELS, BRAND_FIELD_LABELS, BRAND_TYPES, BRAND_CLASSIFICATIONS, DRINK_TYPES } from "../constants.js";
import { NavIcon, CertificationIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { DrinkBadges, getDrinkBadgeItems, renderDrinkBadgeItem } from "./DrinkDisplay.jsx";
import { drinkSummaryLine } from "../utils.js";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { EntityPulseSection } from "./EntityPulseSection.jsx";
import { loadDrinksByBrewery, loadDrinksByBrand, loadBrandsByProducer, loadBreweriesByIds, loadVenueById, loadBrandListsOnce } from "../data/sharedDirectories.js";
import { customNames } from "../venueLists.js";
import { BRAND_TYPE_LIST_KEY, BRAND_CLASSIFICATION_LIST_KEY } from "../brandLists.js";
import { shareEntity, canShareEntity } from "../shareEntity.js";
import { usernameLinkUrl } from "../usernameLinks.js";

// Bouton « Partager » des fiches producteur et marque : même icône et même emplacement que sur la fiche lieu.
// Le lien partagé est bibamus.app/@nom de la fiche (lien général si elle n'a pas encore de @nom). Rien ne
// s'affiche si le partage natif n'existe pas sur l'appareil.
function ShareEntityButton({ name, username }) {
  if (!canShareEntity()) return null;
  return (
    <div style={{ position: "absolute", top: "32px", right: "8px", display: "flex", alignItems: "center" }}>
      <button
        onClick={() => shareEntity({ title: name, text: `Découvre ${name} sur Bibamus !`, url: usernameLinkUrl(username) })}
        title="Partager"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
      >
        <NavIcon name="share" size={24} color={COLORS.amber} />
      </button>
    </div>
  );
}

export function BreweryDetailScreen({ brewery, breweriesDirectory = [], isAdmin, myBibroCode, myUserId, onBack, onOpenDrink, onOpenBrand, onOpenVenue, onSuggestEdit, pendingContributions = [], onApproveContribution, onRejectContribution, onCertify, onDelete, claimsEnabled = true }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(brewery.name || "");
  const [activeTab, setActiveTab] = useState("infos");
  const [countryValue, setCountryValue] = useState(brewery.country || "");
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const [relatedDrinks, setRelatedDrinks] = useState([]);
  useEffect(() => {
    loadDrinksByBrewery(brewery.name).then(setRelatedDrinks);
  }, [brewery.name]);

  const [relatedBrands, setRelatedBrands] = useState([]);
  useEffect(() => {
    loadBrandsByProducer(brewery.id).then(setRelatedBrands);
  }, [brewery.id]);

  const [linkedVenue, setLinkedVenue] = useState(null);
  useEffect(() => {
    if (brewery.linkedVenueId) loadVenueById(brewery.linkedVenueId).then(setLinkedVenue);
    else setLinkedVenue(null);
  }, [brewery.linkedVenueId]);

  const submitEdit = () => {
    onSuggestEdit(nameValue, countryValue);
    setEditing(false);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: brewery.coverPhotoUrl ? `url(${brewery.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={brewery.profilePhotoUrl} photoEmoji={brewery.avatarEmoji} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div style={{ paddingRight: canShareEntity() ? "34px" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{brewery.name}</h1>
              <CertificationIcon level={brewery.certificationLevel} size={17} />
            </div>
            {brewery.country && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0" }}>{brewery.country}</p>}
          </div>
          <ShareEntityButton name={brewery.name} username={brewery.username} />
        </div>
      </div>

      <div style={{ marginTop: "76px" }}>
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

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: 0 }}>Ta suggestion sera soumise à validation.</p>
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
              Suggérer
            </button>
          </div>
        </div>
      )}

      {linkedVenue && (
        <button
          onClick={() => onOpenVenue(linkedVenue.id)}
          style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%", marginBottom: "20px" }}
        >
          <EntityAvatar photoUrl={linkedVenue.profilePhotoUrl} photoEmoji={linkedVenue.avatarEmoji} size={28} />
          <span>
            <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>LIEU LIÉ</span>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>{linkedVenue.name}</span>
          </span>
        </button>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[
          { key: "infos", label: "Infos" },
          { key: "bibapulse", label: "BibaPulse" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              background: activeTab === t.key ? COLORS.amber : "none",
              color: activeTab === t.key ? COLORS.paper : COLORS.ink,
              border: `2px solid ${activeTab === t.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.key === "bibapulse" ? (
              <>
                Biba<span style={{ color: activeTab === t.key ? undefined : COLORS.amber }}>Pulse</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      {activeTab === "infos" && (
        <>
      <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
        SES MARQUES ({relatedBrands.length})
      </div>
      {relatedBrands.length === 0 ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic", marginBottom: "20px" }}>
          Aucune marque liée à ce producteur pour l'instant.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {relatedBrands.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpenBrand(b.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
            >
              <EntityAvatar photoUrl={b.logoUrl} size={28} />
              <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                {b.name}
                <CertificationIcon level={b.certificationLevel} size={13} />
              </span>
            </button>
          ))}
        </div>
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
        {claimsEnabled && (
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
          Revendiquer la gestion de ce producteur
        </button>
        )}
        <button
          onClick={() => setShowActionsMenu(true)}
          title="Plus d'options"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
        >
          <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
        </button>
      </div>
        </>
      )}

      {activeTab === "bibapulse" && (
        <EntityPulseSection entityType="producer" entityId={brewery.id} myUserId={myUserId} myBibroCode={myBibroCode} onOpenDrink={onOpenDrink} onOpenVenue={onOpenVenue} onOpenBrand={onOpenBrand} />
      )}

      {claimsEnabled && claiming && <ClaimModal entityType="producer" entityId={brewery.id} entityName={brewery.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

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
            {isAdmin && (
              <button
                onClick={() => {
                  setShowActionsMenu(false);
                  setEditing(true);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
              >
                <NavIcon name="pencil" size={20} color={COLORS.amber} />
                Éditer
              </button>
            )}
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason(null);
                setReporting(true);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <ReportIcon />
              Signaler ou suggérer une modification
            </button>
          </div>
        </div>
      )}
      {reporting && (
        <ReportModal
          entityType="producer"
          entityId={brewery.id}
          myBibroCode={myBibroCode}
          initialReason={reportInitialReason}
          directory={breweriesDirectory}
          onClose={() => setReporting(false)}
        />
      )}
      <div style={{ marginTop: "-14px" }}>
        <BackFooterLink onClick={onBack} />
      </div>
      </div>
    </div>
  );
}

export function BrandDetailScreen({ brand, brandsDirectory = [], isAdmin, myBibroCode, myUserId, onBack, onOpenDrink, onOpenBrewery, onSuggestEdit, pendingContributions = [], onApproveContribution, onRejectContribution, onCertify, onDelete, claimsEnabled = true }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(brand.name || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const [relatedDrinks, setRelatedDrinks] = useState([]);
  useEffect(() => {
    loadDrinksByBrand(brand.name).then(setRelatedDrinks);
  }, [brand.name]);

  const [producers, setProducers] = useState([]);
  useEffect(() => {
    if (brand.producerIds?.length > 0) loadBreweriesByIds(brand.producerIds).then(setProducers);
    else setProducers([]);
  }, [brand.producerIds]);

  // Les noms des types et des catégories de la marque : ceux de la plateforme de gestion (élément ajouté, élément renommé)
  // l'emportent sur la liste de départ. Lus une fois par session. Un code inconnu dont le nom n'est pas chargé n'est jamais
  // montré tel quel. Entre parenthèses, l'explication de la liste de départ (« Bulles (champagne, crémant...) ») est omise.
  const [brandLists, setBrandLists] = useState(null);
  const hasBrandTags = (brand.brandTypes || []).length > 0 || (brand.classifications || []).length > 0;
  useEffect(() => {
    if (!hasBrandTags) return undefined;
    let cancelled = false;
    loadBrandListsOnce().then((lists) => {
      if (lists && !cancelled) setBrandLists(lists);
    });
    return () => {
      cancelled = true;
    };
  }, [hasBrandTags, brand.id]);
  const tagLabels = (codes, builtin, listKey) => {
    const names = brandLists ? customNames(brandLists[listKey].rows) : {};
    return (codes || [])
      .map((code) => {
        const found = builtin.find((t) => t.code === code);
        const label = names[code] || (found ? found.fr.replace(/\s*\(.*\)\s*$/, "") : "");
        return label;
      })
      .filter(Boolean);
  };
  const brandTags = [...tagLabels(brand.brandTypes, BRAND_TYPES, BRAND_TYPE_LIST_KEY), ...tagLabels(brand.classifications, BRAND_CLASSIFICATIONS, BRAND_CLASSIFICATION_LIST_KEY)];
  const hasOrigin = !!(brand.originCity || brand.originRegion || brand.originCountry);

  // Les produits, regroupés par type de boisson (ordre du répertoire) ; un seul type = pas d'intertitre.
  const drinkGroups = [...relatedDrinks.reduce((m, d) => m.set(d.type, [...(m.get(d.type) || []), d]), new Map())].sort((a, b) => {
    const rank = (t) => (DRINK_TYPES.indexOf(t) === -1 ? DRINK_TYPES.length : DRINK_TYPES.indexOf(t));
    return rank(a[0]) - rank(b[0]);
  });

  const submitEdit = () => {
    onSuggestEdit(nameValue);
    setEditing(false);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: brand.coverPhotoUrl ? `url(${brand.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "8px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={brand.logoUrl} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div style={{ paddingRight: canShareEntity() ? "34px" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{brand.name}</h1>
              <CertificationIcon level={brand.certificationLevel} size={17} />
            </div>
          </div>
          <ShareEntityButton name={brand.name} username={brand.username} />
        </div>
      </div>

      <div style={{ marginTop: "76px" }}>
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

      {editing && (
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
            Suggérer
          </button>
        </div>
      )}

      {/* Carte « Infos » : même présentation que la fiche Produit (pastilles, ligne d'origine, puis le producteur après un trait vert). */}
      {(brandTags.length > 0 || hasOrigin || producers.length > 0) && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px" }}>
            {[
              brandTags.length > 0 && {
                key: "tags",
                sep: null,
                node: (
                  <div key="tags" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {brandTags.map((label) => (
                      <span key={label} style={{ background: COLORS.paperAlt, borderRadius: "999px", padding: "0.45em 0.9em", fontSize: "10px", fontWeight: 600, color: COLORS.ink }}>
                        {label}
                      </span>
                    ))}
                  </div>
                ),
              },
              hasOrigin && {
                key: "origin",
                sep: "green",
                node: (
                  <div key="origin" style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <NavIcon name="map-pin" size={15} color={COLORS.amber} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {brand.originCity && <span>{brand.originCity}</span>}
                      {brand.originRegion && <span>{brand.originRegion}</span>}
                      {brand.originCountry && (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {brand.originCountry}
                          <CountryFlagImg country={brand.originCountry} size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
            ]
              .filter(Boolean)
              .map((row, i) => (
                <React.Fragment key={row.key}>
                  {i > 0 && (
                    <div
                      style={{
                        borderBottom: row.sep === "green" ? `2px solid ${COLORS.amber}` : `1px solid ${COLORS.paperAlt}`,
                        margin: row.sep === "green" ? "14px 0" : "10px 0",
                      }}
                    />
                  )}
                  {row.node}
                </React.Fragment>
              ))}
          </div>

          {(brandTags.length > 0 || hasOrigin) && producers.length > 0 && <div style={{ borderBottom: `2px solid ${COLORS.amber}`, margin: "14px 0" }} />}

          {producers.map((producer, i) => (
            <button
              key={producer.id}
              onClick={() => onOpenBrewery(producer.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginTop: i > 0 ? "10px" : 0 }}
            >
              <EntityAvatar photoUrl={producer.profilePhotoUrl} photoEmoji={producer.avatarEmoji} size={28} />
              <span>
                <span style={{ display: "block", fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px" }}>Producteur</span>
                <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {producer.name}
                  <CertificationIcon level={producer.certificationLevel} size={13} />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Carte « Ses produits » : titre à barre verte et lignes imbriquées, comme « Lieux qui le proposent » sur la fiche Produit. */}
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Ses produits ({relatedDrinks.length})</span>
        </div>
        {isAdmin && relatedDrinks.length > 0 && (
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 12px" }}>Touchez une boisson pour la corriger, la peaufiner ou la certifier.</p>
        )}
        {relatedDrinks.length === 0 ? (
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, textAlign: "center", padding: "16px 0", margin: 0 }}>Aucune boisson de cette marque enregistrée pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drinkGroups.map(([type, drinks], gi) => (
              <React.Fragment key={type}>
                {drinkGroups.length > 1 && (
                  <div style={{ fontSize: "10px", color: COLORS.inkSoft, letterSpacing: "1px", marginTop: gi > 0 ? "6px" : 0 }}>
                    {type.toUpperCase()} ({drinks.length})
                  </div>
                )}
                {drinks.map((d) => {
                  const parts = (d.type === "Bières & Cidres"
                    ? [
                        d.nationality ? <CountryFlagImg country={d.nationality} size={18.5} /> : null,
                        d.abv != null ? <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{d.abv.toFixed(1)}% ABV</span> : null,
                        ...getDrinkBadgeItems(d, { hideCountry: true }).map((it) => renderDrinkBadgeItem(it, { drink: d, size: 11 })),
                      ]
                    : getDrinkBadgeItems(d).map((it) => renderDrinkBadgeItem(it, { drink: d, size: 11 }))
                  ).filter(Boolean);
                  return (
                    <button
                      key={d.id}
                      onClick={() => onOpenDrink(d.id)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left", background: COLORS.surfaceAlt, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", width: "100%" }}
                    >
                      <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={28} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {d.name}
                          {d.pendingContributionsCount > 0 && (
                            <span style={{ fontSize: "13px" }} title="Une modification est proposée">
                              📝
                            </span>
                          )}
                        </span>
                        {parts.length > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                            {parts.map((part, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                                {part}
                              </React.Fragment>
                            ))}
                          </span>
                        )}
                      </span>
                      <CertificationIcon level={d.certificationLevel} size={15} />
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div style={{ marginTop: "auto", paddingTop: "20px" }}>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>ADMINISTRATION</div>
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
        {claimsEnabled && (
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
          Revendiquer la gestion de cette marque
        </button>
        )}
        <button
          onClick={() => setShowActionsMenu(true)}
          title="Plus d'options"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
        >
          <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
        </button>
      </div>
      {claimsEnabled && claiming && <ClaimModal entityType="brand" entityId={brand.id} entityName={brand.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}

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
            {isAdmin && (
              <button
                onClick={() => {
                  setShowActionsMenu(false);
                  setEditing(true);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
              >
                <NavIcon name="pencil" size={20} color={COLORS.amber} />
                Éditer
              </button>
            )}
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason(null);
                setReporting(true);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <ReportIcon />
              Signaler ou suggérer une modification
            </button>
          </div>
        </div>
      )}
      {reporting && (
        <ReportModal
          entityType="brand"
          entityId={brand.id}
          myBibroCode={myBibroCode}
          initialReason={reportInitialReason}
          directory={brandsDirectory}
          onClose={() => setReporting(false)}
        />
      )}
      <div style={{ marginTop: "-14px" }}>
        <BackFooterLink onClick={onBack} />
      </div>
      </div>
    </div>
  );
}
