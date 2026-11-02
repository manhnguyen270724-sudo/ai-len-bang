// One shared clock: eight seconds of suspense, then approach and capture.
export const ANIMATION_MS=10000;
export const REVEAL_SECONDS=8;
export const APPROACH_SECONDS=.65;
export function smooth(value:number){const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)}
export function chasePhase(seconds:number){return{reveal:seconds>=REVEAL_SECONDS,approach:smooth((seconds-REVEAL_SECONDS)/APPROACH_SECONDS),lift:smooth((seconds-REVEAL_SECONDS-APPROACH_SECONDS)/(ANIMATION_MS/1000-REVEAL_SECONDS-APPROACH_SECONDS))}}
// Independent of selection: every student follows the same kind of chaotic path.
export function runnerPosition(index:number,seconds:number){const angle=index*2.399963+seconds*(.9+(index%5)*.13);const radius=2.1+Math.sin(seconds*1.9+index*1.7)*1.15;return{x:Math.cos(angle)*radius+Math.sin(seconds*2.8+index)*.65,z:Math.sin(angle)*radius*.75+.35+Math.cos(seconds*2.3+index*2)*.4}}
