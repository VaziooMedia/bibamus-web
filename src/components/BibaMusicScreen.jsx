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
  const [playerRefreshKey, setPlayerRefreshKey] = useState(0);
  const searchDebounce = useRef(null);

  useEffect(() => {
    getMySpotifyStatus().then((s) => setSpotifyConnected(!!s.connected));
  }, []);

  // Rafraîchit le lecteur intégré toutes les 20 secondes — sans ça, seule la personne qui vient
  // d'ajouter un morceau verrait la playlist se mettre à jour ; les autres participants du
  // salon ne le sauraient jamais, l'iframe ne se rechargeant jamais toute seule.
  useEffect(() => {
    if (!event.spotifyPlaylistId) return;
    const interval = setInterval(() => setPlayerRefreshKey((k) => k + 1), 20000);
    return () => clearInterval(interval);
  }, [event.spotifyPlaylistId]);

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
    setPlayerRefreshKey((k) => k + 1);
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <NavIcon name="bibamusic" size={28} color={COLORS.amber} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Music</span>
        </h1>
      </div>

      {/* Lecteur Spotify officiel intégré — dès que la playlist du Bibroom existe */}
      {event.spotifyPlaylistId ? (
        <div style={{ marginBottom: "18px", borderRadius: "12px", overflow: "hidden" }}>
          <iframe
            key={playerRefreshKey}
            title="Playlist Spotify du Bibroom"
            src={`https://open.spotify.com/embed/playlist/${event.spotifyPlaylistId}?utm_source=generator&theme=0&_r=${playerRefreshKey}`}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: "none" }}
          />
        </div>
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
          Connectez Spotify depuis "Mes infos" pour créer une vraie playlist partagée, avec lecteur intégré ici même.
        </p>
      )}

      {/* Proposition d'un morceau */}
      <div style={{ marginBottom: "18px", position: "relative" }}>
        <input
          value={titleInput}
          onChange={(e) => {
            setTitleInput(e.target.value);
            if (spotifyConnected) runSearch(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && !spotifyConnected && proposeManual()}
          placeholder={spotifyConnected ? "Chercher un titre sur Spotify..." : "Titre — Artiste"}
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
            return (
              <div key={s.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "11px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                {s.albumArt && <img src={s.albumArt} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", flexShrink: 0 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.title}
                    {s.artist ? ` — ${s.artist}` : ""}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: COLORS.inkSoft }}>
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
                        {s.addedToPlaylist ? (
                          <span style={{ color: COLORS.amber }}>Ajouté ✓</span>
                        ) : (
                          <button onClick={() => addToPlaylist(s)} disabled={addingId === s.id} style={{ background: "none", border: "none", color: COLORS.amber, fontSize: "11.5px", cursor: "pointer", padding: 0 }}>
                            {addingId === s.id ? "Ajout..." : "+ Playlist"}
                          </button>
                        )}
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
