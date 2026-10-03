/* NMS Save Tracker: save tools (opt-in, hidden by default).
   Low-level pieces for editing a No Man's Sky save without disturbing anything
   that wasn't changed:
   - the save text is kept as raw bytes (one character per byte), so names in
     any language and odd bytes come back exactly as they were;
   - edits replace only the exact span of the value that changed;
   - the result is packed with LZ4 and the mf_ manifest is updated to match.
   Works in the browser and in Node (for tests). */
const SaveTools = (() => {
  const MAGIC = 0xFEEDA1E5, MF_MAGIC = 0xEEEEEEBE, CHUNK = 0x80000;

  /* ---------- bytes <-> one-char-per-byte text ---------- */
  function bytesToText(u8){ let s = ''; for(let i=0; i<u8.length; i+=8192) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(u8.length, i+8192))); return s; }
  function textToBytes(s){ const u = new Uint8Array(s.length); for(let i=0; i<s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  // A raw (byte) string read from the save, shown as normal text.
  function rawToStr(s){ try { return new TextDecoder('utf-8').decode(textToBytes(s)); } catch(e){ return s; } }
  // Normal text to the raw form used inside the save.
  function strToRaw(s){ return bytesToText(new TextEncoder().encode(s)); }

  /* ---------- LZ4 ---------- */
  function lz4Dec(src, s, e, dst, o){
    let i = s;
    while(i < e){
      const tok = src[i++]; let lit = tok >> 4;
      if(lit === 15){ let b; do { b = src[i++]; lit += b; } while(b === 255); }
      for(let k=0; k<lit; k++) dst[o++] = src[i++];
      if(i >= e) break;
      const off = src[i] | (src[i+1] << 8); i += 2;
      let ml = tok & 15; if(ml === 15){ let b; do { b = src[i++]; ml += b; } while(b === 255); }
      ml += 4; let m = o - off; for(let k=0; k<ml; k++) dst[o++] = dst[m++];
    }
    return o;
  }
  // LZ4 block compressor (greedy, 64K window). Output is a standard LZ4 block.
  function lz4Enc(src){
    const n = src.length, out = new Uint8Array(n + (n/255|0) + 64); let op = 0;
    const HB = 16, table = new Int32Array(1 << HB).fill(-1);
    const r32 = p => (src[p] | (src[p+1]<<8) | (src[p+2]<<16) | (src[p+3]<<24)) >>> 0;
    const hash = v => Math.imul(v, 2654435761) >>> (32 - HB);
    const lenOut = l => { while(l >= 255){ out[op++] = 255; l -= 255; } out[op++] = l; };
    let anchor = 0, ip = 0; const mflimit = n - 12, matchlimit = n - 5;
    while(ip < mflimit){
      const v = r32(ip), h = hash(v); let ref = table[h]; table[h] = ip;
      if(ref < 0 || ip - ref > 65535 || r32(ref) !== v){ ip++; continue; }
      let len = 4; while(ip + len < matchlimit && src[ref+len] === src[ip+len]) len++;
      while(ip > anchor && ref > 0 && src[ip-1] === src[ref-1]){ ip--; ref--; len++; }
      const lit = ip - anchor, ml = len - 4;
      out[op++] = ((lit >= 15 ? 15 : lit) << 4) | (ml >= 15 ? 15 : ml);
      if(lit >= 15) lenOut(lit - 15);
      out.set(src.subarray(anchor, ip), op); op += lit;
      const off = ip - ref; out[op++] = off & 255; out[op++] = off >> 8;
      if(ml >= 15) lenOut(ml - 15);
      ip += len; anchor = ip;
      if(ip - 2 >= 0 && ip - 2 < mflimit) table[hash(r32(ip-2))] = ip - 2;
    }
    const lit = n - anchor;
    out[op++] = (lit >= 15 ? 15 : lit) << 4; if(lit >= 15) lenOut(lit - 15);
    out.set(src.subarray(anchor, n), op); op += lit;
    return out.subarray(0, op);
  }
  // save.hg bytes -> raw bytes of the JSON (trailing zero bytes kept)
  function unpack(buf){
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if(u8.length < 16 || dv.getUint32(0, true) !== MAGIC) return { raw: u8.slice(), chunks: 0 };
    let total = 0, p = 0, chunks = 0;
    while(p + 16 <= u8.length){ total += dv.getUint32(p+8, true); p += 16 + dv.getUint32(p+4, true); chunks++; }
    const out = new Uint8Array(total); let o = 0; p = 0;
    while(p + 16 <= u8.length){
      if(dv.getUint32(p, true) !== MAGIC) throw new Error('Unexpected data in save file');
      const cs = dv.getUint32(p+4, true), us = dv.getUint32(p+8, true);
      const w = lz4Dec(u8, p+16, p+16+cs, out, o); if(w - o !== us) throw new Error('Save chunk did not unpack cleanly');
      o = w; p += 16 + cs;
    }
    return { raw: out, chunks };
  }
  function pack(raw){
    const parts = []; let total = 0;
    for(let p=0; p<raw.length; p+=CHUNK){
      const piece = raw.subarray(p, Math.min(raw.length, p+CHUNK)); const c = lz4Enc(piece);
      const h = new Uint8Array(16); const dv = new DataView(h.buffer);
      dv.setUint32(0, MAGIC, true); dv.setUint32(4, c.length, true); dv.setUint32(8, piece.length, true); dv.setUint32(12, 0, true);
      parts.push(h, c); total += 16 + c.length;
    }
    const out = new Uint8Array(total); let o = 0; parts.forEach(x => { out.set(x, o); o += x.length; });
    // check it unpacks to exactly the same bytes before anything is written
    const back = unpack(out).raw; if(back.length !== raw.length) throw new Error('Packing check failed (size)');
    for(let i=0; i<raw.length; i++) if(back[i] !== raw[i]) throw new Error('Packing check failed at byte ' + i);
    return out;
  }

  /* ---------- mf_ manifest (XXTEA) ---------- */
  const DELTA = 0x9E3779B9;
  const rol = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  function keyFor(idx){ const k = [0x5345414E, 0x44415645, 0x5259414E, 0x47524E54]; // 'NAESEVADNAYRTNRG'
    k[0] = (Math.imul(rol((idx ^ 0x1422CB8C) >>> 0, 13), 5) + 0xE6546B64) >>> 0; return k; }
  function mx(s, y, z, p, e, k){ return ((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^ ((s ^ y) + (k[(p & 3) ^ e] ^ z))) >>> 0; }
  function mfDecrypt(bytes, idx){
    const n = bytes.length >> 2, dv = new DataView(bytes.buffer, bytes.byteOffset, n*4), v = new Uint32Array(n);
    for(let i=0; i<n; i++) v[i] = dv.getUint32(i*4, true);
    const k = keyFor(idx), rounds = 6 + ((52 / n) | 0); let s = Math.imul(rounds, DELTA) >>> 0;
    for(let r=0; r<rounds; r++){ const e = (s >>> 2) & 3;
      for(let p=n-1; p>=0; p--){ const z = v[p > 0 ? p-1 : n-1], y = v[(p+1) % n]; v[p] = (v[p] - mx(s, y, z, p, e, k)) >>> 0; }
      s = (s - DELTA) >>> 0; }
    return v;
  }
  function mfEncrypt(v, idx){
    v = Uint32Array.from(v); const n = v.length, k = keyFor(idx), rounds = 6 + ((52 / n) | 0); let s = 0;
    for(let r=0; r<rounds; r++){ s = (s + DELTA) >>> 0; const e = (s >>> 2) & 3;
      for(let p=0; p<n; p++){ const y = v[(p+1) % n], z = v[p > 0 ? p-1 : n-1]; v[p] = (v[p] + mx(s, y, z, p, e, k)) >>> 0; } }
    const out = new Uint8Array(n*4), dv = new DataView(out.buffer); for(let i=0; i<n; i++) dv.setUint32(i*4, v[i], true); return out;
  }
  // Works out which slot key a manifest uses (save.hg = 2, save2.hg = 3, ...), checking the magic number.
  function mfOpen(bytes, hint){
    const tries = [hint].concat(Array.from({length:40}, (_, i) => i)).filter(x => x !== undefined && x !== null);
    for(const idx of tries){ const v = mfDecrypt(bytes, idx); if(v[0] === MF_MAGIC) return { idx, v }; }
    throw new Error('Could not read the save\'s manifest file');
  }
  function mfIndexFor(name){ const m = /^save(\d*)\.hg$/.exec(name); if(!m) return name === 'accountdata.hg' ? 0 : null; return m[1] ? (+m[1]) + 1 : 2; }
  function mfUpdate(mf, rawLen, packedLen, stamp){ const v = Uint32Array.from(mf.v); v[14] = rawLen; v[21] = rawLen; v[15] = packedLen; if(stamp) v[89] = stamp >>> 0; return mfEncrypt(v, mf.idx); }

  /* ---------- finding the exact text of one value ---------- */
  function ws(t, i){ for(;;){ const c = t.charCodeAt(i); if(c === 32 || c === 9 || c === 10 || c === 13) i++; else return i; } }
  function skipStr(t, i){ i++; for(;;){ const c = t.charCodeAt(i); if(c === 34) return i+1; if(c === 92) i += 2; else if(i >= t.length) throw new Error('Unterminated string'); else i++; } }
  function skipVal(t, i){
    i = ws(t, i); const c = t.charCodeAt(i);
    if(c === 34) return skipStr(t, i);
    if(c === 123 || c === 91){ let d = 0;
      for(;;){ const ch = t.charCodeAt(i);
        if(ch === 34){ i = skipStr(t, i); continue; }
        if(ch === 123 || ch === 91) d++; else if(ch === 125 || ch === 93){ d--; if(d === 0) return i+1; }
        else if(i >= t.length) throw new Error('Unterminated value');
        i++; } }
    while(i < t.length){ const ch = t.charCodeAt(i); if(ch === 44 || ch === 125 || ch === 93 || ch === 32 || ch === 10 || ch === 13 || ch === 9) break; i++; }
    return i;
  }
  // Returns {s, e} (start and end) of the value at path, e.g. ['vLc','6f=','wGS'] or [..,'GQA',12,'NKm'].
  function locate(t, path, from){
    let i = ws(t, from || 0);
    for(const step of path){
      const c = t.charCodeAt(i);
      if(c === 123){ i = ws(t, i+1); let found = false;
        while(t.charCodeAt(i) !== 125){
          const ke = skipStr(t, i); const key = t.slice(i+1, ke-1); i = ws(t, ke); if(t.charCodeAt(i) !== 58) throw new Error('Bad save text near ' + i); i = ws(t, i+1);
          if(key === String(step)){ found = true; break; }
          i = ws(t, skipVal(t, i)); if(t.charCodeAt(i) === 44) i = ws(t, i+1);
        }
        if(!found) return null;
      } else if(c === 91){ i = ws(t, i+1); let k = 0; const want = +step;
        while(t.charCodeAt(i) !== 93){ if(k === want) break; i = ws(t, skipVal(t, i)); if(t.charCodeAt(i) === 44) i = ws(t, i+1); k++; }
        if(t.charCodeAt(i) === 93) return null;
      } else return null;
    }
    return { s: i, e: skipVal(t, i) };
  }
  // Start/end of every element of the array at path.
  function elements(t, path){ const sp = locate(t, path); if(!sp || t.charCodeAt(sp.s) !== 91) return null; const out = []; let i = ws(t, sp.s+1);
    while(t.charCodeAt(i) !== 93){ const e = skipVal(t, i); out.push({ s: i, e }); i = ws(t, e); if(t.charCodeAt(i) === 44) i = ws(t, i+1); }
    return out; }
  // Apply [{s, e, text}] edits (must not overlap). Returns the new text.
  function applyEdits(t, edits){
    const ed = edits.slice().sort((a,b) => a.s - b.s);
    for(let i=1; i<ed.length; i++) if(ed[i].s < ed[i-1].e) throw new Error('Two changes touch the same part of the save. Write the first one, then make the other.');
    let out = '', p = 0; ed.forEach(x => { out += t.slice(p, x.s) + x.text; p = x.e; }); return out + t.slice(p);
  }
  // A JSON literal for a new value, keeping the original's style (e.g. 1.0 stays a decimal).
  function literal(v, orig){
    if(typeof v === 'string') return strToRaw(JSON.stringify(v));
    if(typeof v === 'number'){ if(!isFinite(v)) throw new Error('Not a number');
      const dec = orig && /[.eE]/.test(orig); let s = String(v); if(dec && Number.isInteger(v)) s = v.toFixed(1); return s; }
    if(typeof v === 'boolean' || v === null) return String(v);
    return strToRaw(JSON.stringify(v));
  }
  // Parse the JSON part (without trailing zero bytes).
  function parse(t){ let e = t.length; while(e > 0 && t.charCodeAt(e-1) === 0) e--; return JSON.parse(e === t.length ? t : t.slice(0, e)); }

  return { bytesToText, textToBytes, rawToStr, strToRaw, lz4Enc, unpack, pack, mfDecrypt, mfEncrypt, mfOpen, mfIndexFor, mfUpdate, locate, elements, applyEdits, literal, parse, skipVal, MF_MAGIC };
})();
if(typeof module !== 'undefined') module.exports = SaveTools;
