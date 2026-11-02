import type {Concept} from './Scene';
import {REVEAL_SECONDS,APPROACH_SECONDS} from './choreography';
export type MusicNote={at:number;frequency:number;duration:number;volume:number;wave:OscillatorType;endFrequency?:number};
const hz=(midi:number)=>440*2**((midi-69)/12);
export function musicScore(concept:Concept):MusicNote[]{
 const notes:MusicNote[]=[];
 const pattern=concept==='ufo'?[48,55,60,61,60,55,51,55]:concept==='cat'?[60,64,67,72,69,67,64,62]:[50,50,57,53,50,57,60,57];
 const beat=concept==='ufo'?.34:concept==='cat'?.28:.23;
 for(let i=0;i*beat<REVEAL_SECONDS;i++){
  const at=i*beat,rise=at/REVEAL_SECONDS;
  notes.push({at,frequency:hz(pattern[i%pattern.length]+(concept==='storm'&&i>24?12:0)),duration:beat*.7,volume:.065+rise*.025,wave:concept==='ufo'?'sine':concept==='cat'?'triangle':'square'});
  if(i%2===0)notes.push({at,frequency:concept==='cat'?130:85,duration:.12,volume:.13,wave:'sine',endFrequency:38});
  if(concept==='ufo'&&i%4===0)notes.push({at,frequency:hz(72+i%8),duration:.55,volume:.035,wave:'sine',endFrequency:hz(84+i%8)});
 }
 // Target is revealed only in the final two seconds; sound follows the same timing.
 notes.push({at:REVEAL_SECONDS,frequency:concept==='cat'?660:220,duration:APPROACH_SECONDS,volume:.12,wave:concept==='cat'?'triangle':'sine',endFrequency:concept==='cat'?440:880});
 notes.push({at:REVEAL_SECONDS+APPROACH_SECONDS,frequency:concept==='cat'?880:140,duration:.8,volume:.15,wave:concept==='storm'?'triangle':'sine',endFrequency:concept==='cat'?250:1200});
 return notes;
}
export function resultScore(concept:Concept):MusicNote[]{return(concept==='ufo'?[72,79,84,88]:concept==='cat'?[72,76,79,84]:[62,69,74,78]).map((m,i)=>({at:i*.115,frequency:hz(m),duration:i===3?.65:.22,volume:.14,wave:'triangle'}))}
export class GameAudio{
 private context:AudioContext|null=null;
 private output:GainNode|null=null;
 private nodes=new Set<OscillatorNode>();
 private generation=0;
 async play(concept:Concept,offset=0,result=false){
  this.stop();const generation=this.generation;
  this.context??=new AudioContext();const ctx=this.context;
  if(ctx.state==='suspended')await ctx.resume();
  if(generation!==this.generation||ctx.state==='closed')return;
  const output=ctx.createGain();output.gain.value=.55;output.connect(ctx.destination);this.output=output;
  const now=ctx.currentTime+.025;
  for(const note of result?resultScore(concept):musicScore(concept)){
   if(note.at<offset)continue;
   const at=now+note.at-offset,osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type=note.wave;osc.frequency.setValueAtTime(note.frequency,at);
   if(note.endFrequency)osc.frequency.exponentialRampToValueAtTime(note.endFrequency,at+note.duration);
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(note.volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+note.duration);
   osc.connect(gain);gain.connect(output);this.nodes.add(osc);
   osc.onended=()=>{this.nodes.delete(osc);osc.disconnect();gain.disconnect()};
   osc.start(at);osc.stop(at+note.duration+.025);
  }
 }
 stop(){this.generation++;if(this.output){this.output.disconnect();this.output=null}for(const osc of this.nodes){try{osc.stop()}catch{/* Already ended. */}osc.disconnect()}this.nodes.clear()}
 dispose(){this.stop();if(this.context){void this.context.close().catch(()=>{});this.context=null}}
}
