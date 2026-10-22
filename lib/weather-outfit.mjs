import {weather} from './live-sources.mjs';
import {outfitService} from './outfit.mjs';
export async function weatherWithOutfit(options={}){const forecast=await weather();return {...forecast,outfit:await outfitService(forecast,options)};}
