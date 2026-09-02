import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, EntityAvatar, BibaxName } from "./ui.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon, WhatsappIcon, XIcon, ThreadsIcon, LinkedinIcon } from "./icons.jsx";
import { normalizeUrl } from "../utils.js";
import { lookupBibroCode } from "../data/sharedDirectories.js";

// Aperçu léger du profil d'un Bibax par son code — utilisé pour contrôler qui est quelqu'un
// avant de confirmer une demande ou d'accepter une suggestion, sans devoir déjà être Bibax
// avec cette personne pour voir son profil.
export function BibaxProfilePreviewScreen({ bibroCode, onBack }) {
  const [identity, setIdentity] = useState(undefined); // undefined = chargement, null = introuvable

  useEffect(() => {
    lookupBibroCode(bibroCode).then(setIdentity);
  }, [bibroCode]);

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      {identity === undefined ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: "20px" }}>Chargement...</p>
      ) : identity === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic", marginTop: "20px" }}>Profil introuvable.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "12px" }}>
          <EntityAvatar photoUrl={identity.avatarUrl} size={96} />
          <div style={{ marginTop: "14px" }}>
            <BibaxName name={identity.firstName} lastName={identity.lastName} nickname={identity.nickname} city={identity.city} locality={identity.locality} style={{ fontSize: "20px" }} />
          </div>
          {(identity.city || identity.country) && (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "4px" }}>{[identity.city, identity.country].filter(Boolean).join(", ")}</p>
          )}

          {(identity.facebookUrl ||
            identity.instagramUrl ||
            identity.tiktokUrl ||
            identity.snapchatUrl ||
            identity.whatsappUrl ||
            identity.xUrl ||
            identity.threadsUrl ||
            identity.linkedinUrl) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "18px" }}>
              {identity.facebookUrl && (
                <a href={normalizeUrl(identity.facebookUrl)} target="_blank" rel="noreferrer">
                  <FacebookIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.instagramUrl && (
                <a href={normalizeUrl(identity.instagramUrl)} target="_blank" rel="noreferrer">
                  <InstagramIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.tiktokUrl && (
                <a href={normalizeUrl(identity.tiktokUrl)} target="_blank" rel="noreferrer">
                  <TiktokIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.snapchatUrl && (
                <a href={normalizeUrl(identity.snapchatUrl)} target="_blank" rel="noreferrer">
                  <SnapchatIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.whatsappUrl && (
                <a href={normalizeUrl(identity.whatsappUrl)} target="_blank" rel="noreferrer">
                  <WhatsappIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.xUrl && (
                <a href={normalizeUrl(identity.xUrl)} target="_blank" rel="noreferrer">
                  <XIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.threadsUrl && (
                <a href={normalizeUrl(identity.threadsUrl)} target="_blank" rel="noreferrer">
                  <ThreadsIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
              {identity.linkedinUrl && (
                <a href={normalizeUrl(identity.linkedinUrl)} target="_blank" rel="noreferrer">
                  <LinkedinIcon size={26} color={COLORS.inkSoft} />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
