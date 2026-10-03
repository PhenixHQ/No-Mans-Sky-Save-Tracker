// 2.3.0: trade goods + near places, economy tags, extractor/gas cards, settlement effects, bulk class, reload-and-redo (real helper)
const { chromium } = require('playwright'); const fs=require('fs'); const T=process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000});
if(await p.isVisible('#newsok')){ console.log('news:', (await p.textContent('#newsbox')).slice(0,140)); await p.click('#newsok'); }
await p.click('#syncpill'); await p.waitForTimeout(4000);
await p.click('#t-resources'); await p.waitForTimeout(300);
console.log('cards:', await p.$$eval('#p-resources h2', a=>a.map(x=>x.textContent).join(' | ')));
await p.click('[data-rsrc="trade"]'); await p.waitForTimeout(300);
console.log('near options:', await p.$$eval('#tnear option', a=>a.map(x=>x.textContent).slice(0,6)));
console.log('econ cards:', await p.$$eval('.econ h3', a=>a.map(x=>x.textContent)));
await p.selectOption('#tcurecon','adv'); await p.waitForTimeout(300);
console.log('near table:', await p.$$eval('.tradenear tbody tr', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
console.log('closest adv:', await p.$eval('.econ:nth-of-type(3) p', x=>x.textContent).catch(()=>'-'));
await p.fill('#rq','superconducting'); await p.waitForTimeout(300); console.log('search:', await p.$$eval('.tgood b', a=>a.map(x=>x.textContent)), await p.textContent('#rcount')); await p.fill('#rq','');
// galaxy tag select
await p.click('#t-galaxy'); await p.waitForTimeout(500); const gl = await p.$('[data-sys]'); if(gl){ await gl.click(); await p.waitForTimeout(300); console.log('gecon present:', await p.isVisible('#gecon')); await p.selectOption('#gecon','sci'); }
await p.click('#t-resources'); await p.waitForTimeout(300); console.log('near after tag:', await p.$$eval('.tradenear tbody tr', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
// save tools
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="set"]'); await p.waitForTimeout(400);
const so = await p.$$eval('#edset option', a=>a.map(x=>[x.value,x.textContent])); const mine = so.find(x=>/Foundria/.test(x[1])); await p.selectOption('#edset', mine[0]); await p.waitForTimeout(400);
console.log('effects:', await p.$$eval('.edperks li', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
console.log('behind note:', await p.$eval('.card:has(h3:text("Buildings")) p.small', x=>x.textContent).catch(()=>'none'), '| behind rows', await p.$$eval('.edrow-odd', a=>a.length));
await p.click('[data-edpk="neg"]'); await p.waitForTimeout(300); console.log('after remove neg:', await p.$$eval('.edperks li', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
await p.selectOption('#edpkadd','OLD_SCHOOL'); await p.click('#edpkaddb'); await p.waitForTimeout(300); console.log('after add:', await p.$$eval('.edperks li', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
await p.selectOption('#edsallk','9'); await p.click('[data-edsall="sel"]'); await p.waitForTimeout(300);
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
// reload and redo: the game "saves again"
const sv = T + '/saves/save.hg'; const t0 = new Date(Date.now()+5000); fs.utimesSync(sv, t0, t0);
await p.click('#edwrite'); await p.waitForTimeout(2500); console.log('write msg:', await p.textContent('#edmsg'), '| redo button:', await p.isVisible('#edredo'));
await p.click('#edredo'); await p.waitForTimeout(2500); console.log('after redo:', await p.textContent('#edmsg'), '| pending', await p.$$eval('.edlist li', a=>a.length));
await p.click('#edwrite'); await p.waitForFunction(()=>/Written and checked|failed|changed/i.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:60000}); console.log('write 2:', await p.textContent('#edmsg'));
await p.click('[data-edsec="set"]'); await p.waitForTimeout(400); await p.selectOption('#edset', mine[0]); await p.waitForTimeout(300);
console.log('effects now:', await p.$$eval('.edperks li', a=>a.map(x=>x.innerText.replace(/\s+/g,' '))), '| stages', await p.$$eval('[data-edsstage]', a=>[...new Set(a.map(x=>x.value))]));
await p.screenshot({path:'/tmp/claude-0/tQ.png', fullPage:false}); console.log('errors', errs); await b.close();})();
