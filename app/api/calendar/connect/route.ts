import {calendarAdmin,calendarError,CalendarError,calendarHeaders,calendarService} from '../../../../lib/calendar-server.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){if(!calendarAdmin(request,true))return calendarError(new CalendarError('Accedi con la chiave privata dell’album per collegare i calendari.',401));try{const {person}=await request.json();const result=await calendarService.begin(person);return Response.json({url:result.url},{headers:{...calendarHeaders,'Set-Cookie':result.cookie}});}catch(error){return calendarError(error);}}
