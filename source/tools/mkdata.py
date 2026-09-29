"""Rebuilds data/game.bundle.json.
Needs game.json / game.min.json (made from github.com/bradhave94/nms src/datav2) next to it and a clone of
that repo at SRC. Only needed when updating to new game data."""
import json
g=json.load(open('game.json')); m=json.load(open('game.min.json'))
def k(x): return (x['n'],x.get('g'),x.get('v'),x.get('c'),x.get('d'))
pos={k(x):i for i,x in enumerate(m['items'])}
ix={}; xi={}
for x in g['items']:
    i=pos.get(k(x))
    if i is not None: ix[x['id']]=i
    else: xi[x['id']]=[x['n'],x.get('g') or '',x.get('v') or 0,x.get('c') or '']
m['ix']=ix; m['xi']=xi
open('game.bundle.json','w',encoding='utf-8').write(json.dumps(m,separators=(',',':'),ensure_ascii=False))
print(len(ix),len(xi))

# ---- icon hints: kind, colour, element symbol (from the game data, no artwork)
import glob, os
SRC='/home/claude/bradhave94/nms/src/datav2/'
KIND={'RawMaterials':'r','Products':'p','Trade':'t','Curiosities':'c','Corvette':'v','Buildings':'b','Technology':'x','TechnologyModule':'x','ConstructedTechnology':'k','Upgrades':'u','Food':'f','Fish':'h','Exocraft':'x','Starships':'s','Others':'o'}
ic={}
for f,k in KIND.items():
    for x in json.load(open(SRC+f+'.json')):
        i=x.get('Id');
        if not i: continue
        nm=(x.get('Name') or '')+' '+(x.get('Group') or '')
        kk=k
        if k=='o' and 'Chart' in nm: kk='m'
        if 'Egg' in nm and k in 'o': kk='e'
        sym=x.get('Symbol') or ''
        if sym in ('-','∞') or len(sym)>5: sym=''
        col=(x.get('Colour') or '').upper()
        if not all(c in '0123456789ABCDEF' for c in col) or len(col)!=6: col=''
        e=[kk,col]
        if sym: e.append(sym)
        ic.setdefault(i,e)
m['ic']=ic
open('game.bundle.json','w',encoding='utf-8').write(json.dumps(m,separators=(',',':'),ensure_ascii=False))
import collections
print('icons',len(ic), collections.Counter(v[0] for v in ic.values()), sum(1 for v in ic.values() if len(v)>2), sum(1 for v in ic.values() if not v[1]))
