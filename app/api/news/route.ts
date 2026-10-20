export const dynamic='force-dynamic';
import {news} from '../../../lib/live-sources.mjs';
import {addNewsQR} from '../../../lib/news-links.mjs';
export async function GET(request:Request){try{const result=await news(),items=await addNewsQR(result.news,new URL(request.url).origin);return Response.json({...result,news:items,qrPartial:items.some(n=>n.url&&!n.qr)},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Notizie non disponibili. Riprova tra qualche minuto.'},{status:502,headers:{'Cache-Control':'no-store'}});}}
