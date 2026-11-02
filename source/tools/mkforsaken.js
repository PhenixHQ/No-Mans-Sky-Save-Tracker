// Builds data/forsaken.json from a No Man's Sky install's own files (read-only): what the Forsaken Trader
// (Forsaken update, 7.10) takes and sells, the corvette courier missions, and the game's own text about them.
// Usage: node source/tools/mkforsaken.js "<...>/No Man's Sky/GAMEDATA/PCBANKS"
//  - metadata/reality/defaultreality.mbin (GcRealityManagerData, GUID 0x563435482D64E02C): TradeSettings at 0x130;
//    GcTradeSettings shops (each GcTradeData, 0x378): SpookShop 0x4C50, BiggsBarterShop 0x0, BiggsBasicShop 0x378, SpaceOutpost 0x4560.
//    GcTradeData: AlwaysConsideredBarterProducts list 0x280 (what the trader accepts), AlwaysPresentProducts 0x290 (stock),
//    OptionalProducts 0x2C0, MaxItemsForSale 0x360, MinItemsForSale 0x364, UseBarterForBuy 0x376. Layouts from MBINCompiler libMBIN 7.10.
//  - English text for the trader tutorial (UI_SPOOKSHOP_TUT_*), the courier missions (UI_SO_POSTIE_*) and the Larva Cannon.
global.window = global;
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'gameicons.js'));
const GameData = require(path.join(__dirname, '..', 'src', 'gamedata.js'));
const dir = process.argv[2]; if(!dir){ console.error('usage: node mkforsaken.js <PCBANKS folder>'); process.exit(1); }

(async () => {
  const paks = [];
  for(const n of ['NMSARC.Precache.pak', 'NMSARC.MetadataEtc.pak']){
    const fd = fs.openSync(path.join(dir, n), 'r'), size = fs.fstatSync(fd).size;
    const pk = new GameIcons.Pak(n, size, async (o, l) => { const b = Buffer.alloc(l); fs.readSync(fd, b, 0, l, o); return new Uint8Array(b.buffer, b.byteOffset, l); });
    await pk.open(); paks.push(pk);
  }
  const get = async p => { for(const pk of paks) if(pk.names.has(p)) return Buffer.from(await pk.file(p)); return null; };
  const L = new Map(); for(const p of GameData.LANG){ const b = await get(p); if(b) GameData._t.lang(new Uint8Array(b.buffer, b.byteOffset, b.length), p, L); }
  const tr = k => (L.get(k) || '').replace(/<IMG>[A-Z_]+<>/g, '').replace(/<[^>]*>/g, '').replace(/\s*\((ALTATTACK|ATTACK|CYCLEWEAPON|QUICK_MENU|FE_ALT1|OPTIONS|INVENTORY)\)/g, '').replace(/ with FE_ALT1/g, '').replace(/\s*\(\s*\)/g, '').replace(/%BUILDING%/g, 'building').replace(/%PLANET%/g, 'the destination planet').replace(/the %SYSTEM% system/g, 'the destination system').replace(/%STATION%/g, 'the destination space station').replace(/\s+/g, ' ').trim();

  const b = await get('metadata/reality/defaultreality.mbin'); const dv = new DataView(b.buffer, b.byteOffset, b.length);
  if(dv.getUint32(0x10, true) !== 0x2D64E02C || dv.getUint32(0x14, true) !== 0x56343548) throw new Error('reality manager layout changed (not the Forsaken 7.10 layout)');
  const u32 = o => dv.getUint32(o, true), s = (o, n) => { let e = o; while(e < o + n && b[e]) e++; return b.slice(o, e).toString('latin1'); };
  const list = o => { const at = o + u32(o) + u32(o + 4) * 4294967296, n = u32(o + 8), out = []; for(let i = 0; i < n; i++) out.push(s(at + i * 0x10, 0x10)); return out; };
  const shop = off => { const T = 0x20 + 0x130 + off; return { takes: list(T + 0x280), stock: list(T + 0x290), opt: list(T + 0x2C0), min: dv.getInt32(T + 0x364, true), max: dv.getInt32(T + 0x360, true), barter: !!b[T + 0x376] }; };
  const spook = shop(0x4C50);
  if(!spook.takes.length || !spook.stock.length) throw new Error('Forsaken Trader lists not found');
  const out = {
    src: 'game files',
    trader: { takes: spook.takes, stock: spook.stock, min: spook.min, max: spook.max },
    text: {
      trader: tr('UI_SPOOKSHOP_TUT_DESC'), summon: tr('UI_SPOOKSHOP_TUT_OBJ1_TIP'), gather: tr('UI_SPOOKSHOP_TUT_OBJ2_TIP'), offer: tr('UI_SPOOKSHOP_TUT_OBJ3_TIP'),
      courier: tr('UI_SO_POSTIE_PLA_OBJ_TIP'), courierStation: tr('UI_SO_POSTIE_STA_OBJ_TIP'), larva: tr('UI_EXPD_GUN_GRUB_DESC'),
      elixir: tr('UI_SPOOK_JUICE_DESC'), suppressor: tr('UI_SPOOK_PACK_DESC')
    },
    names: { trader: tr('UI_SPOOK_SHOP_NAME'), larva: tr('UI_EXPD_GUN_GRUB_NAME_L'), quest: tr('UI_SPOOKSHOP_TUT_TITLE'), courierBoard: tr('UI_OUTPOST_HOVER_POST').replace(/^[A-Z]*BULLET\s*/, '').toLowerCase().replace(/^./, c => c.toUpperCase()) }
  };
  Object.entries(out.text).forEach(([k, v]) => { if(!v) throw new Error('missing game text: ' + k); });
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'forsaken.json'), JSON.stringify(out, null, 1));
  console.log('trader takes', spook.takes.join(' '), '| stock', spook.stock.length, 'parts, shows', spook.min + '-' + spook.max);
})().catch(e => { console.error(e); process.exit(1); });
