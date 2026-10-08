// 2.0.0: goals sidebar, global search, tech editor, compare, near-live, inventory extras (real helper)
const { chromium } = require('playwright'); const fs=require('fs'); const {spawn}=require('child_process');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1400,height:950},colorScheme:'dark'});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error' && !/TUNNEL/.test(m.text()))errs.push(m.text())});
p.on('dialog', d => { console.log('dialog:', d.message().split('\n')[0]); d.accept(); });
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000});
if(await p.isVisible('#newsbox')){ console.log('news shown'); await p.click('#newsok'); }
// global search
await p.keyboard.press('Control+k'); await p.fill('#gsq','warp cell'); await p.waitForTimeout(200); console.log('search:', await p.$$eval('.gsr', a=>a.slice(0,4).map(x=>x.textContent)));
await p.keyboard.press('Enter'); await p.waitForTimeout(300); console.log('after enter q=', await p.inputValue('#q'));
await p.click('.mkbtn'); await p.waitForTimeout(200); await p.click('[data-mkcopy]'); console.log('copy btn:', await p.textContent('[data-mkcopy]'));
// goals
await p.keyboard.press('Escape'); await p.click('body'); if(!(await p.isVisible('#side'))) await p.keyboard.press('g'); await p.waitForTimeout(200); console.log('side open:', await p.isVisible('#side')); await p.evaluate(()=>{ document.querySelectorAll('[data-gdel]').length; });
await p.fill('#gnew','Corvette parts farm'); await p.click('#gnewbtn'); await p.waitForTimeout(200);
await p.fill('.goal >> nth=-1 >> [data-gfv]','Storm Crystal'); await p.fill('.goal >> nth=-1 >> [data-gfq]','50'); await p.click('.goal >> nth=-1 >> [data-gfadd]'); await p.waitForTimeout(200);
await p.selectOption('.goal >> nth=-1 >> [data-gft]','cur'); await p.fill('.goal >> nth=-1 >> [data-gfq]','5000000000'); await p.click('.goal >> nth=-1 >> [data-gfadd]'); await p.waitForTimeout(200);
await p.selectOption('.goal >> nth=-1 >> [data-gft]','quest'); await p.fill('.goal >> nth=-1 >> [data-gfv]','{SCIENTIST2}'); await p.click('.goal >> nth=-1 >> [data-gfadd]'); await p.waitForTimeout(200);
console.log('goal rows:', await p.$$eval('.grow', a=>a.map(x=>x.textContent.replace(/\s+/g,' ').trim())));
await p.screenshot({path:'/tmp/claude-0/tL-side.png'});
await p.click('#sideclose');
// tools
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.fill('#edfind','carbon'); await p.waitForTimeout(600); console.log('find:', await p.$$eval('[data-edgo]', a=>a.map(x=>x.textContent.trim()).slice(0,3)));
await p.click('[data-edsec="tech"]'); await p.waitForTimeout(400); console.log('tech head:', (await p.textContent('#edbody .card .muted.small')).trim());
const opts = await p.$$eval('#edtech option', a=>a.map(o=>[o.value,o.textContent])); const vg = opts.find(o=>/Voidigaunt/.test(o[1]) && /tech/i.test(o[1])); console.log('tech invs:', opts.length, vg);
if(vg){ await p.selectOption('#edtech', vg[0]); await p.waitForTimeout(400); }
await p.screenshot({path:'/tmp/claude-0/tL-tech.png'});
await p.click('#edt-repair').catch(()=>{}); await p.click('#edt-charge').catch(()=>{});
await p.click('#edt-arrange'); await p.waitForTimeout(300); console.log('arrange msg:', await p.textContent('#edmsg'), '|', (await p.textContent('#edbody .card .muted.small')).trim());
await p.click('#edt-max'); await p.waitForTimeout(300); console.log('max msg:', await p.textContent('#edmsg'));
await p.click('#edt-install'); await p.waitForTimeout(300); console.log('module picker items:', await p.$$eval('.edpi', a=>a.length), '|', await p.textContent('#edmsg')); if(await p.isVisible('#edpx')) await p.click('#edpx');
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.screenshot({path:'/tmp/claude-0/tL-tech2.png'});
// near-live: pretend the game is running
fs.copyFileSync('/bin/sleep','/tmp/claude-0/NMS'); fs.chmodSync('/tmp/claude-0/NMS',0o755); const g=spawn('/tmp/claude-0/NMS',['120']); await p.waitForTimeout(400);
await p.click('#edwrite'); await p.waitForTimeout(1500); console.log('running msg:', await p.textContent('#edmsg'), 'menu button:', await p.isVisible('#edwritemenu'));
await p.click('#edwritemenu'); await p.waitForFunction(()=>/Written and checked|failed/.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:60000}); console.log('menu write:', await p.textContent('#edmsg')); g.kill();
console.log('undo button:', await p.isVisible('#edundo'));
// compare
await p.click('[data-edsec="cmp"]'); await p.waitForTimeout(500); await p.click('#edcmpgo'); await p.waitForSelector('.qgrp', {timeout:30000}).catch(()=>{}); console.log('cmp msg:', await p.textContent('#edmsg')); console.log('compare:', await p.$$eval('#edbody .qgrp summary', a=>a.map(x=>x.textContent.replace(/\s+/g,' ').trim())));
console.log('compare sample:', await p.$$eval('#edbody .edlist li', a=>a.slice(0,8).map(x=>x.textContent)));
await p.screenshot({path:'/tmp/claude-0/tL-cmp.png', fullPage:true});
// undo
await p.click('#edundo'); await p.waitForFunction(()=>/Written and checked|failed/.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:60000}); console.log('undo:', await p.textContent('#edmsg'));
console.log('errors',errs);await b.close();})();
