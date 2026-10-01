/* Game icon reader for NMS Save Tracker.
   Reads item icons straight from the player's own No Man's Sky install (read-only), so no game artwork ships with the app.
   - HGPAK reader: format as documented by HGPAKtool (github.com/monkeyman192/HGPAKtool, MIT).
   - zstd: fzstd by Arjun Barrett (github.com/101arrowz/fzstd, MIT), included below.
   - BC7 partition tables from bcdec by Sergii Kudlai (github.com/iOrange/bcdec, MIT). */
(function(){
var module = { exports: {} }, exports = module.exports;
!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(['fzstd',f]):(typeof self!='undefined'?self:this).fzstd=f()}(function(){var _e={};"use strict";var r=ArrayBuffer,t=Uint8Array,e=Uint16Array,n=Int16Array,a=Uint32Array,s=Int32Array,i=function(r,e,n){if(t.prototype.slice)return t.prototype.slice.call(r,e,n);(null==e||e<0)&&(e=0),(null==n||n>r.length)&&(n=r.length);var a=new t(n-e);return a.set(r.subarray(e,n)),a},o=function(r,e,n,a){if(t.prototype.fill)return t.prototype.fill.call(r,e,n,a);for((null==n||n<0)&&(n=0),(null==a||a>r.length)&&(a=r.length);n<a;++n)r[n]=e;return r},u=function(r,e,n,a){if(t.prototype.copyWithin)return t.prototype.copyWithin.call(r,e,n,a);for((null==n||n<0)&&(n=0),(null==a||a>r.length)&&(a=r.length);n<a;)r[e++]=r[n++]};_e.ZstdErrorCode={InvalidData:0,WindowSizeTooLarge:1,InvalidBlockType:2,FSEAccuracyTooHigh:3,DistanceTooFarBack:4,UnexpectedEOF:5};var h=["invalid zstd data","window size too large (>2046MB)","invalid block type","FSE accuracy too high","match distance too far back","unexpected EOF"],f=function(r,t,e){var n=Error(t||h[r]);if(n.code=r,Error.captureStackTrace&&Error.captureStackTrace(n,f),!e)throw n;return n},l=function(r,t,e){for(var n=0,a=0;n<e;++n)a|=r[t++]<<(n<<3);return a},v=function(r,t){return(r[t]|r[t+1]<<8|r[t+2]<<16|r[t+3]<<24)>>>0},c=function(r,e){var n=r[0]|r[1]<<8|r[2]<<16;if(3126568==n&&253==r[3]){var a=r[4],i=a>>5&1,o=a>>2&1,u=3&a,h=a>>6;8&a&&f(0);var c=6-i,b=3==u?4:u,y=l(r,c,b),p=h?1<<h:i,w=l(r,c+=b,p)+(1==h&&256),g=w;if(!i){var d=1<<10+(r[5]>>3);g=d+(d>>3)*(7&r[5])}g>2145386496&&f(1);var m=new t((1==e?w||g:e?0:g)+12);return m[0]=1,m[4]=4,m[8]=8,{b:c+p,y:0,l:0,d:y,w:e&&1!=e?e:m.subarray(12),e:g,o:new s(m.buffer,0,3),u:w,c:o,m:Math.min(131072,g)}}if(25481893==(n>>4|r[3]<<20))return v(r,4)+8;f(0)},b=function(r){for(var t=0;1<<t<=r;++t);return t-1},y=function(a,s,i){var o=4+(s<<3),u=5+(15&a[s]);u>i&&f(3);for(var h=1<<u,l=h,v=-1,c=-1,y=-1,p=h,w=new r(512+(h<<2)),g=new n(w,0,256),d=new e(w,0,256),m=new e(w,512,h),z=512+(h<<1),E=new t(w,z,h),k=new t(w,z+h);v<255&&l>0;){var A=b(l+1),T=o>>3,x=(1<<A+1)-1,F=(a[T]|a[T+1]<<8|a[T+2]<<16)>>(7&o)&x,S=(1<<A)-1,B=x-l-1,I=F&S;if(I<B?(o+=A,F=I):(o+=A+1,F>S&&(F-=B)),g[++v]=--F,-1==F?(l+=F,E[--p]=v):l-=F,!F)do{var U=o>>3;c=(a[U]|a[U+1]<<8)>>(7&o)&3,o+=2,v+=c}while(3==c)}(v>255||l)&&f(0);for(var D=0,M=(h>>1)+(h>>3)+3,W=h-1,O=0;O<=v;++O){var j=g[O];if(j<1)d[O]=-j;else for(y=0;y<j;++y){E[D]=O;do{D=D+M&W}while(D>=p)}}for(D&&f(0),y=0;y<h;++y){var C=d[E[y]]++,H=k[y]=u-b(C);m[y]=(C<<H)-h}return[o+7>>3,{b:u,s:E,n:k,t:m}]},p=function(r,n){var a=0,s=-1,i=new t(292),u=r[n],h=i.subarray(0,256),l=i.subarray(256,268),v=new e(i.buffer,268);if(u<128){var c=y(r,n+1,6),p=c[1],w=c[0]<<3,g=r[n+=u];g||f(0);for(var d=0,m=0,z=p.b,E=z,k=(++n<<3)-8+b(g);!((k-=z)<w);){var A=k>>3;if(h[++s]=p.s[d+=(r[A]|r[A+1]<<8)>>(7&k)&(1<<z)-1],(k-=E)<w)break;h[++s]=p.s[m+=(r[A=k>>3]|r[A+1]<<8)>>(7&k)&(1<<E)-1],z=p.n[d],d=p.t[d],E=p.n[m],m=p.t[m]}++s>255&&f(0)}else{for(s=u-127;a<s;a+=2){var T=r[++n];h[a]=T>>4,h[a+1]=15&T}++n}var x=0;for(a=0;a<s;++a)(I=h[a])>11&&f(0),x+=I&&1<<I-1;var F=b(x)+1,S=1<<F,B=S-x;for(B&B-1&&f(0),h[s++]=b(B)+1,a=0;a<s;++a){var I;++l[h[a]=(I=h[a])&&F+1-I]}var U=new t(S<<1),D=U.subarray(0,S),M=U.subarray(S);for(v[F]=0,a=F;a>0;--a){var W=v[a];o(M,a,W,v[a-1]=W+l[a]*(1<<F-a))}for(v[0]!=S&&f(0),a=0;a<s;++a){var O=h[a];if(O){var j=v[O];o(D,a,j,v[O]=j+(1<<F-O))}}return[n,{n:M,b:F,s:D}]},w=y(new t([81,16,99,140,49,198,24,99,12,33,196,24,99,102,102,134,70,146,4]),0,6)[1],g=y(new t([33,20,196,24,99,140,33,132,16,66,8,33,132,16,66,8,33,68,68,68,68,68,68,68,68,36,9]),0,6)[1],d=y(new t([32,132,16,66,102,70,68,68,68,68,36,73,2]),0,5)[1],m=function(r,t){for(var e=r.length,n=new s(e),a=0;a<e;++a)n[a]=t,t+=1<<r[a];return n},z=new t(new s([0,0,0,0,16843009,50528770,134678020,202050057,269422093]).buffer,0,36),E=m(z,0),k=new t(new s([0,0,0,0,0,0,0,0,16843009,50528770,117769220,185207048,252579084,16]).buffer,0,53),A=m(k,3),T=function(r,t,e){var n=r.length,a=t.length,s=r[n-1],i=(1<<e.b)-1,o=-e.b;s||f(0);for(var u=0,h=e.b,l=(n<<3)-8+b(s)-h,v=-1;l>o&&v<a;){var c=l>>3;t[++v]=e.s[u=(u<<h|(r[c]|r[c+1]<<8|r[c+2]<<16)>>(7&l))&i],l-=h=e.n[u]}l==o&&v+1==a||f(0)},x=function(r,t,e){var n=6,a=t.length+3>>2,s=a<<1,i=a+s;T(r.subarray(n,n+=r[0]|r[1]<<8),t.subarray(0,a),e),T(r.subarray(n,n+=r[2]|r[3]<<8),t.subarray(a,s),e),T(r.subarray(n,n+=r[4]|r[5]<<8),t.subarray(s,i),e),T(r.subarray(n),t.subarray(i),e)},F=function(r,n,a){var s,u=n.b,h=r[u],l=h>>1&3;n.l=1&h;var v=h>>3|r[u+1]<<5|r[u+2]<<13,c=(u+=3)+v;if(1==l){if(u>=r.length)return;return n.b=u+1,a?(o(a,r[u],n.y,n.y+=v),a):o(new t(v),r[u])}if(!(c>r.length)){if(0==l)return n.b=c,a?(a.set(r.subarray(u,c),n.y),n.y+=v,a):i(r,u,c);if(2==l){var m=r[u],F=3&m,S=m>>2&3,B=m>>4,I=0,U=0;F<2?1&S?B|=r[++u]<<4|(2&S&&r[++u]<<12):B=m>>3:(U=S,S<2?(B|=(63&r[++u])<<4,I=r[u]>>6|r[++u]<<2):2==S?(B|=r[++u]<<4|(3&r[++u])<<12,I=r[u]>>2|r[++u]<<6):(B|=r[++u]<<4|(63&r[++u])<<12,I=r[u]>>6|r[++u]<<2|r[++u]<<10)),++u;var D=a?a.subarray(n.y,n.y+n.m):new t(n.m),M=D.length-B;if(0==F)D.set(r.subarray(u,u+=B),M);else if(1==F)o(D,r[u++],M);else{var W=n.h;if(2==F){var O=p(r,u);I+=u-(u=O[0]),n.h=W=O[1]}else W||f(0);(U?x:T)(r.subarray(u,u+=I),D.subarray(M),W)}var j=r[u++];if(j){255==j?j=32512+(r[u++]|r[u++]<<8):j>127&&(j=j-128<<8|r[u++]);var C=r[u++];3&C&&f(0);for(var H=[g,d,w],L=2;L>-1;--L){var Z=C>>2+(L<<1)&3;if(1==Z){var q=new t([0,0,r[u++]]);H[L]={s:q.subarray(2,3),n:q.subarray(0,1),t:new e(q.buffer,0,1),b:0}}else 2==Z?(u=(s=y(r,u,9-(1&L)))[0],H[L]=s[1]):3==Z&&(n.t||f(0),H[L]=n.t[L])}var G=n.t=H,J=G[0],K=G[1],N=G[2],P=r[c-1];P||f(0);var Q=(c<<3)-8+b(P)-N.b,R=Q>>3,V=0,X=(r[R]|r[R+1]<<8)>>(7&Q)&(1<<N.b)-1,Y=(r[R=(Q-=K.b)>>3]|r[R+1]<<8)>>(7&Q)&(1<<K.b)-1,$=(r[R=(Q-=J.b)>>3]|r[R+1]<<8)>>(7&Q)&(1<<J.b)-1;for(++j;--j;){var _=N.s[X],rr=N.n[X],tr=J.s[$],er=J.n[$],nr=K.s[Y],ar=K.n[Y],sr=1<<nr,ir=sr+((r[R=(Q-=nr)>>3]|r[R+1]<<8|r[R+2]<<16|r[R+3]<<24)>>>(7&Q)&sr-1);R=(Q-=k[tr])>>3;var or=A[tr]+((r[R]|r[R+1]<<8|r[R+2]<<16)>>(7&Q)&(1<<k[tr])-1);R=(Q-=z[_])>>3;var ur=E[_]+((r[R]|r[R+1]<<8|r[R+2]<<16)>>(7&Q)&(1<<z[_])-1);if(R=(Q-=rr)>>3,X=N.t[X]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<rr)-1),R=(Q-=er)>>3,$=J.t[$]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<er)-1),R=(Q-=ar)>>3,Y=K.t[Y]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<ar)-1),ir>3)n.o[2]=n.o[1],n.o[1]=n.o[0],n.o[0]=ir-=3;else{var hr=ir-(0!=ur);hr?(ir=3==hr?n.o[0]-1:n.o[hr],hr>1&&(n.o[2]=n.o[1]),n.o[1]=n.o[0],n.o[0]=ir):ir=n.o[0]}for(L=0;L<ur;++L)D[V+L]=D[M+L];M+=ur;var fr=(V+=ur)-ir;if(fr<0){var lr=-fr,vr=n.e+fr;for(lr>or&&(lr=or),L=0;L<lr;++L)D[V+L]=n.w[vr+L];V+=lr,or-=lr,fr=0}for(L=0;L<or;++L)D[V+L]=D[fr+L];V+=or}if(V!=M)for(;M<D.length;)D[V++]=D[M++];else V=D.length;a?n.y+=V:D=i(D,0,V)}else if(a){if(n.y+=B,M)for(L=0;L<B;++L)D[L]=D[M+L]}else M&&(D=i(D,M));return n.b=c,D}f(2)}},S=function(r,e){if(1==r.length)return r[0];for(var n=new t(e),a=0,s=0;a<r.length;++a){var i=r[a];n.set(i,s),s+=i.length}return n};function B(r,t){for(var e=[],n=+!t,a=0,s=0;r.length;){var i=c(r,n||t);if("object"==typeof i){for(n?(t=null,i.w.length==i.u&&(e.push(t=i.w),s+=i.u)):(e.push(t),i.e=0);!i.l;){var o=F(r,i,t);o||f(5),t?i.e=i.y:(e.push(o),s+=o.length,u(i.w,0,o.length),i.w.set(o,i.w.length-o.length))}a=i.b+4*i.c}else a=i;r=r.subarray(a)}return S(e,s)}_e.decompress=B;var I=function(){function r(r){this.ondata=r,this.c=[],this.l=0,this.z=0}return r.prototype.push=function(r,e){if("number"==typeof this.s){var n=Math.min(r.length,this.s);r=r.subarray(n),this.s-=n}var a=r.length+this.l;if(!this.s){if(e){if(!a)return void this.ondata(new t(0),!0);a<5&&f(5)}else if(a<18)return this.c.push(r),void(this.l=a);if(this.l&&(this.c.push(r),r=S(this.c,a),this.c=[],this.l=0),"number"==typeof(this.s=c(r)))return this.push(r,e)}if("number"!=typeof this.s){if(a<(this.z||3))return e&&f(5),this.c.push(r),void(this.l=a);if(this.l&&(this.c.push(r),r=S(this.c,a),this.c=[],this.l=0),!this.z&&a<(this.z=2&r[this.s.b]?4:3+(r[this.s.b]>>3|r[this.s.b+1]<<5|r[this.s.b+2]<<13)))return e&&f(5),this.c.push(r),void(this.l=a);for(this.z=0;;){var s=F(r,this.s);if(!s){e&&f(5);var i=r.subarray(this.s.b);return this.s.b=0,this.c.push(i),void(this.l+=i.length)}if(this.ondata(s,!1),u(this.s.w,0,s.length),this.s.w.set(s,this.s.w.length-s.length),this.s.l){var o=r.subarray(this.s.b);return this.s=4*this.s.c,void this.push(o,e)}}}else e&&f(5)},r}();_e.Decompress=I;return _e})
var fzstd = (typeof module.exports.decompress === 'function') ? module.exports : (typeof self !== 'undefined' && self.fzstd) || (typeof window !== 'undefined' && window.fzstd);
var g = typeof window !== 'undefined' ? window : globalThis;

/* ---------- HGPAK ---------- */
var CHUNK = 0x10000;
function u64(dv, o){ return dv.getUint32(o, true) + dv.getUint32(o+4, true) * 4294967296; }
function rup16(n){ return Math.ceil(n/16)*16; }
function Pak(name, size, read){ this.name = name; this.size = size; this.read = read; this.cache = new Map(); }
Pak.prototype.open = async function(){
  var h = await this.read(0, 0x30), dv = new DataView(h.buffer, h.byteOffset, h.byteLength);
  if(String.fromCharCode(h[0],h[1],h[2],h[3],h[4]) !== 'HGPAK') throw new Error(this.name + ' is not an HGPAK file');
  var ver = u64(dv, 8); if(ver !== 2) throw new Error(this.name + ' uses pack version ' + ver);
  var fc = u64(dv, 16), cc = u64(dv, 24); this.comp = !!h[32]; this.dataOff = u64(dv, 40);
  var idx = await this.read(0x30, fc*0x20 + (this.comp ? cc*8 : 0)); var di = new DataView(idx.buffer, idx.byteOffset, idx.byteLength);
  this.fo = new Array(fc); this.fs = new Array(fc);
  for(var i=0;i<fc;i++){ this.fo[i] = u64(di, i*0x20+16); this.fs[i] = u64(di, i*0x20+24); }
  if(this.comp){ this.cs = new Array(cc); this.co = new Array(cc); var p = this.dataOff;
    for(var c=0;c<cc;c++){ var s = u64(di, fc*0x20 + c*8); this.cs[c] = s; this.co[c] = p; p += rup16(s); } }
  var man = await this.span(this.comp ? 0 : this.dataOff, this.fs[0]);
  var txt = new TextDecoder().decode(man).replace(/[\r\n]+$/,''); var names = txt.split('\r\n');
  this.names = new Map(); for(var k=0;k<names.length;k++) if(names[k]) this.names.set(names[k].toLowerCase(), k+1);
  return this;
};
Pak.prototype.chunk = async function(c){
  if(this.cache.has(c)) return this.cache.get(c);
  return this.store(c, await this.read(this.co[c], this.cs[c]));
};
// Bytes [off, off+len) of the pack's data stream. Neighbouring chunks are fetched in one read.
Pak.prototype.span = async function(off, len){
  if(!this.comp) return this.read(off, len);
  var c0 = Math.floor(off / CHUNK), c1 = Math.floor((off + len - 1) / CHUNK), c;
  for(c = c0; c <= c1; c++){
    if(this.cache.has(c)) continue;
    var e = c; while(e+1 <= c1 && !this.cache.has(e+1) && (this.co[e+1] - this.co[c]) < 8*1048576) e++;
    var start = this.co[c], end = this.co[e] + this.cs[e], raw = await this.read(start, end - start);
    for(var k = c; k <= e; k++) this.store(k, raw.subarray(this.co[k] - start, this.co[k] - start + this.cs[k]));
    c = e;
  }
  var out = new Uint8Array(len), done = 0;
  for(c = c0; c <= c1; c++){ var ch = await this.chunk(c), at = c===c0 ? off % CHUNK : 0, n = Math.min(len - done, ch.length - at);
    if(n <= 0) throw new Error('pack data ended early'); out.set(ch.subarray(at, at+n), done); done += n; }
  return out;
};
Pak.prototype.store = function(c, raw){
  var out; if(this.cs[c] === CHUNK) out = raw; else { try { out = fzstd.decompress(raw); } catch(e){ if(raw.length===CHUNK) out = raw; else throw e; } }
  if(this.cache.size > 64) this.cache.delete(this.cache.keys().next().value);
  this.cache.set(c, out); return out;
};
Pak.prototype.has = function(path){ return this.names.has(path.toLowerCase()); };
Pak.prototype.file = async function(path){
  var i = this.names.get(path.toLowerCase()); if(i === undefined) return null;
  return this.span(this.comp ? this.fo[i] - this.dataOff : this.fo[i], this.fs[i]);
};

/* ---------- DDS ---------- */
var PART = 'A01100110011001BA00100010001000BA11101110111011BA00100110011011BA00000010001001BA01101110111111BA00100110111111BA00000010011011BA00000000001001BA01101111111111BA00000010111111BA00000000001011BA00101111111111BA00000001111111BA00011111111111BA00000000000111BA00010001110111BA1B1000100000000A0000000B0001110A1B1001100010000A0B1000100000000A0001000B1001110A0000000B0001100A11100110011000BA0B1000100010000A0001000B0001100A1B0011001100110A0B1011001101100A0010111B1101000A0001111B1110000A1B1000110001110A0B1100110011100A10101010101010BA00011110000111BA10110B001011010A0110011B1001100A0B1110000111100A1010101B0101010A11010010110100BA10110101010010BA1B1001111001110A0010011B1001000A0B1001001001100A0B1101111011100A1B0100110010110A01111001100001BA11001101001100BA00001B001100000A10011B001000000A0B0011100100000A00000B001110010A0000100B1100100A11011001001001BA01101101100100BA1B0001110011100A0B1100111000110A11011001100100BA11000110011100BA11111101000000BA00110001110011BA00011110011001BA0B1001111110000A0B0001011101110A10001000111011BA01B00110221222CA00B0011C2112221A0002001C211221BA22C00220011011BA0000000B122112CA01B00110022002CA02C00221111111BA0110011C211221BA0000000B111222CA0001111B111222CA00011B12222222CA01200B20012001CA11201B20112011CA1220B220122012CA01B01121122122CA01B2001C2002220A00B00110112112CA11B0011C0012200A0001122B122112CA02C00220022111BA11B01110222022CA00B0001C2212221A00000B10122012CA0001100C2B02210A12C0B2200110000A0120012B122222CA11012C1B2210110A00001B012C11221A0221102B102002CA1100B102002222CA011012201C2001BA0002000C211222BA0000002B122122CA22C00220012001BA01B00120022022CA1200B2001C00120A00011B122C20000A1201201C0B20120A1202012BC010120A011220011C2001BA01111C22200001BA10B01012222222CA0000000C121212BA0221B220022112CA02C00110022001BA22012C10220122BA10122C22222010BA0002121C121212BA10B01010101222CA22C01110222011BA0021B120002111CA0002B122112211CA2220B110111022CA0021112B112000CA1100B100110222CA000000021B2211CA1100B102222222CA022001100B1002CA0221122B122002CA000000000002B1CA00C00010002000BA22212220222B22CA10B22222222222CA11B2011C2012220';
var W2 = [0,21,43,64], W3 = [0,9,18,27,37,46,55,64], W4 = [0,4,9,13,17,21,26,30,34,38,43,47,51,55,60,64];
function lerp(a,b,w){ return ((64-w)*a + w*b + 32) >> 6; }
function bc7(src, o, out, stride, x0, y0, W, H){
  var pos = 0; function bits(n){ var v = 0; for(var i=0;i<n;i++){ var p = pos+i; v |= ((src[o+(p>>3)] >> (p&7)) & 1) << i; } pos += n; return v; }
  var mode = 0; while(mode < 8 && !bits(1)) mode++;
  var px, py, k;
  if(mode >= 8){ for(py=0;py<4;py++) for(px=0;px<4;px++){ var ox=x0+px, oy=y0+py; if(ox<W&&oy<H){ k=(oy*stride+ox)*4; out[k]=out[k+1]=out[k+2]=out[k+3]=0; } } return; }
  var CB = [4,6,5,7,5,7,7,5][mode], AB = [0,0,0,0,6,8,7,5][mode];
  var np = 1, part = 0, rot = 0, isb = 0;
  if(mode===0||mode===1||mode===2||mode===3||mode===7){ np = (mode===0||mode===2) ? 3 : 2; part = bits(mode===0 ? 4 : 6); }
  if(mode===4||mode===5){ rot = bits(2); if(mode===4) isb = bits(1); }
  var ne = np*2, e = [], i, j;
  for(j=0;j<ne;j++) e.push([0,0,0,255]);
  for(i=0;i<3;i++) for(j=0;j<ne;j++) e[j][i] = bits(CB);
  if(AB) for(j=0;j<ne;j++) e[j][3] = bits(AB);
  var hasP = (0xCB >> mode) & 1;
  if(mode===0||mode===1||mode===3||mode===6||mode===7){
    for(i=0;i<ne;i++) for(j=0;j<4;j++) e[i][j] <<= 1;
    if(mode===1){ var p0 = bits(1), p1 = bits(1); for(k=0;k<3;k++){ e[0][k]|=p0; e[1][k]|=p0; e[2][k]|=p1; e[3][k]|=p1; } }
    else if(hasP){ for(i=0;i<ne;i++){ var pb = bits(1); for(k=0;k<4;k++) e[i][k] |= pb; } }
  }
  for(i=0;i<ne;i++){ var cbits = CB + hasP; for(k=0;k<3;k++){ e[i][k] = (e[i][k] << (8-cbits)) & 255; e[i][k] |= e[i][k] >> cbits; }
    if(AB){ var abits = AB + hasP; e[i][3] = (e[i][3] << (8-abits)) & 255; e[i][3] |= e[i][3] >> abits; } else e[i][3] = 255; }
  var ib = (mode===0||mode===1) ? 3 : (mode===6 ? 4 : 2), ib2 = mode===4 ? 3 : (mode===5 ? 2 : 0);
  var wt = ib===2 ? W2 : ib===3 ? W3 : W4, wt2 = ib2===2 ? W2 : W3;
  var ps = [], idx = [], t;
  for(t=0;t<16;t++){ var ch = np===1 ? (t ? '0' : 'A') : PART.charAt(((np-2)*64 + part)*16 + t);
    var anchor = ch >= 'A'; var sub = anchor ? ch.charCodeAt(0)-65 : ch.charCodeAt(0)-48; ps.push(sub);
    idx.push(bits(anchor ? ib-1 : ib)); }
  for(t=0;t<16;t++){ var s = ps[t], a0 = e[s*2], a1 = e[s*2+1], ix = idx[t], r, gg, b, a;
    if(!ib2){ r = lerp(a0[0],a1[0],wt[ix]); gg = lerp(a0[1],a1[1],wt[ix]); b = lerp(a0[2],a1[2],wt[ix]); a = lerp(a0[3],a1[3],wt[ix]); }
    else { var ix2 = bits(t ? ib2 : ib2-1);
      if(!isb){ r = lerp(a0[0],a1[0],wt[ix]); gg = lerp(a0[1],a1[1],wt[ix]); b = lerp(a0[2],a1[2],wt[ix]); a = lerp(a0[3],a1[3],wt2[ix2]); }
      else { r = lerp(a0[0],a1[0],wt2[ix2]); gg = lerp(a0[1],a1[1],wt2[ix2]); b = lerp(a0[2],a1[2],wt2[ix2]); a = lerp(a0[3],a1[3],wt[ix]); } }
    if(rot===1){ var q=a; a=r; r=q; } else if(rot===2){ q=a; a=gg; gg=q; } else if(rot===3){ q=a; a=b; b=q; }
    var ox = x0 + (t&3), oy = y0 + (t>>2); if(ox<W && oy<H){ k = (oy*stride+ox)*4; out[k]=r; out[k+1]=gg; out[k+2]=b; out[k+3]=a; } }
}
function c565(v){ return [((v>>11)&31)*255/31|0, ((v>>5)&63)*255/63|0, (v&31)*255/31|0]; }
function bc1col(src, o, cols, opaque){
  var v0 = src[o]|src[o+1]<<8, v1 = src[o+2]|src[o+3]<<8, c0 = c565(v0), c1 = c565(v1);
  cols[0]=[c0[0],c0[1],c0[2],255]; cols[1]=[c1[0],c1[1],c1[2],255];
  if(v0 > v1 || opaque){ cols[2]=[(2*c0[0]+c1[0])/3|0,(2*c0[1]+c1[1])/3|0,(2*c0[2]+c1[2])/3|0,255]; cols[3]=[(c0[0]+2*c1[0])/3|0,(c0[1]+2*c1[1])/3|0,(c0[2]+2*c1[2])/3|0,255]; }
  else { cols[2]=[(c0[0]+c1[0])>>1,(c0[1]+c1[1])>>1,(c0[2]+c1[2])>>1,255]; cols[3]=[0,0,0,0]; }
}
function bcAlpha(src, o){ var a0 = src[o], a1 = src[o+1], t = [a0, a1];
  if(a0 > a1) for(var i=1;i<7;i++) t.push(((7-i)*a0 + i*a1)/7|0); else { for(i=1;i<5;i++) t.push(((5-i)*a0 + i*a1)/5|0); t.push(0,255); }
  var out = [], bitsv = 0, nb = 0, p = o+2; for(var n=0;n<16;n++){ if(nb < 3){ bitsv |= src[p++] << nb; nb += 8; } out.push(t[bitsv & 7]); bitsv >>= 3; nb -= 3; } return out; }
function blocks(src, off, W, H, bsz, fn){ var out = new Uint8ClampedArray(W*H*4), bw = Math.max(1, (W+3)>>2), bh = Math.max(1, (H+3)>>2), o = off;
  for(var by=0;by<bh;by++) for(var bx=0;bx<bw;bx++){ fn(src, o, out, W, bx*4, by*4, W, H); o += bsz; } return out; }
function put(out, stride, x0, y0, W, H, t, c){ var ox = x0+(t&3), oy = y0+(t>>2); if(ox<W && oy<H){ var k=(oy*stride+ox)*4; out[k]=c[0]; out[k+1]=c[1]; out[k+2]=c[2]; out[k+3]=c[3]; } }
var FMT = {
  bc1:[8, function(s,o,out,st,x,y,W,H){ var cols=[]; bc1col(s,o,cols,false); var ix = s[o+4]|s[o+5]<<8|s[o+6]<<16|s[o+7]<<24; for(var t=0;t<16;t++) put(out,st,x,y,W,H,t,cols[(ix>>>(2*t))&3]); }],
  bc2:[16, function(s,o,out,st,x,y,W,H){ var cols=[]; bc1col(s,o+8,cols,true); var ix = s[o+12]|s[o+13]<<8|s[o+14]<<16|s[o+15]<<24; for(var t=0;t<16;t++){ var c = cols[(ix>>>(2*t))&3].slice(); c[3] = ((s[o+(t>>1)] >> ((t&1)*4)) & 15) * 17; put(out,st,x,y,W,H,t,c); } }],
  bc3:[16, function(s,o,out,st,x,y,W,H){ var al = bcAlpha(s,o), cols=[]; bc1col(s,o+8,cols,true); var ix = s[o+12]|s[o+13]<<8|s[o+14]<<16|s[o+15]<<24; for(var t=0;t<16;t++){ var c = cols[(ix>>>(2*t))&3].slice(); c[3] = al[t]; put(out,st,x,y,W,H,t,c); } }],
  bc4:[8, function(s,o,out,st,x,y,W,H){ var r = bcAlpha(s,o); for(var t=0;t<16;t++) put(out,st,x,y,W,H,t,[r[t],r[t],r[t],255]); }],
  bc5:[16, function(s,o,out,st,x,y,W,H){ var r = bcAlpha(s,o), gg = bcAlpha(s,o+8); for(var t=0;t<16;t++) put(out,st,x,y,W,H,t,[r[t],gg[t],0,255]); }],
  bc7:[16, bc7]
};
var DXGI = {70:'bc1',71:'bc1',72:'bc1',73:'bc2',74:'bc2',75:'bc2',76:'bc3',77:'bc3',78:'bc3',79:'bc4',80:'bc4',82:'bc5',83:'bc5',97:'bc7',98:'bc7',99:'bc7',27:'rgba',28:'rgba',29:'rgba',87:'bgra',88:'bgra',90:'bgra',91:'bgra'};
var FOURCC = {DXT1:'bc1',DXT2:'bc2',DXT3:'bc2',DXT4:'bc3',DXT5:'bc3',ATI1:'bc4',BC4U:'bc4',ATI2:'bc5',BC5U:'bc5'};
// Decode one mip level of a DDS file. maxSide picks the first mip no bigger than it (icons are large; we only need ~128px).
function decodeDDS(b, maxSide){
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if(dv.getUint32(0,true) !== 0x20534444) throw new Error('not a DDS file');
  var H = dv.getUint32(12,true), W = dv.getUint32(16,true), mips = Math.max(1, dv.getUint32(28,true));
  var four = String.fromCharCode(b[84],b[85],b[86],b[87]), off = 128, fmt;
  if(four === 'DX10'){ fmt = DXGI[dv.getUint32(128,true)]; off = 148; }
  else if(FOURCC[four]) fmt = FOURCC[four];
  else if(dv.getUint32(88,true) === 32) fmt = dv.getUint32(92,true) === 0xff ? 'rgba' : 'bgra';
  if(!fmt) throw new Error('unsupported texture format ' + (four==='DX10' ? 'DXGI '+dv.getUint32(128,true) : JSON.stringify(four)));
  var lvl = 0, w = W, h = H;
  function lsize(w,h){ return FMT[fmt] ? Math.max(1,(w+3)>>2) * Math.max(1,(h+3)>>2) * FMT[fmt][0] : w*h*4; }
  while(maxSide && lvl < mips-1 && Math.max(w,h) > maxSide){ off += lsize(w,h); w = Math.max(1, w>>1); h = Math.max(1, h>>1); lvl++; }
  var px;
  if(FMT[fmt]) px = blocks(b, off, w, h, FMT[fmt][0], FMT[fmt][1]);
  else { px = new Uint8ClampedArray(w*h*4); for(var i=0;i<w*h;i++){ var s = off+i*4; if(fmt==='rgba'){ px[i*4]=b[s]; px[i*4+1]=b[s+1]; px[i*4+2]=b[s+2]; } else { px[i*4]=b[s+2]; px[i*4+1]=b[s+1]; px[i*4+2]=b[s]; } px[i*4+3]=b[s+3]; } }
  return { w: w, h: h, fmt: fmt, data: px };
}
g.GameIcons = { Pak: Pak, decodeDDS: decodeDDS, zstd: fzstd };
if(typeof module !== 'undefined' && g.__node_export) g.__node_export(g.GameIcons);
})();
