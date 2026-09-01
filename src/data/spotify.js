// ============================================================
// BIBAMUS — BibaMusic Phase 2 : connexion Spotify (OAuth PKCE).
// Méthode recommandée par Spotify pour une app cliente (ne
// nécessite jamais d'exposer de Client Secret). Le jeton d'accès
// est ensuite stocké côté Supabase, propre à chaque compte,
// protégé par les règles de sécurité déjà en place sur "profiles"
// (chacun ne lit jamais que son propre profil).
// ============================================================
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from "../constants.js";
import { supabase } from "../supabaseClient.js";

function generateCodeVerifier(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  randomValues.forEach((val) => (text += possible[val % possible.length]));
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Lance la connexion — redirige vers la page d'autorisation Spotify. Le vérificateur est
// conservé en local (nécessaire pour l'échange final), jamais transmis à Spotify lui-même.
export async function redirectToSpotifyAuth() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("bibamus-spotify-verifier", verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Appelée sur la page de retour (/spotify-callback) — échange le code reçu contre un vrai
// jeton d'accès, puis enregistre tout sur le profil du compte connecté.
export async function completeSpotifyAuth(code, userId) {
  const verifier = localStorage.getItem("bibamus-spotify-verifier");
  if (!verifier) return { error: "Session de connexion expirée — réessayez." };

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: verifier,
      }),
    });
    localStorage.removeItem("bibamus-spotify-verifier");

    if (!tokenResponse.ok) return { error: "La connexion Spotify a échoué — réessayez." };
    const tokenData = await tokenResponse.json();

    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const spotifyProfile = profileResponse.ok ? await profileResponse.json() : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        spotify_access_token: tokenData.access_token,
        spotify_refresh_token: tokenData.refresh_token,
        spotify_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        spotify_user_id: spotifyProfile?.id || null,
        spotify_display_name: spotifyProfile?.display_name || null,
      })
      .eq("id", userId);

    if (error) return { error: error.message };
    return { ok: true, displayName: spotifyProfile?.display_name };
  } catch (e) {
    return { error: "La connexion Spotify a échoué — réessayez." };
  }
}

export async function getMySpotifyStatus() {
  const { data, error } = await supabase.rpc("get_my_spotify_status");
  if (error) {
    console.error("getMySpotifyStatus:", error);
    return { connected: false };
  }
  return data;
}

// Complète getMySpotifyStatus avec l'identifiant Spotify réel, nécessaire pour créer une
// playlist en son nom — les deux colonnes lues ici ne sont accessibles qu'au compte lui-même
// (RLS déjà en place sur profiles : auth.uid() = id).
export async function getMySpotifyConnection(userId) {
  const { data, error } = await supabase.from("profiles").select("spotify_user_id, spotify_display_name").eq("id", userId).single();
  if (error) {
    console.error("getMySpotifyConnection:", error);
    return null;
  }
  return data;
}

export async function disconnectSpotify(userId) {
  const { error } = await supabase
    .from("profiles")
    .update({
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
      spotify_user_id: null,
      spotify_display_name: null,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

// Rafraîchit le jeton d'accès si besoin (expiration ~1h) — la méthode PKCE permet de le faire
// directement depuis le client, sans exposer de Secret, exactement comme pour la connexion.
export async function ensureFreshSpotifyToken(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
    .eq("id", userId)
    .single();

  if (!profile?.spotify_refresh_token) return null;

  const stillValid = profile.spotify_token_expires_at && new Date(profile.spotify_token_expires_at).getTime() - Date.now() > 60000;
  if (stillValid) return profile.spotify_access_token;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: profile.spotify_refresh_token,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();

    await supabase
      .from("profiles")
      .update({
        spotify_access_token: data.access_token,
        spotify_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        // Spotify ne renvoie pas toujours un nouveau refresh_token — on garde l'ancien si absent.
        ...(data.refresh_token ? { spotify_refresh_token: data.refresh_token } : {}),
      })
      .eq("id", userId);

    return data.access_token;
  } catch (e) {
    console.error("ensureFreshSpotifyToken:", e);
    return null;
  }
}

// Recherche dans le catalogue Spotify — utilise le jeton du compte actuellement connecté.
export async function searchSpotifyTracks(accessToken, query) {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=6`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.tracks?.items || []).map((t) => ({
      spotifyTrackId: t.id,
      spotifyUri: t.uri,
      title: t.name,
      artist: (t.artists || []).map((a) => a.name).join(", "),
      albumArt: t.album?.images?.[t.album.images.length - 1]?.url || t.album?.images?.[0]?.url || null,
      link: t.external_urls?.spotify || null,
    }));
  } catch (e) {
    console.error("searchSpotifyTracks:", e);
    return [];
  }
}

// Crée la playlist Spotify de la soirée pour ce BibaRoom, avec le compte actuellement connecté.
// Utilise /me/playlists — l'ancien point d'entrée /users/{id}/playlists a été retiré par
// Spotify pour les apps en Development Mode (migration de février 2026).
export async function createSpotifyPlaylist(accessToken, playlistName) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: playlistName, description: "Playlist de soirée créée avec Bibamus", public: false }),
    });
    if (!response.ok) return { error: "La création de la playlist Spotify a échoué." };
    const data = await response.json();
    return { ok: true, playlistId: data.id, playlistUrl: data.external_urls?.spotify };
  } catch (e) {
    return { error: "La création de la playlist Spotify a échoué." };
  }
}

// Ajoute un morceau (par son URI Spotify) à la playlist déjà créée pour ce BibaRoom. Utilise
// /items — l'ancien /tracks a été renommé lors de la même migration de février 2026 qui a
// aussi retiré /users/{id}/playlists pour la création.
export async function addTrackToSpotifyPlaylist(accessToken, playlistId, spotifyUri) {
  if (!spotifyUri) return { error: "Ce morceau n'a pas d'identifiant Spotify — impossible à ajouter." };
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [spotifyUri] }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("addTrackToSpotifyPlaylist:", response.status, errText);
      return { error: `L'ajout à la playlist a échoué (${response.status}) : ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { error: "L'ajout à la playlist a échoué — réessayez." };
  }
}

// Lecture seule — ce que la personne connectée écoute actuellement sur son propre appareil.
// Ne donne jamais accès à ce que quelqu'un d'autre écoute ; c'est justement pour ça que
// seule la personne qui contrôle réellement la musique (enceinte connectée à son téléphone)
// peut faire remonter une info utile — les autres participants la reçoivent ensuite via la
// synchronisation déjà en place sur l'événement partagé.
export async function getCurrentlyPlaying(accessToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 204 || !response.ok) return null;
    const data = await response.json();
    if (!data?.item) return null;
    return { uri: data.item.uri, isPlaying: !!data.is_playing };
  } catch (e) {
    return null;
  }
}
