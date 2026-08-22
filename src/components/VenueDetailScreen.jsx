// ============================================================
// Fiche détaillée d'un établissement — copiée telle quelle
// depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, GoogleIcon, WebsiteIcon, FacebookIcon, InstagramIcon, TiktokIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar, MoneyAmount } from "./ui.jsx";
import { formatAddress, formatCompactCount, formatDate, mapsUrlFor, normalizeUrl } from "../utils.js";

export function VenueDetailScreen({ venue, myBibroCode, onToggleLike, onCheckIn, onBack, onEdit, onDelete, onResetStats, onManageMenu, onToggleFavorite, onCleanupDuplicates }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const stats = venue.stats || {};
  const moneySpent = stats.moneySpent || {};
  const moneyEuro = moneySpent.euro || 0;
  const moneyJeton = moneySpent.jeton || 0;
  const drinkEntries = Object.entries(stats.personalDrinksByType || {}).filter(([, n]) => n > 0);
  const address = formatAddress(venue);
  const likes = venue.likes || [];
  const iLike = likes.includes(myBibroCode);

  const handleCheckIn = () => {
    onCheckIn(venue);
    setJustCheckedIn(true);
  };

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onResetStats();
    setConfirmReset(false);
  };

  const handleCleanup = () => {
    const result = onCleanupDuplicates();
    setCleanupMessage(result.removed === 0 ? "Aucun doublon trouvé." : `${result.removed} doublon${result.removed > 1 ? "s" : ""} retiré${result.removed > 1 ? "s" : ""}.`);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      {venue.pendingEdit && (
        <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "#F2C94C" }}>
          📝 Une modification de la fiche est proposée, en attente de validation.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <EntityAvatar photoEmoji={venue.avatarEmoji} size={48} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 2px 0", lineHeight: 1 }}>{venue.name}</h1>
        </div>
        <button
          onClick={() => onToggleLike(venue.sourcePublicVenueId)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 6px" }}
        >
          <NavIcon name="heart" size={24} color={iLike ? COLORS.redFluo : COLORS.paperAlt} />
          {likes.length > 0 && <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.redFluo, marginTop: "2px" }}>{formatCompactCount(likes.length)}</span>}
        </button>
      </div>
      {venue.isFavorite ? (
        <p style={{ fontSize: "14px", color: COLORS.amber, fontWeight: 600, margin: "0 0 4px 0" }}>★</p>
      ) : (
        <button
          onClick={onToggleFavorite}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, margin: "0 0 4px 0", textAlign: "left" }}
        >
          Lieu suivi ponctuellement · ⭐ ajouter aux favoris
        </button>
      )}
      {venue.subtitle && <p style={{ fontSize: "13.5px", color: COLORS.wine, fontWeight: 600, margin: "0 0 4px 0" }}>{venue.subtitle}</p>}
      {address && (
        <a
          href={mapsUrlFor(venue)}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "4px", marginBottom: "4px", display: "inline-block", textDecoration: "none" }}
        >
          📍 {address}
        </a>
      )}
      {venue.phone && (
        <a href={`tel:${venue.phone.replace(/\s+/g, "")}`} style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "4px", display: "block", textDecoration: "none" }}>
          📞 {venue.phone}
        </a>
      )}
      {venue.email && (
        <a href={`mailto:${venue.email}`} style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "4px", display: "block", textDecoration: "none" }}>
          ✉️ {venue.email}
        </a>
      )}
      {venue.hasFood && (
        <div style={{ display: "inline-block", background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>
          🍽️ Restauration possible
        </div>
      )}

      <button
        onClick={handleCheckIn}
        style={{
          background: justCheckedIn ? COLORS.sage : COLORS.amber,
          color: COLORS.ink,
          border: "none",
          borderRadius: "10px",
          padding: "12px 16px",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        {justCheckedIn ? "✓ Tes Bibax peuvent te voir ici" : "📍 Je suis ici !"}
      </button>

      {venue.tags && venue.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {venue.tags.map((tag) => (
            <span key={tag} style={{ background: COLORS.paperAlt, borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <a href={mapsUrlFor(venue)} target="_blank" rel="noreferrer" title="Voir sur la carte" style={{ lineHeight: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill={COLORS.sage} />
            <path d="M12 6c-2 0-3.6 1.6-3.6 3.6 0 2.7 3.6 6.4 3.6 6.4s3.6-3.7 3.6-6.4C15.6 7.6 14 6 12 6zm0 4.9a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6z" fill="#fff" />
          </svg>
        </a>
        {venue.website && (
          <a href={normalizeUrl(venue.website)} target="_blank" rel="noreferrer" title="Site internet" style={{ lineHeight: 0 }}>
            <WebsiteIcon />
          </a>
        )}
        {venue.googleUrl && (
          <a href={normalizeUrl(venue.googleUrl)} target="_blank" rel="noreferrer" title="Page Google" style={{ lineHeight: 0 }}>
            <GoogleIcon />
          </a>
        )}
        {venue.facebookUrl && (
          <a href={normalizeUrl(venue.facebookUrl)} target="_blank" rel="noreferrer" title="Facebook" style={{ lineHeight: 0 }}>
            <FacebookIcon />
          </a>
        )}
        {venue.instagramUrl && (
          <a href={normalizeUrl(venue.instagramUrl)} target="_blank" rel="noreferrer" title="Instagram" style={{ lineHeight: 0 }}>
            <InstagramIcon />
          </a>
        )}
        {venue.tiktokUrl && (
          <a href={normalizeUrl(venue.tiktokUrl)} target="_blank" rel="noreferrer" title="TikTok" style={{ lineHeight: 0 }}>
            <TiktokIcon />
          </a>
        )}
      </div>

      <div style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, borderRadius: "14px", padding: "18px", marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10.5px", opacity: 0.55, marginBottom: "10px" }}>
          {venue.trackingStartDate ? `STATS DEPUIS LE ${formatDate(venue.trackingStartDate).toUpperCase()}` : "STATISTIQUES"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>VISITES</div>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{stats.visits || 0}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6 }}>BOISSONS COMMANDÉES</div>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "32px", color: COLORS.amber }}>{stats.drinksOrdered || 0}</div>
          </div>
        </div>
        {(moneyEuro > 0 || moneyJeton > 0) && (
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `2px solid ${COLORS.chalkWhite}30` }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", opacity: 0.6, marginBottom: "4px" }}>ARGENT DÉPENSÉ (TOURNÉES)</div>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", color: COLORS.amber }}>
              {moneyEuro > 0 && <MoneyAmount value={moneyEuro} currency="euro" />}
              {moneyEuro > 0 && moneyJeton > 0 && " · "}
              {moneyJeton > 0 && <MoneyAmount value={moneyJeton} currency="jeton" />}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onManageMenu}
        style={{
          textAlign: "left",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "16px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Carte boissons de ce lieu</div>
          <div style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "2px" }}>
            {venue.menu && venue.menu.length > 0 ? (
              <>
                {venue.menu.length} boisson{venue.menu.length > 1 ? "s" : ""} enregistrée{venue.menu.length > 1 ? "s" : ""} (
                {venue.defaultCurrency === "jeton" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                    jetons <NavIcon name="jeton" size={16} color={COLORS.jetonFluo} />
                  </span>
                ) : (
                  "€"
                )}
                )
              </>
            ) : (
              "Pas encore de carte — à préremplir"
            )}
          </div>
        </div>
        <span style={{ color: COLORS.wine, fontSize: "13px", fontWeight: 700 }}>Gérer →</span>
      </button>

      <button
        onClick={handleCleanup}
        style={{
          background: "none",
          border: "none",
          color: COLORS.wine,
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
          marginBottom: cleanupMessage ? "6px" : "16px",
        }}
      >
        🧹 Nettoyer les doublons de la carte
      </button>
      {cleanupMessage && <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>{cleanupMessage}</p>}

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "auto" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Tes verres bus ici, par boisson</div>
        {drinkEntries.length === 0 ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun verre personnel enregistré pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {drinkEntries.map(([name, n]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>{name}</span>
                <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleResetClick}
        style={{
          background: "none",
          border: "none",
          color: confirmReset ? COLORS.wine : COLORS.inkSoft,
          fontWeight: confirmReset ? 700 : 500,
          fontSize: "12.5px",
          cursor: "pointer",
          padding: "14px 0 0 0",
          textAlign: "left",
        }}
      >
        {confirmReset ? "Confirmer la réinitialisation des statistiques ?" : "Réinitialiser les statistiques"}
      </button>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          onClick={onEdit}
          style={{ flex: 1, background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "13px", fontWeight: 600, fontSize: "14px", color: COLORS.ink, cursor: "pointer" }}
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          style={{ flex: 1, background: "none", border: `2px solid ${COLORS.wine}`, borderRadius: "10px", padding: "13px", fontWeight: 600, fontSize: "14px", color: COLORS.wine, cursor: "pointer" }}
        >
          Supprimer
        </button>
      </div>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}
