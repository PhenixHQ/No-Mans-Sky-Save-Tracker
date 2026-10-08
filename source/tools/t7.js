const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
const errs=[];
for(const [w,h,cs,name] of [[390,844,'dark','mob'],[1280,900,'light','light']]){
 const p=await b.newPage({viewport:{width:w,height:h}, colorScheme:cs}); p.on('pageerror',e=>errs.push('PE '+e.message));
 await p.goto('http://127.0.0.1:47831/'); await p.waitForTimeout(1800);
 await p.click('#t-recipes'); await p.fill('#q','Salt'); await p.waitForTimeout(200); await p.screenshot({path:`../shots/r_${name}_rec.png`});
 await p.click('#t-inventory'); await p.waitForTimeout(300); await p.screenshot({path:`../shots/r_${name}_inv.png`});
 const sw = await p.evaluate(()=>document.querySelector('#scroller').scrollWidth - document.querySelector('#scroller').clientWidth); console.log(name,'overflow',sw);
 await p.close(); }
console.log('errors',errs); await b.close();})();
