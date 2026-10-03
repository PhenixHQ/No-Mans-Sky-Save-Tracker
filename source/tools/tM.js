// 2.2.0: slot menus, tech placement rules, craft names, settlement building names and stages (real helper)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000});
if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="inv"]'); await p.waitForTimeout(400);
const opts = await p.$$eval('#edinv option',a=>a.map(x=>[x.value,x.textContent]));
console.log('INV LABELS:', opts.map(o=>o[1]).filter(t=>!/Maintenance|Chest|Refiner/.test(t)).join(' | '));
const search = async q => { await p.fill('#edpq', q); await p.waitForTimeout(250); return p.$$eval('.edpi', a=>a.map(x=>x.dataset.edpi+(x.classList.contains('off')?'(off)':'')+(x.querySelector('.edpb')?'['+x.querySelector('.edpb').textContent+']':''))); };
const openInv = async (label, empty=true) => { const o = opts.find(x=>x[1]===label); if(!o){ console.log('missing', label); return false; } await p.selectOption('#edinv', o[0]); await p.waitForTimeout(300); const c = await p.$(empty?'.edgrid .gc.empty':'.edgrid .gc:not(.empty):not(.off)'); if(!c){console.log(label,'no cell');return false;} await c.click(); await p.waitForSelector('.edpick'); return true; };
const close = async () => { await p.click('#edpx'); await p.waitForTimeout(200); };
const tests = [['Exosuit technology',['hyperdrive','jetpack','singularity']],['Exosuit',['hyperdrive','ferrite','movement system s']]];
for (const lbl of opts.map(o=>o[1]).filter(t=>/Minotaur|Nautilon|Living ship|interceptor/i.test(t) && /technology/.test(t))) tests.push([lbl,['daedalus','humboldt','hyperdrive','singularity','sentinel','minotaur laser']]);
for (const [lbl, qs] of tests){ if(!await openInv(lbl)) continue; const r = []; for(const q of qs) r.push(q+': '+(await search(q)).slice(0,4).join(',')); console.log(lbl,'=>',r.join(' ; ')); await close(); }
// tech section menu
await p.click('[data-edsec="tech"]'); await p.waitForTimeout(400);
await (await p.$('.techgrid .gc:not(.empty):not(.off)')).click(); await p.waitForSelector('.edpick');
console.log('TECH MENU buttons:', await p.$$eval('.edpickin .edform button', a=>a.map(x=>x.textContent)));
console.log('badges sample:', (await search('movement')).slice(0,6).join(','));
await p.click('#edt-move'); await p.waitForTimeout(200); console.log('move hint:', await p.textContent('.edmove'));
const empties = await p.$$('.techgrid .gc.empty'); await empties[0].click(); await p.waitForTimeout(300);
console.log('pending after move:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
// right click
await (await p.$('.techgrid .gc:not(.empty):not(.off)')).click({button:'right'}); await p.waitForTimeout(250); console.log('right-click menu open:', await p.isVisible('.edpick')); await close();
// inventory item put + close
await p.click('[data-edsec="inv"]'); await p.waitForTimeout(300); await openInv('Exosuit'); await search('ferrite dust'); await p.click('[data-edpi="LAND1"]'); await p.waitForTimeout(250); await p.click('#edi-set'); await p.waitForTimeout(300);
console.log('menu closed after put:', !(await p.isVisible('.edpick')), '| pending', (await p.$$eval('.edlist li', a=>a.map(x=>x.textContent))).slice(-1));
// settlements
await p.click('[data-edsec="set"]'); await p.waitForTimeout(500);
const so = await p.$$eval('#edset option', a=>a.map(x=>[x.value,x.textContent])); const mine = so.find(x=>/yours/.test(x[1])) || so[0]; await p.selectOption('#edset', mine[0]); await p.waitForTimeout(400);
console.log('SETTLEMENT', mine[1], 'rows:', await p.$$eval('[data-edsstage]', a=>a.length));
console.log('first rows:', (await p.$$eval('.edt tbody tr', a=>a.slice(0,4).map(r=>r.innerText.replace(/\s+/g,' ').slice(0,120)))).join(' || '));
const st = await p.$('[data-edsstage]'); if(st){ await st.selectOption('5'); await p.waitForTimeout(400); console.log('pending after stage:', (await p.$$eval('.edlist li', a=>a.map(x=>x.textContent))).slice(-1)); }
const nm = await p.$('[data-edsbn]'); await nm.fill('Farm'); await nm.dispatchEvent('change'); await p.waitForTimeout(200); await p.click('[data-edsec="inv"]'); await p.click('[data-edsec="set"]'); await p.waitForTimeout(300); console.log('name kept:', await p.inputValue('[data-edsbn]'));
await p.screenshot({path:'/tmp/claude-0/tO.png'}); console.log('errors', errs); await b.close();})();
