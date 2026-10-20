import sharp from 'sharp';
import {createHash} from 'node:crypto';
export const frameWidth=1200,frameHeight=1600,frameBytes=960000;
// Spectra 6 wire codes from the official Waveshare driver. High nibble first.
const colors=[[0,0,0,0],[255,255,255,1],[255,255,0,2],[255,0,0,3],[0,0,255,5],[0,255,0,6]];
export function packPixels(rgb,width=frameWidth,height=frameHeight){
 if(width%2||rgb.length!==width*height*3)throw Error('Invalid pixel dimensions');
 const out=Buffer.alloc(width*height/2);
 for(let p=0;p<width*height;p++){const i=p*3;let code=0,distance=Infinity;for(const [r,g,b,c] of colors){const d=(rgb[i]-r)**2+(rgb[i+1]-g)**2+(rgb[i+2]-b)**2;if(d<distance){distance=d;code=c;}}if(p%2)out[p>>1]|=code;else out[p>>1]=code<<4;}
 return out;
}
export async function packImage(input,monochrome=false){
 let image=sharp(input).flatten({background:'#ffffff'}).toColourspace('srgb').removeAlpha();
 const meta=await image.metadata();if(meta.width!==frameWidth||meta.height!==frameHeight)throw Error('Invalid frame dimensions');
 if(monochrome)image=image.threshold(160);
 const pixels=await image.raw().toBuffer();return packPixels(pixels);
}
export function frameHash(body){return createHash('sha256').update(body).digest('hex');}
export function nextCheck(now=new Date()){return Math.max(60,900-Math.floor(now.getTime()/1000)%900);}
