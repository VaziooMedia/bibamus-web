// ============================================================
// Outils d'image partagés.
// ============================================================

// Réduit une photo choisie par l'utilisateur en JPEG avant envoi : côté le plus long limité à
// maxSide pixels, qualité réglable. Une photo de téléphone (plusieurs Mo) devient ainsi une
// image de quelques centaines de Ko — bien sous la limite de 5 Mo côté serveur, et beaucoup plus
// rapide à envoyer. Lance une erreur si le fichier n'est pas lisible comme une image.
export async function fileToResizedJpegBlob(file, maxSide = 1600, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) throw new Error("Image vide");
    const scale = Math.min(1, maxSide / longest);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // Fond blanc : un PNG transparent deviendrait sinon noir une fois converti en JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Conversion impossible");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
