// 1.8.0: save tools end to end against the mock helper
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:'dark'});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error' && !/TUNNEL/.test(m.text()))errs.push(m.text())});
p.on('dialog', d => { console.log('dialog:', d.message().split('\n')[0]); d.accept(); });
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:20000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
console.log('tools tab hidden before:', await p.isHidden('#t-tools'));
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.screenshot({path:'/tmp/claude-0/tH-saves.png', fullPage:true});
await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid'); console.log('bar:', (await p.textContent('#edbar')).replace(/\s+/g,' ').slice(0,120));
// inventory: put 50 storm crystals into the first empty exosuit slot
await p.uncheck('#edact'); await p.waitForTimeout(200); const empty = await p.$('.edgrid .edc.empty'); await empty.click(); await p.waitForTimeout(300); if(await p.$('#edi-pick')) await p.click('#edi-pick'); await p.fill('#edpq','Storm Crystal'); await p.waitForTimeout(500); await p.screenshot({path:'/tmp/claude-0/tH-pick.png'}); await p.click('[data-edpi="STORM_CRYSTAL"]'); await p.waitForTimeout(200); console.log('limit:', await p.textContent('.edlim'), 'warn:', !!(await p.$('.edqwarn'))); await p.click('[data-edamt="h"]'); console.log('half:', await p.inputValue('#edi-amt')); await p.fill('#edi-amt','99999'); await p.click('#edi-set'); await p.waitForTimeout(200); await p.check('#edact');
console.log('msg:', await p.textContent('#edmsg'));
await p.screenshot({path:'/tmp/claude-0/tH-inv.png', fullPage:false});
// currencies
await p.click('[data-edsec="cur"]'); await p.fill('[data-edcur="7QL"]','2000000'); await p.click('[data-edcurset="7QL"]');
await p.fill('[data-edcur="wGS"]','4000000000'); await p.click('[data-edcurset="wGS"]');
// settlements
await p.click('[data-edsec="set"]'); await p.waitForSelector('#edset'); console.log('settlement:', await p.$eval('#edset', s=>s.selectedOptions[0].textContent));
await p.screenshot({path:'/tmp/claude-0/tH-set.png', fullPage:true});
if(await p.isEnabled('[data-edsq="finish"]')) await p.click('[data-edsq="finish"]'); await p.fill('#edsname','Foundria'); await p.click('#edsnameset'); await p.fill('#edspop','25'); await p.click('#edspopset'); await p.waitForTimeout(150); console.log('pop value:', await p.inputValue('#edspop'));
// quests
await p.click('[data-edsec="quest"]'); await p.waitForTimeout(300); console.log('quest groups:', await p.$$eval('.qgrp > summary', a=>a.map(x=>x.textContent.replace(/\s+/g,' ').trim()).slice(0,30))); await p.screenshot({path:'/tmp/claude-0/tH-quest.png', fullPage:true});
// timers + raw
await p.click('[data-edsec="time"]'); await p.waitForTimeout(300); console.log('timers:', (await p.textContent('#edbody')).match(/[\d,]+ shown of [\d,]+/)[0], await p.$$eval('.qgrp > summary', a=>a.map(x=>x.textContent.replace(/\s+/g,' ').trim()))); console.log('timer rows:', await p.$$eval('#edbody .edt td:first-child', a=>a.slice(0,12).map(x=>x.textContent))); await p.screenshot({path:'/tmp/claude-0/tH-time.png', fullPage:true});
await p.click('[data-edsec="raw"]'); await p.fill('#edrf','TotalPlayTime'); await p.click('#edrfgo'); await p.waitForTimeout(200); console.log('raw find:', (await p.textContent('#edbody')).includes('Total Play') || (await p.textContent('#edbody')).includes('TotalPlayTime'));
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForFunction(()=>/Written and checked|failed|isn.t|running|changed|not a|error/i.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:30000});
console.log('result:', await p.textContent('#edmsg'));
await p.click('[data-edsec="saves"]'); await p.waitForTimeout(500); console.log('backups:', await p.$$eval('[data-edrestore]', a=>a.length));
await p.screenshot({path:'/tmp/claude-0/tH-after.png', fullPage:true});
console.log('errors',errs);await b.close();})();
