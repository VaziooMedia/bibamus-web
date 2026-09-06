// ============================================================
// Page d'un BibaClub — en-tête (photo, nom, catégorie), puis 3
// onglets : Fil (publications des membres), Membres (liste +
// rôles + demandes en attente), Stats (calculées à partir des
// salons rattachés).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton, EntityAvatar } from "./ui.jsx";
import {
  loadClubDetail,
  loadClubMembers,
  loadClubPosts,
  createClubPost,
  deleteClubPost,
  loadClubStats,
  loadPendingClubRequests,
  approveClubMember,
  rejectClubMember,
  updateClubMemberRole,
  removeClubMember,
  leaveClub,
  joinClub,
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

export function ClubDetailScreen({ clubId, myUserId, onBack, onOpenProfile }) {
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState(null);
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const refreshMembers = () => loadClubMembers(clubId).then(setMembers);

  useEffect(() => {
    loadClubDetail(clubId).then(setClub);
    refreshMembers();
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

  const handleJoin = async () => {
    setJoinBusy(true);
    setJoinError(null);
    const result = await joinClub(clubId, myUserId, { inviteCode: inviteCodeInput });
    setJoinBusy(false);
    if (result.error) {
      setJoinError(result.error);
      return;
    }
    refreshMembers();
  };

  if (!club || members === null) {
    return (
      <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <PageHeader onBack={onBack} />
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "4px 0 14px" }}>
        <EntityAvatar photoUrl={club.photoUrl} size={64} fallbackIcon="crown" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>{club.name}</h1>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>
            {club.category && `${CATEGORY_LABEL[club.category] || club.category} · `}
            {club.visibility === "public" ? "Public" : "Privé"}
          </div>
        </div>
      </div>
      {club.description && <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>{club.description}</p>}

      {!isMember && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
          {myMembership?.status === "pending" ? (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0 }}>Votre demande est en attente de validation.</p>
          ) : (
            <>
              {club.joinMode === "invite" && (
                <input
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="Code d'invitation"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: COLORS.paper, color: COLORS.ink, fontSize: "14px", marginBottom: "10px" }}
                />
              )}
              {joinError && <p style={{ fontSize: "12px", color: "#FF3B3B", marginBottom: "10px" }}>{joinError}</p>}
              <PrimaryButton onClick={handleJoin} disabled={joinBusy || (club.joinMode === "invite" && !inviteCodeInput.trim())} style={{ width: "100%" }}>
                {joinBusy ? "..." : club.joinMode === "request" ? "Demander à rejoindre" : "Rejoindre"}
              </PrimaryButton>
            </>
          )}
        </div>
      )}

      {isMember && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            {["feed", "members", "stats"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "10px",
                  border: `2px solid ${tab === t ? COLORS.amber : COLORS.paperAlt}`,
                  background: tab === t ? COLORS.amber : "none",
                  color: tab === t ? COLORS.paper : COLORS.ink,
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t === "feed" ? "Fil" : t === "members" ? "Membres" : "Stats"}
              </button>
            ))}
          </div>

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
                  <label style={{ fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Demandes en attente</label>
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

              {club.joinMode === "invite" && isAdminOrMod && club.inviteCode && (
                <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "18px", textAlign: "center" }}>
                  <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: "0 0 6px" }}>Code d'invitation à partager</p>
                  <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "4px" }}>{club.inviteCode}</div>
                </div>
              )}

              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
                {members
                  .filter((m) => m.status === "active")
                  .map((m, i, arr) => (
                    <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.paperAlt}` }}>
                      <EntityAvatar photoUrl={m.avatarUrl} size={36} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{[m.name, m.lastName].filter(Boolean).join(" ") || "Quelqu'un"}</div>
                        <div style={{ fontSize: "11.5px", color: COLORS.inkSoft }}>{ROLE_LABEL[m.role]}</div>
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
                            onClick={() => removeClubMember(clubId, m.userId).then(refreshMembers)}
                            style={{ background: "none", border: "none", padding: "6px", cursor: "pointer" }}
                          >
                            <NavIcon name="x" size={14} color={COLORS.inkSoft} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
              </div>

              {myMembership?.role !== "admin" && (
                <button
                  onClick={() => leaveClub(clubId, myUserId).then(() => onBack())}
                  style={{ background: "none", border: "none", color: "#FF3B3B", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "18px" }}
                >
                  Quitter le club
                </button>
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

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
