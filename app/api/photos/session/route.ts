import {authorized,authError,photoHeaders,sessionCookie} from '../../../../lib/photo-auth.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!process.env.PHOTO_ADMIN_KEY)return Response.json({error:'Album non ancora configurato.'},{status:503,headers:photoHeaders});
 if(request.headers.get('origin')!==new URL(request.url).origin)return authError();
 let key;try{({key}=await request.json());}catch{return authError();}
 if(typeof key!=='string'||key.length>200)return authError();
 const check=new Request(request.url,{headers:{Authorization:'Bearer '+key}});
 if(!authorized(check,true))return authError();
 return Response.json({ok:true},{headers:{...photoHeaders,'Set-Cookie':`home-brief-album=${sessionCookie()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`}});
}
export async function DELETE(request:Request){if(!authorized(request,true))return authError();return Response.json({ok:true},{headers:{...photoHeaders,'Set-Cookie':'home-brief-album=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'}});}
