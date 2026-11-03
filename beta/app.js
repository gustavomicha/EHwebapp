/* Eldritch Horror — gestor de mazos (Encuentros, Mitos, Misterios, Preludios y mazos de expansión). */
(() => {
  'use strict';

  const CARDS = {};
  for (const c of window.EH_CARDS) CARDS[c.id] = c;
  const AOS = window.EH_AOS;
  const EXPS = window.EH_EXPANSIONS;
  const EXP_NAME = Object.fromEntries(EXPS.map((e) => [e.id, e.name]));
  const LS_CUR = 'ehm.current', LS_SAVES = 'ehm.saves', LS_HIST = 'ehm.hist', LS_SETUP = 'ehm.setup';
  const LS_LAYOUT = 'ehm.layout', LS_ZOOM = 'ehm.zoom', LS_SIZE = 'ehm.size';
  // Tamaño de las cartas en pantalla (mazos, cartas en juego, Misterio): botones − / + abajo a la derecha
  const SIZES = [0.55, 0.65, 0.75, 0.87, 1, 1.15, 1.3, 1.5, 1.75];
  const sizeIdx = () => Math.max(0, Math.min(SIZES.length - 1, lsGet(LS_SIZE, 4)));
  const applySize = () => document.documentElement.style.setProperty('--sz', SIZES[sizeIdx()]);
  const HIST_MAX = 150;
  const isZoom = () => !!lsGet(LS_ZOOM, false);
  const applyZoom = () => document.body.classList.toggle('zoom', isZoom());
  const isCols = () => lsGet(LS_LAYOUT, 'tabs') === 'cols';
  const applyLayout = () => document.body.classList.toggle('layout-cols', isCols());

  const ICON = {
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    cols: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="5" width="11" height="14" rx="1"/><rect x="15" y="5" width="7" height="14" rx="1"/></svg>',
    single: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h4M10 6h4M16 6h4"/><rect x="4" y="10" width="16" height="10" rx="1"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M9 4v16"/></svg>',
    myth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16M4 12h16"/></svg>',
    myst: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7Z"/><path d="M10 10a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6M12 16.5v.01"/></svg>',
    disaster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>',
    reck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/><path d="M12 8v5l3 2"/></svg>',
  };

  // ---------- utilidades ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const face = (id) => `img/c/${id}.webp`;
  const back = (id) => { const b = CARDS[id]?.b; return b == null ? '' : `img/b/${b}.webp`; };
  const ratio = (id) => CARDS[id]?.r || 0.64;
  const timeStr = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

  const KIND = {
    america: 'América', europa: 'Europa', asia: 'Asia/Australia', general: 'Generales', otros: 'Otros Mundos',
    expedicion: 'Expedición', investigacion: 'Investigación', especial: 'Especial', misterio: 'Misterio', mitos: 'Mitos',
    ruinas: 'Ruinas místicas', aventura: 'Aventura', devastacion: 'Devastación', desastre: 'Desastre', preludio: 'Preludio',
  };
  const COLOR = { g: 'verde', y: 'amarilla', b: 'azul' };
  const DIFF = { E: 'Fácil', N: 'Normal', H: 'Difícil' };
  const COLOR_PL = { g: 'verdes', y: 'amarillas', b: 'azules' };
  const DIFF_PL = { E: 'fáciles', N: 'normales', H: 'difíciles' };
  const MTYPE = { evento: 'Evento', rumor: 'Rumor', activo: 'Activo' };
  // Mazos de Encuentro «normales»: la carta se descarta tras resolverla y el descarte se rebaraja al agotarse el mazo.
  const ENC_ORDER = ['america', 'europa', 'asia', 'general', 'otros', 'expedicion', 'investigacion', 'devastacion'];

  const cardLabel = (id) => {
    const c = CARDS[id]; if (!c) return '¿?';
    if (c.k === 'mitos') return `Mitos ${COLOR[c.c] || ''}${c.n ? ` · ${c.n}` : ''}`;
    if (c.k === 'misterio') return `Misterio${c.n ? `: ${c.n}` : ''}`;
    if (c.k === 'especial') return `Especial · ${c.sd}`;
    if (c.k === 'expedicion') return `Expedición${c.loc ? ` (${c.loc})` : ''}`;
    if (c.k === 'ruinas') return `Ruinas místicas${c.loc ? ` (${c.loc})` : ''}`;
    if (c.k === 'preludio' || c.k === 'aventura' || c.k === 'desastre') return `${KIND[c.k]}${c.n ? `: ${c.n}` : ''}`;
    if (c.k === 'investigacion') return 'Encuentro de Investigación';
    if (c.k === 'devastacion') return 'Encuentro de Devastación';
    return `Encuentro · ${KIND[c.k] || c.k}`;
  };

  // ---------- selección de cartas según la colección ----------
  const inColl = (c, exps) => exps.includes(c.x);
  const pool = (k, exps, ao, sd) => window.EH_CARDS.filter((c) => c.k === k && inColl(c, exps) && (ao == null || c.ao === ao) && (sd == null || c.sd === sd)).map((c) => c.id);
  const aoAvail = (exps) => AOS.filter((a) => exps.includes(a.exp));
  const preludes = (exps) => window.EH_CARDS.filter((c) => c.k === 'preludio' && inColl(c, exps));
  // Efectos de Preludio sobre los mazos (por nombre de la carta, sin tildes).
  const PRELUDE_FX = window.EH_PRELUDE_FX || {};
  const preludeFx = (id) => (id != null && PRELUDE_FX[fold(CARDS[id]?.n)]) || {};

  // ---------- mazo de Mitos ----------
  const PRESETS = {
    natural: { name: 'Natural', sub: 'proporción de tu colección' },
    easy: { name: 'Fácil', pct: { E: 40, N: 45, H: 15 } },
    hard: { name: 'Difícil', pct: { E: 15, N: 40, H: 45 } },
    custom: { name: 'Personalizado' },
    official: { name: 'Sin equilibrar', sub: 'al azar, como el reglamento' },
  };
  const COLORS = ['g', 'y', 'b'];
  const DIFFS = ['E', 'N', 'H'];
  // aside: ids de cartas de Mitos apartadas (p. ej. por un Preludio) que no entran en el mazo
  function mythPools(exps, aside = []) {
    const P = {}; for (const c of COLORS) P[c] = { E: [], N: [], H: [] };
    for (const card of window.EH_CARDS) if (card.k === 'mitos' && inColl(card, exps) && P[card.c] && !aside.includes(card.id)) P[card.c][card.df || 'N'].push(card.id);
    return P;
  }
  const findMythos = (exps, name) => window.EH_CARDS.find((c) => c.k === 'mitos' && inColl(c, exps) && fold(c.n) === fold(name));
  function naturalPct(exps) {
    const P = mythPools(exps); const tot = { E: 0, N: 0, H: 0 };
    for (const c of COLORS) for (const d of DIFFS) tot[d] += P[c][d].length;
    const n = tot.E + tot.N + tot.H || 1;
    const pct = { E: Math.round(tot.E * 100 / n), H: Math.round(tot.H * 100 / n) }; pct.N = 100 - pct.E - pct.H;
    return pct;
  }
  function cfgPct(cfg) {
    if (cfg.preset === 'natural') return naturalPct(cfg.exps);
    if (cfg.preset === 'custom') return cfg.pct;
    return PRESETS[cfg.preset]?.pct || null;
  }
  // Reparte cuántas cartas Fáciles/Normales/Difíciles van de cada color: redondeo por color que,
  // ante empates, corrige hacia el total del mazo. Si faltan cartas de una dificultad, se completa con la vecina.
  function planMythos(ao, cfg, aside = []) {
    const P = mythPools(cfg.exps, aside);
    const need = {}; for (const [i, c] of COLORS.entries()) need[c] = ao.mythos.reduce((t, st) => t + st[i], 0);
    const total = COLORS.reduce((t, c) => t + need[c], 0);
    const warn = [];
    for (const c of COLORS) {
      const av = DIFFS.reduce((t, d) => t + P[c][d].length, 0);
      if (av < need[c]) warn.push(`Faltan cartas ${COLOR_PL[c]}: hay ${av} y se necesitan ${need[c]}.`);
    }
    const pct = cfgPct(cfg);
    if (!pct) return { official: true, need, total, warn, P };
    const s = DIFFS.reduce((t, d) => t + (+pct[d] || 0), 0) || 1;
    const p = Object.fromEntries(DIFFS.map((d) => [d, (+pct[d] || 0) / s]));
    const x = {}, t = {}, rem = {};
    for (const c of COLORS) {
      x[c] = {}; t[c] = {};
      for (const d of DIFFS) { t[c][d] = need[c] * p[d]; x[c][d] = Math.floor(t[c][d]); }
      rem[c] = need[c] - DIFFS.reduce((a, d) => a + x[c][d], 0);
    }
    const T = Object.fromEntries(DIFFS.map((d) => [d, total * p[d]]));
    const G = () => Object.fromEntries(DIFFS.map((d) => [d, COLORS.reduce((a, c) => a + x[c][d], 0)]));
    for (;;) {
      const g = G(); let best = null;
      for (const c of COLORS) {
        if (rem[c] <= 0) continue;
        for (const d of DIFFS) {
          const sc = (t[c][d] - x[c][d]) + 0.6 * (T[d] - g[d]);
          if (!best || sc > best.sc) best = { c, d, sc };
        }
      }
      if (!best) break;
      x[best.c][best.d]++; rem[best.c]--;
    }
    // disponibilidad
    const NEXT = { E: ['N', 'H'], H: ['N', 'E'], N: ['E', 'H'] };
    for (const c of COLORS) {
      for (const d of DIFFS) {
        let over = x[c][d] - P[c][d].length;
        if (over <= 0) continue;
        x[c][d] -= over;
        for (const d2 of NEXT[d]) {
          const spare = P[c][d2].length - x[c][d2];
          const k = Math.min(spare, over);
          if (k > 0) { x[c][d2] += k; over -= k; warn.push(`No hay suficientes ${COLOR_PL[c]} ${DIFF_PL[d]}: se completa con ${k} ${DIFF_PL[d2]}.`); }
          if (!over) break;
        }
      }
    }
    return { x, need, total, warn, pct, P };
  }
  function buildMythos(ao, cfg, plan) {
    const chosen = {};
    for (const c of COLORS) {
      if (plan.official) chosen[c] = shuffle(DIFFS.flatMap((d) => plan.P[c][d])).slice(0, plan.need[c]);
      else chosen[c] = DIFFS.flatMap((d) => shuffle([...plan.P[c][d]]).slice(0, plan.x[c][d]));
      const rank = { E: 0, N: 1, H: 2 };
      if (cfg.order === 'prog') chosen[c] = shuffle(chosen[c]).sort((a, b) => rank[CARDS[a].df] - rank[CARDS[b].df]);
      else shuffle(chosen[c]);
    }
    const stages = ao.mythos.map((st) => shuffle(COLORS.flatMap((c, i) => chosen[c].splice(0, st[i]))));
    const stageOf = {};
    stages.forEach((st, i) => st.forEach((id) => { stageOf[id] = i + 1; }));
    return { cards: stages.flat(), stageOf };
  }
  function planTable(ao, plan) {
    const rows = COLORS.map((c, i) => {
      const cells = plan.official ? `<td colspan="3" class="muted">al azar entre todas</td>` : DIFFS.map((d) => `<td>${plan.x[c][d]}</td>`).join('');
      return `<tr><th><span class="dot ${c}"></span>${COLOR_PL[c][0].toUpperCase() + COLOR_PL[c].slice(1)}</th>${ao.mythos.map((st) => `<td class="st">${st[i]}</td>`).join('')}<td class="sum">${plan.need[c]}</td>${cells}</tr>`;
    }).join('');
    const tot = plan.official ? '' : DIFFS.map((d) => `<td>${COLORS.reduce((a, c) => a + plan.x[c][d], 0)}</td>`).join('');
    return `<table class="mtab"><thead><tr><th></th><th>I</th><th>II</th><th>III</th><th>Total</th>${plan.official ? '<th colspan="3"></th>' : '<th>Fác.</th><th>Norm.</th><th>Difí.</th>'}</tr></thead>
      <tbody>${rows}<tr class="tot"><th>Mazo</th>${ao.mythos.map((st) => `<td class="st">${st[0] + st[1] + st[2]}</td>`).join('')}<td class="sum">${plan.total}</td>${tot || '<td colspan="3"></td>'}</tr></tbody></table>
      ${plan.warn.length ? `<div class="note warn">${plan.warn.map(esc).join('<br>')}</div>` : ''}`;
  }

  // ---------- estado ----------
  let S = null;          // estado de la partida
  let H = [];            // historial para deshacer
  let ui = { tab: 'world', screen: 'home' };
  const deck = (id) => S.decks[id];
  const ao = () => AOS.find((a) => a.id === S.ao);

  // Partida compartida: NET != null cuando la partida vive en Firebase (ver «partida compartida» más abajo).
  let NET = null;
  // card: carta robada (para que los demás puedan abrirla desde el aviso)
  function log(msg, card) {
    const e = { t: Date.now(), m: msg };
    if (card != null) e.c = card;
    if (NET) { e.who = meLabel(); e.pid = me().id; NET.out.push(e); }
    S.log.unshift(e); if (S.log.length > 600) S.log.length = 600;
  }
  function snap() { H.push(JSON.stringify(S)); if (H.length > HIST_MAX) H.shift(); }
  function persist() { if (!S || NET) return; lsSet(LS_CUR, S); lsSet(LS_HIST, H.slice(-40)); }
  function act(fn) { if (NET) { netAct(fn); return; } snap(); fn(); persist(); render(); }
  function undo(msg) {
    if (NET) { netUndo(msg); return; }
    if (!H.length) return;
    const last = S.log[0]?.m;
    S = JSON.parse(H.pop());
    persist(); closeModal(); render();
    toast(msg || `Deshecho: ${last || 'acción'}`);
  }
  function mkDeck(id, name, kind, cards = []) { return { id, name, kind, cards, disc: [] }; }
  function addDeck(id, name, kind, cards) { S.decks[id] = mkDeck(id, name, kind, shuffle(cards)); S.order.push(id); }

  function newGame(cfg) {
    const A = AOS.find((a) => a.id === cfg.ao);
    const exps = cfg.exps;
    S = {
      v: 1, ao: A.id, exps: [...exps], created: Date.now(), name: A.name,
      decks: {}, order: [], pending: [], log: [], dev: [], advs: [],
      myth: { cards: [], disc: [], play: [] }, mst: {}, myst: { cards: [], active: null, solved: [] }, tok: {},
      prelude: null, cfg: { preset: cfg.preset, pct: cfgPct(cfg), order: cfg.order },
    };
    H = [];
    // Preludio
    const pre = preludes(exps);
    if (cfg.prelude === 'random' && pre.length) S.prelude = pre[Math.floor(Math.random() * pre.length)].id;
    else if (cfg.prelude !== 'none' && cfg.prelude != null && CARDS[cfg.prelude]) S.prelude = +cfg.prelude;
    const fx = preludeFx(S.prelude);
    // Encuentros
    for (const k of ['america', 'europa', 'asia', 'general', 'otros', 'expedicion']) addDeck(k, KIND[k], k, pool(k, exps));
    addDeck('investigacion', `Investigación · ${A.name}`, 'investigacion', pool('investigacion', exps, A.id));
    for (const sd of A.specials) { const ids = pool('especial', exps, A.id, sd); if (ids.length) addDeck('S:' + sd, sd, 'especial', ids); }
    if (exps.includes('sr') && (A.ruins || fx.ruins)) addDeck('ruinas', KIND.ruinas, 'ruinas', pool('ruinas', exps));
    if (exps.includes('sr') && fx.adventures) { S.decks.aventura = mkDeck('aventura', 'Aventuras', 'aventura', pool('aventura', exps)); S.order.push('aventura'); }
    if (exps.includes('cir')) {
      addDeck('devastacion', KIND.devastacion, 'devastacion', pool('devastacion', exps));
      addDeck('desastre', 'Desastres', 'desastre', pool('desastre', exps));
    }
    for (const n of A.devastated || []) devastate(n);
    // Mitos (un Preludio puede apartar una carta antes de crear el mazo)
    const aside = fx.mythAside ? findMythos(exps, fx.mythAside) : null;
    const m = buildMythos(A, cfg, planMythos(A, cfg, aside ? [aside.id] : []));
    S.myth.cards = m.cards; S.mst = m.stageOf;
    if (aside) {
      if (fx.mythPlayUnless && fx.mythPlayUnless !== A.id) { S.myth.play.push(aside.id); S.tok[aside.id] = { a: 2, p: 0, s: 0 }; log(`Preludio: la carta de Mitos ${aside.n} entra en juego (con 2 fichas de Arcano).`); }
      else log(`Preludio: la carta de Mitos ${aside.n} se aparta y vuelve a la caja.`);
    }
    // Misterios
    S.myst.cards = shuffle(pool('misterio', exps, A.id));
    const first = fx.firstMystery && fx.firstMystery.ao === A.id ? S.myst.cards.find((id) => fold(CARDS[id].n) === fold(fx.firstMystery.n)) : null;
    if (first != null) S.myst.cards = [first, ...S.myst.cards.filter((id) => id !== first)];
    S.myst.active = S.myst.cards.shift() ?? null;
    const st = A.mythos.map((x) => x[0] + x[1] + x[2]);
    log(`Nueva partida contra ${A.name} (${exps.map((e) => EXP_NAME[e]).join(', ')}).`);
    log(`Mazo de Mitos: ${st.join(' + ')} = ${m.cards.length} cartas · ${PRESETS[cfg.preset].name}${S.cfg.pct ? ` (${S.cfg.pct.E}% fáciles, ${S.cfg.pct.N}% normales, ${S.cfg.pct.H}% difíciles)` : ''}${cfg.order === 'prog' ? ', progresivo' : ''}.`);
    if (S.prelude != null) log(`Preludio: ${CARDS[S.prelude].n || '¿?'}.`);
    log(`Primer Misterio: ${CARDS[S.myst.active]?.n || '¿?'}.`);
    H = [];
    persist();
    ui.screen = 'game'; ui.tab = 'world';
    render();
    showSetupSummary(true);
  }

  // ---------- robar / colocar ----------
  function removeEverywhere(id) {
    for (const d of Object.values(S.decks)) for (const key of ['cards', 'disc']) { const i = d[key].indexOf(id); if (i >= 0) d[key].splice(i, 1); }
    for (const key of ['cards', 'disc', 'play']) { const i = S.myth[key].indexOf(id); if (i >= 0) S.myth[key].splice(i, 1); }
    let i = S.pending.findIndex((p) => p.id === id); if (i >= 0) S.pending.splice(i, 1);
    i = S.advs.indexOf(id); if (i >= 0) S.advs.splice(i, 1);
  }
  function whereIs(id) {
    for (const d of Object.values(S.decks)) {
      if (d.cards.includes(id)) return { deck: d.id, zone: 'cards' };
      if (d.disc.includes(id)) return { deck: d.id, zone: 'disc' };
    }
    if (S.myth.play.includes(id)) return { zone: 'mplay' };
    if (S.myth.cards.includes(id)) return { zone: 'mdeck' };
    if (S.myth.disc.includes(id)) return { zone: 'mdisc' };
    if (S.myst.active === id) return { zone: 'myst' };
    if (S.myst.solved.includes(id)) return { zone: 'solved' };
    if (S.advs.includes(id)) return { zone: 'adv' };
    if (S.pending.some((p) => p.id === id)) return { zone: 'pending' };
    return { zone: 'none' };
  }
  // Fichas sobre cartas en juego (Mitos y Misterio activo): { id: { a: Arcano, p: Pistas, s: Salud } }
  const toks = () => S.tok || (S.tok = {});
  const tokOf = (id) => toks()[id] || (toks()[id] = { a: 0, p: 0, s: 0 });
  const TOK = { a: 'Arcano', p: 'Pistas', s: 'Salud' };
  // Fichas sobre la carta como recordatorio visual: la ficha original (del mod de TTS) con el número encima, sólo si hay alguna
  const tokImg = (k) => `<img src="img/tok/${k}.webp" alt="">`;
  const tokBadges = (id) => {
    const t = toks()[id]; if (!t) return '';
    return Object.keys(TOK).filter((k) => t[k]).map((k) => `<i class="tkn ${k}" title="${t[k]} ${TOK[k]}">${tokImg(k)}<b>${t[k]}</b></i>`).join('');
  };
  // pos: 'top' | 'bottom' | 'random' | 'disc'
  function place(id, deckId, pos) {
    removeEverywhere(id);
    if (deckId === 'MY') {
      if (pos === 'disc') S.myth.disc.push(id); else if (pos === 'play') S.myth.play.push(id);
      else if (pos === 'bottom') S.myth.cards.push(id); else S.myth.cards.unshift(id);
      // fichas: al entrar en juego, las de Arcano que indica la carta; al salir, se descartan
      if (pos === 'play') { if (!toks()[id]) toks()[id] = { a: CARDS[id].tk || 0, p: 0, s: 0 }; }
      else delete toks()[id];
      return;
    }
    const d = deck(deckId); if (!d) return;
    if (pos === 'top') d.cards.unshift(id);
    else if (pos === 'bottom') d.cards.push(id);
    else if (pos === 'random') d.cards.splice(Math.floor(Math.random() * (d.cards.length + 1)), 0, id);
    else d.disc.push(id);
  }
  const posLabel = (pos) => ({ top: 'arriba', bottom: 'al fondo', random: 'barajada en el mazo', disc: 'al descarte', play: 'en juego' }[pos] || pos);

  function draw(deckId, where = 'top') {
    if (deckId === 'MY') {
      if (!S.myth.cards.length) return null;
      const id = S.myth.cards.shift();
      S.pending.push({ id, from: 'MY', by: NET ? meLabel() : undefined });
      log(`Fase de Mitos: se roba ${cardLabel(id)} (etapa ${S.mst[id] || '?'}).`, id);
      return id;
    }
    const d = deck(deckId);
    if (!d) return null;
    if (!d.cards.length && d.disc.length && d.kind !== 'aventura') {
      d.cards = shuffle(d.disc.splice(0));
      log(`${d.name}: el mazo se agotó y se baraja el descarte para formar uno nuevo.`);
      toast(`${esc(d.name)}: se baraja el descarte`);
    }
    if (!d.cards.length) { toast(`${esc(d.name)} está vacío.`); return null; }
    let id;
    if (where === 'bottom') id = d.cards.pop();
    else if (where === 'random') id = d.cards.splice(Math.floor(Math.random() * d.cards.length), 1)[0];
    else id = d.cards.shift();
    S.pending.push({ id, from: deckId, by: NET ? meLabel() : undefined });
    log(`Se roba ${where === 'bottom' ? 'de abajo ' : where === 'random' ? 'al azar ' : ''}de ${d.name}: ${cardLabel(id)}.`, id);
    return id;
  }
  const topLoc = (deckId) => { const d = S.decks[deckId]; const id = d?.cards[0]; return id != null ? CARDS[id].loc || '¿?' : null; };

  // ---------- render ----------
  function render() {
    const app = $('#app');
    if (ui.screen === 'home' || !S) { document.body.classList.remove('hashand'); app.innerHTML = homeHTML(); bindHome(); return; }
    const A = ao();
    const solved = S.myst.solved.length;
    app.innerHTML = `
      <div class="stickyhead"><header class="top">
        <span class="sign sm"><span class="wordmark sm">Eldritch<br>Horror</span></span>
        <div class="title"><b>${esc(A.name)}</b><small>${S.exps.map((e) => EXP_NAME[e]).join(' · ')} · Misterios ${solved}/3</small></div>
        ${NET ? sessionChipHTML() : ''}
        <button class="iconbtn" data-a="layout" title="${isCols() ? 'Una columna con pestañas' : 'Dos columnas'}">${isCols() ? ICON.single : ICON.cols}</button>
        <button class="iconbtn" data-a="sheet" title="Hoja de Primigenio">${ICON.sheet}</button>
        <button class="iconbtn" data-a="undo" title="Deshacer" ${H.length || NET ? '' : 'disabled'}>${ICON.undo}</button>
        <button class="iconbtn" data-a="menu" title="Menú">${ICON.menu}</button>
      </header>
      <nav class="tabs">
        ${[['world', 'Encuentros'], ['mythos', 'Mitos y Misterio'], ['log', 'Registro']].map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}
      </nav></div>
      <main class="main">
        <div class="cols">
          <section class="pane ${ui.tab === 'world' ? 'on' : ''}">${worldHTML()}</section>
          <section>
            <div class="pane ${ui.tab === 'mythos' ? 'on' : ''}">${mythosHTML()}</div>
            <div class="pane ${ui.tab === 'log' ? 'on' : ''}">${logHTML()}</div>
          </section>
        </div>
      </main>
      <footer class="foot">
      ${S.pending.length ? `<div class="mythos hand">
        <span class="muted" style="align-self:center;padding:0 6px;white-space:nowrap">En mano:</span>
        ${S.pending.map((p) => `<button class="chip" data-open="${p.id}">${p.by ? `<b>${esc(p.by.split(' (')[0])}:</b> ` : ''}${esc(cardLabel(p.id))}</button>`).join('')}
      </div>` : ''}
      <nav class="mythos">
        <button class="myth mph" data-m="mythos">${ICON.myth}Fase de<br>Mitos<small>(${S.myth.cards.length})</small></button>
        <button class="myth mys" data-m="myst">${ICON.myst}Misterio<br>activo</button>
        ${S.myth.play.length ? `<button class="myth rck" data-m="reck">${ICON.reck}Retri­bución</button>` : ''}
        ${S.decks.desastre ? `<button class="myth dis" data-m="disaster">${ICON.disaster}Resolver<br>Desastre</button>` : ''}
      </nav></footer>
      <div class="sizectl" title="Tamaño de las cartas"><button data-sz="-1" ${sizeIdx() ? '' : 'disabled'} aria-label="Cartas más chicas">−</button><button data-sz="1" ${sizeIdx() < SIZES.length - 1 ? '' : 'disabled'} aria-label="Cartas más grandes">+</button></div>`;
    document.body.classList.toggle('hashand', S.pending.length > 0);
    bindGame();
  }

  function worldHTML() {

    // la casilla de la Expedición activa y de Ruinas místicas se ve debajo de su mazo
    let h = `<h2 class="sec">Encuentros</h2><div class="decks">`;
    for (const id of ENC_ORDER) if (S.decks[id]) h += tileHTML(deck(id));
    h += '</div>';
    if (S.decks.devastacion) h += `<div class="panel devrow"><span>Ciudades devastadas: <b>${S.dev.length}</b> / 9${S.dev.length ? ` · ${esc(S.dev.join(', '))}` : ''}</span><span class="spacer"></span><button class="chip" data-a="devmenu">Marcar…</button></div>`;
    const sp = S.order.filter((id) => id.startsWith('S:') || id === 'ruinas' || id === 'aventura');
    if (sp.length) { h += `<h2 class="sec">Encuentros especiales</h2><div class="decks">`; for (const id of sp) h += tileHTML(deck(id)); h += '</div>'; }
    if (S.advs.length) h += `<h2 class="sec">Aventuras en juego</h2><div class="codex">${S.advs.map((id) => `<div class="c land" data-open="${id}"><img src="${face(id)}" alt=""></div>`).join('')}</div>`;
    return h;
  }

  function tileHTML(d) {
    const anyId = d.cards[0] ?? d.disc[0];
    const bg = anyId != null ? back(anyId) : '';
    // la cantidad de cartas va en la esquina del dorso
    const sub = d.kind === 'aventura' ? 'toca para elegir'
      : d.kind === 'expedicion' || d.kind === 'ruinas' ? `<span class="loc">${d.kind === 'expedicion' ? 'Activa' : 'Ficha'}: ${esc(topLoc(d.id) || '—')}</span>`
      : d.disc.length ? `${d.disc.length} descartadas` : '';
    // el dorso entero, con la forma de la carta, y el nombre debajo
    return `<div class="deck ${d.cards.length ? '' : 'empty'}" data-draw="${esc(d.id)}">
      <div class="dback" style="${bg ? `background-image:url(${bg});` : ''}aspect-ratio:${anyId != null ? ratio(anyId) : 0.64}">
        <button class="more" data-dmenu="${esc(d.id)}" title="Opciones">⋯</button>
        <span class="cnt">${d.cards.length}</span>
      </div>
      <div class="dname">${esc(d.name)}<small>${sub}</small></div>
    </div>`;
  }

  function mythosHTML() {
    const A = ao();
    const m = S.myth;
    const left = [1, 2, 3].map((s) => m.cards.filter((id) => S.mst[id] === s).length);
    const act0 = S.myst.active;
    let h = `<h2 class="sec">Misterio activo</h2>
      <div class="mystery">
        ${act0 != null ? `<div class="mcard" data-open="${act0}" style="aspect-ratio:${ratio(act0)}"><img src="${face(act0)}" alt=""><div class="tks">${tokBadges(act0)}</div></div>` : `<div class="panel muted">No hay Misterio activo${S.myst.solved.length >= 3 ? ': ¡ya se resolvieron 3!' : '.'}</div>`}
        <div class="row"><span class="pill">Resueltos: <b>${S.myst.solved.length}</b> / 3</span><span class="muted">${S.myst.cards.length} en el mazo</span><span class="spacer"></span>
          ${act0 != null ? `<button class="btn gold" data-a="solve">Misterio resuelto</button>` : S.myst.cards.length ? `<button class="btn" data-a="nextmyst">Robar Misterio</button>` : ''}</div>
        ${S.myst.solved.length ? `<div class="chips">${S.myst.solved.map((id) => `<button class="chip" data-open="${id}">✓ ${esc(CARDS[id].n || 'Misterio')}</button>`).join('')}</div>` : ''}
      </div>
      <h2 class="sec">Mazo de Mitos</h2>
      <div class="panel">
        <div class="stages">${[1, 2, 3].map((s, i) => `<div class="stage ${left[i] && !left.slice(0, i).some(Boolean) ? 'cur' : ''}"><span>Etapa ${'I'.repeat(s)}</span><b>${left[i]}</b><small>de ${A.mythos[i].reduce((a, b) => a + b, 0)}</small></div>`).join('')}</div>
        <div class="row" style="margin-top:8px"><span class="muted">${m.cards.length} cartas por robar · ${m.disc.length} descartadas</span><span class="spacer"></span>
          <button class="btn primary" data-m="mythos">Robar carta de Mitos</button></div>
        ${S.cfg?.pct ? `<div class="muted" style="font-size:.85rem;margin-top:6px">Dificultad: ${S.cfg.pct.E}% fáciles · ${S.cfg.pct.N}% normales · ${S.cfg.pct.H}% difíciles${S.cfg.order === 'prog' ? ' · progresivo' : ''}</div>` : ''}
      </div>
      <h2 class="sec">Cartas de Mitos en juego</h2>
      ${m.play.length ? `<div class="codex">${m.play.map((id) => `<div class="c" data-open="${id}"><img src="${face(id)}" loading="lazy" alt=""><span>${esc(MTYPE[CARDS[id].ty] || 'Mitos')}</span><div class="tks">${tokBadges(id)}</div></div>`).join('')}</div>
        <div class="row" style="margin-top:8px"><span class="muted">Toca una carta para sumar o quitar fichas.</span><span class="spacer"></span><button class="btn" data-m="reck">${ICON.reck} Retribución</button></div>` : '<p class="muted">No hay Rumores ni cartas de Mitos Activas en juego.</p>'}
      ${m.disc.length ? `<div class="chips"><button class="chip" data-a="mdisc">Ver descarte de Mitos (${m.disc.length})</button></div>` : ''}`;
    if (S.decks.desastre) {
      h += `<h2 class="sec">Desastres</h2><div class="decks">${tileHTML(deck('desastre'))}</div>`;
    }
    if (S.prelude != null) h += `<h2 class="sec">Preludio</h2><div class="codex"><div class="c" data-open="${S.prelude}"><img src="${face(S.prelude)}" alt=""></div></div>`;
    return h;
  }

  function logHTML() {
    return `<h2 class="sec">Registro</h2><ul class="log">${S.log.slice(0, 250).map((l) => `<li><time>${timeStr(l.t)}</time><span>${l.who ? `<b class="who">${esc(l.who)}</b> ` : ''}${esc(l.m)}</span></li>`).join('')}</ul>`;
  }

  function bindGame() {
    $('#app').onclick = (e) => {
      const t = e.target.closest('[data-a],[data-tab],[data-draw],[data-dmenu],[data-m],[data-open],[data-peek],[data-sz]');
      if (!t) return;
      e.stopPropagation();
      if (t.dataset.tab) { ui.tab = t.dataset.tab; render(); return; }
      if (t.dataset.sz) { lsSet(LS_SIZE, sizeIdx() + +t.dataset.sz); applySize(); render(); return; }
      if (t.dataset.dmenu) { deckMenu(t.dataset.dmenu); return; }
      if (t.dataset.open) { openCard(+t.dataset.open); return; }
      if (t.dataset.peek) { const id = deck(t.dataset.peek).cards[0]; if (id != null) viewImage(back(id), `Dorso: ${CARDS[id].loc || ''}`); return; }
      if (t.dataset.draw) { tileTap(t.dataset.draw); return; }
      if (t.dataset.m) {
        const m = t.dataset.m;
        if (m === 'mythos') mythosPhase();
        else if (m === 'myst') { if (S.myst.active != null) openCard(S.myst.active); else { ui.tab = 'mythos'; render(); } }
        else if (m === 'disaster') drawAndOpen('desastre');
        else if (m === 'reck') reckoning();
        return;
      }
      const a = t.dataset.a;
      if (a === 'layout') { lsSet(LS_LAYOUT, isCols() ? 'tabs' : 'cols'); applyLayout(); render(); return; }
      if (a === 'undo') undo();
      else if (a === 'menu') mainMenu();
      else if (a === 'sheet') sheetModal();
      else if (a === 'solve') solveMystery();
      else if (a === 'nextmyst') act(() => { S.myst.active = S.myst.cards.shift(); log(`Nuevo Misterio: ${CARDS[S.myst.active].n || '¿?'}.`); });
      else if (a === 'mdisc') browseList([...S.myth.disc].reverse(), 'Descarte de Mitos', 'La primera es la última descartada.');
      else if (a === 'devmenu') devastationModal();
      else if (a === 'session') sessionModal();
    };
  }

  function tileTap(deckId) {
    const d = deck(deckId);
    if (d.kind === 'aventura') { pickAdventure(); return; }
    drawAndOpen(deckId);
  }
  function drawAndOpen(deckId, where = 'top') {
    let id = null;
    act(() => { id = draw(deckId, where); });
    if (id != null) openCard(id, { fresh: true });
  }
  function mythosPhase() {
    if (!S.myth.cards.length) {
      alertModal('Mazo de Mitos agotado', 'Hay que robar una carta de Mitos y no quedan: <b>los investigadores pierden la partida</b>.');
      act(() => log('El mazo de Mitos está vacío: los investigadores pierden.'));
      return;
    }
    let id = null;
    act(() => { id = draw('MY'); });
    if (id != null) openCard(id, { fresh: true });
  }
  function solveMystery() {
    const id = S.myst.active; if (id == null) return;
    let next = null;
    act(() => {
      S.myst.solved.push(id); S.myst.active = null; delete toks()[id];
      log(`Misterio resuelto: ${CARDS[id].n || '¿?'} (${S.myst.solved.length}/3).`);
      if (S.myst.solved.length < 3 && S.myst.cards.length) { next = S.myst.cards.shift(); S.myst.active = next; log(`Nuevo Misterio: ${CARDS[next].n || '¿?'}.`); }
    });
    if (S.myst.solved.length >= 3) alertModal('¡Tres Misterios resueltos!', 'Si el Primigenio no ha despertado, <b>los investigadores ganan la partida</b>. Si ya despertó, falta resolver el Misterio final de la hoja.');
    else if (next != null) openCard(next, { info: 'Nuevo Misterio activo: resuelve su efecto «Cuando esta carta entra en juego».', readonly: true });
  }
  // Aviso cuando a un Rumor se le acaban las fichas de Arcano
  function noArcane(ids) {
    alertModal('Sin fichas de Arcano', `${ids.map((x) => `<b>${esc(CARDS[x].n || cardLabel(x))}</b>`).join(', ')}: resuelve ahora el efecto «Cuando no queden fichas de Arcano sobre esta carta…».
      <div class="chips">${ids.map((x) => `<button class="chip" data-open="${x}">Ver ${esc(CARDS[x].n || 'carta')}</button>`).join('')}</div>`);
  }
  // Retribución de las cartas de Mitos en juego: la app aplica las fichas que no dependen de nada y lista el resto
  function reckoning() {
    const play = [...S.myth.play];
    if (!play.length) { toast('No hay cartas de Mitos en juego.'); return; }
    const auto = [], ask = [], other = [], empty = [];
    act(() => {
      for (const id of play) {
        const c = CARDS[id], t = tokOf(id);
        if (c.rk === 'a-') { if (t.a > 0) { t.a--; if (!t.a) empty.push(id); } auto.push([id, `−1 Arcano (quedan ${t.a})`]); }
        else if (c.rk === 's+') { t.s++; auto.push([id, `+1 Salud (hay ${t.s})`]); }
        else if (c.rk) ask.push(id);
        else other.push(id);
      }
      log(`Retribución: ${auto.map(([id, s]) => `${CARDS[id].n} ${s}`).join(' · ') || 'sin cambios automáticos'}.`);
    });
    const row = (id, txt) => `<li><button class="chip" data-open="${id}">${esc(CARDS[id].n || cardLabel(id))}</button> ${txt}</li>`;
    openModal(`<div class="mbox"><div class="mhead"><h3>Retribución</h3><button class="iconbtn" data-x>✕</button></div>
      ${auto.length ? `<div class="panel"><b>Hecho por la app</b><ul class="rk">${auto.map(([id, s]) => row(id, `${s}${CARDS[id].rkn ? `<div class="muted">${esc(CARDS[id].rkn)}</div>` : ''}`)).join('')}</ul></div>` : ''}
      ${empty.length ? `<div class="note warn"><b>Sin fichas de Arcano:</b> ${empty.map((x) => esc(CARDS[x].n)).join(', ')}. Resuelve su efecto «Cuando no queden fichas de Arcano…».</div>` : ''}
      ${ask.length ? `<div class="panel" style="margin-top:10px"><b>Decides tú</b> <span class="muted">(abre la carta y usa − / +)</span><ul class="rk">${ask.map((id) => row(id, `<div class="muted">${esc(CARDS[id].rkn || '')}</div>`)).join('')}</ul></div>` : ''}
      ${other.length ? `<div class="panel" style="margin-top:10px"><b>Revisa también su efecto de Retribución</b><ul class="rk">${other.map((id) => row(id, '')).join('')}</ul></div>` : ''}
      <p class="muted" style="font-size:.85rem">La Retribución también afecta a Monstruos, al Primigenio, pertenencias y Estados: eso sigue siendo en la mesa.</p>
      <div class="actions"><button class="btn primary full" data-x>Hecho</button></div></div>`,
      (e) => { const o = e.target.closest('[data-open]'); if (o) openCard(+o.dataset.open); });
  }
  function pickAdventure() {
    const d = deck('aventura');
    openModal(`<div class="mbox wide"><div class="mhead"><div style="flex:1"><h3>Aventuras</h3><div class="sub">Las Aventuras se roban por nombre: elige la que indica el Preludio o la Aventura completada.</div></div><button class="iconbtn" data-x>✕</button></div>
      <div class="thumbs land">${d.cards.map((id) => `<div class="t" data-pick="${id}"><img src="${face(id)}" loading="lazy" alt=""><span>${esc(CARDS[id].n || '')}</span></div>`).join('')}</div></div>`,
      (e) => {
        const t = e.target.closest('[data-pick]'); if (!t) return;
        const id = +t.dataset.pick; closeModal();
        act(() => { removeEverywhere(id); S.pending.push({ id, from: 'aventura' }); log(`Se roba la Aventura ${CARDS[id].n || ''}.`); });
        openCard(id, { fresh: true });
      });
  }

  // ---------- visor de carta ----------
  function toggleZoom() {
    lsSet(LS_ZOOM, !isZoom()); applyZoom();
    const b = $('#modal [data-zoom]');
    if (b) b.parentNode.innerHTML = `<button class="chip" data-zoom>${isZoom() ? '− Achicar' : '🔍 Ampliar'}</button> · toca la carta para ${isZoom() ? 'achicar' : 'ampliar'}`;
  }
  function openCard(id, opt = {}) {
    const c = CARDS[id]; if (!c) return;
    const p = S.pending.find((x) => x.id === id);
    const w = whereIs(id);
    let actions = '';
    const fromDeck = p && p.from !== 'MY' ? deck(p.from) : null;
    if (opt.readonly) {
      actions = `<button class="btn primary full" data-x>Hecho</button>`;
    } else if (p && p.from === 'MY') {
      const stays = c.ty === 'rumor' || c.ty === 'activo';
      actions = stays
        ? `<button class="btn primary" data-mv="MY" data-pos="play">Queda en juego<small>${MTYPE[c.ty]}</small></button><button class="btn" data-mv="MY" data-pos="disc">Descartar</button>`
        : `<button class="btn primary" data-mv="MY" data-pos="disc">Resuelta<small>al descarte</small></button><button class="btn" data-mv="MY" data-pos="play">Dejar en juego</button>`;
      actions += `<button class="btn full" data-mv="MY" data-pos="top">Devolverla arriba del mazo de Mitos</button>`;
    } else if (p && p.from === 'aventura') {
      actions = `<button class="btn primary" data-do="advplay">En juego</button><button class="btn" data-mv="aventura" data-pos="top">Devolver a las apartadas</button>`;
    } else if (p) {
      actions = `<button class="btn primary" data-mv="${esc(p.from)}" data-pos="disc">Resuelta<small>al descarte de ${esc(fromDeck?.name || '')}</small></button>
        <button class="btn" data-mv="${esc(p.from)}" data-pos="bottom">Al fondo del mazo</button>
        <button class="btn" data-mv="${esc(p.from)}" data-pos="top">Devolver arriba</button>
        <button class="btn" data-mv="${esc(p.from)}" data-pos="random">Barajar en el mazo</button>`;
    } else if (w.zone === 'mplay') {
      actions = `<button class="btn primary" data-mv="MY" data-pos="disc">Descartar<small>${c.ty === 'rumor' ? 'Rumor resuelto o terminado' : 'ya no está en juego'}</small></button><button class="btn" data-x>Cerrar</button>`;
    } else if (w.zone === 'myst') {
      actions = `<button class="btn gold" data-do="solve">Misterio resuelto</button><button class="btn" data-x>Cerrar</button>`;
    } else if (w.zone === 'adv') {
      actions = `<button class="btn primary" data-do="advdone">Completada<small>sale del juego</small></button><button class="btn" data-x>Cerrar</button>`;
    } else {
      actions = `<button class="btn" data-x>Cerrar</button>`;
    }
    const where = p ? (p.from === 'MY' ? `Mazo de Mitos · etapa ${S.mst[id] || '?'}` : `Robada de ${esc(fromDeck?.name || p.from)}`)
      : w.zone === 'mplay' ? 'En juego' : w.zone === 'myst' ? 'Misterio activo' : w.zone === 'solved' ? 'Misterio resuelto' : w.deck ? `${esc(deck(w.deck).name)}${w.zone === 'disc' ? ' (descarte)' : ''}` : '';
    const tags = c.k === 'mitos' ? `<div class="tags"><span class="dot ${c.c}"></span>${esc(COLOR[c.c] || '')} · ${esc(MTYPE[c.ty] || '¿tipo?')} · ${esc(DIFF[c.df] || '')}</div>` : '';
    const land = ratio(id) > 1;
    // Rumores: casilla de la ficha de Rumor, fichas de Arcano iniciales y qué hace la Retribución
    const rumor = c.k === 'mitos' && (c.rl || c.tk || c.rkn) && w.zone !== 'mdisc' ? `<div class="note" style="margin:0 0 10px">
      ${c.rl ? `<div>Ficha de Rumor en <b>${esc(c.rl)}</b>.</div>` : ''}
      ${c.tk ? `<div>Entra en juego con <b>${c.tk} fichas de Arcano</b>${w.zone === 'mplay' ? '' : ' (la app las coloca al dejarla en juego)'}.</div>` : ''}
      ${c.rk ? `<div class="muted">Retribución: ${c.rk === 'a-' ? 'la app descarta 1 ficha de Arcano.' : c.rk === 's+' ? 'la app coloca 1 ficha de Salud.' : 'decides tú cuántas fichas.'}${c.rkn ? ` ${esc(c.rkn)}` : ''}</div>` : ''}</div>` : '';
    const tk = (w.zone === 'mplay' || w.zone === 'myst') ? tokOf(id) : null;
    const tokRow = tk ? `<div class="tokrow">${Object.keys(TOK).map((k) => `<div class="tok ${k}">${tokImg(k)}<span>${TOK[k]}</span>
        <button class="tkb" data-tk="${k}" data-d="-1" ${tk[k] ? '' : 'disabled'}>−</button><b>${tk[k]}</b><button class="tkb" data-tk="${k}" data-d="1">+</button></div>`).join('')}</div>` : '';
    openModal(`<div class="mbox ${land ? 'wide' : ''}">
      <div class="mhead"><div style="flex:1"><h3>${esc(cardLabel(id))}</h3><div class="sub">${where}</div>${tags}</div><button class="iconbtn" data-x>✕</button></div>
      ${opt.info ? `<div class="note" style="margin:0 0 10px">${opt.info}</div>` : ''}
      ${c.tr ? `<div class="note en" style="margin:0 0 10px">${esc(c.tr)}</div>` : ''}
      ${rumor}${tokRow}
      ${englishHTML(c)}
      <div class="viewer"><div class="flip ${land ? 'land' : ''}" id="flipper" style="aspect-ratio:${ratio(id)}">
        <div class="face a"><img src="${face(id)}" alt="" draggable="false">${tk ? `<div class="tks big">${tokBadges(id)}</div>` : ''}</div>
      </div></div>
      <div class="fliphint"><button class="chip" data-zoom>${isZoom() ? '− Achicar' : '🔍 Ampliar'}</button> · toca la carta para ${isZoom() ? 'achicar' : 'ampliar'}</div>
      <div class="actions">${actions}</div>
      ${opt.fresh && p ? '<p class="muted" style="text-align:center;font-size:.85rem">Cerrar con ✕ cancela el robo: la carta vuelve a su lugar.</p>' : ''}
    </div>`, (e) => {
      if (e.target.closest('[data-zoom]')) { toggleZoom(); return; }
      if (e.target.closest('#flipper')) {
        // un toque en la carta: ampliar o volver al tamaño normal
        toggleZoom();
        return;
      }
      const tb = e.target.closest('[data-tk]');
      if (tb) {
        const k = tb.dataset.tk, dlt = +tb.dataset.d;
        let left = null;
        act(() => { const t = tokOf(id); t[k] = Math.max(0, t[k] + dlt); left = t[k]; log(`${cardLabel(id)}: ${dlt > 0 ? '+1' : '−1'} ficha de ${TOK[k]} (quedan ${t[k]}).`); });
        if (k === 'a' && dlt < 0 && left === 0 && c.k === 'mitos') noArcane([id]);
        else { const sc = $('#modal').scrollTop; openCard(id); $('#modal').scrollTop = sc; }
        return;
      }
      const mv = e.target.closest('[data-mv]');
      if (mv) {
        const to = mv.dataset.mv, pos = mv.dataset.pos;
        closeModal();
        act(() => {
          place(id, to, pos);
          const dn = to === 'MY' ? 'Mitos' : deck(to).name;
          log(`${cardLabel(id)} → ${dn}, ${posLabel(pos)}.`, id);
          if ((to === 'expedicion' || to === 'ruinas') && pos === 'disc') {
            const loc = topLoc(to);
            log(`La ficha de ${to === 'expedicion' ? 'Expedición activa' : 'Ruinas místicas'} se mueve a ${loc || '¿?'}.`);
            if (loc) setTimeout(() => toast(`${to === 'expedicion' ? 'Expedición activa' : 'Ruinas místicas'} → <b>${esc(loc)}</b>`, back(deck(to).cards[0])), 50);
          }
        });
        return;
      }
      const d = e.target.closest('[data-do]'); if (!d) return;
      const k = d.dataset.do;
      if (k === 'solve') { closeModal(); solveMystery(); return; }
      closeModal();
      act(() => {
        if (k === 'advplay') { removeEverywhere(id); S.advs.push(id); log(`Aventura en juego: ${CARDS[id].n || ''}.`); }
        else if (k === 'advdone') { removeEverywhere(id); log(`Aventura completada: ${CARDS[id].n || ''}.`); }
      });
    }, opt.fresh && p ? () => { if (S.pending.some((x) => x.id === id)) undo('Robo cancelado: la carta volvió a su lugar'); } : null);
  }

  // ---------- menús ----------
  function deckMenu(deckId) {
    const d = deck(deckId);
    openModal(`<div class="mbox"><div class="mhead"><div style="flex:1"><h3>${esc(d.name)}</h3><div class="sub">${d.cards.length} cartas${d.disc.length ? ` · ${d.disc.length} en descarte` : ''}</div></div><button class="iconbtn" data-x>✕</button></div>
      <div class="menu">
        ${d.kind !== 'aventura' ? `<button class="btn" data-k="top">Robar de arriba</button><button class="btn" data-k="bottom">Robar de abajo</button><button class="btn" data-k="random">Robar al azar</button><button class="btn" data-k="shuffle">Barajar el mazo</button>` : ''}
        <button class="btn" data-k="browse">Ver las cartas del mazo (y sacar una)</button>
        ${d.disc.length ? `<button class="btn" data-k="disc">Ver el descarte (${d.disc.length})</button><button class="btn" data-k="reshuffle">Barajar el descarte dentro del mazo</button>` : ''}
        ${deckId === 'devastacion' ? '<button class="btn" data-k="dev">Marcar ciudad devastada…</button>' : ''}
      </div></div>`, (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k; closeModal();
      if (k === 'top' || k === 'bottom' || k === 'random') drawAndOpen(deckId, k);
      else if (k === 'shuffle') act(() => { shuffle(d.cards); log(`Se baraja ${d.name}.`); toast(`${esc(d.name)} barajado`); });
      else if (k === 'browse') browse(deckId);
      else if (k === 'disc') browseList([...d.disc].reverse(), `${d.name} · descarte`, 'La primera es la última descartada.');
      else if (k === 'reshuffle') act(() => { d.cards.push(...d.disc.splice(0)); shuffle(d.cards); log(`El descarte de ${d.name} se baraja en el mazo.`); });
      else if (k === 'dev') devastationModal();
    });
  }
  function browse(deckId) {
    const d = deck(deckId);
    const go = () => openModal(`<div class="mbox wide"><div class="mhead"><div style="flex:1"><h3>${esc(d.name)}</h3><div class="sub">En orden, de arriba a abajo. Toca una carta para sacarla a la mano.</div></div><button class="iconbtn" data-x>✕</button></div>
      <div class="thumbs ${ratio(d.cards[0]) > 1 ? 'land' : ''}">${d.cards.map((id, i) => `<div class="t" data-pick="${id}"><img src="${face(id)}" loading="lazy" alt=""><span>${i + 1}</span></div>`).join('')}</div></div>`,
      (e) => {
        const t = e.target.closest('[data-pick]'); if (!t) return;
        const id = +t.dataset.pick; closeModal();
        act(() => { removeEverywhere(id); S.pending.push({ id, from: deckId }); log(`Se busca y saca de ${d.name}: ${cardLabel(id)}.`); });
        openCard(id, { fresh: true });
      });
    confirmModal('¿Mirar el mazo?', 'Vas a ver el contenido y el orden del mazo (spoilers).', go, 'Mirar');
  }
  function browseList(ids, title, sub) {
    openModal(`<div class="mbox wide"><div class="mhead"><div style="flex:1"><h3>${esc(title)}</h3><div class="sub">${esc(sub || '')}</div></div><button class="iconbtn" data-x>✕</button></div>
      <div class="thumbs">${ids.map((id) => `<div class="t" data-pick="${id}"><img src="${face(id)}" loading="lazy" alt=""></div>`).join('')}</div></div>`,
      (e) => { const t = e.target.closest('[data-pick]'); if (t) openCard(+t.dataset.pick); });
  }
  // Devasta una ciudad: sus cartas de Expedición vuelven a la caja.
  function devastate(n) {
    S.dev.push(n);
    const ex = deck('expedicion'); const gone = [...ex.cards, ...ex.disc].filter((id) => fold(CARDS[id].loc) === fold(n));
    for (const id of gone) removeEverywhere(id);
    log(`${n} queda devastada${gone.length ? ` (${gone.length} cartas de Expedición vuelven a la caja)` : ''}.`);
  }
  const CITIES = ['Arkham', 'Buenos Aires', 'Estambul', 'Londres', 'Roma', 'San Francisco', 'Shanghái', 'Sídney', 'Tokio'];
  function devastationModal() {
    openModal(`<div class="mbox"><div class="mhead"><h3>Ciudades devastadas</h3><button class="iconbtn" data-x>✕</button></div>
      <p class="muted" style="margin-top:0">Al devastar una ciudad: descarta sus Pistas, devuelve a la caja las cartas de Expedición de esa casilla y coloca una ficha de Devastación. Si las 9 ciudades con nombre quedan devastadas, los investigadores pierden.</p>
      <div class="targets">${CITIES.map((n) => `<button class="btn ${S.dev.includes(n) ? 'on' : ''}" data-city="${esc(n)}">${S.dev.includes(n) ? '✓ ' : ''}${esc(n)}</button>`).join('')}</div></div>`,
      (e) => {
        const b = e.target.closest('[data-city]'); if (!b) return;
        const n = b.dataset.city; closeModal();
        act(() => {
          if (S.dev.includes(n)) { S.dev = S.dev.filter((x) => x !== n); log(`${n} deja de estar devastada.`); return; }
          devastate(n);
          if (S.dev.length >= 9) setTimeout(() => alertModal('Las 9 ciudades devastadas', '<b>Los investigadores pierden la partida.</b>'), 50);
        });
      });
  }

  function mainMenu() {
    openModal(`<div class="mbox"><div class="mhead"><h3>Menú</h3><button class="iconbtn" data-x>✕</button></div>
      <div class="menu">
        ${NET ? `<button class="btn primary" data-k="session">Partida compartida · ${esc(NET.code)}</button>` : '<button class="btn primary" data-k="share">Compartir partida (varios dispositivos)…</button>'}
        <button class="btn" data-k="setup">Resumen de la preparación</button>
        <button class="btn" data-k="save">Guardar partida con nombre…</button>
        <button class="btn" data-k="export">Exportar partida a archivo (.json)</button>
        <button class="btn" data-k="import">Importar partida desde archivo</button>
        <button class="btn" data-k="home">Volver al inicio (la partida queda guardada)</button>
      </div></div>`, (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'setup') showSetupSummary(false);
      else if (k === 'share') shareGame();
      else if (k === 'session') sessionModal();
      else if (k === 'save') saveNamed();
      else if (k === 'export') { exportGame(); closeModal(); }
      else if (k === 'import') { closeModal(); $('#importFile').click(); }
      else if (k === 'home') { closeModal(); if (NET) netLeave(false); ui.screen = 'home'; render(); }
    });
  }
  function sheetModal(aoId) {
    const A = AOS.find((a) => a.id === (aoId || S.ao));
    openModal(`<div class="mbox wide"><div class="mhead"><h3>${esc(A.name)}</h3><button class="iconbtn" data-x>✕</button></div>
      <div class="sheets"><img class="sheet-img" src="img/ao/${A.id}a.webp" alt="Anverso"><img class="sheet-img" src="img/ao/${A.id}b.webp" alt="Reverso"></div></div>`);
  }
  function showSetupSummary(fresh) {
    const A = ao();
    const fx = preludeFx(S.prelude);
    const exp = topLoc('expedicion'), rui = S.decks.ruinas ? topLoc('ruinas') : null;
    const st = A.mythos.map((x) => x[0] + x[1] + x[2]);
    let h = `<div class="mbox"><div class="mhead"><h3>Preparación · ${esc(A.name)}</h3><button class="iconbtn" data-x>✕</button></div>
      <div class="panel"><ul class="setup">
        <li>Perdición inicial: <b>${A.doom}</b>.</li>
        <li>Mazo de Mitos listo: <b>${Object.keys(S.mst).length}</b> cartas (etapas ${st.join(' / ')}).</li>
        <li>Ficha de Expedición activa en <b>${esc(exp || '¿?')}</b>.</li>
        ${rui ? `<li>Ficha de Ruinas místicas en <b>${esc(rui)}</b>.</li>` : ''}
        ${S.decks.desastre ? '<li>Mazos de Desastres y de Encuentros de Devastación listos (Ciudades en ruinas).</li>' : ''}
        ${A.notes.map((n) => `<li>${esc(n)}</li>`).join('')}
        ${fx.note ? `<li>${esc(fx.note)}</li>` : ''}
      </ul></div>`;
    if (S.prelude != null) h += `<div class="note"><b>Preludio: ${esc(CARDS[S.prelude].n || '')}.</b> Resuélvelo ${fresh ? 'ahora' : 'al preparar'} (salvo que indique otro momento).</div><div class="pair one"><img src="${face(S.prelude)}" alt=""></div>`;
    const m = S.myst.active ?? S.myst.solved[0];
    if (m != null) h += `<div class="note"><b>Primer Misterio: ${esc(CARDS[m].n || '')}.</b> Resuelve su efecto «Cuando esta carta entra en juego».</div><div class="pair one land"><img src="${face(m)}" alt=""></div>`;
    h += `<div class="actions"><button class="btn" data-k="sheet">Ver hoja de Primigenio</button><button class="btn primary" data-x>${fresh ? 'Empezar' : 'Cerrar'}</button></div></div>`;
    openModal(h, (e) => { if (e.target.closest('[data-k=sheet]')) sheetModal(); });
  }

  // ---------- inglés ----------
  // c.en = [[español, inglés, tipo]] calculado al generar los datos (tools/hints.py):
  // n = nombre de carta (Estado, Apoyo, Hechizo, Artefacto, Apoyo único), r = rasgo en VERSALITAS, t = término de reglas.
  function englishHTML(c) {
    const en = c.en || [];
    if (!en.length) return '';
    // un solo renglón compacto, sin rótulos: primero nombres y rasgos (lo que hay que buscar en las cartas), después términos
    const order = { n: 0, r: 1, t: 2 };
    const item = ([es, eng, k]) => `<span class="${k === 't' ? 'term' : ''}">${esc(es)} → <i>${esc(eng)}</i></span>`;
    return `<div class="note en compact">${[...en].sort((a, b) => order[a[2]] - order[b[2]]).map(item).join(' · ')}</div>`;
  }

  // ---------- guardado ----------
  function saveNamed() {
    const saves = lsGet(LS_SAVES, []);
    const name = `${S.name} · ${new Date().toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}`;
    saves.unshift({ name, t: Date.now(), data: S });
    if (!lsSet(LS_SAVES, saves.slice(0, 30))) { toast('No se pudo guardar (almacenamiento lleno).'); return; }
    closeModal(); toast('Partida guardada');
  }
  function exportGame() {
    const blob = new Blob([JSON.stringify({ app: 'eldritch-mazos', v: 1, state: S }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eldritch-${S.ao}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Partida exportada');
  }
  $('#importFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const st = j.state || j;
      if (!st.decks || !st.ao) throw new Error('formato');
      S = st; H = []; ui.screen = 'game'; persist(); render(); toast('Partida importada');
    } catch { toast('El archivo no es una partida válida.'); }
    e.target.value = '';
  };

  // ---------- inicio y preparación ----------
  const defaultSetup = () => ({ exps: ['base'], ao: 'azathoth', prelude: 'none', preset: 'natural', pct: { E: 25, N: 45, H: 30 }, order: 'random' });
  function getSetup() {
    const s = { ...defaultSetup(), ...lsGet(LS_SETUP, {}) };
    s.exps = ['base', ...s.exps.filter((e) => e !== 'base' && EXP_NAME[e])];
    if (!aoAvail(s.exps).some((a) => a.id === s.ao)) s.ao = 'azathoth';
    const pre = preludes(s.exps);
    if (!pre.length) s.prelude = 'none';
    else if (!['none', 'random'].includes(s.prelude) && !pre.some((c) => String(c.id) === String(s.prelude))) s.prelude = 'random';
    if (!PRESETS[s.preset]) s.preset = 'natural';
    return s;
  }
  const setSetup = (s) => lsSet(LS_SETUP, s);

  function homeHTML() {
    const cur = lsGet(LS_CUR, null);
    const saves = lsGet(LS_SAVES, []);
    const s = getSetup();
    const A = AOS.find((a) => a.id === s.ao);
    const plan = planMythos(A, s);
    const pre = preludes(s.exps);
    const pct = cfgPct(s);
    return `<div class="hero"><span class="sign"><span class="wordmark">Eldritch Horror</span></span><p>Mazos de Encuentros, Mitos y Misterios · juego básico y expansiones chicas</p></div>
      <main class="main narrow">
        ${cur ? `<h2 class="sec">Continuar</h2><div class="panel save"><div class="info"><b>${esc(cur.name)}</b><div class="muted">${cur.log.length} acciones · ${cur.log[0] ? timeStr(cur.log[0].t) : ''}</div></div><button class="btn primary" data-k="continue">Continuar</button></div>` : ''}
        <h2 class="sec">Partida compartida</h2>
        <div class="panel"><div class="row">
          ${lsGet(LS_NET, null)?.code ? `<button class="btn primary" data-k="rejoin">Volver a ${esc(lsGet(LS_NET, null).code)}</button>` : ''}
          <input class="input" id="joincode" placeholder="Código, p. ej. DAGON-42" autocapitalize="characters" style="flex:1;min-width:10em;text-transform:uppercase">
          <button class="btn" data-k="join">Unirse</button></div>
          <p class="muted" style="margin:6px 0 0;font-size:.9rem">Para crear una: prepará la partida y en el menú ☰ tocá «Compartir partida».</p></div>
        <h2 class="sec">1 · Colección</h2>
        <div class="chips big">${EXPS.map((e) => `<button class="chip ${s.exps.includes(e.id) ? 'on' : ''}" data-exp="${e.id}" ${e.fixed ? 'disabled' : ''}>${e.fixed ? '✓ ' : s.exps.includes(e.id) ? '✓ ' : '+ '}${esc(e.name)}</button>`).join('')}</div>
        <h2 class="sec">2 · Primigenio</h2>
        <div class="aogrid">${AOS.map((a) => { const ok = s.exps.includes(a.exp); return `<button class="ao ${a.id === s.ao ? 'on' : ''}" data-ao="${a.id}" ${ok ? '' : 'disabled'}>
          <div class="img" style="background-image:url(img/ao/${a.id}a.webp)"></div>
          <div class="t"><b>${esc(a.name)}</b><small>${ok ? `Perdición ${a.doom} · ${pool('misterio', s.exps, a.id).length} Misterios` : `requiere ${esc(EXP_NAME[a.exp])}`}</small></div></button>`; }).join('')}</div>
        <div class="row" style="margin-top:8px"><button class="chip" data-k="aosheet">Ver hoja de ${esc(A.name)}</button>
          <span class="muted">${pool('investigacion', s.exps, A.id).length} Encuentros de Investigación${A.specials.map((sd) => pool('especial', s.exps, A.id, sd).length ? ` · ${esc(sd)} (${pool('especial', s.exps, A.id, sd).length})` : '').join('')}</span></div>
        ${pre.length ? `<h2 class="sec">3 · Preludio</h2>
          <div class="chips">${[['none', 'Sin Preludio'], ['random', 'Al azar']].map(([k, l]) => `<button class="chip ${String(s.prelude) === k ? 'on' : ''}" data-pre="${k}">${l}</button>`).join('')}
            <button class="chip ${!['none', 'random'].includes(String(s.prelude)) ? 'on' : ''}" data-k="pickpre">${!['none', 'random'].includes(String(s.prelude)) ? `Elegido: ${esc(CARDS[s.prelude]?.n || '')}` : 'Elegir…'}</button></div>
          <p class="muted" style="margin:6px 0 0;font-size:.9rem">${pre.length} Preludios en tu colección. Algunos agregan mazos (p. ej. «Alineamiento cósmico» usa Ruinas místicas y Aventuras).</p>` : ''}
        <h2 class="sec">${pre.length ? 4 : 3} · Mazo de Mitos</h2>
        <div class="panel">
          <div class="chips" style="margin-top:0">${Object.entries(PRESETS).map(([k, p]) => `<button class="chip ${s.preset === k ? 'on' : ''}" data-preset="${k}">${p.name}</button>`).join('')}</div>
          <p class="muted" style="margin:6px 0">${s.preset === 'official' ? 'Cartas al azar de cada color, sin mirar la dificultad (regla del juego).' : s.preset === 'natural' ? `Misma proporción que tu colección: ${pct.E}% fáciles · ${pct.N}% normales · ${pct.H}% difíciles.` : `${pct.E}% fáciles · ${pct.N}% normales · ${pct.H}% difíciles, respetando cada color.`}</p>
          ${s.preset === 'custom' ? `<div class="row pctrow">${DIFFS.map((d) => `<label>${DIFF[d]} <input class="input" type="number" inputmode="numeric" min="0" max="100" step="5" data-pct="${d}" value="${s.pct[d]}"> %</label>`).join('')}</div>` : ''}
          ${planTable(A, plan)}
          <div class="chips"><span class="muted" style="align-self:center">Orden:</span>${[['random', 'Al azar entre etapas'], ['prog', 'Progresivo (fáciles primero)']].map(([k, l]) => `<button class="chip ${s.order === k ? 'on' : ''}" data-order="${k}">${l}</button>`).join('')}</div>
        </div>
        <div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn primary big" data-k="start">Preparar partida</button></div>
        <h2 class="sec">Partidas guardadas</h2>
        <div class="saves">${saves.length ? saves.map((sv, i) => `<div class="panel save"><div class="info"><b>${esc(sv.name)}</b><div class="muted">${sv.data.log.length} acciones</div></div><button class="btn" data-load="${i}">Cargar</button><button class="btn" data-del="${i}">✕</button></div>`).join('') : '<p class="muted">Todavía no hay partidas guardadas con nombre.</p>'}
          <div class="row"><button class="btn" data-k="import">Importar partida (.json)</button></div></div>
      </main>`;
  }
  function bindHome() {
    const app = $('#app');
    app.onclick = (e) => {
      const t = e.target.closest('[data-exp],[data-ao],[data-pre],[data-preset],[data-order],[data-k],[data-load],[data-del]'); if (!t || t.disabled) return;
      const s = getSetup();
      if (t.dataset.exp) { const x = t.dataset.exp; s.exps = s.exps.includes(x) ? s.exps.filter((y) => y !== x) : [...s.exps, x]; setSetup(s); render(); return; }
      if (t.dataset.ao) { s.ao = t.dataset.ao; setSetup(s); render(); return; }
      if (t.dataset.pre) { s.prelude = t.dataset.pre; setSetup(s); render(); return; }
      if (t.dataset.preset) { s.preset = t.dataset.preset; if (s.preset === 'custom' && !s.pct) s.pct = { E: 25, N: 45, H: 30 }; setSetup(s); render(); return; }
      if (t.dataset.order) { s.order = t.dataset.order; setSetup(s); render(); return; }
      const k = t.dataset.k;
      if (k === 'aosheet') sheetModal(s.ao);
      else if (k === 'pickpre') pickPrelude(s);
      else if (k === 'start') startGame(s);
      else if (k === 'continue') { S = lsGet(LS_CUR, null); H = lsGet(LS_HIST, []); ui.screen = 'game'; render(); }
      else if (k === 'import') $('#importFile').click();
      else if (k === 'join') joinGame($('#joincode').value);
      else if (k === 'rejoin') joinGame(lsGet(LS_NET, null).code);
      else if (t.dataset.load) { const sv = lsGet(LS_SAVES, [])[+t.dataset.load]; S = sv.data; H = []; ui.screen = 'game'; persist(); render(); }
      else if (t.dataset.del) { const saves = lsGet(LS_SAVES, []); const sv = saves[+t.dataset.del]; confirmModal('¿Borrar partida guardada?', esc(sv.name), () => { saves.splice(+t.dataset.del, 1); lsSet(LS_SAVES, saves); render(); }, 'Borrar'); }
    };
    app.onchange = (e) => {
      const inp = e.target.closest('[data-pct]'); if (!inp) return;
      const s = getSetup(); const d = inp.dataset.pct;
      let v = Math.max(0, Math.min(100, Math.round(+inp.value || 0)));
      s.pct = { ...s.pct, [d]: v };
      // el resto se reparte entre las otras dos para sumar 100
      const others = DIFFS.filter((x) => x !== d);
      const rest = 100 - v, cur = others.reduce((a, x) => a + (+s.pct[x] || 0), 0);
      if (cur === 0) { s.pct[others[0]] = Math.round(rest / 2); s.pct[others[1]] = rest - s.pct[others[0]]; }
      else { s.pct[others[0]] = Math.round(rest * s.pct[others[0]] / cur); s.pct[others[1]] = rest - s.pct[others[0]]; }
      setSetup(s); render();
    };
  }
  function pickPrelude(s) {
    const pre = preludes(s.exps);
    openModal(`<div class="mbox wide"><div class="mhead"><div style="flex:1"><h3>Elegir Preludio</h3><div class="sub">«Controlar tu destino»: el grupo elige el Preludio.</div></div><button class="iconbtn" data-x>✕</button></div>
      <div class="thumbs">${pre.map((c) => `<div class="t" data-pick="${c.id}"><img src="${face(c.id)}" loading="lazy" alt=""><span>${esc(EXP_NAME[c.x])}</span></div>`).join('')}</div></div>`,
      (e) => { const t = e.target.closest('[data-pick]'); if (!t) return; s.prelude = +t.dataset.pick; setSetup(s); closeModal(); render(); });
  }
  function startGame(s) {
    const go = () => newGame(s);
    if (lsGet(LS_CUR, null)) confirmModal('¿Empezar una partida nueva?', 'Reemplaza la partida en curso (guárdala antes con nombre si la quieres conservar).', go, 'Empezar');
    else go();
  }

  // ---------- partida compartida (Firebase Realtime Database) ----------
  // sessions/<CÓDIGO>/game    {ver, json}  estado de la partida (sin el registro), como texto para no perder listas vacías
  //                  /log     entradas del registro {t, m, who, pid, c?}
  //                  /hist/<ver>  estado anterior a cada acción (para deshacer; se guardan las últimas 40)
  //                  /players/<id> {name, inv, on, t}
  const FB_CFG = {
    apiKey: 'AIzaSyDjquMvk9zolE1JZ5Mhd-2axl9ZZR-IdSE',
    authDomain: 'eldritch-mazos.firebaseapp.com',
    databaseURL: 'https://eldritch-mazos-default-rtdb.firebaseio.com',
    projectId: 'eldritch-mazos',
    storageBucket: 'eldritch-mazos.firebasestorage.app',
    messagingSenderId: '108501323336',
    appId: '1:108501323336:web:7b5c9205552f07f304127d',
  };
  const FB_V = '10.14.1';
  const LS_ME = 'ehm.me', LS_NET = 'ehm.net';
  const INVS = window.EH_INVESTIGATORS || [];
  const BIG_EXP = { mom: 'Las montañas de la locura', utp: 'Bajo las pirámides', dl: 'Las Tierras del Sueño', mon: 'Las máscaras de Nyarlathotep' };
  const invOf = (id) => INVS.find((i) => i.id === id);
  const invImg = (id) => `img/inv/${id}.webp`;
  const CODE_WORDS = ['DAGON', 'HYDRA', 'YUGGOTH', 'ARKHAM', 'INNSMOUTH', 'KADATH', 'CARCOSA', 'KINGSPORT', 'DUNWICH', 'LENG', 'YITH', 'NODENS', 'HASTUR', 'SHOGGOTH', 'AZATHOTH', 'TSATHOGGUA'];
  const genCode = () => `${CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]}-${10 + Math.floor(Math.random() * 90)}`;
  function me() {
    let m = lsGet(LS_ME, null);
    if (!m?.id) { m = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), name: '' }; lsSet(LS_ME, m); }
    return m;
  }
  function meLabel() {
    const p = NET?.players?.[me().id]; const inv = invOf(p?.inv || NET?.inv);
    return inv ? `${me().name} (${inv.n})` : me().name;
  }
  // Firebase se carga sólo al compartir o unirse (la partida local no lo necesita)
  let fbP = null;
  function fb() {
    if (!fbP) {
      fbP = (async () => {
        const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
        const [A, U, D] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'].map((f) => import(base + f)));
        const app = A.initializeApp(FB_CFG);
        const auth = U.getAuth(app);
        await U.signInAnonymously(auth);
        return { ...D, db: D.getDatabase(app) };
      })().catch((e) => { fbP = null; throw e; });
    }
    return fbP;
  }
  const nref = (p) => NET.F.ref(NET.F.db, p ? `sessions/${NET.code}/${p}` : `sessions/${NET.code}`);
  const stateJSON = (st = S) => JSON.stringify({ ...st, log: [] });
  let renderQ = false;
  const renderSoon = () => { if (renderQ) return; renderQ = true; setTimeout(() => { renderQ = false; if (ui.screen === 'game' && S) render(); }, 30); };

  // Acción en una partida compartida: se aplica al instante y se guarda con una transacción;
  // si otro jugador cambió la partida justo antes, la acción se rehace sobre la versión nueva.
  function netAct(fn) {
    const before = stateJSON();
    NET.out = [];
    fn();
    render();
    const after = stateJSON(), out = NET.out; NET.out = [];
    if (after === before && !out.length) return;
    const baseVer = NET.ver, F = NET.F;
    let prev = before;
    NET.busy = F.runTransaction(nref('game'), (cur) => {
      if (cur === null || cur.ver === baseVer) { prev = cur ? cur.json : before; return { ver: baseVer + 1, json: after }; }
      const keep = S, keepOut = NET.out; let j;
      S = JSON.parse(cur.json); S.log = [];
      try { fn(); j = stateJSON(); } finally { S = keep; NET.out = keepOut; }
      prev = cur.json;
      return { ver: cur.ver + 1, json: j };
    }).then((res) => {
      if (!res.committed) return;
      const v = res.snapshot.val().ver;
      const up = { [`hist/${v}`]: prev };
      if (v > 40) up[`hist/${v - 40}`] = null;
      for (const e of out) up[`log/${F.push(nref('log')).key}`] = e;
      return F.update(nref(''), up);
    }).catch((e) => toast(`No se pudo guardar la acción: ${esc(e.message || e)}`));
  }
  async function netUndo(msg) {
    const F = NET.F;
    closeModal();
    await NET.busy;
    const s = await F.get(F.query(nref('hist'), F.orderByKey(), F.limitToLast(1)));
    let key = null, json = null; s.forEach((c) => { key = c.key; json = c.val(); });
    if (!json) { toast('No hay nada para deshacer.'); return; }
    const last = NET.log.find((e) => !e.undo)?.m;
    const r = await F.runTransaction(nref('game'), (cur) => (cur === null ? cur : { ver: cur.ver + 1, json }));
    if (!r.committed) return;
    await F.update(nref(''), { [`hist/${key}`]: null, [`log/${F.push(nref('log')).key}`]: { t: Date.now(), m: msg || `Deshace: ${last || 'la última acción'}`, who: meLabel(), pid: me().id, undo: 1 } });
    toast(msg || 'Acción deshecha para todos');
  }
  function netNote(m) { if (NET) NET.F.push(nref('log'), { t: Date.now(), m, who: meLabel(), pid: me().id }); }

  // Llegan cambios de Firebase
  function netGame(v) {
    if (!NET) return;
    if (!v) { const c = NET.code; netLeave(); alertModal('La partida compartida ya no existe', `No se encontró ${esc(c)}.`); ui.screen = 'home'; render(); return; }
    if (v.ver === NET.ver && S && ui.screen === 'game') return;
    NET.ver = v.ver;
    S = JSON.parse(v.json); S.log = NET.log; H = [];
    ui.screen = 'game';
    renderSoon();
  }
  function netLog(snap) {
    const arr = []; snap.forEach((c) => { arr.push({ k: c.key, ...c.val() }); });
    arr.reverse();
    const fresh = NET.seen ? arr.filter((e) => !NET.seen.has(e.k) && e.pid !== me().id) : [];
    NET.seen = new Set(arr.map((e) => e.k));
    NET.log = arr; if (S) S.log = arr;
    renderSoon();
    // aviso de lo que hizo otro jugador; si robó una carta, se puede abrir desde el aviso
    const e = fresh.find((x) => x.c != null) || fresh[0];
    if (e) toast(`<b>${esc(e.who || '?')}</b> ${esc(e.m)}`, e.c != null ? face(e.c) : null, e.c != null ? () => openCard(e.c) : null, 6000);
  }

  async function connect(code, name, inv) {
    const F = await fb();
    if (NET) netLeave(true);
    NET = { code, F, ver: -1, out: [], players: {}, log: [], seen: null, unsub: [], busy: null, inv };
    lsSet(LS_NET, { code, active: true });
    const m = me(); if (name) { m.name = name; lsSet(LS_ME, m); }
    if (inv) await F.update(nref(`players/${m.id}`), { name: m.name, inv, on: true, t: Date.now() });
    NET.unsub.push(F.onValue(nref('players'), (s) => { if (NET) { NET.players = s.val() || {}; renderSoon(); } }));
    NET.unsub.push(F.onValue(F.query(nref('log'), F.orderByKey(), F.limitToLast(300)), (s) => { if (NET) netLog(s); }));
    NET.unsub.push(F.onValue(nref('game'), (s) => netGame(s.val())));
    const onRef = nref(`players/${m.id}/on`);
    NET.unsub.push(F.onValue(F.ref(F.db, '.info/connected'), (s) => { if (s.val() && NET) { F.onDisconnect(onRef).set(false); F.set(onRef, true); } }));
  }
  // keepLocal: true = sólo cierra la conexión (p. ej. para reconectar); false = sale de la partida compartida
  function netLeave(keepLocal) {
    if (!NET) return;
    for (const u of NET.unsub) { try { u(); } catch { /* ya cerrado */ } }
    try { NET.F.set(nref(`players/${me().id}/on`), false); } catch { /* sin conexión */ }
    const code = NET.code;
    NET = null;
    if (!keepLocal) { lsSet(LS_NET, { code, active: false }); S = lsGet(LS_CUR, null); H = lsGet(LS_HIST, []); }
  }

  async function shareGame() {
    closeModal();
    askPlayer({ title: 'Compartir partida', exps: S.exps, players: {} }, async (name, inv) => {
      try {
        toast('Creando la partida compartida…');
        const F = await fb();
        let code;
        for (let i = 0; i < 8; i++) { code = genCode(); if (!(await F.get(F.ref(F.db, `sessions/${code}/game`))).exists()) break; }
        // el registro de la partida local pasa también a la compartida (en orden, con claves cronológicas)
        const logObj = {};
        for (const e of [...S.log].reverse().slice(-200)) logObj[F.push(F.ref(F.db, `sessions/${code}/log`)).key] = { t: e.t, m: e.m };
        await F.set(F.ref(F.db, `sessions/${code}`), { game: { ver: 1, json: stateJSON() }, log: logObj, meta: { created: Date.now(), ao: S.ao } });
        await connect(code, name, inv);
        netNote(`comparte la partida (${code}) y juega con ${invOf(inv)?.n || '?'}.`);
        sessionModal(true);
      } catch (e) { alertModal('No se pudo compartir la partida', esc(e.message || String(e))); }
    });
  }
  async function joinGame(raw, silent) {
    const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]+-[0-9]{2,4}$/.test(code)) { toast('El código tiene la forma PALABRA-12.'); return; }
    try {
      if (!silent) toast(`Conectando con ${esc(code)}…`);
      const F = await fb();
      const g = await F.get(F.ref(F.db, `sessions/${code}/game`));
      if (!g.exists()) { lsSet(LS_NET, null); if (!silent) alertModal('No existe esa partida', `No se encontró ninguna partida con el código <b>${esc(code)}</b>.`); render(); return; }
      const players = (await F.get(F.ref(F.db, `sessions/${code}/players`))).val() || {};
      const mine = players[me().id];
      if (mine?.inv && mine?.name) { await connect(code); toast(`Conectado a <b>${esc(code)}</b> como ${esc(mine.name)}`); return; }
      const st = JSON.parse(g.val().json);
      askPlayer({ title: `Unirse a ${code}`, exps: st.exps, players }, async (name, inv) => {
        await connect(code, name, inv);
        netNote(`se une a la partida con ${invOf(inv)?.n || '?'}.`);
      });
    } catch (e) { if (!silent) alertModal('No se pudo conectar', esc(e.message || String(e))); }
  }

  // Elegir nombre e investigador (los de la colección primero; los que ya usa otro jugador conectado, bloqueados)
  function askPlayer(opt, cb) {
    let sel = opt.current || null;
    const taken = {};
    for (const [pid, p] of Object.entries(opt.players || {})) if (pid !== me().id && p?.inv && p?.on) taken[p.inv] = p.name;
    const own = INVS.filter((i) => opt.exps.includes(i.x)), other = INVS.filter((i) => !opt.exps.includes(i.x));
    const card = (i) => `<button class="inv ${sel === i.id ? 'on' : ''}" data-inv="${i.id}" ${taken[i.id] ? 'disabled' : ''}>
        <img src="${invImg(i.id)}" alt="" loading="lazy"><b>${esc(i.n)}</b><small>${taken[i.id] ? `lo juega ${esc(taken[i.id])}` : esc(EXP_NAME[i.x] || BIG_EXP[i.x] || '')}</small></button>`;
    const html = () => `<div class="mbox wide"><div class="mhead"><h3>${esc(opt.title)}</h3><button class="iconbtn" data-x>✕</button></div>
      <div class="row"><label for="pname" class="muted">Tu nombre</label><input class="input" id="pname" maxlength="20" value="${esc($('#pname')?.value ?? me().name)}" placeholder="p. ej. Sofía" style="flex:1"></div>
      <h2 class="sec">Tu investigador</h2><div class="invgrid">${own.map(card).join('')}</div>
      ${other.length ? `<details class="panel" style="margin-top:10px" ${other.some((i) => i.id === sel) ? 'open' : ''}><summary>Investigadores de otras expansiones (${other.length})</summary><div class="invgrid" style="margin-top:8px">${other.map(card).join('')}</div></details>` : ''}
      <div class="actions"><button class="btn primary full" data-ok ${sel ? '' : 'disabled'}>${sel ? `Jugar con ${esc(invOf(sel).n)}` : 'Elegí un investigador'}</button></div></div>`;
    openModal(html(), (e) => {
      const b = e.target.closest('[data-inv]');
      if (b) { sel = b.dataset.inv; const nm = $('#pname').value; $('#modal').innerHTML = html(); $('#pname').value = nm; return; }
      if (e.target.closest('[data-ok]')) {
        const name = $('#pname').value.trim();
        if (!name) { toast('Escribí tu nombre.'); $('#pname').focus(); return; }
        if (!sel) return;
        closeModal(); cb(name, sel);
      }
    });
  }

  function sessionChipHTML() {
    const ps = Object.entries(NET.players || {}).filter(([, p]) => p?.name && p?.inv).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
    return `<button class="sess" data-a="session" title="Partida compartida">
      <span class="code">${esc(NET.code)}</span>
      <span class="avs">${ps.map(([pid, p]) => `<img class="${p.on ? 'on' : 'off'} ${pid === me().id ? 'me' : ''}" src="${invImg(p.inv)}" alt="" title="${esc(p.name)} (${esc(invOf(p.inv)?.n || '')})">`).join('')}</span></button>`;
  }
  function sessionModal(fresh) {
    if (!NET) return;
    const link = `${location.origin}${location.pathname}?s=${NET.code}`;
    const ps = Object.entries(NET.players || {}).filter(([, p]) => p?.name).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
    openModal(`<div class="mbox"><div class="mhead"><h3>Partida compartida</h3><button class="iconbtn" data-x>✕</button></div>
      ${fresh ? '<div class="note">¡Listo! Pasales el código o el link a los demás: cada uno entra desde su dispositivo y elige su investigador.</div>' : ''}
      <div class="panel sesscode"><div class="muted">Código</div><b>${esc(NET.code)}</b>
        <div class="row" style="justify-content:center"><button class="btn" data-k="copy">Copiar link</button>${navigator.share ? '<button class="btn" data-k="sharelink">Enviar…</button>' : ''}</div>
        <div class="muted" style="font-size:.8rem;word-break:break-all">${esc(link)}</div></div>
      <h2 class="sec">Jugadores</h2>
      <div class="plist">${ps.map(([pid, p]) => `<div class="pl ${p.on ? '' : 'off'}"><img src="${invImg(p.inv)}" alt=""><div><b>${esc(p.name)}${pid === me().id ? ' (vos)' : ''}</b><small>${esc(invOf(p.inv)?.n || '—')} · ${p.on ? 'conectado' : 'desconectado'}</small></div></div>`).join('') || '<p class="muted">Nadie todavía.</p>'}</div>
      <div class="menu" style="margin-top:12px">
        <button class="btn" data-k="inv">Cambiar mi investigador (si murió)…</button>
        <button class="btn danger" data-k="leave">Salir de la partida compartida</button>
      </div></div>`, async (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'copy') { try { await navigator.clipboard.writeText(link); toast('Link copiado'); } catch { toast('No se pudo copiar: ' + esc(link)); } }
      else if (k === 'sharelink') { try { await navigator.share({ title: 'Eldritch Horror', text: `Partida ${NET.code}`, url: link }); } catch { /* cancelado */ } }
      else if (k === 'inv') {
        const mineP = NET.players[me().id] || {};
        askPlayer({ title: 'Cambiar de investigador', exps: S.exps, players: NET.players, current: null }, async (name, inv) => {
          const old = invOf(mineP.inv)?.n;
          await NET.F.update(nref(`players/${me().id}`), { name, inv, on: true }); NET.inv = inv;
          const m = me(); m.name = name; lsSet(LS_ME, m);
          netNote(`${old ? `deja a ${old} (derrotado) y ` : ''}ahora juega con ${invOf(inv)?.n}.`);
        });
      } else if (k === 'leave') {
        confirmModal('¿Salir de la partida compartida?', 'La partida sigue en la nube para los demás; podés volver a entrar con el código.', () => { netLeave(false); lsSet(LS_NET, null); ui.screen = 'home'; render(); }, 'Salir');
      }
    });
  }

  // ---------- modal / toast ----------
  let modalHandler = null, modalDismiss = null;
  function openModal(html, handler, onDismiss) {
    const m = $('#modal'); m.innerHTML = html; m.hidden = false; m.scrollTop = 0; modalHandler = handler || null; modalDismiss = onDismiss || null;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; modalHandler = null; modalDismiss = null; document.body.style.overflow = ''; }
  function dismissModal() { const f = modalDismiss; closeModal(); if (f) f(); }
  $('#modal').addEventListener('click', (e) => {
    if (e.target.closest('[data-x]') || e.target.id === 'modal') { dismissModal(); return; }
    if (modalHandler) modalHandler(e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) dismissModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && ui.screen === 'game' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); undo(); }
  });
  function alertModal(title, html) {
    openModal(`<div class="mbox"><div class="mhead"><h3>${esc(title)}</h3></div><div class="note warn">${html}</div><div class="actions"><button class="btn primary full" data-x>Entendido</button></div></div>`,
      (e) => { const o = e.target.closest('[data-open]'); if (o && S) openCard(+o.dataset.open); });
  }
  function confirmModal(title, html, onOk, okLabel = 'Confirmar') {
    openModal(`<div class="mbox"><div class="mhead"><h3>${title}</h3></div><p>${html}</p><div class="actions"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>${okLabel}</button></div></div>`,
      (e) => { if (e.target.closest('[data-ok]')) { closeModal(); onOk(); } });
  }
  function viewImage(src, title) { openModal(`<div class="mbox"><div class="mhead"><h3>${esc(title)}</h3><button class="iconbtn" data-x>✕</button></div><img src="${src}" style="width:min(100%,420px);margin:auto;border-radius:10px" alt=""></div>`); }
  let toastT = null;
  // onTap: si se pasa, el aviso se puede tocar (p. ej. «Ver carta» en una partida compartida)
  function toast(html, img, onTap, ms = 3200) {
    const t = $('#toast'); t.innerHTML = `${img ? `<img src="${img}" alt="">` : ''}<span>${html}</span>${onTap ? '<button class="chip">Ver</button>' : ''}`; t.hidden = false;
    t.onclick = onTap ? () => { t.hidden = true; onTap(); } : null;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }

  // arranque: ?s=CODIGO se une a una partida compartida; si había una sesión abierta en este dispositivo, se reconecta
  const cur = lsGet(LS_CUR, null);
  if (cur) { S = cur; H = lsGet(LS_HIST, []); ui.screen = 'game'; }
  applyLayout();
  applyZoom();
  applySize();
  const qs = new URLSearchParams(location.search).get('s');
  const lastNet = lsGet(LS_NET, null);
  if (qs) { history.replaceState(null, '', location.pathname); ui.screen = 'home'; render(); joinGame(qs); }
  else if (lastNet?.code && lastNet.active) { ui.screen = 'home'; render(); joinGame(lastNet.code, true); }
  else render();
})();
