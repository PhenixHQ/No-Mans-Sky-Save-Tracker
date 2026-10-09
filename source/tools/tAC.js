// 2.12.0: Save tools > Account unlocks (real helper, PST = test folder)
const { chromium } = require('playwright'); const fs = require('fs'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="acct"]'); await p.waitForTimeout(300); console.log('A1', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,300));
await p.click('#edbody [data-edload="accountdata.hg"]'); await p.waitForTimeout(1500); console.log('A2', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,900));
await p.click('[data-edacct="season"]'); await p.waitForTimeout(300); await p.click('[data-edacct="twitch"]'); await p.waitForTimeout(300);
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,200));
await p.click('[data-edsec="acct"]'); await p.waitForTimeout(300); console.log('A3', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,500));
console.log('errors', errs); await b.close(); })();
