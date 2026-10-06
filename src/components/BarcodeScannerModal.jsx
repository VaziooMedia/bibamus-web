import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { lookupBarcode, associateBarcode, searchDrinks } from "../data/sharedDirectories.js";
import { LabelScanModal } from "./LabelScanModal.jsx";
import { captureSharpestFrame } from "../labelScanCapture.js";

const COUNTDOWN_SECONDS = 3;

// Pour une boisson sans code-barres lisible, ou dont le code est inconnu, l'écran « Lire une étiquette »
// (LabelScanModal) lit l'étiquette ; un code inconnu est alors associé au produit choisi. Depuis la caméra en
// direct du scanner, le bouton « Lire l'étiquette » prend une courte rafale d'images, garde la plus nette et
// la fait lire tout de suite : pas d'appareil photo à ouvrir, pas de photo à valider.

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
  const [phase, setPhase] = useState("scanning"); // scanning | notFound | associating | error | manualEntry | label
  const [labelReturnPhase, setLabelReturnPhase] = useState("scanning"); // étape à retrouver en quittant « Lire une étiquette »
  const [labelFrame, setLabelFrame] = useState(null); // image prise par la caméra du scanner (null : l'écran passe par l'appareil photo ou la photothèque)
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [countdown, setCountdown] = useState(null); // 3, 2, 1 pendant le décompte avant la capture, sinon null
  const phaseRef = useRef("scanning");
  const captureRunRef = useRef(0); // identifie la capture en cours ; l'incrémenter l'annule
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
            // s'inversent en orientation verticale — même zone en surface, pour suivre un
            // code-barres imprimé debout sur l'emballage.
            const isVertical = orientationRef.current === "vertical";
            const cropWidthRatio = isVertical ? 0.32 : 0.75;
            const cropHeightRatio = isVertical ? 0.85 : 0.28;
            const sw = vw * cropWidthRatio;
            const sh = vh * cropHeightRatio;
            const sx = (vw - sw) / 2;
            const sy = (vh - sh) / 2;
            const canvas = cropCanvasRef.current;
            const ctx = canvas.getContext("2d");
            canvas.width = sw * 2;
            canvas.height = sh * 2;
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            // Le flux caméra brut d'un mobile ne rapporte pas toujours ses pixels dans le même
            // sens que l'aperçu affiché à l'écran — cela varie selon l'appareil. Plutôt que de
            // parier sur un sens de rotation précis, on essaie systématiquement les deux : le
            // cadrage tel quel, puis pivoté à 90°. Peu importe lequel correspond réellement au
            // sens du code sur l'emballage, l'un des deux le lira.
            let result = null;
            try {
              result = await reader.decodeFromCanvas(canvas);
            } catch (e) {
              const rotated = document.createElement("canvas");
              rotated.width = canvas.height;
              rotated.height = canvas.width;
              const rctx = rotated.getContext("2d");
              rctx.translate(rotated.width / 2, rotated.height / 2);
              rctx.rotate(Math.PI / 2);
              rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
              try {
                result = await reader.decodeFromCanvas(rotated);
              } catch (e2) {
                // toujours rien de lisible dans cette image, dans aucun des deux sens
              }
            }
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
    setScannedCode(code); // aussi pour un code saisi à la main : sinon il n'est ni affiché ni associé au produit choisi
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

  // Passer en phase « label » arrête la caméra (le nettoyage de l'effet de scan s'exécute) ; la quitter la relance.
  const openLabelScan = () => {
    setLabelFrame(null);
    setLabelReturnPhase(phase);
    setPhase("label");
  };

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(
    () => () => {
      captureRunRef.current += 1; // quitter le scanner annule une capture en cours
    },
    []
  );

  // « Lire l'étiquette » : un décompte de 3 secondes laisse le temps de placer l'étiquette devant la caméra, puis une
  // courte rafale d'images de la caméra en direct, dont la plus nette part à la lecture. On demande plus de pixels
  // pour lire les petits textes dès le début du décompte (la caméra a ainsi fini de s'ajuster au moment de la
  // capture) ; si l'appareil refuse, la résolution actuelle est gardée. Quitter l'écran, ou un code-barres trouvé
  // pendant ce temps (le scanner tourne toujours), annule la capture.
  const captureLabel = async () => {
    const video = videoRef.current;
    if (!video || capturing) return;
    const run = ++captureRunRef.current;
    const stopped = () => run !== captureRunRef.current || phaseRef.current !== "scanning";
    setCapturing(true);
    setCaptureError(null);
    try {
      try {
        await trackRef.current?.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } });
      } catch (e) {
        // résolution non modifiable sur cet appareil : on garde celle du flux actuel
      }
      for (let n = COUNTDOWN_SECONDS; n >= 1; n--) {
        setCountdown(n);
        await new Promise((r) => setTimeout(r, 1000));
        if (stopped()) return;
      }
      setCountdown(null);
      const w = video.videoWidth;
      const h = video.videoHeight;
      const res = await captureSharpestFrame({
        width: w,
        height: h,
        draw: (ctx) => ctx.drawImage(video, 0, 0, w, h),
        isCancelled: stopped,
      });
      if (run !== captureRunRef.current) return;
      if (!res.ok) {
        if (res.code !== "cancelled") setCaptureError("Impossible de capturer l'image. Réessayez.");
        return;
      }
      setLabelFrame(new File([res.blob], "etiquette.jpg", { type: "image/jpeg" }));
      setLabelReturnPhase("scanning");
      setPhase("label");
    } finally {
      if (run === captureRunRef.current) {
        setCapturing(false);
        setCountdown(null);
      }
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
            {countdown != null && (
              <div role="timer" aria-label={`Capture dans ${countdown} seconde${countdown > 1 ? "s" : ""}`} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: COLORS.amber, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "38px" }}>{countdown}</div>
              </div>
            )}
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
                  ? { position: "absolute", top: "7.5%", left: "34%", width: "32%", height: "85%", border: `4px solid ${COLORS.amber}`, borderRadius: "8px", pointerEvents: "none" }
                  : { position: "absolute", top: "36%", left: "12.5%", width: "75%", height: "28%", border: `4px solid ${COLORS.amber}`, borderRadius: "8px", pointerEvents: "none" }
              }
            />
            <canvas ref={cropCanvasRef} style={{ display: "none" }} />
          </div>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", marginTop: "16px", textAlign: "center" }}>Aligne le code-barres dans le cadre</p>
          <button
            onClick={captureLabel}
            disabled={capturing}
            style={{ background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px 24px", fontWeight: 700, fontSize: "14px", color: COLORS.paper, cursor: "pointer", marginTop: "14px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: capturing ? 0.6 : 1 }}
          >
            <NavIcon name="camera" size={18} color={COLORS.paper} />
            {capturing ? "Capture…" : "Lire l'étiquette"}
          </button>
          {captureError && <p style={{ color: COLORS.inkSoft, fontSize: "12.5px", margin: "8px 0 0", textAlign: "center" }}>{captureError}</p>}
          <button
            onClick={() => setPhase("manualEntry")}
            style={{ background: "none", border: "none", color: COLORS.amber, fontSize: "13px", fontWeight: 600, textDecoration: "underline", cursor: "pointer", marginTop: "10px" }}
          >
            Entrer le code manuellement
          </button>
          <button
            onClick={openLabelScan}
            style={{ background: "none", border: "none", color: COLORS.amber, fontSize: "13px", fontWeight: 600, textDecoration: "underline", cursor: "pointer", marginTop: "6px" }}
          >
            Choisir une photo existante
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
          <button
            onClick={openLabelScan}
            style={{ background: "none", border: `2px solid ${COLORS.amber}`, borderRadius: "10px", padding: "11px 14px", marginBottom: "12px", color: COLORS.amber, fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            Identifier avec une photo de l'étiquette
          </button>
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

      {phase === "label" && (
        <LabelScanModal
          scannedBarcode={labelReturnPhase === "notFound" ? scannedCode : null}
          myBibroCode={myBibroCode}
          initialPhoto={labelFrame}
          onRetake={
            labelFrame
              ? () => {
                  setLabelFrame(null);
                  setPhase("scanning");
                }
              : null
          }
          onClose={() => {
            setLabelFrame(null);
            setPhase(labelReturnPhase);
          }}
          onFoundDrink={onFoundDrink}
        />
      )}
    </div>
  );
}
