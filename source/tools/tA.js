const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
const errs=[];
for(const [w,h,cs,name] of [[1280,900,'dark','d'],[390,844,'light','m']]){
const p=await b.newPage({viewport:{width:w,height:h},colorScheme:cs});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/');await p.waitForTimeout(2500);
console.log(name,'tabs', await p.$$eval('nav.tabs button', bs=>bs.map(b=>b.dataset.tab).join(',')));
console.log(name,'autopill hidden', await p.$eval('#autopill',e=>e.hidden));
await p.click('#autopill'); await p.waitForTimeout(400);
console.log(name,'auto on', await p.$eval('#autosync3',e=>e.checked), await p.$eval('#autosync',e=>e.checked));
await p.screenshot({path:`../../shots/a_${name}_top.png`, clip:{x:0,y:0,width:w,height:160}});
await p.click('#t-recipes'); await p.click('#rcan'); await p.waitForTimeout(600);
console.log(name,'canbox', await p.$eval('#canbox',e=>e.hidden), await p.textContent('#rcanhint'), await p.textContent('#rc-refine'), await p.textContent('#rc-craft'));
await p.screenshot({path:`../../shots/a_${name}_can.png`});
await p.click('[data-rtype="craft"]'); await p.waitForTimeout(300); console.log(name,'craft count', await p.textContent('#rcount2'));
await p.fill('#q','cell'); await p.waitForTimeout(300); console.log(name,'search cell', await p.textContent('#rcount2'));
await p.screenshot({path:`../../shots/a_${name}_can2.png`, fullPage:false});
const boxes = await p.$$('[data-plg]'); console.log(name,'inv ticks', boxes.length);
if(boxes.length){ await boxes[0].click(); await p.waitForTimeout(300); console.log(name,'after untick', await p.textContent('#rcanhint')); }
await p.click('#rcan'); await p.waitForTimeout(300); console.log(name,'off count', await p.textContent('#rcount2'), 'canbox hidden', await p.$eval('#canbox',e=>e.hidden));
const sw = await p.evaluate(()=>document.querySelector('#scroller').scrollWidth - document.querySelector('#scroller').clientWidth); console.log(name,'overflow',sw);
await p.close();}
console.log('errors',errs);await b.close();})();
