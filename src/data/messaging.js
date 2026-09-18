// ============================================================
// BibaPing — accès aux données de la messagerie.
//
// Fichier séparé de sharedDirectories.js volontairement : BibaPing est en
// construction, autant le garder isolé le temps qu'il se stabilise.
//
// Convention d'erreur, différente du reste du projet et assumée : les
// fonctions de chargement renvoient `null` quand la requête échoue, et un
// tableau vide quand il n'y a réellement rien. Renvoyer [] dans les deux cas
// déguise une erreur réseau ou RLS en "aucun message", ce qui rend les bugs
// invisibles — on l'a payé assez cher sur la fiche produit.
// ============================================================

import { supabase } from "../supabaseClient.js";

/* ---------------- CONVERSATIONS ---------------- */

// Clé déterministe d'un tête-à-tête : les deux identifiants triés. C'est elle
// qui garantit, via l'index unique, que deux personnes qui s'écrivent au même
// instant n'ouvrent pas deux fils parallèles.
function directKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join("_");
}

export async function loadMyConversations(limit = 50, before = null, archived = false) {
  const { data, error } = await supabase.rpc("get_my_conversations", {
    p_limit: limit,
    p_before: before,
    p_archived: archived,
  });
  if (error) {
    console.error("loadMyConversations:", error);
    return null;
  }
  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    photoUrl: row.photo_url,
    salonCode: row.salon_code,
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
    lastMessageHasMedia: row.last_message_has_media,
    lastMessageSenderId: row.last_message_sender_id,
    unreadCount: row.unread_count || 0,
    memberIds: row.member_ids || [],
    clearedAt: row.cleared_at,
    archived: row.archived,
  }));
}

// Ouvre le tête-à-tête avec quelqu'un, ou le crée s'il n'existe pas encore.
// Renvoie { id } ou { error }.
export async function openDirectConversation(otherUserId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const key = directKey(user.id, otherUserId);

  // Déjà ouvert ?
  const { data: existing } = await supabase.from("conversations").select("id").eq("direct_key", key).maybeSingle();
  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ kind: "direct", direct_key: key, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    // 23505 = violation d'unicité : quelqu'un a créé le même fil pendant qu'on
    // le créait. Ce n'est pas une erreur, on récupère simplement le sien.
    if (error.code === "23505") {
      const { data: raced } = await supabase.from("conversations").select("id").eq("direct_key", key).maybeSingle();
      if (raced) return { id: raced.id };
    }
    console.error("openDirectConversation:", error);
    return { error: error.message };
  }

  // Moi d'abord : la policy autorise ensuite l'ajout de l'autre, puisque je
  // suis devenu membre.
  const { error: meError } = await supabase.from("conversation_members").insert({ conversation_id: created.id, user_id: user.id });
  if (meError) {
    console.error("openDirectConversation (moi):", meError);
    return { error: meError.message };
  }
  const { error: otherError } = await supabase.from("conversation_members").insert({ conversation_id: created.id, user_id: otherUserId });
  if (otherError) {
    console.error("openDirectConversation (destinataire):", otherError);
    return { error: otherError.message };
  }

  return { id: created.id };
}

export async function createGroupConversation(title, memberUserIds, photoUrl = null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ kind: "group", title, photo_url: photoUrl, created_by: user.id })
    .select("id")
    .single();
  if (error) {
    console.error("createGroupConversation:", error);
    return { error: error.message };
  }

  const { error: meError } = await supabase.from("conversation_members").insert({ conversation_id: created.id, user_id: user.id });
  if (meError) {
    console.error("createGroupConversation (moi):", meError);
    return { error: meError.message };
  }

  const others = [...new Set(memberUserIds.filter((id) => id && id !== user.id))];
  if (others.length > 0) {
    const { error: membersError } = await supabase
      .from("conversation_members")
      .insert(others.map((id) => ({ conversation_id: created.id, user_id: id })));
    if (membersError) {
      console.error("createGroupConversation (membres):", membersError);
      return { error: membersError.message };
    }
  }

  return { id: created.id };
}

// À appeler à la CRÉATION du salon, pas à l'ouverture du chat : c'est
// l'appartenance à cette conversation qui fait foi pour la règle "salon
// commun" côté base (can_message). Sans elle, deux personnes d'un même salon
// ne pourront pas s'écrire.
export async function ensureSalonConversation(salonCode, salonName, memberUserIds = []) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: existing } = await supabase.from("conversations").select("id").eq("salon_code", salonCode).eq("kind", "salon").maybeSingle();
  if (existing) {
    await addConversationMembers(existing.id, memberUserIds);
    return { id: existing.id };
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ kind: "salon", title: salonName || null, salon_code: salonCode, created_by: user.id })
    .select("id")
    .single();
  if (error) {
    console.error("ensureSalonConversation:", error);
    return { error: error.message };
  }

  await supabase.from("conversation_members").insert({ conversation_id: created.id, user_id: user.id });
  await addConversationMembers(created.id, memberUserIds);
  return { id: created.id };
}

// Ajoute des participants sans se soucier des doublons : la clé primaire
// (conversation_id, user_id) les rejette, on ignore simplement ce conflit.
export async function addConversationMembers(conversationId, userIds) {
  const list = [...new Set((userIds || []).filter(Boolean))];
  if (list.length === 0) return { ok: true };
  const { error } = await supabase
    .from("conversation_members")
    .upsert(
      list.map((id) => ({ conversation_id: conversationId, user_id: id })),
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("addConversationMembers:", error);
    return { error: error.message };
  }
  return { ok: true };
}

// Archivage et suppression sont personnels : ils n'écrivent que sur ma propre ligne de
// participation, jamais sur la conversation. L'autre ne voit rien changer.
export async function setConversationArchived(conversationId, archived) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await supabase
    .from("conversation_members")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) {
    console.error("setConversationArchived:", error);
    return { error: error.message };
  }
  return { ok: true };
}

// "Supprimer" de mon côté : la conversation et son historique disparaissent de ma liste. Les
// messages restent en base pour les autres participants — personne n'efface chez autrui.
export async function clearConversation(conversationId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await supabase
    .from("conversation_members")
    .update({ cleared_at: new Date().toISOString(), archived_at: null })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) {
    console.error("clearConversation:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function leaveConversation(conversationId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  // left_at plutôt qu'une suppression : l'historique reste cohérent pour les
  // autres participants.
  const { error } = await supabase
    .from("conversation_members")
    .update({ left_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) {
    console.error("leaveConversation:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function setConversationMuted(conversationId, muted) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await supabase
    .from("conversation_members")
    .update({ muted })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) {
    console.error("setConversationMuted:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/* ---------------- MESSAGES ---------------- */

// Les plus récents d'abord (c'est l'ordre de l'index). `before` = created_at
// du plus ancien message déjà chargé, pour remonter dans l'historique.
export async function loadMessages(conversationId, limit = 40, before = null, after = null) {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  // `after` = ma date de suppression : ce qui précède n'existe plus de mon côté.
  if (after) query = query.gt("created_at", after);

  const { data, error } = await query;
  if (error) {
    console.error("loadMessages:", error);
    return null;
  }
  return data.map(rowToMessage);
}

function rowToMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    mediaUrl: row.media_url,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export async function sendMessage(conversationId, body, mediaUrl = null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const text = (body || "").trim();
  if (!text && !mediaUrl) return { error: "Message vide." };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text || null, media_url: mediaUrl })
    .select()
    .single();

  if (error) {
    console.error("sendMessage:", error);
    // 42501 = refus RLS. En pratique : le salon a été clôturé et on n'est pas
    // devenus Bibax, ou l'un des deux a bloqué l'autre. Message explicite
    // plutôt qu'un jargon Postgres.
    if (error.code === "42501") {
      return { error: "Tu ne peux plus écrire dans cette conversation. Ajoutez-vous en Bibax pour continuer à discuter." };
    }
    return { error: error.message };
  }
  return { message: rowToMessage(data) };
}

export async function deleteMessage(messageId) {
  const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", messageId);
  if (error) {
    console.error("deleteMessage:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function markConversationRead(conversationId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) console.error("markConversationRead:", error);
}

/* ---------------- PHOTOS ---------------- */

// Même pipeline de modération que les avatars, les Stories et les photos de
// produits — rien de spécifique à la messagerie.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImage(file, maxDim = 1000, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Le bucket "messages" est PRIVÉ : on ne conserve donc pas une URL (elle ne résoudrait pas)
// mais le CHEMIN du fichier, signé à la demande au moment de l'affichage.
//
// Le chemin place le fichier dans un dossier portant l'identifiant de la conversation — c'est
// ce que la policy de stockage lit pour vérifier que le lecteur en est bien participant.
export async function uploadMessagePhoto(conversationId, file) {
  const blob = await resizeImage(file);
  const imageBase64 = await blobToBase64(blob);
  const path = `${conversationId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "messages", path, imageBase64, contentType: "image/jpeg", entityType: "message", entityId: conversationId, kind: "message" },
  });
  if (error) {
    console.error("uploadMessagePhoto:", error);
    return { error: "L'envoi de la photo a échoué." };
  }
  if (data?.error) return { error: data.error };
  // On ignore volontairement l'URL renvoyée par la fonction : sur un bucket privé, elle
  // n'aboutit pas.
  return { path };
}

// URL temporaire pour afficher une photo. Signée une heure : assez pour une consultation,
// assez court pour qu'un lien qui fuite ne serve pas longtemps.
export async function getMessagePhotoUrl(path) {
  const { data, error } = await supabase.storage.from("messages").createSignedUrl(path, 3600);
  if (error) {
    console.error("getMessagePhotoUrl:", error);
    return null;
  }
  return data?.signedUrl || null;
}

/* ---------------- TEMPS RÉEL ---------------- */

// Nouveaux messages d'une conversation ouverte. Retourne la fonction de
// désabonnement, à appeler au démontage de l'écran — même principe que
// subscribeToMyNotifications.
export function subscribeToMyMessages(onAnyNewMessage) {
  // Aucun filtre volontairement : Realtime applique les policies RLS au nom du client abonné,
  // donc seuls les messages de mes propres conversations arrivent ici. Sert au compteur global
  // de non-lus, qui n'a pas besoin de savoir de quelle conversation il s'agit.
  // Nom de canal unique : plusieurs composants (barre de navigation, accueil) s'abonnent en
  // même temps, et Supabase refuse d'ajouter un écouteur à un canal déjà souscrit s'ils
  // partagent le même nom.
  const channel = supabase
    .channel(`messages-all-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => onAnyNewMessage())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToConversation(conversationId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onNewMessage(rowToMessage(payload.new))
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------------- AUTORISATION ---------------- */

// Miroir côté client de la règle serveur, pour griser un bouton plutôt que
// laisser quelqu'un écrire un message qui sera refusé. La vérité reste la
// policy RLS : ceci n'est qu'un confort d'interface.
export async function canMessage(otherUserId) {
  const { data, error } = await supabase.rpc("can_message", { p_other_user_id: otherUserId });
  if (error) {
    console.error("canMessage:", error);
    return false;
  }
  return !!data;
}

/* ---------------- PROFILS ---------------- */

// loadMyConversations ne renvoie que des identifiants. Un tête-à-tête n'a ni
// titre ni photo : ils viennent du profil de l'autre participant. Un seul
// appel pour tous les membres de toutes les conversations affichées, via
// l'RPC déjà utilisée ailleurs dans le projet.
export async function loadConversationProfiles(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabase.rpc("get_profiles_basic", { p_ids: ids });
  if (error) {
    console.error("loadConversationProfiles:", error);
    return {};
  }
  return Object.fromEntries(
    (data || []).map((p) => [
      p.id,
      { id: p.id, displayName: p.display_name, lastName: p.last_name, avatarUrl: p.avatar_url },
    ])
  );
}

/* ---------------- COMPTEUR DE NON-LUS ---------------- */

// Toutes conversations confondues — pour la pastille de la barre de navigation et la tuile
// d'accueil. Calculé côté serveur : le client n'a jamais besoin de charger les conversations
// pour afficher ce nombre.
export async function loadMyUnreadMessageCount() {
  const { data, error } = await supabase.rpc("get_my_unread_message_count");
  if (error) {
    console.error("loadMyUnreadMessageCount:", error);
    return 0;
  }
  return data || 0;
}

/* ---------------- RÉACTIONS ---------------- */

// Palette fermée plutôt qu'un clavier emoji complet : plus rapide à poser, et une liste de
// réactions reste lisible d'un coup d'œil.
export const REACTION_EMOJIS = ["👌", "🍻", "😂", "❤️", "🫶", "🤗"];

// Réactions des messages affichés à l'écran, regroupées par message puis par emoji.
// Renvoie { [messageId]: [{ emoji, userIds }] }.
export async function loadMessageReactions(messageIds) {
  const ids = [...new Set((messageIds || []).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids);
  if (error) {
    console.error("loadMessageReactions:", error);
    return {};
  }
  const byMessage = {};
  (data || []).forEach((r) => {
    const list = (byMessage[r.message_id] = byMessage[r.message_id] || []);
    const existing = list.find((x) => x.emoji === r.emoji);
    if (existing) existing.userIds.push(r.user_id);
    else list.push({ emoji: r.emoji, userIds: [r.user_id] });
  });
  return byMessage;
}

// Une seule réaction par personne : poser le même emoji le retire, en poser un autre remplace
// le précédent. L'upsert s'appuie sur la clé primaire (message_id, user_id).
export async function setMessageReaction(messageId, emoji, currentEmoji) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  if (currentEmoji === emoji) {
    const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id);
    if (error) {
      console.error("setMessageReaction (retrait):", error);
      return { error: error.message };
    }
    return { ok: true };
  }

  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, user_id: user.id, emoji }, { onConflict: "message_id,user_id" });
  if (error) {
    console.error("setMessageReaction:", error);
    return { error: error.message };
  }
  return { ok: true };
}

// Temps réel — une réaction posée ailleurs apparaît sans rafraîchir. Comme pour les messages,
// RLS filtre déjà ce qui arrive ici, et le nom de canal est unique par abonnement.
export function subscribeToReactions(onChange) {
  const channel = supabase
    .channel(`reactions-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Code Bibax d'une liste de comptes — les écrans de profil s'ouvrent à partir d'un code,
// alors que la messagerie ne manipule que des identifiants de compte.
export async function loadBibroCodes(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabase.rpc("get_bibro_codes", { p_ids: ids });
  if (error) {
    console.error("loadBibroCodes:", error);
    return {};
  }
  return Object.fromEntries((data || []).map((r) => [r.id, r.bibro_code]));
}
