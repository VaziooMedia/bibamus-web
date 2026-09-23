import React, { useState, useRef, useEffect } from "react";

// Vrai éditeur d'image tactile pour les Stories utilisateur — cadre fixe au ratio 9:16, mêmes
// vrais réglages que côté plateforme de gestion (position, zoom, rotation, couleur de fond),
// mais au doigt plutôt qu'au curseur : un vrai doigt déplace l'image, deux vrais doigts la
// zooment (pincer) et la font pivoter (tourner) en même temps — un vrai geste naturel, comme
// Instagram/Snapchat, plutôt que 2 vrais sliders séparés.
export const MobileImageEditor = React.forwardRef(function MobileImageEditor({ file, interactive = true, backgroundColor = "#0D1B2A", children }, ref) {
  const FINAL_W = 720;
  const FINAL_H = 1280;

  const [imgUrl, setImgUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const gestureRef = useRef(null);
  const imgRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImgLoad = () => {
    if (imgRef.current) setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
  };

  const touchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const touchAngle = (t1, t2) => (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;
  const touchMid = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

  const onTouchStart = (e) => {
    if (!interactive) return;
    if (e.touches.length === 1) {
      gestureRef.current = { mode: "drag", startX: e.touches[0].clientX, startY: e.touches[0].clientY, origOffset: offset };
    } else if (e.touches.length === 2) {
      const [t1, t2] = e.touches;
      gestureRef.current = {
        mode: "pinch",
        startDist: touchDist(t1, t2),
        startAngle: touchAngle(t1, t2),
        origZoom: zoom,
        origRotation: rotation,
        origOffset: offset,
        startMid: touchMid(t1, t2),
      };
    }
  };

  const onTouchMove = (e) => {
    if (!interactive || !gestureRef.current) return;
    e.preventDefault();
    if (gestureRef.current.mode === "drag" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - gestureRef.current.startX;
      const dy = e.touches[0].clientY - gestureRef.current.startY;
      setOffset({ x: gestureRef.current.origOffset.x + dx, y: gestureRef.current.origOffset.y + dy });
    } else if (gestureRef.current.mode === "pinch" && e.touches.length === 2) {
      const [t1, t2] = e.touches;
      const newDist = touchDist(t1, t2);
      const newAngle = touchAngle(t1, t2);
      const newMid = touchMid(t1, t2);
      const g = gestureRef.current;
      setZoom(Math.min(3, Math.max(0.3, g.origZoom * (newDist / g.startDist))));
      setRotation(g.origRotation + (newAngle - g.startAngle));
      // Le vrai milieu entre les 2 doigts peut lui-même se déplacer pendant le geste (pas
      // seulement pincer/tourner sur place) — répercuté comme un vrai déplacement en plus.
      setOffset({ x: g.origOffset.x + (newMid.x - g.startMid.x), y: g.origOffset.y + (newMid.y - g.startMid.y) });
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) gestureRef.current = null;
    else if (e.touches.length === 1) {
      // Passage de 2 doigts à 1 en cours de geste — redémarre proprement en vrai drag simple.
      gestureRef.current = { mode: "drag", startX: e.touches[0].clientX, startY: e.touches[0].clientY, origOffset: offset };
    }
  };

  // Rend l'image finale sur un vrai canvas hors-écran, fond compris — même vrai principe que
  // côté plateforme de gestion, mis à l'échelle par le rapport final/aperçu (le cadre affiché
  // fait sa vraie propre largeur d'écran, jamais fixe comme sur desktop).
  const getFinalBlob = () => {
    return new Promise((resolve) => {
      if (!naturalSize || !imgRef.current || !frameRef.current) {
        resolve(null);
        return;
      }
      const frameRect = frameRef.current.getBoundingClientRect();
      const scaleFactor = FINAL_W / frameRect.width;
      const canvas = document.createElement("canvas");
      canvas.width = FINAL_W;
      canvas.height = FINAL_H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, FINAL_W, FINAL_H);
      const baseScale = Math.max(FINAL_W / naturalSize.w, FINAL_H / naturalSize.h);
      ctx.save();
      ctx.translate(FINAL_W / 2 + offset.x * scaleFactor, FINAL_H / 2 + offset.y * scaleFactor);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.drawImage(imgRef.current, (-naturalSize.w * baseScale) / 2, (-naturalSize.h * baseScale) / 2, naturalSize.w * baseScale, naturalSize.h * baseScale);
      ctx.restore();
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  };

  React.useImperativeHandle(ref, () => ({ getFinalBlob }));

  const baseScalePreview = (previewW, previewH) => (naturalSize ? Math.max(previewW / naturalSize.w, previewH / naturalSize.h) : 0);

  return (
    <div
      ref={frameRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "9 / 16",
        overflow: "hidden",
        background: backgroundColor,
        borderRadius: "16px",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {imgUrl && naturalSize && (
        <ImgLayer
          imgRef={imgRef}
          imgUrl={imgUrl}
          onImgLoad={onImgLoad}
          naturalSize={naturalSize}
          offset={offset}
          zoom={zoom}
          rotation={rotation}
          frameRef={frameRef}
        />
      )}
      {imgUrl && !naturalSize && <img ref={imgRef} src={imgUrl} alt="" onLoad={onImgLoad} style={{ display: "none" }} />}
      {children}
    </div>
  );
});

// Vrai calcul de la vraie taille d'affichage "cover" du cadre réel (mesuré dynamiquement, vu
// que le cadre fait toute la largeur de l'écran plutôt qu'une vraie taille fixe côté mobile).
function ImgLayer({ imgRef, imgUrl, onImgLoad, naturalSize, offset, zoom, rotation, frameRef }) {
  const [frameSize, setFrameSize] = useState(null);
  useEffect(() => {
    const measure = () => {
      if (frameRef.current) {
        const rect = frameRef.current.getBoundingClientRect();
        setFrameSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [frameRef]);

  if (!frameSize) return <img ref={imgRef} src={imgUrl} alt="" onLoad={onImgLoad} style={{ display: "none" }} />;
  const baseScale = Math.max(frameSize.w / naturalSize.w, frameSize.h / naturalSize.h);

  return (
    <img
      ref={imgRef}
      src={imgUrl}
      alt=""
      onLoad={onImgLoad}
      draggable={false}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${naturalSize.w * baseScale}px`,
        height: `${naturalSize.h * baseScale}px`,
        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}
