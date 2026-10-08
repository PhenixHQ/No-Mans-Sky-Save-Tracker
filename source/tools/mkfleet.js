// Builds data/fleet.json (frigate trait names and ship titles) from a No Man's Sky install's own files.
// Usage: node source/tools/mkfleet.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
// Frigate trait table layout (GcFrigateTraitData, 0x68 bytes): DisplayName 0x00 (str 0x20), ID 0x20 (str 0x10), FrigateStatType 0x5C, Strength 0x60.
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const GameData = require(path.join(__dirname, '..', 'src', 'gamedata.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkfleet.js <PCBANKS folder>'); process.exit(1); }
(async () => {
  const paks = [];
  for(const n of ['NMSARC.Precache.pak', 'NMSARC.MetadataEtc.pak']){ const fd = fs.openSync(path.join(dir, n), 'r'); const size = fs.fstatSync(fd).size;
    const p = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); }); await p.open(); paks.push(p); }
  const get = async p => { for(const k of paks) if(k.has(p)) return Buffer.from(await k.file(p)); return null; };
  const L = new Map(); for(const f of GameData.LANG){ const b = await get(f); if(b) GameData._t.lang(new Uint8Array(b), f, L); }
  const tr = k => (L.get(k) || '').replace(/<[^>]*>/g, '').trim();
  const b = await get('metadata/reality/tables/frigatetraittable.mbin'); const dv = new DataView(b.buffer, b.byteOffset, b.length);
  if(dv.getUint32(0x0C, true) !== 0x6BF62723) throw new Error('frigate trait table layout changed');
  const s = (o, n) => { let e = o; while(e < o + n && b[e]) e++; return b.slice(o, e).toString('utf8'); };
  const at = 0x20 + Number(dv.getBigUint64(0x20, true)), n = dv.getUint32(0x28, true);
  const traits = {};
  for(let i = 0; i < n; i++){ const o = at + i * 0x68; const id = s(o + 0x20, 0x10); if(!id) continue; traits[id] = [tr(s(o, 0x20)) || id, dv.getUint32(o + 0x5C, true), dv.getUint32(o + 0x60, true)]; }
  const titles = {}; ['COMBAT', 'EXPLORE', 'TRADE', 'MINING', 'SUPPORT', 'PIRATE'].forEach(k => titles[k] = ['C', 'B', 'A', 'S'].map(c => tr(`FLEET_UI_${k}_SHIP_TITLE_${c}`)));
  const out = { traits, titles, organic: tr('UI_DEEP_SPACE_FRIG_CLASS') };
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'fleet.json'), JSON.stringify(out));
  console.log('traits', Object.keys(traits).length, 'titles', JSON.stringify(titles).slice(0, 200));
})().catch(e => { console.error(e); process.exit(1); });
