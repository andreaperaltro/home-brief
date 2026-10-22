import test from 'node:test';
import assert from 'node:assert/strict';
import {outfitConditions,outfitPlan,fallbackOutfit,validOutfit,createOutfitService} from '../lib/outfit.mjs';
import {openMeteoOutfit} from '../lib/live-sources.mjs';
const now=new Date('2026-10-22T06:00:00Z');
const forecast=(extra={})=>({date:'2026-10-22',low:'12',high:'18',outfitWeather:{minTemp:12,maxTemp:18,windMax:5,gustMax:10,rainChance:5,rainMm:0,...extra}});
function memoryStore(){let saved=null,version=0;return {get:async()=>saved?{statusCode:200,stream:new Response(JSON.stringify(saved)).body,blob:{etag:String(version)}}:null,put:async(path,body,options)=>{if(saved&&(!options.allowOverwrite||options.ifMatch!==String(version)))throw Error('Conflict');saved=JSON.parse(body);version++;return {etag:String(version)};},value:()=>saved};}
test('outfit follows daytime apparent temperature and ignores night extremes',()=>{
 const raw={daily:{time:['2026-10-22']},hourly:{time:['2026-10-22T02:00','2026-10-22T09:00','2026-10-22T15:00'],temperature_2m:[1,12,18],apparent_temperature:[-3,9,16],wind_speed_10m:[0,10,20],wind_gusts_10m:[0,25,30],precipitation_probability:[0,10,70],precipitation:[0,0,2],weather_code:[0,3,61]}};
 const summary=openMeteoOutfit(raw),c=outfitConditions({...forecast(),outfitWeather:summary});assert.equal(c.low,9);assert.equal(c.high,16);assert.equal(c.perceived,true);assert.equal(c.rain,true);assert.match(outfitPlan(c).join(),/giacca leggera/);
});
test('rain and strong wind choose a hooded raincoat, not an umbrella',()=>{
 const c=outfitConditions(forecast({rainChance:90,rainMm:5,gustMax:55}));const plan=outfitPlan(c).join();assert.match(plan,/impermeabile con cappuccio/);assert.doesNotMatch(plan,/ombrello/);assert.match(plan,/antivento/);
});
test('cold and heat get different layers; missing weather does not invent advice',()=>{
 assert.match(fallbackOutfit(outfitConditions(forecast({minTemp:-3,maxTemp:3}))).text,/piumino/);
 assert.match(fallbackOutfit(outfitConditions(forecast({minTemp:26,maxTemp:34}))).text,/traspiranti/);
 assert.equal(outfitConditions({}),null);assert.equal(fallbackOutfit(null).source,'unavailable');
 const c=outfitConditions(forecast({feelsMin:null,feelsMax:null,remaining:true}));assert.equal(c.perceived,false);assert.equal(c.remaining,true);
});
test('every fallback remains a compact complete clothing suggestion',()=>{
 for(const t of [-10,3,10,18,23,35])for(const gust of [0,30,60])for(const rain of [false,true]){const result=fallbackOutfit({low:t-8,high:t,wind:gust,gust,rain,snow:false,storm:false});assert.ok(validOutfit(result.text),result.text);}
});
test('anonymous requests cannot spend tokens; cache survives a new service instance',async()=>{
 const storage=memoryStore();let calls=0;const generate=async()=>{calls++;return 'Camicia e giacca leggera per uscire; porta un ombrello compatto.';};const options={storage,generate,enabled:()=>true,now:()=>now};
 const first=createOutfitService(options);assert.equal((await first(forecast())).source,'rules');assert.equal(calls,0);assert.equal((await first(forecast(),{allowGenerate:true})).source,'ai');assert.equal(calls,1);
 const second=createOutfitService(options);assert.equal((await second(forecast())).source,'ai');assert.equal(calls,1);
});
test('concurrent authorised requests permit only one model call per slot',async()=>{
 const storage=memoryStore();let calls=0;const service=createOutfitService({storage,enabled:()=>true,now:()=>now,generate:async()=>{calls++;return 'Camicia a maniche lunghe e una giacca leggera per uscire.';}});
 await Promise.all(Array.from({length:12},()=>service(forecast(),{allowGenerate:true})));assert.equal(calls,1);
});
test('credit/auth failures, changed conditions and stale dates fall back without repeat calls',async()=>{
 const storage=memoryStore();let calls=0;const service=createOutfitService({storage,enabled:()=>true,now:()=>now,generate:async()=>{calls++;throw Error('Gateway unavailable');}});
 assert.equal((await service(forecast(),{allowGenerate:true})).source,'rules');await service(forecast(),{allowGenerate:true});await service(forecast({rainChance:95,rainMm:10}),{allowGenerate:true});assert.equal(calls,1);
 assert.equal((await service({...forecast(),date:'2026-10-21'},{allowGenerate:true})).source,'unavailable');assert.equal(calls,1);
});
test('storage failure prevents model calls and malformed output is not presented as AI',async()=>{
 let calls=0;const unavailable=createOutfitService({storage:{get:async()=>{throw Error('Offline');}},enabled:()=>true,generate:async()=>{calls++;},now:()=>now});assert.equal((await unavailable(forecast(),{allowGenerate:true})).source,'rules');assert.equal(calls,0);
 const service=createOutfitService({storage:memoryStore(),enabled:()=>true,generate:async()=>'<script>bad</script>',now:()=>now});assert.equal((await service(forecast(),{allowGenerate:true})).source,'rules');
});
test('gateway errors expose only an actionable category, never the raw provider message',async()=>{
 const {outfitErrorCode}=await import('../lib/outfit.mjs');
 assert.equal(outfitErrorCode({statusCode:403,message:'customer_verification_required: add a payment method secret-value'}),'verification-required');
 assert.equal(outfitErrorCode({statusCode:403,message:'This model is not available in the free tier'}),'model-not-eligible');
 assert.equal(outfitErrorCode({statusCode:403,message:'unknown private provider detail'}),'gateway-forbidden');
});
test('nonzero or unknown live prices prevent model generation',async()=>{
 const {requireFreeModel,freeOutfitModel}=await import('../lib/outfit.mjs');
 const catalog=pricing=>async()=>Response.json({data:[{id:freeOutfitModel,pricing}]});
 assert.equal(await requireFreeModel(catalog({input:'0',output:'0'})),freeOutfitModel);
 await assert.rejects(requireFreeModel(catalog({input:'0',output:'0.000001'})),/not free/);
 await assert.rejects(requireFreeModel(catalog({})),/not free/);
 await assert.rejects(requireFreeModel(catalog({input:null,output:null})),/not free/);
});
test('the daily limit survives changes of six-hour slot',async()=>{
 const storage=memoryStore();let calls=0,date=new Date('2026-10-22T06:00:00Z');
 const service=createOutfitService({storage,enabled:()=>true,now:()=>date,generate:async()=>{calls++;return 'Camicia a maniche lunghe e una giacca leggera per uscire.';}});
 await service(forecast(),{allowGenerate:true});date=new Date('2026-10-22T17:00:00Z');await service(forecast(),{allowGenerate:true});assert.equal(calls,1);
});

test('AI must include the main outfit, not only an accessory or vague climate text',async()=>{
 const {validOutfitForPlan}=await import('../lib/outfit.mjs');const c=outfitConditions(forecast());
 assert.equal(validOutfitForPlan('Indossa una sciarpa leggera per il vento e i cambiamenti di temperatura.',c),false);
 assert.equal(validOutfitForPlan('Indossa camicia o maglia a maniche lunghe e giacca leggera.',c),true);
});
