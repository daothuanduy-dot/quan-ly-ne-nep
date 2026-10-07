import { supabase, normalizeTabs, isAdminStaff } from './config.js';

export const PERMISSION_TABS = [
  { key: 'qr', label: 'Quét QR Đi Muộn' },
  { key: 'baovang', label: 'Báo Vắng Học Sinh' },
  { key: 'chamdiem', label: 'Chấm Điểm Thi Đua' },
  { key: 'thongke', label: 'Thống Kê Biểu Đồ' },
  { key: 'xeploai', label: 'Xếp Loại & Danh Hiệu' },
  { key: 'quantri', label: 'Quản Trị Hệ Thống' }
];

let rows = [];
let selected = '';
let keyword = '';

const esc = (v) => String(v ?? '')
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

function isAdmin(row) {
  return isAdminStaff(row);
}

function notify(msg, type='') {
  window.App?.toast?.(msg, type);
}

function normalizePermissionValue(value) {
  // quyen_tabs is JSONB in Supabase and is expected to be a JSON array.
  return normalizeTabs(value).filter(k => PERMISSION_TABS.some(p => p.key === k));
}

function render(root) {
  const filtered = rows.filter(r => {
    const q = keyword.trim().toLowerCase();
    return !q ||
      String(r.ma_cb ?? '').toLowerCase().includes(q) ||
      String(r.ho_ten ?? '').toLowerCase().includes(q) ||
      String(r.vai_tro ?? '').toLowerCase().includes(q);
  });

  const current = rows.find(r => r.ma_cb === selected) || null;
  const admin = current ? isAdmin(current) : false;
  const permissions = admin
    ? PERMISSION_TABS.map(p => p.key)
    : normalizePermissionValue(current?.quyen_tabs);

  root.innerHTML = `
    <div class="notice">
      <strong>V3.0.2.2:</strong> phân quyền sử dụng chức năng được lưu duy nhất tại
      <code>public.can_bo.quyen_tabs</code> (kiểu <strong>jsonb</strong>).
      Module này không truy vấn <code>danh_sach</code>.
    </div>

    <div class="toolbar">
      <input id="permSearch" value="${esc(keyword)}" placeholder="Tìm mã cán bộ, họ tên, vai trò...">
      <button id="permReload" class="btn secondary">Tải lại</button>
      <span class="badge">${filtered.length} cán bộ</span>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Mã CB</th><th>Họ tên</th><th>Vai trò</th><th>Số quyền</th><th>Thao tác</th></tr>
        </thead>
        <tbody>
          ${filtered.map(r => {
            const a = isAdmin(r);
            const count = a ? PERMISSION_TABS.length : normalizePermissionValue(r.quyen_tabs).length;
            return `
              <tr>
                <td>${esc(r.ma_cb)}</td>
                <td>${esc(r.ho_ten)}</td>
                <td>${esc(r.vai_tro)} ${a ? '<span class="badge admin">Admin</span>' : ''}</td>
                <td>${count}/${PERMISSION_TABS.length}</td>
                <td><button class="btn secondary perm-select" data-ma="${esc(r.ma_cb)}">Phân quyền</button></td>
              </tr>`;
          }).join('') || '<tr><td colspan="5">Không có dữ liệu.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div style="height:16px"></div>

    <div class="panel" style="padding:15px;background:#f8fafc">
      <div class="page-title">
        <div>
          <h2 style="font-size:17px">${current ? `Phân quyền: ${esc(current.ho_ten)} (${esc(current.ma_cb)})` : 'Chưa chọn cán bộ'}</h2>
          <p>${current ? (admin
            ? 'Vai trò Admin có toàn quyền tự động; không cần ghi 6 quyền vào quyen_tabs.'
            : 'Chọn quyền rồi bấm Lưu quyền để ghi JSONB vào can_bo.quyen_tabs.') : 'Chọn một cán bộ ở bảng trên.'}</p>
        </div>
        ${current && !admin ? '<button id="savePerm" class="btn">Lưu quyền</button>' : ''}
      </div>

      ${current ? `
        ${admin ? '<div class="notice">Tài khoản Admin được toàn quyền theo <code>vai_tro</code>. Giá trị <code>quyen_tabs = []</code> là hợp lệ.</div>' : ''}
        <div class="check-grid">
          ${PERMISSION_TABS.map(p => `
            <div class="check-item">
              <label>
                <input class="perm-check" type="checkbox" value="${p.key}"
                  ${permissions.includes(p.key) ? 'checked' : ''}
                  ${admin ? 'disabled' : ''}>
                <span><strong>${esc(p.label)}</strong><br><small>${p.key}</small></span>
              </label>
            </div>`).join('')}
        </div>
      ` : '<div class="placeholder">Chưa chọn cán bộ.</div>'}
    </div>
  `;

  root.querySelector('#permSearch')?.addEventListener('input', e => {
    keyword = e.target.value;
    const pos = e.target.selectionStart ?? keyword.length;
    render(root);
    const input = root.querySelector('#permSearch');
    input?.focus();
    input?.setSelectionRange(pos, pos);
  });

  root.querySelector('#permReload')?.addEventListener('click', () => load(root));

  root.querySelectorAll('.perm-select').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = btn.dataset.ma;
      render(root);
    });
  });

  root.querySelector('#savePerm')?.addEventListener('click', async () => {
    const row = rows.find(r => r.ma_cb === selected);
    if (!row || isAdmin(row)) return;

    const newPermissions = [...root.querySelectorAll('.perm-check:checked')]
      .map(el => el.value);

    // JSONB target: send a JavaScript array, which Supabase serializes as JSON.
    const { data, error } = await supabase
      .from('can_bo')
      .update({ quyen_tabs: newPermissions })
      .eq('ma_cb', selected)
      .select('ma_cb,quyen_tabs')
      .maybeSingle();

    if (error) {
      console.error('save permissions:', error);
      notify(`Không lưu được phân quyền: ${error.message}`, 'err');
      return;
    }

    if (!data) {
      notify('Không tìm thấy cán bộ để cập nhật.', 'err');
      return;
    }

    row.quyen_tabs = data.quyen_tabs;
    notify('Đã lưu quyền vào can_bo.quyen_tabs (jsonb).', 'ok');
    render(root);
  });
}

async function load(root) {
  root.innerHTML = '<div class="placeholder">Đang tải danh sách cán bộ...</div>';

  const { data, error } = await supabase
    .from('can_bo')
    .select('ma_cb,ho_ten,vai_tro,vai_tro_list,quyen_tabs,trang_thai')
    .order('ho_ten', { ascending: true });

  if (error) {
    console.error('load permissions:', error);
    root.innerHTML = `
      <div class="danger-box">
        <strong>Không tải được phân quyền.</strong><br>
        ${esc(error.message)}<br><br>
        Module V3.0.2.2 chỉ truy vấn bảng <code>can_bo</code>.
        Nếu thông báo vẫn chứa <code>danh_sach.quyen_xep_loai</code>,
        hãy kiểm tra policy/view/function cũ hoặc cache trình duyệt.
      </div>`;
    return;
  }

  rows = data ?? [];
  if (!selected || !rows.some(r => r.ma_cb === selected)) selected = rows[0]?.ma_cb ?? '';
  render(root);
}

export async function initPermissions(root) {
  await load(root);
}
