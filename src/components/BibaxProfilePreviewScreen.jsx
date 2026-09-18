// ============================================================
// Profil public d'un Bibax — la fiche telle que la voient les autres.
//
// Un seul écran pour tous les points d'entrée : recherche, suggestions
// rapides, BibaPing, BibaPulse, notifications. Il fonctionne aussi bien pour
// un inconnu que pour un Bibax confirmé, contrairement à BibroDetailScreen
// qui s'appuie sur la liste locale de tes Bibax et sur ses sous-écrans.
//
// Ce qui manque à l'écran n'est pas un oubli : chaque champ n'arrive du
// serveur que si la personne accepte de le partager.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar } from "./ui.jsx";
import {
  NavIcon,
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  SnapchatIcon,
  WhatsappIcon,
  XIcon,
  ThreadsIcon,
  LinkedinIcon,
  PinterestIcon,
  TwitchIcon,
  CountryFlagImg,
} from "./icons.jsx";
import { normalizeUrl, formatMemberSince, formatSharedBirthDate, computeAgeFromBirthDate } from "../utils.js";
import { loadPublicProfile } from "../data/profiles.js";
import { loadBibaxCount, loadMyProfileStats, sendBibaxRequest } from "../data/sharedDirectories.js";
import bibaxIconUrl from "../assets/brand/bibax.svg";
import birthdayIconUrl from "../assets/brand/birthday-icon.png";
import residenceIconUrl from "../assets/brand/residence-icon.png";

export function BibaxProfilePreviewScreen({ bibroCode, onBack }) {
  // undefined = chargement, null = introuvable ou bloqué
  const [identity, setIdentity] = useState(undefined);
  const [bibaxCount, setBibaxCount] = useState(null);
  const [stats, setStats] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);

  useEffect(() => {
    setIdentity(undefined);
    loadPublicProfile(bibroCode).then((p) => setIdentity(p ?? null));
  }, [bibroCode]);

  // Compteurs — chargés seulement une fois l'identifiant de compte connu.
  useEffect(() => {
    if (!identity?.userId) return;
    loadBibaxCount(identity.userId).then(setBibaxCount);
    loadMyProfileStats(identity.userId).then(setStats);
  }, [identity?.userId]);

  const handleAdd = async () => {
    setAdding(true);
    const result = await sendBibaxRequest(bibroCode);
    setAdding(false);
    if (result?.error) {
      setAddResult(result.error);
      return;
    }
    setAddResult(
      result?.status === "pending"
        ? "Demande envoyée — en attente de confirmation."
        : result?.status === "already_bibax"
        ? "Vous êtes déjà Bibax."
        : "Vous êtes maintenant Bibax !"
    );
  };

  const age = identity && identity.shareAge !== false ? computeAgeFromBirthDate(identity.birthDate) : null;
  const hasSocials =
    identity &&
    (identity.facebookUrl ||
      identity.instagramUrl ||
      identity.tiktokUrl ||
      identity.snapchatUrl ||
      identity.whatsappUrl ||
      identity.xUrl ||
      identity.threadsUrl ||
      identity.linkedinUrl ||
      identity.pinterestUrl ||
      identity.twitchUrl);
  const hasInfoBlock = identity && (identity.bio || identity.birthDate || identity.city || identity.registeredAt || hasSocials);

  const StatCard = ({ label, value }) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "12px",
        padding: "8px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "9.5px", color: COLORS.ink, lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "17px", color: COLORS.amber, lineHeight: 1 }}>
        {value != null ? value : "…"}
      </span>
    </div>
  );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      {identity === undefined ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: "20px" }}>Chargement...</p>
      ) : identity === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: "20px" }}>Profil introuvable.</p>
      ) : (
        <>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", padding: "10px 16px", marginTop: "4px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <EntityAvatar photoUrl={identity.avatarUrl} size={106} fallbackIcon="user" />
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0 }}>
                  {identity.firstName || identity.displayName}
                </h1>
                {identity.lastName && (
                  <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", lineHeight: 1.25, margin: 0 }}>{identity.lastName}</h1>
                )}
                {identity.nickname && (
                  <p style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13.5px", color: COLORS.amber, margin: "3px 0 0" }}>{identity.nickname}</p>
                )}
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
              {identity.bio && <p style={{ fontSize: "13px", color: COLORS.ink, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>"{identity.bio}"</p>}
              {(identity.birthDate || identity.city) && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  {identity.birthDate && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <img src={birthdayIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                      {formatSharedBirthDate(identity.birthDate)}
                      {age != null && ` (${age} ans)`}
                    </span>
                  )}
                  {identity.birthDate && identity.city && <span style={{ fontSize: "18px", lineHeight: 1, color: COLORS.paperAlt }}>|</span>}
                  {identity.city && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <img src={residenceIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                      {identity.locality ? `${identity.city} (${identity.locality})` : identity.city}
                      {identity.country && <CountryFlagImg country={identity.country} size={14} />}
                    </span>
                  )}
                </div>
              )}
              {identity.registeredAt && <div>Sur Bibamus depuis {formatMemberSince(identity.registeredAt)}</div>}
              {hasSocials && (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                  {identity.whatsappUrl && (
                    <a href={normalizeUrl(identity.whatsappUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <WhatsappIcon size={24} />
                    </a>
                  )}
                  {identity.facebookUrl && (
                    <a href={normalizeUrl(identity.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <FacebookIcon size={24} />
                    </a>
                  )}
                  {identity.instagramUrl && (
                    <a href={normalizeUrl(identity.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <InstagramIcon size={24} />
                    </a>
                  )}
                  {identity.tiktokUrl && (
                    <a href={normalizeUrl(identity.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <TiktokIcon size={24} />
                    </a>
                  )}
                  {identity.snapchatUrl && (
                    <a href={normalizeUrl(identity.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <SnapchatIcon size={24} />
                    </a>
                  )}
                  {identity.xUrl && (
                    <a href={normalizeUrl(identity.xUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <XIcon size={24} />
                    </a>
                  )}
                  {identity.threadsUrl && (
                    <a href={normalizeUrl(identity.threadsUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <ThreadsIcon size={24} />
                    </a>
                  )}
                  {identity.linkedinUrl && (
                    <a href={normalizeUrl(identity.linkedinUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <LinkedinIcon size={24} />
                    </a>
                  )}
                  {identity.pinterestUrl && (
                    <a href={normalizeUrl(identity.pinterestUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <PinterestIcon size={24} />
                    </a>
                  )}
                  {identity.twitchUrl && (
                    <a href={normalizeUrl(identity.twitchUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <TwitchIcon size={24} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
            <button
              onClick={handleAdd}
              disabled={adding || !!addResult}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: COLORS.surface,
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "14px",
                padding: "12px 8px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: COLORS.amber,
                cursor: adding || addResult ? "default" : "pointer",
                opacity: adding ? 0.5 : 1,
              }}
            >
              <img src={bibaxIconUrl} alt="" style={{ width: "18px", height: "18px" }} />
              {addResult || (adding ? "..." : "Ajouter en Bibax")}
            </button>
            <div
              style={{
                flex: 1,
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
              {identity.mutualBibaxCount} Bibax en commun
            </div>
          </div>

          <div style={{ height: "1px", background: COLORS.paperAlt, margin: "0 0 14px" }} />

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <StatCard label="Bibax" value={bibaxCount} />
            <StatCard label="Drink Checks" value={stats ? stats.tastedDrinksCount : null} />
            <StatCard label="Place Checks" value={stats ? stats.venueCheckinsCount : null} />
          </div>
        </>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
