/* Game data reader for NMS Save Tracker.
   Builds the item and recipe data straight from the player's own No Man's Sky files (read-only):
   METADATA/REALITY/TABLES (products, substances, technology, recipes) and the English LANGUAGE tables.
   Table layouts follow MBINCompiler's libMBIN structs (github.com/monkeyman192/MBINCompiler); each table's
   header carries the struct's name hash and GUID, and a table whose layout we don't know is refused, so a
   game update that changes a layout falls back to the data that ships with the app. */
var GameData = (function(){
  'use strict';
  var td = new TextDecoder('utf-8');
  // name hash + GUID (low/high 32 bits) of each table layout this reader knows
  var KNOWN = {
    product:   { nh: 0x06EDC332, g: [0x8DD48E77, 0x54BB18AE], stride: 0x300 },
    recipe:    { nh: 0x0EDC78ED, g: [0xEBABEC26, 0xE9CA2FAD], stride: 0x90 },
    substance: { nh: 0x7A9FBCC1, g: [0x2F227744, 0x131B8465], stride: 0x1A0 },
    tech:      { nh: 0x14FDBFDE, g: [0x2FEEE859, 0x9373B1DC], stride: 0x2E0 },
    proc:      { nh: 0xBEA4D836, g: [0x997212ED, 0x63A7DEF7], stride: 0x290 },
    lang:      { nh: 0xF8DBEB64, g: [0xE17A7B69, 0xDE95E805], stride: 0x130 }
  };

  function Mb(buf){ this.b = buf; this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); }
  Mb.prototype.u32 = function(o){ return this.dv.getUint32(o, true); };
  Mb.prototype.i32 = function(o){ return this.dv.getInt32(o, true); };
  Mb.prototype.f32 = function(o){ return this.dv.getFloat32(o, true); };
  Mb.prototype.u64 = function(o){ return this.dv.getUint32(o, true) + this.dv.getUint32(o + 4, true) * 4294967296; };
  Mb.prototype.str = function(o, n){ var b = this.b, e = o; while(e < o + n && b[e]) e++; return td.decode(b.subarray(o, e)); };
  Mb.prototype.vstr = function(o){ var len = this.u32(o + 8); if(!len) return ''; return this.str(o + this.u64(o), len); };
  Mb.prototype.list = function(o){ return { at: o + this.u64(o), n: this.u32(o + 8) }; };
  Mb.prototype.nameHash = function(){ return this.u32(0x0C); };
  Mb.prototype.guid = function(){ return [this.u32(0x10), this.u32(0x14)]; };
  function check(m, kind, label){
    var k = KNOWN[kind];
    if(m.b.length < 0x30 || m.nameHash() !== k.nh) throw new Error(label + ': not the expected table');
    { var g = m.guid(); if(g[0] !== k.g[0] || g[1] !== k.g[1]) throw new Error(label + ': its layout changed in a game update'); }
  }

  /* ---------- tables ---------- */
  function products(buf, label){
    var m = new Mb(buf); check(m, 'product', label); var L = m.list(0x20), out = [];
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x300;
      out.push({ id: m.str(o + 0x150, 0x10), name: m.str(o + 0x1F0, 0x80), nameL: m.str(o + 0x270, 0x80), sub: m.vstr(o + 0x170), desc: m.vstr(o + 0x120),
        icon: m.vstr(o + 0xC8), value: m.i32(o + 0x194), type: m.u32(o + 0x1E8), food: m.u32(o + 0x1BC), cat: m.u32(o + 0x198), corv: m.u32(o + 0x1A4), legal: m.u32(o + 0x1C8),
        req: reqs(m, o + 0x160), deploys: m.str(o + 0x110, 0x10), shipTech: m.str(o + 0x100, 0x10), techbox: !!m.b[o + 0x2F6], craftable: !!m.b[o + 0x2F5],
        colour: colour(m, o) }); }
    return out;
  }
  function substances(buf, label){
    var m = new Mb(buf); check(m, 'substance', label); var L = m.list(0x30), out = [];
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x1A0;
      out.push({ id: m.str(o + 0xC8, 0x10), name: m.str(o + 0x134, 0x20), nameL: m.str(o + 0x154, 0x20), sym: m.str(o + 0x174, 0x20), sub: m.vstr(o + 0xD8), desc: m.vstr(o + 0xB8),
        icon: m.vstr(o + 0xA0), value: m.i32(o + 0x10C), cat: m.u32(o + 0x110), colour: colour(m, o) }); }
    return out;
  }
  function techs(buf, label){
    var m = new Mb(buf); check(m, 'tech', label); var L = m.list(0x20), out = [];
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x2E0;
      out.push({ id: m.str(o + 0x108, 0x10), name: m.str(o + 0x1C4, 0x80), nameL: m.str(o + 0x244, 0x80), sub: m.vstr(o + 0x168), desc: m.vstr(o + 0xF8),
        icon: m.vstr(o + 0xB0), value: m.i32(o + 0x190), cat: m.u32(o + 0x194), req: reqs(m, o + 0x138), upgrade: !!m.b[o + 0x2CF], core: !!m.b[o + 0x2C7],
        procedural: !!m.b[o + 0x2CC], template: !!m.b[o + 0x2C9], colour: colour(m, o) }); }
    return out;
  }
  function recipes(buf, label){
    var m = new Mb(buf); check(m, 'recipe', label); var L = m.list(0x20), out = [];
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x90, ing = m.list(o + 0x78), list = [];
      for(var j = 0; j < ing.n; j++){ var e = ing.at + j * 0x18; list.push([m.str(e, 0x10), m.i32(e + 0x10)]); }
      out.push({ id: m.str(o, 0x20), name: m.str(o + 0x20, 0x20), out: [m.str(o + 0x60, 0x10), m.i32(o + 0x70)], ing: list, time: m.f32(o + 0x88), cook: !!m.b[o + 0x8C] }); }
    return out;
  }
  function procs(buf, label){
    var m = new Mb(buf); check(m, 'proc', label); var L = m.list(0x20), out = [];
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x290;
      // StatLevels (GcProceduralTechnologyStatLevel 0x14: Stat 0x00, ValueMax 0x04, ValueMin 0x08, AlwaysChoose 0x10); NumStatsMax 0x74, NumStatsMin 0x78
      var SL = m.list(o + 0x50), st = []; for(var j = 0; j < SL.n; j++){ var e = SL.at + j * 0x14; st.push([m.u32(e), m.f32(e + 8), m.f32(e + 4), m.b[e + 0x10] ? 1 : 0]); }
      out.push({ id: m.str(o + 0x40, 0x10), tpl: m.str(o + 0x60, 0x10), name: m.str(o + 0x104, 0x80), nameL: m.str(o + 0x184, 0x80), sub: m.str(o + 0x204, 0x80), quality: m.u32(o + 0x7C), colour: colour(m, o),
        stats: st, nmin: m.i32(o + 0x78), nmax: m.i32(o + 0x74) }); }
    return out;
  }
  // TkLocalisationEntry 0x130: Id 0x00, then one text per language (each language's files fill only their own)
  var LOFF = { brazilianportuguese: 0x20, dutch: 0x30, english: 0x40, french: 0x50, german: 0x60, italian: 0x70, japanese: 0x80, korean: 0x90, latinamericanspanish: 0xA0,
    polish: 0xB0, portuguese: 0xC0, russian: 0xD0, simplifiedchinese: 0xE0, spanish: 0xF0, tencentchinese: 0x100, traditionalchinese: 0x110, usenglish: 0x120 };
  function lang(buf, label, into, which){
    var m = new Mb(buf); check(m, 'lang', label); var L = m.list(0x20), off = LOFF[which] || LOFF[(/_([a-z]+)\.mbin$/.exec(label) || [])[1]] || 0x40;
    for(var i = 0; i < L.n; i++){ var o = L.at + i * 0x130, id = m.str(o, 0x20); if(!id || into.has(id)) continue; var t = m.vstr(o + off); if(t) into.set(id, t); }
    return into;
  }
  function reqs(m, at){ var L = m.list(at), out = []; for(var j = 0; j < L.n; j++){ var e = L.at + j * 0x18; out.push([m.str(e, 0x10), m.i32(e + 0x10)]); } return out; }
  function colour(m, o){ var c = [m.f32(o), m.f32(o + 4), m.f32(o + 8)].map(function(v){ v = Math.round(Math.max(0, Math.min(1, v)) * 255); return (v < 16 ? '0' : '') + v.toString(16).toUpperCase(); }); return c.join(''); }

  /* ---------- the app's data bundle (same shape as data/game.bundle.json) ---------- */
  var PCAT = ['Component', 'Food', 'Trade good', 'Curiosity', 'Base part', 'Other', 'Other', 'Other', 'Other', 'Fish', 'Curiosity', 'Curiosity'];
  var PKIND = ['p', 'f', 't', 'c', 'b', 'o', 'o', 'o', 'e', 'h', 'c', 'c'];
  var VEHICLE = { 8:1, 9:1, 10:1, 11:1, 12:1 };
  function pretty(id){ return String(id).replace(/^R_NAME_/, 'R ').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, function(c){ return c.toUpperCase(); }); }
  function tidy(s){ return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
  function build(T, version){
    var L = T.lang, tr = function(k){ return k ? tidy(L.get(k) || '') : ''; };
    var rows = [], seen = new Map();
    function add(id, r){ if(!id || seen.has(id)) return; if(!r.n) r.n = pretty(id); seen.set(id, rows.length); rows.push(r); r.id = id; }
    var cooked = new Set(); T.recipes.forEach(function(r){ if(r.cook){ cooked.add(r.out[0]); r.ing.forEach(function(x){ cooked.add(x[0]); }); } });
    T.substances.forEach(function(s){ add(s.id, { subKey: s.sub, nameKey: s.nameL || s.name, n: tr(s.nameL) || tr(s.name), g: tr(s.sub), v: s.value, c: 'Raw', d: tr(s.desc), k: 'r', col: s.colour, sym: tr(s.sym) || s.sym, ip: s.icon, t: 'S' }); });
    function prod(p, table){
      var c = 'Other', k = 'o', sub = p.sub || '';
      if(p.corv || (table === 'bp' && (/^B_/.test(p.id) || /^BLD_BIG_/.test(sub)))){ c = 'Corvette'; k = 'v'; }
      else if(table === 'bp' && /^BLD_(UTILITY|STORAGE|SILO)_?SUB/.test(sub)){ c = 'Constructed tech'; k = 'k'; }
      else if(table === 'bp' && sub === 'UI_PLANT_SUBTITLE'){ c = 'Component'; k = 'p'; }
      else if(table === 'bp'){ c = 'Base part'; k = 'b'; }
      else if(table === 'cu'){ c = p.type === 7 ? 'Starship' : PCAT[p.type] || 'Other'; k = p.type === 7 ? 's' : PKIND[p.type] || 'o'; }
      else if(p.type === 1){ if(p.deploys){ c = 'Upgrade'; k = 'u'; } else if(cooked.has(p.id) || /^FOOD_/.test(p.id)){ c = 'Food'; k = 'f'; } else { c = 'Component'; k = 'p'; } }
      else if(p.type === 3 && /SHIP/.test(sub)){ c = 'Starship'; k = 's'; }
      else if(p.type === 4){ if(/FIREWORK_PACK/.test(sub)){ c = 'Other'; k = 'o'; } else { c = 'Base part'; k = 'b'; } }
      else { c = PCAT[p.type] || 'Other'; k = PKIND[p.type] || 'o'; }
      add(p.id, { subKey: p.sub, nameKey: p.nameL || p.name, n: tr(p.nameL) || tr(p.name), g: tr(p.sub), v: p.value, c: c, d: tr(p.desc), k: k, col: p.colour, ip: p.icon, req: p.req, t: 'P', fx: p.food || 0, tb: table === 'bp' ? 'b' : table === 'cu' ? 'c' : '' });
    }
    T.products.forEach(function(p){ prod(p, 'p'); });
    (T.baseparts || []).forEach(function(p){ prod(p, 'bp'); });
    (T.custom || []).forEach(function(p){ prod(p, 'cu'); });
    T.techs.forEach(function(t){ if(t.template) return;
      var c = t.upgrade ? 'Upgrade' : VEHICLE[t.cat] ? 'Exocraft' : 'Technology', k = t.upgrade ? 'u' : 'x';
      add(t.id, { n: tr(t.nameL) || tr(t.name), g: tr(t.sub), v: t.value, c: c, d: tr(t.desc), k: k, col: t.colour, ip: t.icon, req: t.req, t: 'T' }); });
    // procedural upgrade modules (UP_*): named after the technology they upgrade, like the game does
    var tby = new Map(T.techs.map(function(t){ return [t.id, t]; }));
    var ps = {}, sn = {}, SN = T.statNames || [];
    (T.proc || []).forEach(function(u){ if(u.stats && u.stats.length){ ps[u.id] = [u.nmin, u.nmax, u.stats.map(function(x){ return [x[0], Math.round(x[1] * 1e4) / 1e4, Math.round(x[2] * 1e4) / 1e4, x[3]]; }), u.tpl, u.quality];
        u.stats.forEach(function(x){ var k = SN[x[0]]; if(k && !sn[x[0]]) sn[x[0]] = tr(k.toUpperCase()) || k.replace(/_/g, ' '); }); } });
    (T.proc || []).forEach(function(u){ var tp = tby.get(u.tpl) || tby.get(u.tpl.replace(/^T_/, '')) || {};
      var tn = tr(u.nameL) || tr(u.name) || tr(tp.nameL) || tr(tp.name) || pretty(u.tpl), sub = tr(u.sub);
      var cls = (/([SABCX])-Class/.exec(sub) || [])[1] || ['C', 'B', 'A', 'S', 'X'][u.quality] || '';
      add(u.id, { n: tn + (cls ? ' ' + cls + '-Class' : '') + ' Upgrade', g: (sub.replace(/%NAME%/i, tn).replace(/\s+/g, ' ').trim() || 'Upgrade'), v: 0, c: 'Upgrade', d: tr(tp.desc), k: 'u', col: u.colour, ip: tp.icon, t: 'T' }); });
    // recipes: refiner / cooking from the recipe table, crafting from each item's requirements
    var used = new Set(), refine = [], cook = [], craft = [];
    var idx = function(id){ used.add(id); return id; };
    T.recipes.forEach(function(r){ if(!seen.has(r.out[0]) || r.ing.some(function(x){ return !seen.has(x[0]); })) return;
      var e = [r.ing.map(function(x){ return [idx(x[0]), x[1]]; }), [idx(r.out[0]), r.out[1]], tr(r.name) || pretty(r.name)];
      (r.cook ? cook : refine).push(e); });
    rows.forEach(function(r){ if(!r.req || !r.req.length || r.req.some(function(x){ return !seen.has(x[0]); })) return;
      craft.push([idx(r.id), 1, r.req.map(function(x){ return [idx(x[0]), x[1]]; }), r.c]); });
    // items used in recipes get an index; everything else goes in xi by id
    var items = [], ix = {}, xi = {}, ic = {}, ip = {}, ty = {}, fx = {}, hint = {}, tb = {};
    // things no recipe makes keep their description too (it often says where they come from), plus the game's own "how to get it" hint
    var made = new Set(); refine.concat(cook).forEach(function(e){ made.add(e[1][0]); }); craft.forEach(function(e){ made.add(e[0]); });
    // raw cooking ingredients (used by cooking, made by none of it) keep their description: it says where they come from
    var cookOut = new Set(cook.map(function(e){ return e[1][0]; })), cookRaw = new Set(); cook.forEach(function(e){ e[0].forEach(function(x){ if(!cookOut.has(x[0])) cookRaw.add(x[0]); }); });
    rows.forEach(function(r){
      var keepD = r.d && (r.c === 'Raw' || cookRaw.has(r.id) || (!made.has(r.id) && /^(Raw|Component|Curiosity|Trade good|Fish|Food)$/.test(r.c)));
      if(used.has(r.id)){ ix[r.id] = items.length; var it = { n: r.n, g: r.g, v: r.v, c: r.c }; if(keepD) it.d = r.d; items.push(it); }
      else { xi[r.id] = [r.n, r.g, r.v, r.c]; if(keepD) xi[r.id].push(r.d); }
      var h = tr('UI_PIN_' + r.id + '_OBJ_TIP'); if(h) hint[r.id] = h;
      if(r.fx && r.c === 'Food') fx[r.id] = r.fx; // GcStatsTypes value of the food's bonus
      if(r.tb) tb[r.id] = r.tb; // 'b' = a base building part, 'c' = a customiser part: built or applied, not carried
      if(r.t === 'T') ty[r.id] = 1; // installed as Technology (everything else: Substance if kind 'r', else Product)
      var e = [r.k, r.col]; if(r.sym && r.sym.length <= 5) e.push(r.sym); ic[r.id] = e;
      if(r.ip){ var pth = r.ip.toLowerCase(); ip[r.id] = /^textures\/ui\/frontend\/icons\//.test(pth) ? pth.slice(27) : '/' + pth; }
    });
    // Things that can't sit in an inventory slot (decided on the English text, so it works in every language): the game's
    // reward tokens, half-named templates, customiser parts (except class reactors), colour options, decals and building pieces
    var LE = T.langEn || L, en = function(k){ return k ? tidy(LE.get(k) || '') : ''; }, nc = {};
    var BUILD_ONLY = /Construction (Component|module|item)|Base Module|Freighter (Module|Interior Module)|Aquatic Construction Module|Wall Access Route|Worker Terminal|Expedition Management Terminal|Agricultural Module|Planetary Probe/i;
    rows.forEach(function(r){ var g = en(r.subKey), n = en(r.nameKey) || r.n;
      if(g === 'Reward Item' || /%NAME%/.test(n) || /^(U_TECHBOX_|U_TECHPACK_|BONE_TEMP$)/.test(r.id) || (r.tb === 'c' && !/^SHIP_CORE_/.test(r.id)) ||
        (r.tb === 'b' && !/^(B_|BUILD)/.test(r.id) && (BUILD_ONLY.test(g) || !g)) || /Customisation Option/i.test(g) || / Decal$/.test(n)) nc[r.id] = 1; });
    var I = function(id){ return ix[id]; };
    var fix = function(list){ return list.map(function(x){ return [I(x[0]), x[1]]; }); };
    return { items: items, refine: refine.map(function(e){ return [fix(e[0]), [I(e[1][0]), e[1][1]], e[2]]; }),
      cook: cook.map(function(e){ return [fix(e[0]), [I(e[1][0]), e[1][1]], e[2]]; }),
      craft: craft.map(function(e){ return [I(e[0]), e[1], fix(e[2]), e[3]]; }),
      version: version || 'game', ix: ix, xi: xi, ic: ic, ip: ip, ty: ty, fx: fx, hint: hint, tb: tb, ps: ps, sn: sn, nc: nc, src: 'game' };
  }

  var FILES = {
    products: 'metadata/reality/tables/nms_reality_gcproducttable.mbin',
    baseparts: 'metadata/reality/tables/nms_basepartproducts.mbin',
    custom: 'metadata/reality/tables/nms_modularcustomisationproducts.mbin',
    substances: 'metadata/reality/tables/nms_reality_gcsubstancetable.mbin',
    techs: 'metadata/reality/tables/nms_reality_gctechnologytable.mbin',
    recipes: 'metadata/reality/tables/nms_reality_gcrecipetable.mbin',
    proc: 'metadata/reality/tables/nms_reality_gcproceduraltechnologytable.mbin'
  };
  var LANGS = ['english', 'usenglish', 'french', 'german', 'italian', 'spanish', 'latinamericanspanish', 'portuguese', 'brazilianportuguese', 'dutch', 'polish', 'russian', 'japanese', 'korean', 'simplifiedchinese', 'traditionalchinese'];
  function langFiles(l){ return ['nms_loc1', 'nms_loc4', 'nms_loc5', 'nms_loc6', 'nms_loc7', 'nms_loc8', 'nms_loc9', 'nms_loc10', 'nms_update3'].map(function(n){ return 'language/' + n + '_' + l + '.mbin'; }); }
  var LANG = langFiles('english');
  // get(path) → Uint8Array of that file from whichever pack has it (or null)
  // lang: one of LANGS; item text comes from that language, anything it lacks falls back to English
  async function fromGame(get, version, statNames, language){
    var T = { lang: new Map(), statNames: statNames || [] }; var lg = LANGS.indexOf(language) > 0 ? language : 'english';
    T.products = products(await need(get, FILES.products), 'products');
    T.substances = substances(await need(get, FILES.substances), 'substances');
    T.techs = techs(await need(get, FILES.techs), 'technology');
    T.recipes = recipes(await need(get, FILES.recipes), 'recipes');
    var bp = await get(FILES.baseparts); if(bp) T.baseparts = products(bp, 'base parts');
    var cu = await get(FILES.custom); if(cu) T.custom = products(cu, 'customisation');
    var pt = await get(FILES.proc); if(pt) T.proc = procs(pt, 'upgrades');
    var LF = lg === 'english' ? LANG : langFiles(lg).concat(LANG);
    for(var i = 0; i < LF.length; i++){ var b = await get(LF[i]); if(b) lang(b, LF[i], T.lang); }
    if(lg !== 'english'){ T.langEn = new Map(); for(var k = 0; k < LANG.length; k++){ var b2 = await get(LANG[k]); if(b2) lang(b2, LANG[k], T.langEn); } } // for rules that go by the English text
    if(T.lang.size < 1000) throw new Error('the English text tables were not found');
    return build(T, version);
  }
  async function need(get, p){ var b = await get(p); if(!b) throw new Error(p.split('/').pop() + ' not found'); return b; }
  return { fromGame: fromGame, FILES: FILES, LANG: LANG, LANGS: LANGS, _t: { procs: procs, products: products, substances: substances, techs: techs, recipes: recipes, lang: lang, build: build } };
})();
if(typeof module !== 'undefined') module.exports = GameData;
