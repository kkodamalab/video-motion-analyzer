import {describe,it,expect} from 'vitest';
import {homography,transform,inverse,calibrate,screenToImage,interpolate,emptyProject,demo,phaseAt,calibrationAt,motion,world,angle,parseProject,csv,type Anchor,type Point} from './core';
const anchors:Anchor[]=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}].map((image,i)=>({id:String(i),image,world:{x:image.x/10+2,y:image.y/10+3}}));
const pt=(t:number,x:number):Point=>({id:String(t),runner:'r1',part:'GROUND',time:t,x,y:0,method:'manual',confidence:1});
describe('calibration',()=>{
 it('recovers metric coordinates from four correspondences',()=>{expect(transform(homography(anchors),{x:50,y:50})).toEqual({x:7,y:8})});
 it('round trips perspective coordinates',()=>{const h=[1.2,.1,20,.3,.9,10,.001,.002,1],p={x:200,y:100};const back=transform(inverse(h),transform(h,p));expect(back.x).toBeCloseTo(p.x,8);expect(back.y).toBeCloseTo(p.y,8)});
 it('rejects fewer than four anchors',()=>expect(()=>homography(anchors.slice(0,3))).toThrow());
 it('rejects collinear correspondences',()=>expect(()=>homography(anchors.map((a,i)=>({...a,image:{x:i,y:i}})))).toThrow());
 it('fits an overdetermined plane',()=>{const many=[...anchors,...[20,40,60,80].map((x,i)=>({id:`m${i}`,image:{x,y:30},world:{x:x/10+2,y:6}}))];expect(calibrate(many).rmse).toBeLessThan(1e-8)});
 it('rejects a gross outlier using consensus',()=>{const many=[...anchors,...[20,40,60,80].map((x,i)=>({id:`m${i}`,image:{x,y:30},world:{x:x/10+2,y:6}})),{id:'out',image:{x:60,y:70},world:{x:100,y:100}}];expect(calibrate(many).outliers).toBe(1)});
 it('holds independent validation points out of fitting',()=>{const r=calibrate([...anchors,{id:'test',image:{x:50,y:50},world:{x:8,y:8},validation:true}]);expect(r.rmse).toBeLessThan(1e-8);expect(r.validation[0]).toBeCloseTo(1)});
 it('marks projective horizon invalid',()=>expect(Number.isNaN(transform([1,0,0,0,1,0,1,0,0],{x:0,y:2}).x)).toBe(true));
});
describe('image coordinates',()=>{
 it('inverts zoom and pan',()=>expect(screenToImage({x:230,y:140},{x:30,y:40,scale:2})).toEqual({x:100,y:50}));
 it('is independent of ROI cropping',()=>{const p=emptyProject();const before=screenToImage({x:200,y:300},{x:0,y:100,scale:2});p.roi={x:50,y:40,w:200,h:100};expect(screenToImage({x:200,y:300},{x:0,y:100,scale:2})).toEqual(before)});
});
describe('time series',()=>{
 it('linearly interpolates tagged samples',()=>{const s=interpolate([pt(0,0),pt(1,10)],.5,2)!;expect(s.x).toBe(5);expect(s.method).toBe('interpolated')});
 it('preserves measured samples',()=>expect(interpolate([pt(0,0),pt(1,10)],0,2)?.method).toBe('manual'));
 it('does not interpolate long occlusions',()=>expect(interpolate([pt(0,0),pt(2,20)],1,.5)).toBeUndefined());
 it('does not extrapolate',()=>expect(interpolate([pt(0,0),pt(1,10)],2,2)).toBeUndefined());
 it('cubic interpolation preserves a linear trajectory',()=>expect(interpolate([pt(0,0),pt(1,10),pt(2,20),pt(3,30)],1.5,2,'spline')?.x).toBeCloseTo(15));
 it('computes known ground velocity',()=>{const p=demo();expect(motion(p,'r1',2).vx).toBeCloseTo(78/18,5);expect(motion(p,'r1',2).ay).toBeCloseTo(0,5)});
 it('does not differentiate over a camera cut',()=>{const p=demo();p.phases=[{...p.phases[0],end:5},{...p.phases[0],id:'cut',start:5,kind:'CUT'}];expect(Number.isNaN(motion(p,'r1',5).speed)).toBe(true)});
 it('does not manufacture world positions for elevated points',()=>{const p=demo();p.points=p.points.filter(x=>x.part!=='GROUND');expect(world(p,'r1',2)).toBeUndefined()});
 it('returns a 2D joint angle',()=>expect(angle({x:1,y:0},{x:0,y:0},{x:0,y:1})).toBe(90));
 it('marks degenerate angle missing',()=>expect(Number.isNaN(angle({x:0,y:0},{x:0,y:0},{x:0,y:1}))).toBe(true));
});
describe('phases and persistence',()=>{
 it('switches to the new phase at a boundary',()=>{const p=emptyProject();p.phases=[{...p.phases[0],end:5},{...p.phases[0],id:'b',start:5}];expect(phaseAt(p,5)?.id).toBe('b')});
 it('refuses dynamic extrapolation',()=>{const p=demo();p.phases[0].kind='PAN';expect(()=>calibrationAt(p,5)).toThrow('不確実')});
 it('refits intermediate anchor correspondences',()=>{const p=demo();const f=p.phases[0];f.kind='PAN';f.keys.push({time:10,anchors:f.keys[0].anchors.map(a=>({...a,image:{x:a.image.x+100,y:a.image.y}}))});const h=calibrationAt(p,5).h;expect(transform(h,{x:150,y:150}).x).toBeCloseTo(0)});
 it('round trips a project including events and ROI',()=>{const p=demo();expect(parseProject(JSON.stringify(p))).toEqual(p)});
 it('rejects unsupported schema',()=>expect(()=>parseProject('{"version":2}')).toThrow());
 it('escapes CSV quotes, comma and missing numeric values',()=>{expect(csv([['a,"b',NaN]])).toBe('\ufeff"a,""b","NaN"')});
});
