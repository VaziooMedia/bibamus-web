// ============================================================
// Écrans "Mes Bibax" — liste, fiche détaillée, ajout d'un
// contact, et déverrouillage admin. Copiés tels quels depuis
// le prototype Claude.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS, COUNTRY_FLAGS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, WhatsappIcon, XIcon, ThreadsIcon, LinkedinIcon, PinterestIcon, TwitchIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, BackFooterLink, PrimaryButton, EntityAvatar, BibaxName, ActionCard } from "./ui.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { QRCodeSVG } from "./QRCodeSVG.jsx";
import { SalonQrScannerModal } from "./SalonQrScannerModal.jsx";
import { normalizeForSearch, normalizeUrl, drinkTypeLabel, formatMemberSince, formatSharedBirthDate, computeAgeFromBirthDate } from "../utils.js";
import {
  loadPendingBibaxRequests,
  loadSentBibaxRequests,
  loadBibaxSuggestions,
  respondBibaxRequest,
  sendBibaxRequest,
  cancelBibaxRequest,
  loadMutualBibaxCount,
  loadBibaxCount,
  loadMyProfileStats,
  searchBibaxByName,
} from "../data/sharedDirectories.js";
import bibaxIconUrl from "../assets/brand/bibax.svg";
import birthdayIconUrl from "../assets/brand/birthday-icon.png";
import residenceIconUrl from "../assets/brand/residence-icon.png";
import drinkChecksIconUrl from "../assets/brand/drink-checks-icon.png";
import placeChecksIconUrl from "../assets/brand/place-checks-icon.png";

// Demandes reçues (à confirmer/refuser) et suggestions (Bibax en commun, localisation
// partagée) — façon Facebook : un simple "Confirmer" ou "Ajouter" suffit.
function BibaxRequestsAndSuggestions({ onBibaxAdded, onOpenProfile, onSeeAllSuggestions }) {
  const [pending, setPending] = useState(null);
  const [sent, setSent] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [sentExpanded, setSentExpanded] = useState(true);
  const prevSentIds = useRef(null);

  const refresh = () => {
    loadPendingBibaxRequests().then(setPending);
    loadSentBibaxRequests().then((data) => {
      // Une demande envoyée qui disparaît (sans qu'on l'ait nous-même annulée) veut dire que
      // l'autre vient de la confirmer — il faut alors synchroniser ce nouveau Bibax localement,
      // pas seulement rafraîchir l'affichage des demandes.
      if (prevSentIds.current) {
        const newIds = new Set(data.map((r) => r.relationshipId));
        const disappeared = prevSentIds.current.some((id) => !newIds.has(id));
        if (disappeared) onBibaxAdded();
      }
      prevSentIds.current = data.map((r) => r.relationshipId);
      setSent(data);
    });
    loadBibaxSuggestions(3).then(setSuggestions);
  };

  useEffect(() => {
    refresh();
    // Rafraîchit périodiquement — sans ça, "Demandes envoyées" ne se met à jour que si on
    // quitte puis revient sur cet écran, laissant croire qu'une demande est encore en attente
    // alors qu'elle vient d'être confirmée par l'autre personne.
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const respond = async (relationshipId, accept) => {
    setBusyId(relationshipId);
    const result = await respondBibaxRequest(relationshipId, accept);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (accept) onBibaxAdded();
    refresh();
  };

  const addSuggestion = async (bibroCode) => {
    setBusyId(bibroCode);
    await sendBibaxRequest(bibroCode);
    setBusyId(null);
    refresh();
  };

  const cancelRequest = async (relationshipId) => {
    setBusyId(relationshipId);
    const result = await cancelBibaxRequest(relationshipId);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.alreadyAccepted) {
      alert("Trop tard — cette demande vient d'être confirmée par l'autre personne. Vous êtes déjà Bibax.");
      onBibaxAdded();
    }
    refresh();
  };

  const hasPending = pending && pending.length > 0;
  const hasSent = sent && sent.length > 0;
  const hasSuggestions = suggestions && suggestions.length > 0;
  if (!hasPending && !hasSent && !hasSuggestions) return null;

  return (
    <>
      {hasPending && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setPendingExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: pendingExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>Demandes reçues ({pending.length})</span>
            <span style={{ display: "inline-flex", marginLeft: "auto", transform: `rotate(${pendingExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {pendingExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pending.map((r) => (
              <div
                key={r.relationshipId}
                onClick={() => onOpenProfile(r.bibroCode)}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <EntityAvatar photoUrl={r.avatarUrl} size={36} />
                <BibaxName name={r.name} lastName={r.lastName} nickname={r.nickname} city={r.city} locality={r.locality} style={{ flex: 1, fontSize: "13.5px", color: COLORS.ink }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    respond(r.relationshipId, true);
                  }}
                  disabled={busyId === r.relationshipId}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.amber, border: "none", borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", flexShrink: 0 }}
                >
                  <NavIcon name="check" size={17} color={COLORS.paper} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    respond(r.relationshipId, false);
                  }}
                  disabled={busyId === r.relationshipId}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", flexShrink: 0 }}
                >
                  <NavIcon name="x" size={17} color={COLORS.inkSoft} />
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {hasSent && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setSentExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: sentExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>Demandes envoyées ({sent.length})</span>
            <span style={{ display: "inline-flex", marginLeft: "auto", transform: `rotate(${sentExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {sentExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sent.map((r) => (
              <div
                key={r.relationshipId}
                onClick={() => onOpenProfile(r.bibroCode)}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <EntityAvatar photoUrl={r.avatarUrl} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <BibaxName name={r.name} lastName={r.lastName} nickname={r.nickname} city={r.city} locality={r.locality} style={{ fontSize: "13.5px", color: COLORS.ink }} />
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>En attente de confirmation</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelRequest(r.relationshipId);
                  }}
                  disabled={busyId === r.relationshipId}
                  style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "7px 12px", fontSize: "12.5px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {hasSuggestions && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setSuggestionsExpanded((e) => !e)}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: suggestionsExpanded ? "8px" : 0, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>Suggestions rapides</span>
            {onSeeAllSuggestions && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSeeAllSuggestions();
                }}
                style={{ marginLeft: "auto", marginRight: "8px", fontSize: "12.5px", fontWeight: 400, color: COLORS.amber }}
              >
                Voir tout
              </span>
            )}
            <span style={{ display: "inline-flex", transform: `rotate(${suggestionsExpanded ? 90 : 0}deg)`, transition: "transform 0.15s ease" }}>
              <NavIcon name="chevron-right" size={14} color={COLORS.amber} />
            </span>
          </button>
          {suggestionsExpanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {suggestions.map((s) => (
                <div
                  key={s.userId}
                  onClick={() => onOpenProfile(s.bibroCode)}
                  style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                >
                  <EntityAvatar photoUrl={s.avatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <BibaxName name={s.name} lastName={s.lastName} nickname={s.nickname} city={s.city} locality={s.locality} style={{ fontSize: "13.5px", color: COLORS.ink }} />
                    <p style={{ margin: "1px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>
                      {s.mutualCount > 0 ? `${s.mutualCount} Bibax en commun` : s.distanceKm != null ? `à ${s.distanceKm} km` : ""}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addSuggestion(s.bibroCode);
                    }}
                    disabled={busyId === s.bibroCode}
                    style={{ background: "none", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "7px 12px", fontSize: "12.5px", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}
                  >
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function BibrosListScreen({ myName, profile, checkIns, myBibroCode, bibros, bibroStatuses, goToAddBibro, onJoinSalon, onViewBibro, onBack, onBibaxAdded, onOpenBibaxProfile, onSeeAllSuggestions }) {
  const [query, setQuery] = useState("");

  const q = normalizeForSearch(query.trim());
  const matchesQuery = (b) =>
    !q ||
    [b.firstName, b.lastName, b.nickname, b.alias, b.city, b.country].some((field) => normalizeForSearch(field).includes(q));

  const sortedBibros = [...bibros].filter(matchesQuery).sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return (a.alias || a.name).localeCompare(b.alias || b.name);
  });

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: "4px 0 0 0", lineHeight: 1.2, display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={bibaxIconUrl} alt="" style={{ width: "24px", height: "24px" }} />
          <span>
            <span style={{ color: COLORS.ink }}>Mes Biba</span>
            <span style={{ color: COLORS.amber }}>x</span>
          </span>
        </h1>
        <span
          style={{
            fontFamily: "'Urbanist', sans-serif",
            fontSize: "28px",
            color: COLORS.amberDark,
            fontWeight: 700,
            background: COLORS.paperAlt,
            border: `2px solid ${COLORS.amberDark}`,
            borderRadius: "10px",
            padding: "2px 14px",
          }}
        >
          {bibros.length}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          onClick={goToAddBibro}
          title="Ajouter un Bibax"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: COLORS.amber,
            border: "none",
            color: COLORS.paper,
            fontSize: "24px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>

      <BibaxRequestsAndSuggestions onBibaxAdded={onBibaxAdded || (() => {})} onOpenProfile={onOpenBibaxProfile || (() => {})} onSeeAllSuggestions={onSeeAllSuggestions} />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher : prénom, nom, surnom, ville..."
        style={{ padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "16px" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {bibros.length === 0 && (
          <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Pas encore de Bibax — ajoutez-en un avec son code.</p>
        )}
        {bibros.length > 0 && sortedBibros.length === 0 && (
          <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun Bibax ne correspond à cette recherche.</p>
        )}
        {sortedBibros.map((b) => {
          const status = bibroStatuses[b.code];
          return (
            <div
              key={b.code}
              onClick={() => onViewBibro(b.code)}
              style={{ background: COLORS.surface, border: `2px solid ${status ? COLORS.amber : COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: COLORS.surfaceAlt,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "19px",
                      flexShrink: 0,
                      marginTop: "1px",
                      overflow: "hidden",
                    }}
                  >
                    {b.avatarUrl ? <img src={b.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={19} color={COLORS.amber} />}
                  </div>
                  <div>
                    <BibaxName name={b.firstName || b.name} lastName={b.lastName} nickname={b.nickname} city={b.city} locality={b.locality} country={b.country} style={{ fontSize: "15px" }} />
                  </div>
                </div>
              </div>

              {status && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}`, display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: "13px" }}>
                    🎉 En soirée : <strong>{status.activeSalonName}</strong>
                  </span>
                  <button
                    onClick={() => onJoinSalon(status.activeSalonCode)}
                    style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "7px 12px", fontWeight: 700, fontSize: "12.5px", cursor: "pointer", color: COLORS.paper }}
                  >
                    Rejoindre
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BackFooterLink onClick={onBack} />
    </div>
  );
}

export function BibroDetailScreen({ bibro, myUserId, onBack, previewNotice, onRemove, goToBibaxPhotos, onBlock }) {
  const [mutualCount, setMutualCount] = useState(null);
  const [bibaxCount, setBibaxCount] = useState(null);
  const [stats, setStats] = useState(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!bibro?.userId) return;
    loadMutualBibaxCount(bibro.userId).then(setMutualCount);
    loadBibaxCount(bibro.userId).then(setBibaxCount);
    loadMyProfileStats(bibro.userId).then(setStats);
  }, [bibro?.userId]);

  const age = bibro.shareAge !== false ? computeAgeFromBirthDate(bibro.birthDate) : null;
  const hasSocials = bibro.facebookUrl || bibro.instagramUrl || bibro.tiktokUrl || bibro.snapchatUrl || bibro.whatsappUrl || bibro.xUrl || bibro.threadsUrl || bibro.linkedinUrl || bibro.pinterestUrl || bibro.twitchUrl;
  const hasInfoBlock = bibro.bio || bibro.birthDate || bibro.city || bibro.registeredAt || hasSocials;

  const StatCard = ({ icon, label, value, onClick }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "14px",
        padding: "12px",
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {icon}
        {onClick && (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${COLORS.amber}` }}>
            <NavIcon name="chevron-right" size={10} color={COLORS.amber} />
          </span>
        )}
      </div>
      <span style={{ fontSize: "11px", color: COLORS.ink, lineHeight: 1.2, height: "27px", display: "flex", alignItems: "center" }}>{label}</span>
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", color: COLORS.amber, lineHeight: 1 }}>{value != null ? value : "…"}</span>
    </button>
  );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      {previewNotice && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: COLORS.inkSoft }}>
          {previewNotice}
        </div>
      )}

      <div style={{ position: "relative", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "16px", marginTop: "4px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <div
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "50%",
              border: `2px solid ${COLORS.amber}`,
              padding: "2px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: COLORS.paperAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {bibro.avatarUrl ? <img src={bibro.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="user" size={48} color={COLORS.amber} />}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0 }}>{bibro.name}</h1>
            {bibro.lastName && <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0 }}>{bibro.lastName}</h1>}
            {bibro.nickname && <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13.5px", color: COLORS.amber, margin: "3px 0 0" }}>{bibro.nickname}</p>}
          </div>
        </div>
      </div>

      {hasInfoBlock && (
        <div
          style={{
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12.5px",
            color: COLORS.inkSoft,
          }}
        >
          {bibro.bio && <p style={{ fontSize: "13px", color: COLORS.ink, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>"{bibro.bio}"</p>}
          {(bibro.birthDate || bibro.city) && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {bibro.birthDate && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <img src={birthdayIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                  {formatSharedBirthDate(bibro.birthDate)}
                  {age != null && ` (${age} ans)`}
                </span>
              )}
              {bibro.birthDate && bibro.city && <span style={{ fontSize: "18px", lineHeight: 1, color: COLORS.paperAlt }}>|</span>}
              {bibro.city && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <img src={residenceIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                  {bibro.city} {COUNTRY_FLAGS[bibro.country] || ""}
                </span>
              )}
            </div>
          )}
          {bibro.registeredAt && <div>Sur Bibamus depuis {formatMemberSince(bibro.registeredAt)}</div>}
          {hasSocials && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
              {bibro.facebookUrl && (
                <a href={normalizeUrl(bibro.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <FacebookIcon size={24} />
                </a>
              )}
              {bibro.instagramUrl && (
                <a href={normalizeUrl(bibro.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <InstagramIcon size={24} />
                </a>
              )}
              {bibro.tiktokUrl && (
                <a href={normalizeUrl(bibro.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TiktokIcon size={24} />
                </a>
              )}
              {bibro.snapchatUrl && (
                <a href={normalizeUrl(bibro.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <SnapchatIcon size={24} />
                </a>
              )}
              {bibro.whatsappUrl && (
                <a href={normalizeUrl(bibro.whatsappUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <WhatsappIcon size={24} />
                </a>
              )}
              {bibro.xUrl && (
                <a href={normalizeUrl(bibro.xUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <XIcon size={24} />
                </a>
              )}
              {bibro.threadsUrl && (
                <a href={normalizeUrl(bibro.threadsUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <ThreadsIcon size={24} />
                </a>
              )}
              {bibro.linkedinUrl && (
                <a href={normalizeUrl(bibro.linkedinUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <LinkedinIcon size={24} />
                </a>
              )}
              {bibro.pinterestUrl && (
                <a href={normalizeUrl(bibro.pinterestUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <PinterestIcon size={24} />
                </a>
              )}
              {bibro.twitchUrl && (
                <a href={normalizeUrl(bibro.twitchUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TwitchIcon size={24} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <button
          onClick={onRemove}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "14px",
            padding: "12px 8px",
            fontSize: "12.5px",
            fontWeight: 700,
            color: COLORS.amber,
            cursor: "pointer",
          }}
        >
          <NavIcon name="check" size={14} color={COLORS.amber} />
          Bibax
        </button>
        <div
          style={{
            flex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "14px",
            padding: "12px 8px",
            fontSize: "12.5px",
            color: COLORS.inkSoft,
            textAlign: "center",
          }}
        >
          <img src={bibaxIconUrl} alt="" style={{ width: "18px", height: "18px" }} />
          {mutualCount != null ? mutualCount : "…"} Bibax en commun
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <StatCard icon={<img src={bibaxIconUrl} alt="" style={{ width: "18px", height: "18px" }} />} label="Bibax" value={bibaxCount} />
        <StatCard icon={<img src={drinkChecksIconUrl} alt="" style={{ width: "18px", height: "18px" }} />} label="Drink Checks" value={stats ? stats.tastedDrinksCount : null} />
        <StatCard icon={<img src={placeChecksIconUrl} alt="" style={{ width: "18px", height: "18px" }} />} label="Place Checks" value={stats ? stats.venueCheckinsCount : null} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <ActionCard icon={<NavIcon name="crown" size={20} color={COLORS.amber} />} title="BibaClub" disabled badge="Bientôt" />
        <ActionCard icon={<NavIcon name="bar-chart" size={20} color={COLORS.amber} />} title="Statistiques" disabled badge="Bientôt" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <ActionCard icon={<NavIcon name="calendar" size={20} color={COLORS.amber} />} title="Historique" disabled badge="Bientôt" />
        <ActionCard icon={<NavIcon name="camera" size={20} color={COLORS.amber} />} title="Photos" onClick={() => goToBibaxPhotos && goToBibaxPhotos(bibro.userId, bibro.name)} />
      </div>

      {onBlock && (
        <div style={{ marginTop: "18px" }}>
          {confirmingBlock ? (
            <>
              <p style={{ fontSize: "13px", color: "#FF3B3B", marginBottom: "10px", textAlign: "center" }}>
                Bloquer {bibro.name} ? Votre lien Bibax sera supprimé et vous ne pourrez plus vous ajouter mutuellement.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setConfirmingBlock(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontWeight: 700, cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    setBlocking(true);
                    await onBlock(bibro.userId);
                    setBlocking(false);
                  }}
                  disabled={blocking}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "2px solid #FF3B3B", background: "none", color: "#FF3B3B", fontWeight: 700, cursor: "pointer" }}
                >
                  {blocking ? "..." : "Confirmer le blocage"}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setConfirmingBlock(true)}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "2px solid #FF3B3B", background: "none", color: "#FF3B3B", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
            >
              Bloquer {bibro.name}
            </button>
          )}
        </div>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
export function AddBibroScreen({ onAdd, onLookup, onCancel, myBibroCode, bibros = [] }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notFound
  const [foundName, setFoundName] = useState("");
  const [foundSocials, setFoundSocials] = useState({});
  const [mutualBibaxCount, setMutualBibaxCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState([]);
  const [nameSearching, setNameSearching] = useState(false);

  useEffect(() => {
    if (nameQuery.trim().length < 2) {
      setNameResults([]);
      return;
    }
    setNameSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchBibaxByName(nameQuery.trim());
      setNameResults(results);
      setNameSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [nameQuery]);

  const selectNameResult = (result) => {
    setNameQuery("");
    setNameResults([]);
    setCode(result.bibroCode);
    handleLookup(result.bibroCode);
  };

  const alreadyBibax = status === "found" && bibros.some((b) => b.code === code.trim().toUpperCase());

  const handleLookup = async (explicitCode) => {
    const codeToUse = explicitCode || code;
    if (codeToUse.trim().length !== 5) return;
    setStatus("loading");
    const identity = await onLookup(codeToUse.trim());
    if (identity && identity.displayName) {
      setFoundName(identity.displayName);
      setFoundSocials({
        avatarUrl: identity.avatarUrl || null,
        firstName: identity.firstName || "",
        lastName: identity.lastName || "",
        nickname: identity.nickname || "",
        city: identity.city || "",
        country: identity.country || "",
        facebookUrl: identity.facebookUrl || "",
        instagramUrl: identity.instagramUrl || "",
        tiktokUrl: identity.tiktokUrl || "",
        snapchatUrl: identity.snapchatUrl || "",
        whatsappUrl: identity.whatsappUrl || "",
        xUrl: identity.xUrl || "",
        threadsUrl: identity.threadsUrl || "",
        linkedinUrl: identity.linkedinUrl || "",
        pinterestUrl: identity.pinterestUrl || "",
        twitchUrl: identity.twitchUrl || "",
      });
      setMutualBibaxCount(identity.mutualBibaxCount || 0);
      setStatus("found");
    } else {
      setStatus("notFound");
    }
  };

  const handleCodeChange = (value) => {
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5));
    setStatus("idle");
  };

  const handleScanned = (scannedCode) => {
    setScanning(false);
    setCode(scannedCode);
    handleLookup(scannedCode);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Ajouter un Biba<span style={{ color: COLORS.amber }}>x</span>
        </h1>
      </div>

      <div style={{ position: "relative", marginTop: "22px", marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "12px 14px",
            boxSizing: "border-box",
          }}
        >
          <NavIcon name="search" size={17} color={COLORS.inkSoft} />
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Rechercher un Bibax..."
            style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
          />
        </div>

        {nameQuery.trim().length >= 2 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 5,
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "10px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {nameSearching && <p style={{ fontSize: "13px", color: COLORS.inkSoft, padding: "12px 14px", margin: 0 }}>Recherche...</p>}
            {!nameSearching && nameResults.length === 0 && (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Aucun Bibax trouvé.</p>
            )}
            {!nameSearching &&
              nameResults.map((r) => (
                <button
                  key={r.bibroCode}
                  onClick={() => selectNameResult(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderBottom: `1px solid ${COLORS.paperAlt}`,
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {r.avatarUrl ? <img src={r.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={18} color={COLORS.amber} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.ink }}>
                      {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.displayName}
                    </div>
                    {r.nickname && <div style={{ fontSize: "11.5px", fontStyle: "italic", color: COLORS.amber }}>{r.nickname}</div>}
                    {r.city && (
                      <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, display: "flex", alignItems: "center", gap: "4px" }}>
                        {r.city}
                        {r.country && COUNTRY_FLAGS[r.country] && <span>{COUNTRY_FLAGS[r.country]}</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 24px" }} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Code Bibax</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: 0 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            padding: "0 14px",
            boxSizing: "border-box",
          }}
        >
          <input
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="00000"
            maxLength={5}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "14px 0",
              border: "none",
              background: "none",
              fontSize: "20px",
              fontFamily: "'Urbanist', sans-serif",
              letterSpacing: "4px",
              textAlign: "center",
              outline: "none",
              color: COLORS.ink,
            }}
          />
          <span style={{ width: "1px", height: "24px", background: COLORS.paperAlt, flexShrink: 0 }} />
          <button
            onClick={() => setScanning(true)}
            title="Scanner un QR code Bibax"
            style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
          >
            <NavIcon name="scan-line" size={18} color={COLORS.amber} />
          </button>
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={code.length !== 5 || status === "loading"}
          style={{
            background: code.length === 5 ? COLORS.amber : COLORS.surfaceAlt,
            color: code.length === 5 ? COLORS.paper : COLORS.chalkWhite,
            border: "none",
            borderRadius: "10px",
            padding: "0 18px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: code.length !== 5 ? "default" : "pointer",
            opacity: code.length !== 5 ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "..." : "Chercher"}
        </button>
      </div>

      {scanning && (
        <SalonQrScannerModal
          onClose={() => setScanning(false)}
          onScanned={handleScanned}
          title="Scanner un QR code Bibax"
          instruction="Visez le QR code affiché sur le profil d'un Bibax"
        />
      )}

      <div style={{ height: "1px", background: COLORS.paperAlt, margin: "24px 0" }} />

      {status !== "found" && status !== "notFound" && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", margin: 0 }}>Bibax recherché</p>
      )}

      {status === "found" && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "14px 16px", position: "relative" }}>
          {alreadyBibax ? (
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: COLORS.ink }}>Bibax</span>
              <span style={{ color: COLORS.amber }}>✓</span>
            </div>
          ) : (
            <button
              onClick={async () => {
                const result = await onAdd(code.trim(), foundName, "", foundSocials);
                if (result?.error) return;
                if (result?.status === "pending") {
                  alert(`Demande envoyée à ${foundName} — en attente de sa confirmation.`);
                } else if (result?.status === "already_bibax") {
                  alert(`Vous êtes déjà Bibax avec ${foundName}.`);
                } else if (result?.status === "accepted") {
                  alert(`${foundName} avait déjà envoyé une demande — vous êtes maintenant Bibax !`);
                }
                onCancel();
              }}
              title={`Ajouter ${foundName || "ce Bibax"}`}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: COLORS.amber,
                border: "none",
                color: COLORS.paper,
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: COLORS.surfaceAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {foundSocials.avatarUrl ? <img src={foundSocials.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NavIcon name="default-avatar" size={26} color={COLORS.amber} />}
            </div>
            <div style={{ paddingRight: "36px" }}>
              <div style={{ fontSize: "17px", fontWeight: 700 }}>
                {foundSocials.firstName || foundSocials.lastName ? [foundSocials.firstName, foundSocials.lastName].filter(Boolean).join(" ") : foundName}
              </div>
              {(foundSocials.nickname || foundSocials.city) && (
                <div style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "2px", lineHeight: 1.6 }}>
                  {foundSocials.nickname && <div style={{ color: COLORS.amber, fontWeight: 700 }}>{foundSocials.nickname}</div>}
                  {foundSocials.city && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      {foundSocials.city}
                      {foundSocials.country && COUNTRY_FLAGS[foundSocials.country] && <span>{COUNTRY_FLAGS[foundSocials.country]}</span>}
                    </div>
                  )}
                  {mutualBibaxCount > 0 && (
                    <div style={{ marginTop: "2px" }}>
                      {mutualBibaxCount} Bibax en commun
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "notFound" && (
        <p style={{ fontSize: "13px", color: COLORS.wine, marginBottom: 0 }}>
          Code introuvable. Vérifie qu'il·elle a bien ouvert l'app et configuré son profil.
        </p>
      )}

      {myBibroCode && (
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Ton code Bibax</div>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QRCodeSVG value={myBibroCode} size={72} color={COLORS.paper} background={COLORS.ink} />
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "26px", letterSpacing: "4px", marginTop: "10px" }}>{myBibroCode}</div>
          </div>
        </div>
      )}

      <PageFooterNav onBack={onCancel} hideBorder />
    </div>
  );
}

export function AdminUnlockScreen({ onCancel }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 18px 0" }}>Accès administrateur</h1>
      <p style={{ fontSize: "14px", color: COLORS.inkSoft, marginBottom: "12px" }}>
        Le statut administrateur est désormais automatique, lié à votre compte — il n'y a plus de passphrase à saisir. Si vous pensez devoir y avoir accès, contactez un administrateur existant
        pour qu'il vous l'attribue.
      </p>
      <PageFooterNav onBack={onCancel} />
    </div>
  );
}
