// 2.13.0: upgrade module roll ranges + reseed (real helper; PST/saves/save.hg = Jay's save)
const { chromium } = require('playwright'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error'||/DBG/.test(m.text()))errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid'); await p.uncheck('#edact').catch(()=>{});
const opts = await p.$$eval('#edinv option', a => a.map(o => [o.value, o.textContent]));
const v = (opts.find(o => /multi-tool.*in use/i.test(o[1])) || opts.find(o => /Exosuit technology/.test(o[1])))[0]; await p.selectOption('#edinv', v); await p.waitForTimeout(500);
const cells = await p.$$eval('.edgrid .edc', a => a.map(x => [x.dataset.edcell, x.getAttribute('title') || ''])); const up = cells.find(c => /Upgrade/.test(c[1])); console.log('module:', up);
await p.click(`.edgrid .edc[data-edcell="${up[0]}"]`); await p.waitForTimeout(400);
console.log('ROLLS:', (await p.innerText('.edmodal, .slotmodal, #edbody').catch(()=>'none')).replace(/\s+/g,' ').match(/Possible rolls.{0,400}/)?.[0]);
console.log('inside p-tools?', await p.evaluate(() => !!document.querySelector('#edt-reroll').closest('#p-tools')), await p.evaluate(() => document.querySelector('#edt-reroll').closest('.slotmodal, .edmodal, dialog, [class*=modal]')?.className)); const before = await p.inputValue('#edt-seed'); await p.click('#edt-reroll'); await p.waitForTimeout(300); console.log('msg', await p.textContent('#edmsg').catch(()=>''), 'bar', (await p.textContent('#edbar')).replace(/\s+/g,' ').slice(0,200));
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)), 'was', before, errs);
await p.screenshot({path:'/tmp/claude-0/tRL.png'});
await p.click('#edpx'); await p.waitForTimeout(200); await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,140));
console.log('errors', errs); await b.close(); })();
