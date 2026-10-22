import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium as playwright} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import {get,put} from '@vercel/blob';
import {news} from './live-sources.mjs';
import {weatherWithOutfit} from './weather-outfit.mjs';
import {calendarService} from './calendar-server.mjs';
import {packImage,frameBytes} from './device-frame.mjs';

export async function renderBrief(){
 // Feed the same canvas renderer as the web app; no external navigation or credentials in Chromium.
 const results=await Promise.allSettled([weatherWithOutfit({allowGenerate:true}),news(),calendarService.events('andrea'),calendarService.events('mavi')]);
 if(results[0].status!=='fulfilled'||results[1].status!=='fulfilled')throw Error('Brief sources unavailable');
 const payload={...results[0].value,news:results[1].value.news,calendarStates:{}};
 for(const [i,person] of [[2,'andrea'],[3,'mavi']]){const r=results[i];const ok=r.status==='fulfilled'&&r.value.connected&&!r.value.needsSelection;payload[person]=ok?r.value.text:'';payload.calendarStates[person]=ok?null:r.status==='rejected'?'Calendario temporaneamente non disponibile':r.value.connected?'Seleziona un calendario':'Google Calendar non collegato';}
 const browser=await playwright.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||await chromium.executablePath(),args:process.env.CHROMIUM_EXECUTABLE_PATH?[]:chromium.args,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1200,height:1600},timezoneId:'Europe/Rome',locale:'it-IT'});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!=='https://render.invalid')return route.abort();
  const name=url.pathname==='/'?'dashboard.html':decodeURIComponent(url.pathname.slice(1));
  if(!/^(dashboard\.html|app\.js|news-layout\.js|style\.css|figma\/[a-z-]+\.svg|fonts\/[A-Za-z0-9_.-]+)$/.test(name))return route.abort();
  try{let body=await readFile(path.join(process.cwd(),'public',name));if(name==='dashboard.html')body=Buffer.from(body.toString().replace('<script src="live.js"></script>',''));
  const type=name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'font/otf';await route.fulfill({body,contentType:type});}catch{await route.abort();}
 });
 await page.goto('https://render.invalid/?display=1');
 const image=await page.evaluate(async value=>{
  // These bindings belong to the existing classic canvas script.
  await globalThis.eval('fontsReady');if(!globalThis.eval('ready'))throw Error('Fonts unavailable');
  globalThis.__framePayload=value;globalThis.eval(`data=globalThis.__framePayload; const renderStates=data.calendarStates; const baseAgenda=agenda; agenda=function(name,source,x,y,height){const label=renderStates[name.toLowerCase()];if(!label)return baseAgenda(name,source,x,y,height);return emptyAgenda(name,label,x,y,height);}; draw()`);delete globalThis.__framePayload;
  if(document.querySelector('#download').disabled)throw Error('Content overflows display');
  return document.querySelector('#display').toDataURL('image/png').split(',')[1];
 },payload);
 return packImage(Buffer.from(image,'base64'),true);
 }finally{await browser.close();}
}
export async function cachedBrief(now=new Date()){
 const key='device/brief.json';const prior=await get(key,{access:'private',useCache:false});
 if(prior?.statusCode===200){try{const saved=await new Response(prior.stream).json();const age=now.getTime()-Date.parse(saved.at),body=Buffer.from(saved.body,'base64');if(saved.layoutVersion==='2026-10-22-editorial'&&age>=0&&age<15*60*1000&&body.length===frameBytes)return body;}catch{}}
 const body=await renderBrief();await put(key,JSON.stringify({layoutVersion:'2026-10-22-editorial',at:now.toISOString(),body:body.toString('base64')}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});return body;
}
