// Builds data/unlocks.json from a No Man's Sky install's own files (read-only): every expedition (season) reward and
// Twitch Drop reward the account file can unlock.
// Usage: node source/tools/mkunlocks.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
//  - metadata/reality/tables/unlockableseasonrewards.mbin: list at 0x20, entries 0x78, ID (0x10) at +0x40
//  - metadata/reality/tables/unlockabletwitchrewards.mbin: list at 0x20, entries 0x30, product (0x10) at +0x10, Twitch id (0x10) at +0x20
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkunlocks.js <PCBANKS folder>'); process.exit(1); }
(async () => {
  const paks = [];
  for(const n of fs.readdirSync(dir).filter(f => /\.pak$/i.test(f))){ const fd = fs.openSync(path.join(dir, n), 'r'), size = fs.fstatSync(fd).size;
    const pk = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); }); await pk.open(); paks.push(pk); }
  const get = async p => { for(const pk of paks) if(pk.names.has(p)) return Buffer.from(await pk.file(p)); throw new Error(p + ' not found'); };
  const table = async (p, nh, stride, offs) => { const b = await get(p); if(b.readUInt32LE(0x0C) !== nh) throw new Error(p + ': layout changed');
    const at = 0x20 + Number(b.readBigUInt64LE(0x20)), n = b.readUInt32LE(0x28); const s = o => { let e = o; while(e < o + 0x10 && b[e]) e++; return b.slice(o, e).toString('latin1'); };
    const out = []; for(let i = 0; i < n; i++){ const e = at + i * stride; out.push(offs.map(o => s(e + o))); } return out; };
  const season = (await table('metadata/reality/tables/unlockableseasonrewards.mbin', 0xB908D850, 0x78, [0x40])).map(x => x[0]).filter(Boolean);
  const twitch = (await table('metadata/reality/tables/unlockabletwitchrewards.mbin', 0x3911154D, 0x30, [0x10, 0x20])).filter(x => x[0] && x[1]);
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'unlocks.json'), JSON.stringify({ season, twitch }));
  console.log('season', season.length, 'twitch', twitch.length);
})().catch(e => { console.error(e); process.exit(1); });
