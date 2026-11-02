// 2.15.0: Forsaken (game 7.10–7.13). Needs the helper (or tools/mock.js) with a Forsaken-era game folder and a save.
// Checks: runtime game data rebuilds from the new files (new parts named), Where to find › Forsaken Trader page,
// item card lines for a memento and a trader part, the memento alert, quest names, the Larva Cannon type, no page errors.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot', { state: 'hidden', timeout: 30000 });
  if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
  // runtime rebuild of game data from the updated files (gdBuild runs ~8 s after start)
  let gs = ''; for(let i = 0; i < 40 && !/ready|error/.test(gs); i++){ await p.waitForTimeout(1000); gs = await p.evaluate(() => __vc.GDS.state + ': ' + __vc.GDS.msg); }
  console.log('runtime game data:', gs);
  await p.reload(); await p.waitForSelector('#boot', { state: 'hidden', timeout: 30000 }); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
  console.log('data in use after restart:', await p.evaluate(() => __vc.G.src + ' / ' + __vc.G.version));
  const names = await p.evaluate(() => ['B_COK_E', 'B_WNG_W', 'SPOOK_PACKAGE1', 'B_GEN_6', 'GRUB_HAT'].map(id => id + '=' + __vc.itemInfo(id).n));
  console.log('names:', names.join(' | '));
  // sync the save
  await p.click('#syncbtn').catch(() => {}); await p.waitForTimeout(4000);
  // Where to find › Forsaken Trader
  await p.click('#t-resources'); await p.click('[data-rsrc="forsaken"]'); await p.waitForTimeout(400);
  const h = await p.$$eval('#reslist h3', a => a.map(x => x.textContent.trim()));
  console.log('forsaken cards:', h.join(' | '));
  console.log('count:', await p.textContent('#rcount'));
  console.log('steps:', (await p.$$eval('.fksteps li', a => a.map(x => x.textContent.trim().slice(0, 60)))).join(' // '));
  await p.fill('#rq', 'thruster'); await p.waitForTimeout(300); console.log('search thruster:', await p.textContent('#rcount'));
  await p.fill('#rq', ''); await p.waitForTimeout(200);
  // where-lines on item cards
  const wl = await p.evaluate(() => [__vc.whereLines('SPOOK_PACKAGE3').length, __vc.whereLines('B_COK_E').map(x => x.replace(/<[^>]+>/g, '')).join(' ').slice(0, 120), __vc.whereLines('SPOOK_JUICE').length]);
  console.log('where lines memento/part/elixir:', JSON.stringify(wl));
  // guide link jumps to the page
  await p.click('#t-recipes'); await p.evaluate(() => __vc.goForsaken()); await p.waitForTimeout(300); console.log('goForsaken tab:', await p.evaluate(() => __vc.tab));
  // quests, multitool kind, alert text with a fake memento
  console.log('quests:', await p.evaluate(() => ['SPOOKSHOP_TUT', 'SO_POSTIE_ST_SR', 'SO_POSTIE_PL_SR'].map(q => __vc.questName(q) + ' [' + __vc.questGroup(q) + ']').join(' | ')));
  console.log('tool:', await p.evaluate(() => __vc.toolTypeOf('MODELS/COMMON/WEAPONS/MULTITOOL/GRUBCANNONMULTITOOL.SCENE.MBIN') + ' / ' + __vc.toolTypeOf('MODELS/COMMON/WEAPONS/MULTITOOL/ATLASMULTITOOL.SCENE.MBIN')));
  console.log('alert:', await p.evaluate(() => { const GX = __vc.GX, D = GX.inv; if(!D) return 'no inv'; const k = Object.keys(D)[0]; D[k][0].it.push(['SPOOK_PACKAGE2', 2]); const a = __vc.alertList(GX.col || {}).map(x => x[1]).filter(t => /memento/.test(t)); D[k][0].it.pop(); return a.join(' ') || 'none'; }));
  // German: the button uses the game's own name
  await p.click('#menubtn'); await p.click('[data-dsec="look"]'); await p.selectOption('#uilang', 'de'); await p.waitForTimeout(400); await p.click('#drawerclose');
  console.log('de button:', await p.textContent('[data-rsrc="forsaken"]'));
  await p.click('#menubtn'); await p.click('[data-dsec="look"]'); await p.selectOption('#uilang', 'en'); await p.waitForTimeout(300); await p.click('#drawerclose');
  await p.screenshot({ path: process.env.SHOT || '/tmp/claude-0/fk.png', fullPage: false });
  console.log('errors', errs); await b.close();
})();
