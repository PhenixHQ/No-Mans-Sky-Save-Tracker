// 2.12.0: welcome guide on first launch, app data backup + restore (real helper, PST = test folder, fresh app data)
const { chromium } = require('playwright'); const fs = require('fs'); const T = process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:60000});
await p.waitForSelector('#welbox:not([hidden])',{timeout:15000}).catch(()=>console.log('no welcome!'));
console.log('W1', (await p.innerText('#welbox')).replace(/\s+/g,' ').slice(0,500)); await p.screenshot({path:'/tmp/claude-0/tWL-1.png'});
console.log('news visible?', await p.isVisible('#newsbox'));
await p.click('#welnext'); await p.waitForTimeout(200); console.log('W2', (await p.innerText('#welbody')).replace(/\s+/g,' ').slice(0,300)); await p.screenshot({path:'/tmp/claude-0/tWL-2.png'});
await p.click('[data-welgo="cook"]'); await p.waitForTimeout(300); console.log('tab', await p.evaluate(()=>document.querySelector('[role=tab][aria-selected=true]').id), 'closed', await p.isHidden('#welbox'));
await p.click('#menubtn'); await p.click('[data-dsec="help"]'); await p.click('#welopen'); await p.waitForTimeout(200); console.log('reopen', await p.isVisible('#welbox')); await p.click('#welskip');
// backup
await p.click('#menubtn'); await p.click('[data-dsec="help"]'); await p.click('#appbak'); await p.waitForTimeout(800); console.log('bak msg', await p.innerText('#appbakmsg'));
const dir = T + '/data/exports'; const f = fs.readdirSync(dir).filter(x => /^nms-save-tracker-backup/.test(x))[0]; const doc = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); console.log('file', f, doc.kind, Object.keys(doc.data).length, 'welcomed', doc.data.welcomed);
doc.data.inotes = { 5: 'restored note' }; fs.writeFileSync('/tmp/claude-0/restore.json', JSON.stringify(doc));
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#appres')]); await fc.setFiles('/tmp/claude-0/restore.json'); await p.waitForTimeout(2500);
await p.waitForSelector('#boot',{state:'hidden',timeout:60000}); const d = JSON.parse(fs.readFileSync(T + '/data/companion.json','utf8')); console.log('after restore note', JSON.stringify(d.inotes), 'welcome shown again?', await p.isVisible('#welbox'));
console.log('errors', errs); await b.close(); })();
