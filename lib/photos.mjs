import {get,list,put,del} from '@vercel/blob';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
export const maxUpload=4_000_000;
export const validPhotoId=id=>/^\d{13}-[0-9a-f-]{36}$/.test(id);
export async function allPhotos(){let cursor;const photos=[];do{const page=await list({prefix:'photos/',limit:1000,...(cursor?{cursor}:{})});photos.push(...page.blobs.filter(b=>b.pathname.endsWith('.jpg')).map(b=>({id:b.pathname.slice(7,-4),createdAt:b.uploadedAt.toISOString()})));cursor=page.hasMore?page.cursor:undefined;}while(cursor);return photos.sort((a,b)=>a.id.localeCompare(b.id));}
// Digital reference palette. Physical pigment calibration is a separate device step.
export const palette=[[0,0,0],[255,255,255],[255,0,0],[255,255,0],[0,0,255],[0,255,0]];
export function sixColors(pixels,width,height){const errors=new Float32Array((width+2)*3*2),out=Buffer.alloc(width*height*3);let row=0;
 for(let y=0;y<height;y++){const next=1-row;errors.fill(0,next*(width+2)*3,(next+1)*(width+2)*3);for(let x=0;x<width;x++){const i=(y*width+x)*3,offset=(row*(width+2)+x+1)*3;const c=[0,1,2].map(k=>Math.max(0,Math.min(255,pixels[i+k]+errors[offset+k])));let best=palette[0],distance=Infinity;for(const p of palette){const d=c.reduce((sum,v,k)=>sum+(v-p[k])**2,0);if(d<distance){distance=d;best=p;}}for(let k=0;k<3;k++){out[i+k]=best[k];const e=c[k]-best[k];errors[offset+3+k]+=e*7/16;const b=(next*(width+2)+x)*3+k;errors[b]+=e*3/16;errors[b+3]+=e*5/16;errors[b+6]+=e/16;}}row=next;}return out;}
export async function preparePhoto(input,fit='contain'){
 const image=sharp(input,{limitInputPixels:40_000_000,animated:false}).rotate().resize(1200,1600,{fit,background:'#ffffff'}).flatten({background:'#ffffff'}).toColourspace('srgb');
 const {data,info}=await image.clone().removeAlpha().raw().toBuffer({resolveWithObject:true});
 const jpeg=await image.jpeg({quality:90}).toBuffer();
 const png=await sharp(sixColors(data,info.width,info.height),{raw:{width:info.width,height:info.height,channels:3}}).png().toBuffer();
 return {jpeg,png};
}
export async function addPhoto(input,fit){const {jpeg,png}=await preparePhoto(input,fit),id=Date.now()+'-'+randomUUID();const saved=[];try{for(const [extension,body,contentType] of [['jpg',jpeg,'image/jpeg'],['png',png,'image/png']]){const result=await put('photos/'+id+'.'+extension,body,{access:'private',addRandomSuffix:false,contentType});saved.push(result.url);}}catch(e){if(saved.length)await del(saved).catch(()=>{});throw e;}return {id,createdAt:new Date().toISOString()};}
export async function readPhoto(id,display=false){if(!validPhotoId(id))return null;return get('photos/'+id+(display?'.png':'.jpg'),{access:'private'});}
export async function photoForDay(schedule,photos){if(!photos.length)return null;const path='days/'+schedule.photoDate+'.json';const prior=await get(path,{access:'private',useCache:false});if(prior?.statusCode===200){const saved=await new Response(prior.stream).json();if(photos.some(p=>p.id===saved.id))return saved.id;}
 const id=photos[((schedule.dayIndex%photos.length)+photos.length)%photos.length].id;
 // An immutable daily choice prevents new uploads from changing today's photo.
 try{await put(path,JSON.stringify({id}),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});}catch(e){const winner=await get(path,{access:'private',useCache:false});if(winner?.statusCode===200){const saved=await new Response(winner.stream).json();if(photos.some(p=>p.id===saved.id))return saved.id;}throw e;}
 return id;
}
