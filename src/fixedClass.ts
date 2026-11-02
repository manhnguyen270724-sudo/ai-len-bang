import type {Classroom,Data} from './core';
import {emptySession} from './core';
export const FIXED_CLASS_ID='pnv27a';
export const PNV27A_NAMES=[
'Nguyễn Thị Ngọc Anh','Nguyễn Thị Dung','Hồ Thị Bèng','Hồ Văn Đàn',
'Nguyễn Hữu Tổng Đạt','Nguyễn Phúc Khuê','Bùi Tiến Lạc','Nguyễn Mạnh',
'Đinh Thị Mừng','Hoàng Lê Kim Ngân','Lê Minh Nhật','Hồ Thị Như',
'Nguyễn Tiến Nhựt','Hồ Văn Sang','ALăng Thị Thơm','Hồ Văn Tiết',
'Y Kim Trâm','Nguyễn Thu Trang','Nguyễn Thùy Trang','Ngô Minh Tú',
'Hồ Thị Vãi','Đoàn Công Việt',
];
export const PNV27A_MALE_NAMES=new Set([
'Hồ Văn Đàn','Nguyễn Hữu Tổng Đạt','Nguyễn Phúc Khuê','Bùi Tiến Lạc',
'Nguyễn Mạnh','Lê Minh Nhật','Nguyễn Tiến Nhựt','Hồ Văn Sang',
'Hồ Văn Tiết','Ngô Minh Tú','Đoàn Công Việt',
]);
// The published roster is bundled with the website; attendance/history stay local.
export function fixedClass():Classroom{return{id:FIXED_CLASS_ID,name:'PNV27A',students:PNV27A_NAMES.map((name,i)=>({id:'pnv27a-'+String(i+1).padStart(2,'0'),name,code:'',avatar:PNV27A_MALE_NAMES.has(name)?'male' as const:'female' as const})),session:emptySession()}}
export function withFixedClass(data:Data):Data{data={...data,classes:data.classes.filter(c=>c.name!=='Lớp học vui vẻ')};const fixed=fixedClass(),existing=data.classes.find(c=>c.id===FIXED_CLASS_ID);if(existing){fixed.session=existing.session;fixed.students=fixed.students.map(s=>({...s,avatar:existing.students.find(x=>x.id===s.id)?.avatar??s.avatar}))}return{...data,active:existing&&data.active&&data.classes.some(c=>c.id===data.active)?data.active:fixed.id,classes:[fixed,...data.classes.filter(c=>c.id!==FIXED_CLASS_ID)]}}
