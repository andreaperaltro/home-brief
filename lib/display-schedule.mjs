export function displaySchedule(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const date=`${parts.year}-${parts.month}-${parts.day}`,hour=Number(parts.hour);
 const cycle=new Date(date+'T12:00:00Z');if(hour<6)cycle.setUTCDate(cycle.getUTCDate()-1);
 const photoDate=cycle.toISOString().slice(0,10);
 return {mode:hour>=6&&hour<11?'brief':'photo',date,photoDate,dayIndex:Math.floor(Date.parse(photoDate+'T12:00:00Z')/86400000),timeZone:'Europe/Rome'};
}
