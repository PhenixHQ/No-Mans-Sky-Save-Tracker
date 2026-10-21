// 2.14.0: companion & egg editor
const { chromium } = require('playwright'); const fs = require('fs'); const ST = require('../src/savetools.js'); const SAVE = process.env.SAVEFILE;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="pets"]'); await p.waitForSelector('[data-edpet]');
const ids = await p.$$eval('[data-edpet]', a => a.map(x => x.dataset.edpet)); console.log('rows', ids.length, ids.slice(0,4), ids.filter(x=>x.startsWith('Eggs')).length, 'eggs');
const pet = ids.find(x => x.startsWith('Pets')), egg = ids.find(x => x.startsWith('Eggs'));
await p.click(`[data-edpet="${pet}"]`); await p.waitForSelector('#edptset');
await p.click('[data-edptmax="0:1"]'); await p.fill('#edpt-1', '-100'); await p.fill('#edpt-2', '-75'); await p.click('#edptset'); await p.waitForTimeout(100);
await p.fill('#edpsc', '1.5'); await p.fill('#edptrust', '100'); await p.click('#edpscset'); await p.waitForTimeout(100);
await p.click('#edplook'); await p.waitForTimeout(100);
await p.selectOption('#edpcl-0', 'S'); await p.selectOption('#edpcl-1', 'S'); await p.selectOption('#edpcl-2', 'S'); await p.selectOption('#edpmv-0', 'STUN'); await p.fill('#edptreat', '5'); await p.click('#edpbset'); await p.waitForTimeout(100);
if(egg){ await p.click(`[data-edpet="${egg}"]`); await p.waitForSelector('#edpcopyset'); await p.selectOption('#edpcopy', pet); await p.click('#edpcopyset'); await p.waitForTimeout(100); }
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForFunction(()=>/Written and checked|failed|error/i.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:15000});
console.log('result:', await p.textContent('#edmsg'));
const d = ST.parse(ST.bytesToText(ST.unpack(fs.readFileSync(SAVE)).raw)); const ps = d.vLc['6f=']; const [pk, pi] = pet.split(':'); const P = ps.Mcl[+pi];
console.log('pet traits', P[Object.keys(P).find(k=>Array.isArray(P[k])&&P[k].length===3&&typeof P[k][0]==='number')], 'scale/trust', JSON.stringify(P).match(/"Scale"|"[^"]{3}":1\.5/) ? 'ok' : JSON.stringify(P).slice(0,0));
if(egg){ const E = ps.uKZ[+egg.split(':')[1]]; console.log('egg species now', JSON.stringify(Object.values(E).filter(v=>typeof v==='string'&&v.startsWith('^')).slice(0,2)), 'pet species', JSON.stringify(Object.values(P).filter(v=>typeof v==='string'&&v.startsWith('^')).slice(0,2))); }
console.log('errors', errs); await b.close();})();
