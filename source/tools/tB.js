// 2.11.0: cooking only in Cooking, sort, back/forward
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000);
const txt = async s => (await p.innerText(s)).replace(/\s+/g,' ');
const pg = async () => p.evaluate(() => { const v = s => { const e = document.querySelector(s); return e ? e.value : null; }; return [(document.querySelector('[role=tab][aria-selected=true]')||{}).id, (document.querySelector('[data-cksec][aria-pressed=true]')||{}).dataset?.cksec, v('#ckq'), v('#ckingq'), v('#q'), 'back'+(document.querySelector('#navback').disabled?'-off':''), 'fwd'+(document.querySelector('#navfwd').disabled?'-off':'')].join(' | '); });
await p.click('#t-recipes'); console.log('cook seg in recipes:', await p.$$eval('[data-rtype="cook"]', x => x.length));
// global search for a food routes to cooking
await p.fill('#q','Refined Flour'); await p.waitForTimeout(900); console.log('recipes q', await pg(), (await txt('#p-recipes')).slice(0,300));
await p.click('#t-cook'); await p.click('[data-cksec="plan"]'); await p.fill('#ckq','Bread'); await p.dispatchEvent('#ckq','change'); await p.waitForTimeout(900);
console.log('A', await pg()); const chips = await p.$$eval('#cookbody [data-item]', x => x.map(e => e.dataset.item)); console.log('chips', chips.slice(0,12));
const c1 = await p.$('#cookbody [data-item="Refined Flour"]'); if(c1){ await c1.click(); await p.waitForTimeout(900); console.log('B', await pg(), (await txt('#cookbody')).slice(0,200)); }
const c2 = await p.$('#cookbody [data-item="Heptaploid Wheat"]'); if(c2){ await c2.click(); await p.waitForTimeout(900); console.log('C', await pg(), (await txt('#cookbody')).slice(0,250)); } else console.log('chips now', await p.$$eval('#cookbody [data-item]', x => x.map(e => e.dataset.item).slice(0,12)));
await p.screenshot({path:'/tmp/claude-0/tB-c.png'});
await p.click('#navback'); await p.waitForTimeout(300); console.log('back1', await pg());
await p.keyboard.press('Alt+ArrowLeft'); await p.waitForTimeout(300); console.log('back2', await pg());
if(!(await p.isDisabled('#navback'))){ await p.click('#navback'); await p.waitForTimeout(300); console.log('back3', await pg()); }
await p.keyboard.press('Alt+ArrowRight'); await p.waitForTimeout(300); console.log('fwd', await pg());
await p.click('#navfwd'); await p.waitForTimeout(300); console.log('fwd2', await pg());
await p.click('#t-cook'); await p.click('[data-cksec="now"]'); await p.waitForTimeout(400);
const rows = async () => p.$$eval('#cookbody .rec', rs => rs.slice(0,4).map(r => r.innerText.replace(/\s+/g,' ').slice(0,110)));
for (const k of ['value','profit','money','count']){ await p.click(`[data-cksort="${k}"]`); await p.waitForTimeout(300); console.log('sort', k, await rows()); }
await p.click('[data-cksec="fx"]'); await p.waitForTimeout(300); await p.click('[data-ckfx="104"]').catch(()=>{}); await p.waitForTimeout(300); await p.click('[data-cksort="profit"]').catch(e=>console.log('no sort in fx')); await p.waitForTimeout(300); console.log('fx profit', await rows());
await p.screenshot({path:'/tmp/claude-0/tB.png'});
console.log('errors', errs); await b.close();})();
