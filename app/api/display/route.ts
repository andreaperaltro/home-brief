import {authorized,authError,photoHeaders} from '../../../lib/photo-auth.mjs';
import {displaySchedule} from '../../../lib/display-schedule.mjs';
import {allPhotos,photoForDay} from '../../../lib/photos.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!authorized(request))return authError();const schedule=displaySchedule();if(schedule.mode==='brief')return Response.json({...schedule,url:'/dashboard.html?display=1',refreshAfter:60},{headers:photoHeaders});try{const photos=await allPhotos(),id=await photoForDay(schedule,photos);return Response.json({...schedule,id,url:id?'/api/photos/'+id+'?format=display':null,count:photos.length,refreshAfter:60},{headers:photoHeaders});}catch{return Response.json({error:'Album temporaneamente non disponibile.'},{status:503,headers:photoHeaders});}}
