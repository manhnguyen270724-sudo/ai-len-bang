import {describe,it,expect} from 'vitest';
import {ANIMATION_MS,chasePhase,runnerPosition,REVEAL_SECONDS} from './choreography';
describe('Nhịp chạy và bắt người',()=>{
 it('giữ kín người được chọn đến đúng hai giây cuối',()=>{expect(ANIMATION_MS/1000-REVEAL_SECONDS).toBe(2);for(const t of [0,1,4,7.99]){expect(chasePhase(t)).toEqual({reveal:false,approach:0,lift:0})}expect(chasePhase(8).reveal).toBe(true)});
 it('vật thể đến nơi trước khi bắt đầu nhấc',()=>{expect(chasePhase(8.4).approach).toBeGreaterThan(0);expect(chasePhase(8.4).lift).toBe(0);expect(chasePhase(8.65).approach).toBe(1);expect(chasePhase(9).lift).toBeGreaterThan(0);expect(chasePhase(10).lift).toBe(1)});
 it('đường chạy dài, khác nhau và không ra khỏi đảo',()=>{for(let i=0;i<24;i++){let distance=0;let previous=runnerPosition(i,0);for(let t=.05;t<=8;t+=.05){const p=runnerPosition(i,t);expect(Math.hypot(p.x,p.z)).toBeLessThan(5);distance+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p}expect(distance).toBeGreaterThan(12);expect(runnerPosition(i,3)).not.toEqual(runnerPosition(i+1,3))}});
});
