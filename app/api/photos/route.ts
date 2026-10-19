import {authorized,authError,photoHeaders} from '../../../lib/photo-auth.mjs';
import {allPhotos,addPhoto,maxUpload} from '../../../lib/photos.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request){if(!authorized(request))return authError();try{return Response.json({photos:await allPhotos()},{headers:photoHeaders});}catch{return Response.json({error:'Archivio foto non disponibile.'},{status:503,headers:photoHeaders});}}
export async function POST(request:Request){if(!authorized(request,true))return authError();
 if(Number(request.headers.get('content-length')||0)>maxUpload)return Response.json({error:'Riduci la foto sotto 4 MB prima di inviarla.'},{status:413,headers:photoHeaders});
 try{let input:Buffer;const type=request.headers.get('content-type')||'';
 if(type.startsWith('multipart/form-data')){const form=await request.formData(),file=form.get('photo');if(!(file instanceof File))throw Error('file');if(file.size>maxUpload)return Response.json({error:'La foto deve essere inferiore a 4 MB.'},{status:413,headers:photoHeaders});input=Buffer.from(await file.arrayBuffer());}
 else{if(!/^image\/(jpeg|png|webp|heic|heif)(;|$)/i.test(type))return Response.json({error:'Invia una foto JPEG, PNG o WebP.'},{status:415,headers:photoHeaders});const reader=request.body?.getReader();if(!reader)throw Error('empty');const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxUpload){await reader.cancel();return Response.json({error:'La foto deve essere inferiore a 4 MB.'},{status:413,headers:photoHeaders});}chunks.push(value);}input=Buffer.concat(chunks);}
 const fit=new URL(request.url).searchParams.get('fit')==='cover'?'cover':'contain';const photo=await addPhoto(input,fit);return Response.json({ok:true,photo},{status:201,headers:photoHeaders});
 }catch{return Response.json({error:'Caricamento non riuscito. Prova una foto JPEG/PNG inferiore a 4 MB; converti le foto HEIC in JPEG.'},{status:422,headers:photoHeaders});}}
