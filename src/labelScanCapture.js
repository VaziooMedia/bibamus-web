// Capture d'une image d'étiquette depuis la caméra EN DIRECT du scanner : une courte rafale d'images, dont on
// garde la plus nette. Une photo prise avec l'appareil photo de l'iPhone est nette parce que l'appareil fait la
// mise au point avant de déclencher ; une image extraite d'un flux vidéo peut être prise en plein mouvement ou
// juste avant que la mise au point soit faite. Prendre plusieurs images en 1,2 s et garder la plus nette règle
// ce risque sans demander de geste de plus à l'utilisateur.

export const BURST_MS = 1200;
export const BURST_INTERVAL_MS = 200;
const SHARPNESS_SIDE = 320; // netteté mesurée sur une version réduite (rapide, et insensible au bruit de capteur)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Netteté d'une image : variance du laplacien (différence entre un point et ses 4 voisins) sur les niveaux de gris.
// Une image nette a des contours francs, donc un laplacien très variable ; une image floue est lisse, donc proche de zéro.
export function laplacianVariance(imageData) {
  const { data, width: w, height: h } = imageData;
  if (w < 3 || h < 3) return 0;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n += 1;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// Prend des images à intervalles réguliers pendant durationMs et retourne la plus nette, en JPEG.
//   width, height : taille des images (celle du flux vidéo)
//   draw(ctx, i)  : dessine l'image courante sur le canevas ctx (la caméra le fait avec drawImage(video, …))
//   isCancelled() : permet d'arrêter la capture (écran quitté, code-barres trouvé entre-temps)
// Retourne { ok: true, blob, width, height, score, samples, bestIndex } ou { ok: false, code } avec code = not_ready | cancelled | encode.
export async function captureSharpestFrame({ width, height, draw, durationMs = BURST_MS, intervalMs = BURST_INTERVAL_MS, isCancelled = () => false, quality = 0.92 }) {
  if (!width || !height) return { ok: false, code: "not_ready" };
  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const wctx = work.getContext("2d");
  const best = document.createElement("canvas");
  best.width = width;
  best.height = height;
  const bctx = best.getContext("2d");
  const scale = SHARPNESS_SIDE / Math.max(width, height);
  const small = document.createElement("canvas");
  small.width = Math.max(3, Math.round(width * scale));
  small.height = Math.max(3, Math.round(height * scale));
  const sctx = small.getContext("2d", { willReadFrequently: true });

  let bestScore = -1;
  let bestIndex = -1;
  let n = 0;
  const start = performance.now();
  for (;;) {
    if (isCancelled()) return { ok: false, code: "cancelled" };
    try {
      draw(wctx, n);
      sctx.drawImage(work, 0, 0, small.width, small.height);
      const score = laplacianVariance(sctx.getImageData(0, 0, small.width, small.height));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = n;
        bctx.drawImage(work, 0, 0);
      }
    } catch (e) {
      // une image illisible (flux interrompu un instant) n'arrête pas la rafale
    }
    n += 1;
    if (performance.now() - start >= durationMs) break;
    await sleep(intervalMs);
  }
  if (isCancelled()) return { ok: false, code: "cancelled" };
  if (bestIndex < 0) return { ok: false, code: "not_ready" };
  const blob = await new Promise((res) => best.toBlob(res, "image/jpeg", quality));
  if (!blob) return { ok: false, code: "encode" };
  return { ok: true, blob, width, height, score: bestScore, samples: n, bestIndex };
}
