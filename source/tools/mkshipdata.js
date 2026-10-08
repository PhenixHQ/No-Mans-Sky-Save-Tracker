// Builds data/shipdata.json from a No Man's Sky install's own files (read-only):
//  - INVENTORYTABLE: the range each built-in bonus is rolled in, per ship type / multi-tool type and class, and the slot limits
//  - MODULARCUSTOMISATIONDATATABLE: the parts the game's own starship / staff customiser offers, per slot
// Usage: node source/tools/mkshipdata.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
// Layouts from MBINCompiler libMBIN (GcInventoryTable 0xD38E45DA07C69AF7, GcModularCustomisationDataTable 0xBF968FAC94F74AB4).
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const GameData = require(path.join(__dirname, '..', 'src', 'gamedata.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkshipdata.js <PCBANKS folder>'); process.exit(1); }
(async () => {
  const paks = [];
  for(const n of ['NMSARC.Precache.pak', 'NMSARC.MetadataEtc.pak']){ const fd = fs.openSync(path.join(dir, n), 'r'); const size = fs.fstatSync(fd).size;
    const p = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); }); await p.open(); paks.push(p); }
  const get = async p => { for(const k of paks) if(k.has(p)) return Buffer.from(await k.file(p)); return null; };
  const L = new Map(); for(const f of GameData.LANG){ const b = await get(f); if(b) GameData._t.lang(new Uint8Array(b), f, L); }
  const tr = k => (L.get(k) || '').replace(/<[^>]*>/g, '').trim();
  const reader = b => { const dv = new DataView(b.buffer, b.byteOffset, b.length);
    return { dv, s: (o, n) => { let e = o; while(e < o + n && b[e]) e++; return b.slice(o, e).toString('utf8'); },
      vs(o){ const len = dv.getUint32(o + 8, true); return len ? this.s(o + Number(dv.getBigUint64(o, true)), len) : ''; },
      list: o => ({ at: o + Number(dv.getBigUint64(o, true)), n: dv.getUint32(o + 8, true) }) }; };
  const guid = (b, lo, hi) => { const dv = new DataView(b.buffer, b.byteOffset, b.length); if(dv.getUint32(0x10, true) !== lo || dv.getUint32(0x14, true) !== hi) throw new Error('table layout changed'); };
  // ---- inventory table: bonus ranges and slot limits
  const inv = await get('metadata/reality/tables/inventorytable.mbin'); guid(inv, 0x07C69AF7, 0xD38E45DA); const I = reader(inv), B = 0x20;
  const statData = o => { const out = {}; ['C', 'B', 'A', 'S'].forEach((c, k) => { const Ls = I.list(o + k * 0x10); const r = {};
    for(let i = 0; i < Ls.n; i++){ const e = Ls.at + i * 0x20; const id = I.s(e, 0x10); if(id === 'ALIEN_SHIP' || id === 'ROBOT_SHIP') continue; r[id] = [+I.dv.getFloat32(e + 0x18, true).toFixed(3), +I.dv.getFloat32(e + 0x10, true).toFixed(3)]; }
    if(Object.keys(r).length) out[c] = r; }); return out; };
  const SH = ['Freighter', 'Dropship', 'Fighter', 'Scientific', 'Shuttle', 'PlayerFreighter', 'Royal', 'Alien', 'Sail', 'Robot', 'Corvette', 'SwarmDrone'];
  const WP = ['Pistol', 'Rifle', 'Pristine', 'Alien', 'Royal', 'Robot', 'Atlas', 'AtlasYellow', 'AtlasBlue', 'Staff'];
  const ship = {}, weapon = {}, maxSlots = {};
  SH.forEach((n, i) => { const d = statData(B + i * 0x40); if(Object.keys(d).length) ship[n] = d;
    const o = B + 0x14A4 + i * 0x30; const r = k => [0, 1, 2, 3].map(j => I.dv.getInt32(o + k + j * 4, true)); const gen = r(0x10), tech = r(0x20); if(gen.some(Boolean)) maxSlots[n] = { gen, tech }; });
  WP.forEach((n, i) => { const d = statData(B + 0x300 + i * 0x40); if(Object.keys(d).length) weapon[n] = d; });
  maxSlots.Weapon = { gen: [0, 1, 2, 3].map(j => I.dv.getInt32(B + 0x1ABC + j * 4, true)) };
  // ---- starship / staff customiser parts
  const mod = await get('metadata/gamestate/playerdata/modularcustomisationdatatable.mbin'); guid(mod, 0x94F74AB4, 0xBF968FAC); const M = reader(mod);
  const TYPES = ['MultiToolStaff', 'Fighter', 'Dropship', 'Scientific', 'Shuttle', 'Sail'];
  const item = o => { const dg = M.list(o); const g = []; for(let i = 0; i < dg.n; i++) g.push(M.s(dg.at + i * 0x10, 0x10)); return [M.s(o + 0x10, 0x10), g]; };
  const parts = {};
  TYPES.forEach((t, ti) => { const c = B + ti * 0x290; if(!mod[c + 0x280]) return; // the game has this customiser turned off
    const sl = M.list(c + 0x250); const slots = [];
    for(let i = 0; i < sl.n; i++){ const o = sl.at + i * 0x128; const id = M.s(o + 0xC0, 0x10);
      const its = M.list(o + 0xD0); const items = []; for(let j = 0; j < its.n; j++) items.push(item(its.at + j * 0x40));
      if(items.length && items.every(x => /^SHIP_CORE_/.test(x[0]))) continue; // the reactor slot sets the class, not looks
      const lab = tr(M.s(o + 0x80, 0x20)); slots.push({ id, n: lab ? lab[0] + lab.slice(1).toLowerCase() : id, items }); }
    parts[t] = { res: M.vs(c + 0x180), slots }; });
  const out = { ship, weapon, maxSlots, parts, stat: { SHIP_DAMAGE: 'Damage', SHIP_SHIELD: 'Shield', SHIP_HYPERDRIVE: 'Hyperdrive', SHIP_AGILE: 'Manoeuvrability', WEAPON_DAMAGE: 'Damage', WEAPON_MINING: 'Mining', WEAPON_SCAN: 'Scanning', FREI_HYPERDRIVE: 'Hyperdrive', FREI_FLEET: 'Fleet coordination' } };
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'shipdata.json'), JSON.stringify(out));
  console.log('ship types', Object.keys(ship).join(','), '| weapons', Object.keys(weapon).join(','), '| parts', Object.entries(parts).map(([k, v]) => k + ':' + v.slots.map(s => s.n + ' ' + s.items.length).join('/')).join(' '));
})().catch(e => { console.error(e); process.exit(1); });
