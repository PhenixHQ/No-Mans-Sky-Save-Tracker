// Packaged technology in Save tools (real helper; PST/saves/save.hg = Jay's save with a packaged Singularity Engine)
const { chromium } = require('playwright'); const fs = require('fs'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.uncheck('#edact').catch(()=>{}); await p.waitForTimeout(200);
const names = await p.$$eval('.edgrid .edc', a => a.map(x => x.getAttribute('title') || x.innerText).filter(t => /Packaged/i.test(t))); console.log('existing packaged:', names.slice(0,3));
const empty = await p.$('.edgrid .edc.empty'); await empty.click(); await p.waitForTimeout(300); if(await p.$('#edi-pick')) await p.click('#edi-pick'); await p.fill('#edpq','packaged boltcaster'); await p.waitForTimeout(500);
console.log('pick list:', await p.$$eval('[data-edpi]', a => a.slice(0,5).map(x => x.dataset.edpi + ' ' + x.innerText.replace(/\s+/g,' '))));
await p.click('[data-edpi="PACK~BOLT"]'); await p.waitForTimeout(200); await p.click('#edi-set'); await p.waitForTimeout(300); console.log('msg:', await p.textContent('#edmsg'));
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,160));
console.log('errors', errs); await b.close(); })();
