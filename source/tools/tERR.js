// 2.14.0: app error offers a bug report
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});
await p.goto('http://127.0.0.1:47831/'); await p.waitForSelector('#boot',{state:'hidden',timeout:30000}); if(await p.isVisible('#newsok')) await p.click('#newsok'); if(await p.isVisible('#welskip')) await p.click('#welskip');
await p.evaluate(() => setTimeout(() => { throw new Error('test failure for the report prompt'); }, 10));
await p.waitForSelector('#errnote:not([hidden])', {timeout:5000}); console.log('note:', (await p.textContent('#errnote')).replace(/\s+/g,' ').slice(0,90));
await p.click('#errnote-rep'); await p.waitForTimeout(300); console.log('drawer open:', await p.isVisible('#bug-what'), '| what:', await p.inputValue('#bug-what'));
await b.close();})();
