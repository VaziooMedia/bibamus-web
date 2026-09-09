// ============================================================
// Fiche détaillée d'un établissement — copiée telle quelle
// depuis le prototype Claude.
// ============================================================
import React, { useState, useRef, useLayoutEffect } from "react";
import { COLORS, VENUE_TYPES } from "../constants.js";
import { NavIcon, GoogleIcon, FacebookIcon, InstagramIcon, TiktokIcon, WhatsappIcon, CertificationIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, EntityAvatar } from "./ui.jsx";
import { formatAddress, mapsUrlFor, normalizeUrl, buildWhatsAppLink } from "../utils.js";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay.jsx";
import { ReportModal, ReportIcon } from "./ReportModal.jsx";
import { ClaimModal } from "./ClaimModal.jsx";
import { VenueRatingModal } from "./VenueRatingModal.jsx";
import { VenueRatingDisplay } from "./VenueRatingDisplay.jsx";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";
import carteIconUrl from "../assets/brand/carte.svg";
import snapchatIconUrl from "../assets/brand/snapchat.svg";
import tripadvisorIconUrl from "../assets/brand/tripadvisor.svg";
import restaurantGuruIconUrl from "../assets/brand/restaurant-guru.svg";
import wifiIconUrl from "../assets/brand/wifi-free.svg";
import pmrIconUrl from "../assets/brand/acces-pmr.svg";
import danceIconUrl from "../assets/brand/danser.svg";
import internetIconUrl from "../assets/brand/internet.svg";

export function VenueDetailScreen({ venue, venues = [], myBibroCode, myUserId, onToggleLike, onCheckIn, onBack, onEdit, onDelete, onResetStats, onManageMenu, onToggleFavorite, onCleanupDuplicates, onOpenCheckInsHistory, onOpenDrinksHistory }) {
  const [claiming, setClaiming] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportInitialReason, setReportInitialReason] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const stats = venue.stats || {};
  const address = formatAddress(venue);
  const addressLine1 = [venue.streetName, venue.streetNumber].filter(Boolean).join(", ");
  const addressLine2 = [venue.postalCode ? `B-${venue.postalCode}` : "", venue.city].filter(Boolean).join(" ") + (venue.village ? ` (${venue.village})` : "");
  const likes = venue.likes || [];
  const hasPhone = !!venue.phone;
  const hasEmail = !!venue.email;
  const hasAmenities = !!(venue.hasWifi || venue.wheelchairAccessible || venue.canDance);
  const [activeAmenityTip, setActiveAmenityTip] = useState(null);
  const hoursBlockRef = useRef(null);
  const [hoursBlockHeight, setHoursBlockHeight] = useState(null);
  useLayoutEffect(() => {
    if (!hoursBlockRef.current) return undefined;
    const measure = () => setHoursBlockHeight(hoursBlockRef.current.offsetHeight);
    measure();
    // Les horaires sont chargées de façon asynchrone (fetch Google) : le bloc affiche
    // d'abord "Chargement des horaires..." (pas de bordure/fond, hauteur différente) avant
    // le vrai contenu. On observe les changements de taille réels le temps que ce chargement
    // se termine, puis on se déconnecte pour ne plus bouger — notamment quand l'utilisateur
    // déroule manuellement les horaires plus tard, ce qui ne doit pas agrandir le bouton "Carte".
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(hoursBlockRef.current);
    const timeout = setTimeout(() => observer.disconnect(), 4000);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);
  const hasSocials = !!(
    venue.website ||
    venue.googleUrl ||
    venue.facebookUrl ||
    venue.instagramUrl ||
    venue.tiktokUrl ||
    venue.whatsapp ||
    venue.snapchatUrl ||
    venue.tripadvisorUrl ||
    venue.restaurantGuruUrl
  );
  const iLike = likes.includes(myBibroCode);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleCheckIn = () => {
    onCheckIn(venue);
    setJustCheckedIn(true);
    setShowRatingModal(true);
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
          <PageHeader
            onBack={onBack}
            right={
              <button
                onClick={onEdit}
                title="Modifier ce lieu"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <NavIcon name="pencil" size={20} color={COLORS.amber} />
              </button>
            }
          />
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
      <VenueRatingDisplay venueId={venue.id} onOpenRatingModal={() => setShowRatingModal(true)} />
      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasPhone && hasEmail ? "1fr 1px 30px 1px 30px" : hasPhone || hasEmail ? "1fr 1px 30px" : "1fr",
            gap: "8px",
            marginBottom: "12px",
            alignItems: "center",
          }}
        >
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
          {(hasPhone || hasEmail) && <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />}
          {hasPhone && (
            <a href={`tel:${venue.phone.replace(/\s+/g, "")}`} title={venue.phone} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="phone" size={22} color={COLORS.amber} />
            </a>
          )}
          {!hasPhone && hasEmail && (
            <a href={`mailto:${venue.email}`} title={venue.email} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <NavIcon name="mail" size={22} color={COLORS.amber} />
            </a>
          )}
          {hasPhone && hasEmail && (
            <>
              <div style={{ width: "1px", height: "32px", background: COLORS.paperAlt }} />
              <a href={`mailto:${venue.email}`} title={venue.email} style={{ lineHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <NavIcon name="mail" size={22} color={COLORS.amber} />
              </a>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {venue.hasWifi && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "wifi" ? null : "wifi")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={wifiIconUrl} alt="WiFi" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "wifi" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    WiFi gratuit
                  </div>
                )}
              </span>
            )}
            {venue.wheelchairAccessible && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "pmr" ? null : "pmr")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={pmrIconUrl} alt="Accès PMR" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "pmr" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    Accès PMR
                  </div>
                )}
              </span>
            )}
            {venue.canDance && (
              <span style={{ position: "relative", lineHeight: 0 }}>
                <button
                  onClick={() => setActiveAmenityTip(activeAmenityTip === "dance" ? null : "dance")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}
                >
                  <img src={danceIconUrl} alt="Danse" style={{ width: "20px", height: "20px" }} />
                </button>
                {activeAmenityTip === "dance" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "28px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: COLORS.surface,
                      border: `1.5px solid ${COLORS.paperAlt}`,
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                      zIndex: 20,
                    }}
                  >
                    Musique dansante en soirée
                  </div>
                )}
              </span>
            )}
          </div>
          {hasAmenities && hasSocials && <div style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px", marginLeft: "auto" }}>
          {venue.website && (
            <a href={normalizeUrl(venue.website)} target="_blank" rel="noreferrer" title="Site internet" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={internetIconUrl} alt="Site internet" width="20" height="20" style={{ display: "block", objectFit: "cover", filter: "invert(1)" }} />
              </span>
            </a>
          )}
          {venue.googleUrl && (
            <a href={normalizeUrl(venue.googleUrl)} target="_blank" rel="noreferrer" title="Page Google" style={{ lineHeight: 0 }}>
              <GoogleIcon size={20} />
            </a>
          )}
          {venue.whatsapp && (
            <a href={buildWhatsAppLink(venue.whatsapp)} target="_blank" rel="noreferrer" title="WhatsApp" style={{ lineHeight: 0 }}>
              <WhatsappIcon size={20} />
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
          {venue.snapchatUrl && (
            <a href={normalizeUrl(venue.snapchatUrl)} target="_blank" rel="noreferrer" title="Snapchat" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={snapchatIconUrl} alt="Snapchat" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          {venue.tripadvisorUrl && (
            <a href={normalizeUrl(venue.tripadvisorUrl)} target="_blank" rel="noreferrer" title="Tripadvisor" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={tripadvisorIconUrl} alt="Tripadvisor" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          {venue.restaurantGuruUrl && (
            <a href={normalizeUrl(venue.restaurantGuruUrl)} target="_blank" rel="noreferrer" title="Restaurant Guru" style={{ lineHeight: 0 }}>
              <span style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "50%", overflow: "hidden" }}>
                <img src={restaurantGuruIconUrl} alt="Restaurant Guru" width="20" height="20" style={{ display: "block", objectFit: "cover" }} />
              </span>
            </a>
          )}
          </div>
        </div>
        {(hasAmenities || hasSocials) && venue.venueTypes && venue.venueTypes.length > 0 && (
          <div style={{ height: "1px", background: COLORS.paperAlt, margin: "12px 0" }} />
        )}
        {venue.venueTypes && venue.venueTypes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: hasAmenities || hasSocials ? "0" : "12px" }}>
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

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ flex: 2 }} ref={hoursBlockRef}>
          <OpeningHoursDisplay googlePlaceId={venue.googlePlaceId} noGooglePresence={venue.noGooglePresence} noFixedHours={venue.noFixedHours} />
        </div>
        <button
          onClick={onManageMenu}
          style={{
            flex: 1,
            height: hoursBlockHeight ? `${hoursBlockHeight}px` : undefined,
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


      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Prochains évènements</span>
        </div>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <NavIcon name="calendar" size={26} color={COLORS.paperAlt} />
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
        </div>
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Médias</span>
        </div>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <NavIcon name="camera" size={26} color={COLORS.paperAlt} />
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
        </div>
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft }}>Produits populaires ici</span>
        </div>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <NavIcon name="star" size={26} color={COLORS.paperAlt} />
          <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "8px" }}>Bientôt disponible</p>
        </div>
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px", display: "flex", alignItems: "stretch" }}>
        <button
          onClick={onOpenCheckInsHistory}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}
        >
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes check-ins ici</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>{stats.visits || 0}</span>
            <span style={{ color: COLORS.inkSoft, fontSize: "13px" }}>→</span>
          </span>
        </button>
        <div style={{ width: "1px", background: COLORS.paperAlt, margin: "0 14px" }} />
        <button
          onClick={onOpenDrinksHistory}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}
        >
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>Tes boissons bues ici</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", color: COLORS.amber }}>{stats.drinksOrdered || 0}</span>
            <span style={{ color: COLORS.inkSoft, fontSize: "13px" }}>→</span>
          </span>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "40px" }}>
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
          Revendiquer la gérance de ce lieu
        </button>
        <button
          onClick={() => setShowActionsMenu(true)}
          title="Plus d'options"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center" }}
        >
          <NavIcon name="dots" size={26} color={COLORS.inkSoft} />
        </button>
      </div>
      {claiming && <ClaimModal entityType="venue" entityId={venue.id} entityName={venue.name} myBibroCode={myBibroCode} myUserId={myUserId} onClose={() => setClaiming(false)} />}
      {showRatingModal && <VenueRatingModal venueId={venue.id} venueName={venue.name} onClose={() => setShowRatingModal(false)} />}

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
            <button
              onClick={() => {
                setShowActionsMenu(false);
                onEdit();
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <NavIcon name="pencil" size={20} color={COLORS.amber} />
              Suggérer une modification
            </button>
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason("wrong_info");
                setReporting(true);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <ReportIcon />
              Signaler une erreur ou un changement
            </button>
            <button
              onClick={() => {
                setShowActionsMenu(false);
                setReportInitialReason(null);
                setReporting(true);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", padding: "14px 6px", fontSize: "15px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", textAlign: "left" }}
            >
              <ReportIcon />
              Signaler cette fiche
            </button>
          </div>
        </div>
      )}
      {reporting && (
        <ReportModal
          entityType="venue"
          entityId={venue.id}
          myBibroCode={myBibroCode}
          directory={venues}
          initialReason={reportInitialReason}
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
