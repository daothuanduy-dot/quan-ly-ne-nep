import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const APP_VERSION='3.0.4';
export const appConfig={
  supabaseUrl:'https://vbhtgkvvmwfztswxlvnl.supabase.co',
  supabaseAnonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
  namHoc:'2026-2027',
  tenTruong:'THPT Lê Hồng Phong'
};
export const supabase=createClient(appConfig.supabaseUrl,appConfig.supabaseAnonKey);
export const PERMISSION_TABS=[
 {key:'qr',label:'Quét QR Đi Muộn'},
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
export function isAdminStaff(s){
 if(!s)return false;
 const roles=[s.vai_tro,...normalizeTabs(s.vai_tro_list)].filter(Boolean).map(x=>String(x).trim().toLowerCase());
 return roles.includes('admin')||roles.includes('quantri')||roles.includes('quản trị')||roles.includes('quản trị hệ thống');
}
