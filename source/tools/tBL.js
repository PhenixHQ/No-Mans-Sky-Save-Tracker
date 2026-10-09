// 2.13.0: Goals › Build base parts (materials needed)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#syncpill'); await p.waitForTimeout(4500); await p.click('#sidebtn'); await p.waitForTimeout(300);
await p.fill('#gnew', 'Farm build'); await p.click('#gnewbtn'); await p.waitForTimeout(300);
const f = (await p.$$('[data-gform]')).pop(); const sel = await f.$('[data-gft]'); await sel.selectOption('build'); await p.waitForTimeout(200);
const v = await f.$('[data-gfv]'); await v.fill('Large Hydroponic Tray'); const qn = await f.$('[data-gfq]'); await qn.fill('10'); await (await f.$('[data-gfadd]')).click(); await p.waitForTimeout(400); console.log('validity:', await v.evaluate(e => e.validationMessage), await sel.evaluate(e => e.value));
await v.fill('Save Point').catch(()=>{}); 
const gs = await p.$$eval('.goal', a => a.map(x => x.innerText.replace(/\s+/g,' '))); console.log('LAST GOAL:', gs[gs.length-1]); const sn = await p.innerText('#sidebody'); console.log('STILL:', sn.replace(/\s+/g,' ').match(/Still needed.{0,300}/i)?.[0]); await p.screenshot({path:'/tmp/claude-0/tBL.png'});
console.log('errors', errs); await b.close(); })();
