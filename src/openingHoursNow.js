// ============================================================
// « Ouvert » / « Fermé » à l'instant, calculé dans l'app à partir des horaires du cache de Google (`google_hours_cache.days`), et non lu
// dans `isOpenNow` : cette valeur est celle de l'instant où Google a été interrogé et le cache est gardé jusqu'à 6 heures — un lieu lu à
// 08h43 (fermé) restait « Fermé » après son ouverture de 09h00 (Mehdi, 2026-11-25 : « ça affiche 09H00 - 01H00. Il est 09H38. Et ça indique
// fermé »). Règles pures (sans écran), pour pouvoir les tester seules.
// Fuseau du lieu (Mehdi, 2026-11-25) : l'heure du lieu se lit dans `timeZone` (nom IANA, ex. « Europe/Brussels », donné par Google) puis dans
// `utcOffsetMinutes` du cache ; un cache plus ancien, sans ces champs, garde l'heure de l'appareil.
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

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Le jour (0 = dimanche … 6 = samedi) et les minutes depuis minuit « chez le lieu » à l'instant `now`. `zone` : { timeZone, utcOffsetMinutes }, tous deux facultatifs ;
// sans fuseau lisible, l'heure de l'appareil.
export function placeClock(now, zone) {
  const tz = zone?.timeZone;
  if (typeof tz === "string" && tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
      const get = (type) => parts.find((x) => x.type === type)?.value;
      const day = WEEKDAY_INDEX[get("weekday")];
      const hour = Number(get("hour"));
      const minute = Number(get("minute"));
      if (day != null && Number.isFinite(hour) && Number.isFinite(minute)) return { day, minutes: hour * 60 + minute };
    } catch (e) {
      // nom de fuseau inconnu : on essaie le décalage, puis l'heure de l'appareil
    }
  }
  const offset = zone?.utcOffsetMinutes;
  if (typeof offset === "number" && Number.isFinite(offset)) {
    const shifted = new Date(now.getTime() + offset * 60000);
    return { day: shifted.getUTCDay(), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
  }
  return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}

// Les horaires du cache : { dayLabel: « Mercredi », closed, periods: [{ open: "09:00", close: "01:00" }] } pour chaque jour. Une période dont la
// fermeture est avant (ou égale à) l'ouverture passe minuit : elle se termine le lendemain (09:00–01:00 = jusqu'à 01h00 du lendemain) ; la fin de
// nuit peut aussi réapparaître comme une période « 00:00–01:00 » du lendemain, les deux écritures donnent le même résultat ici.
// `now` : l'instant présent ; `zone` : le fuseau du lieu (voir `placeClock`), sinon l'heure de l'appareil.
// Rend true / false, ou null quand on ne peut pas savoir (pas d'horaires, jour inconnu, heure illisible) : l'appelant garde alors la valeur de Google.
export function isOpenNowFromDays(days, now = new Date(), zone = null) {
  if (!Array.isArray(days) || days.length === 0) return null;
  const periodsByDay = new Map();
  for (const d of days) {
    const idx = DAY_NAMES_FR.findIndex((n) => String(d?.dayLabel || "").toLowerCase().startsWith(n));
    if (idx >= 0) periodsByDay.set(idx, Array.isArray(d.periods) ? d.periods : []);
  }
  if (periodsByDay.size === 0) return null;

  const { day: today, minutes } = placeClock(now, zone);
  const yesterday = (today + 6) % 7;

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
  const computed = isOpenNowFromDays(hours?.days, now, { timeZone: hours?.timeZone, utcOffsetMinutes: hours?.utcOffsetMinutes });
  if (computed != null) return computed;
  return typeof hours?.isOpenNow === "boolean" ? hours.isOpenNow : null;
}
