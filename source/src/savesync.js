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
  /* ---------- collection: ships, multi-tools, exocraft, frigates, expeditions, companions ---------- */
  function collection(ps, uid){
    const slots = inv => ((inv && inv.ValidSlotIndices) || []).length;
    const sc = inv => ((inv && inv.SpecialSlots) || []).length;
    const stats = inv => ((inv && inv.BaseStatValues) || []).map(s => [cleanId(s.BaseStatID), typeof s.Value === 'number' ? s.Value : 0]).filter(s => s[0]);
    const tech = inv => ((inv && inv.Slots) || []).filter(s => ((s.Type || {}).InventoryType) === 'Technology').map(s => cleanId(s.Id)).filter(x => x && x !== '?');
    const str = v => (typeof v === 'string' ? v : '');
    const file = o => str(((o || {}).Resource || {}).Filename);
    const C = { ships: [], tools: [], veh: [], frig: [], exp: [], pets: [], settle: [], fr: null };
    const seed = v => (Array.isArray(v) && typeof v[1] === 'string' && v[1] !== '0x0') ? v[1] : '';
    (ps.ShipOwnership || []).forEach((sh, i) => { const f = file(sh); if(!sh.Name && !f) return;
      C.ships.push({ i, n: str(sh.Name), f, sd: seed((sh.Resource || {}).Seed), cls: cls(sh.Inventory), prim: i === ps.PrimaryShip ? 1 : 0, gen: slots(sh.Inventory), tech: slots(sh.Inventory_TechOnly), cargo: slots(sh.Inventory_Cargo), sc: sc(sh.Inventory_TechOnly) + sc(sh.Inventory), st: stats(sh.Inventory), t: tech(sh.Inventory_TechOnly).concat(tech(sh.Inventory)) }); });
    (ps.Multitools || []).forEach((m, i) => { const st = m.Store || {}; const f = file(m); if(!f && !slots(st)) return;
      C.tools.push({ i, n: str(m.Name), f, sd: seed(m.Seed), cls: cls(st), act: i === ps.ActiveMultioolIndex ? 1 : 0, gen: slots(st), sc: sc(st), st: stats(st), t: tech(st) }); });
    (ps.VehicleOwnership || []).forEach((v, i) => { const t2 = tech(v.Inventory_TechOnly).concat(tech(v.Inventory)); if(!t2.length && !slots(v.Inventory)) return;
      C.veh.push({ i, n: str(v.Name), prim: i === ps.PrimaryVehicle ? 1 : 0, gen: slots(v.Inventory), tech: slots(v.Inventory_TechOnly), t: t2, st: stats(v.Inventory) }); });
    (ps.FleetFrigates || []).forEach((f, i) => C.frig.push({ i, n: str(f.CustomName), cls: ((f.FrigateClass || {}).FrigateClass) || '', race: ((f.Race || {}).AlienRace) || '', grade: cls({ Class: f.InventoryClass }),
      tr: (f.TraitIDs || []).map(cleanId).filter(x => x && x !== '?'), st: (f.Stats || []).slice(0, 11), ex: f.TotalNumberOfExpeditions | 0, ok: f.TotalNumberOfSuccessfulEvents | 0, bad: f.TotalNumberOfFailedEvents | 0,
      hits: f.NumberOfTimesDamaged | 0, dmg: f.DamageTaken | 0, rep: f.RepairsMade | 0 }));
    (ps.FleetExpeditions || []).forEach((e, i) => C.exp.push({ i, n: str(e.CustomName), cat: ((e.ExpeditionCategory || {}).ExpeditionCategory) || '', dur: ((e.ExpeditionDuration || {}).ExpeditionDuration) || '',
      start: +e.StartTime || 0, pause: +e.PauseTime || 0, all: e.AllFrigateIndices || [], act: e.ActiveFrigateIndices || [], dam: e.DamagedFrigateIndices || [], des: e.DestroyedFrigateIndices || [],
      ev: (e.Events || []).length, next: e.NextEventToTrigger | 0, ok: e.NumberOfSuccessfulEventsThisExpedition | 0, bad: e.NumberOfFailedEventsThisExpedition | 0, spd: typeof e.SpeedMultiplier === 'number' ? e.SpeedMultiplier : 1 }));
    (ps.Pets || []).forEach((p, i) => { const id = cleanId(p.CreatureID); if(!id || id === '?') return;
      C.pets.push({ i, n: str(p.CustomName), id, sp: cleanId(p.CustomSpeciesName), bio: ((p.Biome || {}).Biome) || '', type: ((p.CreatureType || {}).CreatureType) || '', pred: p.Predator ? 1 : 0,
        born: +p.BirthTime || 0, egg: +p.LastEggTime || 0, trust: typeof p.Trust === 'number' ? p.Trust : 0, tr: (p.Traits || []).slice(0, 3), sum: p.HasBeenSummoned ? 1 : 0, scale: typeof p.Scale === 'number' ? p.Scale : 1,
        win: p.PetBattlerVictories | 0, moves: (p.PetBattlerMoves || []).map(cleanId).filter(x => x && x !== '?') }); });
    // your settlements (others you've visited are in the save too)
    (ps.SettlementStatesV2 || []).forEach((x, i) => { if(!x || !uid || ((x.Owner || {}).UID) !== uid) return;
      const a = (() => { try { return decDisc(x.UniverseAddress); } catch(e){ return null; } })();
      C.settle.push({ i, n: str(x.Name), pop: x.Population | 0, st: (x.Stats || []).slice(0, 8), dec: ((x.PendingJudgementType || {}).SettlementJudgementType) || 'None',
        prod: (x.ProductionState || []).map(p => [cleanId(p.ElementId), p.Amount | 0, p.ProductionAccumulationCap | 0]).filter(p => p[0] && p[0] !== '?'), perks: (x.Perks || []).length,
        next: typeof x.NextBuildingUpgradeIndex === 'number' ? x.NextBuildingUpgradeIndex : -1, race: ((x.Race || {}).AlienRace) || '', a }); });
    // the freighter and the rooms built in it
    if(ps.FreighterInventory){ const rooms = {}; (ps.PersistentPlayerBases || []).forEach(b => { if(((b.BaseType || {}).PersistentBaseTypes) !== 'FreighterBase') return; (b.Objects || []).forEach(o => { const id = cleanId(o.ObjectID); if(/^FRE_ROOM_/.test(id)) rooms[id] = (rooms[id] || 0) + 1; }); });
      C.fr = { n: str(ps.PlayerFreighterName), cls: cls(ps.FreighterInventory), gen: slots(ps.FreighterInventory), tech: slots(ps.FreighterInventory_TechOnly), cargo: slots(ps.FreighterInventory_Cargo), sc: sc(ps.FreighterInventory_TechOnly) + sc(ps.FreighterInventory),
        st: stats(ps.FreighterInventory), t: tech(ps.FreighterInventory_TechOnly).concat(tech(ps.FreighterInventory)), rooms, f: file(ps.CurrentFreighter) }; }
    return C;
  }

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
    const decoded = []; const discP = []; // times you discovered planets and moons (0 = not uploaded yet)
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
      if(t === 'SolarSystem'){ if(cn) e.n = cn; e.by = by; if(mine){ if(ows.TS) e.dt = ows.TS; else if(pending) e.pend = 1; } }
      else if(t === 'Planet'){ if(mine) (pending ? discP.push(0) : ows.TS && discP.push(ows.TS)); const pl = planet(); if(cn) pl.n = cn; pl.by = by; const vp = dd.VP || []; if(typeof vp[1] === 'number' && BIOME[vp[1]]) pl.bio = BIOME[vp[1]]; }
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
    let col = null; try { col = collection(ps, uid); } catch(e) { col = null; }
    // Quest steps for goal tracking: [missionId, step]; plus the quest being tracked.
    const ms = {}; (ps.MissionProgress || []).forEach(m => { const id = cleanId(m.Mission); if(id && id !== '?') ms[id] = Math.max(ms[id] === undefined ? -2 : ms[id], m.Progress|0); });
    stats.mission = cleanId(ps.CurrentMissionID || '');
    // Freighter position, and the systems where you've traded at a terminal (last 100 trades the game keeps)
    const fr = ps.FreighterUniverseAddress ? fromUA(ps.FreighterUniverseAddress) : null;
    (ps.TradingSupplyData || []).forEach(t => { try { const a = decDisc(t.GalacticAddress); if(a.x === undefined) return; const k = key(a); if(!S.has(k)) return; const e = S.get(k); e.tr = (e.tr||0) + 1; const id = cleanId(t.Product); if(/^(TRA_|ILLEGAL_PROD)/.test(id)) (e.tg = e.tg || []).includes(id) || e.tg.push(id); } catch(err){} });
    stats.disc = { p: discP, pend: (disc.Available || []).length };
    return { v:5, sys, cur, fr, path, snap: new Date().toISOString().slice(0,10), stats, inv, ms, col };
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
