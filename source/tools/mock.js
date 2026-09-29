const http=require('http'),fs=require('fs'),path=require('path');
// Test server: node tools/mock.js  (set NMS_SAVE to a save.hg path)
const WEB=path.join(__dirname,'..','..','web'); let data='{}';
const SAVE=process.env.NMS_SAVE||'save.hg';
http.createServer((q,r)=>{const u=new URL(q.url,'http://x');
 if(u.pathname.startsWith('/api/')){ if(q.headers['x-vc']!=='1'){r.writeHead(403);return r.end();}
  if(u.pathname==='/api/ping'){r.end('{"ok":true,"helper":4}');return;}
  if(u.pathname==='/api/paths'){ const st={game:{path:"C:\\Program Files (x86)\\Steam\\steamapps\\common\\No Man's Sky",source:'auto',ok:true,detail:"Found No Man's Sky: 12 game data files, NMS.exe present."},saves:{path:'C:\\Users\\x\\AppData\\Roaming\\HelloGames\\NMS',source:'auto',ok:true,detail:'Found 1 save file in 1 account folder.'}};
    if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{const j=JSON.parse(b); if(j.game){st.game.path=j.game;st.game.source='manual';} r.end(JSON.stringify(st));});return;} r.end(JSON.stringify(st)); return;}
  if(u.pathname==='/api/pickfolder'){ r.end('{"path":"D:\\Games\\No Man\'s Sky"}'); return; }
  if(u.pathname==='/api/open'){ fs.writeFileSync(__dirname+'/lastopen.txt', u.searchParams.get('url')); r.end('{"ok":true}'); return; }
  if(u.pathname==='/api/report'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{fs.writeFileSync(path.join(__dirname,'lastreport.txt'),b);r.end('{"ok":true,"file":"bug-test.txt"}')});return;}
  if(u.pathname==='/api/saves'){const st=fs.statSync(SAVE);r.end(JSON.stringify([{dir:'st_0',name:'save.hg',size:st.size,mtime:st.mtimeMs|0}]));return;}
  if(u.pathname==='/api/save'){r.end(fs.readFileSync(SAVE));return;}
  if(u.pathname==='/api/data'){ if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{data=b;r.end('{"ok":true}')});return;} r.end(data);return;}
  r.writeHead(404);return r.end();}
 let f=path.join(WEB,u.pathname==='/'?'index.html':u.pathname); if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.end(fs.readFileSync(f));
}).listen(47831,'127.0.0.1',()=>console.log('up'));
