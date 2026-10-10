import {appConfig} from './config.js';

/**
 * Gửi Web Push sau khi nghiệp vụ đã lưu thành công.
 * Không chứa QLNN_PUSH_SECRET/service-role key ở trình duyệt.
 * Edge Function xác thực lại tài khoản cán bộ và phạm vi lớp.
 */
export async function notifyStudents(accountIds, title, message, user = window.App?.Auth?.currentUser, eventType = 'student_update') {
  const ids = [...new Set((accountIds || []).map(x => String(x ?? '').trim()).filter(Boolean))];
  if (!ids.length) return { ok: true, total: 0, sent: 0, failed: 0, skipped: true };
  if (!user?.ma_cb || !user?.credentialPassword) {
    console.warn('[QLNN WebPush] Không gửi được: phiên cán bộ thiếu thông tin xác thực.');
    return { ok: false, message: 'Phiên đăng nhập thiếu thông tin xác thực để gửi thông báo.' };
  }
  let aggregate = { ok: true, total: 0, sent: 0, failed: 0 };
  // Chia lô để tránh payload lớn và cho phép gửi cả lớp/toàn khối.
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    try {
      const response = await fetch(`${appConfig.supabaseUrl}/functions/v1/send-student-event`, {
        method: 'POST',
        headers: {
          apikey: appConfig.supabaseAnonKey,
          Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ma_cb: user.ma_cb,
          mat_khau: user.credentialPassword,
          account_ids: batch,
          title: String(title || 'THPT Lê Hồng Phong').slice(0, 120),
          message: String(message || 'Có cập nhật mới trên hệ thống quản lý nề nếp.').slice(0, 500),
          event_type: eventType,
          url: '/quan-ly-ne-nep/'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        aggregate.ok = false;
        aggregate.failed += batch.length;
        console.warn('[QLNN WebPush] Gửi sự kiện thất bại:', result.error || result.message || response.status);
        continue;
      }
      aggregate.total += Number(result.total || 0);
      aggregate.sent += Number(result.sent || 0);
      aggregate.failed += Number(result.failed || 0);
    } catch (error) {
      aggregate.ok = false;
      aggregate.failed += batch.length;
      console.warn('[QLNN WebPush] Không kết nối được Edge Function:', error);
    }
  }
  return aggregate;
}

export async function notifyClassStudents(supabase, className, title, message, user = window.App?.Auth?.currentUser, eventType = 'student_update') {
  if (!className) return { ok: true, total: 0, sent: 0, failed: 0, skipped: true };
  const all = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from('danh_sach').select('ma_hs,trang_thai').eq('lop', className).order('ma_hs').range(from, from + 499);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  const inactive = ['inactive', 'nghi hoc', 'đã nghỉ', 'false', '0', 'locked', 'khóa', 'khoa'];
  return notifyStudents(all.filter(s => !inactive.includes(String(s.trang_thai || '').trim().toLowerCase())).map(s => s.ma_hs), title, message, user, eventType);
}
