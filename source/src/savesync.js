/* NMS Save Tracker: reads a No Man's Sky save (save*.hg) and builds the galaxy map
   and inventory data. Read-only: it never writes to the save.
   Works in the browser (desktop app) and in Node (for testing). */
const SaveSync = (() => {
  const MAGIC = 0xFEEDA1E5;
  const BIOME = ['Lush','Toxic','Scorched','Radioactive','Frozen','Barren','Dead','Exotic','Red chromatic','Green chromatic','Blue chromatic','Test','Swamp','Lava','Waterworld','Gas giant','All'];

  function lz4Block(src, s, e, dst, o){
    let i = s;
    while(i < e){
      const tok = src[i++];
      let lit = tok >> 4;
      if(lit === 15){ let b; do { b = src[i++]; lit += b; } while(b === 255); }
      for(let k=0; k<lit; k++) dst[o++] = src[i++];
      if(i >= e) break;
      const off = src[i] | (src[i+1] << 8); i += 2;
      let ml = tok & 15;
      if(ml === 15){ let b; do { b = src[i++]; ml += b; } while(b === 255); }
      ml += 4;
      let m = o - off;
      for(let k=0; k<ml; k++) dst[o++] = dst[m++];
    }
    return o;
  }

  // Returns the save's JSON text.
  function decompress(buf){
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if(u8.length < 16 || dv.getUint32(0, true) !== MAGIC){
      return new TextDecoder('utf-8').decode(u8).replace(/\0+$/,'');
    }
    let total = 0, p = 0;
    while(p + 16 <= u8.length){ const cs = dv.getUint32(p+4, true), us = dv.getUint32(p+8, true); total += us; p += 16 + cs; }
    const out = new Uint8Array(total);
    let o = 0; p = 0;
    while(p + 16 <= u8.length){
      if(dv.getUint32(p, true) !== MAGIC) throw new Error('Unexpected data in save file');
      const cs = dv.getUint32(p+4, true), us = dv.getUint32(p+8, true);
      const wrote = lz4Block(u8, p+16, p+16+cs, out, o);
      if(wrote - o !== us) throw new Error('Save chunk did not unpack cleanly');
      o = wrote; p += 16 + cs;
    }
    let end = o; while(end > 0 && out[end-1] === 0) end--;
    return new TextDecoder('utf-8').decode(out.subarray(0, end));
  }

  function deob(x, map){
    if(Array.isArray(x)) return x.map(v => deob(v, map));
    if(x && typeof x === 'object'){ const r = {}; for(const k in x) r[map[k] || k] = deob(x[k], map); return r; }
    return x;
  }

  const sg = (v, b) => v >= (1 << (b-1)) ? v - (1 << b) : v;
  function toBig(v){ return typeof v === 'string' ? BigInt(v) : BigInt(Math.round(v)); }
  // Discovery / base addresses: planet(4) system(12) galaxy(8) Y(8) Z(12) X(12)
  function decDisc(v){
    const n = toBig(v);
    const f = (sh, bits) => Number((n >> BigInt(sh)) & ((1n << BigInt(bits)) - 1n));
    return { x: sg(f(0,12),12), z: sg(f(12,12),12), y: sg(f(24,8),8), g: f(32,8), s: f(40,12), p: f(52,4) };
  }
  // VisitedSystems entries: system(12) Z(12) Y(8) X(12). They don't say which galaxy.
  function decVis(v){
    const n = toBig(v);
    const f = (sh, bits) => Number((n >> BigInt(sh)) & ((1n << BigInt(bits)) - 1n));
    return { x: sg(f(0,12),12), y: sg(f(12,8),8), z: sg(f(20,12),12), s: f(32,12), g: null, p: 0 };
  }
  const fromUA = ua => { const ga = ua.GalacticAddress || {}; return { x: ga.VoxelX, y: ga.VoxelY, z: ga.VoxelZ, s: ga.SolarSystemIndex, p: ga.PlanetIndex, g: ua.RealityIndex || 0 }; };
  const pos = a => `${a.x},${a.y},${a.z},${a.s}`;
  const key = a => `${a.g||0}:${pos(a)}`;

  /* ---------- inventories ---------- */
  function cleanId(id){ const c = String(id == null ? '' : id).replace(/^\^/, '').replace(/#.*$/, ''); return /[^\x20-\x7e]/.test(c) ? '?' : c; }
  function readInv(inv){
    const out = [];
    ((inv && inv.Slots) || []).forEach(s => {
      const t = ((s.Type || {}).InventoryType) || '';
      if(t !== 'Product' && t !== 'Substance') return;
      const id = cleanId(s.Id); if(!id) return;
      const a = s.Amount | 0; if(a <= 0) return;
      const ix = s.Index || {}; out.push([id, a, s.MaxAmount | 0, t === 'Substance' ? 1 : 0, ix.X | 0, ix.Y | 0]);
    });
    return out;
  }
  // Grid shape from the slots the inventory has unlocked: columns, rows, and which cells exist (y*cols+x).
  function shape(inv){
    const v = (inv && inv.ValidSlotIndices) || []; if(!v.length) return {};
    let w = 1, h = 1; v.forEach(p => { w = Math.max(w, (p.X|0)+1); h = Math.max(h, (p.Y|0)+1); });
    return { w, h, vs: v.map(p => (p.Y|0)*w + (p.X|0)) };
  }
  const cls = inv => (((inv || {}).Class || {}).InventoryClass) || '';
  function inventories(ps){
    const R = { exo:[], ships:[], corv:[], freighter:[], base:[], exocraft:[] };
    const add = (grp, name, inv, extra) => { const it = readInv(inv); R[grp].push(Object.assign({ n:name, it, slots: ((inv && inv.ValidSlotIndices) || []).length }, shape(inv), extra || {})); };
    add('exo', 'Exosuit', ps.Inventory);
    const cargo = readInv(ps.Inventory_Cargo); if(cargo.length) R.exo.push({ n:'Exosuit cargo', it:cargo });
    const prim = ps.PrimaryShip;
    (ps.ShipOwnership || []).forEach((sh, i) => {
      const file = ((sh.Resource || {}).Filename) || '';
      if(!sh.Name && !file) return;
      const kind = /BIGGS/i.test(file) ? 'Corvette' : /SENTINELSHIP/i.test(file) ? 'Sentinel' : /BIOSHIP/i.test(file) ? 'Living ship' : /FIGHTER/i.test(file) ? 'Fighter' : /DROPSHIP/i.test(file) ? 'Hauler' : /SHUTTLE/i.test(file) ? 'Shuttle' : /SCIENTIFIC|S-CLASS|EXPLORER/i.test(file) ? 'Explorer' : /SAILSHIP/i.test(file) ? 'Solar' : /ROYAL/i.test(file) ? 'Exotic' : 'Starship';
      const it = readInv(sh.Inventory).concat(readInv(sh.Inventory_Cargo));
      const title = kind === 'Starship' ? 'Starship' : kind.replace(/\b\w/g, c => c.toUpperCase()) + ' Ship';
      const entry = Object.assign({ n: sh.Name || title, kind, cls: cls(sh.Inventory), prim: i === prim ? 1 : 0, it, slots: ((sh.Inventory && sh.Inventory.ValidSlotIndices) || []).length }, sh.Name ? {} : { un:1 }, shape(sh.Inventory));
      (kind === 'Corvette' ? R.corv : R.ships).push(entry);
    });
    if(ps.CorvetteStorageInventory) add('corv', 'Corvette storage units', ps.CorvetteStorageInventory, { store:1 });
    if(ps.FreighterInventory){ add('freighter', 'Freighter', ps.FreighterInventory); const fc = readInv(ps.FreighterInventory_Cargo); if(fc.length) R.freighter.push({ n:'Freighter cargo', it:fc }); }
    for(let i=1; i<=10; i++){
      const inv = ps['Chest' + i + 'Inventory']; if(!inv) continue;
      const nm = inv.Name && !/^BLD_|^UI_/.test(inv.Name) ? inv.Name : `Storage Container ${i-1}`;
      add('base', nm, inv);
    }
    [['ChestMagicInventory','Special storage'],['ChestMagic2Inventory','Special storage 2'],['CookingIngredientsInventory','Cooking ingredients'],['FishPlatformInventory','Fishing platform'],['FishBaitBoxInventory','Bait box'],['FoodUnitInventory','Food unit']].forEach(([k, n]) => {
      const it = readInv(ps[k]); if(it.length) R.base.push(Object.assign({ n, it }, shape(ps[k])));
    });
    (ps.VehicleOwnership || []).forEach((v, i) => { const it = readInv(v.Inventory); if(it.length) R.exocraft.push(Object.assign({ n: v.Name || `Exocraft ${i+1}`, it }, v.Name ? {} : { un:1 }, shape(v.Inventory))); });
    return R;
  }

  function build(save){
    const ps = save.BaseContext && save.BaseContext.PlayerStateData;
    if(!ps) throw new Error('This file does not look like a No Man\'s Sky save');
    const disc = (save.DiscoveryManagerData || {})['DiscoveryData-v1'] || {};
    const uid = (((save.CommonStateData||{}).UsedDiscoveryOwnersV2||[])[0]||{}).UID || guessUid(ps, disc);
    const cur = fromUA(ps.UniverseAddress || {});
    const S = new Map();
    const galsAt = new Map(); // position -> set of galaxies seen there in records
    const note = a => { const k = pos(a); if(!galsAt.has(k)) galsAt.set(k, new Set()); galsAt.get(k).add(a.g||0); };
    const get = a => { const k = key(a); if(!S.has(k)){ const e = { x:a.x, y:a.y, z:a.z, s:a.s, v:0 }; if(a.g) e.g = a.g; S.set(k, e); note(a); } return S.get(k); };

    // Records first, so visited systems can be matched to a galaxy.
    const recs = ((disc.Store||{}).Record || []).map(r => [r, false]).concat((disc.Available || []).map(r => [r, true]));
    const decoded = [];
    for(const [r, pending] of recs){ const dd = r.DD || {}; if(!dd.UA) continue; const a = decDisc(dd.UA); decoded.push([r, pending, a]); note(a); }
    const bases = [];
    (ps.PersistentPlayerBases || []).forEach(b => { const bt = (b.BaseType||{}).PersistentBaseTypes; if(bt === 'PlayerShipBase') return; const a = decDisc(b.GalacticAddress); bases.push([b, bt, a]); note(a); });
    const teles = [];
    (ps.TeleportEndpoints || []).forEach(t => { const a = fromUA(t.UniverseAddress || {}); if(a.x === undefined) return; teles.push([t, a]); note(a); });

    // Visited systems: take the galaxy from a matching record; otherwise from the
    // nearest visit in time that has one (you stay in a galaxy between jumps).
    const vis = (ps.VisitedSystems || []).map(decVis);
    vis.forEach(a => { const s = galsAt.get(pos(a)); if(s && s.size === 1) a.g = [...s][0]; });
    let last = null; vis.forEach(a => { if(a.g !== null) last = a.g; else if(last !== null) a.g = -1 - last; });
    let next = null; for(let i=vis.length-1; i>=0; i--){ const a = vis[i]; if(a.g !== null && a.g >= 0) next = a.g; else if(a.g === null) a.g = next !== null ? next : cur.g; }
    vis.forEach(a => { if(a.g < 0) a.g = -1 - a.g; });
    const order = [];
    vis.forEach(a => { get(a).v = 1; order.push(key(a)); });

    for(const [r, pending, a] of decoded){
      const dd = r.DD || {}; const t = dd.DT;
      const ows = r.OWS || {}; const mine = pending || (uid && ows.UID === uid);
      const by = mine ? 'you' : (ows.USN || '');
      const cn = ((r.DM||{}).CN) || '';
      if(!S.has(key(a)) && !mine) continue;
      const e = get(a);
      const planet = () => { e.P = e.P || {}; return e.P[a.p] = e.P[a.p] || {}; };
      if(t === 'SolarSystem'){ if(cn) e.n = cn; e.by = by; }
      else if(t === 'Planet'){ const pl = planet(); if(cn) pl.n = cn; pl.by = by; const vp = dd.VP || []; if(typeof vp[1] === 'number' && BIOME[vp[1]]) pl.bio = BIOME[vp[1]]; }
      else if(t === 'Animal' || t === 'Flora' || t === 'Mineral'){ const pl = planet(); const c = t==='Animal'?'fa':t==='Flora'?'fl':'mi'; const d = pl[c] = pl[c] || [0,0,[]]; d[0]++; if(mine) d[1]++; if(cn && d[2].length < 40) d[2].push([cn, by]); }
      else if(t === 'Sector'){ const pl = planet(); pl.wp = (pl.wp||0) + 1; }
    }
    const btype = { HomePlanetBase:'Base', FreighterBase:'Freighter', PlayerSpaceStationBase:'Station' };
    bases.forEach(([b, bt, a]) => { const e = get(a); (e.b = e.b || []).push([b.Name || (bt==='FreighterBase'?'Freighter':bt), btype[bt] || bt, a.p]); });
    teles.forEach(([t, a]) => {
      const e = get(a);
      (e.t = e.t || []).push([t.Name, t.TeleporterType, a.p]);
      if(t.TeleporterType === 'Spacestation' && !e.n){ const m = /^(.*?)\s+Station(\s+\S+)?$/.exec(t.Name||''); if(m && m[1]) e.dn = m[1]; }
    });
    const sys = [...S.values()];
    sys.forEach(e => ['b','t'].forEach(k => { if(e[k]){ const seen = new Set(); e[k] = e[k].filter(x => { const s = JSON.stringify(x); if(seen.has(s)) return false; seen.add(s); return true; }); } }));
    const idx = new Map(sys.map((e,i) => [key(e), i]));
    const path = []; order.forEach(k => { const i = idx.get(k); if(path[path.length-1] !== i) path.push(i); });
    const u = x => (typeof x === 'number' && x < 0) ? x + 4294967296 : x;
    const stats = { units: u(ps.Units), nanites: u(ps.Nanites), quicksilver: u(ps.Specials), summary: ps.SaveSummary || '' };
    let inv = null; try { inv = inventories(ps); } catch(e) { inv = null; }
    // Quest steps for goal tracking: [missionId, step]; plus the quest being tracked.
    const ms = {}; (ps.MissionProgress || []).forEach(m => { const id = cleanId(m.Mission); if(id && id !== '?') ms[id] = Math.max(ms[id] === undefined ? -2 : ms[id], m.Progress|0); });
    stats.mission = cleanId(ps.CurrentMissionID || '');
    return { v:4, sys, cur, path, snap: new Date().toISOString().slice(0,10), stats, inv, ms };
  }

  function guessUid(ps, disc){
    // most common owner among the player's own bases
    const c = {}; (ps.PersistentPlayerBases||[]).forEach(b => { const id = (b.Owner||{}).UID; if(id) c[id] = (c[id]||0) + 1; });
    let best = null, n = 0; for(const k in c) if(c[k] > n){ n = c[k]; best = k; }
    return best;
  }

  function parse(buf, mapping){
    const text = decompress(buf);
    const raw = JSON.parse(text);
    const save = deob(raw, mapping);
    return build(save);
  }
  return { decompress, deob, build, parse, inventories };
})();
if(typeof module !== 'undefined') module.exports = SaveSync;
