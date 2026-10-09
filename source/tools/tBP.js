// 2.12.0: Bountria Prime card, map marker, teleporter save tool (real helper, PST = test folder)
const { chromium } = require('playwright'); const fs = require('fs'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000);
await p.click('#t-portals'); await p.waitForTimeout(300); console.log('CARD', (await p.innerText('#gbp')).replace(/\s+/g,' ').slice(0,600));
console.log('saved list', (await p.innerText('#gsaved')).replace(/\s+/g,' ').slice(0,200));
await p.click('#bpload'); await p.waitForTimeout(300); console.log('codes', (await p.innerText('#gcodes')).replace(/\s+/g,' '));
await p.screenshot({path:'/tmp/claude-0/tBP-card.png'});
await p.click('#bpmap'); await p.waitForTimeout(1200); await p.screenshot({path:'/tmp/claude-0/tBP-map.png'});
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-portals'); await p.waitForTimeout(300); const has = await p.$('#bptele'); console.log('tele button', !!has);
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="tele"]'); await p.waitForTimeout(300); console.log('TELE', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,400));
await p.click('#edbptele'); await p.waitForTimeout(300); console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,200));
await p.click('[data-edsec="tele"]'); await p.waitForTimeout(300); console.log('TELE after', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,300));
console.log('errors', errs); await b.close(); })();
