import {calendarConfigured} from '../../../lib/calendar-server.mjs';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({calendarPersistent:calendarConfigured()},{headers:{'Cache-Control':'private, no-store'}});}
