const http=require('http'),fs=require('fs'),path=require('path');
// Test server standing in for app/server.ps1 (helper 6).
//   NMS_SAVEDIR = a folder with save*.hg + mf_save*.hg (or NMS_SAVE = one save.hg; its folder is used)
//   NMS_GAME    = a folder with GAMEDATA/PCBANKS/*.pak (for the game icon loader). Icons go to tools/mock-icons.
//   NMS_RUNNING = 1 pretends the game is running (save writes are refused).
const WEB=path.join(__dirname,'..','..','web'); let data='{}';
const SAVE=process.env.NMS_SAVE||'save.hg';
const SDIR=process.env.NMS_SAVEDIR||path.dirname(path.resolve(SAVE));
const GAME=process.env.NMS_GAME||''; const ICONS=path.join(__dirname,'mock-icons');
const BK=path.join(__dirname,'mock-backups');
const ms=f=>Math.round(fs.statSync(f).mtimeMs);
const body=(q,cb)=>{const parts=[];q.on('data',c=>parts.push(c));q.on('end',()=>cb(Buffer.concat(parts)));};
const okName=n=>/^(mf_)?(save\d*|accountdata)\.hg$/.test(n||'');
function backup(name,label){ fs.mkdirSync(BK,{recursive:true}); const d=new Date(); const p=n=>String(n).padStart(2,'0');
  const id=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3,'0')}-${name.replace(/\.hg$/,'')}`;
  const dst=path.join(BK,id); fs.mkdirSync(dst); fs.copyFileSync(path.join(SDIR,name),path.join(dst,name)); if(fs.existsSync(path.join(SDIR,'mf_'+name))) fs.copyFileSync(path.join(SDIR,'mf_'+name),path.join(dst,'mf_'+name));
  const info={id,label,dir:'st_0',name,at:Date.now(),mtime:ms(path.join(SDIR,name)),size:fs.statSync(path.join(SDIR,name)).size}; fs.writeFileSync(path.join(dst,'info.json'),JSON.stringify(info)); return info; }
http.createServer((q,r)=>{const u=new URL(q.url,'http://x'); const qs=k=>u.searchParams.get(k);
 if(u.pathname.startsWith('/api/')){ if(q.headers['x-vc']!=='1'){r.writeHead(403);return r.end();}
  if(u.pathname==='/api/ping'){r.end('{"ok":true,"helper":7}');return;}
  if(u.pathname==='/api/gamerunning'){r.end(JSON.stringify({running:process.env.NMS_RUNNING==='1'}));return;}
  if(u.pathname==='/api/paks'){ const b=path.join(GAME,'GAMEDATA','PCBANKS'); if(!GAME||!fs.existsSync(b)){r.end('{"ok":false,"detail":"No game folder (set NMS_GAME)."}');return;}
    r.end(JSON.stringify({ok:true,paks:fs.readdirSync(b).filter(n=>/^NMSARC\.[A-Za-z0-9_]+\.pak$/.test(n)).map(n=>{const st=fs.statSync(path.join(b,n));return {name:n,size:st.size,mtime:st.mtimeMs|0};})}));return;}
  if(u.pathname==='/api/pak'){ const n=qs('name'); if(!/^NMSARC\.[A-Za-z0-9_]+\.pak$/.test(n)){r.writeHead(400);return r.end();}
    const off=+qs('off'), len=+qs('len'); const fd=fs.openSync(path.join(GAME,'GAMEDATA','PCBANKS',n),'r'); const buf=Buffer.alloc(len); const got=fs.readSync(fd,buf,0,len,off); fs.closeSync(fd); r.end(buf.subarray(0,got)); return;}
  if(u.pathname==='/api/icons'){ fs.mkdirSync(ICONS,{recursive:true}); const f=qs('file');
    if(q.method==='POST'){ if(f!=='index.json' && !/^[A-Za-z0-9._-]{1,140}\.webp$/.test(f)){r.writeHead(400);return r.end();} body(q,b=>{fs.writeFileSync(path.join(ICONS,f),b); r.end('{"ok":true}');}); return; }
    const ix=path.join(ICONS,'index.json'); r.end(fs.existsSync(ix)?fs.readFileSync(ix):'{}'); return; }
  if(u.pathname==='/api/iconpack'){ fs.mkdirSync(ICONS,{recursive:true}); body(q,b=>{fs.writeFileSync(path.join(ICONS,'pack.bin'),b); r.end('{"ok":true}');}); return; }
  if(u.pathname==='/api/paths'){ const st={game:{path:"C:\\Program Files (x86)\\Steam\\steamapps\\common\\No Man's Sky",source:'auto',ok:true,detail:"Found No Man's Sky: 12 game data files, NMS.exe present."},saves:{path:'C:\\Users\\x\\AppData\\Roaming\\HelloGames\\NMS',source:'auto',ok:true,detail:'Found 1 save file in 1 account folder.'}};
    if(q.method==='POST'){body(q,b=>{const j=JSON.parse(b); if(j.game){st.game.path=j.game;st.game.source='manual';} r.end(JSON.stringify(st));});return;} r.end(JSON.stringify(st)); return;}
  if(u.pathname==='/api/pickfolder'){ r.end('{"path":"D:\\Games\\No Man\'s Sky"}'); return; }
  if(u.pathname==='/api/open'){ fs.writeFileSync(__dirname+'/lastopen.txt', qs('url')); r.end('{"ok":true}'); return; }
  if(u.pathname==='/api/report'){body(q,b=>{fs.writeFileSync(path.join(__dirname,'lastreport.txt'),b);r.end('{"ok":true,"file":"bug-test.txt"}')});return;}
  if(u.pathname==='/api/saves'){r.end(JSON.stringify(fs.readdirSync(SDIR).filter(n=>/^save\d*\.hg$/.test(n)).map(n=>({dir:'st_0',name:n,size:fs.statSync(path.join(SDIR,n)).size,mtime:ms(path.join(SDIR,n))}))));return;}
  if(u.pathname==='/api/save'){const n=qs('name')||'save.hg'; r.end(fs.readFileSync(path.join(SDIR,/^save\d*\.hg$/.test(n)?n:'save.hg')));return;}
  if(u.pathname==='/api/savefiles'){r.end(JSON.stringify({dir:'st_0',files:fs.readdirSync(SDIR).filter(okName).map(n=>({name:n,size:fs.statSync(path.join(SDIR,n)).size,mtime:ms(path.join(SDIR,n))}))}));return;}
  if(u.pathname==='/api/savefile'){const n=qs('name'); if(!okName(n)||!fs.existsSync(path.join(SDIR,n))){r.writeHead(404);return r.end('{}');} r.end(fs.readFileSync(path.join(SDIR,n)));return;}
  if(u.pathname==='/api/savewrite'){ const n=qs('name'); if(!/^(save\d*|accountdata)\.hg$/.test(n||'')){r.writeHead(400);return r.end('{"error":"bad save name"}');}
    if(process.env.NMS_RUNNING==='1' && qs('menu')!=='1'){r.writeHead(409);return r.end(JSON.stringify({error:"No Man's Sky is running. Save and quit the game first, then try again."}));}
    const p=path.join(SDIR,n), mp=path.join(SDIR,'mf_'+n); const ex=+qs('expect');
    if(ex && Math.abs(ms(p)-ex)>1500){r.writeHead(409);return r.end(JSON.stringify({error:'The save changed since it was loaded (the game saved again). Reload it in the save tools and make the change again.'}));}
    body(q,b=>{ const len=b.readUInt32LE(0); const sv=b.subarray(4,4+len), mf=b.subarray(4+len);
      if(sv.readUInt32LE(0)!==0xFEEDA1E5 || mf.length!==fs.statSync(mp).size){r.writeHead(400);return r.end('{"error":"bad body"}');}
      const bk=backup(n,qs('label')||'Before an edit'); fs.writeFileSync(p,sv); fs.writeFileSync(mp,mf);
      r.end(JSON.stringify({ok:Buffer.compare(fs.readFileSync(p),sv)===0&&Buffer.compare(fs.readFileSync(mp),mf)===0,backup:bk.id,mtime:ms(p),size:sv.length})); }); return; }
  if(u.pathname==='/api/backups'){ const act=qs('action');
    if(q.method==='POST'){
      if(act==='create'){ r.end(JSON.stringify(backup(qs('name'),qs('label')||'Made by hand'))); return; }
      if(act==='delete'){ fs.rmSync(path.join(BK,path.basename(qs('id'))),{recursive:true,force:true}); r.end('{"ok":true}'); return; }
      if(act==='label'){ const f=path.join(BK,path.basename(qs('id')),'info.json'); const j=JSON.parse(fs.readFileSync(f)); j.label=qs('label'); fs.writeFileSync(f,JSON.stringify(j)); r.end('{"ok":true}'); return; }
      if(act==='open'){ r.end('{"ok":true}'); return; }
      r.writeHead(400); return r.end('{}'); }
    const list=fs.existsSync(BK)?fs.readdirSync(BK).map(d=>{try{return JSON.parse(fs.readFileSync(path.join(BK,d,'info.json')));}catch(e){return null;}}).filter(Boolean):[]; r.end(JSON.stringify(list)); return; }
  if(u.pathname==='/api/backupfile'){ const f=path.join(BK,path.basename(qs('id')||''),path.basename(qs('name')||'')); if(!fs.existsSync(f)){r.writeHead(404);return r.end();} r.end(fs.readFileSync(f)); return; }
  if(u.pathname==='/api/data'){ if(q.method==='POST'){body(q,b=>{data=b.toString();r.end('{"ok":true}')});return;} r.end(data);return;}
  r.writeHead(404);return r.end();}
 let f=u.pathname.startsWith('/icons/')?path.join(ICONS,path.basename(u.pathname)):path.join(WEB,u.pathname==='/'?'index.html':u.pathname); if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.end(fs.readFileSync(f));
}).listen(47831,'127.0.0.1',()=>console.log('up'));
