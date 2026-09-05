import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";

// Barre de Stories — réutilisable pour un BibaRoom (chronologique, un cercle par auteur) et
// pour BibaPulse (chronologique aussi). Le "+" permet d'ajouter une nouvelle Story.
export function StoriesBar({ stories, onAddStory, onOpenStory, myUserId }) {
  // Groupe par auteur, en gardant l'ordre chronologique de leur PREMIÈRE Story — chaque
  // cercle ouvre la visionneuse sur l'ensemble des Stories de cet auteur, dans l'ordre.
  const byAuthor = [];
  const seen = new Map();
  stories.forEach((s) => {
    if (!seen.has(s.authorId)) {
      seen.set(s.authorId, { authorId: s.authorId, authorName: s.authorName, authorLastName: s.authorLastName, authorAvatarUrl: s.authorAvatarUrl, stories: [] });
      byAuthor.push(seen.get(s.authorId));
    }
    seen.get(s.authorId).stories.push(s);
  });

  // Le rond de l'utilisateur passe toujours en premier, peu importe l'ordre chronologique des
  // Stories elles-mêmes.
  if (myUserId) {
    const myIndex = byAuthor.findIndex((a) => a.authorId === myUserId);
    if (myIndex > 0) {
      const [mine] = byAuthor.splice(myIndex, 1);
      byAuthor.unshift(mine);
    }
  }

  return (
    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px", marginBottom: "18px" }}>
      {onAddStory && (
        <button onClick={onAddStory} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `2px dashed ${COLORS.amber}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <NavIcon name="plus" size={22} color={COLORS.amber} />
          </div>
          <span style={{ fontSize: "10.5px", color: COLORS.inkSoft }}>Ajouter</span>
        </button>
      )}
      {byAuthor.map((a) => (
        <button
          key={a.authorId}
          onClick={() => onOpenStory(a.stories)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", flexShrink: 0, maxWidth: "64px" }}
        >
          <div style={{ padding: "2px", borderRadius: "50%", border: "3px solid #FF2C8F" }}>
            <EntityAvatar photoUrl={a.authorAvatarUrl} size={58} />
          </div>
          <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, textAlign: "center", lineHeight: 1.25, maxWidth: "64px" }}>
            {[a.authorName, a.authorLastName].filter(Boolean).join(" ")}
          </span>
        </button>
      ))}
    </div>
  );
}
