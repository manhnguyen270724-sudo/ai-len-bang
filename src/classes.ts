import {type Data,emptySession,parseStudents,uid} from './core';
export function createClass(data:Data,name:string,list:string):Data{
 const clean=name.trim().replace(/\s+/g,' ');
 if(!clean||clean.length>150)throw Error('Tên lớp cần từ 1 đến 150 ký tự.');
 if(data.classes.length>=100)throw Error('Tối đa 100 lớp. Hãy xóa bớt lớp trước.');
 if(data.classes.some(c=>c.name.toLocaleLowerCase('vi')===clean.toLocaleLowerCase('vi')))throw Error('Tên lớp đã tồn tại. Hãy chọn tên khác.');
 const students=parseStudents(list);if(students.length>2000)throw Error('Mỗi lớp tối đa 2.000 sinh viên.');
 const c={id:uid(),name:clean,students,session:emptySession()};return{...data,active:c.id,classes:[...data.classes,c]};
}
