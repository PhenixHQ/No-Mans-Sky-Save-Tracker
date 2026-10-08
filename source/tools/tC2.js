// 2.9.0: Save tools > Ships & multi-tools: class/bonuses, experimental seed and parts (real helper; PST test folder, SET = test saves)
const { chromium } = require('playwright'); const fs = require('fs'); const T = process.env.PST, SET = process.env.SET;
fs.copyFileSync(SET + '/fighter_save.hg', T + '/saves/save.hg'); fs.copyFileSync(SET + '/fighter_mf_save.hg', T + '/saves/mf_save.hg');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
await p.click('[data-edsec="craft"]'); await p.waitForTimeout(400);
const opts = await p.$$eval('#edcr option', a=>a.map(x=>[x.value,x.textContent])); console.log('crafts:', opts.map(o=>o[1]).join(' | '));
const pick = async re => { const o = opts.find(x=>re.test(x[1])); await p.selectOption('#edcr', o[0]); await p.waitForTimeout(300); return o; };
// corvette: class C -> S perfect
const cv = await pick(/Corvette \(C\)/); console.log('corvette:', (await p.innerText('#edbody')).replace(/\s+/g,' ').slice(0,700));
await p.click('#crperfect'); await p.waitForTimeout(200); console.log('after perfect inputs:', await p.$$eval('[data-crst]', a=>a.map(x=>x.dataset.crst+'='+x.value)));
await p.click('#crapply'); await p.waitForTimeout(200);
// sentinel ship: experimental seed random
await pick(/Sentinel interceptor/); await p.click('#crok'); await p.waitForTimeout(300);
await p.click('#crrand'); const sd = await p.inputValue('#crseed'); await p.click('#crseedgo'); await p.waitForTimeout(200);
// fighter_proc: parts
await pick(/Starborn/);
console.log('parts card:', (await p.innerText('#edbody')).replace(/\s+/g,' ').match(/Experimental: parts.{0,300}/)?.[0]);
const sels = await p.$$('[data-crpart]'); for(const s of sels){ const v = await s.$$eval('option', a=>a[2] ? a[2].value : ''); await s.selectOption(v); }
await p.click('#crpartsgo'); await p.waitForTimeout(200);
// atlas multi-tool: best rolls
await pick(/Atlas multi-tool/); await p.click('#crbest'); await p.click('#crapply'); await p.waitForTimeout(200);
console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
await p.click('#edwrite'); await p.waitForTimeout(5000); console.log('after write:', (await p.textContent('#edmsg').catch(()=>'')).slice(0,160));
await p.screenshot({path:'/tmp/claude-0/tC2.png', fullPage:false});
fs.writeFileSync('/tmp/claude-0/tC2-seed.txt', sd);
console.log('errors', errs); await b.close(); })();
