// ============================================================
// Accès au salon partagé (BibaRoom) — le cœur du "tester ensemble".
//
// Chaque salon est une seule ligne (clé = code à 6 caractères),
// avec tout son contenu (tournées, participants, jetons...) dans
// un seul bloc JSON — comme avant côté Claude, mais cette fois
// stocké dans une vraie base, et surtout synchronisé en LIVE entre
// tous les téléphones connectés au même salon grâce à Supabase
// Realtime : dès qu'un Bibax ajoute une tournée, les autres la
// voient apparaître automatiquement, sans devoir rafraîchir.
// ============================================================

import { supabase } from "../supabaseClient.js";

// Retrouve tous les BibaRoom actifs où ce compte est déjà participant — peu importe l'appareil
// qui les a créés ou rejoints. Sans ça, un BibaRoom créé sur un téléphone n'apparaîtrait jamais
// dans BibaLive sur un autre appareil connecté au même compte.
export async function loadMyActiveSalons(bibroCode) {
  if (!bibroCode) return [];
  const { data, error } = await supabase.rpc("get_my_active_salons", { p_bibro_code: bibroCode });
  if (error) {
    console.error("loadMyActiveSalons:", error);
    return [];
  }
  return data.map((row) => row.data);
}

// Lecture d'un salon à partir de son code — le code à 6 caractères reste le "mot de passe" pour
// rejoindre un salon, c'est ce qui permet de le lire avant d'en être participant. Passe par une
// fonction serveur : la table elle-même n'est lisible que par les participants (voir
// bibamus-sql-salons-A-fonctions.sql et -C-fermeture-table.sql).
export async function loadSalon(code) {
  const { data, error } = await supabase.rpc("get_salon", { p_code: code });
  if (error) {
    // Un second essai avant d'abandonner — un couac réseau ponctuel (observé sur Safari juste
    // après un rechargement de page) ne doit pas obliger la personne à recliquer elle-même.
    console.error("loadSalon (1ère tentative):", error);
    const retry = await supabase.rpc("get_salon", { p_code: code });
    if (retry.error) {
      console.error("loadSalon (2ème tentative):", retry.error);
      return null;
    }
    return retry.data ?? null;
  }
  return data ?? null;
}

// Création et mise à jour passent par la même fonction serveur, qui décide qui a le droit
// d'écrire : un participant, quelqu'un qui rejoint (il se rajoute sans retirer personne), ou le
// créateur d'un nouveau salon. Elle refuse le reste, avec une erreur simplement journalisée
// ici (comme avant, aucune fenêtre d'erreur : l'appelant décide quoi afficher).
export async function createSalon(code, eventData) {
  const { error } = await supabase.rpc("save_salon", { p_code: code, p_data: eventData });
  if (error) console.error("createSalon:", error);
}

export async function saveSalon(code, eventData) {
  const { error } = await supabase.rpc("save_salon", { p_code: code, p_data: eventData });
  if (error) console.error("saveSalon:", error);
}

// Décliner une invitation à rejoindre : retire seulement MON invitation en attente du salon.
// Une personne invitée n'est pas encore participante, elle ne peut donc pas passer par
// saveSalon pour ça.
export async function declineSalonInvite(code) {
  const { error } = await supabase.rpc("decline_salon_invite", { p_code: code });
  if (error) console.error("declineSalonInvite:", error);
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const randomCode = (length) => {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
};

// Code à 4 caractères : vérifie qu'il n'est pas déjà pris (jusqu'à 8 essais), comme dans le
// prototype Claude — mais ici, la vérification interroge une vraie base de données.
export async function generateRoomCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(6);
    const existing = await loadSalon(code);
    if (!existing) return code;
  }
  return randomCode(6);
}

// Écoute les changements d'un salon en direct. `onChange` est appelé avec les nouvelles
// données à chaque fois qu'un autre appareil (un autre Bibax) modifie ce même salon.
// Retourne une fonction à appeler pour arrêter l'écoute (à faire quand on quitte le salon).
export function subscribeToSalon(code, onChange) {
  const channel = supabase
    .channel(`salon-${code}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "salons", filter: `code=eq.${code}` },
      (payload) => onChange(payload.new.data)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
