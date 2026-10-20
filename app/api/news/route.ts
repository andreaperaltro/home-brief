export const dynamic='force-dynamic';
import {news} from '../../../lib/live-sources.mjs';
export async function GET(){try{return Response.json(await news(),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Notizie non disponibili. Riprova tra qualche minuto.'},{status:502,headers:{'Cache-Control':'no-store'}});}}
