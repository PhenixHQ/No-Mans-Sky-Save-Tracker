// 2.4.2: the save the game loads (manifest time), warning when editing an older one, every write stamps it newest
const { chromium } = require('playwright'); const SHOT = process.env.SHOT || '/tmp';
(async()=>{ const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const errs = [];
  await fetch('http://127.0.0.1:47831/api/data', {method:'POST', headers:{'X-VC':'1','Content-Type':'application/json'}, body: JSON.stringify({ seenVer:'2.4.2', settings:{tools:1} })});
  const p = await b.newPage({viewport:{width:1300,height:950}, colorScheme:'dark'});
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('dialog', d => { console.log('dialog:', d.message().split('\n')[0]); d.dismiss(); });
  await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot', {state:'hidden', timeout:60000}); await p.waitForTimeout(3000);
  console.log('synced from:', await p.evaluate(() => JSON.stringify(window.__S || null)), await p.textContent('#syncpilltxt'));
  await p.click('#t-tools'); await p.waitForTimeout(1500);
  console.log('save list:', (await p.$$eval('.edt tbody tr', a => a.slice(0,3).map(x => x.textContent.replace(/\s+/g,' ').trim()))));
  await p.click('[data-edload="save.hg"]'); await p.waitForTimeout(4000);
  console.log('bar:', (await p.textContent('#edbar')).replace(/\s+/g,' ').slice(0, 420));
  await p.screenshot({path: SHOT + '/older.png'});
  console.log('errors:', errs); await b.close(); })();
