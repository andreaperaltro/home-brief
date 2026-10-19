export const dynamic='force-dynamic';
import { weather } from '../../../lib/live-sources.mjs';
export async function GET(){try{return Response.json(await weather(),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Meteo non disponibile. Riprova tra qualche minuto.'},{status:502,headers:{'Cache-Control':'no-store'}});}}
