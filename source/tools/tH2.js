// 2.12.0: where things come from
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#t-recipes');
for(const n of ['Inverted Mirror','Crystallised Heart','Platinum','Gold','Storm Crystal','Cobalt']){ await p.fill('#q',n); await p.waitForTimeout(500); const t=(await p.innerText('#itemcard')).replace(/\s+/g,' '); const k=t.toUpperCase().indexOf('WHERE IT COMES'); console.log('CARD',n,'::',k<0?'(none)':t.slice(k,k+420)); }
await p.fill('#q','Inverted Mirror'); await p.waitForTimeout(400); await p.screenshot({path:'/tmp/claude-0/tH2-card.png'});
await p.click('#t-resources'); await p.click('[data-rsrc="finds"]'); await p.waitForTimeout(400); console.log('FINDS', (await p.innerText('#reslist')).replace(/\s+/g,' ').slice(0,700));
await p.fill('#rq','platinum'); await p.waitForTimeout(300); console.log('FINDS plat', (await p.innerText('#reslist')).replace(/\s+/g,' ').slice(0,600)); await p.screenshot({path:'/tmp/claude-0/tH2-finds.png'});
await p.click('[data-rsrc="raw"]'); await p.fill('#rq','gold'); await p.waitForTimeout(300); console.log('RAW gold', (await p.innerText('#reslist')).replace(/\s+/g,' ').slice(0,600));
console.log('errors', errs); await b.close();})();
