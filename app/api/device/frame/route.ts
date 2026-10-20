import {authorized,authError,photoHeaders} from '../../../../lib/photo-auth.mjs';
import {displaySchedule} from '../../../../lib/display-schedule.mjs';
import {allPhotos,photoForDay,readPhoto} from '../../../../lib/photos.mjs';
import {packImage,frameHash,nextCheck} from '../../../../lib/device-frame.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(request:Request){
 if(!authorized(request))return authError();
 const now=new Date(),schedule=displaySchedule(now),forced=new URL(request.url).searchParams.get('mode');
 const mode=forced==='brief'||forced==='photo'?forced:schedule.mode;
 try{
 let body:Buffer;
 if(mode==='brief'){const {cachedBrief}=await import('../../../../lib/render-brief.mjs');body=await cachedBrief(now);}
 else{const id=await photoForDay(schedule,await allPhotos());if(!id)return Response.json({error:'Aggiungi una foto all’album.'},{status:404,headers:photoHeaders});const photo=await readPhoto(id,true);if(photo?.statusCode!==200)throw Error('Photo unavailable');body=await packImage(Buffer.from(await new Response(photo.stream).arrayBuffer()));}
 const hash=frameHash(body),etag='"'+hash+'"',headers={...photoHeaders,'Content-Type':'application/octet-stream','X-Frame-SHA256':hash,'X-Frame-Mode':mode,'X-Frame-Width':'1200','X-Frame-Height':'1600','X-Next-Check':String(nextCheck(now)),ETag:etag};
 if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
 return new Response(new Uint8Array(body),{headers:{...headers,'Content-Length':String(body.length)}});
 }catch(error){console.error('Device frame unavailable',error instanceof Error?error.name:'Error');return Response.json({error:'Immagine non disponibile. Il quadro conserva quella precedente.'},{status:503,headers:photoHeaders});}
}
