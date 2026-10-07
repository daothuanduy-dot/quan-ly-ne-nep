// js/config.js
// Nếu dự án đã có config.js, có thể giữ file hiện tại và chỉ bảo đảm export supabase/appConfig.
// KHÔNG đưa service_role key lên GitHub. Chỉ sử dụng ANON/PUBLISHABLE KEY ở frontend.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const appConfig = {
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  namHoc: '2026-2027',
  tenTruong: 'THPT Lê Hồng Phong',
  classPatterns: {
    10: { khoi: '10', tenKhoi: 'C', nextKhoi: '11', nextTenKhoi: 'B' },
    11: { khoi: '11', tenKhoi: 'B', nextKhoi: '12', nextTenKhoi: 'A' },
    12: { khoi: '12', tenKhoi: 'A', nextKhoi: null, nextTenKhoi: null }
  }
};

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);

export async function getCurrentStaff(){
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return null;
  const maCb = user.user_metadata?.ma_cb || user.email?.split('@')[0];
  if(!maCb) return { email:user.email };
  const { data } = await supabase.from('can_bo').select('*').eq('ma_cb', maCb).maybeSingle();
  return data ? {...data, email:user.email} : { email:user.email, ma_cb:maCb };
}

export async function requireAdmin(){
  const staff = await getCurrentStaff();
  if(!staff) return null;
  const roles = Array.isArray(staff.vai_tro_list) ? staff.vai_tro_list : String(staff.vai_tro||'').split(',').map(x=>x.trim()).filter(Boolean);
  const ok = roles.some(x=>['admin','quan_tri','quản trị','quản trị hệ thống'].includes(String(x).toLowerCase())) ||
             String(staff.vai_tro||'').toLowerCase().includes('admin');
  // Trong giai đoạn phát triển có thể cho phép truy cập nếu chưa bật AUTH ở app cũ.
  // Khi triển khai thật, bỏ dòng dưới và bắt buộc ok.
  if(!ok && appConfig.enforceAdmin === true) throw new Error('Tài khoản không có quyền quản trị hệ thống.');
  return staff;
}

export function normalizeClass(cls=''){
  return String(cls).trim().toUpperCase().replace(/\s+/g,'');
}
export function classParts(cls=''){
  const m=normalizeClass(cls).match(/^(10|11|12)([A-Z]?)(\d+)$/i);
  return m ? {grade:m[1], letter:m[2]||'', number:m[3]} : null;
}
export function nextClass(cls=''){
  const p=classParts(cls); if(!p || p.grade==='12') return null;
  const map={10:'11B',11:'12A'};
  return `${map[p.grade]}${p.number}`;
}
export function yearShift(year='2026-2027'){
  const m=String(year).match(/^(\d{4})-(\d{4})$/); return m ? `${+m[1]+1}-${+m[2]+1}` : '';
}
