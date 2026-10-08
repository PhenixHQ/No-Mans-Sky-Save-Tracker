// 2.4.1: goal picker, how-to-get, wheel scroll, icon index repair, new hotkey labels
const { chromium } = require('playwright'); const SHOT = process.env.SHOT || '/tmp';
(async()=>{ const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const errs = [];
  const host = `window.__sent = []; window.chrome = window.chrome || {}; const L = []; window.chrome.webview = { postMessage: m => window.__sent.push(JSON.parse(m)), addEventListener: (t, f) => L.push(f) }; window.__host = d => L.forEach(f => f({data: d}));`;
  const cfg = {t:'cfg', cfg:{HkOverlay:'F8', HkClose:'F9', HkPanel:'F10', PanelSide:'right', PanelPct:40, Opacity:85, Pin:true, Tray:true}, hk:{overlay:'ok', panel:'ok', close:'ok'}, panel:false, overlay:true, inuse:true};
  await fetch('http://127.0.0.1:47831/api/data', {method:'POST', headers:{'X-VC':'1','Content-Type':'application/json'}, body: JSON.stringify({ seenVer:'2.4.1', goals:[{n:'Refine', rows:[{t:'item', id:'LAND1', q:50}]}], settings:{},
     galaxy:{v:4, sys:[], cur:{x:0,y:0,z:0,s:0}, stats:{units:1,nanites:2,quicksilver:3}, inv:{exo:[{n:'Exosuit', it:[['GAS1',21,999,1,0,0],['LAND1',249,999,1,1,0],['GAS3',5,999,1,2,0]]}]}, ms:{}}, lastSync:{name:'save.hg', dir:'st_0', mtime:1, at:Date.now()} })});
  const m = await b.newPage({viewport:{width:640,height:900}, colorScheme:'dark'}); await m.addInitScript(host);
  m.on('pageerror', e => errs.push('main PE ' + e.message)); m.on('console', x => { if(x.type()==='error' && !/404|Failed to load/.test(x.text())) errs.push('main ' + x.text()); });
  await m.goto('http://127.0.0.1:47831/'); await m.waitForSelector('#boot', {state:'hidden', timeout:30000}); await m.waitForTimeout(800);
  const ix = await fetch('http://127.0.0.1:47831/api/icons', {headers:{'X-VC':'1'}}).then(r => r.json()); console.log('repaired index:', JSON.stringify(ix.files));
  // wheel on tab bar
  const before = await m.$eval('nav.tabs', e => [e.scrollLeft, e.scrollWidth, e.clientWidth]); await m.hover('#t-portals'); await m.mouse.wheel(0, 300); await m.waitForTimeout(200);
  console.log('tabs scroll:', before, '->', await m.$eval('nav.tabs', e => e.scrollLeft));
  // goal picker
  await m.keyboard.press('g'); await m.waitForTimeout(200); await m.click('.gadd summary'); await m.click('[data-gfpick]'); await m.waitForTimeout(200);
  await m.fill('#gpq', 'phos'); await m.waitForTimeout(200); console.log('picker results:', await m.$$eval('[data-gpi]', a => a.map(x => x.textContent)));
  await m.screenshot({path: SHOT + '/picker.png'});
  await m.click('[data-gpi]'); console.log('input value:', await m.inputValue('[data-gfv]'));
  await m.fill('[data-gfq]', '300'); await m.click('[data-gfadd]'); await m.waitForTimeout(200);
  console.log('goal rows:', JSON.stringify(await m.evaluate(() => 0) ));
  const opts = await m.evaluate(() => { const f = document.querySelector('[data-gfv]'); f.focus(); return [...document.querySelectorAll('#gitems option')].map(o => o.value); });
  console.log('datalist size', opts.length, 'has Phosphorus', opts.includes('Phosphorus'), 'glyphs', opts.filter(o => /GLYPH/.test(o)).length, 'Uranium', opts.includes('Uranium'));
  // settings labels
  await m.evaluate(c => window.__host(c), cfg); await m.click('#sideclose'); await m.click('#menubtn'); await m.click('#dsecovl'); await m.waitForTimeout(150);
  console.log('hotkey rows:', await m.$$eval('.hkrow', a => a.map(x => x.textContent.replace(/\s+/g,' ').trim())));
  // overlay how-to-get
  const o = await b.newPage({viewport:{width:360,height:620}, colorScheme:'dark'}); await o.addInitScript(host);
  o.on('pageerror', e => errs.push('ovl PE ' + e.message));
  await o.goto('http://127.0.0.1:47831/?overlay=1'); await o.waitForTimeout(1500); await o.evaluate(c => window.__host(c), cfg); await o.waitForTimeout(200);
  console.log('overlay:', (await o.textContent('#ovl')).replace(/\s+/g,' ').slice(0, 300));
  await o.click('[data-ovget]'); await o.waitForTimeout(200);
  console.log('how to get:', (await o.textContent('.ovhowbox')).replace(/\s+/g,' ').slice(0, 600));
  await o.screenshot({path: SHOT + '/howtoget.png', fullPage: true});
  await o.keyboard.press('Escape'); console.log('esc sent:', JSON.stringify(await o.evaluate(() => window.__sent.slice(-1))));
  console.log('errors:', errs); await b.close(); })();
