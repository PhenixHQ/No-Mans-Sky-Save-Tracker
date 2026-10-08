const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h,cs,name] of [[1280,900,'dark','d'],[390,844,'light','m']]){
const p=await b.newPage({viewport:{width:w,height:h},colorScheme:cs});
p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://127.0.0.1:47831/');await p.waitForTimeout(2000);
await p.click('#t-resources'); await p.fill('#starq','G7pf'); await p.waitForTimeout(200);
console.log(name, await p.textContent('#stardecode'));
await (await p.$('#starguide')).screenshot({path:`../../shots/c_${name}_star.png`});
await p.fill('#starq','X2'); console.log(name, await p.textContent('#stardecode'));
await p.fill('#starq','A5'); console.log(name, await p.textContent('#stardecode'));
const sw = await p.evaluate(()=>document.querySelector('#scroller').scrollWidth - document.querySelector('#scroller').clientWidth); console.log(name,'overflow',sw);
await p.close();}
console.log('errors',errs);await b.close();})();
