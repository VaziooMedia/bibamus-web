// Préparation de la photo d'une étiquette avant sa lecture par l'IA : redressée (les iPhone enregistrent
// un portrait couché, avec la mention « à tourner de 90° », EXIF 6), réduite à 1 600 px et ré-encodée en
// JPEG sans métadonnées. Même code que la page d'essai, mesuré sur 18 photos réelles : une photo de
// 1 à 3,6 Mo devient une image de 270 à 450 Ko, et la lecture passe de 11,9 s à 6 s.

export const LABEL_PHOTO_MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

// Lit la mention d'orientation (EXIF 0x0112) d'un JPEG ; null si absente ou si ce n'est pas un JPEG.
export function readExifOrientation(buf) {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    off += 2;
    if (marker === 0xffda || (marker & 0xff00) !== 0xff00) break;
    const len = v.getUint16(off);
    if (marker === 0xffe1 && off + 8 <= v.byteLength && v.getUint32(off + 2) === 0x45786966 && v.getUint16(off + 6) === 0) {
      const tiff = off + 8;
      const little = v.getUint16(tiff) === 0x4949;
      const ifd = tiff + v.getUint32(tiff + 4, little);
      const n = v.getUint16(ifd, little);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little);
      }
      return null;
    }
    off += len;
  }
  return null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(blob);
  });
}

// Redresse (le navigateur applique la mention d'orientation au décodage), réduit, ré-encode en JPEG.
// Retourne { blob, base64, width, height, origBytes, orientation }, largeur et hauteur APRÈS redressement et réduction.
export async function prepareLabelPhoto(file) {
  const buf = await file.arrayBuffer();
  const orientation = readExifOrientation(buf);
  const url = URL.createObjectURL(new Blob([buf], { type: file.type || "image/jpeg" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, LABEL_PHOTO_MAX_EDGE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("Encodage de la photo impossible");
    return { blob, base64: await blobToBase64(blob), width: cw, height: ch, origBytes: file.size, orientation };
  } finally {
    URL.revokeObjectURL(url);
  }
}
