// 2.4.0: overlay page (?overlay=1), Settings > Overlay and side-panel mode, with a fake app window (WebView2 messages)
const { chromium } = require('playwright');
const SHOT = process.env.SHOT || '/tmp';
(async()=>{ const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const errs = [];
  const host = `window.__sent = []; window.chrome = window.chrome || {}; const L = [];
    window.chrome.webview = { postMessage: m => window.__sent.push(JSON.parse(m)), addEventListener: (t, f) => L.push(f) };
    window.__host = d => L.forEach(f => f({data: d}));`;
  const cfg = {t:'cfg', cfg:{HkOverlay:'Ctrl+Shift+O', HkPanel:'Ctrl+Shift+P', HkClick:'Ctrl+Shift+L', PanelSide:'right', PanelPct:40, Opacity:100, Click:false, Tray:true}, hk:{overlay:'ok', panel:'taken', click:'ok'}, panel:false, overlay:false};
  // seed some goals
  await fetch('http://127.0.0.1:47831/api/data', {method:'POST', headers:{'X-VC':'1','Content-Type':'application/json'}, body: JSON.stringify({ seenVer:'2.4.0', goals:[{n:'Corvette parts farm', rows:[{t:'item', id:'FUEL1', q:500},{t:'cur', id:'nanites', q:5000}]},{n:'Freighter fuel', rows:[{t:'item', id:'LAND1', q:100}]}], settings:{} })});
  const m = await b.newPage({viewport:{width:1300,height:900}, colorScheme:'dark'}); await m.addInitScript(host);
  m.on('pageerror', e => errs.push('main PE ' + e.message)); m.on('console', x => { if(x.type()==='error') errs.push('main ' + x.text()); });
  await m.goto('http://127.0.0.1:47831/'); await m.waitForSelector('#boot', {state:'hidden', timeout:30000});
  console.log('hello sent:', JSON.stringify(await m.evaluate(() => window.__sent)));
  await m.evaluate(c => window.__host(c), cfg);
  console.log('Overlay tab visible:', await m.isVisible('#dsecovl') === false ? 'hidden until drawer' : 'yes');
  await m.click('#menubtn'); await m.click('#dsecovl'); await m.waitForTimeout(200);
  console.log('settings text:', (await m.textContent('#ovlset')).replace(/\s+/g,' ').slice(0, 260));
  await m.screenshot({path: SHOT + '/ovl-settings.png'});
  await m.click('[data-hk="HkOverlay"]'); await m.keyboard.press('Control+Alt+KeyG'); await m.waitForTimeout(100);
  await m.click('[data-hk="HkClick"]'); await m.keyboard.press('KeyQ'); console.log('plain key msg:', await m.textContent('#hkmsg')); await m.keyboard.press('Escape');
  await m.click('[data-ovsize="16"]'); await m.check('[data-ovw="4"]'); await m.click('[data-ovup="1"]'); await m.check('[data-ovg="Freighter fuel"]');
  await m.click('#ovtog'); await m.waitForTimeout(500);
  console.log('sent:', JSON.stringify(await m.evaluate(() => window.__sent.filter(x => x.t!=='hello'))));
  // panel mode
  await m.click('#drawerclose'); await m.evaluate(c => window.__host(Object.assign({}, c, {panel:true})), cfg); await m.setViewportSize({width:760, height:1000}); await m.waitForTimeout(200);
  console.log('panelmode:', await m.evaluate(() => document.body.classList.contains('panelmode')), await m.textContent('#panelhint'));
  await m.screenshot({path: SHOT + '/panel.png'});
  await m.keyboard.press('Escape'); console.log('esc ->', JSON.stringify(await m.evaluate(() => window.__sent.slice(-1))));
  // overlay page
  const o = await b.newPage({viewport:{width:340,height:460}, colorScheme:'dark'}); await o.addInitScript(host);
  o.on('pageerror', e => errs.push('ovl PE ' + e.message)); o.on('console', x => { if(x.type()==='error') errs.push('ovl ' + x.text()); });
  const reqs = []; o.on('request', r => { if(r.method()==='POST') reqs.push(r.url()); });
  await o.goto('http://127.0.0.1:47831/?overlay=1'); await o.waitForTimeout(1500);
  await o.evaluate(c => window.__host(c), cfg); await o.waitForTimeout(200);
  console.log('overlay text:', (await o.textContent('#ovl')).replace(/\s+/g,' ').slice(0, 400));
  console.log('overlay font:', await o.$eval('#ovl', e => e.style.fontSize), 'visible boot:', await o.isVisible('#boot'), 'wrap visible:', await o.isVisible('.wrap'));
  await o.screenshot({path: SHOT + '/overlay.png'});
  await o.evaluate(c => window.__host(Object.assign({}, c, {cfg: Object.assign({}, c.cfg, {Click:true, Opacity:70})})), cfg); await o.waitForTimeout(100);
  await o.screenshot({path: SHOT + '/overlay-click.png'});
  await o.click('[data-ov="fade"]'); await o.click('[data-ov="app"]'); await o.click('[data-ov="hide"]');
  await o.mouse.move(60, 14); await o.mouse.down(); await o.mouse.up();
  console.log('overlay sent:', JSON.stringify(await o.evaluate(() => window.__sent)));
  // main changes a goal -> overlay reloads
  await m.evaluate(() => { document.querySelector('#gnew'); });
  await fetch('http://127.0.0.1:47831/api/data', {headers:{'X-VC':'1'}}).then(r => r.json()).then(d => { d.goals.push({n:'New goal from main', rows:[]}); return fetch('http://127.0.0.1:47831/api/data', {method:'POST', headers:{'X-VC':'1','Content-Type':'application/json'}, body: JSON.stringify(d)}); });
  await o.evaluate(() => window.__host({t:'state'})); await o.waitForTimeout(500);
  console.log('after state: has new goal', (await o.textContent('#ovl')).includes('New goal from main'), '(hidden unless all goals shown)');
  console.log('overlay POSTs (must be none):', reqs);
  console.log('errors:', errs);
  await b.close();
})();
