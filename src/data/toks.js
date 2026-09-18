// ============================================================
// Tok — micro-interaction sociale dans un BibaRoom.
//
// Toutes les règles (salon actif, appartenance, BibaZERO, cooldown) vivent
// côté serveur : ce fichier ne fait qu'appeler les fonctions correspondantes.
// Un client ne doit jamais pouvoir décider qu'il a le droit d'envoyer un Tok.
// ============================================================

import { supabase } from "../supabaseClient.js";

// Participants à qui je peux envoyer un Tok, ici et maintenant. La liste est déjà filtrée
// côté serveur — inutile d'écarter quoi que ce soit ici.
export async function loadTokTargets(salonCode) {
  if (!salonCode) return [];
  const { data, error } = await supabase.rpc("get_tok_targets", { p_salon_code: salonCode });
  if (error) {
    console.error("loadTokTargets:", error);
    return [];
  }
  return (data || []).map((r) => ({ userId: r.user_id, name: r.display_name, avatarUrl: r.avatar_url, bibaZero: r.biba_zero }));
}

// Les actions possibles. Liste fermée, validée aussi côté serveur : l'interface doit savoir
// afficher tout ce qui peut arriver.
export const TOK_ACTIONS = [
  { key: "SMALL_SIP", short: "Petite gorgée", label: "Petite gorgée ensemble ?" },
  { key: "CHUG", short: "On affone ?", label: "On affone ?" },
];

// targetUserIds est une liste : le serveur bascule tout seul en Tok collectif au-delà d'un
// destinataire, et écarte au passage ceux qui sont en cooldown plutôt que d'échouer en bloc.
export async function sendTok(salonCode, targetUserIds, action = "SMALL_SIP") {
  const list = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
  const { data, error } = await supabase.rpc("send_tok", {
    p_salon_code: salonCode,
    p_target_user_ids: list,
    p_action: action,
  });
  if (error) {
    console.error("sendTok:", error);
    // Le serveur renvoie des raisons courtes ; on les traduit ici plutôt que d'afficher
    // un message technique.
    if (error.message?.includes("cooldown")) return { error: "Tu viens déjà de leur envoyer un Tok — laisse-leur une minute." };
    if (error.message?.includes("destinataire indisponible")) return { error: "Personne de sélectionné ne peut recevoir de Tok pour l'instant." };
    return { error: "Le Tok n'est pas parti. Réessaie." };
  }
  return { id: data };
}

export async function respondTok(tokId, accept) {
  const { data, error } = await supabase.rpc("respond_tok", { p_tok_id: tokId, p_accept: accept });
  if (error) {
    console.error("respondTok:", error);
    return { error: "Réponse impossible. Réessaie." };
  }
  return { status: data };
}

// Les Tok qui m'attendent dans ce salon. Ceux qui ont expiré n'en font simplement plus partie.
export async function loadMyPendingToks(salonCode) {
  if (!salonCode) return [];
  const { data, error } = await supabase.rpc("get_my_pending_toks", { p_salon_code: salonCode });
  if (error) {
    console.error("loadMyPendingToks:", error);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    senderAvatarUrl: r.sender_avatar_url,
    action: r.action,
    expiresAt: r.expires_at,
  }));
}

// Temps réel — un Tok reçu ou une réponse apparaissent sans rafraîchir. Comme ailleurs, les
// règles de lecture filtrent déjà ce qui arrive, et le nom de canal est unique par abonnement.
export function subscribeToToks(onChange) {
  const channel = supabase
    .channel(`toks-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "toks" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------------- RÉGLAGE PAR SALON ---------------- */

// Absence de ligne = activé : on n'écrit que lorsque quelqu'un désactive, puis rétablit.
export async function loadSalonTokEnabled(salonCode) {
  if (!salonCode) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;
  const { data, error } = await supabase
    .from("salon_tok_settings")
    .select("enabled")
    .eq("salon_code", salonCode)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("loadSalonTokEnabled:", error);
    return true;
  }
  return data ? data.enabled : true;
}

export async function setSalonTokEnabled(salonCode, enabled) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await supabase
    .from("salon_tok_settings")
    .upsert({ salon_code: salonCode, user_id: user.id, enabled }, { onConflict: "salon_code,user_id" });
  if (error) {
    console.error("setSalonTokEnabled:", error);
    return { error: error.message };
  }
  return { ok: true };
}
