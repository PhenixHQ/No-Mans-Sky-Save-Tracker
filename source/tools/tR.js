// 2.5.0: galaxy history across syncs, exploration stats, wealth tags, session recap (real helper; PST test folder)
const { chromium } = require('playwright'); const fs=require('fs'); const T=process.env.PST, SET=process.env.SET;
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1300,height:950}});
p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok');
await p.click('#syncpill'); await p.waitForTimeout(4000); await p.click('#t-galaxy'); await p.waitForTimeout(600);
const n1 = await p.textContent('#glegend'); console.log('sync 1:', n1.match(/\d+ systems/)[0]);
console.log('explore:', (await p.innerText('#gexplore')).replace(/\s+/g,' ').slice(0,700));
await p.click('[data-gcov]'); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/claude-0/tR-map.png'});
// later save: fewer visited systems, more units
fs.copyFileSync(SET+'/later_save.hg', T+'/saves/save.hg'); fs.copyFileSync(SET+'/later_mf_save.hg', T+'/saves/mf_save.hg'); const t1=new Date(Date.now()+3000); fs.utimesSync(T+'/saves/save.hg', t1, t1);
await p.click('#syncpill'); await p.waitForTimeout(5000);
const n2 = await p.textContent('#glegend'); console.log('sync 2:', n2.match(/\d+ systems/)[0]);
console.log('recap visible:', await p.isVisible('#recap'), (await p.innerText('#recap').catch(()=>'')).replace(/\s+/g,' ').slice(0,300));
// wealth tag via trade view
await p.click('#t-resources'); await p.click('[data-rsrc="trade"]'); await p.waitForTimeout(300);
if(await p.$('#tcurecon')){ await p.selectOption('#tcurecon','adv'); await p.waitForTimeout(200); await p.selectOption('#tcurwealth','high'); await p.waitForTimeout(300);
  console.log('near:', await p.$$eval('.tradenear tbody tr', a=>a.map(x=>x.innerText.replace(/\s+/g,' ')).slice(0,3)));
  console.log('adv card:', await p.$eval('.econ:nth-of-type(3) p', x=>x.textContent).catch(()=>'-')); } else console.log('no current-system tag (current system not in list)');
await p.click('#recaphide').catch(()=>{}); await p.waitForTimeout(200); console.log('recap hidden:', !(await p.isVisible('#recap')));
await p.click('#t-galaxy'); await p.click('[data-gcol="econ"]'); await p.waitForTimeout(400); console.log('econ legend:', (await p.textContent('#glegend')).slice(0,240)); await p.screenshot({path:'/tmp/claude-0/tR-econ.png'}); console.log('errors', errs); await b.close();})();
