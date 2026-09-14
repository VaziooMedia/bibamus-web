import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { lookupBarcode, associateBarcode, searchDrinks } from "../data/sharedDirectories.js";

// Scanner de code-barres — un code-barres n'est qu'un raccourci vers une fiche existante,
// jamais un déclencheur de création automatique. Code connu → direction directe vers la fiche.
// Code inconnu → recherche manuelle dans le répertoire, puis association du code à la fiche
// choisie, pour que le prochain scan de ce même conditionnement soit immédiat.
export function BarcodeScannerModal({ myBibroCode, onClose, onFoundDrink }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const pollRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const orientationRef = useRef("horizontal");
  const [phase, setPhase] = useState("scanning"); // scanning | notFound | associating | error | manualEntry
  const [scannedCode, setScannedCode] = useState(null);
  const [orientation, setOrientation] = useState("horizontal"); // horizontal | vertical — sens du code-barres sur l'emballage
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [query, setQuery] = useState("");
  const [associating, setAssociating] = useState(false);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  const stopEverything = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    readerRef.current?.stopContinuousDecode?.();
    readerRef.current?.reset?.();
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    setFlashOn(false);
    setFlashSupported(false);
  };

  useEffect(() => {
    if (phase !== "scanning") return;
    let cancelled = false;

    (async () => {
      try {
        // ZXing (bibliothèque JS) plutôt que l'API native BarcodeDetector — celle-ci est
        // expérimentale sur Safari (drapeau développeur, pas activée par défaut) et surtout
        // confirmée cassée par Apple/WebKit depuis iOS 18 (bug ouvert, non résolu) : l'objet
        // existe techniquement dans window, mais ne détecte plus rien de fiable. ZXing ne
        // dépend d'aucune API navigateur expérimentale et fonctionne de façon identique
        // partout.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        // Un premier flux générique (facingMode) sert uniquement à obtenir la permission —
        // sans elle, les labels de caméra restent vides et enumerateDevices ne peut pas
        // distinguer les objectifs. iOS choisit parfois l'ultra grand-angle par défaut pour
        // "caméra arrière", qui fait une mise au point bien plus mauvaise de près qu'un
        // objectif standard — d'où le flou constaté à faible distance.
        let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const backCameras = devices.filter((d) => d.kind === "videoinput" && /back|arrière|rear|environment/i.test(d.label));
          const nonUltraWide = backCameras.find((d) => !/ultra|wide angle|grand.?angle|0\.5/i.test(d.label));
          if (nonUltraWide && backCameras.length > 1) {
            stream.getTracks().forEach((t) => t.stop());
            stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: nonUltraWide.deviceId } } });
          }
        } catch (e) {
          // Sélection d'un objectif précis non disponible sur cet appareil — le flux
          // générique déjà obtenu reste utilisable tel quel.
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Capacité "torch" — supportée sur Safari iOS depuis 17.5+ (longtemps absente avant),
        // et déjà bien établie sur Chrome Android. Un appareil plus ancien ou sans flash
        // n'expose simplement pas cette capacité — le bouton reste alors masqué.
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        setFlashOn(false);
        try {
          setFlashSupported(!!track.getCapabilities?.().torch);
        } catch (e) {
          setFlashSupported(false);
        }

        pollRef.current = setInterval(async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const video = videoRef.current;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (!vw || !vh) return;
            // Zone de lecture réduite au centre (là où le cadre affiché à l'écran pointe),
            // agrandie x2 avant analyse — un code-barres photographié loin n'occupe qu'une
            // petite portion de l'image entière, avec trop peu de pixels réels pour que le
            // décodeur distingue ses barres fines. Rogner puis agrandir ne donne pas plus de
            // détail qui n'existait pas, mais présente le même détail réel à une résolution
            // relative bien plus grande, ce qui aide concrètement le décodeur. Les deux ratios
            // s'inversent en orientation verticale — même zone en surface, tournée à 90°, pour
            // suivre un code-barres imprimé debout sur l'emballage.
            const isVertical = orientationRef.current === "vertical";
            const cropWidthRatio = isVertical ? 0.28 : 0.75;
            const cropHeightRatio = isVertical ? 0.75 : 0.28;
            const sw = vw * cropWidthRatio;
            const sh = vh * cropHeightRatio;
            const sx = (vw - sw) / 2;
            const sy = (vh - sh) / 2;
            const canvas = cropCanvasRef.current;
            canvas.width = sw * 2;
            canvas.height = sh * 2;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            const result = await reader.decodeFromCanvas(canvas);
            if (result) {
              const code = result.getText();
              setScannedCode(code);
              handleScan(code);
            }
          } catch (e) {
            // une frame sans code lisible n'est pas une erreur — on continue simplement
          }
        }, 400);
      } catch (e) {
        console.error("Barcode scanner:", e);
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleScan = async (code) => {
    stopEverything();
    const match = await lookupBarcode(code);
    if (match) {
      onFoundDrink(match.productId);
    } else {
      setPhase("notFound");
    }
  };

  // L'état affiché (flashOn) est géré ici, jamais relu depuis l'appareil après coup — un bug
  // connu de Safari sur iOS 18 fait que getSettings() renvoie une valeur fausse pour "torch"
  // juste après l'avoir changée.
  const toggleFlash = async () => {
    if (!trackRef.current) return;
    const next = !flashOn;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] });
      setFlashOn(next);
    } catch (e) {
      console.error("toggleFlash:", e);
    }
  };

  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      return;
    }
    const timer = setTimeout(() => {
      searchDrinks(query.trim()).then(setFiltered);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const associate = async (drink) => {
    setAssociating(true);
    await associateBarcode({ barcode: scannedCode, productId: drink.id, addedBy: myBibroCode });
    setAssociating(false);
    onFoundDrink(drink.id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.paper, zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          Scanner un code-barres
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "22px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {phase === "scanning" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ width: "100%", maxWidth: "360px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
            <video ref={videoRef} style={{ width: "100%", display: "block", background: "#000" }} muted playsInline />
            <button
              onClick={() => setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))}
              title="Basculer l'orientation du cadre"
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <NavIcon name="repeat" size={18} color={COLORS.chalkWhite} />
            </button>
            {flashSupported && (
              <button
                onClick={toggleFlash}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: flashOn ? COLORS.amber : "rgba(0,0,0,0.5)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <NavIcon name="flash" size={18} color={flashOn ? COLORS.paper : COLORS.chalkWhite} />
              </button>
            )}
            {/* Zone visée par la détection — mêmes proportions que le rognage réellement analysé,
                pour que le cadre affiché corresponde à la vraie zone lue. Pivote selon le sens
                du code-barres sur l'emballage. */}
            <div
              style={
                orientation === "vertical"
                  ? { position: "absolute", top: "12.5%", left: "36%", width: "28%", height: "75%", border: `4px solid ${COLORS.amber}`, borderRadius: "8px", pointerEvents: "none" }
                  : { position: "absolute", top: "36%", left: "12.5%", width: "75%", height: "28%", border: `4px solid ${COLORS.amber}`, borderRadius: "8px", pointerEvents: "none" }
              }
            />
            <canvas ref={cropCanvasRef} style={{ display: "none" }} />
          </div>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", marginTop: "16px", textAlign: "center" }}>Aligne le code-barres dans le cadre</p>
          <button
            onClick={() => setPhase("manualEntry")}
            style={{ background: "none", border: "none", color: COLORS.amber, fontSize: "13px", fontWeight: 600, textDecoration: "underline", cursor: "pointer", marginTop: "6px" }}
          >
            Entrer le code manuellement
          </button>
        </div>
      )}

      {phase === "manualEntry" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px" }}>
          <p style={{ color: COLORS.ink, fontSize: "14px", marginBottom: "14px", textAlign: "center" }}>Tapez les chiffres sous le code-barres</p>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="Ex. 5410228128560"
            autoFocus
            style={{ padding: "14px 16px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "16px", textAlign: "center", width: "100%", maxWidth: "280px", marginBottom: "14px" }}
          />
          <button
            onClick={() => manualCode.trim() && handleScan(manualCode.trim())}
            disabled={!manualCode.trim()}
            style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px 24px", fontWeight: 700, fontSize: "14px", color: COLORS.paper, cursor: "pointer", opacity: manualCode.trim() ? 1 : 0.5 }}
          >
            Valider
          </button>
        </div>
      )}

      {phase === "error" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
          <p style={{ color: COLORS.ink, fontSize: "14px", marginBottom: "8px" }}>Impossible d'accéder à la caméra.</p>
          <p style={{ color: COLORS.inkSoft, fontSize: "13px" }}>Vérifiez que vous avez bien autorisé l'accès à la caméra pour ce site.</p>
        </div>
      )}

      {phase === "notFound" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 20px 20px 20px", overflow: "hidden" }}>
          <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: COLORS.ink, margin: 0 }}>
              Code <strong>{scannedCode}</strong> pas encore connu de Bibamus. Quelle boisson venez-vous de scanner ?
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un produit..."
            autoFocus
            style={{ padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", marginBottom: "12px" }}
          />
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => associate(d)}
                disabled={associating}
                style={{
                  textAlign: "left",
                  background: COLORS.surface,
                  border: `2px solid ${COLORS.paperAlt}`,
                  borderRadius: "10px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  color: COLORS.ink,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {d.name}
                {d.brand && <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}> · {d.brand}</span>}
              </button>
            ))}
            {query.trim() && filtered.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "13px", textAlign: "center", marginTop: "20px" }}>Aucun résultat.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
