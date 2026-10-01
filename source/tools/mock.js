const http=require('http'),fs=require('fs'),path=require('path');
// Test server: node tools/mock.js  (set NMS_SAVE to a save.hg path)
const WEB=path.join(__dirname,'..','..','web'); let data='{}';
const SAVE=process.env.NMS_SAVE||'save.hg';
// Optional: NMS_GAME = a folder with GAMEDATA/PCBANKS/*.pak (for the game icon loader). Icons are cached in tools/mock-icons.
const GAME=process.env.NMS_GAME||''; const ICONS=path.join(__dirname,'mock-icons');
http.createServer((q,r)=>{const u=new URL(q.url,'http://x');
 if(u.pathname.startsWith('/api/')){ if(q.headers['x-vc']!=='1'){r.writeHead(403);return r.end();}
  if(u.pathname==='/api/ping'){r.end('{"ok":true,"helper":5}');return;}
  if(u.pathname==='/api/paks'){ const b=path.join(GAME,'GAMEDATA','PCBANKS'); if(!GAME||!fs.existsSync(b)){r.end('{"ok":false,"detail":"No game folder (set NMS_GAME)."}');return;}
    r.end(JSON.stringify({ok:true,paks:fs.readdirSync(b).filter(n=>/^NMSARC\.[A-Za-z0-9_]+\.pak$/.test(n)).map(n=>{const st=fs.statSync(path.join(b,n));return {name:n,size:st.size,mtime:st.mtimeMs|0};})}));return;}
  if(u.pathname==='/api/pak'){ const n=u.searchParams.get('name'); if(!/^NMSARC\.[A-Za-z0-9_]+\.pak$/.test(n)){r.writeHead(400);return r.end();}
    const off=+u.searchParams.get('off'), len=+u.searchParams.get('len'); const fd=fs.openSync(path.join(GAME,'GAMEDATA','PCBANKS',n),'r'); const buf=Buffer.alloc(len); const got=fs.readSync(fd,buf,0,len,off); fs.closeSync(fd); r.end(buf.subarray(0,got)); return;}
  if(u.pathname==='/api/icons'){ fs.mkdirSync(ICONS,{recursive:true}); const f=u.searchParams.get('file');
    if(q.method==='POST'){ if(f!=='index.json' && !/^[A-Za-z0-9._-]{1,140}\.webp$/.test(f)){r.writeHead(400);return r.end();} const parts=[]; q.on('data',c=>parts.push(c)); q.on('end',()=>{fs.writeFileSync(path.join(ICONS,f),Buffer.concat(parts)); r.end('{"ok":true}');}); return; }
    const ix=path.join(ICONS,'index.json'); r.end(fs.existsSync(ix)?fs.readFileSync(ix):'{}'); return; }
  if(u.pathname==='/api/paths'){ const st={game:{path:"C:\\Program Files (x86)\\Steam\\steamapps\\common\\No Man's Sky",source:'auto',ok:true,detail:"Found No Man's Sky: 12 game data files, NMS.exe present."},saves:{path:'C:\\Users\\x\\AppData\\Roaming\\HelloGames\\NMS',source:'auto',ok:true,detail:'Found 1 save file in 1 account folder.'}};
    if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{const j=JSON.parse(b); if(j.game){st.game.path=j.game;st.game.source='manual';} r.end(JSON.stringify(st));});return;} r.end(JSON.stringify(st)); return;}
  if(u.pathname==='/api/pickfolder'){ r.end('{"path":"D:\\Games\\No Man\'s Sky"}'); return; }
  if(u.pathname==='/api/open'){ fs.writeFileSync(__dirname+'/lastopen.txt', u.searchParams.get('url')); r.end('{"ok":true}'); return; }
  if(u.pathname==='/api/report'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{fs.writeFileSync(path.join(__dirname,'lastreport.txt'),b);r.end('{"ok":true,"file":"bug-test.txt"}')});return;}
  if(u.pathname==='/api/saves'){const st=fs.statSync(SAVE);r.end(JSON.stringify([{dir:'st_0',name:'save.hg',size:st.size,mtime:st.mtimeMs|0}]));return;}
  if(u.pathname==='/api/save'){r.end(fs.readFileSync(SAVE));return;}
  if(u.pathname==='/api/data'){ if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{data=b;r.end('{"ok":true}')});return;} r.end(data);return;}
  r.writeHead(404);return r.end();}
 let f=u.pathname.startsWith('/icons/')?path.join(ICONS,path.basename(u.pathname)):path.join(WEB,u.pathname==='/'?'index.html':u.pathname); if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.end(fs.readFileSync(f));
}).listen(47831,'127.0.0.1',()=>console.log('up'));
