// 2.12.0: "one more" names what runs out
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000); await p.click('#t-cook'); await p.click('[data-cksec="plan"]');
for(const d of ['Meat Flakes','Marrow Flesh','Bread','Ice Cream']){ await p.fill('#ckq',d); await p.dispatchEvent('#ckq','change'); await p.waitForTimeout(700);
  const t=(await p.innerText('#cookbody')).replace(/\s+/g,' '); const k=t.toUpperCase().indexOf('(ONE MORE)'); const k2=t.toUpperCase().indexOf('TO MAKE');
  console.log(d, '::', t.match(/NOW [\d,]+ WITH SUB-CRAFTS [\d,]+ FROM SCRATCH [\d,]+/i)?.[0], '::', t.slice(k2, k2+200)); }
console.log('errors', errs); await b.close();})();
