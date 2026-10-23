import {it,expect} from 'vitest';
import {demo,emptyProject} from './core';
import {derivedMotion,analysisDefaults,distanceAlong} from './analysis';
it('irregular timestamps yield physical velocity',()=>{const p=demo();p.points=p.points.filter(x=>x.time===1||x.time===1.1||x.time===1.3);expect(derivedMotion(p,'r1',1.1,analysisDefaults).vx).toBeCloseTo(78/18)});
it('local polynomial fit recovers linear velocity and zero acceleration',()=>{const p=demo();const m=derivedMotion(p,'r1',2,{...analysisDefaults,derivative:'polynomial'});expect(m.vx).toBeCloseTo(78/18);expect(m.ax).toBeCloseTo(0)});
it('missing data remains missing',()=>expect(Number.isNaN(derivedMotion(emptyProject(),'r1',2,analysisDefaults).speed)).toBe(true));
it('custom plane does not invent progress distance',()=>expect(Number.isNaN(distanceAlong(demo(),'r1',2,{...analysisDefaults,preset:'custom'}))).toBe(true));
it('derivatives are blocked at a cut',()=>{const p=demo();p.phases=[{...p.phases[0],end:2},{...p.phases[0],id:'new',start:2}];expect(Number.isNaN(derivedMotion(p,'r1',2,analysisDefaults).speed)).toBe(true)});
