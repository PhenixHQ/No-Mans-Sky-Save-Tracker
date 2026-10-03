// 1.8.0: icon pack, backups/restore, quest restore, game-running guard (run against the real helper; PST = its test folder)
const { chromium } = require('playwright'); const fs=require('fs'); const {spawn}=require('child_process');
const T=process.env.PST;
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:'dark'});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error' && !/TUNNEL/.test(m.text()))errs.push(m.text())});
p.on('dialog', d => d.accept());
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:20000});
for(let i=0;i<20 && !fs.existsSync(T+'/data/icons/pack.bin');i++) await p.waitForTimeout(500);
await p.waitForTimeout(800);
console.log('pack made:', fs.existsSync(T+'/data/icons/pack.bin'), JSON.parse(fs.readFileSync(T+'/data/icons/index.json')).pack ? 'index has pack' : 'no pack in index');
await p.reload(); await p.waitForSelector('#boot',{state:'hidden',timeout:20000});
await p.click('#t-inventory'); await p.waitForTimeout(400);
console.log('blob icons in inventory:', await p.$$eval('#ivbody img', a=>a.filter(x=>x.src.startsWith('blob:')).length));
// tools
await p.click('#menubtn'); await p.click('[data-dsec="files"]'); await p.click('.advbox summary'); await p.check('#edon'); await p.click('#drawerclose');
await p.click('#t-tools'); await p.waitForSelector('[data-edload]'); await p.click('[data-edload="save.hg"]'); await p.waitForSelector('.edgrid');
const done = async () => { await p.waitForFunction(()=>/Written and checked|failed|isn.t|running|changed|not a|error|first/i.test((document.querySelector('#edmsg')||{}).textContent||''), null, {timeout:60000}); const t = await p.textContent('#edmsg'); return t; };
await p.click('[data-edsec="quest"]'); await p.fill('#edqf','NEXUSMILES'); await p.waitForTimeout(500);
const before = await p.inputValue('[data-edqp]'); await p.fill('[data-edqp]','5'); await p.click('[data-edqset]');
await p.click('#edwrite'); console.log('write 1:', await done());
await p.click('[data-edsec="quest"]'); await p.waitForTimeout(300); await p.selectOption('#edqb', {index:1}); await p.click('#edqbload'); await p.waitForTimeout(800);
console.log('diff rows:', await p.$$eval('[data-edqrest]', a=>a.map(x=>x.dataset.edqrest)));
await p.click('[data-edqrest]'); console.log('pending:', await p.$$eval('.edlist li', a=>a.map(x=>x.textContent)));
// game running guard: a process called NMS makes the helper refuse
fs.copyFileSync('/bin/sleep','/tmp/claude-0/NMS'); fs.chmodSync('/tmp/claude-0/NMS',0o755); const g=spawn('/tmp/claude-0/NMS',['60']);
await p.waitForTimeout(500); await p.click('#edwrite'); console.log('while running:', await done()); g.kill();
await p.evaluate(()=>{ const m=document.querySelector('#edmsg'); if(m) m.textContent=''; });
await p.waitForTimeout(500); await p.click('#edwrite'); console.log('write 2:', await done());
await p.click('[data-edsec="quest"]'); await p.fill('#edqf','NEXUSMILES'); await p.waitForTimeout(500); console.log('step now', await p.inputValue('[data-edqp]'), 'was', before);
// restore the oldest backup = the untouched original
await p.click('[data-edsec="saves"]'); await p.waitForTimeout(600); console.log('backups', await p.$$eval('[data-edrestore]', a=>a.length));
await p.evaluate(()=>{ const m=document.querySelector('#edmsg'); if(m) m.textContent=''; });
const btns = await p.$$('[data-edrestore]'); await btns[btns.length-1].click(); console.log('restore:', await done());
console.log('errors',errs);await b.close();})();
