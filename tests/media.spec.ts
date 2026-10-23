import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('actual video decode, zoom-invariant clicks and timeline seek',async({page})=>{
 await page.goto('./');
 const encoded=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d')!;const stream=canvas.captureStream(15);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks:BlobPart[]=[];recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise<string>(resolve=>recorder.onstop=async()=>{const blob=new Blob(chunks,{type:'video/webm'});const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob)});recorder.start();for(let i=0;i<20;i++){ctx.fillStyle='#123456';ctx.fillRect(0,0,640,360);ctx.fillStyle='white';ctx.fillRect(i*15,150,40,40);await new Promise(r=>setTimeout(r,70))}recorder.stop();stream.getTracks().forEach(t=>t.stop());return done});
 await page.locator('input[type=file][accept="video/*"]').setInputFiles({name:'generated-test.webm',mimeType:'video/webm',buffer:Buffer.from(encoded,'base64')});
 await expect.poll(()=>page.locator('video').evaluate(v=>(v as HTMLVideoElement).videoWidth)).toBe(640);
 await page.getByRole('button',{name:'MANUAL TRACK',exact:true}).click();
 const b=await page.getByTestId('source-stage').boundingBox();const x=b!.x+b!.width*.55,y=b!.y+b!.height*.45;
 await page.mouse.click(x,y);const first=await page.locator('.source-overlay circle[data-point]').last().evaluate(e=>({x:+e.getAttribute('cx')!,y:+e.getAttribute('cy')!}));
 await page.mouse.move(x,y);await page.mouse.wheel(0,-200);await page.waitForTimeout(200);await page.mouse.click(x,y);const second=await page.locator('.source-overlay circle[data-point]').last().evaluate(e=>({x:+e.getAttribute('cx')!,y:+e.getAttribute('cy')!}));
 expect(second.x).toBeCloseTo(first.x,1);expect(second.y).toBeCloseTo(first.y,1);
 await page.locator('.ruler .track-lane').click({position:{x:60,y:10}});await expect.poll(()=>page.locator('video').evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});
test('real MediaPipe model load and human landmark inference',async({page})=>{
 test.skip(!!process.env.TEST_URL&&!process.env.TEST_URL.includes('127.0.0.1'),'Source import probe runs locally; production uses UI flow');
 test.setTimeout(180000);await page.goto('./');
 const result=await page.evaluate(async()=>{const path='/video-motion-analyzer/src/auto.ts';const {loadModel}=await import(/* @vite-ignore */path);const {model,backend}=await loadModel(.5);const img=new Image();img.crossOrigin='anonymous';img.src='https://storage.googleapis.com/mediapipe-assets/pose.jpg';await img.decode();const result=model.detect(img);return {backend,people:result.landmarks.length,landmarks:result.landmarks[0]?.length,confidence:result.landmarks[0]?.[0].visibility}});
 expect(result.people).toBeGreaterThan(0);expect(result.landmarks).toBe(33);expect(result.confidence).toBeGreaterThan(.5);
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/model-evidence.json',JSON.stringify(result,null,2));
});
