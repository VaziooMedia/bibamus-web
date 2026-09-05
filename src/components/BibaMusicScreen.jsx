import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, SpotifyIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink } from "./ui.jsx";
import { normalizeUrl } from "../utils.js";
import { controlSpotifyPlayback } from "../data/sharedDirectories.js";
import {
  getMySpotifyStatus,
  ensureFreshSpotifyToken,
  searchSpotifyTracks,
  createSpotifyPlaylist,
  addTrackToSpotifyPlaylist,
  getCurrentlyPlaying,
  getSpotifyPlaylistOrder,
  reorderSpotifyPlaylistItem,
} from "../data/spotify.js";

// Ne fait défiler le texte que s'il dépasse réellement la largeur disponible — sinon, reste
// simplement affiché tel quel, sans animation inutile. La vitesse est calculée à partir de la
// largeur du texte, pour rester lente et lisible quelle que soit sa longueur.
function ScrollingText({ children, style }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const isOverflowing = textRef.current.scrollWidth > containerRef.current.clientWidth;
      setOverflowing(isOverflowing);
      if (isOverflowing) setDuration(Math.max(8, textRef.current.scrollWidth / 25)); // ~25px/s — lent et lisible
    }
  }, [children]);

  return (
    <div ref={containerRef} style={{ overflow: "hidden", whiteSpace: "nowrap", width: "100%", WebkitTextSizeAdjust: "100%", textSizeAdjust: "100%" }}>
      <span
        ref={textRef}
        style={{
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
          color: style?.color,
          margin: style?.margin,
          display: "inline-block",
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
          ...(overflowing
            ? { animation: `bibamusic-scroll ${duration}s linear infinite` }
            : { textOverflow: "ellipsis", overflow: "hidden", maxWidth: "100%", verticalAlign: "top" }),
        }}
      >
        <span>{children}</span>
        {overflowing && <span style={{ paddingLeft: "48px" }}>{children}</span>}
      </span>
      {overflowing && (
        <style>{`
          @keyframes bibamusic-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      )}
    </div>
  );
}

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
  const [playbackBusy, setPlaybackBusy] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [nowPlayingDebug, setNowPlayingDebug] = useState(null);
  const searchDebounce = useRef(null);

  useEffect(() => {
    getMySpotifyStatus().then((s) => setSpotifyConnected(!!s.connected));
  }, []);

  // Vérifie périodiquement ce qui joue sur MON appareil — uniquement pour le message de
  // diagnostic affiché ici. La mise à jour réelle de l'événement (nowPlayingTrack, DJ actuel)
  // est centralisée dans App.jsx, pour qu'elle continue même en dehors de cet écran — on évite
  // ainsi que deux vérifications distinctes se marchent dessus.
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
        if (e.nowPlayingUri === current.uri && e.nowPlayingUserId === myUserId) return e;
        const playedUris = new Set(e.playedUris || []);
        if (e.nowPlayingUri) playedUris.add(e.nowPlayingUri);
        return {
          ...e,
          nowPlayingUri: current.uri,
          nowPlayingTrack: { title: matchingSong.title, artist: matchingSong.artist, albumArt: matchingSong.albumArt },
          nowPlayingUserId: myUserId,
          playedUris: Array.from(playedUris),
        };
      });
    };
    poll();
    const interval = setInterval(poll, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected, myUserId, event.id]);

  const playlist = event.playlist || [];
  // Le classement par Bix ne doit influencer que les morceaux pas encore joués — sinon, un Bix
  // sur un nouveau morceau le fait sauter au-dessus du morceau en cours ou déjà joués, ce qui
  // n'a pas de sens (ça ne les fait pas non plus rejouer).
  const nowPlayingSong = playlist.find((s) => s.spotifyUri && s.spotifyUri === event.nowPlayingUri);
  const playedSongs = playlist.filter((s) => s !== nowPlayingSong && s.spotifyUri && (event.playedUris || []).includes(s.spotifyUri));
  const upcomingSongs = playlist
    .filter((s) => s !== nowPlayingSong && !playedSongs.includes(s))
    .sort((a, b) => {
      // Un classement manuel posé par le DJ prend le dessus sur le classement automatique par
      // Bix — sinon la modération manuelle serait immédiatement écrasée par un nouveau vote.
      if (a.manualRank != null || b.manualRank != null) {
        const ra = a.manualRank ?? Infinity;
        const rb = b.manualRank ?? Infinity;
        if (ra !== rb) return ra - rb;
      }
      return (b.bix || []).length - (a.bix || []).length || a.createdAt - b.createdAt;
    });
  const sorted = [...upcomingSongs, ...playedSongs];

  // Synchronise le classement Bibamus vers la vraie playlist Spotify — dès que le morceau le
  // plus Bix parmi ceux pas encore joués change, on le déplace juste après le morceau en
  // cours dans la VRAIE playlist. Sans ça, les Bix n'auraient d'effet que dans l'app, jamais
  // sur ce qui est réellement joué — tout l'intérêt collaboratif de BibaMusic.
  const topUpcomingUri = upcomingSongs[0]?.spotifyUri || null;
  const lastSyncedTopUri = useRef(null);
  useEffect(() => {
    if (!event.spotifyPlaylistId || !topUpcomingUri || !spotifyConnected) return;
    if (lastSyncedTopUri.current === topUpcomingUri) return;
    lastSyncedTopUri.current = topUpcomingUri;

    (async () => {
      const token = await ensureFreshSpotifyToken(myUserId);
      if (!token) return;
      const realOrder = await getSpotifyPlaylistOrder(token, event.spotifyPlaylistId);
      if (!realOrder) return;

      const topIndex = realOrder.indexOf(topUpcomingUri);
      if (topIndex === -1) return; // pas encore ajouté à la vraie playlist

      const currentIndex = event.nowPlayingUri ? realOrder.indexOf(event.nowPlayingUri) : -1;
      const targetPosition = currentIndex === -1 ? 0 : currentIndex + 1;
      if (topIndex <= targetPosition) return; // déjà à la bonne place ou avant

      await reorderSpotifyPlaylistItem(token, event.spotifyPlaylistId, topIndex, targetPosition);
    })();
  }, [topUpcomingUri, event.spotifyPlaylistId, event.nowPlayingUri, spotifyConnected, myUserId]);

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

  const isDJ = event.djCode === myBibroCode;
  const becomeDJ = () => updateEvent(event.id, (e) => ({ ...e, djCode: myBibroCode }));
  const relinquishDJ = () => updateEvent(event.id, (e) => ({ ...e, djCode: null }));

  const handlePlaybackAction = async (action) => {
    setPlaybackBusy(true);
    setPlaybackError(null);
    const result = await controlSpotifyPlayback(event.salonCode, action);
    setPlaybackBusy(false);
    if (result.error) setPlaybackError(result.error);
  };

  // Déplace un morceau à une position précise dans la file d'attente — fige l'ordre actuel en
  // rangs manuels explicites, pour que la modération du MC ne soit pas aussitôt écrasée par un
  // nouveau Bix. La synchronisation vers la vraie playlist Spotify se fait ensuite pour le
  // morceau qui se retrouve en tête (voir l'effet de synchronisation automatique plus haut).
  const moveSongToIndex = (song, targetIndex) => {
    const idx = upcomingSongs.findIndex((s) => s.id === song.id);
    if (idx === -1 || targetIndex === idx) return;
    const newOrder = [...upcomingSongs];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIndex, 0, moved);

    updateEvent(event.id, (e) => ({
      ...e,
      playlist: (e.playlist || []).map((s) => {
        const rank = newOrder.findIndex((n) => n.id === s.id);
        return rank === -1 ? s : { ...s, manualRank: rank };
      }),
    }));
  };

  // Appui long puis glissement pour réordonner — seul le MC peut le faire, et seulement parmi
  // les morceaux pas encore joués.
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const longPressTimer = useRef(null);
  const dragStartPos = useRef(null);

  const handlePointerDown = (song) => (e) => {
    if (!isDJ) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      setDraggingId(song.id);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 350);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerMove = (e) => {
    if (longPressTimer.current && dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx > 8 || dy > 8) cancelLongPress(); // un simple scroll/défilement, pas une intention de glisser
    }
    if (!draggingId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-song-row]");
    setDragOverId(el?.getAttribute("data-song-row") || null);
  };

  const handlePointerUp = () => {
    cancelLongPress();
    if (draggingId && dragOverId && draggingId !== dragOverId) {
      const song = upcomingSongs.find((s) => s.id === draggingId);
      const targetIndex = upcomingSongs.findIndex((s) => s.id === dragOverId);
      if (song && targetIndex !== -1) moveSongToIndex(song, targetIndex);
    }
    setDraggingId(null);
    setDragOverId(null);
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
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: COLORS.paperAlt,
            flexShrink: 0,
          }}
        >
          <NavIcon name="bibamusic" size={31} color={COLORS.amber} />
        </span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Music</span>
        </h1>
      </div>

      {/* Mode DJ — un participant peut modérer la playlist (supprimer n'importe quel morceau,
      réordonner manuellement) ; sans MC, tout le monde ne gère que ses propres propositions. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: COLORS.inkSoft }}>
          {event.djCode
            ? isDJ
              ? "Vous êtes le MC de ce BibaRoom."
              : `MC : ${(event.participants || []).find((p) => p.code === event.djCode)?.name || "quelqu'un"}`
            : "Aucun MC pour l'instant."}
        </p>
        {isDJ ? (
          <button onClick={relinquishDJ} style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "6px 12px", fontSize: "11.5px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}>
            Céder le rôle
          </button>
        ) : !event.djCode ? (
          <button onClick={becomeDJ} style={{ background: "none", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "6px 12px", fontSize: "11.5px", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}>
            Devenir MC
          </button>
        ) : null}
      </div>

      {/* Écoute réelle — se fait dans la vraie app Spotify, pas dans un lecteur limité aux
      extraits de 30 secondes. Quelqu'un du groupe ouvre la playlist et la fait jouer. */}
      {event.spotifyPlaylistId ? (
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: playbackError ? "4px" : "18px", flexWrap: "wrap" }}>
        <a
          href={event.spotifyPlaylistUrl}
          target="_blank"
          rel="noreferrer"
          title="Ouvrir dans Spotify"
          style={{ position: "relative", display: "inline-flex", alignSelf: "flex-start" }}
        >
          <SpotifyIcon size={52} />
          {playlist.filter((s) => s.addedToPlaylist).length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-6px",
                minWidth: "20px",
                height: "20px",
                borderRadius: "999px",
                background: COLORS.amber,
                border: `2px solid ${COLORS.paper}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                boxSizing: "border-box",
                fontSize: "11px",
                fontWeight: 800,
                color: COLORS.paper,
              }}
            >
              {playlist.filter((s) => s.addedToPlaylist).length}
            </span>
          )}
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {[
            { action: "previous", icon: "skip-back", label: "Précédent" },
            { action: "play", icon: "play", label: "Lecture" },
            { action: "pause", icon: "pause", label: "Pause" },
            { action: "next", icon: "skip-forward", label: "Suivant" },
          ].map((btn) => (
            <button
              key={btn.action}
              onClick={() => isDJ && !playbackBusy && handlePlaybackAction(btn.action)}
              disabled={!isDJ || playbackBusy}
              title={isDJ ? btn.label : "Seul le MC peut contrôler la lecture"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "none",
                border: `2px solid ${COLORS.paperAlt}`,
                opacity: isDJ ? 1 : 0.4,
                cursor: isDJ ? (playbackBusy ? "default" : "pointer") : "not-allowed",
              }}
            >
              <NavIcon name={btn.icon} size={16} color={isDJ ? COLORS.amber : COLORS.inkSoft} />
            </button>
          ))}
        </div>
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
          Connectez Spotify depuis "Mes infos" pour créer une vraie playlist partagée.
        </p>
      )}
      {playbackError && <p style={{ fontSize: "11.5px", color: COLORS.redFluo, marginBottom: "14px" }}>{playbackError}</p>}

      {/* Faux lecteur — purement visuel, aucune lecture réelle depuis Bibamus. Affiche ce qui
      joue actuellement, tel que remonté par la personne qui contrôle la musique. Reprend le
      même visuel que la liste ci-dessous (le morceau en cours n'y apparaît plus, pour éviter
      le doublon). */}
      {event.spotifyPlaylistId && (event.nowPlayingTrack ? (
        <div
          style={{
            position: "relative",
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
          <span
            style={{
              position: "absolute",
              top: "-8px",
              right: "10px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              color: COLORS.paper,
              background: COLORS.amber,
              borderRadius: "999px",
              padding: "2px 8px",
            }}
          >
            EN COURS
          </span>
          {event.nowPlayingTrack.albumArt && <img src={event.nowPlayingTrack.albumArt} alt="" style={{ width: "64px", height: "64px", borderRadius: "8px", flexShrink: 0 }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <ScrollingText style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: COLORS.ink }}>{event.nowPlayingTrack.title}</ScrollingText>
            {event.nowPlayingTrack.artist && <ScrollingText style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>{event.nowPlayingTrack.artist}</ScrollingText>}
            {nowPlayingSong && <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: COLORS.inkSoft }}>Proposé par {nowPlayingSong.proposedByName || "quelqu'un"}</p>}
          </div>
          {nowPlayingSong && (
            <button
              onClick={() => toggleBix(nowPlayingSong.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: (nowPlayingSong.bix || []).includes(myBibroCode) ? COLORS.amber : "none",
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "999px",
                padding: "6px 11px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: (nowPlayingSong.bix || []).includes(myBibroCode) ? COLORS.paper : COLORS.amber,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <NavIcon name="heart" size={13} color={(nowPlayingSong.bix || []).includes(myBibroCode) ? COLORS.paper : COLORS.amber} filled={(nowPlayingSong.bix || []).includes(myBibroCode)} />
              {(nowPlayingSong.bix || []).length}
            </button>
          )}
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
            const isNowPlaying = s.spotifyUri && s.spotifyUri === event.nowPlayingUri;
            const wasPlayed = !isNowPlaying && s.spotifyUri && (event.playedUris || []).includes(s.spotifyUri);
            const isReorderable = isDJ && !isNowPlaying && !wasPlayed;
            const isDragging = draggingId === s.id;
            const isDragOver = dragOverId === s.id && draggingId !== s.id;
            return (
              <div
                key={s.id}
                data-song-row={s.id}
                onPointerMove={draggingId ? handlePointerMove : undefined}
                onPointerUp={draggingId ? handlePointerUp : undefined}
                onPointerCancel={draggingId ? handlePointerUp : undefined}
                style={{
                  position: "relative",
                  background: isDragOver ? COLORS.paperAlt : isNowPlaying ? COLORS.surfaceAlt : COLORS.surface,
                  border: `2px solid ${isNowPlaying ? COLORS.amber : COLORS.paperAlt}`,
                  borderRadius: "12px",
                  padding: "11px 14px 18px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: isDragging ? 0.5 : wasPlayed ? 0.6 : 1,
                  transform: isDragging ? "scale(1.02)" : "none",
                }}
              >
                {(isNowPlaying || wasPlayed) && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "10px",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      color: isNowPlaying ? COLORS.paper : COLORS.inkSoft,
                      background: isNowPlaying ? COLORS.amber : COLORS.paperAlt,
                      borderRadius: "999px",
                      padding: "2px 8px",
                    }}
                  >
                    {isNowPlaying ? "EN COURS" : "DÉJÀ JOUÉ"}
                  </span>
                )}
                {s.albumArt && <img src={s.albumArt} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", flexShrink: 0 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <ScrollingText style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>{s.title}</ScrollingText>
                  {s.artist && <ScrollingText style={{ margin: "2px 0 0", fontSize: "12.5px", fontWeight: 700, color: COLORS.inkSoft }}>{s.artist}</ScrollingText>}
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
                  <NavIcon name="heart" size={13} color={iBixed ? COLORS.paper : COLORS.amber} filled={iBixed} />
                  {bixCount}
                </button>
                {isReorderable && (
                  <div
                    onPointerDown={handlePointerDown(s)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "3px",
                      padding: "10px 8px",
                      flexShrink: 0,
                      cursor: "grab",
                      touchAction: "none",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      WebkitTouchCallout: "none",
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} style={{ width: "3px", height: "3px", borderRadius: "50%", background: COLORS.inkSoft }} />
                    ))}
                  </div>
                )}
                {isDJ && (
                  <button
                    onClick={() => removeSong(s.id)}
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "8px",
                      background: "none",
                      border: "none",
                      color: COLORS.inkSoft,
                      fontSize: "14px",
                      cursor: "pointer",
                      padding: "2px",
                      opacity: 0.6,
                    }}
                  >
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
