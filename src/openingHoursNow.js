// ============================================================
// « Ouvert » / « Fermé » à l'instant, calculé dans l'app à partir des horaires du cache de Google (`google_hours_cache.days`), et non lu
// dans `isOpenNow` : cette valeur est celle de l'instant où Google a été interrogé et le cache est gardé jusqu'à 6 heures — un lieu lu à
// 08h43 (fermé) restait « Fermé » après son ouverture de 09h00 (Mehdi, 2026-11-25 : « ça affiche 09H00 - 01H00. Il est 09H38. Et ça indique
// fermé »). Règles pures (sans écran), pour pouvoir les tester seules.
// ============================================================

const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]; // même ordre que Date#getDay()
const DAY_END = 24 * 60;

function toMinutes(t) {
  if (typeof t !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Google coupe les journées à minuit : « 23:59 » veut dire « jusqu'à minuit ».
function closeMinutes(t) {
  const c = toMinutes(t);
  return c === 23 * 60 + 59 ? DAY_END : c;
}

// Les horaires du cache : { dayLabel: « Mercredi », closed, periods: [{ open: "09:00", close: "01:00" }] } pour chaque jour. Une période dont la
// fermeture est avant (ou égale à) l'ouverture passe minuit : elle se termine le lendemain (09:00–01:00 = jusqu'à 01h00 du lendemain) ; la fin de
// nuit peut aussi réapparaître comme une période « 00:00–01:00 » du lendemain, les deux écritures donnent le même résultat ici.
// `now` : l'heure de l'appareil (les horaires sont ceux du lieu ; pour un lieu dans un autre fuseau que l'appareil, le résultat suit l'heure de l'appareil).
// Rend true / false, ou null quand on ne peut pas savoir (pas d'horaires, jour inconnu, heure illisible) : l'appelant garde alors la valeur de Google.
export function isOpenNowFromDays(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return null;
  const periodsByDay = new Map();
  for (const d of days) {
    const idx = DAY_NAMES_FR.findIndex((n) => String(d?.dayLabel || "").toLowerCase().startsWith(n));
    if (idx >= 0) periodsByDay.set(idx, Array.isArray(d.periods) ? d.periods : []);
  }
  if (periodsByDay.size === 0) return null;

  const today = now.getDay();
  const yesterday = (today + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const p of periodsByDay.get(today) || []) {
    const open = toMinutes(p?.open);
    const close = closeMinutes(p?.close);
    if (open == null || close == null) return null;
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true;
  }
  // La fin de nuit d'une période d'hier qui passe minuit.
  for (const p of periodsByDay.get(yesterday) || []) {
    const open = toMinutes(p?.open);
    const close = closeMinutes(p?.close);
    if (open == null || close == null) return null;
    if (close <= open && minutes < close) return true;
  }
  return false;
}

// Le statut à afficher : calculé d'après les horaires quand il y en a, sinon (lieu sans horaires lisibles) la valeur « ouvert maintenant » de Google, sinon null.
export function resolveOpenNow(hours, now = new Date()) {
  const computed = isOpenNowFromDays(hours?.days, now);
  if (computed != null) return computed;
  return typeof hours?.isOpenNow === "boolean" ? hours.isOpenNow : null;
}
