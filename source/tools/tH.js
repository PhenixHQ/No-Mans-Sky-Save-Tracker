// 1.8.0: save tools end to end against the mock helper
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:'dark'});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error' && !/TUNNEL/.test(m.text()))errs.push(m.text())});
p.on('dialog', d => { console.log('dialog:', d.message().split('\n')[0]); d.accept(); });
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:20000});
console.log('tools tab hidden before:', await p.isHidden('#t-tools'));
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.screenshot({path:'/tmp/claude-0/tH-saves.png', fullPage:true});
await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid'); console.log('bar:', (await p.textContent('#edbar')).replace(/\s+/g,' ').slice(0,120));
// inventory: put 50 storm crystals into the first empty exosuit slot
const empty = await p.$('.edgrid .edc.empty'); await empty.click(); await p.fill('#edi-id','STORM_CRYSTAL'); await p.fill('#edi-amt','50'); await p.click('#edi-set'); await p.waitForTimeout(200);
console.log('msg:', await p.textContent('#edmsg'));
await p.screenshot({path:'/tmp/claude-0/tH-inv.png', fullPage:false});
// currencies
await p.click('[data-edsec="cur"]'); await p.fill('[data-edcur="7QL"]','2000000'); await p.click('[data-edcurset="7QL"]');
await p.fill('[data-edcur="wGS"]','4000000000'); await p.click('[data-edcurset="wGS"]');
// settlements
await p.click('[data-edsec="set"]'); await p.waitForSelector('#edset'); console.log('settlement:', await p.$eval('#edset', s=>s.selectedOptions[0].textContent));
await p.screenshot({path:'/tmp/claude-0/tH-set.png', fullPage:true});
await p.click('[data-edsq="finish"]'); await p.fill('#edsname','Foundria'); await p.click('#edsnameset');
// quests
await p.click('[data-edsec="quest"]'); await p.fill('#edqf','NEXUS'); await p.waitForTimeout(400); console.log('quest rows:', await p.$$eval('[data-edqp]', a=>a.length));
// timers + raw
await p.click('[data-edsec="time"]'); console.log('timers:', (await p.textContent('#edbody')).match(/[\d,]+ found/)[0]);
await p.click('[data-edsec="raw"]'); await p.fill('#edrf','TotalPlayTime'); await p.click('#edrfgo'); await p.waitForTimeout(200); console.log('raw find:', (await p.textContent('#edbody')).includes('Total Play') || (await p.textContent('#edbody')).includes('TotalPlayTime'));
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForFunction(()=>/Written and checked|failed|isn.t|running|changed|not a|error/i.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:30000});
console.log('result:', await p.textContent('#edmsg'));
await p.click('[data-edsec="saves"]'); await p.waitForTimeout(500); console.log('backups:', await p.$$eval('[data-edrestore]', a=>a.length));
await p.screenshot({path:'/tmp/claude-0/tH-after.png', fullPage:true});
console.log('errors',errs);await b.close();})();
