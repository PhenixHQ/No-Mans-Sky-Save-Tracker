const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h,cs,name] of [[1280,900,'dark','d'],[390,844,'light','m']]){
const p=await b.newPage({viewport:{width:w,height:h},colorScheme:cs});
p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://127.0.0.1:47831/');await p.waitForTimeout(2500);
await p.click('#t-galaxy'); await p.waitForTimeout(800);
console.log(name,'rows', await p.$$eval('#gsptbl tbody tr', r=>r.length), await p.$eval('#gsptbl', t=>t.innerText.split('\n').slice(0,5).join(' | ')));
await (await p.$('#gspecies')).screenshot({path:`../../shots/d_${name}_sp.png`});
await p.click('#gsptbl tbody tr'); await p.waitForTimeout(600);
await (await p.$('#gsystem')).screenshot({path:`../../shots/d_${name}_sys.png`});
const sw = await p.evaluate(()=>document.querySelector('#scroller').scrollWidth - document.querySelector('#scroller').clientWidth); console.log(name,'overflow',sw);
await p.close();}
console.log('errors',errs);await b.close();})();
