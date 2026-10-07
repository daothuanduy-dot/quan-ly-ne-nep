// ============================================================
// FILE: js/config.js
// VERSION: 3.0.1
// PURPOSE: Supabase configuration - ES Module
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const APP_VERSION = '3.0.1';

export const appConfig = {
  version: APP_VERSION,
  supabaseUrl: 'https://vbhtgkvvmwfztswxlvnl.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo',
  namHoc: '2026-2027',
  tenTruong: 'THPT Lê Hồng Phong',
  loginFunction: 'login_can_bo'
};

export const supabase = createClient(
  appConfig.supabaseUrl,
  appConfig.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

export function normalizeClass(value = '') {
  return String(value).trim().toUpperCase().replace(/\s+/g, '');
}

export function classParts(value = '') {
  const m = normalizeClass(value).match(/^(10|11|12)([A-Z]?)(\d+)$/);
  return m ? { grade: m[1], letter: m[2] || '', number: m[3] } : null;
}

export function nextClass(value = '') {
  const p = classParts(value);
  if (!p || p.grade === '12') return null;
  return `${p.grade === '10' ? '11B' : '12A'}${p.number}`;
}

export function yearShift(year = appConfig.namHoc, delta = 1) {
  const m = String(year).match(/^(\d{4})-(\d{4})$/);
  return m ? `${Number(m[1]) + delta}-${Number(m[2]) + delta}` : '';
}
