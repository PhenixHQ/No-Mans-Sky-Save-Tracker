// Rebuilds data/game.bundle.json from a No Man's Sky install's own files (read-only).
// Usage: node source/tools/mkgamedata.js "<...>/No Man's Sky/GAMEDATA/PCBANKS" ["label"]
// Needs NMSARC.Precache.pak and NMSARC.MetadataEtc.pak. The app does the same at runtime from the player's install.
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const GameData = require(path.join(__dirname, '..', 'src', 'gamedata.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkgamedata.js <PCBANKS folder> [label]'); process.exit(1); }
(async () => {
  const paks = [];
  for(const n of ['NMSARC.Precache.pak', 'NMSARC.MetadataEtc.pak']){
    const f = path.join(dir, n); const fd = fs.openSync(f, 'r'); const size = fs.fstatSync(fd).size;
    const p = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); });
    await p.open(); paks.push(p);
  }
  const get = async p => { for(const k of paks) if(k.has(p)) return await k.file(p); return null; };
  const label = process.argv[3] || ('game files of ' + new Date().toISOString().slice(0, 10));
  const B = await GameData.fromGame(get, label, require(path.join(__dirname, '..', 'data', 'statnames.json')));
  B.src = 'bundled';
  const out = path.join(__dirname, '..', 'data', 'game.bundle.json');
  fs.writeFileSync(out, JSON.stringify(B));
  console.log('wrote', out, B.items.length, 'items,', B.refine.length, 'refiner,', B.cook.length, 'cooking,', B.craft.length, 'crafting,', Object.keys(B.xi).length, 'other ids');
})().catch(e => { console.error(e); process.exit(1); });
