import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { setStoryPulseSharing, deleteStory } from "../data/sharedDirectories.js";

const STORY_DURATION_MS = 5000;

// Visionneuse plein écran — défile automatiquement entre les Stories d'un même auteur, appui
// à gauche/droite pour naviguer manuellement. Affiche le contexte d'origine (BibaRoom) quand
// la Story vient d'un salon partagé dans BibaPulse.
export function StoryViewer({ author, myUserId, onClose, onChanged }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const timerRef = useRef(null);

  const story = author.stories[index];
  const isMine = story.authorId === myUserId;

  const goNext = () => {
    if (index < author.stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    setProgress(0);
    setShowMenu(false);
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: "4px", padding: "10px 12px 0" }}>
        {author.stories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: "2.5px", background: "rgba(255,255,255,0.35)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`, background: "#fff" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }}>
        <EntityAvatar photoUrl={author.authorAvatarUrl} size={32} />
        <span style={{ color: "#fff", fontWeight: 700, fontSize: "13.5px", flex: 1 }}>{author.authorName}</span>
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

      <div style={{ position: "relative", flex: 1 }} onClick={(e) => { const x = e.clientX; if (x < window.innerWidth / 2) goPrev(); else goNext(); }}>
        <img src={story.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {story.caption && (
          <p style={{ position: "absolute", bottom: "20px", left: "16px", right: "16px", color: "#fff", fontSize: "14px", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{story.caption}</p>
        )}
      </div>

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
