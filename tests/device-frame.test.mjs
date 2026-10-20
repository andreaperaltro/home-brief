import test from 'node:test';
import assert from 'node:assert/strict';
import {packPixels,packImage,frameHash,nextCheck,frameBytes} from '../lib/device-frame.mjs';
import sharp from 'sharp';
test('Spectra 6 codes and nibble order match the official driver',()=>{
 const pixels=Buffer.from([0,0,0,255,255,255,255,255,0,255,0,0,0,0,255,0,255,0]);
 assert.deepEqual([...packPixels(pixels,6,1)],[0x01,0x23,0x56]);
});
test('wrong dimensions are rejected before sending anything to the panel',async()=>{
 assert.throws(()=>packPixels(Buffer.alloc(9),3,1));
 const png=await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(packImage(png),/dimensions/);
});
test('full frame is 960000 bytes and brief threshold creates black and white only',async()=>{
 const png=await sharp({create:{width:1200,height:1600,channels:3,background:'#888888'}}).png().toBuffer();
 const packed=await packImage(png,true);assert.equal(packed.length,frameBytes);assert.equal(new Set(packed).size,1);assert.equal(packed[0],0);
 assert.match(frameHash(packed),/^[0-9a-f]{64}$/);
});
test('wake-up aligns with quarter hours, including the 06:00 and 11:00 changes',()=>{
 assert.equal(nextCheck(new Date('2026-10-20T03:59:00Z')),60);
 assert.equal(nextCheck(new Date('2026-10-20T09:00:00Z')),900);
 assert.equal(nextCheck(new Date('2026-10-20T08:58:00Z')),120);
});
