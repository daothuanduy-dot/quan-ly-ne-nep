import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const APP_VERSION='3.0.5.25.33';
export const appConfig={
  supabaseUrl:'https://vbhtgkvvmwfztswxlvnl.supabase.co',
  supabaseAnonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
  namHoc:'2026-2027',
  tenTruong:'THPT Lê Hồng Phong',
  // Khóa công khai VAPID sẽ được điền sau khi tạo cặp khóa Web Push. Không đặt khóa riêng tại frontend.
  webPushPublicKey:'REPLACE_WITH_VAPID_PUBLIC_KEY'
};
export const supabase=createClient(appConfig.supabaseUrl,appConfig.supabaseAnonKey);
export const PERMISSION_TABS=[
 {key:'qr',label:'Quét QR thẻ HS'},
 {key:'baovang',label:'Báo Vắng Học Sinh'},
 {key:'chamdiem',label:'Chấm Điểm Thi Đua'},
 {key:'thongke',label:'Thống Kê Biểu Đồ'},
 {key:'xeploai',label:'Xếp Loại & Danh Hiệu'},
 {key:'quantri',label:'Quản Trị Hệ Thống'}
];
export function normalizeTabs(v){
 if(Array.isArray(v)) return v.map(String).map(x=>x.trim()).filter(Boolean);
 if(typeof v==='string'){try{const x=JSON.parse(v);if(Array.isArray(x))return x.map(String).map(s=>s.trim()).filter(Boolean)}catch{}}
 return [];
}

export const STAFF_ROLES=[
 {key:'Admin',label:'Quản trị hệ thống'},
 {key:'GVCN',label:'Giáo viên chủ nhiệm'},
 {key:'Giáo viên',label:'Giáo viên giảng dạy'},
 {key:'Cán bộ lớp',label:'Cán bộ lớp (học sinh)'},
 {key:'Cờ đỏ',label:'Cờ đỏ (học sinh)'},
 {key:'Trực',label:'Cán bộ trực'}
];
export const CLASS_MANAGEMENT_TYPES=[
 {key:'Chủ nhiệm',label:'Chủ nhiệm'},
 {key:'Giảng dạy',label:'Giảng dạy'},
 {key:'Cán bộ lớp',label:'Cán bộ lớp'}
];
export function roleOf(s){
 const roles=[s?.vai_tro,...normalizeTabs(s?.vai_tro_list)].filter(Boolean).map(x=>String(x).trim().toLowerCase());
 if(roles.some(x=>['admin','quantri','quản trị','quản trị hệ thống'].includes(x)))return 'Admin';
 if(roles.some(x=>['gvcn','giáo viên chủ nhiệm','giao vien chu nhiem'].includes(x)))return 'GVCN';
 if(roles.some(x=>['cán bộ lớp','can bo lop'].includes(x)))return 'Cán bộ lớp';
 if(roles.some(x=>['cờ đỏ','co do','cờ do','cỏ đỏ','co do (hoc sinh)'].includes(x)))return 'Cờ đỏ';
 if(roles.some(x=>['trực','truc','cán bộ trực','can bo truc'].includes(x)))return 'Trực';
 if(roles.some(x=>['giáo viên','giao vien','gv'].includes(x)))return 'Giáo viên';
 return String(s?.vai_tro||'').trim();
}
export function managedClasses(s){
 if(!s)return [];
 const role=roleOf(s);
 if(role==='Admin')return null; // null = toàn trường
 if(role==='GVCN')return s.lop_quan_ly?[String(s.lop_quan_ly).trim()]:[];
 if(role==='Cán bộ lớp')return s.lop_quan_ly?[String(s.lop_quan_ly).trim()]:[];
 if(role==='Cờ đỏ')return null; // Cờ đỏ được quét/ghi nhận cho toàn trường, không gán lớp.
 const a=Array.isArray(s.lop_giang_day)?s.lop_giang_day:normalizeTabs(s.lop_giang_day);
 return a.map(String).map(x=>x.trim()).filter(Boolean);
}
export function canManageClass(s,lop){
 const scope=managedClasses(s); if(scope===null)return true;
 return scope.includes(String(lop||'').trim());
}
export function canManageAbsence(s,lop){
 const role=roleOf(s); return role==='Admin'||role==='GVCN'||role==='Giáo viên' ? canManageClass(s,lop):false;
}
export function canScore(s,lop,target='Cá nhân'){
 const role=roleOf(s); if(role==='Admin')return true;
 if(!canManageClass(s,lop))return false;
 if(role==='Cán bộ lớp')return target==='Sổ đầu bài'||target==='Điểm học sinh';
 if(role==='Cờ đỏ')return target==='Cá nhân';
 return role==='GVCN'||role==='Giáo viên';
}
export function canViewAllStats(s){return roleOf(s)==='Admin'||roleOf(s)==='GVCN';}
export function canMonitorAbsence(s){return ['Admin','Trực'].includes(roleOf(s));}

export function isAdminStaff(s){
 if(!s)return false;
 const roles=[s.vai_tro,...normalizeTabs(s.vai_tro_list)].filter(Boolean).map(x=>String(x).trim().toLowerCase());
 return roles.includes('admin')||roles.includes('quantri')||roles.includes('quản trị')||roles.includes('quản trị hệ thống');
}
