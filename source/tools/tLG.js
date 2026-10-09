// 2.13.0: item text in another game language (real helper with the fake game folder)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.waitForTimeout(300);
await p.selectOption('#gdlang', 'french'); await p.waitForTimeout(500);
for(let i = 0; i < 60; i++){ const t = await p.innerText('#gdstat'); if(/Read |couldn|missing|stopped|keeps using/i.test(t)){ console.log('status:', t.replace(/\s+/g,' ').slice(0,200)); break; } await p.waitForTimeout(1000); }
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:60000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#t-recipes'); await p.fill('#q','Platine'); await p.waitForTimeout(600); console.log('card:', (await p.innerText('#itemcard')).replace(/\s+/g,' ').slice(0,260));
console.log('errors', errs); await b.close(); })();
