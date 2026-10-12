// ============================================================
// Accès à une partie de Predict — le premier jeu de la plateforme
// BibaPlay (pronostics sportifs entre amis). D'autres jeux BibaPlay
// arriveront plus tard, chacun avec ses propres données — Predict a
// donc sa propre table, pas une table "bibaplay" générique partagée.
//
// Même principe que salons.js pour les BibaRoom : une seule ligne
// (clé = code à 6 caractères), tout son contenu (participants,
// statut, futur pronostic actif, classement...) dans un seul bloc
// JSON, synchronisé en LIVE entre tous les téléphones via Supabase
// Realtime.
//
// linkedSalonCode (optionnel) relie la partie à un BibaRoom déjà
// ouvert quand elle y est lancée depuis le tableau de bord du salon
// — sinon la partie est indépendante (créée depuis BibaPlay sur
// Home) et se rejoint avec son propre code, comme un salon classique.
// ============================================================

import { supabase } from "../supabaseClient.js";
import { randomCode } from "../utils.js";

// Lecture d'une partie à partir de son code — le code à 6 caractères reste le « mot de passe » pour
// la rejoindre, c'est ce qui permet de la lire avant d'en être participant. Passe par une fonction
// serveur : la table elle-même n'est lisible que par les participants (voir
// bibamus-sql-predict-A-fonctions.sql et -C-fermeture-table.sql).
export async function loadPredictGame(code) {
  const { data, error } = await supabase.rpc("get_predict_game", { p_code: code });
  if (error) {
    // Un second essai avant d'abandonner — même précaution que loadSalon face à un couac
    // réseau ponctuel.
    console.error("loadPredictGame (1ère tentative):", error);
    const retry = await supabase.rpc("get_predict_game", { p_code: code });
    if (retry.error) {
      console.error("loadPredictGame (2ème tentative):", retry.error);
      return null;
    }
    return retry.data ?? null;
  }
  return data ?? null;
}

// Création et mise à jour passent par la même fonction serveur, qui décide qui a le droit d'écrire :
// un participant ou l'hôte, quelqu'un qui rejoint (il se rajoute sans retirer personne), un membre du
// salon auquel la partie est liée, ou le créateur d'une nouvelle partie. Elle refuse le reste, avec une
// erreur simplement journalisée ici (comme avant, aucune fenêtre d'erreur : l'appelant décide quoi
// afficher). Le salon lié n'est transmis qu'à la création.
export async function createPredictGame(code, gameData, linkedSalonCode) {
  const { error } = await supabase.rpc("save_predict_game", { p_code: code, p_data: gameData, p_linked_salon_code: linkedSalonCode || null });
  if (error) console.error("createPredictGame:", error);
}

export async function savePredictGame(code, gameData) {
  const { error } = await supabase.rpc("save_predict_game", { p_code: code, p_data: gameData });
  if (error) console.error("savePredictGame:", error);
}

// Code à 6 caractères : vérifie qu'il n'est pas déjà pris (jusqu'à 8 essais), comme pour
// generateRoomCode.
export async function generatePredictGameCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(6);
    const existing = await loadPredictGame(code);
    if (!existing) return code;
  }
  return randomCode(6);
}

// Écoute les changements d'une partie en direct. `onChange` est appelé avec les nouvelles
// données à chaque fois qu'un autre appareil (un autre Bibax) modifie cette même partie.
// Retourne une fonction à appeler pour arrêter l'écoute (à faire en quittant la partie).
export function subscribeToPredictGame(code, onChange) {
  const channel = supabase
    .channel(`predict-${code}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "predict_games", filter: `code=eq.${code}` },
      (payload) => onChange(payload.new.data)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
