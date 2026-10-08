// 2.10.0: Cooking tab (real helper)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000); await p.click('#t-cook'); await p.waitForTimeout(300); await p.click('[data-cksec="now"]'); await p.waitForTimeout(400);
const txt = async () => (await p.innerText('#cookbody')).replace(/\s+/g,' ');
console.log('NOW:', (await txt()).slice(0,500)); await p.screenshot({path:'/tmp/claude-0/tK-now.png'});
await p.click('[data-cksec="fx"]'); await p.waitForTimeout(300); console.log('FX:', (await txt()).slice(0,600));
await p.click('[data-ckfx="104"]'); await p.waitForTimeout(300); console.log('FX jetpack:', (await txt()).match(/Jetpack tank: .{0,200}/)?.[0]); await p.screenshot({path:'/tmp/claude-0/tK-fx.png'});
await p.click('[data-cksec="plan"]'); await p.fill('#ckq','Ice Cream'); await p.dispatchEvent('#ckq','change'); await p.waitForTimeout(500); console.log('PLAN:', (await txt()).slice(0,700)); await p.screenshot({path:'/tmp/claude-0/tK-plan.png'});
await p.click('[data-cksec="ing"]'); await p.waitForTimeout(300); console.log('ING:', (await txt()).slice(0,700));
await p.fill('#ckingq','milk'); await p.waitForTimeout(300); console.log('ING milk:', (await txt()).slice(0,500));
await p.click('[data-cksec="kit"]'); await p.waitForTimeout(300); console.log('KIT:', (await txt()).slice(0,700)); await p.screenshot({path:'/tmp/claude-0/tK-kit.png', fullPage:true});
await p.click('#t-recipes'); await p.fill('#q','Ice Cream'); await p.waitForTimeout(400); console.log('card:', (await p.innerText('#itemcard')).replace(/\s+/g,' ').slice(0,300));
console.log('errors', errs); await b.close();})();
