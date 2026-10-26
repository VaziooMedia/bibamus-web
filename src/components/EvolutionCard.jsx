// ============================================================
// Section « Check Trends » (dernière des trois sections du bloc « Checks » de l'onglet Biba360 d'une fiche produit ;
// l'écran hôte fournit le cadre du bloc et la barre verte au-dessus) : une courbe de la popularité du produit au fil du
// temps, avec quatre périodes au choix — 7 jours et 30 jours (un point par jour), 12 mois et « Tout » l'historique (un point
// par mois). Chiffres anonymes de tous les utilisateurs (tous les verres : checks, BibaSolo, salons), voir
// get_drink_evolution dans DATABASE.md.
//
// Reçoit `evolution` tel que le rend loadDrinkEvolution : { d7, d30, m12, all }, chacun une liste de { date: "AAAA-MM-JJ",
// count } du plus ancien au plus récent (les creux valent 0). La carte ne montre rien d'elle-même quand il n'y a rien à
// tracer : c'est l'écran hôte qui décide de l'afficher.
//
// Accessibilité : la courbe est décorative pour les lecteurs d'écran, qui lisent à la place un tableau masqué (date, nombre) ;
// au clavier, la zone se focalise et les flèches gauche/droite parcourent les points. Au doigt ou à la souris, une ligne
// verticale suit le point le plus proche et une bulle donne la date et le nombre.
// ============================================================
import React, { useState, useRef, useLayoutEffect } from "react";
import { COLORS } from "../constants.js";
import { formatWeekdayDDMMYYYY } from "../utils.js";

const PERIODS = [
  { key: "d7", label: "7 jours", long: "les 7 derniers jours" },
  { key: "d30", label: "30 jours", long: "les 30 derniers jours" },
  { key: "m12", label: "12 mois", long: "les 12 derniers mois" },
  { key: "all", label: "Tout", long: "tout l'historique" },
];

// Géométrie du dessin (le SVG s'étire à la largeur de la carte ; texte et traits suivent).
const W = 320;
const H = 190;
const ML = 30;
const MR = 14;
const MT = 32;
const MB = 24;
const PW = W - ML - MR;
const PH = H - MT - MB;

const sr = { position: "absolute", width: "1px", height: "1px", margin: "-1px", padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };

function parseDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const fmt = (opts) => new Intl.DateTimeFormat("fr-BE", opts);
const F_WEEKDAY = fmt({ weekday: "short" });
const F_MONTH = fmt({ month: "short" });
const F_MONTH_YEAR = fmt({ month: "short", year: "numeric" });
const F_MONTH_LONG = fmt({ month: "long", year: "numeric" });
const F_DAY_MONTH = fmt({ day: "2-digit", month: "2-digit" });

// Libellé complet d'un point (bulle et tableau masqué).
function fullLabel(period, iso) {
  const d = parseDay(iso);
  return period === "m12" || period === "all" ? F_MONTH_LONG.format(d) : formatWeekdayDDMMYYYY(d.getTime());
}
// Petit libellé sous l'axe.
function tickLabel(period, iso) {
  const d = parseDay(iso);
  if (period === "d7") return F_WEEKDAY.format(d);
  if (period === "d30") return F_DAY_MONTH.format(d);
  if (period === "m12") return F_MONTH.format(d);
  return F_MONTH_YEAR.format(d);
}
// Positions des libellés de l'axe : tous les jours de la semaine (7 jours) ; une semaine sur l'autre en partant d'aujourd'hui
// (30 jours) ; un mois sur deux en partant du mois en cours (12 mois) ; 4 repères répartis régulièrement, premier et dernier
// point compris (tout l'historique).
function tickIndexes(period, n) {
  const fromEnd = (step) => Array.from({ length: Math.ceil(n / step) }, (_, k) => n - 1 - k * step).reverse();
  if (period === "d7") return fromEnd(1);
  if (period === "d30") return fromEnd(7);
  if (period === "m12") return fromEnd(2);
  if (n <= 4) return fromEnd(1);
  return [...new Set(Array.from({ length: 4 }, (_, k) => Math.round((k * (n - 1)) / 3)))];
}

// Graduations entières de l'axe vertical : 0 puis des pas de 1, 2, 5, 10, 20, 50… jusqu'au maximum.
function niceTicks(max) {
  if (max <= 1) return [0, 1];
  const rough = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough));
  const ticks = [];
  for (let v = 0; v < max + step; v += step) {
    ticks.push(v);
    if (v >= max) break;
  }
  return ticks;
}
const compact = (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k`.replace(".", ",") : String(v));

export function EvolutionCard({ evolution }) {
  const total = (k) => evolution[k].reduce((s, p) => s + p.count, 0);
  // On ouvre sur 30 jours, sauf s'il n'y a rien sur cette période : alors 12 mois, sinon tout l'historique.
  const firstWithData = ["d30", "m12", "all"].find((k) => total(k) > 0) || "all";
  const [period, setPeriod] = useState(firstWithData);
  const [active, setActive] = useState(null);
  const svgRef = useRef(null);
  const boxRef = useRef(null);
  const tipRef = useRef(null);
  const [tipX, setTipX] = useState(0);

  const meta = PERIODS.find((p) => p.key === period);
  const points = evolution[period];
  const n = points.length;
  const periodTotal = total(period);
  const max = Math.max(0, ...points.map((p) => p.count));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const x = (i) => (n === 1 ? ML + PW / 2 : ML + (PW * i) / (n - 1));
  const y = (v) => MT + PH * (1 - v / top);
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.count).toFixed(1)}`).join(" ");
  const areaPath = n > 1 ? `${linePath} L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z` : "";
  const showAllDots = n <= 12;
  const xTicks = tickIndexes(period, n);

  const select = (key) => {
    setPeriod(key);
    setActive(null);
  };
  const indexFromPointer = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * W) / rect.width;
    return n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((px - ML) / PW) * (n - 1))));
  };
  const onKeyDown = (e) => {
    const move = (to) => {
      e.preventDefault();
      setActive(Math.max(0, Math.min(n - 1, to)));
    };
    if (e.key === "ArrowLeft") move((active == null ? n - 1 : active) - 1);
    else if (e.key === "ArrowRight") move((active == null ? n - 1 : active) + 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(n - 1);
    else if (e.key === "Escape") setActive(null);
  };

  const tip = active != null ? points[active] : null;
  // La bulle se centre sur le point, sans jamais dépasser de la carte.
  useLayoutEffect(() => {
    if (active == null || !tipRef.current || !boxRef.current) return;
    const boxW = boxRef.current.clientWidth;
    const tipW = tipRef.current.offsetWidth;
    setTipX(Math.max(0, Math.min(boxW - tipW, (x(active) / W) * boxW - tipW / 2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, period]);
  const summary = `Évolution des checks sur ${meta.long} : ${periodTotal} au total${max > 0 ? `, au plus ${max} sur un ${period === "m12" || period === "all" ? "mois" : "jour"}` : ""}.`;

  return (
    <div data-evo="section">
      <div style={{ textAlign: "center", fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "12px" }}>Check Trends</div>
      <div role="tablist" aria-label="Période du graphique" style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={period === p.key}
            onClick={() => select(p.key)}
            style={{
              flex: 1,
              background: period === p.key ? COLORS.amber : "none",
              color: period === p.key ? COLORS.paper : COLORS.ink,
              border: `1.5px solid ${period === p.key ? COLORS.amber : COLORS.paperAlt}`,
              borderRadius: "999px",
              padding: "4px 6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodTotal === 0 ? (
        <p style={{ margin: 0, padding: "48px 0 40px", textAlign: "center", fontSize: "13px", color: COLORS.inkSoft }}>Aucun check sur cette période.</p>
      ) : (
        <div
          ref={boxRef}
          data-evo="chart"
          role="group"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => (a == null ? n - 1 : a))}
          onBlur={() => setActive(null)}
          style={{ position: "relative", outline: "none", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}
        >
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} stroke={COLORS.paperAlt} strokeWidth="1" />
                <text x={ML - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={COLORS.inkSoft}>
                  {compact(v)}
                </text>
              </g>
            ))}
            {xTicks.map((i, k) => (
              <text key={i} data-evo="xtick" x={k === xTicks.length - 1 && xTicks.length > 1 ? Math.min(x(i) + 6, W - 2) : x(i)} y={H - 6} textAnchor={k === xTicks.length - 1 && xTicks.length > 1 ? "end" : "middle"} fontSize="10" fill={COLORS.inkSoft}>
                {tickLabel(period, points[i].date)}
              </text>
            ))}
            {areaPath && <path d={areaPath} fill={COLORS.amber} fillOpacity="0.1" />}
            {n > 1 && <path data-evo="line" d={linePath} fill="none" stroke={COLORS.amber} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {active != null && <line data-evo="cross" x1={x(active)} x2={x(active)} y1={MT} y2={y(0)} stroke={COLORS.inkSoft} strokeWidth="1" />}
            {points.map((p, i) =>
              showAllDots || i === n - 1 || i === active ? (
                <circle key={p.date} data-evo="dot" data-i={i} cx={x(i)} cy={y(p.count)} r={i === active ? 5 : 4} fill={COLORS.amber} stroke={COLORS.surface} strokeWidth="2" />
              ) : null
            )}
            <rect
              data-evo="hit"
              x={0}
              y={0}
              width={W}
              height={H}
              fill="transparent"
              onPointerDown={(e) => setActive(indexFromPointer(e))}
              onPointerMove={(e) => setActive(indexFromPointer(e))}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") setActive(null);
              }}
            />
          </svg>
          {tip && (
            <div
              ref={tipRef}
              data-evo="tip"
              style={{ position: "absolute", top: 0, left: `${tipX}px`, pointerEvents: "none", background: COLORS.surfaceAlt, border: `1px solid ${COLORS.paperAlt}`, borderRadius: "8px", padding: "4px 8px", textAlign: "center", whiteSpace: "nowrap" }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.ink }}>
                {tip.count} {tip.count > 1 ? "checks" : "check"}
              </span>
              <span style={{ fontSize: "11.5px", color: COLORS.inkSoft }}> · {fullLabel(period, tip.date)}</span>
            </div>
          )}
          {/* Un <table> ne se réduit pas à 1 px : on l'enferme dans un conteneur qui rogne, sinon il allonge la page. */}
          <div style={sr}>
            <table data-evo="table">
              <caption>Évolution des checks sur {meta.long}</caption>
              <thead>
                <tr>
                  <th>{period === "m12" || period === "all" ? "Mois" : "Jour"}</th>
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date}>
                    <td>{fullLabel(period, p.date)}</td>
                    <td>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
