// 2.14.0: app language
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
const tabs = async () => (await p.$$eval('.tabs [role=tab], nav [role=tab]', a => a.map(x => x.textContent.trim()).slice(0,6))).join(' | ');
console.log('en:', await tabs());
await p.click('#menubtn'); await p.click('[data-dsec="look"]'); await p.selectOption('#uilang', 'de'); await p.waitForTimeout(400);
console.log('de:', await tabs(), '| menu:', await p.textContent('#menubtn'), '| title:', await p.getAttribute('#gsbtn','title'));
console.log('note:', (await p.textContent('#uilangnote')).slice(0,80));
await p.click('#drawerclose'); await p.click('#t-inventory'); await p.waitForTimeout(500); console.log('inv page bits:', (await p.$$eval('#p-inventory button', a => a.map(x=>x.textContent.trim()).filter(Boolean).slice(0,8))).join(' | '));
await p.click('#menubtn'); await p.click('[data-dsec="look"]'); await p.selectOption('#uilang', 'ja'); await p.waitForTimeout(400); console.log('ja:', await tabs());
await p.selectOption('#uilang', 'en'); await p.waitForTimeout(400); console.log('back to en:', await tabs());
console.log('errors', errs); await b.close();})();
