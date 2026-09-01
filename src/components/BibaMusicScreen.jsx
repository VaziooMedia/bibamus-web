import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { normalizeUrl } from "../utils.js";
import {
  getMySpotifyStatus,
  ensureFreshSpotifyToken,
  searchSpotifyTracks,
  createSpotifyPlaylist,
  addTrackToSpotifyPlaylist,
  getCurrentlyPlaying,
} from "../data/spotify.js";

// BibaMusic — page à part entière du BibaRoom, dédiée à la playlist collaborative de soirée.
// Chacun propose un morceau (recherche directe dans Spotify si connecté, sinon à la main),
// Bix les propositions des autres. Une vraie playlist Spotify peut être créée pour le
// Bibroom, avec le lecteur officiel Spotify intégré (aucune lecture "maison" — juste le
// widget officiel de Spotify, affiché directement dans la page).
export function BibaMusicScreen({ event, updateEvent, myBibroCode, myName, myUserId, onBack }) {
  const [titleInput, setTitleInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [nowPlayingDebug, setNowPlayingDebug] = useState(null);
  const searchDebounce = useRef(null);

  useEffect(() => {
    getMySpotifyStatus().then((s) => setSpotifyConnected(!!s.connected));
  }, []);

  // Vérifie périodiquement ce qui joue sur MON appareil — ne remonte l'info que si ce morceau
  // fait partie de la playlist proposée par le groupe (sinon, ce serait juste ma propre écoute
  // personnelle, sans rapport avec le Bibroom). Marque aussi le morceau précédent comme "déjà
  // joué" dès que la lecture passe au suivant.
  useEffect(() => {
    if (!spotifyConnected) return;
    const poll = async () => {
      const token = await ensureFreshSpotifyToken(myUserId);
      if (!token) {
        setNowPlayingDebug("Pas de jeton Spotify valide.");
        return;
      }
      const current = await getCurrentlyPlaying(token);
      if (current?.error) {
        setNowPlayingDebug(current.error);
        return;
      }
      if (!current?.uri) {
        setNowPlayingDebug("Aucun morceau détecté.");
        return;
      }
      const matchingSong = (event.playlist || []).find((s) => s.spotifyUri === current.uri);
      if (!matchingSong) {
        setNowPlayingDebug(`Morceau en cours (${current.uri}) ne correspond à aucune proposition Bibamus.`);
        return;
      }
      setNowPlayingDebug(null);
      updateEvent(event.id, (e) => {
        if (e.nowPlayingUri === current.uri) return e;
        const playedUris = new Set(e.playedUris || []);
        if (e.nowPlayingUri) playedUris.add(e.nowPlayingUri);
        return {
          ...e,
          nowPlayingUri: current.uri,
          nowPlayingTrack: { title: matchingSong.title, artist: matchingSong.artist, albumArt: matchingSong.albumArt },
          playedUris: Array.from(playedUris),
        };
      });
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected, myUserId, event.id]);

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
    if (!token) {
      setCreatingPlaylist(false);
      alert("Connexion Spotify indisponible — reconnectez votre compte depuis Mes infos.");
      return;
    }
    const result = await createSpotifyPlaylist(token, `Bibamus — ${event.name}`);
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
    if (!token) {
      setAddingId(null);
      alert("Connexion Spotify indisponible — reconnectez votre compte depuis Mes infos.");
      return;
    }
    const result = await addTrackToSpotifyPlaylist(token, event.spotifyPlaylistId, song.spotifyUri);
    setAddingId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    updateEvent(event.id, (e) => ({ ...e, playlist: (e.playlist || []).map((s) => (s.id === song.id ? { ...s, addedToPlaylist: true } : s)) }));
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <NavIcon name="bibamusic" size={36} color={COLORS.amber} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Music</span>
        </h1>
      </div>

      {/* Écoute réelle — se fait dans la vraie app Spotify, pas dans un lecteur limité aux
      extraits de 30 secondes. Quelqu'un du groupe ouvre la playlist et la fait jouer. */}
      {event.spotifyPlaylistId ? (
        <a
          href={event.spotifyPlaylistUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: COLORS.amber,
            borderRadius: "12px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: 800,
            color: COLORS.paper,
            textDecoration: "none",
            marginBottom: "18px",
          }}
        >
          <NavIcon name="bibamusic" size={26} color={COLORS.paper} />
          Ouvrir dans Spotify
          {playlist.filter((s) => s.addedToPlaylist).length > 0 && (
            <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.85 }}>
              ({playlist.filter((s) => s.addedToPlaylist).length} titre{playlist.filter((s) => s.addedToPlaylist).length > 1 ? "s" : ""})
            </span>
          )}
        </a>
      ) : spotifyConnected ? (
        <button
          onClick={createPlaylist}
          disabled={creatingPlaylist}
          style={{ background: "none", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "11px 14px", fontSize: "13.5px", fontWeight: 700, color: COLORS.amber, cursor: "pointer", width: "100%", marginBottom: "18px" }}
        >
          {creatingPlaylist ? "Création..." : "Créer la playlist Spotify du Bibroom"}
        </button>
      ) : (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", marginBottom: "18px" }}>
          Connectez Spotify depuis "Mes infos" pour créer une vraie playlist partagée.
        </p>
      )}

      {/* Faux lecteur — purement visuel, aucune lecture réelle depuis Bibamus. Affiche ce qui
      joue actuellement, tel que remonté par la personne qui contrôle la musique. */}
      {event.spotifyPlaylistId && (event.nowPlayingTrack ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: COLORS.surfaceAlt,
            border: `2px solid ${COLORS.amber}`,
            borderRadius: "14px",
            padding: "14px",
            marginBottom: "18px",
          }}
        >
          {event.nowPlayingTrack.albumArt && <img src={event.nowPlayingTrack.albumArt} alt="" style={{ width: "64px", height: "64px", borderRadius: "8px", flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.5px", color: COLORS.amber, textTransform: "uppercase" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
              En cours
            </p>
            <p style={{ margin: "3px 0 0", fontSize: "15px", fontWeight: 800, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.nowPlayingTrack.title}</p>
            {event.nowPlayingTrack.artist && <p style={{ margin: "2px 0 0", fontSize: "13px", color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.nowPlayingTrack.artist}</p>}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic", marginBottom: nowPlayingDebug ? "4px" : "18px" }}>
            Personne ne diffuse la playlist pour l'instant.
          </p>
          {nowPlayingDebug && spotifyConnected && (
            <p style={{ fontSize: "10.5px", color: COLORS.inkSoft, opacity: 0.6, marginBottom: "18px" }}>Diagnostic : {nowPlayingDebug}</p>
          )}
        </>
      ))}

      {/* Proposition d'un morceau */}
      <div style={{ marginBottom: "18px", position: "relative" }}>
        <input
          value={titleInput}
          onChange={(e) => {
            setTitleInput(e.target.value);
            if (spotifyConnected) runSearch(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && !spotifyConnected && proposeManual()}
          placeholder={spotifyConnected ? "Chercher un titre sur Spotify ..." : "Titre — Artiste"}
          style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", background: COLORS.surface, color: COLORS.ink, outline: "none" }}
        />

        {spotifyConnected && searchResults.length > 0 && (
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {searchResults.map((track) => (
              <button
                key={track.spotifyTrackId}
                onClick={() => proposeFromSearch(track)}
                style={{ display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "9px", cursor: "pointer", textAlign: "left" }}
              >
                {track.albumArt && <img src={track.albumArt} alt="" style={{ width: "36px", height: "36px", borderRadius: "5px", flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</p>
                  <p style={{ margin: 0, fontSize: "11.5px", color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {spotifyConnected && searching && <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "8px" }}>Recherche...</p>}

        {!spotifyConnected && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && proposeManual()}
              placeholder="Lien Spotify/YouTube (facultatif)"
              style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", background: COLORS.surface, color: COLORS.ink, outline: "none" }}
            />
            <button
              onClick={proposeManual}
              disabled={!titleInput.trim()}
              style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "0 18px", fontWeight: 700, fontSize: "13.5px", color: COLORS.paper, cursor: "pointer", opacity: titleInput.trim() ? 1 : 0.5 }}
            >
              Proposer
            </button>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun morceau proposé pour l'instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sorted.map((s) => {
            const bixCount = (s.bix || []).length;
            const iBixed = (s.bix || []).includes(myBibroCode);
            const isMine = s.proposedByCode === myBibroCode;
            const isNowPlaying = s.spotifyUri && s.spotifyUri === event.nowPlayingUri;
            const wasPlayed = !isNowPlaying && s.spotifyUri && (event.playedUris || []).includes(s.spotifyUri);
            return (
              <div
                key={s.id}
                style={{
                  background: isNowPlaying ? COLORS.surfaceAlt : COLORS.surface,
                  border: `2px solid ${isNowPlaying ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "12px",
                  padding: "11px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: wasPlayed ? 0.6 : 1,
                }}
              >
                {s.albumArt && <img src={s.albumArt} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", flexShrink: 0 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
                    {isNowPlaying && (
                      <span style={{ flexShrink: 0, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.3px", color: COLORS.paper, background: COLORS.amber, borderRadius: "999px", padding: "2px 7px" }}>
                        EN COURS
                      </span>
                    )}
                    {wasPlayed && (
                      <span style={{ flexShrink: 0, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.3px", color: COLORS.inkSoft, background: COLORS.paperAlt, borderRadius: "999px", padding: "2px 7px" }}>
                        DÉJÀ JOUÉ
                      </span>
                    )}
                  </p>
                  {s.artist && <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</p>}
                  <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: COLORS.inkSoft }}>
                    Proposé par {s.proposedByName || "quelqu'un"}
                    {s.link && !s.spotifyUri && (
                      <>
                        {" · "}
                        <a href={normalizeUrl(s.link)} target="_blank" rel="noreferrer" style={{ color: COLORS.amber }}>
                          Ouvrir
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {event.spotifyPlaylistId && s.spotifyUri && (
                  <>
                    {s.addedToPlaylist ? (
                      <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, color: COLORS.amber }}>✓</span>
                    ) : (
                      <button
                        onClick={() => addToPlaylist(s)}
                        disabled={addingId === s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          background: "none",
                          border: `2px solid ${COLORS.amber}`,
                          borderRadius: "999px",
                          color: COLORS.amber,
                          fontSize: "15px",
                          fontWeight: 700,
                          cursor: "pointer",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        {addingId === s.id ? "…" : "+"}
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => toggleBix(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: iBixed ? COLORS.amber : "none",
                    border: `2px solid ${COLORS.amber}`,
                    borderRadius: "999px",
                    padding: "6px 11px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: iBixed ? COLORS.paper : COLORS.amber,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  ♥ {bixCount}
                </button>
                {isMine && (
                  <button onClick={() => removeSong(s.id)} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "17px", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BackFooterLink onClick={onBack} />
    </div>
  );
}
