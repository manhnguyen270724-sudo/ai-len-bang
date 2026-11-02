import {withFixedClass,fixedClass} from './fixedClass';
﻿export type Student={id:string;name:string;code:string;avatar?:'male'|'female'};
export type Group={id:string;name:string;members:Student[]};
export type Turn={id:string;at:string;kind:string;names:string[]};
export type Session={absent:string[];called:string[];groupCalled:string[];groups:Group[];signature:string;history:Turn[];result:string[]};
export type Classroom={id:string;name:string;students:Student[];session:Session};
export type Data={version:1;active:string;classes:Classroom[]};
export const uid=()=>crypto.randomUUID();
export const emptySession=():Session=>({absent:[],called:[],groupCalled:[],groups:[],signature:'',history:[],result:[]});
export function randomInt(max:number){if(!Number.isSafeInteger(max)||max<1||max>4294967296)throw Error('Giới hạn ngẫu nhiên không hợp lệ.');const limit=Math.floor(4294967296/max)*max;let n:number;do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=limit);return n%max}
export function shuffle<T>(items:T[]):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export function eligible(c:Classroom,noRepeat:boolean){return c.students.filter(s=>!c.session.absent.includes(s.id)&&(!noRepeat||!c.session.called.includes(s.id)))}
export function pick<T>(items:T[],count:number){if(!Number.isInteger(count)||count<1||count>items.length)throw Error(`Hãy nhập số nguyên từ 1 đến ${items.length}.`);return shuffle(items).slice(0,count)}
export function divide(students:Student[],value:number,bySize:boolean):Group[]{if(!Number.isSafeInteger(value)||value<1||!students.length||(!bySize&&value>students.length))throw Error('Số nhóm phải từ 1 đến số người có mặt; giới hạn mỗi nhóm phải là số nguyên dương.');const n=bySize?Math.ceil(students.length/value):value;const groups=Array.from({length:n},(_,i)=>({id:uid(),name:`Nhóm ${i+1}`,members:[] as Student[]}));shuffle(students).forEach((s,i)=>groups[i%n].members.push({...s}));return groups}
export const signature=(c:Classroom)=>JSON.stringify(c.students.map(s=>[s.id,s.name,s.code,!c.session.absent.includes(s.id)]));
export function parseStudents(text:string):Student[]{
 const lines=text.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 return lines.filter((line,i)=>!(i===0&&/^(stt|mã|ma|họ|ho|tên|ten|student|name)/i.test(line)&&/(họ.*tên|ho.*ten|mã.*sinh|ma.*sinh|student.*name)/i.test(line))).map(line=>{
 let parts=line.includes('\t')?line.split('\t').map(s=>s.trim()):line.split('|').map(s=>s.trim());
 if(parts.length===1)parts=[parts[0].replace(/^\d+[.)]\s+/, '')];
 if(parts.length>=3&&/^\d+$/.test(parts[0]))parts=parts.slice(1);
 if(parts.length>2)throw Error('Chỉ dán cột Tên hoặc Mã + Tên (có thể kèm cột STT ở đầu).');
 const name=(parts.length===2?parts[1]:parts[0]).trim().replace(/\s+/g,' '),code=parts.length===2?parts[0].trim():'';
 if(!name||name.length>150||code.length>60)throw Error('Tên cần có từ 1–150 ký tự, mã tối đa 60 ký tự.');
 return{id:uid(),name,code};
 });
}
export function formatGroups(groups:Group[]){return groups.map(g=>g.name+': '+g.members.map(s=>s.name).join(', ')).join('\n')}

export function sample():Classroom{const names=['Nguyễn Minh Anh','Trần Hoàng Nam','Lê Phương Linh','Phạm Gia Huy','Vũ Ngọc Mai','Đặng Đức Anh','Bùi Thu Hà','Đỗ Quang Minh','Hồ Bảo Ngọc','Ngô Tuấn Kiệt','Dương Khánh Vy','Lý Thành Đạt'];return{id:uid(),name:'Lớp học vui vẻ',students:names.map((name,i)=>({id:uid(),name,code:`SV${String(i+1).padStart(3,'0')}`})),session:emptySession()}}
export const KEY='ai-len-bang.v1';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown,max=150):x is string=>typeof x==='string'&&x.length>0&&x.length<=max;
const strings=(x:unknown):x is string[]=>Array.isArray(x)&&x.length<=10000&&x.every(v=>typeof v==='string'&&v.length<=350000);
function validStudent(s:unknown):s is Student{return obj(s)&&str(s.id)&&str(s.name)&&typeof s.code==='string'&&s.code.length<=60&&(s.avatar===undefined||s.avatar==='male'||s.avatar==='female')}
export function validate(raw:unknown):Data{if(!obj(raw)||raw.version!==1||typeof raw.active!=='string'||!Array.isArray(raw.classes)||raw.classes.length>100)throw Error('Bản sao lưu không đúng định dạng phiên bản 1 (tối đa 100 lớp).');const ids=new Set<string>();for(const c of raw.classes){if(!obj(c)||!str(c.id)||ids.has(c.id)||!str(c.name)||!Array.isArray(c.students)||c.students.length>2000||!c.students.every(validStudent)||new Set(c.students.map(s=>s.id)).size!==c.students.length)throw Error('Lớp hoặc danh sách sinh viên không hợp lệ (tối đa 2.000 người/lớp).');ids.add(c.id);const s=c.session;if(!obj(s)||!strings(s.absent)||!strings(s.called)||!strings(s.groupCalled)||!strings(s.result)||typeof s.signature!=='string'||!Array.isArray(s.groups)||s.groups.length>2000||!s.groups.every(g=>obj(g)&&str(g.id)&&str(g.name)&&Array.isArray(g.members)&&g.members.length<=2000&&g.members.every(validStudent))||!Array.isArray(s.history)||s.history.length>1000||!s.history.every(t=>obj(t)&&str(t.id)&&str(t.at)&&str(t.kind)&&strings(t.names)))throw Error('Dữ liệu buổi học không hợp lệ.')}return raw as unknown as Data}
export function parseBackup(text:string){if(new Blob([text]).size>5*1024*1024)throw Error('Tệp quá lớn. Giới hạn 5 MB.');return validate(JSON.parse(text))}
export function load(storage:Pick<Storage,'getItem'>):{data:Data;error:string}{try{const text=storage.getItem(KEY);if(text)return{data:withFixedClass(parseBackup(text)),error:''}}catch{return{data:withFixedClass({version:1,active:'',classes:[]}),error:'Không đọc được dữ liệu đã lưu. Dữ liệu cũ chưa bị ghi đè. Hãy xuất/khôi phục bản sao lưu hoặc cho phép lưu lại.'}}const c=fixedClass();return{data:{version:1,active:c.id,classes:[c]},error:''}}
export function save(storage:Pick<Storage,'setItem'>,data:Data){try{storage.setItem(KEY,JSON.stringify(data));return ''}catch{return 'Không lưu được trên trình duyệt. Hãy xuất JSON để tránh mất thay đổi.'}}
