// Builds data/where.json from a No Man's Sky install's own files (read-only): which world objects give which
// items (crystals, Metal 'Fingers', cave rocks, Dissonance Resonators, Storm Crystals…) and where each object spawns.
// Usage: node source/tools/mkwhere.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
//  - metadata/reality/tables/rewardtable.mbin (GcRewardTable): entry 0x38 = rewards list 0x10, RewardChoice 0x20, Id 0x28;
//    item 0x28 = reward (polymorphic: rel offset + name hash) 0x10, PercentageChance 0x20.
//    GcRewardSpecificSubstance (0x4551B575): ID 0x00, amounts 0x10/0x14. GcRewardSpecificProduct (0x21B90B77): ID 0x20, amounts 0x30/0x34.
//  - models/planets/biomes/**/entities/*.entity.mbin: the reward Id and the object's name key (UI_*_NAME).
//  - metadata/simulation/solarsystem/biomes/**: which object lists use which models, and which biomes use which lists.
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const GameData = require(path.join(__dirname, '..', 'src', 'gamedata.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkwhere.js <PCBANKS folder>'); process.exit(1); }

async function openPak(n){
  const fd = fs.openSync(path.join(dir, n), 'r'), size = fs.fstatSync(fd).size;
  const pk = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); });
  await pk.open(); return pk;
}
const strs = b => (Buffer.from(b).toString('latin1').match(/[\x20-\x7e]{3,}/g) || []);

(async () => {
  const paks = []; for(const n of fs.readdirSync(dir).filter(f => /\.pak$/i.test(f))) paks.push(await openPak(n));
  const get = async p => { for(const pk of paks) if(pk.names.has(p)) return Buffer.from(await pk.file(p)); return null; };
  const names = paks.flatMap(pk => [...pk.names.keys()]);

  // English text
  const L = new Map(); for(const p of GameData.LANG){ const b = await get(p); if(b) GameData._t.lang(new Uint8Array(b.buffer, b.byteOffset, b.length), p, L); }
  const tr = k => (L.get(k) || '').replace(/<[^>]*>/g, '').trim();

  // reward table
  const rb = await get('metadata/reality/tables/rewardtable.mbin'); const dv = new DataView(rb.buffer, rb.byteOffset, rb.length);
  if(dv.getUint32(0x0C, true) !== 0x67E289CF) throw new Error('reward table layout changed');
  const u32 = o => dv.getUint32(o, true), u64 = o => u32(o) + u32(o + 4) * 4294967296, f32 = o => dv.getFloat32(o, true);
  const s = (o, n) => { let e = o; while(e < o + n && rb[e]) e++; return rb.slice(o, e).toString('latin1'); };
  const lst = o => ({ at: o + u64(o), n: u32(o + 8) });
  const R = {};
  for(let t = 0; t < 6; t++){ const T = lst(0x20 + t * 0x10);
    for(let i = 0; i < T.n; i++){ const e = T.at + i * 0x38; let Id; try { Id = s(e + 0x28, 0x10); } catch(x){ continue; }
      if(!/^[A-Z0-9_]+$/.test(Id)) continue; const I = lst(e + 0x10); if(I.n > 500) continue; const out = [];
      for(let j = 0; j < I.n; j++){ const it = I.at + j * 0x28, ro = it + 0x10, d = ro + u64(ro), h = u32(ro + 8), p = Math.round(f32(it + 0x20) * 10) / 10;
        if(h === 0x4551B575){ const a = u32(d + 0x10), c = u32(d + 0x14); out.push([s(d, 0x10), Math.min(a, c), Math.max(a, c), p]); }
        else if(h === 0x21B90B77){ const a = u32(d + 0x30), c = u32(d + 0x34); out.push([s(d + 0x20, 0x10), Math.min(a, c), Math.max(a, c), p]); } }
      // RewardChoice: 0 give all, 1 select, 2 select always, 3 select from success (pick one, weighted by the percentages)
      const ch = u32(e + 0x20); if(out.length){ if([1, 2, 3].includes(ch) && out.length > 1){ const sum = out.reduce((t, x) => t + x[3], 0) || 1; out.forEach(x => x[3] = Math.round(x[3] / sum * 1000) / 10); out.one = 1; } R[Id] = out; } } }

  // object lists → models; biome files → object lists
  const BIO = 'metadata/simulation/solarsystem/biomes/';
  const lists = new Map(), biomeOf = new Map();
  for(const n of names.filter(n => n.startsWith(BIO))){
    const b = await get(n); const ss = strs(b);
    const models = ss.map(x => (/MODELS\/[A-Z0-9_/]+\.SCENE\.MBIN/.exec(x) || [])[0]).filter(Boolean);
    const refs = ss.map(x => (/METADATA\/SIMULATION\/SOLARSYSTEM\/BIOMES\/[A-Z0-9_/]+\.MBIN/.exec(x) || [])[0]).filter(Boolean).map(x => x.toLowerCase());
    if(models.length) lists.set(n, new Set(models.map(m => m.toLowerCase())));
    if(refs.length && /biome[a-z]*\.mbin$/.test(n) && !/biomefilenames|biomelist/.test(n)){ const folder = n.slice(BIO.length).split('/')[0];
      refs.forEach(r => { if(!biomeOf.has(r)) biomeOf.set(r, new Set()); biomeOf.get(r).add(folder); }); }
  }
  const BNAME = { barren: 'barren', dead: 'dead', frozen: 'frozen', lush: 'lush', radioactive: 'radioactive', scorched: 'scorched', toxic: 'toxic', swamp: 'swamp', lava: 'volcanic',
    weird: 'exotic', underwater: 'underwater', waterworld: 'ocean', gasgiants: 'gas giant', cave: 'caves', rocky: 'rocky', floral: 'lush', jungle: 'lush', irradiated: 'radioactive', infested: 'infested',
    burnt: 'scorched', desolate: 'dead', noxious: 'toxic', subzero: 'frozen', hugeprops: 'mega-flora' };
  const biomesFor = listPath => { const rel = listPath.slice(BIO.length), folder = rel.split('/')[0]; const out = new Set();
    if(folder !== 'objects' && BNAME[folder]) out.add(BNAME[folder]);
    (biomeOf.get(listPath) || []).forEach(f => out.add(BNAME[f] || f)); return out; };
  const placeOf = (listPath, model) => { const t = (listPath + ' ' + model).toUpperCase();
    return /UNDERWATER|DEEPWATER|WATERWORLD|SEAGLASS/.test(t) ? 'underwater' : /CAVE|UNDERGROUND/.test(t) ? 'cave' : /MOUNTAIN/.test(t) ? 'mountain' : 'surface'; };

  // entities → reward + name
  const ents = names.filter(n => /^models\/planets\/biomes\/.*\/entities\/.*\.entity\.mbin$/.test(n));
  const objOf = new Map(), objByBase = new Map(); // model folder / entity file name → { name, reward }
  for(const n of ents){ const b = await get(n); const ss = strs(b); const folder = n.replace(/\/entities\/[^/]+$/, '');
    const rid = ss.map(x => x.replace(/^[^A-Z_]/, '')).find(x => R[x] || R[x.slice(1)]); if(!rid) continue; const rk = R[rid] ? rid : rid.slice(1);
    const nk = ss.map(x => (/UI_[A-Z0-9_]+/.exec(x) || [])[0]).filter(Boolean).find(k => /NAME|ROCK|LUMP|CRYSTAL|REWARD|RELIC|POD|PLANT|BONES|SWARM/.test(k) && tr(k) && k !== 'UI_ABAND_LOG_READ');
    const o = { name: nk ? tr(nk) : '', reward: rk }; if(!objOf.has(folder) || !objOf.get(folder).name) objOf.set(folder, o);
    objByBase.set(n.split('/').pop().replace(/\.entity\.mbin$/, ''), o); }
  const find = m => { const folder = m.replace(/\.scene\.mbin$/, ''), base = folder.split('/').pop(); return objByBase.get(base) || objOf.get(folder); };

  // join: model scene → folder → object
  const obj = {};
  for(const [lp, models] of lists){ for(const m of models){ const folder = m.replace(/\.scene\.mbin$/, ''); const o = find(m); if(!o) continue;
    const key = o.reward + '|' + (o.name || folder.split('/').pop());
    const e = obj[key] = obj[key] || { n: o.name || '', k: folder.split('/').pop(), r: o.reward, it: R[o.reward], b: new Set(), p: new Set(), any: false };
    const bs = biomesFor(lp); bs.forEach(x => e.b.add(x)); if(!bs.size) e.any = true; e.p.add(placeOf(lp, m)); } }
  // objects whose model isn't in any spawn list we can read (their scene files sit in other packs): still say what they give
  const placed = new Set(Object.values(obj).map(e => e.r));
  for(const [base, o] of objByBase){ if(placed.has(o.reward) || !R[o.reward]) continue; placed.add(o.reward);
    const key = o.reward + '|' + (o.name || base); obj[key] = { n: o.name || '', k: base, r: o.reward, it: R[o.reward], b: new Set(), p: new Set([placeOf('', base)]), any: false, unplaced: true }; }
  // rare objects listed straight in biomefilenames (the random extras any planet can roll)
  const bfl = await get(BIO + 'biomefilenames.mbin'); const common = new Set(strs(bfl).map(x => (/METADATA\/SIMULATION\/SOLARSYSTEM\/BIOMES\/[A-Z0-9_/]+\.MBIN/.exec(x) || [])[0]).filter(Boolean).map(x => x.toLowerCase()));
  for(const lp of common){ const models = lists.get(lp); if(!models) continue; for(const m of models){ const o = find(m); if(!o) continue;
    const key = o.reward + '|' + (o.name || ''); if(obj[key]) obj[key].any = true; } }

  // names for objects the game doesn't name (model folder → what players see)
  const NICE = { mediumrockcave: 'Cave rock', mediumrockwater: 'Underwater rock', largerockwater: 'Large rock (water)', smallrock: 'Small rock', mediumrock: 'Rock', largerock: 'Large rock',
    crater_liquid: 'Crater rock', shellgrass: 'Shell grass', shellhusk: 'Shell husk', shellshard: 'Shell shard', shellwhite: 'White shell', shellsail: 'Shell sail',
    smallplant: 'Small plant', mediumplant: 'Plant', largeplant: 'Large plant', mediumbush: 'Bush', deadtreeflaming: 'Burning dead tree', largeeggholder: 'Egg-holder plant',
    smallplantwater: 'Kelp (small)', mediumplantwater: 'Kelp', largeplantwater: 'Kelp (large)', sporevent: 'Spore vent', venusflytrap: 'Flytrap plant', tentacleplant: 'Tentacle plant',
    hazardplantspikey: 'Spiky hazard plant', hazardsteam: 'Steam vent plant', exploders: 'Exploding plant',
    aloeflesh: 'Wild Aloe Flesh plant', fireberry: 'Wild Fireberry bush', frozentubers: 'Wild Frozen Tubers', grahfruit: 'Wild Grahberry plant', heptawheat: 'Wild Heptaploid Wheat',
    hexaberry: 'Wild Hexaberry plant', impulsebeans: 'Wild Impulse Beans', jadepeas: 'Wild Jade Peas', pulpyroots: 'Wild Pulpy Roots', sweetroot: 'Wild Sweetroot',
    seaurchin: 'Sea urchin', littlewrecks: 'Small wreckage', undergroundcrate: 'Buried tech crate', scientificdepot: 'Depot (breakable storage)', bunk: 'Abandoned bunk',
    locker: 'Abandoned locker', smallcase: 'Abandoned case', oxygencapsule: 'Oxygen capsule', crate_smallb: 'Small supply crate', crate_tutorialsupply: 'Supply crate',
    techdebris: 'Tech debris', cube: 'Data cube', bonetreasure: 'Buried treasure (dig site)',
    beamstone: 'Exotic collectable', bonecollect: 'Exotic collectable', bubblecollect: 'Exotic collectable', contourpod: 'Exotic collectable', engineorb: 'Exotic collectable',
    hydropod: 'Exotic collectable', medgeometric: 'Exotic collectable', shard: 'Exotic collectable', singlejoint: 'Exotic collectable', starjoint: 'Exotic collectable', weirdcube: 'Exotic collectable' };
  const SKIP = new Set(['planterwallshelves', 'harvester', 'blueprintanalyser']);
  const out = Object.values(obj).filter(e => !SKIP.has(e.k)).filter(e => e.it && e.it.length).map(e => ({ n: e.n || NICE[e.k] || '', r: e.r, one: e.it.one ? 1 : 0, it: e.it.filter(x => x[0]), b: [...e.b].sort(), p: [...e.p].sort(), any: e.any ? 1 : 0, u: e.unplaced ? 1 : 0 }))
    .filter(e => e.it.length).filter(e => e.n).sort((a, b) => a.n.localeCompare(b.n));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'where.json'), JSON.stringify({ obj: out }));
  console.log('rewards', Object.keys(R).length, 'lists', lists.size, 'entities with rewards', objOf.size, 'objects', out.length);
  out.forEach(e => console.log(' ', e.n, '|', e.r, '|', e.it.map(x => x[0] + ' ' + x[1] + '-' + x[2] + (x[3] < 100 ? ' (' + x[3] + '%)' : '')).join(', '), '|', e.p.join('/'), '|', e.b.join(',') || '-', e.any ? '| any' : ''));
})().catch(e => { console.error(e); process.exit(1); });
