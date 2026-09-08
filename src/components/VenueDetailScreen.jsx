// ============================================================
// Fiche détaillée d'un établissement — copiée telle quelle
// depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS, VENUE_TYPES } from "../constants.js";
import { NavIcon, GoogleIcon, WebsiteIcon, FacebookIcon, InstagramIcon, TiktokIcon, TokenPinkIcon, CertificationIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar, MoneyAmount } from "./ui.jsx";
import { formatAddress, formatDate, mapsUrlFor, normalizeUrl } from "../utils.js";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";
import carteIconUrl from "../assets/brand/carte.svg";

export function VenueDetailScreen({ venue, venues = [], myBibroCode, myUserId, onToggleLike, onCheckIn, onBack, onEdit, onDelete, onResetStats, onManageMenu, onToggleFavorite, onCleanupDuplicates }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [reporting, setReporting] = useState(false);
  const stats = venue.stats || {};
  const moneySpent = stats.moneySpent || {};
  const moneyEuro = moneySpent.euro || 0;
  const moneyJeton = moneySpent.jeton || 0;
  const drinkEntries = Object.entries(stats.personalDrinksByType || {}).filter(([, n]) => n > 0);
  const address = formatAddress(venue);
  const addressLine1 = [venue.streetName, venue.streetNumber].filter(Boolean).join(", ");
  const addressLine2 = [venue.postalCode ? `B-${venue.postalCode}` : "", venue.city].filter(Boolean).join(" ") + (venue.village ? ` (${venue.village})` : "");
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
      <div style={{ position: "relative", margin: "-28px -20px 0 -20px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            background: venue.coverPhotoUrl ? `url(${venue.coverPhotoUrl}) center/cover` : COLORS.surfaceAlt,
          }}
        />
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", padding: "20px 20px 0" }}>
          <PageHeader onBack={onBack} />
        </div>
        <div style={{ position: "absolute", bottom: "-64px", left: "4px", border: `3px solid ${COLORS.paper}`, borderRadius: "50%", lineHeight: 0 }}>
          <EntityAvatar photoUrl={venue.profilePhotoUrl} photoEmoji={venue.avatarEmoji} size={90} />
        </div>
        <div style={{ position: "absolute", top: "158px", left: "108px", right: "12px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "19px", margin: 0, lineHeight: 1.25, color: COLORS.chalkWhite }}>{venue.name}</h1>
            <CertificationIcon level={venue.certificationLevel} size={17} />
          </div>
          {venue.subtitle && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "2px 0 0 0" }}>{venue.subtitle}</p>}
        </div>
        <button
          onClick={handleCheckIn}
          title={justCheckedIn ? "Tes Bibax peuvent te voir ici" : "Je suis ici !"}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={placeCheckIconUrl}
            alt="Check-in"
            style={{ width: "52px", height: "52px", opacity: justCheckedIn ? 0.55 : 1 }}
          />
        </button>
      </div>

      <div style={{ marginTop: "76px" }}>
        {venue.pendingContributionsCount > 0 && (
          <div style={{ background: "#332B14", border: "2px solid #c9a227", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "#F2C94C" }}>
            📝 Une modification de la fiche est proposée, en attente de validation.
          </div>
        )}
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 30px 1px 30px", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
          <a href={mapsUrlFor(venue)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: COLORS.inkSoft, fontSize: "12.5px", lineHeight: 1.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <NavIcon name="map-pin" size={18} color={COLORS.amber} />
              <span>
                {addressLine1}
                {addressLine1 && <br />}
                {addressLine2}
              </span>
            </div>
          </a>
          <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
          {venue.phone ? (
            <a href={`tel:${venue.phone.replace(/\s+/g, "")}`} title={venue.phone} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="phone" size={22} color={COLORS.amber} />
            </a>
          ) : (
            <div />
          )}
          <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
          {venue.email ? (
            <a href={`mailto:${venue.email}`} title={venue.email} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="mail" size={22} color={COLORS.amber} />
            </a>
          ) : (
            <div />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "14px" }}>
          {venue.website && (
            <a href={normalizeUrl(venue.website)} target="_blank" rel="noreferrer" title="Site internet" style={{ lineHeight: 0 }}>
              <WebsiteIcon size={20} />
            </a>
          )}
          {venue.googleUrl && (
            <a href={normalizeUrl(venue.googleUrl)} target="_blank" rel="noreferrer" title="Page Google" style={{ lineHeight: 0 }}>
              <GoogleIcon size={20} />
            </a>
          )}
          {venue.facebookUrl && (
            <a href={normalizeUrl(venue.facebookUrl)} target="_blank" rel="noreferrer" title="Facebook" style={{ lineHeight: 0 }}>
              <FacebookIcon size={20} />
            </a>
          )}
          {venue.instagramUrl && (
            <a href={normalizeUrl(venue.instagramUrl)} target="_blank" rel="noreferrer" title="Instagram" style={{ lineHeight: 0 }}>
              <InstagramIcon size={20} />
            </a>
          )}
          {venue.tiktokUrl && (
            <a href={normalizeUrl(venue.tiktokUrl)} target="_blank" rel="noreferrer" title="TikTok" style={{ lineHeight: 0 }}>
              <TiktokIcon size={20} />
            </a>
          )}
        </div>
        {venue.venueTypes && venue.venueTypes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
            {venue.venueTypes.map((code) => (
              <span
                key={code}
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  border: `1.5px solid ${COLORS.paperAlt}`,
                  color: COLORS.chalkWhite,
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {VENUE_TYPES.find((t) => t.code === code)?.fr || code}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "stretch", marginBottom: "20px" }}>
        <div style={{ flex: 2 }}>
          <OpeningHoursDisplay googlePlaceId={venue.googlePlaceId} noGooglePresence={venue.noGooglePresence} noFixedHours={venue.noFixedHours} />
        </div>
        <button
          onClick={onManageMenu}
          style={{
            flex: 1,
            borderRadius: "12px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <img src={carteIconUrl} alt="" style={{ width: "20px", height: "20px" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.ink }}>Carte</span>
        </button>
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
              {moneyJeton > 0 && <MoneyAmount value={moneyJeton} currency="jeton" jetonIcon="pink" />}
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
                    jetons <TokenPinkIcon size={16} />
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
      <button
        onClick={() => setReporting(true)}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "14px 0 0 0", textAlign: "left" }}
      >
        <ReportIcon /> Signaler cette fiche
      </button>
      {reporting && <ReportModal entityType="venue" entityId={venue.id} myBibroCode={myBibroCode} directory={venues} onClose={() => setReporting(false)} />}
      <button
        onClick={() => setClaiming(true)}
        style={{ background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "10px 0 0 0", textAlign: "left" }}
      >
        Cet établissement vous appartient ? Revendiquez cette fiche
      </button>
      {claiming && <ClaimModal entityType="venue" entityId={venue.id} entityName={venue.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}
      <BackFooterLink onClick={onBack} />
      </div>
    </div>
  );
}
