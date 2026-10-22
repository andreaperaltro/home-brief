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
export function validOutfitForPlan(text,c){
 if(!validOutfit(text)||!c)return false;
 const main=outfitPlan(c)[0];
 if(main.includes('giacca')&&!/giacca/i.test(text))return false;
 if(main.includes('piumino')&&!/piumino/i.test(text))return false;
 if(/maglia|camicia/.test(main)&&!/maglia|camicia/i.test(text))return false;
 if(main.includes('pantaloni')&&!/pantaloni/i.test(text))return false;
 if(c.rain&&!/ombrell|impermeabil/i.test(text))return false;
 return !/cambiamento climatico/i.test(text);
}
function signature(c){return JSON.stringify({low:Math.floor(c.low/3),high:Math.floor(c.high/3),windy:Math.max(c.wind||0,c.gust||0)>=25,strongWind:Math.max(c.wind||0,c.gust||0)>=40,rain:c.rain,snow:c.snow,storm:c.storm,remaining:c.remaining});}
export const freeOutfitModel='nvidia/nemotron-3.5-lightning-free';
export async function requireFreeModel(fetcher=fetch){
 const configured=process.env.OUTFIT_AI_MODEL||freeOutfitModel;
 if(configured!==freeOutfitModel)throw Error('Outfit model is not allowlisted as free');
 const response=await fetcher('https://ai-gateway.vercel.sh/v1/models',{signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Model pricing unavailable');
 const model=(await response.json()).data?.find(m=>m.id===configured);
 const zero=p=>p===0||typeof p==='string'&&/^0(?:\.0+)?$/.test(p);
 if(!model?.pricing||!zero(model.pricing.input)||!zero(model.pricing.output))throw Error('Outfit model is not free');
 return configured;
}
export async function generateOutfit(c){
 const model=await requireFreeModel();
 const {generateText}=await import('ai');
 const result=await generateText({model,reasoning:'none',maxOutputTokens:128,maxRetries:0,timeout:15000,
  system:'Scrivi un consiglio outfit in italiano, massimo due frasi e 180 caratteri. La prima frase deve nominare tutti i capi base; la seconda gli accessori utili. Non aggiungere capi, spiegazioni, vantaggi, numeri o introduzioni. Stile diretto: Indossa..., Porta....',
  prompt:JSON.stringify({base:outfitPlan(c)[0],aggiunte:outfitPlan(c).slice(1)})});
 console.info('Outfit AI response',{model:result.response.modelId,inputTokens:result.usage.inputTokens,outputTokens:result.usage.outputTokens,finishReason:result.finishReason,textLength:result.text?.length||0});
 const text=result.text?.trim();if(!validOutfitForPlan(text,c))throw Error('Invalid outfit output');
 return text;
}
export function outfitErrorCode(error){
 let detail='',current=error;for(let i=0;i<4&&current;i++,current=current.cause)detail+=' '+String(current.message||'')+' '+String(current.responseBody||'');
 if(/customer_verification_required|payment method|credit card|verify your account|verif.*customer/i.test(detail))return 'verification-required';
 if(/free.tier|not.*eligible|purchase.*credits|requires.*credits/i.test(detail))return 'model-not-eligible';
 if(error?.statusCode===402)return 'credits-unavailable';
 if(error?.statusCode===429)return 'rate-limited';
 if(error?.statusCode===401)return 'authentication-required';
 if(error?.statusCode===403)return 'gateway-forbidden';
 if(/model is not.*free|not allowlisted as free/.test(detail))return 'model-not-free';
 if(/Invalid outfit output/.test(detail))return 'invalid-output';
 if(error?.name?.includes('Timeout')||error?.name?.includes('Abort'))return 'timeout';
 return 'temporarily-unavailable';
}
export function createOutfitService({storage={get,put},generate=generateOutfit,enabled=()=>process.env.OUTFIT_AI_ENABLED!=='false'&&Boolean(process.env.VERCEL||process.env.AI_GATEWAY_API_KEY),now=()=>new Date()}={}){
 return async function outfit(weather,{allowGenerate=false}={}){
  const c=outfitConditions(weather),fallback=fallbackOutfit(c);if(!c)return fallback;
  const current=now(),parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(current).map(p=>[p.type,p.value]));
  const date=`${parts.year}-${parts.month}-${parts.day}`;if(weather.date!==date)return {text:'Consiglio in attesa delle previsioni di oggi.',source:'unavailable'};
  const key='outfit/daily.json',conditionKey=signature(c);let prior;
  try{
   prior=await storage.get(key,{access:'private',useCache:false});
   if(prior?.statusCode===200){const saved=await new Response(prior.stream).json();if(saved.date===date){if(saved.conditionKey===conditionKey&&saved.source==='ai'&&validOutfitForPlan(saved.text,c))return {text:saved.text,source:'ai'};return {...fallback,...(saved.aiStatus?{aiStatus:saved.aiStatus}:{})};}}
  }catch{return fallback;}
  if(!allowGenerate||!enabled())return fallback;
  // Atomic claim before a model call. At most one attempt per day, including failures.
  let claim;try{claim=await storage.put(key,JSON.stringify({...fallback,date,conditionKey,status:'pending'}),{access:'private',addRandomSuffix:false,allowOverwrite:prior?.statusCode===200,...(prior?.statusCode===200?{ifMatch:prior.blob.etag}:{}),contentType:'application/json'});}catch{return fallback;}
  let result=fallback;try{const text=await generate(c);if(validOutfitForPlan(text,c))result={text,source:'ai'};}catch(error){const code=outfitErrorCode(error);result={...fallback,aiStatus:code};console.warn('Outfit AI unavailable',{status:error?.statusCode||null,code,errorName:error?.name||'Error'});}
  try{await storage.put(key,JSON.stringify({...result,date,conditionKey,status:'ready'}),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:claim.etag,contentType:'application/json'});}catch{console.warn('Outfit cache update failed');}
  return result;
 };
}
export const outfitService=createOutfitService();
