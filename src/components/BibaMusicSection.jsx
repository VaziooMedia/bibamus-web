import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { normalizeUrl } from "../utils.js";
import {
  getMySpotifyStatus,
  getMySpotifyConnection,
  ensureFreshSpotifyToken,
  searchSpotifyTracks,
  createSpotifyPlaylist,
  addTrackToSpotifyPlaylist,
} from "../data/spotify.js";

// BibaMusic (Phase 2) — playlist collaborative de soirée. Chacun propose un morceau, soit en
// le cherchant directement dans le catalogue Spotify (si son compte est connecté), soit à la
// main (titre + lien facultatif). Le Bibroom peut créer sa propre playlist Spotify partagée,
// dans laquelle n'importe quel morceau proposé avec un identifiant Spotify peut être ajouté.
export function BibaMusicSection({ event, updateEvent, myBibroCode, myName, myUserId, open: openProp, onOpenChange, sectionRef }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp != null ? openProp : openInternal;
  const setOpen = (value) => {
    const next = typeof value === "function" ? value(open) : value;
    if (onOpenChange) onOpenChange(next);
    else setOpenInternal(next);
  };

  const [titleInput, setTitleInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const searchDebounce = useRef(null);

  useEffect(() => {
    getMySpotifyStatus().then((s) => setSpotifyConnected(!!s.connected));
  }, []);

  const playlist = event.playlist || [];
  const sorted = [...playlist].sort((a, b) => (b.bix || []).length - (a.bix || []).length || a.createdAt - b.createdAt);

  const runSearch = (query) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      const token = await ensureFreshSpotifyToken(myUserId);
      if (token) setSearchResults(await searchSpotifyTracks(token, query));
      setSearching(false);
    }, 400);
  };

  const addSong = (song) => {
    updateEvent(event.id, (e) => ({
      ...e,
      playlist: [
        ...(e.playlist || []),
        { id: `song-${Date.now()}-${Math.floor(Math.random() * 10000)}`, proposedByCode: myBibroCode, proposedByName: myName, bix: [], createdAt: Date.now(), ...song },
      ],
    }));
  };

  const proposeFromSearch = (track) => {
    addSong({ title: track.title, artist: track.artist, link: track.link, spotifyUri: track.spotifyUri, albumArt: track.albumArt });
    setTitleInput("");
    setSearchResults([]);
  };

  const proposeManual = () => {
    const title = titleInput.trim();
    if (!title) return;
    addSong({ title, link: linkInput.trim() || null });
    setTitleInput("");
    setLinkInput("");
    setSearchResults([]);
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

  const createPlaylist = async () => {
    setCreatingPlaylist(true);
    const token = await ensureFreshSpotifyToken(myUserId);
    const connection = await getMySpotifyConnection(myUserId);
    if (!token || !connection?.spotify_user_id) {
      setCreatingPlaylist(false);
      alert("Connexion Spotify indisponible — reconnectez votre compte depuis Mes infos.");
      return;
    }
    const result = await createSpotifyPlaylist(token, connection.spotify_user_id, `Bibamus — ${event.name}`);
    setCreatingPlaylist(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    updateEvent(event.id, (e) => ({ ...e, spotifyPlaylistId: result.playlistId, spotifyPlaylistUrl: result.playlistUrl }));
  };

  const addToPlaylist = async (song) => {
    if (!event.spotifyPlaylistId) return;
    setAddingId(song.id);
    const token = await ensureFreshSpotifyToken(myUserId);
    if (token) await addTrackToSpotifyPlaylist(token, event.spotifyPlaylistId, song.spotifyUri);
    setAddingId(null);
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
          {/* Playlist Spotify du Bibroom */}
          <div style={{ marginBottom: "14px" }}>
            {event.spotifyPlaylistUrl ? (
              <a
                href={event.spotifyPlaylistUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: COLORS.amber,
                  borderRadius: "8px",
                  padding: "9px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: COLORS.paper,
                  textDecoration: "none",
                }}
              >
                Ouvrir la playlist dans Spotify
              </a>
            ) : spotifyConnected ? (
              <button
                onClick={createPlaylist}
                disabled={creatingPlaylist}
                style={{ background: "none", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 700, color: COLORS.amber, cursor: "pointer", width: "100%" }}
              >
                {creatingPlaylist ? "Création..." : "Créer la playlist Spotify du Bibroom"}
              </button>
            ) : (
              <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Connectez Spotify depuis "Mes infos" pour créer une vraie playlist partagée.</p>
            )}
          </div>

          {/* Proposition d'un morceau */}
          <div style={{ marginBottom: "14px", position: "relative" }}>
            <input
              value={titleInput}
              onChange={(e) => {
                setTitleInput(e.target.value);
                if (spotifyConnected) runSearch(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && !spotifyConnected && proposeManual()}
              placeholder={spotifyConnected ? "Chercher un titre sur Spotify..." : "Titre — Artiste"}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
            />

            {spotifyConnected && searchResults.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {searchResults.map((track) => (
                  <button
                    key={track.spotifyTrackId}
                    onClick={() => proposeFromSearch(track)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", background: COLORS.surfaceAlt, border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", textAlign: "left" }}
                  >
                    {track.albumArt && <img src={track.albumArt} alt="" style={{ width: "32px", height: "32px", borderRadius: "4px", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {spotifyConnected && searching && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "6px" }}>Recherche...</p>}

            {!spotifyConnected && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && proposeManual()}
                  placeholder="Lien Spotify/YouTube (facultatif)"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
                />
                <button
                  onClick={proposeManual}
                  disabled={!titleInput.trim()}
                  style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "0 16px", fontWeight: 700, fontSize: "13px", color: COLORS.paper, cursor: "pointer", opacity: titleInput.trim() ? 1 : 0.5 }}
                >
                  Proposer
                </button>
              </div>
            )}
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
                    {s.albumArt && <img src={s.albumArt} alt="" style={{ width: "36px", height: "36px", borderRadius: "5px", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title}
                        {s.artist ? ` — ${s.artist}` : ""}
                      </p>
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
                        {event.spotifyPlaylistId && s.spotifyUri && (
                          <>
                            {" · "}
                            <button onClick={() => addToPlaylist(s)} disabled={addingId === s.id} style={{ background: "none", border: "none", color: COLORS.amber, fontSize: "11px", cursor: "pointer", padding: 0 }}>
                              {addingId === s.id ? "Ajout..." : "+ Playlist"}
                            </button>
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
