// ============================================================
// Page d'un BibaClub — en-tête (photo, nom, catégorie), puis 3
// onglets : BibaPulse (publications des membres, ancien « Fil »),
// Biba360 (statistiques calculées à partir des salons rattachés,
// ancien « Stats »), Bibax (liste des membres + rôles + arrivées
// à valider + invitation de Bibax, ancien « Membres »).
// Les clés internes restent feed / stats / members.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { ClubInvitationCard } from "./ClubInvitationCard.jsx";
import { InviteBibaxPanel } from "./InviteBibaxPanel.jsx";
import { PhotoCropModal } from "./PhotoCropModal.jsx";
import {
  loadClubDetail,
  loadClubMembers,
  loadClubPosts,
  createClubPost,
  deleteClubPost,
  loadClubStats,
  loadPendingClubRequests,
  loadMyClubInvitations,
  approveClubMember,
  rejectClubMember,
  updateClubMemberRole,
  setClubAdmin,
  removeClubMember,
  leaveClub,
  joinClub,
  uploadClubPhoto,
  updateClubPhoto,
} from "../data/sharedDirectories.js";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

const ROLE_LABEL = { admin: "Admin", moderator: "Modérateur", member: "Membre" };
const CATEGORY_LABEL = { Sport: "Sport", Amis: "Amis", Travail: "Travail", Famille: "Famille", Étudiants: "Étudiants", Autre: "Autre" };

// Comment on entre dans le club, en quelques mots (sous le nom du club).
function entryLabel(club) {
  if (club.visibility === "public") {
    if (club.joinMode === "request") return "Public · sur demande";
    return "Public · accès libre";
  }
  return club.joinMode === "request" ? "Privé · sur invitation, arrivées validées" : "Privé · sur invitation";
}

export function ClubDetailScreen({ clubId, myUserId, myName, onBack, onOpenProfile }) {
  const [club, setClub] = useState(null);
  const [clubLoaded, setClubLoaded] = useState(false);
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState(null);
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [memberActionError, setMemberActionError] = useState(null);
  // Mon invitation en attente dans ce club, s'il y en a une (la carte garde la main une fois la réponse donnée).
  const [invitation, setInvitation] = useState(null);
  // Changement de la photo du club (administrateurs seulement) : choix, recadrage, envoi, enregistrement.
  const [croppingFile, setCroppingFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const photoInputRef = useRef(null);

  const refreshMembers = () => loadClubMembers(clubId).then(setMembers);

  useEffect(() => {
    loadClubDetail(clubId).then((c) => {
      setClub(c);
      setClubLoaded(true);
    });
    refreshMembers();
    loadMyClubInvitations().then((result) => setInvitation((result.invitations || []).find((i) => i.clubId === clubId) || null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (tab === "feed" && posts === null) loadClubPosts(clubId).then(setPosts);
    if (tab === "stats" && stats === null) loadClubStats(clubId).then(setStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const myMembership = members?.find((m) => m.userId === myUserId);
  const isMember = myMembership?.status === "active";
  const isAdminOrMod = isMember && (myMembership.role === "admin" || myMembership.role === "moderator");
  const isAdmin = isMember && myMembership.role === "admin";
  // Un administrateur ne peut quitter le club que s'il reste un autre administrateur actif.
  const otherActiveAdminExists = (members || []).some((m) => m.status === "active" && m.role === "admin" && m.userId !== myUserId);
  const otherActiveMemberExists = (members || []).some((m) => m.status === "active" && m.userId !== myUserId);

  useEffect(() => {
    if (isAdminOrMod) loadPendingClubRequests(clubId).then(setPending);
  }, [isAdminOrMod, clubId]);

  const handlePost = async () => {
    if (!postBody.trim()) return;
    setPosting(true);
    const result = await createClubPost(clubId, myUserId, postBody.trim());
    setPosting(false);
    if (!result.error) {
      setPostBody("");
      loadClubPosts(clubId).then(setPosts);
    }
  };

  const handleMakeAdmin = async (member) => {
    const name = [member.name, member.lastName].filter(Boolean).join(" ") || "cette personne";
    if (!window.confirm(`Nommer ${name} administrateur du club ? Elle pourra gérer les membres et nommer d'autres administrateurs.`)) return;
    setMemberActionError(null);
    const result = await setClubAdmin(clubId, member.userId);
    if (result.error) {
      setMemberActionError(result.error);
      return;
    }
    refreshMembers();
  };

  // Retirer un membre : on demande confirmation avant d'agir (la croix est petite, un tap par erreur
  // retirerait la personne aussitôt).
  const handleRemoveMember = async (member) => {
    const name = [member.name, member.lastName].filter(Boolean).join(" ") || "cette personne";
    if (!window.confirm(`Retirer ${name} du club ? Cette personne ne sera plus membre.`)) return;
    await removeClubMember(clubId, member.userId);
    refreshMembers();
  };

  // Quitter le club. Si l'on en est la seule personne, le quitter le supprime : on le dit et on demande
  // confirmation, d'après la liste des membres relue juste avant d'agir (elle a pu bouger depuis l'affichage).
  const handleLeave = async () => {
    setMemberActionError(null);
    const fresh = await loadClubMembers(clubId);
    const list = fresh.length > 0 ? fresh : members || [];
    const alone = !list.some((m) => m.status === "active" && m.userId !== myUserId);
    if (alone) {
      const pending = list.filter((m) => m.status === "pending" && m.userId !== myUserId).length;
      const extra = pending > 0 ? " et les demandes d'entrée en attente" : "";
      if (!window.confirm(`Vous êtes la seule personne de ce club : le quitter le supprimera définitivement, avec ses publications${extra}. Continuer ?`)) return;
    }
    const result = await leaveClub(clubId);
    if (result.error) {
      setMemberActionError(result.error);
      return;
    }
    onBack();
  };

  // Changer la photo du club : le choix ouvre d'abord le recadrage (comme pour une photo de profil) ; l'image
  // carrée obtenue est envoyée (vérification de contenu comprise) puis enregistrée par la fonction serveur, qui
  // refuse tout appel d'une personne qui n'est pas administratrice du club. Si l'enregistrement est refusé,
  // l'ancienne photo reste affichée.
  const handlePhotoChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Ce fichier n'est pas une image.");
      return;
    }
    setPhotoError(null);
    setCroppingFile(file);
  };

  const handleCroppedPhoto = async (blob) => {
    setCroppingFile(null);
    setUploadingPhoto(true);
    setPhotoError(null);
    const uploaded = await uploadClubPhoto(myUserId, blob);
    if (uploaded.error) {
      setUploadingPhoto(false);
      setPhotoError(uploaded.error);
      return;
    }
    const saved = await updateClubPhoto(clubId, uploaded.url);
    setUploadingPhoto(false);
    if (saved.error) {
      setPhotoError(saved.error);
      return;
    }
    setClub((c) => (c ? { ...c, photoUrl: uploaded.url } : c));
  };

  // Réponse à l'invitation : devenu membre (ou en attente de validation), on recharge la page.
  const handleInvitationResponded = () => {
    refreshMembers();
    loadClubDetail(clubId).then((c) => c && setClub(c));
  };

  const handleJoin = async () => {
    setJoinBusy(true);
    setJoinError(null);
    const result = await joinClub(clubId);
    setJoinBusy(false);
    if (result.error) {
      setJoinError(result.error);
      return;
    }
    refreshMembers();
    // Devenu membre, la fiche complète du club est lisible : on la recharge.
    loadClubDetail(clubId).then((c) => c && setClub(c));
  };

  if (clubLoaded && !club) {
    return (
      <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Ce club est introuvable, ou l'invitation n'est plus valable.</p>
      </div>
    );
  }

  if (!club || members === null) {
    return (
      <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "4px 0 14px" }}>
        {isAdmin ? (
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label="Changer la photo du club"
            style={{ position: "relative", width: "64px", height: "64px", padding: 0, border: "none", background: "none", borderRadius: "50%", cursor: uploadingPhoto ? "default" : "pointer", flexShrink: 0 }}
          >
            <EntityAvatar photoUrl={club.photoUrl} size={64} fallbackIcon="crown" />
            {uploadingPhoto ? (
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(13,27,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>...</span>
            ) : (
              <span style={{ position: "absolute", bottom: 0, right: 0, width: "22px", height: "22px", borderRadius: "50%", background: COLORS.amber, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${COLORS.paper}` }}>
                <NavIcon name="camera" size={11} color={COLORS.paper} />
              </span>
            )}
          </button>
        ) : (
          <EntityAvatar photoUrl={club.photoUrl} size={64} fallbackIcon="crown" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{club.name}</h1>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>
            {club.category && `${CATEGORY_LABEL[club.category] || club.category} · `}
            {entryLabel(club)}
          </div>
          {isAdmin && (
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{ background: "none", border: "none", padding: 0, marginTop: "4px", fontSize: "12px", fontWeight: 700, color: COLORS.amber, cursor: uploadingPhoto ? "default" : "pointer" }}
            >
              {club.photoUrl ? "Changer la photo" : "Ajouter une photo"}
            </button>
          )}
        </div>
        {isAdmin && <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChosen} style={{ display: "none" }} />}
      </div>
      {isAdmin && photoError && <p style={{ fontSize: "12.5px", color: COLORS.wine, margin: "-6px 0 14px" }}>{photoError}</p>}
      {club.description && <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>{club.description}</p>}

      {!isMember && (
        myMembership?.status === "pending" ? (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Votre entrée est en attente de validation par un administrateur du club.</p>
          </div>
        ) : invitation ? (
          <ClubInvitationCard invitation={invitation} onResponded={handleInvitationResponded} compact />
        ) : club.visibility === "public" ? (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
            {joinError && <p style={{ fontSize: "12px", color: "#FF3B3B", marginBottom: "10px" }}>{joinError}</p>}
            <PrimaryButton onClick={handleJoin} disabled={joinBusy} style={{ width: "100%" }}>
              {joinBusy ? "..." : club.joinMode === "request" ? "Demander à rejoindre" : "Rejoindre"}
            </PrimaryButton>
          </div>
        ) : (
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>On n'entre dans ce club que sur invitation d'un de ses membres.</p>
          </div>
        )
      )}

      {isMember && (
        <>
          <PillTabs
            tabs={[
              { key: "feed", label: { prefix: "Biba", accent: "Pulse" } },
              { key: "stats", label: { prefix: "Biba", accent: "360" } },
              { key: "members", label: { prefix: "Biba", accent: "x" } },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "feed" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Écrire au club..."
                  style={{ flex: 1, boxSizing: "border-box", padding: "10px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.surface, color: COLORS.ink, fontSize: "14px" }}
                />
                <button
                  onClick={handlePost}
                  disabled={!postBody.trim() || posting}
                  style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "0 16px", fontWeight: 700, color: COLORS.paper, cursor: "pointer", opacity: postBody.trim() ? 1 : 0.5 }}
                >
                  Publier
                </button>
              </div>

              {posts === null ? (
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center" }}>Chargement...</p>
              ) : posts.length === 0 ? (
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center" }}>Aucune publication pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {posts.map((p) => (
                    <div key={p.id} style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <EntityAvatar photoUrl={p.authorAvatarUrl} size={26} />
                        <span style={{ fontSize: "13px", fontWeight: 700 }}>{[p.authorName, p.authorLastName].filter(Boolean).join(" ")}</span>
                        <span style={{ fontSize: "11px", color: COLORS.inkSoft, marginLeft: "auto" }}>{timeAgo(p.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: "13.5px", margin: 0 }}>{p.body}</p>
                      {(p.authorId === myUserId || isAdminOrMod) && (
                        <button
                          onClick={() => deleteClubPost(p.id).then(() => loadClubPosts(clubId).then(setPosts))}
                          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11px", cursor: "pointer", padding: "6px 0 0", textAlign: "left" }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "members" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isAdminOrMod && pending.length > 0 && (
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Arrivées à valider</label>
                  <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "0 14px" }}>
                    {pending.map((p, i) => (
                      <div
                        key={p.userId}
                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0", borderBottom: i === pending.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}
                      >
                        <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600 }}>{p.name || "Quelqu'un"}</span>
                        <button
                          onClick={() => approveClubMember(clubId, p.userId).then(() => { refreshMembers(); loadPendingClubRequests(clubId).then(setPending); })}
                          style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => rejectClubMember(clubId, p.userId).then(() => loadPendingClubRequests(clubId).then(setPending))}
                          style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
                        >
                          Refuser
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <InviteBibaxPanel clubId={clubId} clubName={club.name} myName={myName} />

              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                {members
                  .filter((m) => m.status === "active")
                  .map((m, i, arr) => (
                    <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                      <EntityAvatar photoUrl={m.avatarUrl} size={36} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{[m.name, m.lastName].filter(Boolean).join(" ") || "Quelqu'un"}</div>
                        <div style={{ fontSize: "11.5px", color: COLORS.inkSoft }}>{ROLE_LABEL[m.role]}</div>
                        {isAdmin && m.userId !== myUserId && m.role !== "admin" && (
                          <button
                            onClick={() => handleMakeAdmin(m)}
                            style={{ background: "none", border: "none", padding: "4px 0 0", fontSize: "11.5px", fontWeight: 700, color: COLORS.amber, cursor: "pointer", textAlign: "left" }}
                          >
                            Nommer admin
                          </button>
                        )}
                      </span>
                      {isAdminOrMod && m.userId !== myUserId && m.role !== "admin" && (
                        <>
                          {m.role === "member" ? (
                            <button
                              onClick={() => updateClubMemberRole(clubId, m.userId, "moderator").then(refreshMembers)}
                              style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "6px 8px", fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
                            >
                              Promouvoir
                            </button>
                          ) : (
                            <button
                              onClick={() => updateClubMemberRole(clubId, m.userId, "member").then(refreshMembers)}
                              style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "6px 8px", fontSize: "11px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
                            >
                              Rétrograder
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(m)}
                            style={{ background: "none", border: "none", padding: "6px", cursor: "pointer" }}
                          >
                            <NavIcon name="x" size={14} color={COLORS.inkSoft} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
              </div>

              {memberActionError && <p style={{ fontSize: "12px", color: "#FF3B3B", margin: "14px 0 0" }}>{memberActionError}</p>}

              {(myMembership?.role !== "admin" || otherActiveAdminExists || !otherActiveMemberExists) && (
                <button
                  onClick={handleLeave}
                  style={{ background: "none", border: "none", color: "#FF3B3B", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "18px" }}
                >
                  {otherActiveMemberExists ? "Quitter le club" : "Quitter et supprimer le club"}
                </button>
              )}
              {myMembership?.role === "admin" && !otherActiveAdminExists && otherActiveMemberExists && (
                <p style={{ fontSize: "12px", color: COLORS.inkSoft, margin: "18px 0 0" }}>
                  Vous êtes le seul administrateur : nommez d'abord un autre administrateur pour pouvoir quitter le club.
                </p>
              )}
            </div>
          )}

          {tab === "stats" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {stats === null ? (
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center" }}>Chargement...</p>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
                    <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{stats.salonsCount || 0}</div>
                      <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Salon{stats.salonsCount > 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ flex: 1, background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "22px", fontWeight: 800, color: COLORS.amber }}>{stats.totalRounds}</div>
                      <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>Tournée{stats.totalRounds > 1 ? "s" : ""}</div>
                    </div>
                  </div>

                  {stats.memberStats.length > 0 && (
                    <>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Classement des tournées offertes</label>
                      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                        {stats.memberStats.map((m, i) => (
                          <div
                            key={m.name}
                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 0", borderBottom: i === stats.memberStats.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, width: "20px" }}>{i + 1}.</span>
                            <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600 }}>{m.name}</span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.amber }}>
                              {m.roundsCount} tournée{m.roundsCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {croppingFile && <PhotoCropModal file={croppingFile} onCancel={() => setCroppingFile(null)} onConfirm={handleCroppedPhoto} />}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
