// ============================================================
// Composants de sélection réutilisables — copiés tels quels
// depuis le prototype Claude (choisir des Bibax, des participants,
// ou un établissement existant dans le répertoire).
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { makeSearchMatcher, capitalizeFirst, sameVenueByNameCity } from "../utils.js";
import { searchVenues } from "../data/sharedDirectories.js";
import bibaxIconUrl from "../assets/brand/bibax.svg";
import { EntityAvatar } from "./ui.jsx";
import { AddAfterSearch } from "./AddAfterSearch.jsx";
import { AddVenueOverlay } from "./AddVenueOverlay.jsx";

export function BibaxSearchPicker({ bibros, excludeCodes = [], onPick, placeholder = "Rechercher un Bibax..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const available = bibros.filter((b) => !excludeCodes.includes(b.code));
  // Même règle de recherche que partout dans l'app (voir makeSearchMatcher) : prénom, nom, surnom et alias, dans n'importe quel ordre.
  const matchesQuery = makeSearchMatcher(query);
  const searchText = (b) => [b.alias, b.firstName || b.name, b.lastName, b.nickname].filter(Boolean).join(" ");
  const filtered = available.filter((b) => matchesQuery(searchText(b))).sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return searchText(a).localeCompare(searchText(b));
  });

  const pick = (b) => {
    onPick(b);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "11px 14px",
          borderRadius: "10px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          fontSize: "12.5px",
          color: COLORS.inkSoft,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <img src={bibaxIconUrl} alt="" style={{ width: "14px", height: "14px", display: "block" }} />
          Ajouter depuis tes Bibax...
        </span>
        <span style={{ fontSize: "11px" }}>{open ? "▲" : "▾"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "none", borderBottom: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {available.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Tous tes Bibax sont déjà ajoutés.</p>
            ) : filtered.length === 0 ? (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", padding: "12px 14px", margin: 0 }}>Aucun Bibax trouvé.</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.code}
                  onClick={() => pick(b)}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: COLORS.ink, cursor: "pointer" }}
                >
                  {b.isFavorite && (
                    <span style={{ display: "inline-flex", verticalAlign: "-3px", marginRight: "7px" }}>
                      <NavIcon name="heart" size={16} color={COLORS.amber} filled />
                    </span>
                  )}
                  {b.alias || [b.firstName || b.name, b.lastName].filter(Boolean).join(" ")}
                  {b.nickname && (
                    <span style={{ color: COLORS.amber, fontStyle: "italic", fontWeight: 600 }}>
                      {" "}
                      <span style={{ color: COLORS.inkSoft, fontStyle: "normal" }}>·</span> {b.nickname}
                    </span>
                  )}
                  {b.alias && (
                    <span style={{ color: COLORS.inkSoft, fontWeight: 500, fontSize: "12.5px" }}>
                      {" "}
                      ({[b.firstName || b.name, b.lastName].filter(Boolean).join(" ")})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ParticipantsEditor({ names, onChange, placeholder = "Participants sans compte Bibamus", selfName, bibros, myBibroCode, onInviteBibax, pendingInvites = [], onCancelInvite }) {
  const [nameInput, setNameInput] = useState("");

  const addName = () => {
    const trimmed = capitalizeFirst(nameInput.trim());
    if (!trimmed) return;
    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setNameInput("");
      return;
    }
    onChange([...names, trimmed]);
    setNameInput("");
  };

  const removeName = (n) => onChange(names.filter((x) => x !== n));

  return (
    <div>
      {bibros && bibros.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <BibaxSearchPicker
            bibros={bibros.filter(
              (b) =>
                b.code !== myBibroCode &&
                !names.some((n) => n.toLowerCase() === (b.alias || b.name).toLowerCase()) &&
                !pendingInvites.some((p) => p.userId === b.userId)
            )}
            onPick={(b) => {
              if (onInviteBibax) {
                onInviteBibax(b);
                return;
              }
              const label = capitalizeFirst(b.alias || b.name);
              if (!names.some((n) => n.toLowerCase() === label.toLowerCase())) onChange([...names, label]);
            }}
          />
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addName()}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 10px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          {!nameInput && (
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "12.5px",
                color: COLORS.inkSoft,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "calc(100% - 20px)",
              }}
            >
              {placeholder}
            </span>
          )}
        </div>
        <button onClick={addName} style={{ background: COLORS.surfaceAlt, color: COLORS.chalkWhite, border: "none", borderRadius: "10px", padding: "0 18px", fontWeight: 700, fontSize: "18px", cursor: "pointer" }}>
          +
        </button>
      </div>
      {(names.length > 0 || selfName || pendingInvites.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {selfName && (
            <div
              style={{
                background: COLORS.paperAlt,
                border: `2px solid ${COLORS.amber}`,
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              {selfName} (moi)
            </div>
          )}
          {pendingInvites.map((p) => (
            <div
              key={`invite-${p.userId}`}
              style={{
                background: COLORS.surface,
                border: `2px dashed ${COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "6px 8px 6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: COLORS.inkSoft,
              }}
            >
              {p.name}
              <span style={{ fontSize: "11px", fontWeight: 500 }}>· Invité</span>
              {onCancelInvite && (
                <button
                  onClick={() => onCancelInvite(p.userId)}
                  title="Annuler l'invitation"
                  style={{ background: COLORS.paperAlt, border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", color: COLORS.inkSoft, fontSize: "12px" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {names.map((n) => (
            <div
              key={n}
              style={{
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "6px 8px 6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              {n}
              <button onClick={() => removeName(n)} style={{ background: COLORS.paperAlt, border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", color: COLORS.inkSoft, fontSize: "12px" }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Le lieu d'un salon BibaRoom (création et réglages) : recherche dans BibAtlas. Un lieu introuvable se propose à l'ajout (décidé par Mehdi, 2026-11-20) : le bloc
// « Ce lieu n'est pas encore présent sur BibAtlas ? » (cadre rose) ouvre l'assistant « Ajouter un lieu » PAR-DESSUS l'écran, sans perdre le titre ni les réglages déjà
// saisis, et le lieu créé est aussitôt choisi. Il remplace l'ancien petit lien « + Ajouter un nouveau lieu », qui ne créait aucun vrai lieu (un nom et une ville, sans fiche).
export function PublicVenueSearchPicker({ myVenues, onPick, onOpen }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  // Le texte pour lequel la recherche a répondu (le bloc d'ajout n'apparaît que s'il est celui du champ) ; addVenueName : « Ajouter un lieu » ouvert par-dessus.
  const [searchedFor, setSearchedFor] = useState("");
  const [addVenueName, setAddVenueName] = useState(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    // Pendant l'assistant « Ajouter un lieu » (affiché hors de ce bloc), un toucher n'est pas un toucher « à côté » : la liste reste ouverte.
    if (!open || addVenueName !== null) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, addVenueName]);

  // Recherche côté serveur — contrairement à l'ancien comportement, la liste reste vide tant
  // qu'aucun terme n'est tapé (au lieu de montrer tout le répertoire par défaut).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setFiltered([]);
      setSearchedFor("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchVenues(q).then((found) => {
        if (cancelled) return;
        setFiltered(found);
        setSearchedFor(q);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const alreadyTracked = (v) =>
    myVenues.some((mv) => mv.sourcePublicVenueId === v.id) ||
    myVenues.some((mv) => sameVenueByNameCity(mv, v));

  const pick = (v) => {
    onPick(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() =>
          setOpen((o) => {
            const next = !o;
            if (next) onOpen?.();
            return next;
          })
        }
        style={{
          width: "100%",
          textAlign: "center",
          padding: "11px",
          borderRadius: "9px",
          border: `2px solid ${COLORS.paperAlt}`,
          background: COLORS.surface,
          color: COLORS.ink,
          fontWeight: 700,
          fontSize: "13.5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <NavIcon name="search" size={16} color={COLORS.amber} />
        <span>
          Bib<span style={{ color: COLORS.amber }}>Atlas</span>
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: COLORS.surface,
            border: `2px solid ${COLORS.paperAlt}`,
            borderRadius: "10px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            maxHeight: "320px",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, ville ou code postal..."
            autoFocus
            style={{ margin: "8px", padding: "9px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13.5px", outline: "none" }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun résultat.</div>
            )}
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => pick(v)}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                {/* Rond de profil du lieu (photo, à défaut émoji, à défaut « B » Bibamus), comme dans « Voir les lieux près de chez vous » — Mehdi, 2026-11-19. */}
                <EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={36} />
                <span style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13.5px", color: COLORS.ink }}>
                    {v.name}
                  </div>
                  <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "1px" }}>
                    {[v.city, alreadyTracked(v) ? "✓ déjà utilisé" : null].filter(Boolean).join(" · ")}
                  </div>
                </span>
              </button>
            ))}
            {/* Le lieu n'existe pas encore sur BibAtlas : proposition d'ajout, sous les résultats, une fois la recherche revenue pour le texte tapé. */}
            {query.trim().length >= 2 && searchedFor === query.trim() && (
              <div style={{ padding: "10px 12px 12px" }} data-add-venue="1">
                <AddAfterSearch query={query.trim()} onAdd={setAddVenueName} noun="lieu" label="Proposer un établissement" framed />
              </div>
            )}
          </div>
        </div>
      )}
      {addVenueName !== null && (
        <AddVenueOverlay
          initialName={addVenueName}
          onChosen={(v) => {
            setAddVenueName(null);
            pick(v);
          }}
          onClose={() => setAddVenueName(null)}
        />
      )}
    </div>
  );
}
