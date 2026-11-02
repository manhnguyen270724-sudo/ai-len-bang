import {describe,it,expect} from 'vitest';
import {musicScore,resultScore} from './audio';
import {REVEAL_SECONDS,APPROACH_SECONDS} from './choreography';
describe('Nhạc ba concept',()=>{
 it('mỗi concept có giai điệu riêng, nốt hợp lệ và hiệu ứng bắt đúng thời điểm',()=>{const scores=['ufo','cat','storm'].map(c=>musicScore(c as 'ufo'|'cat'|'storm'));expect(new Set(scores.map(s=>JSON.stringify(s))).size).toBe(3);for(const score of scores){expect(score.filter(n=>n.at<8).length).toBeGreaterThan(20);expect(score.some(n=>n.at===REVEAL_SECONDS+APPROACH_SECONDS)).toBe(true);for(const n of score){expect(n.frequency).toBeGreaterThan(0);expect(n.duration).toBeGreaterThan(0);expect(n.volume).toBeLessThanOrEqual(.2);expect(n.at+n.duration).toBeLessThanOrEqual(10)}}});
 it('có đoạn công bố kết quả ngắn cho từng concept',()=>{for(const c of ['ufo','cat','storm'] as const){const notes=resultScore(c);expect(notes).toHaveLength(4);expect(Math.max(...notes.map(n=>n.at+n.duration))).toBeLessThan(1.1)}});
});
