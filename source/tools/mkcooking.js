// Builds data/cooking.json from a No Man's Sky install's own files (read-only): which creatures give which
// cooking ingredient when you feed them (GcCreatureGlobals.HarvestingProducts) and the feeding baits
// (BasicFeedingProduct, Carnivore/HerbivoreFeedingProducts, RobotFeedingProduct).
// Usage: node source/tools/mkcooking.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
// Layout from MBINCompiler libMBIN GcCreatureGlobals (GUID 0xBEDBC301F6F3C6CF): HarvestingProducts list at 0x18B0
// (GcCreatureHarvestSubstanceList 0xA8: CreatureType 0x00, Item 0x10, MinBlobs 0x20), BasicFeedingProduct 0x17F0,
// CarnivoreFeedingProducts 0x1800 / HerbivoreFeedingProducts 0x18C0 (GcCreatureFoodList 0x30: FoodProduct 0x10), RobotFeedingProduct 0x1950.
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkcooking.js <PCBANKS folder>'); process.exit(1); }
(async () => {
  const n = 'NMSARC.globals.pak'; const fd = fs.openSync(path.join(dir, n), 'r'); const size = fs.fstatSync(fd).size;
  const pk = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); }); await pk.open();
  const b = Buffer.from(await pk.file('gccreatureglobals.mbin')); const dv = new DataView(b.buffer, b.byteOffset, b.length);
  if(dv.getUint32(0x10, true) !== 0xF6F3C6CF || dv.getUint32(0x14, true) !== 0xBEDBC301) throw new Error('creature globals layout changed');
  const s = (o, n) => { let e = o; while(e < o + n && b[e]) e++; return b.slice(o, e).toString('utf8'); };
  const list = o => ({ at: o + Number(dv.getBigUint64(o, true)), n: dv.getUint32(o + 8, true) }); const B = 0x20;
  const harvest = {}; let L = list(B + 0x18B0);
  for(let i = 0; i < L.n; i++){ const o = L.at + i * 0xA8; const type = s(o, 0x10), item = s(o + 0x10, 0x10); if(/_PET\d*$/.test(type)) continue; (harvest[item] = harvest[item] || []).push(type); }
  const foods = off => { const L2 = list(B + off); const r = []; for(let i = 0; i < L2.n; i++) r.push(s(L2.at + i * 0x30 + 0x10, 0x10)); return r; };
  const out = { harvest, bait: { basic: s(B + 0x17F0, 0x10), carnivore: foods(0x1800), herbivore: foods(0x18C0), robot: s(B + 0x1950, 0x10) } };
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'cooking.json'), JSON.stringify(out));
  console.log('produce', Object.keys(harvest).length, 'bait', JSON.stringify(out.bait));
})().catch(e => { console.error(e); process.exit(1); });
