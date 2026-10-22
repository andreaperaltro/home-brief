import {get,put} from '@vercel/blob';

const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
export function outfitConditions(weather){
 const w=weather.outfitWeather||{};
 const low=finite(w.feelsMin,-70,65)??finite(w.minTemp,-70,65)??finite(Number(weather.low),-70,65);
 const high=finite(w.feelsMax,-70,65)??finite(w.maxTemp,-70,65)??finite(Number(weather.high),-70,65);
 if(low===null||high===null||low>high)return null;
 const wind=finite(w.windMax,0,300),gust=finite(w.gustMax,0,400);
 const rainChance=finite(w.rainChance,0,100),rainMm=finite(w.rainMm,0,1000);
 return {low:Math.round(low),high:Math.round(high),perceived:finite(w.feelsMin,-70,65)!==null&&finite(w.feelsMax,-70,65)!==null,wind,gust,rain:rainChance!==null&&rainChance>=40||rainMm!==null&&rainMm>=.5,snow:w.snow===true,storm:w.storm===true,remaining:w.remaining===true};
}
export function outfitPlan(c){
 if(!c)return null;
 const t=c.high,wind=Math.max(c.wind||0,c.gust||0),items=[];
 if(t<=5)items.push('maglia termica, maglione e piumino','sciarpa e guanti');
 else if(t<=12)items.push('maglia a maniche lunghe, maglione e giacca imbottita');
 else if(t<=19)items.push('camicia o maglia a maniche lunghe e giacca leggera');
 else if(t<=25)items.push('maglia leggera e pantaloni leggeri');
 else items.push('capi leggeri e traspiranti');
 if(c.low<10&&t>12)items.push('uno strato caldo per le ore più fresche');
 else if(c.low<17&&t>=20)items.push('una giacca leggera per le ore più fresche');
 if(wind>=25){items.push('uno strato antivento');if(c.low<15&&t>5)items.push('una sciarpa leggera');}
 if(c.snow)items.push('scarpe impermeabili con buona aderenza');
 else if(c.rain)items.push('scarpe resistenti all’acqua');
 if(c.rain)items.push(wind>=40||c.storm?'un impermeabile con cappuccio':'un ombrello compatto');
 return items;
}
export function fallbackOutfit(c){
 const items=outfitPlan(c);if(!items)return {text:'Consiglio disponibile con le prossime previsioni complete.',source:'unavailable'};
 // Short, complete sentences; prioritise the main layers and rain/wind protection.
 const sentences=[items[0][0].toUpperCase()+items[0].slice(1)+'.'];
 const extras=items.slice(1);if(extras.length)sentences.push('Aggiungi '+extras.join(', ')+'.');
 let text=sentences.join(' ');
 if(text.length>210){const compact=[items[0],...extras.filter(x=>/impermeabile|ombrello|sciarpa|antivento/.test(x))];text=compact.join('; ')+'.';text=text[0].toUpperCase()+text.slice(1);}
 if(text.length>210)text=items[0][0].toUpperCase()+items[0].slice(1)+'. '+(c.rain?'Porta un impermeabile con cappuccio.':'Porta uno strato in più per le ore fresche.');
 return {text,source:'rules'};
}
export function validOutfit(text){return typeof text==='string'&&text.length>=20&&text.length<=210&&!/[<>\n\r]|https?:|\d/.test(text);}
function signature(c){return JSON.stringify({low:Math.floor(c.low/3),high:Math.floor(c.high/3),windy:Math.max(c.wind||0,c.gust||0)>=25,strongWind:Math.max(c.wind||0,c.gust||0)>=40,rain:c.rain,snow:c.snow,storm:c.storm,remaining:c.remaining});}
export async function generateOutfit(c){
 const {generateText,Output,jsonSchema}=await import('ai');
 const result=await generateText({model:process.env.OUTFIT_AI_MODEL||'nvidia/nemotron-3.5-lightning-free',reasoning:'none',maxOutputTokens:256,maxRetries:0,timeout:15000,
  output:Output.object({schema:jsonSchema({type:'object',properties:{text:{type:'string',minLength:20,maxLength:210}},required:['text'],additionalProperties:false})}),
  system:'Scrivi un consiglio pratico di abbigliamento in italiano per una giornata quotidiana all’aperto. Usa solo i dati e i capi proposti. Due frasi brevi, massimo 210 caratteri totali. Cita capi concreti, strati e accessori, senza elenchi, marche, genere, numeri, previsioni inventate o riferimenti alla persona. Non ripetere le temperature. Non promettere protezione da condizioni estreme. Non proporre ombrelli con vento forte o temporali. Non aggiungere sciarpe se non sono fra i capi proposti.',
  prompt:JSON.stringify({meteo:c,capiProposti:outfitPlan(c)})});
 const text=result.output?.text?.trim();if(!validOutfit(text))throw Error('Invalid outfit output');
 console.info('Outfit AI generated',{model:result.response.modelId,inputTokens:result.usage.inputTokens,outputTokens:result.usage.outputTokens});return text;
}
export function createOutfitService({storage={get,put},generate=generateOutfit,enabled=()=>process.env.OUTFIT_AI_ENABLED!=='false'&&Boolean(process.env.VERCEL||process.env.AI_GATEWAY_API_KEY),now=()=>new Date()}={}){
 return async function outfit(weather,{allowGenerate=false}={}){
  const c=outfitConditions(weather),fallback=fallbackOutfit(c);if(!c)return fallback;
  const current=now(),parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(current).map(p=>[p.type,p.value]));
  const date=`${parts.year}-${parts.month}-${parts.day}`;if(weather.date!==date)return {text:'Consiglio in attesa delle previsioni di oggi.',source:'unavailable'};
  const slot=Math.floor(Number(parts.hour)/6),key='outfit/current-'+slot+'.json',conditionKey=signature(c);let prior;
  try{
   prior=await storage.get(key,{access:'private',useCache:false});
   if(prior?.statusCode===200){const saved=await new Response(prior.stream).json();if(saved.date===date){if(saved.conditionKey===conditionKey&&saved.source==='ai'&&validOutfit(saved.text))return {text:saved.text,source:'ai'};return fallback;}}
  }catch{return fallback;}
  if(!allowGenerate||!enabled())return fallback;
  // Atomic claim before a model call. At most one attempt per six-hour slot, including failures.
  let claim;try{claim=await storage.put(key,JSON.stringify({...fallback,date,conditionKey,status:'pending'}),{access:'private',addRandomSuffix:false,allowOverwrite:prior?.statusCode===200,...(prior?.statusCode===200?{ifMatch:prior.blob.etag}:{}),contentType:'application/json'});}catch{return fallback;}
  let result=fallback;try{const text=await generate(c);if(validOutfit(text))result={text,source:'ai'};}catch(error){console.warn('Outfit AI unavailable',{status:error?.statusCode||null});}
  try{await storage.put(key,JSON.stringify({...result,date,conditionKey,status:'ready'}),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:claim.etag,contentType:'application/json'});}catch{console.warn('Outfit cache update failed');}
  return result;
 };
}
export const outfitService=createOutfitService();
