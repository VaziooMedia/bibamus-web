// ============================================================
// Accès à une partie BibaPlay — même principe que salons.js pour les
// BibaRoom : une seule ligne (clé = code à 6 caractères), tout son
// contenu (participants, statut, futur pronostic actif, classement...)
// dans un seul bloc JSON, synchronisé en LIVE entre tous les téléphones
// via Supabase Realtime.
//
// linkedSalonCode (optionnel) relie la partie à un BibaRoom déjà ouvert
// quand elle y est lancée depuis le tableau de bord du salon — sinon la
// partie est indépendante (créée depuis la tuile BibaPlay sur Home) et
// se rejoint avec son propre code, comme un salon classique.
// ============================================================

import { supabase } from "../supabaseClient.js";
import { randomCode } from "../utils.js";

export async function loadBibaPlayGame(code) {
  const { data, error } = await supabase.from("bibaplay_games").select("data").eq("code", code).maybeSingle();
  if (error) {
    // Un second essai avant d'abandonner — même précaution que loadSalon face à un couac
    // réseau ponctuel.
    console.error("loadBibaPlayGame (1ère tentative):", error);
    const retry = await supabase.from("bibaplay_games").select("data").eq("code", code).maybeSingle();
    if (retry.error) {
      console.error("loadBibaPlayGame (2ème tentative):", retry.error);
      return null;
    }
    return retry.data ? retry.data.data : null;
  }
  return data ? data.data : null;
}

export async function createBibaPlayGame(code, gameData, linkedSalonCode) {
  const { error } = await supabase.from("bibaplay_games").insert({ code, data: gameData, linked_salon_code: linkedSalonCode || null });
  if (error) console.error("createBibaPlayGame:", error);
}

export async function saveBibaPlayGame(code, gameData) {
  const { error } = await supabase.from("bibaplay_games").upsert({ code, data: gameData, updated_at: new Date().toISOString() });
  if (error) console.error("saveBibaPlayGame:", error);
}

// Code à 6 caractères : vérifie qu'il n'est pas déjà pris (jusqu'à 8 essais), comme pour
// generateRoomCode.
export async function generateBibaPlayGameCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(6);
    const existing = await loadBibaPlayGame(code);
    if (!existing) return code;
  }
  return randomCode(6);
}

// Écoute les changements d'une partie en direct. `onChange` est appelé avec les nouvelles
// données à chaque fois qu'un autre appareil (un autre Bibax) modifie cette même partie.
// Retourne une fonction à appeler pour arrêter l'écoute (à faire en quittant la partie).
export function subscribeToBibaPlayGame(code, onChange) {
  const channel = supabase
    .channel(`bibaplay-${code}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bibaplay_games", filter: `code=eq.${code}` },
      (payload) => onChange(payload.new.data)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
