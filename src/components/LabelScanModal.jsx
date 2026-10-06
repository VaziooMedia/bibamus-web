import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { associateBarcode } from "../data/sharedDirectories.js";
import { prepareLabelPhoto } from "../labelScanPhoto.js";
import { readLabelPhoto, searchDrinksByLabel, reportLabelSearch, reportLabelOutcome, buildLabelQuery, uncertainFieldLabels, photoAdvice, unusablePhotoMessage, labelErrorMessage } from "../data/labelScan.js";

// Lecture d'une étiquette par photo — complément du scan de code-barres pour les boissons sans code
// lisible, ou dont le code est inconnu. L'IA ne fait que LIRE l'étiquette ; c'est l'utilisateur qui
// confirme le texte lu (1re validation), puis qui choisit le produit parmi les propositions (2e
// validation). Rien n'est jamais lié ni créé tout seul.
//
// Étapes (phase) : capture → reading → confirm → results, avec retake (photo inexploitable),
// none (aucune proposition choisie) et error.
//
// Si un code-barres inconnu vient d'être scanné (scannedBarcode), il est associé au produit choisi,
// exactement comme dans la recherche manuelle du scanner : le prochain scan sera immédiat.

const SLOW_AFTER_MS = 10000;
const MAX_CANDIDATES = 3;

const parseAbv = (text) => {
  const t = String(text || "").replace("%", "").replace(",", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

const primaryBtn = { background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px 24px", fontWeight: 700, fontSize: "14px", color: COLORS.paper, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" };
const linkBtn = { background: "none", border: "none", color: COLORS.amber, fontSize: "13px", fontWeight: 600, textDecoration: "underline", cursor: "pointer", padding: "6px" };
const inputStyle = { padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "16px", width: "100%", boxSizing: "border-box", background: COLORS.surface, color: COLORS.ink };
const labelStyle = { display: "block", fontSize: "12.5px", fontWeight: 700, color: COLORS.inkSoft, margin: "14px 0 6px" };
const noteStyle = { fontSize: "12.5px", color: COLORS.inkSoft, margin: "8px 0 0", lineHeight: 1.45 };

export function LabelScanModal({ onClose, onFoundDrink, scannedBarcode = null, myBibroCode = null }) {
  const [phase, setPhase] = useState("capture"); // capture | reading | retake | confirm | results | none | error
  const [photoUrl, setPhotoUrl] = useState(null);
  const [reading, setReading] = useState(null);
  const [query, setQuery] = useState("");
  const [abvText, setAbvText] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [errorCode, setErrorCode] = useState(null);
  const [errorBack, setErrorBack] = useState("capture");
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [abvOpen, setAbvOpen] = useState(false); // le degré est facultatif : le champ n'apparaît que s'il a été lu ou demandé

  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const runRef = useRef(0); // identifie la lecture en cours : une réponse tardive d'une lecture annulée est ignorée
  const abortRef = useRef(null);
  const photoUrlRef = useRef(null);
  const busyRef = useRef(false); // garde synchrone : un double clic sur un produit ne l'associe qu'une fois
  const scanIdRef = useRef(null); // lecture en cours dans le journal (null si la photo n'était pas exploitable)
  const outcomeLoggedRef = useRef(true); // true quand l'issue de la lecture en cours est déjà enregistrée

  // Une lecture lisible quittée sans produit choisi ni « aucun de ceux-là » est enregistrée comme abandonnée.
  const abandonCurrent = () => {
    if (scanIdRef.current && !outcomeLoggedRef.current) {
      outcomeLoggedRef.current = true;
      reportLabelOutcome({ scanId: scanIdRef.current, outcome: "abandoned" });
    }
  };

  useEffect(
    () => () => {
      abandonCurrent();
      runRef.current += 1;
      abortRef.current?.abort();
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    []
  );

  const replacePhotoUrl = (blob) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = blob ? URL.createObjectURL(blob) : null;
    setPhotoUrl(photoUrlRef.current);
  };

  const fail = (code, back) => {
    setErrorCode(code);
    setErrorBack(back);
    setPhase("error");
  };

  const startReading = async (file) => {
    abandonCurrent();
    scanIdRef.current = null;
    const run = ++runRef.current;
    setPhase("reading");
    setSlow(false);
    let slowTimer = null;
    try {
      const prepared = await prepareLabelPhoto(file);
      if (run !== runRef.current) return;
      replacePhotoUrl(prepared.blob);
      const ctl = new AbortController();
      abortRef.current = ctl;
      slowTimer = setTimeout(() => run === runRef.current && setSlow(true), SLOW_AFTER_MS);
      const res = await readLabelPhoto(prepared.base64, { signal: ctl.signal });
      clearTimeout(slowTimer);
      if (run !== runRef.current) return;
      if (!res.ok) {
        if (res.code !== "aborted") fail(res.code, "capture");
        return;
      }
      setReading(res.reading);
      if (res.reading.image_status !== "usable") {
        setPhase("retake");
        return;
      }
      scanIdRef.current = res.scanId;
      outcomeLoggedRef.current = false;
      setQuery(buildLabelQuery(res.reading));
      setAbvText(res.suggestedAbv != null ? String(res.suggestedAbv).replace(".", ",") : "");
      setAbvOpen(false);
      setPhase("confirm");
    } catch (e) {
      clearTimeout(slowTimer);
      if (run !== runRef.current) return;
      console.error("LabelScanModal:", e);
      fail("prepare", "capture");
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) startReading(file);
  };

  const cancelReading = () => {
    runRef.current += 1;
    abortRef.current?.abort();
    setPhase("capture");
  };

  const retake = () => {
    abandonCurrent();
    setReading(null);
    setCandidates([]);
    setPhase("capture");
  };

  const search = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    const abv = parseAbv(abvText);
    const res = await searchDrinksByLabel(query, abv);
    setSearching(false);
    if (!res.ok) {
      fail(res.code, "confirm");
      return;
    }
    const shown = res.candidates.slice(0, MAX_CANDIDATES);
    setCandidates(shown);
    outcomeLoggedRef.current = false; // une nouvelle recherche repart de zéro dans le journal
    reportLabelSearch({ scanId: scanIdRef.current, text: query.trim(), abv, shownIds: shown.map((d) => d.id) });
    setPhase("results");
  };

  const choose = async (drink) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (scannedBarcode) await associateBarcode({ barcode: scannedBarcode, productId: drink.id, addedBy: myBibroCode });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    outcomeLoggedRef.current = true;
    reportLabelOutcome({ scanId: scanIdRef.current, outcome: "chosen", drinkId: drink.id });
    onFoundDrink(drink.id);
  };

  const chooseNone = () => {
    outcomeLoggedRef.current = true;
    reportLabelOutcome({ scanId: scanIdRef.current, outcome: "none" });
    setPhase("none");
  };

  const uncertain = reading ? uncertainFieldLabels(reading) : [];
  const advice = reading ? photoAdvice(reading) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.paper, zIndex: 1100, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          Lire une étiquette
        </span>
        <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "22px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPickFile} style={{ display: "none" }} />
      <input ref={libraryRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {phase === "capture" && (
            <div style={{ textAlign: "center", paddingTop: "24px" }}>
              <p style={{ color: COLORS.ink, fontSize: "15px", fontWeight: 700, margin: "0 0 10px" }}>Photographiez l'étiquette de la boisson</p>
              <p style={noteStyle}>Une seule bouteille ou canette, étiquette de face. Évitez les reflets et les ombres, et rapprochez-vous si le texte est petit.</p>
              <div style={{ marginTop: "22px" }}>
                <button onClick={() => cameraRef.current?.click()} style={primaryBtn}>
                  <NavIcon name="camera" size={18} color={COLORS.paper} />
                  Prendre une photo
                </button>
              </div>
              <button onClick={() => libraryRef.current?.click()} style={{ ...linkBtn, marginTop: "10px" }}>
                Choisir une photo existante
              </button>
            </div>
          )}

          {phase === "reading" && (
            <div style={{ textAlign: "center", paddingTop: "24px" }}>
              {photoUrl && <img src={photoUrl} alt="Photo de l'étiquette" style={{ height: "140px", borderRadius: "12px", objectFit: "cover", marginBottom: "14px" }} />}
              <p style={{ color: COLORS.ink, fontSize: "15px", fontWeight: 700, margin: "0 0 6px" }}>Lecture de l'étiquette…</p>
              <p style={noteStyle}>{slow ? "Cela prend plus de temps que d'habitude. Merci de patienter." : "Quelques secondes."}</p>
              <button onClick={cancelReading} style={{ ...linkBtn, marginTop: "14px" }}>
                Annuler
              </button>
            </div>
          )}

          {phase === "retake" && (
            <div style={{ textAlign: "center", paddingTop: "24px" }}>
              {photoUrl && <img src={photoUrl} alt="Photo de l'étiquette" style={{ height: "120px", borderRadius: "12px", objectFit: "cover", marginBottom: "14px" }} />}
              <p style={{ color: COLORS.ink, fontSize: "14px", margin: "0 0 8px" }}>{unusablePhotoMessage(reading?.image_status)}</p>
              {advice && <p style={noteStyle}>{advice}</p>}
              <div style={{ marginTop: "18px" }}>
                <button onClick={retake} style={primaryBtn}>
                  Reprendre la photo
                </button>
              </div>
            </div>
          )}

          {phase === "confirm" && (
            <div style={{ paddingTop: "8px" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                {photoUrl && <img src={photoUrl} alt="Photo de l'étiquette" style={{ height: "84px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />}
                <p style={{ color: COLORS.ink, fontSize: "14px", fontWeight: 700, margin: 0 }}>Vérifiez ce qui a été lu sur l'étiquette</p>
              </div>
              <label htmlFor="label-text" style={labelStyle}>
                Texte lu (corrigez-le si besoin)
              </label>
              <input id="label-text" value={query} onChange={(e) => setQuery(e.target.value)} style={inputStyle} />
              {!query.trim() && <p style={{ ...noteStyle, color: COLORS.amber }}>Aucun texte n'a pu être lu : saisissez le nom du produit.</p>}
              {abvOpen || abvText.trim() ? (
                <>
                  <label htmlFor="label-abv" style={labelStyle}>
                    Degré (% vol., facultatif)
                  </label>
                  <input id="label-abv" value={abvText} onChange={(e) => setAbvText(e.target.value)} inputMode="decimal" placeholder="Ex. 6,8" style={{ ...inputStyle, maxWidth: "140px" }} />
                </>
              ) : (
                <button onClick={() => setAbvOpen(true)} style={{ ...linkBtn, padding: "10px 0 0", display: "block" }}>
                  Ajouter le degré (facultatif)
                </button>
              )}
              {uncertain.length > 0 && <p style={{ ...noteStyle, color: COLORS.amber }}>La lecture hésite sur : {uncertain.join(", ")}. Vérifiez-le.</p>}
              {reading?.container_volume_ml != null && <p style={noteStyle}>Volume lu : {String(reading.container_volume_ml / 10).replace(".", ",")} cl (à vérifier).</p>}
              {advice && <p style={noteStyle}>{advice}</p>}
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <button onClick={search} disabled={!query.trim() || searching} style={{ ...primaryBtn, width: "100%", opacity: !query.trim() || searching ? 0.5 : 1 }}>
                  <NavIcon name="search" size={18} color={COLORS.paper} />
                  {searching ? "Recherche…" : "Chercher dans Bibamus"}
                </button>
                <button onClick={retake} style={linkBtn}>
                  Reprendre la photo
                </button>
              </div>
            </div>
          )}

          {phase === "results" && (
            <div style={{ paddingTop: "8px" }}>
              <p style={{ color: COLORS.ink, fontSize: "14px", fontWeight: 700, margin: "0 0 12px" }}>{candidates.length > 0 ? "Est-ce l'un de ces produits ?" : "Aucun produit proche trouvé dans Bibamus."}</p>
              {scannedBarcode && candidates.length > 0 && <p style={{ ...noteStyle, margin: "0 0 12px" }}>Le code-barres que vous venez de scanner sera associé au produit choisi.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {candidates.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => choose(d)}
                    disabled={busy}
                    style={{ textAlign: "left", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", padding: "12px 14px", cursor: "pointer", color: COLORS.ink, fontSize: "14px", fontWeight: 600, opacity: busy ? 0.6 : 1 }}
                  >
                    {d.name}
                    {d.brewery && <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}> · {d.brewery}</span>}
                    {d.abv != null && <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}> · {String(d.abv).replace(".", ",")} %</span>}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                {candidates.length > 0 && (
                  <button onClick={chooseNone} style={linkBtn}>
                    Aucun de ceux-là
                  </button>
                )}
                <button onClick={() => setPhase("confirm")} style={linkBtn}>
                  Modifier le texte lu
                </button>
                <button onClick={retake} style={linkBtn}>
                  Reprendre la photo
                </button>
              </div>
            </div>
          )}

          {phase === "none" && (
            <div style={{ textAlign: "center", paddingTop: "24px" }}>
              <p style={{ color: COLORS.ink, fontSize: "14px", margin: "0 0 8px" }}>Ce produit ne semble pas encore exister dans Bibamus.</p>
              <p style={noteStyle}>Vous pouvez modifier le texte lu pour relancer la recherche, ou reprendre la photo.</p>
              <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <button onClick={() => setPhase("confirm")} style={primaryBtn}>
                  Modifier le texte lu
                </button>
                <button onClick={retake} style={linkBtn}>
                  Reprendre la photo
                </button>
                <button onClick={onClose} style={linkBtn}>
                  Fermer
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div style={{ textAlign: "center", paddingTop: "24px" }}>
              <p style={{ color: COLORS.ink, fontSize: "14px", margin: "0 0 8px" }}>{labelErrorMessage(errorCode)}</p>
              <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                {errorCode !== "daily_limit" && errorCode !== "unauthorized" && (
                  <button onClick={() => setPhase(errorBack)} style={primaryBtn}>
                    Réessayer
                  </button>
                )}
                <button onClick={onClose} style={errorCode === "daily_limit" || errorCode === "unauthorized" ? primaryBtn : linkBtn}>
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
