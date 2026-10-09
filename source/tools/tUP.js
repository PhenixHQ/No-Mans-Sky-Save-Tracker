// 2.13.0: Collection › Upgrade planner
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#syncpill'); await p.waitForTimeout(4500); await p.click('#t-fleet'); await p.click('[data-fsec="up"]'); await p.waitForTimeout(500);
console.log((await p.innerText('#fleetbody').catch(async()=>await p.innerText('#p-fleet'))).replace(/\s+/g,' ').slice(0,1200)); await p.screenshot({path:'/tmp/claude-0/tUP.png'});
console.log('errors', errs); await b.close(); })();
