import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { SectionTitle } from "./ui.jsx";
import { normalizeUrl } from "../utils.js";

// BibaMusic (Phase 1) — playlist collaborative de soirée, sans intégration Spotify. Chacun
// propose un morceau (titre + lien facultatif, collé à la main), Bix les propositions des
// autres, la liste s'ordonne par popularité. Une vraie connexion Spotify (recherche dans le
// catalogue, création automatique de playlist) viendra dans une phase séparée.
export function BibaMusicSection({ event, updateEvent, myBibroCode, myName, open: openProp, onOpenChange, sectionRef }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp != null ? openProp : openInternal;
  const setOpen = (value) => {
    const next = typeof value === "function" ? value(open) : value;
    if (onOpenChange) onOpenChange(next);
    else setOpenInternal(next);
  };
  const [titleInput, setTitleInput] = useState("");
  const [linkInput, setLinkInput] = useState("");

  const playlist = event.playlist || [];
  const sorted = [...playlist].sort((a, b) => (b.bix || []).length - (a.bix || []).length || a.createdAt - b.createdAt);

  const proposeSong = () => {
    const title = titleInput.trim();
    if (!title) return;
    const song = {
      id: `song-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title,
      link: linkInput.trim() || null,
      proposedByCode: myBibroCode,
      proposedByName: myName,
      bix: [],
      createdAt: Date.now(),
    };
    updateEvent(event.id, (e) => ({ ...e, playlist: [...(e.playlist || []), song] }));
    setTitleInput("");
    setLinkInput("");
  };

  const toggleBix = (songId) => {
    updateEvent(event.id, (e) => ({
      ...e,
      playlist: (e.playlist || []).map((s) => {
        if (s.id !== songId) return s;
        const bix = s.bix || [];
        const already = bix.includes(myBibroCode);
        return { ...s, bix: already ? bix.filter((c) => c !== myBibroCode) : [...bix, myBibroCode] };
      }),
    }));
  };

  const removeSong = (songId) => {
    updateEvent(event.id, (e) => ({ ...e, playlist: (e.playlist || []).filter((s) => s.id !== songId) }));
  };

  return (
    <div ref={sectionRef} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "14px", color: COLORS.ink }}>
            BibaMusic {playlist.length > 0 ? `(${playlist.length})` : ""}
          </span>
        </span>
        <span style={{ display: "inline-flex", transform: `rotate(${open ? -90 : 180}deg)`, transition: "transform 0.15s ease" }}>
          <NavIcon name="back-triangle" size={18} color={COLORS.amber} />
        </span>
      </button>

      {open && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && proposeSong()}
              placeholder="Titre — Artiste"
              style={{ padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && proposeSong()}
                placeholder="Lien Spotify/YouTube (facultatif)"
                style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
              />
              <button
                onClick={proposeSong}
                disabled={!titleInput.trim()}
                style={{
                  background: COLORS.amber,
                  border: "none",
                  borderRadius: "8px",
                  padding: "0 16px",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: COLORS.paper,
                  cursor: "pointer",
                  opacity: titleInput.trim() ? 1 : 0.5,
                }}
              >
                Proposer
              </button>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun morceau proposé pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sorted.map((s) => {
                const bixCount = (s.bix || []).length;
                const iBixed = (s.bix || []).includes(myBibroCode);
                const isMine = s.proposedByCode === myBibroCode;
                return (
                  <div key={s.id} style={{ background: COLORS.surfaceAlt, borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: COLORS.inkSoft }}>
                        Proposé par {s.proposedByName || "quelqu'un"}
                        {s.link && (
                          <>
                            {" · "}
                            <a href={normalizeUrl(s.link)} target="_blank" rel="noreferrer" style={{ color: COLORS.amber }}>
                              Ouvrir
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleBix(s.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: iBixed ? COLORS.amber : "none",
                        border: `2px solid ${COLORS.amber}`,
                        borderRadius: "999px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: iBixed ? COLORS.paper : COLORS.amber,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      ♥ {bixCount}
                    </button>
                    {isMine && (
                      <button onClick={() => removeSong(s.id)} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
