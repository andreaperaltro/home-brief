import {createHash} from 'node:crypto';
import {get,put} from '@vercel/blob';
import QRCode from 'qrcode';
const registered=new Set();
export function safeNewsURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='ansa.it'||u.hostname.endsWith('.ansa.it'))?u.href:null;}catch{return null;}}
export const validNewsId=id=>/^[a-f0-9]{20}$/.test(id);
export const newsLinkId=url=>createHash('sha256').update(url).digest('hex').slice(0,20);
export function newsQR(url){const code=QRCode.create(url,{errorCorrectionLevel:'M'});return {size:code.modules.size,modules:Array.from(code.modules.data).join('')};}
export async function registerNewsLink(url,storage={get,put}){const safe=safeNewsURL(url);if(!safe)throw Error('Invalid news URL');const id=newsLinkId(safe),path='news-links/'+id+'.json';if(storage.get===get&&registered.has(id))return id;
 try{await storage.put(path,JSON.stringify({url:safe}),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',abortSignal:AbortSignal.timeout(3000)});}catch(e){const existing=await storage.get(path,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(3000)});if(existing?.statusCode!==200||(await new Response(existing.stream).json()).url!==safe)throw e;}
 if(storage.get===get){if(registered.size>=1000)registered.clear();registered.add(id);}return id;
}
export async function resolveNewsLink(id,storage={get}){if(!validNewsId(id))return null;const result=await storage.get('news-links/'+id+'.json',{access:'private',abortSignal:AbortSignal.timeout(3000)});if(!result||result.statusCode!==200)return null;const data=await new Response(result.stream).json();const safe=safeNewsURL(data.url);return safe&&newsLinkId(safe)===id?safe:null;}
export async function addNewsQR(items,origin){const configured=Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN);return Promise.all(items.map(async item=>{if(!item.url||!configured)return {...item,qr:null};try{const id=await registerNewsLink(item.url),path='/n/'+id;return {...item,shortUrl:path,qr:newsQR(new URL(path,origin).href)};}catch{return {...item,qr:null};}}));}
