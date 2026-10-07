import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const APP_VERSION = '3.0.2.2';

export const appConfig = {
  supabaseUrl: 'https://vbhtgkvvmwfztswxlvnl.supabase.co',
  // ANON/PUBLISHABLE KEY — KHÔNG dùng service_role key ở frontend.
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
  namHoc: '2026-2027',
  tenTruong: 'THPT Lê Hồng Phong'
};

export const supabase = createClient(
  appConfig.supabaseUrl,
  appConfig.supabaseAnonKey
);

export function normalizeClass(v) {
  return String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeTabs(v) {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean);
    } catch (_) {}
    return s.replace(/^\{|\}$/g, '').split(',').map(x => x.replace(/^"|"$/g, '').trim()).filter(Boolean);
  }
  return [];
}

export function isAdminStaff(staff) {
  if (!staff) return false;
  const roles = [
    staff.vai_tro,
    ...(Array.isArray(staff.vai_tro_list) ? staff.vai_tro_list : normalizeTabs(staff.vai_tro_list))
  ].filter(Boolean).map(x => String(x).trim().toLowerCase());
  return roles.some(x => ['admin', 'quantri', 'quản trị', 'quản trị hệ thống'].includes(x));
}
