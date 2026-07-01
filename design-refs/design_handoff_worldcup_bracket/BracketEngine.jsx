/* World Cup circular bracket — animation engine.
   Data-driven: edit TEAMS_ORDER (32 teams, ring order from top, clockwise) and rank.
   Lower rank = stronger; each match is won by the lower rank, so the whole bracket
   resolves deterministically and the global rank-1 team becomes champion. */

const { useRef, useEffect, useMemo } = React;

/* ---------- flag chip backgrounds (simplified, SVG-style circular chips) ---------- */
const vt = (a, b, c) => `linear-gradient(90deg,${a} 0 33.33%,${b} 33.33% 66.66%,${c} 66.66%)`;
const ht = (a, b, c) => `linear-gradient(180deg,${a} 0 33.33%,${b} 33.33% 66.66%,${c} 66.66%)`;
const vb = (a, b) => `linear-gradient(90deg,${a} 0 50%,${b} 50%)`;
const cross = (arm, t, base) =>
  `linear-gradient(${arm},${arm}) center/100% ${t} no-repeat, linear-gradient(${arm},${arm}) center/${t} 100% no-repeat, ${base}`;

const JPN = `radial-gradient(circle at 50% 50%, #BC002D 0 24%, transparent 24.5%), #ffffff`;
const NOR = `linear-gradient(#fff,#fff) center/100% 40% no-repeat, linear-gradient(#fff,#fff) center/40% 100% no-repeat, linear-gradient(#00205B,#00205B) center/100% 18% no-repeat, linear-gradient(#00205B,#00205B) center/18% 100% no-repeat, #BA0C2F`;
const USA = `linear-gradient(135deg,#3C3B6E 0 38%, transparent 38%), repeating-linear-gradient(180deg,#B22234 0 9%, #fff 9% 18%)`;

/* ring order: index 0 sits at the top, going clockwise. */
const TEAMS_ORDER = [
  { code: 'BRA', name: 'Brazil',        rank: 1,  bg: 'linear-gradient(135deg,#009C3B 0 52%, #FFDF00 52%)' },
  { code: 'SUI', name: 'Switzerland',   rank: 15, bg: cross('#ffffff', '24%', '#D52B1E') },
  { code: 'CRO', name: 'Croatia',       rank: 10, bg: ht('#FF0000', '#ffffff', '#171796') },
  { code: 'USA', name: 'United States', rank: 13, bg: USA },
  { code: 'ESP', name: 'Spain',         rank: 4,  bg: 'linear-gradient(180deg,#AA151B 0 25%,#F1BF00 25% 75%,#AA151B 75%)' },
  { code: 'GHA', name: 'Ghana',         rank: 24, bg: ht('#CE1126', '#FCD116', '#006B3F') },
  { code: 'BEL', name: 'Belgium',       rank: 9,  bg: vt('#111111', '#FAE042', '#ED2939') },
  { code: 'BIH', name: 'Bosnia',        rank: 29, bg: 'linear-gradient(120deg,#002395 58%, #FECB00 58%)' },
  { code: 'ARG', name: 'Argentina',     rank: 3,  bg: ht('#74ACDF', '#ffffff', '#74ACDF') },
  { code: 'CPV', name: 'Cape Verde',    rank: 30, bg: 'linear-gradient(180deg,#003893 0 45%,#fff 45% 55%,#003893 55%)' },
  { code: 'SEN', name: 'Senegal',       rank: 14, bg: vt('#00853F', '#FDEF42', '#E31B23') },
  { code: 'AUS', name: 'Australia',     rank: 22, bg: 'linear-gradient(135deg,#00247D 0 62%, #C8102E 62%)' },
  { code: 'NED', name: 'Netherlands',   rank: 7,  bg: ht('#AE1C28', '#ffffff', '#21468B') },
  { code: 'ALG', name: 'Algeria',       rank: 27, bg: vb('#006233', '#ffffff') },
  { code: 'COL', name: 'Colombia',      rank: 16, bg: 'linear-gradient(180deg,#FCD116 0 50%,#003893 50% 75%,#CE1126 75%)' },
  { code: 'EGY', name: 'Egypt',         rank: 23, bg: ht('#CE1126', '#ffffff', '#111111') },
  { code: 'FRA', name: 'France',        rank: 2,  bg: vt('#0055A4', '#ffffff', '#EF4135') },
  { code: 'JPN', name: 'Japan',         rank: 17, bg: JPN },
  { code: 'MAR', name: 'Morocco',       rank: 11, bg: 'linear-gradient(135deg,#C1272D 0 70%, #006233 70%)' },
  { code: 'CAN', name: 'Canada',        rank: 25, bg: vt('#FF0000', '#ffffff', '#FF0000') },
  { code: 'ENG', name: 'England',       rank: 5,  bg: cross('#CE1124', '16%', '#ffffff') },
  { code: 'ECU', name: 'Ecuador',       rank: 21, bg: 'linear-gradient(180deg,#FFD100 0 50%,#0072CE 50% 75%,#EF3340 75%)' },
  { code: 'POR', name: 'Portugal',      rank: 6,  bg: 'linear-gradient(90deg,#046A38 0 42%,#DA291C 42%)' },
  { code: 'COD', name: 'DR Congo',      rank: 31, bg: 'linear-gradient(120deg,#007FFF 62%, #F7D618 62%)' },
  { code: 'GER', name: 'Germany',       rank: 8,  bg: ht('#111111', '#DD0000', '#FFCE00') },
  { code: 'NOR', name: 'Norway',        rank: 19, bg: NOR },
  { code: 'MEX', name: 'Mexico',        rank: 12, bg: vt('#006847', '#ffffff', '#CE1126') },
  { code: 'RSA', name: 'South Africa',  rank: 32, bg: 'linear-gradient(180deg,#E03C31 0 33%,#007749 33% 66%,#001489 66%)' },
  { code: 'SWE', name: 'Sweden',        rank: 18, bg: cross('#FFCD00', '22%', '#006AA7') },
  { code: 'AUT', name: 'Austria',       rank: 20, bg: ht('#ED2939', '#ffffff', '#ED2939') },
  { code: 'PAR', name: 'Paraguay',      rank: 26, bg: ht('#D52B1E', '#ffffff', '#0038A8') },
  { code: 'CIV', name: 'Côte d’Ivoire', rank: 28, bg: vt('#F77F00', '#ffffff', '#009E60') },
];

/* ---------- geometry / timing constants ---------- */
const CX = 500, CY = 500, DEG = Math.PI / 180;
const RADII = [430, 340, 252, 172, 96, 0];
const SIZE  = [34, 30, 27, 24, 22, 46];
const AMP   = [5, 4, 3.2, 2.6, 2, 0];     // radial bob amplitude
const TANG  = [2, 1.6, 1.2, 1, 0.8, 0];   // tangential sway
const ROUND_START = [0, 3.0, 5.0, 6.5, 7.6, 8.6];
const ROUND_STAG  = [0, 0.08, 0.10, 0.12, 0.15, 0];
const ROUND_DUR   = [0, 0.9, 0.9, 0.85, 0.85, 1.0];
const DURATION = 13;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/* ---------- build the bracket tree once ---------- */
function buildLayout() {
  const levels = [];
  levels[0] = TEAMS_ORDER.map((t, i) => ({ team: t, angle: -90 + i * 11.25 }));
  for (let L = 1; L <= 5; L++) {
    const cnt = 32 >> L; levels[L] = [];
    for (let j = 0; j < cnt; j++) {
      const a = levels[L - 1][2 * j], b = levels[L - 1][2 * j + 1];
      const team = a.team.rank < b.team.rank ? a.team : b.team;
      levels[L].push({ team, angle: (a.angle + b.angle) / 2 });
    }
  }
  const nodes = [], byId = {};
  for (let L = 0; L <= 5; L++) {
    levels[L].forEach((nd, j) => {
      const id = L + '-' + j;
      const node = { id, L, j, team: nd.team, angle: nd.angle, radius: RADII[L], size: SIZE[L], isLeaf: L === 0 };
      node.phase = (L * 7 + j * 2.399) % 6.283;
      if (L === 0) { node.revealStart = 0.3 + j * 0.06; node.settleT = node.revealStart + 0.6; }
      else {
        node.fillStart = ROUND_START[L] + j * ROUND_STAG[L];
        node.fillDur = ROUND_DUR[L];
        node.fillEnd = node.fillStart + node.fillDur;
        node.settleT = node.fillEnd;
      }
      nodes.push(node); byId[id] = node;
    });
  }
  const edges = [], travelers = [], loserTravelers = [], skeleton = [];
  for (let L = 1; L <= 5; L++) {
    for (let j = 0; j < (32 >> L); j++) {
      const node = byId[L + '-' + j];
      const cA = byId[(L - 1) + '-' + (2 * j)], cB = byId[(L - 1) + '-' + (2 * j + 1)];
      const win = cA.team.rank < cB.team.rank ? cA : cB;
      const lose = win === cA ? cB : cA;
      node.winChildId = win.id; node.loseChildId = lose.id; cA.parentId = node.id; cB.parentId = node.id;
      edges.push({ id: 'e' + node.id, fromId: win.id, toId: node.id, fillStart: node.fillStart });
      travelers.push({ id: 't' + node.id, fromId: win.id, node });
      loserTravelers.push({ id: 'L' + node.id, fromId: lose.id, node });
      // full bracket skeleton: BOTH children link to the match node (shows who plays who)
      skeleton.push({ id: 'sA' + node.id, fromId: cA.id, toId: node.id, isWinner: win.id === cA.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd });
      skeleton.push({ id: 'sB' + node.id, fromId: cB.id, toId: node.id, isWinner: win.id === cB.id, level: L, pStart: node.fillStart, pEnd: node.fillEnd });
    }
  }
  nodes.forEach(n => {
    if (n.isLeaf) { const p = byId[n.parentId]; n.parentFillStart = p.fillStart; n.parentFillEnd = p.fillEnd; n.advanced = p.winChildId === n.id; }
  });
  const champion = byId['5-0'];
  const labels = [
    { t: 'ROUND OF 32', r: RADII[0] }, { t: 'ROUND OF 16', r: RADII[1] },
    { t: 'QUARTERS', r: RADII[2] }, { t: 'SEMIS', r: RADII[3] }, { t: 'FINAL', r: RADII[4] },
  ];
  return { nodes, byId, edges, travelers, loserTravelers, skeleton, champion, labels };
}
const LAYOUT = buildLayout();

function themeVars(name, accent) {
  if (name === 'stadium') return {
    bg: 'radial-gradient(circle at 50% 36%, #173a6b 0%, #0d2649 55%, #0a1c39 100%)',
    ring: 'rgba(255,255,255,0.82)', phFill: 'rgba(74,58,46,0.5)', phStroke: 'rgba(255,255,255,0.22)',
    phText: 'rgba(255,255,255,0.5)', edge: accent, label: 'rgba(222,212,192,0.62)',
    guide: 'rgba(255,255,255,0.06)', skeleton: 'rgba(214,224,240,0.26)', shadow: '0 6px 16px rgba(0,0,0,0.45)',
  };
  if (name === 'mono') return {
    bg: '#000000', ring: 'rgba(255,255,255,0.68)', phFill: 'rgba(255,255,255,0.025)', phStroke: 'rgba(255,255,255,0.26)',
    phText: 'rgba(255,255,255,0.5)', edge: accent, label: 'rgba(255,255,255,0.46)',
    guide: 'rgba(255,255,255,0.06)', skeleton: 'rgba(255,255,255,0.2)', shadow: '0 6px 16px rgba(0,0,0,0.6)',
  };
  return { /* carbon */
    bg: 'radial-gradient(circle at 50% 42%, #16181d 0%, #0b0c10 60%, #070809 100%)',
    ring: 'rgba(255,255,255,0.22)', phFill: 'rgba(255,255,255,0.04)', phStroke: 'rgba(255,255,255,0.16)',
    phText: 'rgba(255,255,255,0.34)', edge: accent, label: 'rgba(255,255,255,0.34)',
    guide: 'rgba(255,255,255,0.05)', skeleton: 'rgba(255,255,255,0.15)', shadow: '0 6px 16px rgba(0,0,0,0.5)',
  };
}

function BracketEngine(props) {
  const theme = props.theme || 'carbon';
  const accent = props.accent || '#E8B24A';
  const showLabels = props.labels !== false && props.labels !== 'false';
  const tv = useMemo(() => themeVars(theme, accent), [theme, accent]);

  const rootRef = useRef(null);
  const layerRef = useRef(null);
  const N = useRef({}), T = useRef({}), E = useRef({}), S = useRef({}), LT = useRef({});
  const labelsRef = useRef(null), capRef = useRef(null);
  const pulseRefs = useRef([]);
  const startRef = useRef(0);
  const frozenRef = useRef(null);
  const slot = (m, id) => (m.current[id] || (m.current[id] = {}));

  function pos(n, t) {
    const ux = Math.cos(n.angle * DEG), uy = Math.sin(n.angle * DEG);
    const ramp = clamp((t - n.settleT) / 1.2, 0, 1);
    const rb = AMP[n.L] * Math.sin(t * 0.9 + n.phase) * ramp;
    const tb = TANG[n.L] * Math.sin(t * 0.7 + n.phase * 1.3) * ramp;
    const R = n.radius + rb;
    return { x: CX + R * ux - uy * tb, y: CY + R * uy + ux * tb };
  }

  function update(t) {
    // keep HTML chip layer in sync with the SVG viewBox scale
    if (rootRef.current && layerRef.current) {
      const s = rootRef.current.clientWidth / 1000;
      if (s > 0) layerRef.current.style.transform = `scale(${s})`;
    }
    // nodes
    for (const n of LAYOUT.nodes) {
      const r = N.current[n.id]; if (!r || !r.wrap) continue;
      const p = pos(n, t);
      let op = 1, sc = 1;
      if (n.isLeaf) {
        const rp = clamp((t - n.revealStart) / 0.6, 0, 1), e = easeOut(rp);
        op = e; sc = 0.5 + 0.5 * e;
        if (!n.advanced) { const d = clamp((t - n.parentFillEnd) / 0.5, 0, 1); op *= 1 - 0.62 * d; }
        if (r.gold) r.gold.style.opacity = n.advanced ? clamp((t - n.parentFillEnd + 0.3) / 0.5, 0, 1) : 0;
      } else {
        const pf = clamp((t - n.fillStart) / n.fillDur, 0, 1);
        op = clamp((t - 0.7) / 0.8, 0, 1);
        if (r.ph) { const hide = clamp((pf - 0.15) / 0.4, 0, 1); r.ph.style.opacity = (1 - hide) * 0.95; }
        const fIn = clamp((pf - 0.78) / 0.22, 0, 1);
        if (r.flag) r.flag.style.opacity = fIn;
        if (r.gold) r.gold.style.opacity = fIn;
        if (n.L === 5) sc = 0.55 + 0.45 * fIn;
      }
      r.wrap.style.opacity = op;
      r.wrap.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${sc})`;
    }
    // edges
    for (const ed of LAYOUT.edges) {
      const r = E.current[ed.id]; if (!r || !r.path) continue;
      const a = pos(LAYOUT.byId[ed.fromId], t), b = pos(LAYOUT.byId[ed.toId], t);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cx = mx + (CX - mx) * 0.18, cy = my + (CY - my) * 0.18;
      r.path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      const pe = clamp((t - ed.fillStart) / 0.45, 0, 1);
      r.path.style.strokeDashoffset = 1 - pe;
      r.path.style.opacity = pe > 0 ? 0.72 : 0;
    }
    // full bracket skeleton (dashed, shows every matchup)
    for (const ed of LAYOUT.skeleton) {
      const r = S.current[ed.id]; if (!r || !r.path) continue;
      const a = pos(LAYOUT.byId[ed.fromId], t), b = pos(LAYOUT.byId[ed.toId], t);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cx = mx + (CX - mx) * 0.18, cy = my + (CY - my) * 0.18;
      r.path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      const fin = clamp((t - (0.6 + (ed.level - 1) * 0.3)) / 0.8, 0, 1);
      let op = fin;
      if (ed.isWinner) op *= 1 - clamp((t - ed.pStart) / 0.45, 0, 1);       // hand off to the gold winner edge
      else op *= 1 - 0.55 * clamp((t - ed.pEnd) / 0.6, 0, 1);              // dim the losing matchup line
      r.path.style.opacity = op;
    }
    // travelers
    for (const tr of LAYOUT.travelers) {
      const r = T.current[tr.id]; if (!r || !r.wrap) continue;
      const n = tr.node, pf = clamp((t - n.fillStart) / n.fillDur, 0, 1), e = easeIO(pf);
      const a = pos(LAYOUT.byId[tr.fromId], t), b = pos(n, t);
      let x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      const dx = CX - x, dy = CY - y, dl = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * e) * 8;
      x += (dx / dl) * arc; y += (dy / dl) * arc;
      const op = clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.9) / 0.1, 0, 1));
      r.wrap.style.opacity = op;
      r.wrap.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    }
    // loser travelers: opponent rushes in to meet the winner, then is eliminated
    for (const tr of LAYOUT.loserTravelers) {
      const r = LT.current[tr.id]; if (!r || !r.wrap) continue;
      const n = tr.node, pf = clamp((t - n.fillStart) / n.fillDur, 0, 1);
      const reach = 0.6 * easeIO(clamp(pf / 0.55, 0, 1));
      const a = pos(LAYOUT.byId[tr.fromId], t), b = pos(n, t);
      const x = a.x + (b.x - a.x) * reach, y = a.y + (b.y - a.y) * reach;
      const op = clamp(pf / 0.12, 0, 1) * (1 - clamp((pf - 0.5) / 0.35, 0, 1));
      r.wrap.style.opacity = op * 0.92;
      r.wrap.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${0.96 - 0.12 * clamp((pf - 0.4) / 0.4, 0, 1)})`;
    }
    // labels
    if (labelsRef.current) labelsRef.current.style.opacity = showLabels ? clamp((t - 0.3) / 1.2, 0, 1) * 0.6 : 0;
    // champion caption + pulses
    const champ = LAYOUT.champion;
    if (capRef.current) capRef.current.style.opacity = clamp((t - champ.fillStart - 0.35) / 0.7, 0, 1);
    const cEnd = champ.fillEnd;
    pulseRefs.current.forEach((el, k) => {
      if (!el) return;
      const lt = t - (cEnd + k * 0.5);
      if (lt > 0 && lt < 1.5) { const s = 0.3 + lt * 2.0; el.style.opacity = 0.55 * (1 - lt / 1.5); el.style.transform = `translate(-50%,-50%) scale(${s})`; }
      else el.style.opacity = 0;
    });
  }

  // RAF clock (runs forever; intro plays once, then perpetual idle float)
  useEffect(() => {
    startRef.current = performance.now();
    let raf;
    const loop = (now) => {
      if (frozenRef.current == null) update((now - startRef.current) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // responsive scaling of the HTML chip layer
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = el.clientWidth / 1000;
      if (layerRef.current) layerRef.current.style.transform = `scale(${s})`;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // video export: respond to seek events deterministically
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const onSeek = (e) => { frozenRef.current = e.detail.time; update(e.detail.time); };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    return () => el.removeEventListener('data-om-seek-to-time-frame', onSeek);
  }, [theme, accent, showLabels]);

  const replay = () => { frozenRef.current = null; startRef.current = performance.now(); };

  /* ---------- chip sub-elements ---------- */
  const chip = (n, gold, isTraveler) => ([
    React.createElement('div', { key: 'fl', ref: (el) => { if (!isTraveler) slot(N, n.id).flag = el; },
      style: { position: 'absolute', inset: 0, borderRadius: '50%', background: n.team.bg, backgroundColor: '#1a1d22',
        boxShadow: tv.shadow + ', inset 0 0 0 1px rgba(0,0,0,0.18)', opacity: isTraveler ? 1 : (n.isLeaf ? 1 : 0) } }),
    React.createElement('div', { key: 'gl', style: { position: 'absolute', inset: 0, borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)', pointerEvents: 'none' } }),
    React.createElement('div', { key: 'nr', style: { position: 'absolute', inset: 0, borderRadius: '50%',
      border: `1.5px solid ${tv.ring}`, pointerEvents: 'none' } }),
    React.createElement('div', { key: 'gr', ref: (el) => { if (gold) slot(N, n.id).gold = el; }, style: { position: 'absolute', inset: -1,
      borderRadius: '50%', border: `2.5px solid ${accent}`, boxShadow: `0 0 13px ${accent}77`, pointerEvents: 'none', opacity: 0 } }),
  ]);

  return React.createElement('div', {
    ref: rootRef,
    'data-om-exportable-video-with-duration-secs': DURATION,
    style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: tv.bg,
      fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif' },
  },
    // SVG: orbit guides, labels, connector edges (auto-scales via viewBox)
    React.createElement('svg', { viewBox: '0 0 1000 1000', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' } },
      LAYOUT.labels.map((l, i) => React.createElement('circle', { key: 'g' + i, cx: CX, cy: CY, r: l.r, fill: 'none', stroke: tv.guide, strokeWidth: 1 })),
      React.createElement('g', { ref: labelsRef, style: { opacity: 0 } },
        LAYOUT.labels.map((l, i) => React.createElement('text', {
          key: 'l' + i, x: CX, y: CY - l.r + 5, textAnchor: 'middle', fill: tv.label,
          style: { font: '600 13px ui-monospace, "SF Mono", monospace', letterSpacing: '0.22em' },
        }, l.t))),
      LAYOUT.skeleton.map((ed) => React.createElement('path', {
        key: ed.id, ref: (el) => { slot(S, ed.id).path = el; }, fill: 'none', stroke: tv.skeleton, strokeWidth: 1.4,
        strokeLinecap: 'round', strokeDasharray: '5 8', style: { opacity: 0 },
      })),
      LAYOUT.edges.map((ed) => React.createElement('path', {
        key: ed.id, ref: (el) => { slot(E, ed.id).path = el; }, fill: 'none', stroke: tv.edge, strokeWidth: 2,
        strokeLinecap: 'round', pathLength: 1, strokeDasharray: 1,
        style: { strokeDashoffset: 1, opacity: 0, filter: `drop-shadow(0 0 3px ${accent}55)` },
      }))),
    // HTML chip layer (scaled by ResizeObserver)
    React.createElement('div', { ref: layerRef, style: { position: 'absolute', left: 0, top: 0, width: 1000, height: 1000, transformOrigin: '0 0' } },
      // placeholders + node chips
      LAYOUT.nodes.map((n) => {
        const internal = !n.isLeaf;
        const gold = internal || n.advanced;
        return React.createElement('div', {
          key: n.id, ref: (el) => { slot(N, n.id).wrap = el; },
          style: { position: 'absolute', left: 0, top: 0, width: n.size * 2, height: n.size * 2, opacity: 0, willChange: 'transform, opacity' },
        },
          internal && n.L < 5 ? React.createElement('div', {
            ref: (el) => { slot(N, n.id).ph = el; },
            style: { position: 'absolute', inset: 0, borderRadius: '50%', background: tv.phFill, border: `1.5px dashed ${tv.phStroke}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: tv.phText, fontWeight: 600,
              fontSize: n.size * 0.8, opacity: 0 } }, '?') : null,
          ...chip(n, gold, false));
      }),
      // travelers (advancing flags)
      LAYOUT.travelers.map((tr) => React.createElement('div', {
        key: tr.id, ref: (el) => { slot(T, tr.id).wrap = el; },
        style: { position: 'absolute', left: 0, top: 0, width: tr.node.size * 2, height: tr.node.size * 2, opacity: 0, willChange: 'transform, opacity', zIndex: 5 },
      }, ...chip(tr.node, true, true))),
      // loser travelers (opponent that challenges, then is eliminated)
      LAYOUT.loserTravelers.map((tr) => {
        const team = LAYOUT.byId[tr.fromId].team, sz = tr.node.size;
        return React.createElement('div', {
          key: tr.id, ref: (el) => { slot(LT, tr.id).wrap = el; },
          style: { position: 'absolute', left: 0, top: 0, width: sz * 2, height: sz * 2, opacity: 0, willChange: 'transform, opacity', zIndex: 4 },
        },
          React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: team.bg, backgroundColor: '#1a1d22',
            boxShadow: tv.shadow + ', inset 0 0 0 1px rgba(0,0,0,0.18)' } }),
          React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)' } }),
          React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${tv.ring}` } }));
      }),
      // celebration pulses at center
      [0, 1, 2].map((k) => React.createElement('div', {
        key: 'p' + k, ref: (el) => { pulseRefs.current[k] = el; },
        style: { position: 'absolute', left: CX, top: CY, width: 150, height: 150, marginLeft: -75, marginTop: -75,
          borderRadius: '50%', border: `2px solid ${accent}`, opacity: 0, pointerEvents: 'none', transform: 'translate(-50%,-50%) scale(0.3)' } })),
      // champion caption
      React.createElement('div', { ref: capRef, style: { position: 'absolute', left: CX, top: CY + 104, transform: 'translate(-50%,-50%)',
        textAlign: 'center', opacity: 0, pointerEvents: 'none', padding: '10px 22px 12px', borderRadius: 18,
        background: 'rgba(8,9,12,0.66)', backdropFilter: 'blur(6px)', boxShadow: `0 0 0 1px ${accent}33, 0 8px 26px rgba(0,0,0,0.5)` } },
        React.createElement('div', { style: { fontSize: 30, marginBottom: 3, filter: `drop-shadow(0 0 10px ${accent}88)` } }, '🏆'),
        React.createElement('div', { style: { color: '#fff', fontWeight: 700, fontSize: 27, letterSpacing: '0.01em', lineHeight: 1 } }, LAYOUT.champion.team.name),
        React.createElement('div', { style: { color: accent, fontWeight: 600, fontSize: 11, letterSpacing: '0.34em', marginTop: 7 } }, 'WORLD CHAMPIONS 2026'))),
    // replay control
    React.createElement('button', { onClick: replay, style: { position: 'absolute', right: 18, bottom: 16, zIndex: 10,
      padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.82)', font: '600 12px ui-sans-serif, system-ui, sans-serif',
      letterSpacing: '0.08em', cursor: 'pointer' } }, '↻ REPLAY'));
}

if (typeof module !== 'undefined' && module.exports) module.exports = { BracketEngine };
window.BracketEngine = BracketEngine;
