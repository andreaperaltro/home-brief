export const dynamic='force-dynamic';
import { weatherWithOutfit } from '../../../lib/weather-outfit.mjs';
import {authorized} from '../../../lib/photo-auth.mjs';
export const maxDuration=60;
export async function GET(request:Request){try{return Response.json(await weatherWithOutfit({allowGenerate:authorized(request)}),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Meteo non disponibile. Riprova tra qualche minuto.'},{status:502,headers:{'Cache-Control':'no-store'}});}}
