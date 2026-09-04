import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CheersIcon } from "./icons.jsx";
import { PageHeader, EntityAvatar } from "./ui.jsx";
import { loadPulseFeed, togglePulseBix, togglePulseIncoming, toggleSanteReaction, loadPulseReactors, loadPulseComments, postPulseComment } from "../data/sharedDirectories.js";

// Résout l'objet concerné (produit/établissement/marque/producteur) depuis les répertoires déjà
// chargés en mémoire — jamais de duplication de la donnée métier dans BibaPulse lui-même,
// uniquement une référence (object_type/object_id) vers la vraie fiche.
function resolveObject(entry, directories) {
  if (!entry.objectType || !entry.objectId) return null;
  const map = { venue: directories.venues, drink: directories.drinksDirectory, producer: directories.breweriesDirectory, brand: directories.brandsDirectory };
  return (map[entry.objectType] || []).find((x) => x.id === entry.objectId) || null;
}

// Gabarit textuel par type d'événement — jamais de phrase figée stockée en base, uniquement
// reconstruite ici à partir des données structurées (prêt pour une traduction future).
// Format neutre "Nom - Action @ Objet" — évite les problèmes d'accord (masculin/féminin,
// préposition selon le nom du lieu) qu'une vraie phrase française poserait.
function pulseActionFor(entry) {
  return { product_discovered: "Découverte", venue_visit: "Check", database_contribution: "Ajout" }[entry.eventType] || "Activité";
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `Il y a ${secs} sec.`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Il y a ${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

// Petite liste de personnes (utilisée pour les Bix et les "J'arrive") — nom + avatar.
function ReactorsList({ people, emptyLabel }) {
  if (people.length === 0) return <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "10px 0" }}>{emptyLabel}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
      {people.map((p) => (
        <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <EntityAvatar photoUrl={p.avatarUrl} size={26} />
          <span style={{ fontSize: "13px", color: COLORS.ink }}>{[p.name, p.lastName].filter(Boolean).join(" ")}</span>
        </div>
      ))}
    </div>
  );
}

function PulseCard({ entry, directories, myUserId, onOpenVenue, onOpenDrink, onUpdate }) {
  const [showReactors, setShowReactors] = useState(false);
  const [reactorsTab, setReactorsTab] = useState("bix");
  const [reactors, setReactors] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [posting, setPosting] = useState(false);

  const obj = resolveObject(entry, directories);

  const canOpenObject = obj && ((entry.objectType === "venue" && onOpenVenue) || (entry.objectType === "drink" && onOpenDrink));
  const openObject = canOpenObject
    ? () => {
        if (entry.objectType === "venue") onOpenVenue(obj.id);
        if (entry.objectType === "drink") onOpenDrink(obj.id);
      }
    : null;

  const handleBix = () => {
    onUpdate({ iBixed: !entry.iBixed, bixCount: entry.iBixed ? entry.bixCount - 1 : entry.bixCount + 1 });
    togglePulseBix(entry.id, entry.iBixed);
  };

  const handleIncoming = () => {
    onUpdate({ iAmIncoming: !entry.iAmIncoming, incomingCount: entry.iAmIncoming ? entry.incomingCount - 1 : entry.incomingCount + 1 });
    togglePulseIncoming(entry.id, entry.iAmIncoming);
  };

  const handleSante = () => {
    onUpdate({ iSaidSante: !entry.iSaidSante, santeCount: entry.iSaidSante ? entry.santeCount - 1 : entry.santeCount + 1 });
    toggleSanteReaction(entry.id);
  };

  const openReactors = async (tab) => {
    setReactorsTab(tab);
    setShowReactors(true);
    if (!reactors) setReactors(await loadPulseReactors(entry.id));
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !comments) setComments(await loadPulseComments(entry.id));
  };

  const submitComment = async () => {
    const body = commentInput.trim();
    if (!body) return;
    setPosting(true);
    const result = await postPulseComment(entry.id, body);
    setPosting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setCommentInput("");
    onUpdate({ commentsCount: entry.commentsCount + 1 });
    setComments(await loadPulseComments(entry.id));
  };

  return (
    <div style={{ position: "relative", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px" }}>
      <span style={{ position: "absolute", top: "12px", right: "14px", fontSize: "11px", color: COLORS.inkSoft }}>{timeAgo(entry.createdAt)}</span>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
        <EntityAvatar photoUrl={entry.actorAvatarUrl} size={36} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: "60px" }}>
          <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[entry.actorName, entry.actorLastName].filter(Boolean).join(" ") || "Quelqu'un"}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: COLORS.ink }}>
            {pulseActionFor(entry)} @{" "}
            {obj && openObject ? (
              <button onClick={openObject} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: COLORS.amber, cursor: "pointer" }}>
                {obj.name}
              </button>
            ) : (
              <strong style={{ color: COLORS.amber }}>{obj?.name || "une fiche"}</strong>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
        <button
          onClick={handleBix}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: `2px solid ${entry.bixCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
            <NavIcon name="heart" size={15} color={entry.bixCount > 0 ? COLORS.amber : COLORS.inkSoft} filled={entry.bixCount > 0} />
          </span>
          {entry.bixCount > 0 && <span style={{ color: "#fff" }}>{entry.bixCount}</span>}
        </button>

        {entry.eventType === "venue_visit" && (
          <button
            onClick={entry.actorId !== myUserId ? handleIncoming : undefined}
            disabled={entry.actorId === myUserId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: entry.iAmIncoming ? COLORS.amber : "none",
              border: `2px solid ${entry.incomingCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: entry.iAmIncoming ? COLORS.paper : entry.incomingCount > 0 ? COLORS.amber : COLORS.inkSoft,
              cursor: entry.actorId === myUserId ? "default" : "pointer",
              opacity: entry.actorId === myUserId ? 0.45 : 1,
            }}
          >
            J'arrive !{entry.incomingCount > 0 && <span style={{ color: "#fff" }}>{` ${entry.incomingCount}`}</span>}
          </button>
        )}

        {entry.eventType === "product_discovered" && (
          <button
            onClick={handleSante}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: entry.iSaidSante ? COLORS.amber : "none",
              border: `2px solid ${entry.santeCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: entry.iSaidSante ? COLORS.paper : entry.santeCount > 0 ? COLORS.amber : COLORS.inkSoft,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
              <CheersIcon size={16} />
            </span>
            {entry.santeCount > 0 && <span>{entry.santeCount}</span>}
          </button>
        )}

        <button
          onClick={toggleComments}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: `2px solid ${entry.commentsCount > 0 ? COLORS.amber : COLORS.paperAlt}`,
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
            <NavIcon name="comment" size={14} color={entry.commentsCount > 0 ? COLORS.amber : COLORS.inkSoft} />
          </span>
          {entry.commentsCount > 0 && <span style={{ color: "#fff" }}>{entry.commentsCount}</span>}
        </button>
      </div>

      {/* Résumé façon Instagram — plus facile à toucher qu'un petit nombre isolé, et ouvre la
      liste complète des personnes concernées. */}
      {entry.bixCount > 0 && (
        <button onClick={() => openReactors("bix")} style={{ display: "block", background: "none", border: "none", padding: "6px 0 0", textAlign: "left", cursor: "pointer" }}>
          <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
            Bixé par <strong style={{ color: COLORS.ink }}>{entry.lastBixerName || "quelqu'un"}</strong>
            {entry.bixCount > 1 && (
              <>
                {" "}
                et <strong style={{ color: COLORS.ink }}>{entry.bixCount - 1} autre{entry.bixCount > 2 ? "s Bibax" : " Bibax"}</strong>
              </>
            )}
          </span>
        </button>
      )}
      {entry.incomingCount > 0 && (
        <button onClick={() => openReactors("incoming")} style={{ display: "block", background: "none", border: "none", padding: "4px 0 0", textAlign: "left", cursor: "pointer" }}>
          <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
            <strong style={{ color: COLORS.ink }}>{entry.incomingCount}</strong> Bibax {entry.incomingCount > 1 ? "arrivent" : "arrive"}
          </span>
        </button>
      )}
      {entry.santeCount > 0 && (
        <button onClick={() => openReactors("sante")} style={{ display: "block", background: "none", border: "none", padding: "4px 0 0", textAlign: "left", cursor: "pointer" }}>
          <span style={{ fontSize: "12px", color: COLORS.inkSoft }}>
            <strong style={{ color: COLORS.ink }}>{entry.santeCount}</strong> Cheers
          </span>
        </button>
      )}

      {showComments && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${COLORS.paperAlt}` }}>
          {comments === null ? (
            <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
              {comments.length === 0 ? (
                <p style={{ fontSize: "12px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun commentaire pour l'instant.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: "8px" }}>
                    <EntityAvatar photoUrl={c.userAvatarUrl} size={24} />
                    <div>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: COLORS.ink }}>{c.userName}</span>
                      <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: COLORS.ink }}>{c.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Commenter ..."
              style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "12.5px", background: COLORS.surfaceAlt, color: COLORS.ink, outline: "none" }}
            />
            <button
              onClick={submitComment}
              disabled={!commentInput.trim() || posting}
              style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "0 14px", fontWeight: 700, fontSize: "12.5px", color: COLORS.paper, cursor: "pointer", opacity: commentInput.trim() ? 1 : 0.5 }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}

      {showReactors && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 300 }} onClick={() => setShowReactors(false)}>
          <div style={{ background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: "16px 20px 28px", width: "100%", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "8px", borderBottom: `2px solid ${COLORS.paperAlt}` }}>
              <button
                onClick={() => setReactorsTab("bix")}
                style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "bix" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "bix" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
              >
                Bix ({entry.bixCount})
              </button>
              {entry.eventType === "venue_visit" && (
                <button
                  onClick={() => setReactorsTab("incoming")}
                  style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "incoming" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "incoming" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
                >
                  J'arrive ! ({entry.incomingCount})
                </button>
              )}
              {entry.eventType === "product_discovered" && (
                <button
                  onClick={() => setReactorsTab("sante")}
                  style={{ background: "none", border: "none", padding: "8px 0", fontSize: "13px", fontWeight: 700, color: reactorsTab === "sante" ? COLORS.amber : COLORS.inkSoft, borderBottom: reactorsTab === "sante" ? `2px solid ${COLORS.amber}` : "none", cursor: "pointer" }}
                >
                  Cheers ! ({entry.santeCount})
                </button>
              )}
            </div>
            {reactors === null ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "10px 0" }}>Chargement...</p>
            ) : (
              <ReactorsList
                people={reactorsTab === "bix" ? reactors.bix : reactorsTab === "incoming" ? reactors.incoming : reactors.sante}
                emptyLabel={reactorsTab === "bix" ? "Personne n'a encore Bix." : reactorsTab === "incoming" ? "Personne n'a encore signalé son arrivée." : "Personne n'a encore trinqué."}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BibaPulseScreen({ onBack, venues = [], drinksDirectory = [], breweriesDirectory = [], brandsDirectory = [], myUserId, onOpenVenue, onOpenDrink }) {
  const [entries, setEntries] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const directories = { venues, drinksDirectory, breweriesDirectory, brandsDirectory };

  useEffect(() => {
    loadPulseFeed().then((data) => {
      setEntries(data);
      setHasMore(data.length >= 20);
    });
    // Rafraîchit périodiquement le haut du fil — sans ça, un Bix ou un commentaire d'un ami ne
    // se refléterait jamais tant qu'on ne recharge pas la page à la main. Fusionne les
    // nouvelles données dans la liste déjà chargée, sans perdre les pages plus anciennes.
    const interval = setInterval(() => {
      loadPulseFeed().then((freshTop) => {
        setEntries((prev) => {
          if (!prev) return freshTop;
          const freshMap = new Map(freshTop.map((e) => [e.id, e]));
          const merged = prev.map((e) => freshMap.get(e.id) || e);
          const newOnes = freshTop.filter((e) => !prev.some((p) => p.id === e.id));
          return [...newOnes, ...merged];
        });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    const oldest = entries[entries.length - 1].createdAt;
    const more = await loadPulseFeed(oldest);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  };

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
        <span style={{ width: "5px", height: "32px", background: COLORS.amber, borderRadius: "3px", flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          <span style={{ color: COLORS.ink }}>Biba</span>
          <span style={{ color: COLORS.amber }}>Pulse</span>
        </h1>
      </div>

      {entries === null ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Chargement...</p>
      ) : entries.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", margin: 0 }}>
            Aucune activité pour l'instant. Suivez d'autres Bibax ou attendez vos premières découvertes !
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry) => (
            <PulseCard
              key={entry.id}
              entry={entry}
              directories={directories}
              myUserId={myUserId}
              onOpenVenue={onOpenVenue}
              onOpenDrink={onOpenDrink}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ background: "none", border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft, cursor: "pointer" }}
            >
              {loadingMore ? "Chargement..." : "Voir plus"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
