import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const list = (v: unknown): string[] => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
  if (![url, serviceKey, vapidPublic, vapidPrivate].every(Boolean)) return json({ ok: false, error: 'Missing server secrets' }, 500);

  let body: {ma_cb?: string; mat_khau?: string; account_ids?: string[]; title?: string; message?: string; url?: string; event_type?: string};
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const staffId = String(body.ma_cb || '').trim();
  const password = String(body.mat_khau || '');
  const ids = [...new Set(list(body.account_ids))].slice(0, 100);
  if (!staffId || !password || !ids.length) return json({ ok: false, error: 'Thiếu thông tin cán bộ hoặc danh sách học sinh.' }, 400);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: staff, error: staffError } = await db.from('can_bo')
    .select('ma_cb,mat_khau,ho_ten,vai_tro,vai_tro_list,lop_quan_ly,lop_giang_day,trang_thai')
    .eq('ma_cb', staffId).eq('mat_khau', password).maybeSingle();
  if (staffError) return json({ ok: false, error: 'Không xác thực được tài khoản cán bộ.' }, 500);
  if (!staff || staff.trang_thai === false || norm(staff.trang_thai) === 'false') return json({ ok: false, error: 'Tài khoản cán bộ không hợp lệ hoặc đã bị khóa.' }, 401);

  const roles = [staff.vai_tro, ...list(staff.vai_tro_list)].map(norm);
  const admin = roles.some(r => ['admin', 'quan tri he thong', 'quan tri'].includes(r));
  const redFlag = roles.some(r => r.includes('co do'));
  const classOfficer = roles.some(r => r.includes('can bo lop'));
  const gvcn = roles.some(r => r === 'gvcn' || r.includes('chu nhiem'));
  const teacher = roles.some(r => r === 'giao vien' || r.includes('giao vien giang day'));
  if (!admin && !redFlag && !classOfficer && !gvcn && !teacher) return json({ ok: false, error: 'Vai trò hiện tại không được gửi thông báo tự động.' }, 403);

  const { data: students, error: studentError } = await db.from('danh_sach')
    .select('ma_hs,ho_ten,lop,trang_thai').in('ma_hs', ids);
  if (studentError) return json({ ok: false, error: 'Không tra cứu được danh sách học sinh.' }, 500);
  let targets = students || [];
  if (!admin && !redFlag) {
    let allowedClasses: string[] = [];
    if (gvcn || classOfficer) allowedClasses.push(String(staff.lop_quan_ly || '').trim());
    if (teacher) allowedClasses.push(...list(staff.lop_giang_day));
    allowedClasses = allowedClasses.filter(Boolean);
    targets = targets.filter(s => allowedClasses.includes(String(s.lop || '').trim()));
  }
  const inactive = ['inactive', 'nghi hoc', 'da nghi', 'false', '0', 'locked', 'khoa'];
  const targetIds = targets.filter(s => !inactive.includes(norm(s.trang_thai))).map(s => String(s.ma_hs));
  if (!targetIds.length) return json({ ok: true, total: 0, sent: 0, failed: 0, message: 'Không có học sinh phù hợp trong phạm vi được phép.' });

  const { data: subs, error: subError } = await db.from('qlnn_push_subscriptions')
    .select('id,account_id,role,subscription').in('account_id', targetIds).in('role', ['student', 'parent']);
  if (subError) return json({ ok: false, error: 'Không đọc được danh sách thiết bị nhận thông báo.' }, 500);
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const payload = JSON.stringify({
    title: String(body.title || 'THPT Lê Hồng Phong').slice(0, 120),
    body: String(body.message || 'Có cập nhật mới trên hệ thống quản lý nề nếp.').slice(0, 500),
    url: '/quan-ly-ne-nep/',
    tag: `qlnn-${String(body.event_type || 'update').replace(/[^a-z0-9_-]/gi, '').slice(0, 24)}-${Date.now()}`
  });
  let sent = 0, failed = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      sent++;
      await db.from('qlnn_push_subscriptions').update({ last_success_at: new Date().toISOString(), last_error: null }).eq('id', sub.id);
    } catch (e) {
      failed++;
      const status = (e as { statusCode?: number })?.statusCode;
      await db.from('qlnn_push_subscriptions').update({ last_error: String((e as Error)?.message || e).slice(0, 500) }).eq('id', sub.id);
      if (status === 404 || status === 410) await db.from('qlnn_push_subscriptions').delete().eq('id', sub.id);
    }
  }
  return json({ ok: true, total: (subs || []).length, sent, failed, target_students: targetIds.length });
});
