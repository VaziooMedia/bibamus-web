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

export async function loadMyConversations(limit = 50, before = null) {
  const { data, error } = await supabase.rpc("get_my_conversations", {
    p_limit: limit,
    p_before: before,
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
export async function loadMessages(conversationId, limit = 40, before = null) {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);

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

export async function uploadMessagePhoto(conversationId, file) {
  const blob = await resizeImage(file);
  const imageBase64 = await blobToBase64(blob);
  const path = `${conversationId}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "messages", path, imageBase64, contentType: "image/jpeg", entityType: "message", entityId: conversationId, kind: "message" },
  });
  if (error) {
    console.error("uploadMessagePhoto:", error);
    return { error: "L'envoi de la photo a échoué." };
  }
  if (data?.error) return { error: data.error };
  return { url: data.url };
}

/* ---------------- TEMPS RÉEL ---------------- */

// Nouveaux messages d'une conversation ouverte. Retourne la fonction de
// désabonnement, à appeler au démontage de l'écran — même principe que
// subscribeToMyNotifications.
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
