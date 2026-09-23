import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { setStoryPulseSharing, deleteStory, toggleStoryBix } from "../data/sharedDirectories.js";

const STORY_DURATION_MS = 5000;

// Calcule un vrai noir ou blanc contrastant avec la couleur donnée — même vrai principe que
// côté plateforme de gestion, pour les vrais tags aux couleurs inversées (fond plein).
function contrastColor(hex) {
  const h = (hex || "#F2F2E8").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140 ? "#0D1B2A" : "#F2F2E8";
}

// Vrai tag posé sur l'image d'une Story officielle — même vraie apparence que dans la
// plateforme de gestion (position en fraction du cadre, rotation, échelle, couleur, inversion,
// symbole selon le type de tag). Cliquable pour ouvrir la vraie fiche visée quand onOpen est
// fourni (jamais pour la légende — un vrai texte libre, sans fiche à ouvrir).
function StoryTagPill({ label, symbol = "#", pos, onOpen }) {
  const color = pos.color || "#F2F2E8";
  const inverted = !!pos.invert;
  return (
    <div
      onClick={
        onOpen &&
        ((e) => {
          e.stopPropagation();
          onOpen(e.currentTarget.getBoundingClientRect());
        })
      }
      style={{
        position: "absolute",
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${pos.rotation || 0}deg) scale(${pos.scale || 1})`,
        background: inverted ? color : `${color}33`,
        border: `1.5px solid ${color}`,
        borderRadius: "999px",
        padding: "6px 14px",
        fontSize: "14px",
        fontWeight: 700,
        color: inverted ? contrastColor(color) : color,
        whiteSpace: "nowrap",
        cursor: onOpen ? "pointer" : "default",
        pointerEvents: onOpen ? "auto" : "none",
      }}
    >
      {symbol ? `${symbol} ${label}` : label}
    </div>
  );
}

// Les 4 vrais tags de fiche possibles sur une Story officielle, avec leur vrai symbole propre —
// la légende ("caption" dans tagPositions) n'en a pas, vu que c'est un vrai texte libre plutôt
// qu'une référence à une fiche précise.
const OFFICIAL_TAG_TYPES = [
  { key: "venue", symbol: "@" },
  { key: "drink", symbol: "#" },
  { key: "brand", symbol: "#" },
  { key: "producer", symbol: "#" },
];

// Visionneuse plein écran — reçoit un tableau plat de Stories (une seule personne pour un
// cercle individuel sur l'accueil, ou toute la Story collective d'un BibaRoom mélangeant
// plusieurs auteurs) — chaque diapositive affiche son PROPRE auteur, jamais un auteur figé
// pour tout le lot.
export function StoryViewer({ stories, myUserId, onClose, onChanged, onOpenTag, initialIndex = 0 }) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [pendingTag, setPendingTag] = useState(null);
  const [localBix, setLocalBix] = useState({});
  const timerRef = useRef(null);

  const story = stories[index];
  const [imgFit, setImgFit] = useState("cover");
  useEffect(() => {
    setImgFit("cover");
  }, [story.id]);
  const handleImgLoad = (e) => {
    const img = e.target;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const screenRatio = window.innerWidth / window.innerHeight;
    // Proche du ratio de l'écran → remplit sans trop rogner (cover). Très différent (ex. une
    // photo panoramique sur un écran de téléphone) → contain, pour éviter une découpe excessive.
    const diff = Math.abs(imgRatio - screenRatio) / screenRatio;
    setImgFit(diff > 0.35 ? "contain" : "cover");
  };
  const isMine = story.authorId === myUserId;
  const iBixed = localBix[story.id]?.iBixed ?? story.iBixed;
  const bixCount = localBix[story.id]?.bixCount ?? story.bixCount ?? 0;

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    setProgress(0);
    setShowMenu(false);
    setPendingTag(null);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(1, (Date.now() - start) / STORY_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) goNext();
    }, 50);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const toggleSharing = async () => {
    await setStoryPulseSharing(story.id, !story.sharedToPulse);
    setShowMenu(false);
    onChanged();
  };

  const remove = async () => {
    await deleteStory(story.id);
    setShowMenu(false);
    onChanged();
    goNext();
  };

  const handleBix = () => {
    setLocalBix((prev) => ({ ...prev, [story.id]: { iBixed: !iBixed, bixCount: iBixed ? bixCount - 1 : bixCount + 1 } }));
    toggleStoryBix(story.id, iBixed);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, overflow: "hidden" }}>
      <img src={story.mediaUrl} alt="" onLoad={handleImgLoad} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: imgFit }} />

      {story.tagPositions && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
          {story.tagPositions.caption && story.caption && <StoryTagPill label={story.caption} symbol="" pos={story.tagPositions.caption} />}
          {OFFICIAL_TAG_TYPES.map((t) => {
            const label = story.tagLabels?.[t.key];
            const pos = story.tagPositions[t.key];
            const entityId = story.tagIds?.[t.key];
            if (!label || !pos) return null;
            return <StoryTagPill key={t.key} label={label} symbol={t.symbol} pos={pos} onOpen={onOpenTag && entityId ? (rect) => setPendingTag({ type: t.key, id: entityId, label, rect }) : null} />;
          })}
        </div>
      )}

      <div
        style={{ position: "absolute", inset: 0 }}
        onClick={(e) => {
          if (pendingTag) {
            setPendingTag(null);
            return;
          }
          const x = e.clientX;
          if (x < window.innerWidth / 2) goPrev();
          else goNext();
        }}
      />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "linear-gradient(rgba(0,0,0,0.55), transparent)", paddingBottom: "16px" }}>
        <div style={{ display: "flex", gap: "4px", padding: "10px 12px 0" }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: "2.5px", background: "rgba(255,255,255,0.35)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`, background: "#fff" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
          <EntityAvatar photoUrl={story.authorAvatarUrl} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", color: "#fff", fontWeight: 700, fontSize: "13.5px" }}>
              {[story.authorName, story.authorLastName].filter(Boolean).join(" ")}
            </span>
            {story.locationName && (
              <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                📍 {story.locationName}
              </span>
            )}
          </div>
          {story.contextType === "room" && (
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "4px" }}>
              <NavIcon name="ti-door-enter" size={12} color="rgba(255,255,255,0.7)" />
              via BibaRoom
            </span>
          )}
          {isMine && (
            <button onClick={() => setShowMenu((m) => !m)} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "4px" }}>
              •••
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", paddingTop: "30px" }} onClick={(e) => e.stopPropagation()}>
        {story.caption && !story.tagPositions?.caption && <p style={{ margin: "0 16px 10px", color: "#fff", fontSize: "14px", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{story.caption}</p>}
        <div style={{ display: "flex", alignItems: "center", padding: "0 16px 16px" }}>
          <button
            onClick={handleBix}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: iBixed ? "#FF2C8F" : "none",
              border: "2px solid #FF2C8F",
              borderRadius: "999px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            <NavIcon name="heart" size={17} color={iBixed ? "#fff" : "#FF2C8F"} filled={iBixed} />
            {bixCount > 0 && <span style={{ fontSize: "13px", fontWeight: 700, color: iBixed ? "#fff" : "#FF2C8F" }}>{bixCount}</span>}
          </button>
        </div>
      </div>

      {pendingTag &&
        (() => {
          const screenW = window.innerWidth;
          const tagCenterX = pendingTag.rect.left + pendingTag.rect.width / 2;
          // Devine le vrai côté d'ancrage selon la vraie zone de l'écran où se trouve le tag —
          // ancrer par un vrai bord (gauche ou droite) plutôt que toujours centrer garantit que
          // la barrette reste dans le cadre, quelle que soit sa vraie largeur réelle (qui
          // dépend du texte, donc inconnue à l'avance).
          const zone = tagCenterX < screenW * 0.3 ? "left" : tagCenterX > screenW * 0.7 ? "right" : "center";
          const barStyle =
            zone === "left"
              ? { left: `${Math.max(12, pendingTag.rect.left)}px`, transform: "translateY(calc(-100% - 4px))" }
              : zone === "right"
              ? { left: `${Math.min(screenW - 12, pendingTag.rect.right)}px`, transform: "translate(-100%, calc(-100% - 4px))" }
              : { left: `${tagCenterX}px`, transform: "translate(-50%, calc(-100% - 4px))" };
          return (
            <div
              style={{
                position: "fixed",
                top: `${pendingTag.rect.top}px`,
                ...barStyle,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(13,27,42,0.9)",
                border: "1.5px solid #F2F2E8",
                borderRadius: "999px",
                padding: "6px 6px 6px 14px",
                whiteSpace: "nowrap",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenTag(pendingTag.type, pendingTag.id, index);
              }}
            >
              <span style={{ color: "#fff", fontSize: "12.5px", fontWeight: 700 }}>{pendingTag.label}</span>
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </span>
            </div>
          );
        })()}

      {showMenu && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 210 }} onClick={() => setShowMenu(false)}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: "16px 20px 28px" }} onClick={(e) => e.stopPropagation()}>
            {story.contextType === "room" && (
              <button onClick={toggleSharing} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 0", fontSize: "14px", fontWeight: 700, color: COLORS.ink, cursor: "pointer" }}>
                {story.sharedToPulse ? "Retirer de BibaPulse" : "Partager dans BibaPulse"}
              </button>
            )}
            <button onClick={remove} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 0", fontSize: "14px", fontWeight: 700, color: COLORS.wine, cursor: "pointer" }}>
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
