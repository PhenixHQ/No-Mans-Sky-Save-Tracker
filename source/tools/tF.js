const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:'dark'});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error' && !/TUNNEL/.test(m.text()))errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/');
for(let i=0;i<30;i++){ await p.waitForTimeout(1000); const st = await p.evaluate(()=>document.querySelector('#gistat').textContent); if(/✓|⚠/.test(st)) { console.log('after',i,'s:',st); break; } }
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.waitForTimeout(300);
await (await p.$('#gibox')).screenshot({path:'../../shots/f_gibox.png'});
await p.keyboard.press('Escape');
await p.click('#t-recipes'); await p.fill('#q','Carbon'); await p.waitForTimeout(400);
await p.screenshot({path:'../../shots/f_rec.png'});
await p.click('#t-inventory'); await p.waitForTimeout(600); await p.screenshot({path:'../../shots/f_inv.png'});
console.log('imgs', await p.$$eval('img.gpic, img.cimg, .ico.img img', a=>a.length));
console.log('errors',errs);
const idx = await p.evaluate(async()=>{ const r = await fetch('/api/icons',{headers:{'X-VC':'1'}}); return r.text(); }); console.log(idx.slice(0,300));
await b.close();})();
