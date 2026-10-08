import json, sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
diffs=[]
def walk(x,y,path):
    if type(x)!=type(y): diffs.append((path,x,y)); return
    if isinstance(x,dict):
        for k in set(x)|set(y): walk(x.get(k),y.get(k),path+'/'+str(k))
    elif isinstance(x,list):
        if len(x)!=len(y): diffs.append((path,f'len {len(x)}',f'len {len(y)}'))
        for i,(p,q) in enumerate(zip(x,y)): walk(p,q,path+f'[{i}]')
    elif x!=y: diffs.append((path,x,y))
walk(a,b,'')
print('total diffs',len(diffs))
for d in diffs[:60]: print(d[0][:110],'|',repr(d[1])[:90],'=>',repr(d[2])[:90])
