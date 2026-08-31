// ============================================================
// Écrans "Mes Bibax" — liste, fiche détaillée, ajout d'un
// contact, et déverrouillage admin. Copiés tels quels depuis
// le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, FacebookIcon, InstagramIcon, TiktokIcon, SnapchatIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, BackFooterLink, PrimaryButton } from "./ui.jsx";
import { ProfileHeader } from "./ProfileParts.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { QRCodeSVG } from "./QRCodeSVG.jsx";
import { normalizeForSearch, normalizeUrl, drinkTypeLabel, formatMemberSince, formatSharedBirthDate, computeAgeFromBirthDate } from "../utils.js";

export function BibrosListScreen({ myName, profile, checkIns, myBibroCode, bibros, bibroStatuses, goToAddBibro, onRemoveBibro, onSetAlias, onToggleFavorite, onJoinSalon, onViewBibro, onBack, onAddTestBibros }) {
  const [editingCode, setEditingCode] = useState(null);
  const [aliasInput, setAliasInput] = useState("");
  const [query, setQuery] = useState("");

  const startEditAlias = (b) => {
    setEditingCode(b.code);
    setAliasInput(b.alias || "");
  };

  const submitAlias = (code) => {
    onSetAlias(code, aliasInput.trim());
    setEditingCode(null);
  };

  const q = normalizeForSearch(query.trim());
  const matchesQuery = (b) =>
    !q ||
    [b.firstName, b.lastName, b.nickname, b.alias, b.username, b.city, b.country].some((field) => normalizeForSearch(field).includes(q));

  const sortedBibros = [...bibros].filter(matchesQuery).sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return (a.alias || a.name).localeCompare(b.alias || b.name);
  });

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>BIBAX</span>

      <ProfileHeader myName={myName} profile={profile} bibros={bibros} checkIns={checkIns} />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "4px 0 0 0", lineHeight: 1 }}>Tes Bibax</h1>
        <span
          style={{
            fontFamily: "'Urbanist', sans-serif",
            fontSize: "28px",
            color: COLORS.amberDark,
            fontWeight: 700,
            background: COLORS.paperAlt,
            border: `2px solid ${COLORS.amberDark}`,
            borderRadius: "10px",
            padding: "2px 14px",
          }}
        >
          {bibros.length}
        </span>
      </div>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "4px" }}>Ton code Bibax</div>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "26px", letterSpacing: "4px" }}>{myBibroCode || "…"}</div>
          <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "6px" }}>Partage-le à un ami pour qu'il t'ajoute comme Bibax.</p>
        </div>
        {myBibroCode && (
          <div style={{ position: "relative", opacity: 0.4, flexShrink: 0 }}>
            <QRCodeSVG value={myBibroCode} size={72} color={COLORS.paper} background={COLORS.ink} />
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.3px",
                color: COLORS.redFluo,
                background: COLORS.paperAlt,
                borderRadius: "999px",
                padding: "2px 6px",
              }}
            >
              Soon
            </span>
          </div>
        )}
      </div>

      <PrimaryButton onClick={goToAddBibro} style={{ width: "100%", marginBottom: "14px" }}>
        + Ajouter un Bibax
      </PrimaryButton>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher : prénom, nom, surnom, ville..."
        style={{ padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "16px" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {bibros.length === 0 && (
          <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Pas encore de Bibax — ajoutez-en un avec son code.</p>
        )}
        {bibros.length > 0 && sortedBibros.length === 0 && (
          <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun Bibax ne correspond à cette recherche.</p>
        )}
        {sortedBibros.map((b) => {
          const status = bibroStatuses[b.code];
          const isEditing = editingCode === b.code;
          return (
            <div key={b.code} style={{ background: COLORS.surface, border: `2px solid ${status ? COLORS.amber : COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <button
                    onClick={() => onToggleFavorite(b.code)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0 0 0", fontSize: "17px", color: b.isFavorite ? COLORS.amberDark : COLORS.paperAlt, lineHeight: 1 }}
                  >
                    {b.isFavorite ? "⭐" : "☆"}
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>
                      {b.avatarEmoji || "👤"} {b.alias || b.name}
                    </div>
                    {b.alias && <div style={{ fontSize: "11.5px", color: COLORS.inkSoft }}>alias de {b.name}</div>}
                    <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", color: COLORS.inkSoft }}>{b.code}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button onClick={() => startEditAlias(b)} style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    Étiquette
                  </button>
                  <button
                    onClick={() => onRemoveBibro(b.code)}
                    style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", cursor: "pointer", padding: "0 2px" }}
                    aria-label={`Retirer ${b.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>

              {(b.facebookUrl || b.instagramUrl || b.tiktokUrl || b.snapchatUrl) && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  {b.facebookUrl && (
                    <a href={normalizeUrl(b.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <FacebookIcon size={19} />
                    </a>
                  )}
                  {b.instagramUrl && (
                    <a href={normalizeUrl(b.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <InstagramIcon size={19} />
                    </a>
                  )}
                  {b.tiktokUrl && (
                    <a href={normalizeUrl(b.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <TiktokIcon size={19} />
                    </a>
                  )}
                  {b.snapchatUrl && (
                    <a href={normalizeUrl(b.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                      <SnapchatIcon size={19} />
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={() => onViewBibro(b.code)}
                style={{ background: "none", border: "none", color: COLORS.wine, fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "8px 0 0 0" }}
              >
                Voir le profil →
              </button>

              {isEditing && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}`, display: "flex", gap: "8px" }}>
                  <input
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitAlias(b.code)}
                    placeholder={`Ex. ${b.name} (voisin)`}
                    autoFocus
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "13px", outline: "none" }}
                  />
                  <button onClick={() => submitAlias(b.code)} style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "13px", cursor: "pointer", color: COLORS.paper }}>
                    OK
                  </button>
                </div>
              )}

              {status && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${COLORS.paperAlt}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px" }}>
                    🎉 En soirée : <strong>{status.activeSalonName}</strong>
                  </span>
                  <button
                    onClick={() => onJoinSalon(status.activeSalonCode)}
                    style={{ background: COLORS.amber, border: "none", borderRadius: "8px", padding: "7px 12px", fontWeight: 700, fontSize: "12.5px", cursor: "pointer", color: COLORS.paper }}
                  >
                    Rejoindre
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddTestBibros}
        style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", cursor: "pointer", padding: "0 0 10px 0", textAlign: "center", width: "100%", marginTop: "auto" }}
      >
        🧪 Ajouter 2 Bibax de test (Julburn & Cox)
      </button>
      <BackFooterLink onClick={onBack} />
    </div>
  );
}

export function BibroDetailScreen({ bibro, myBibros, onBack, previewNotice, onToggleFavorite }) {
  const displayName = bibro.alias || bibro.name;
  const fullName = [bibro.firstName, bibro.lastName].filter(Boolean).join(" ");
  const heading = fullName || displayName;
  const age = computeAgeFromBirthDate(bibro.birthDate);
  const etiquetteParts = [];
  if (bibro.nickname) etiquetteParts.push(bibro.nickname);
  if (bibro.username) etiquetteParts.push(`@${bibro.username}`);
  if (bibro.birthDate) etiquetteParts.push(age != null ? `${formatSharedBirthDate(bibro.birthDate)} (${age} ans)` : formatSharedBirthDate(bibro.birthDate));
  const hasContactInfo = bibro.email || bibro.country || bibro.region || bibro.city;
  const hasSocials = bibro.facebookUrl || bibro.instagramUrl || bibro.tiktokUrl || bibro.snapchatUrl;
  const records = bibro.records;
  const ranking = bibro.visitRanking;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      {previewNotice && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: COLORS.inkSoft }}>
          {previewNotice}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <span style={{ fontSize: "34px", lineHeight: 1 }}>{bibro.avatarEmoji || "👤"}</span>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", lineHeight: 1, margin: 0 }}>{heading}</h1>
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(bibro.code)}
            title={bibro.isFavorite ? "Retirer des favoris" : "Marquer comme favori"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "26px", lineHeight: 1, padding: 0, marginLeft: "2px" }}
          >
            {bibro.isFavorite ? "⭐" : "☆"}
          </button>
        )}
        {hasSocials && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "22px" }}>
            {bibro.facebookUrl && (
              <a href={normalizeUrl(bibro.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                <FacebookIcon size={26} />
              </a>
            )}
            {bibro.instagramUrl && (
              <a href={normalizeUrl(bibro.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                <InstagramIcon size={26} />
              </a>
            )}
            {bibro.tiktokUrl && (
              <a href={normalizeUrl(bibro.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                <TiktokIcon size={26} />
              </a>
            )}
            {bibro.snapchatUrl && (
              <a href={normalizeUrl(bibro.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                <SnapchatIcon size={26} />
              </a>
            )}
          </div>
        )}
      </div>

      {!fullName && bibro.alias && <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "4px" }}>alias de {bibro.name}</p>}
      {etiquetteParts.length > 0 && <p style={{ fontSize: "14px", color: COLORS.inkSoft, marginBottom: "16px" }}>{etiquetteParts.join(" · ")}</p>}
      {bibro.registeredAt && (
        <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginBottom: "10px" }}>Sur Bibamus depuis {formatMemberSince(bibro.registeredAt)}</p>
      )}
      {bibro.bio && <p style={{ fontSize: "13.5px", color: COLORS.ink, fontStyle: "italic", lineHeight: 1.5, marginBottom: "16px" }}>"{bibro.bio}"</p>}


      {hasContactInfo && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {bibro.email && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>E-mail</span>
                <span style={{ fontWeight: 600 }}>{bibro.email}</span>
              </div>
            )}
            {bibro.country && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Pays</span>
                <span style={{ fontWeight: 600 }}>{bibro.country}</span>
              </div>
            )}
            {bibro.region && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Région</span>
                <span style={{ fontWeight: 600 }}>{bibro.region}</span>
              </div>
            )}
            {bibro.city && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: COLORS.inkSoft }}>Ville</span>
                <span style={{ fontWeight: 600 }}>{bibro.city}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(bibro.bibrosCount != null || bibro.checkInsCount != null) && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div style={{ flex: 1, background: COLORS.amber, borderRadius: "12px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.paper, lineHeight: 1 }}>{bibro.bibrosCount ?? 0}</div>
            <div style={{ fontSize: "11.5px", color: COLORS.paper, fontWeight: 700 }}>Bibax</div>
          </div>
          <div style={{ flex: 1, background: COLORS.amber, borderRadius: "12px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", color: COLORS.paper, lineHeight: 1 }}>{bibro.checkInsCount ?? 0}</div>
            <div style={{ fontSize: "11.5px", color: COLORS.paper, fontWeight: 700 }}>Check-in{(bibro.checkInsCount ?? 0) !== 1 ? "s" : ""}</div>
          </div>
        </div>
      )}

      {!previewNotice &&
        myBibros &&
        bibro.bibrosCodes != null &&
        (() => {
          const mutualCodes = new Set(bibro.bibrosCodes);
          const mutual = myBibros.filter((b) => mutualCodes.has(b.code));
          return (
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: mutual.length > 0 ? "8px" : 0 }}>
                {mutual.length > 0 ? `👥 ${mutual.length} Bibax en commun` : "👥 Aucun Bibax en commun"}
              </div>
              {mutual.length > 0 && <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: 0 }}>{mutual.map((b) => b.alias || b.name).join(", ")}</p>}
            </div>
          );
        })()}

      {records && records.mostVisited && (
        <>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>SES RECORDS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "22px" }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11.5px", color: COLORS.inkSoft, fontWeight: 600 }}>Le plus visité</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{records.mostVisited.name}</div>
              </div>
              <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "13px", color: COLORS.amberDark, fontWeight: 700 }}>
                {records.mostVisited.visits} visite{records.mostVisited.visits !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </>
      )}

      {ranking && ranking.length > 0 && (
        <>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginBottom: "8px" }}>
            SON CLASSEMENT PAR VISITES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ranking.map((v, i) => (
              <div
                key={v.name}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
              >
                <span>
                  <strong>{i + 1}.</strong> {v.name}
                </span>
                <span style={{ fontFamily: "'Urbanist', sans-serif", color: COLORS.inkSoft, fontSize: "13px" }}>
                  {v.visits} visite{v.visits !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {bibro.ratedProducts && bibro.ratedProducts.length > 0 && (
        <>
          <div style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "11px", letterSpacing: "1.5px", color: COLORS.inkSoft, marginTop: "20px", marginBottom: "8px" }}>
            SES PRODUITS NOTÉS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {bibro.ratedProducts.map((p) => (
              <div
                key={p.id}
                style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong>{p.name}</strong>
                  <span style={{ color: COLORS.inkSoft, fontSize: "12px" }}> · {drinkTypeLabel(p.type)}</span>
                </span>
                {typeof p.rating === "number" && isFinite(p.rating) && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "'Urbanist', sans-serif", color: COLORS.amber, fontWeight: 700, fontSize: "13px", flexShrink: 0, marginLeft: "10px" }}>
                    <StarsDisplay value={1} max={1} size={12} /> {Number(p.rating).toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {etiquetteParts.length === 0 &&
        !fullName &&
        !bibro.bio &&
        !hasContactInfo &&
        !hasSocials &&
        !records &&
        !ranking &&
        !(bibro.ratedProducts && bibro.ratedProducts.length > 0) && (
          <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>
            {previewNotice
              ? "Tu n'as encore rien rendu visible à tes Bibax — tout est décoché dans ton profil."
              : `${bibro.name} n'a encore rendu aucune information visible à ses Bibax.`}
          </p>
        )}
      <PageFooterNav onBack={onBack} />
    </div>
  );
}

export function AddBibroScreen({ onAdd, onLookup, onCancel }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notFound
  const [foundName, setFoundName] = useState("");
  const [foundSocials, setFoundSocials] = useState({});

  const handleLookup = async () => {
    if (code.trim().length !== 5) return;
    setStatus("loading");
    const identity = await onLookup(code.trim());
    if (identity && identity.displayName) {
      setFoundName(identity.displayName);
      setFoundSocials({
        avatarEmoji: identity.avatarEmoji || "👤",
        firstName: identity.firstName || "",
        lastName: identity.lastName || "",
        nickname: identity.nickname || "",
        facebookUrl: identity.facebookUrl || "",
        instagramUrl: identity.instagramUrl || "",
        tiktokUrl: identity.tiktokUrl || "",
        snapchatUrl: identity.snapchatUrl || "",
      });
      setStatus("found");
    } else {
      setStatus("notFound");
    }
  };

  const handleCodeChange = (value) => {
    setCode(value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "").slice(0, 5));
    setStatus("idle");
    setAlias("");
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 8px 0" }}>Ajouter un Bibax</h1>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
        Entrez son code — son nom est récupéré automatiquement depuis son profil, tel qu'il apparaîtra dans les Bibrooms.
      </p>

      <label style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Son code Bibax</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="Ex. 4K7TX"
          maxLength={5}
          autoFocus
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: `2px solid ${COLORS.paperAlt}`,
            fontSize: "20px",
            fontFamily: "'Urbanist', sans-serif",
            letterSpacing: "4px",
            textAlign: "center",
            outline: "none",
          }}
        />
        <button
          onClick={handleLookup}
          disabled={code.length !== 5 || status === "loading"}
          style={{
            background: COLORS.surfaceAlt,
            color: COLORS.chalkWhite,
            border: "none",
            borderRadius: "10px",
            padding: "0 18px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: code.length !== 5 ? "default" : "pointer",
            opacity: code.length !== 5 ? 0.5 : 1,
          }}
        >
          {status === "loading" ? "..." : "Chercher"}
        </button>
      </div>

      {status === "found" && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.amber}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "8px" }}>Trouvé :</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: (foundSocials.facebookUrl || foundSocials.instagramUrl || foundSocials.tiktokUrl || foundSocials.snapchatUrl) ? "12px" : 0 }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: COLORS.surfaceAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              {foundSocials.avatarEmoji ? foundSocials.avatarEmoji : <NavIcon name="default-avatar" size={26} color={COLORS.amber} />}
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700 }}>
                {foundSocials.firstName || foundSocials.lastName ? [foundSocials.firstName, foundSocials.lastName].filter(Boolean).join(" ") : foundName}
              </div>
              {(foundName !== [foundSocials.firstName, foundSocials.lastName].filter(Boolean).join(" ") || foundSocials.nickname) && (
                <div style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>
                  {foundName}
                  {foundSocials.nickname && ` · ${foundSocials.nickname}`}
                </div>
              )}
            </div>
          </div>
          {(foundSocials.facebookUrl || foundSocials.instagramUrl || foundSocials.tiktokUrl || foundSocials.snapchatUrl) && (
            <div style={{ display: "flex", gap: "8px" }}>
              {foundSocials.facebookUrl && (
                <a href={normalizeUrl(foundSocials.facebookUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <FacebookIcon size={20} />
                </a>
              )}
              {foundSocials.instagramUrl && (
                <a href={normalizeUrl(foundSocials.instagramUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <InstagramIcon size={20} />
                </a>
              )}
              {foundSocials.tiktokUrl && (
                <a href={normalizeUrl(foundSocials.tiktokUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <TiktokIcon size={20} />
                </a>
              )}
              {foundSocials.snapchatUrl && (
                <a href={normalizeUrl(foundSocials.snapchatUrl)} target="_blank" rel="noreferrer" style={{ lineHeight: 0 }}>
                  <SnapchatIcon size={20} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {status === "notFound" && (
        <p style={{ fontSize: "13px", color: COLORS.wine, marginBottom: "auto" }}>
          Code introuvable. Vérifie qu'il·elle a bien ouvert l'app et configuré son profil.
        </p>
      )}

      {status !== "found" && status !== "notFound" && <div style={{ marginBottom: "auto" }} />}
      {status === "found" && <div style={{ marginBottom: "auto" }} />}

      <PrimaryButton
        onClick={() => {
          if (status === "found") {
            onAdd(code.trim(), foundName, "", foundSocials);
            onCancel();
          }
        }}
        disabled={status !== "found"}
        style={{ width: "100%", marginTop: "20px" }}
      >
        Ajouter {foundName || "ce Bibax"}
      </PrimaryButton>
      <PageFooterNav onBack={onCancel} />
    </div>
  );
}

export function AdminUnlockScreen({ onCancel }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 18px 0" }}>Accès administrateur</h1>
      <p style={{ fontSize: "14px", color: COLORS.inkSoft, marginBottom: "12px" }}>
        Le statut administrateur est désormais automatique, lié à votre compte — il n'y a plus de passphrase à saisir. Si vous pensez devoir y avoir accès, contactez un administrateur existant
        pour qu'il vous l'attribue.
      </p>
      <PageFooterNav onBack={onCancel} />
    </div>
  );
}
