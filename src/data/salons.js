// ============================================================
// Accès au salon partagé (BibaRoom) — le cœur du "tester ensemble".
//
// Chaque salon est une seule ligne (clé = code à 4 caractères),
// avec tout son contenu (tournées, participants, jetons...) dans
// un seul bloc JSON — comme avant côté Claude, mais cette fois
// stocké dans une vraie base, et surtout synchronisé en LIVE entre
// tous les téléphones connectés au même salon grâce à Supabase
// Realtime : dès qu'un Bibax ajoute une tournée, les autres la
// voient apparaître automatiquement, sans devoir rafraîchir.
// ============================================================

import { supabase } from "../supabaseClient.js";

export async function loadSalon(code) {
  const { data, error } = await supabase.from("salons").select("data").eq("code", code).maybeSingle();
  if (error) {
    console.error("loadSalon:", error);
    return null;
  }
  return data ? data.data : null;
}

export async function createSalon(code, eventData) {
  const { error } = await supabase.from("salons").insert({ code, data: eventData });
  if (error) console.error("createSalon:", error);
}

export async function saveSalon(code, eventData) {
  const { error } = await supabase.from("salons").upsert({ code, data: eventData, updated_at: new Date().toISOString() });
  if (error) console.error("saveSalon:", error);
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
    const code = randomCode(4);
    const existing = await loadSalon(code);
    if (!existing) return code;
  }
  return randomCode(4);
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
