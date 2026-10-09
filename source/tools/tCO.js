// 2.12.0: Save tools > Colours (real helper, PST = test folder)
const { chromium } = require('playwright'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="colour"]'); await p.waitForTimeout(300); console.log('COL', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,700));
await p.screenshot({path:'/tmp/claude-0/tCO.png', fullPage:true});
const first = await p.$$eval('[data-edcol]', a => a.map(x => x.dataset.edcol)); console.log('inputs', first.length, first.slice(0,6));
const mino = await p.$$eval('#edbody .card', cs => { const c = cs.find(c => /Minotaur/.test(c.innerText)); return c ? c.querySelector('[data-edcolset]').dataset.edcolset : null; });
await p.$eval(`[data-edcol="${mino}:0"]`, el => { el.value = '#3366ff'; });
await p.click(`[data-edcolset="${mino}"]`); await p.waitForTimeout(300); console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,200));
await p.click('[data-edsec="colour"]'); await p.waitForTimeout(300); console.log('value now', await p.$eval(`[data-edcol="${mino}:0"]`, el => el.value));
console.log('errors', errs); await b.close(); })();
