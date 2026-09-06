// ============================================================
// Scanner de QR code — dédié aux codes de BibaRoom (4 caractères
// alphanumériques). Même approche que BarcodeScannerModal (API
// native BarcodeDetector en priorité, repli sur ZXing), mais
// bien plus simple : pas de recherche en base, juste lire le
// texte du QR et le transmettre tel quel à onScanned.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";

export function SalonQrScannerModal({ onClose, onScanned }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const pollRef = useRef(null);
  const [phase, setPhase] = useState("scanning"); // scanning | error

  const stopEverything = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    readerRef.current?.stopContinuousDecode?.();
    readerRef.current?.reset?.();
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (phase !== "scanning") return;
    let cancelled = false;

    (async () => {
      try {
        let supportsQr = false;
        if ("BarcodeDetector" in window) {
          try {
            const supported = await window.BarcodeDetector.getSupportedFormats();
            supportsQr = supported.includes("qr_code");
          } catch (e) {
            supportsQr = false;
          }
        }

        if (supportsQr) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          pollRef.current = setInterval(async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const results = await detector.detect(videoRef.current);
              if (results.length > 0) {
                handleScan(results[0].rawValue);
              }
            } catch (e) {
              // une image ponctuellement illisible n'est pas une erreur — on continue simplement
            }
          }, 400);
        } else {
          const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import("@zxing/browser");
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
          const reader = new BrowserMultiFormatReader(hints);
          readerRef.current = reader;
          await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current, (result) => {
            if (cancelled || !result) return;
            handleScan(result.getText());
          });
        }
      } catch (e) {
        console.error("Salon QR scanner:", e);
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleScan = (text) => {
    stopEverything();
    onScanned(text.trim().toUpperCase());
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.paper, zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink }}>Scanner le QR code</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "22px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {phase === "scanning" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ width: "100%", maxWidth: "320px", aspectRatio: "1", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }} muted playsInline />
          </div>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", marginTop: "16px", textAlign: "center" }}>Visez le QR code affiché par un participant du BibaRoom</p>
        </div>
      )}

      {phase === "error" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
          <p style={{ color: COLORS.ink, fontSize: "14px", marginBottom: "8px" }}>Impossible d'accéder à la caméra.</p>
          <p style={{ color: COLORS.inkSoft, fontSize: "13px" }}>Vérifiez que vous avez bien autorisé l'accès à la caméra pour ce site, ou entrez le code manuellement.</p>
        </div>
      )}
    </div>
  );
}
