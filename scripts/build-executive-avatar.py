# NEXO · GUÍA DEL MÓDULO: scripts/build-executive-avatar.py
# Reconstruir vestuario del avatar local desde geometrías fuente.
# Entrada: GLB base, recursos descritos en docs/13 y NumPy.
# Salida: GLB de vestuario con geometría, pesos y texturas empaquetadas.
# Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
# ejecutar.
# Efectos y límites: ROOT es raíz; g construye JSON glTF; buf acumula binario. Herramienta de
# preparación, no parte de cada llamada.
# Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.

"""Rebuild the local wardrobe. Requires NumPy and the archives listed in docs/13-asesora-ejecutiva.md. Textures are embedded unchanged; tint is a material property."""
from pathlib import Path
import json,struct,sys,numpy as np
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'public/assets/recepcionista-3d.glb').read_bytes()
jlen=struct.unpack_from('<I',base,12)[0];basej=json.loads(base[20:20+jlen]);raw=base[28+jlen:]
def readacc(i):
 a=basej['accessors'][i];v=basej['bufferViews'][a['bufferView']];dtype={5126:'<f4',5123:'<u2',5121:'u1',5125:'<u4'}[a['componentType']];nc={'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']]
 return np.frombuffer(raw,dtype=dtype,count=a['count']*nc,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,nc)
a=basej['meshes'][0]['primitives'][0]['attributes'];bp=readacc(a['POSITION']);bj=readacc(a['JOINTS_0']);bw=readacc(a['WEIGHTS_0'])
ca=basej['meshes'][1]['primitives'][0]['attributes'];bp=np.concatenate([bp,readacc(ca['POSITION'])]);bj=np.concatenate([bj,readacc(ca['JOINTS_0'])]);bw=np.concatenate([bw,readacc(ca['WEIGHTS_0'])])
g={'asset':{'version':'2.0','generator':'Nexo: fitted MakeHuman assets'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'buffers':[{}],'materials':[],'images':[],'textures':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]};buf=bytearray()
def view(data):
 while len(buf)%4:buf.append(0)
 off=len(buf);buf.extend(data);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(data)});return len(g['bufferViews'])-1
def acc(data,ctype,typ):
 data=np.ascontiguousarray(data,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[ctype]);o={'bufferView':view(data.tobytes()),'componentType':ctype,'count':len(data),'type':typ}
 if typ=='VEC3':o.update(min=data.min(0).tolist(),max=data.max(0).tolist())
 g['accessors'].append(o);return len(g['accessors'])-1
def texture(path):
 g['images'].append({'bufferView':view(path.read_bytes()),'mimeType':'image/png'});g['textures'].append({'source':len(g['images'])-1,'sampler':0});return len(g['textures'])-1

def add(obj,tex,name,scale,offset,hair=False):
 vs=[];uvs=[];faces=[]
 for line in obj.read_text().splitlines():
  t=line.split()
  if not t:continue
  if t[0]=='v':vs.append(list(map(float,t[1:4])))
  elif t[0]=='vt':uvs.append(list(map(float,t[1:3])))
  elif t[0]=='f':
   f=[tuple(int(v)-1 for v in x.split('/')[:2]) for x in t[1:]]
   for i in range(1,len(f)-1):faces.append([f[0],f[i],f[i+1]])
 pos=np.array(vs)*scale+offset
 if hair:
  lower=pos[:,1]<1.55
  pos[lower,1]=1.55+(pos[lower,1]-1.55)*.75
  pos[lower,0]*=.94
 if not hair:
  # Bring the shirt collar in front of this avatar's wider neck.
  pos[:,2]+=np.clip((pos[:,1]-1.38)/.12,0,1)*.028
 uv=np.array(uvs);uv[:,1]=1-uv[:,1]
 # Smooth across UV seams, preserve the modeled folds.
 norm=np.zeros_like(pos)
 for f in faces:
  inds=[v[0] for v in f];tri=pos[inds];n=np.cross(tri[1]-tri[0],tri[2]-tri[0]);norm[inds]+=n
 norm/=np.maximum(1e-12,np.linalg.norm(norm,axis=1))[:,None]
 if hair:
  weights=np.zeros((len(pos),4));weights[:,0]=1;joints=np.zeros((len(pos),4),dtype=np.uint16);joints[:,0]=basej['skins'][0]['joints'].index(42)
 else:
  nearest=[]
  for i in range(0,len(pos),128):
   dist=((pos[i:i+128,None,:]-bp[None,:,:])**2).sum(2);nearest.extend(dist.argmin(1))
  joints=bj[nearest];weights=bw[nearest]
 mapping={};p=[];n=[];u=[];js=[];ws=[];indices=[]
 for f in faces:
  for vi,ti in f:
   key=(vi,ti)
   if key not in mapping:
    mapping[key]=len(p);p.append(pos[vi]);n.append(norm[vi]);u.append(uv[ti]);js.append(joints[vi]);ws.append(weights[vi])
   indices.append(mapping[key])
 mat={'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':texture(tex)},'metallicFactor':0,'roughnessFactor':.84},'doubleSided':True}
 if hair:
  mat.update(alphaMode='MASK',alphaCutoff=.38)
  mat['pbrMetallicRoughness']['baseColorFactor']=[.22,.23,.24,1]
 g['materials'].append(mat)
 attrs={'POSITION':acc(p,5126,'VEC3'),'NORMAL':acc(n,5126,'VEC3'),'TEXCOORD_0':acc(u,5126,'VEC2'),'JOINTS_0':acc(js,5123,'VEC4'),'WEIGHTS_0':acc(ws,5126,'VEC4')}
 g['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':acc(indices,5125,'SCALAR'),'material':len(g['materials'])-1}]});g['nodes'].append({'mesh':len(g['meshes'])-1,'name':name});g['scenes'][0]['nodes'].append(len(g['nodes'])-1)
 print(name,len(p),'bounds',pos.min(0),pos.max(0))
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/build-executive-avatar.py <extracted-source-directory>')
assets=Path(sys.argv[1]).resolve()
suit=assets/'clothes/toigo_female_suit'
add(suit/'fem_suit.obj',suit/'MHSuitsFem-diff.png','ExecutiveSuit',np.array([.10,.10,.10]),np.array([0,.925,0]))
hair=assets/'hair/elvs_hazel_hair'
add(hair/'elvs_hazel_hair.obj',hair/'elvs_hazel_hair_diffuse.png','ExecutiveHair',np.array([.1,.1,.1]),np.array([0,.995,.006]),True)
g['buffers'][0]['byteLength']=len(buf);s=json.dumps(g,separators=(',',':')).encode();s+=b' '*((-len(s))%4);buf+=b'\0'*((-len(buf))%4)
out=ROOT/'public/assets/asesora-ejecutiva.glb';out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(s)+len(buf))+struct.pack('<II',len(s),0x4e4f534a)+s+struct.pack('<II',len(buf),0x004e4942)+buf);print(out,len(buf))
