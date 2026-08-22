// ============================================================
// Générateur de QR code — un encodeur QR minimal écrit à la main
// (versions 1-4, correction d'erreur niveau M), copié tel quel
// depuis le prototype Claude. Fonctionne pour n'importe quel
// code de salon (4-5 caractères alphanumériques), sans dépendance
// externe.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

const QR_GF_EXP = new Array(512).fill(0);
const QR_GF_LOG = new Array(256).fill(0);
(function initQrGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    QR_GF_EXP[i] = x;
    QR_GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) QR_GF_EXP[i] = QR_GF_EXP[i - 255];
})();

const qrGfMul = (a, b) => (a === 0 || b === 0 ? 0 : QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]]);

const qrRsGeneratorPoly = (degree) => {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      const coeff = poly[j];
      newPoly[j] ^= coeff;
      newPoly[j + 1] ^= qrGfMul(coeff, QR_GF_EXP[i]);
    }
    poly = newPoly;
  }
  return poly;
};

const qrRsEncode = (data, ecLen) => {
  const gen = qrRsGeneratorPoly(ecLen);
  const res = data.slice();
  for (let k = 0; k < ecLen; k++) res.push(0);
  for (let i = 0; i < data.length; i++) {
    const coeff = res[i];
    if (coeff !== 0) {
      for (let j = 0; j < gen.length; j++) res[i + j] ^= qrGfMul(gen[j], coeff);
    }
  }
  return res.slice(data.length);
};

const QR_ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const qrAlphanumValue = (c) => QR_ALPHANUM.indexOf(c);

const QR_VERSION_INFO_M = {
  1: [16, 10, [[1, 16]]],
  2: [28, 16, [[1, 28]]],
  3: [44, 26, [[1, 44]]],
  4: [64, 18, [[2, 32]]],
};
const QR_MATRIX_SIZE = { 1: 21, 2: 25, 3: 29, 4: 33 };
const QR_ALIGNMENT_POS = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26] };
const QR_CCI_BITS = 9;

const qrEncodeAlphanumeric = (data) => {
  let bits = "";
  let i;
  for (i = 0; i + 1 < data.length; i += 2) {
    const val = qrAlphanumValue(data[i]) * 45 + qrAlphanumValue(data[i + 1]);
    bits += val.toString(2).padStart(11, "0");
  }
  if (data.length % 2 === 1) {
    bits += qrAlphanumValue(data[data.length - 1]).toString(2).padStart(6, "0");
  }
  return bits;
};

const qrBuildBitstream = (data, totalDataCodewords) => {
  const cci = data.length.toString(2).padStart(QR_CCI_BITS, "0");
  let bits = "0010" + cci + qrEncodeAlphanumeric(data);
  const totalBits = totalDataCodewords * 8;
  bits += "0".repeat(Math.max(0, Math.min(4, totalBits - bits.length)));
  while (bits.length % 8 !== 0) bits += "0";
  const padBytes = ["11101100", "00010001"];
  let i = 0;
  while (bits.length < totalBits) {
    bits += padBytes[i % 2];
    i++;
  }
  return bits;
};

const qrBitsToBytes = (bits) => {
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return out;
};

const qrBuildCodewords = (data, version) => {
  const [totalDataCodewords, ecLen, blocks] = QR_VERSION_INFO_M[version];
  const allBytes = qrBitsToBytes(qrBuildBitstream(data, totalDataCodewords));
  const dataBlocks = [];
  const ecBlocks = [];
  let idx = 0;
  for (const [numBlocks, blockLen] of blocks) {
    for (let b = 0; b < numBlocks; b++) {
      const blockData = allBytes.slice(idx, idx + blockLen);
      idx += blockLen;
      dataBlocks.push(blockData);
      ecBlocks.push(qrRsEncode(blockData, ecLen));
    }
  }
  const result = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) for (const b of dataBlocks) if (i < b.length) result.push(b[i]);
  const maxEcLen = Math.max(...ecBlocks.map((b) => b.length));
  for (let i = 0; i < maxEcLen; i++) for (const b of ecBlocks) if (i < b.length) result.push(b[i]);
  return result;
};

const qrMakeMatrix = (version) => {
  const size = QR_MATRIX_SIZE[version];
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
  const setModule = (r, c, val, isReserved = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (isReserved) reserved[r][c] = true;
    }
  };
  const placeFinder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r0 + dr;
        const cc = c0 + dc;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
            const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
            const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
            setModule(rr, cc, isBorder || isCenter ? 1 : 0);
          } else {
            setModule(rr, cc, 0);
          }
        }
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    setModule(6, i, val);
    setModule(i, 6, val);
  }
  const positions = QR_ALIGNMENT_POS[version];
  for (const r of positions) {
    for (const c of positions) {
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = dr === -2 || dr === 2 || dc === -2 || dc === 2;
          const isCenter = dr === 0 && dc === 0;
          setModule(r + dr, c + dc, isBorder || isCenter ? 1 : 0);
        }
      }
    }
  }
  setModule(size - 8, 8, 1);
  for (let i = 0; i <= 8; i++) if (i !== 6) reserved[8][i] = true;
  for (let i = 0; i <= 8; i++) if (i !== 6) reserved[i][8] = true;
  for (let i = 0; i < 8; i++) reserved[size - 1 - i][8] = true;
  for (let i = 0; i < 8; i++) reserved[8][size - 1 - i] = true;
  return { matrix, reserved, size };
};

const qrPlaceData = (matrix, reserved, size, codewords) => {
  const bits = [];
  for (const byte of codewords) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  let bitIdx = 0;
  let col = size - 1;
  let goingUp = true;
  while (col > 0) {
    if (col === 6) col -= 1;
    const cols = [col, col - 1];
    const rows = [];
    if (goingUp) for (let r = size - 1; r >= 0; r--) rows.push(r);
    else for (let r = 0; r < size; r++) rows.push(r);
    for (const row of rows) {
      for (const c of cols) {
        if (!reserved[row][c]) {
          matrix[row][c] = bitIdx < bits.length ? bits[bitIdx] : 0;
          bitIdx++;
        }
      }
    }
    goingUp = !goingUp;
    col -= 2;
  }
  return matrix;
};

const QR_MASK_FUNCS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

const qrApplyMask = (matrix, reserved, size, maskIdx) => {
  const newMatrix = matrix.map((row) => row.slice());
  const func = QR_MASK_FUNCS[maskIdx];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!reserved[r][c] && func(r, c)) newMatrix[r][c] ^= 1;
  return newMatrix;
};

const qrPenaltyScore = (matrix, size) => {
  let score = 0;
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3;
    }
  }
  const pattern1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const pattern2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (seg, pat) => seg.every((v, i) => v === pat[i]);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const seg = [];
      for (let i = 0; i < 11; i++) seg.push(matrix[r][c + i]);
      if (matches(seg, pattern1) || matches(seg, pattern2)) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      const seg = [];
      for (let i = 0; i < 11; i++) seg.push(matrix[r + i][c]);
      if (matches(seg, pattern1) || matches(seg, pattern2)) score += 40;
    }
  }
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += matrix[r][c];
  const ratio = (dark / (size * size)) * 100;
  const prev = Math.floor(Math.abs(ratio - 50) / 5) * 5;
  score += Math.floor(Math.min(Math.abs(prev - 50), Math.abs(prev + 5 - 50)) / 5) * 10;
  return score;
};

const QR_FORMAT_EC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
const qrBitLength = (n) => (n === 0 ? 0 : Math.floor(Math.log2(n)) + 1);

const qrBchFormatInfo = (data15) => {
  const g = 0b10100110111;
  let val = data15 << 10;
  let msb = qrBitLength(val) - 1;
  while (msb >= 10) {
    val ^= g << (msb - 10);
    msb = qrBitLength(val) - 1;
  }
  return (data15 << 10) | val;
};

const qrFormatInfoBits = (ecLevel, maskIdx) => {
  const data = (QR_FORMAT_EC_BITS[ecLevel] << 3) | maskIdx;
  const masked = qrBchFormatInfo(data) ^ 0b101010000010010;
  return masked.toString(2).padStart(15, "0");
};

const qrPlaceFormatInfo = (matrix, size, ecLevel, maskIdx) => {
  const bits = qrFormatInfoBits(ecLevel, maskIdx);
  const positionsA = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  positionsA.forEach(([r, c], i) => (matrix[r][c] = parseInt(bits[i], 10)));
  const positionsB = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];
  positionsB.forEach(([r, c], i) => (matrix[r][c] = parseInt(bits[i], 10)));
  return matrix;
};

// Returns { matrix, size } — a square 2D array of 0/1 (1 = dark module) ready to render.

const generateQrMatrix = (data, ecLevel = "M") => {
  let version = null;
  for (const v of [1, 2, 3, 4]) {
    const totalDataCw = QR_VERSION_INFO_M[v][0];
    const maxChars = Math.floor(((totalDataCw * 8 - 4 - QR_CCI_BITS) / 11) * 2);
    if (data.length <= maxChars) {
      version = v;
      break;
    }
  }
  if (version === null) return null; // too long for our small-version encoder; caller should not hit this with short codes
  const codewords = qrBuildCodewords(data, version);
  const { matrix: baseMatrix, reserved, size } = qrMakeMatrix(version);
  let bestMatrix = null;
  let bestScore = null;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const filled = qrPlaceData(baseMatrix.map((row) => row.slice()), reserved, size, codewords);
    let masked = qrApplyMask(filled, reserved, size, maskIdx);
    masked = qrPlaceFormatInfo(masked.map((row) => row.slice()), size, ecLevel, maskIdx);
    const score = qrPenaltyScore(masked, size);
    if (bestScore === null || score < bestScore) {
      bestScore = score;
      bestMatrix = masked;
    }
  }
  return { matrix: bestMatrix, size };
};

export function QRCodeSVG({ value, size = 120, color = COLORS.paper, background = "#fff" }) {
  const result = React.useMemo(() => generateQrMatrix(value), [value]);
  if (!result) return null;
  const { matrix, size: modules } = result;
  const quiet = 2;
  const totalModules = modules + quiet * 2;
  const cell = size / totalModules;
  let path = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + quiet) * cell;
        const y = (r + quiet) * cell;
        path += `M${x},${y}h${cell}v${cell}h${-cell}z`;
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", borderRadius: "8px" }}>
      <rect width={size} height={size} fill={background} rx="8" />
      <path d={path} fill={color} />
    </svg>
  );
}
