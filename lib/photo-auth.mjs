import {createHmac,timingSafeEqual} from 'node:crypto';
export const photoHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
function same(a,b){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function sign(value){return createHmac('sha256',process.env.PHOTO_ADMIN_KEY||'').update(value).digest('base64url');}
export function sessionCookie(){const value=String(Date.now()+30*86400000);return value+'.'+sign(value);}
export function authorized(request,write=false){
 const admin=process.env.PHOTO_ADMIN_KEY;if(!admin)return false;
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(same(bearer,admin)||(!write&&same(bearer,process.env.PHOTO_DISPLAY_KEY)))return true;
 const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('home-brief-album='))?.slice('home-brief-album='.length)||'';
 if(!cookie)return false;const [expiry,signature]=cookie.split('.');if(!expiry||!signature)return false;
 const valid=Number(expiry)>Date.now()&&same(signature,sign(expiry));
 // Cookie mutations must originate on this site. Bearer uploads (Shortcuts) are exempt.
 const origin=request.headers.get('origin');
 return Boolean(valid&&(!write||origin===new URL(request.url).origin));
}
export function authError(){return Response.json({error:'Accedi con la chiave dell’album.'},{status:401,headers:photoHeaders});}
