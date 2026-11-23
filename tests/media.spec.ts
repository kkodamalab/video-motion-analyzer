import {test,expect} from '@playwright/test';
for(const preset of ['GENERAL','BALLET ROTATION'])test(`actual video decode, zoom-invariant clicks and timeline seek (${preset})`,async({page})=>{
 await page.goto('./');
 await page.getByLabel('Analysis preset').selectOption(preset);
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
