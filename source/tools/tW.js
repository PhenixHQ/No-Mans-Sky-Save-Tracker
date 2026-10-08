const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000);
await p.click('#t-fleet'); await p.waitForTimeout(400);
for(const s of ['ships','tools','veh','frig','pets']){ await p.click(`[data-fsec="${s}"]`); await p.waitForTimeout(300); console.log('==',s, (await p.innerText('#fleetbody')).replace(/\s+/g,' ').slice(0,700)); await p.screenshot({path:`/tmp/claude-0/tW-${s}.png`}); }
console.log('errors', errs); await b.close();})();
