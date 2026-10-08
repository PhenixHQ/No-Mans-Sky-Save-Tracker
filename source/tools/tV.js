const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
console.log('tag:', await p.textContent('#gdtag'));
await p.click('#menubtn'); await p.click('[data-dsec="files"]');
for(let i=0;i<40;i++){ await p.waitForTimeout(1000); const s=await p.textContent('#gdstat'); if(/next start|couldn|incomplete|Could not|missing/.test(s)){ console.log('stat:', s); break; } }
await p.reload(); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
console.log('tag after restart:', await p.textContent('#gdtag'), '| foot:', await p.textContent('#gdfoot'));
await p.click('#t-recipes'); await p.fill('#q','Carbon Nanotubes'); await p.waitForTimeout(500); console.log('recipes:', (await p.innerText('#reclist').catch(()=>'')).slice(0,200).replace(/\s+/g,' '));
console.log('errors', errs); await b.close();})();
