import {authorized,authError,photoHeaders} from '../../../../lib/photo-auth.mjs';
import {readPhoto} from '../../../../lib/photos.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){if(!authorized(request))return authError();try{const {id}=await params;const result=await readPhoto(id,new URL(request.url).searchParams.get('format')==='display');if(!result||result.statusCode!==200)return new Response(null,{status:404,headers:photoHeaders});return new Response(result.stream,{headers:{...photoHeaders,'Content-Type':result.blob.contentType}});}catch{return Response.json({error:'Foto non disponibile.'},{status:503,headers:photoHeaders});}}
