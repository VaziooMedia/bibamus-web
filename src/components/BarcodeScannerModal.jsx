import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { lookupBarcode, associateBarcode } from "../data/sharedDirectories.js";

// Scanner de code-barres — un code-barres n'est qu'un raccourci vers une fiche existante,
// jamais un déclencheur de création automatique. Code connu → direction directe vers la fiche.
// Code inconnu → recherche manuelle dans le répertoire, puis association du code à la fiche
// choisie, pour que le prochain scan de ce même conditionnement soit immédiat.
export function BarcodeScannerModal({ drinksDirectory, myBibroCode, onClose, onFoundDrink }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [phase, setPhase] = useState("scanning"); // scanning | notFound | associating | error
  const [scannedCode, setScannedCode] = useState(null);
  const [query, setQuery] = useState("");
  const [associating, setAssociating] = useState(false);

  useEffect(() => {
    if (phase !== "scanning") return;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (cancelled || !result) return;
          const code = result.getText();
          setScannedCode(code);
          handleScan(code);
        });
      } catch (e) {
        console.error("Barcode scanner:", e);
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      readerRef.current?.stopContinuousDecode?.();
      readerRef.current?.reset?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleScan = async (code) => {
    readerRef.current?.stopContinuousDecode?.();
    readerRef.current?.reset?.();
    const match = await lookupBarcode(code);
    if (match) {
      onFoundDrink(match.productId);
    } else {
      setPhase("notFound");
    }
  };

  const filtered = query.trim()
    ? drinksDirectory.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30)
    : [];

  const associate = async (drink) => {
    setAssociating(true);
    await associateBarcode({ barcode: scannedCode, productId: drink.id, addedBy: myBibroCode });
    setAssociating(false);
    onFoundDrink(drink.id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.paper, zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink }}>Scanner un code-barres</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "22px", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {phase === "scanning" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ width: "100%", maxWidth: "360px", borderRadius: "16px", overflow: "hidden", border: `2px solid ${COLORS.paperAlt}`, position: "relative" }}>
            <video ref={videoRef} style={{ width: "100%", display: "block", background: "#000" }} muted playsInline />
          </div>
          <p style={{ color: COLORS.inkSoft, fontSize: "13.5px", marginTop: "16px", textAlign: "center" }}>Visez le code-barres sur la bouteille ou la canette</p>
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
