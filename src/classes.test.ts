import {describe,it,expect} from 'vitest';
import {createClass} from './classes';
import {fixedClass,withFixedClass} from './fixedClass';
import {sample,parseBackup} from './core';
describe('Quản lý nhiều lớp',()=>{
 it('xóa lớp mẫu và giữ lớp riêng cùng lớp cố định',()=>{const c=fixedClass(),own={...sample(),name:'Lớp riêng'};const data=withFixedClass({version:1,active:own.id,classes:[c,sample(),own]});expect(data.classes.map(c=>c.name)).toEqual(['PNV27A','Lớp riêng']);expect(data.active).toBe(own.id)});
 it('tạo nhiều lớp với danh sách và buổi độc lập, lưu/đọc lại',()=>{const first=createClass({version:1,active:'',classes:[fixedClass()]},' PNV28A ','An\nBình');const second=createClass(first,'PNV29A','SV01\tChi');expect(second.classes).toHaveLength(3);expect(second.active).not.toBe(first.active);expect(second.classes[1].students).toHaveLength(2);expect(second.classes[2].students[0].name).toBe('Chi');second.classes[1].session.called.push('test');expect(second.classes[2].session.called).toEqual([]);expect(parseBackup(JSON.stringify(second))).toEqual(second)});
 it('cho phép lớp rỗng, từ chối tên rỗng/trùng và danh sách sai',()=>{const data={version:1 as const,active:'',classes:[fixedClass()]};expect(createClass(data,'Lớp mới','').classes[1].students).toEqual([]);expect(()=>createClass(data,'  ','')).toThrow();expect(()=>createClass(data,'pnv27a','')).toThrow();expect(()=>createClass(data,'Lớp mới','SV | ')).toThrow()});
});
