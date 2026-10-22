'use strict';
// Shared by the canvas and layout tests. All measurements are native display pixels.
var HomeBriefNews=(()=>{
 function measure(items,abstractLines,measureLines){
  const cards=items.map(item=>{const textWidth=570,titleLines=Math.min(3,measureLines(item.title,textWidth,500,20));const summaryLines=item.abstract&&abstractLines?Math.min(abstractLines,measureLines(item.abstract,textWidth,400,14)):0;const bodyHeight=19+titleLines*24+(summaryLines?5+summaryLines*17:0)+5+14;return {item,textWidth,titleLines,abstractLines:summaryLines,height:bodyHeight};});
  const rowHeights=[];for(let i=0;i<cards.length;i+=2)rowHeights.push(Math.max(cards[i].height,cards[i+1]?.height||0));
  return {cards,rowHeights,height:33+rowHeights.reduce((a,b)=>a+b,0)+Math.max(0,rowHeights.length-1)*20,abstractLines};
 }
 function choose(items,availableHeight,measureLines){
  const pool=items.slice(0,8),hasAbstract=pool.some(n=>n.abstract);
  const options=hasAbstract?[[8,2],[6,3],[8,0],[6,2],[6,1],[6,0],[4,1],[4,0],[2,0]]:[[8,0],[6,0],[4,0],[2,0]];
  const seen=new Set();for(const [count,summary] of options){const take=Math.min(count,pool.length);if(!take||count>pool.length&&count!==6)continue;const key=take+':'+summary;if(seen.has(key))continue;seen.add(key);const plan=measure(pool.slice(0,take),summary,measureLines);if(plan.height<=availableHeight)return {...plan,overflow:false};}
  const plan=measure(pool.slice(0,Math.min(2,pool.length)),0,measureLines);return {...plan,overflow:plan.height>availableHeight};
 }
 return {choose,measure};
})();
