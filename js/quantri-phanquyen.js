import { supabase, normalizeTabs, isAdminStaff } from './config.js';

export const PERMISSION_TABS = [
  { key: 'qr', label: 'Quét QR Đi Muộn' },
  { key: 'baovang', label: 'Báo Vắng Học Sinh' },
  { key: 'chamdiem', label: 'Chấm Điểm Thi Đua' },
  { key: 'thongke', label: 'Thống Kê Biểu Đồ' },
  { key: 'xeploai', label: 'Xếp Loại & Danh Hiệu' },
  { key: 'quantri', label: 'Quản Trị Hệ Thống' }
];

let staffRows = [];
let selectedMaCb = '';
let searchText = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isAdmin(row) {
  return isAdminStaff(row);
}

function toast(message, type = '') {
  window.App?.toast?.(message, type);
}

function render(root) {
  const filtered = staffRows.filter(r => {
    const q = searchText.toLowerCase();
    return !q ||
      String(r.ma_cb ?? '').toLowerCase().includes(q) ||
      String(r.ho_ten ?? '').toLowerCase().includes(q) ||
      String(r.vai_tro ?? '').toLowerCase().includes(q);
  });

  const selected = staffRows.find(r => r.ma_cb === selectedMaCb) || null;
  const selectedAdmin = selected ? isAdmin(selected) : false;
  const selectedTabs = selectedAdmin ? PERMISSION_TABS.map(x => x.key) : normalizeTabs(selected?.quyen_tabs);

  root.innerHTML = `
    <div class="notice">
      <strong>V3.0.2:</strong> quyền sử dụng chức năng chỉ đọc/ghi tại
      <code>can_bo.quyen_tabs</code>. Không đọc và không ghi bất kỳ cột
      <code>quyen_xep_loai</code> nào trong <code>danh_sach</code>.
    </div>

    <div class="toolbar">
      <input id="permSearch" placeholder="Tìm mã cán bộ, họ tên, vai trò..." value="${escapeHtml(searchText)}">
      <button id="permReload" class="btn secondary">Tải lại</button>
      <span class="badge">${filtered.length} cán bộ</span>
    </div>

    <div class="grid">
      <div class="stat"><div class="n">${staffRows.length}</div><div class="l">Tổng cán bộ</div></div>
      <div class="stat"><div class="n">${staffRows.filter(isAdmin).length}</div><div class="l">Tài khoản Admin</div></div>
      <div class="stat"><div class="n">${staffRows.filter(r => !isAdmin(r) && normalizeTabs(r.quyen_tabs).length).length}</div><div class="l">Có phân quyền riêng</div></div>
    </div>

    <div style="height:14px"></div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Mã CB</th><th>Họ tên</th><th>Vai trò</th><th>Quyền</th><th></th></tr></thead>
        <tbody>
          ${filtered.map(r => {
            const admin = isAdmin(r);
            const count = admin ? PERMISSION_TABS.length : normalizeTabs(r.quyen_tabs).length;
            return `<tr>
              <td>${escapeHtml(r.ma_cb)}</td>
              <td>${escapeHtml(r.ho_ten)}</td>
              <td>${escapeHtml(r.vai_tro)} ${admin ? '<span class="badge admin">Admin</span>' : ''}</td>
              <td>${count}/${PERMISSION_TABS.length}</td>
              <td><button class="btn secondary perm-select" data-ma="${escapeHtml(r.ma_cb)}">Phân quyền</button></td>
            </tr>`;
          }).join('')}
          ${!filtered.length ? '<tr><td colspan="5">Không tìm thấy cán bộ.</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div style="height:16px"></div>

    <div class="panel" style="padding:15px;background:#f8fafc">
      <div class="page-title">
        <div>
          <h2 style="font-size:17px">${selected ? `Phân quyền: ${escapeHtml(selected.ho_ten)} (${escapeHtml(selected.ma_cb)})` : 'Chọn cán bộ để phân quyền'}</h2>
          <p>${selected ? (selectedAdmin ? 'Tài khoản Admin được toàn quyền theo vai trò; không cần lưu từng checkbox.' : 'Đánh dấu các chức năng được phép sử dụng, sau đó bấm Lưu quyền.') : 'Quyền được lưu trực tiếp vào trường can_bo.quyen_tabs.'}</p>
        </div>
        ${selected && !selectedAdmin ? '<button id="savePerm" class="btn">Lưu quyền</button>' : ''}
      </div>

      ${selected ? `
        ${selectedAdmin ? '<div class="notice">Tài khoản này là <strong>Admin</strong>. Hệ thống V3.0.2 tự động cho phép toàn bộ 6 chức năng chính.</div>' : ''}
        <div class="check-grid">
          ${PERMISSION_TABS.map(p => `
            <div class="check-item">
              <label>
                <input type="checkbox" class="perm-check" value="${p.key}" ${selectedTabs.includes(p.key) ? 'checked' : ''} ${selectedAdmin ? 'disabled' : ''}>
                <span><strong>${escapeHtml(p.label)}</strong><br><small>${p.key}</small></span>
              </label>
            </div>`).join('')}
        </div>
      ` : '<div class="placeholder">Chưa chọn cán bộ.</div>'}
    </div>
  `;

  root.querySelector('#permSearch')?.addEventListener('input', e => {
    searchText = e.target.value;
    render(root);
    const input = root.querySelector('#permSearch');
    input?.focus();
    input?.setSelectionRange(searchText.length, searchText.length);
  });

  root.querySelector('#permReload')?.addEventListener('click', () => load(root));

  root.querySelectorAll('.perm-select').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMaCb = btn.dataset.ma;
      render(root);
    });
  });

  root.querySelector('#savePerm')?.addEventListener('click', async () => {
    const row = staffRows.find(r => r.ma_cb === selectedMaCb);
    if (!row || isAdmin(row)) return;

    const q = [...root.querySelectorAll('.perm-check:checked')].map(x => x.value);

    const { error } = await supabase
      .from('can_bo')
      .update({ quyen_tabs: q })
      .eq('ma_cb', selectedMaCb);

    if (error) {
      console.error('save permissions:', error);
      toast(`Không lưu được phân quyền: ${error.message}`, 'err');
      return;
    }

    row.quyen_tabs = q;
    toast('Đã lưu phân quyền vào can_bo.quyen_tabs.', 'ok');
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
    root.innerHTML = `<div class="danger-box"><strong>Không tải được phân quyền.</strong><br>${escapeHtml(error.message)}<br><br>V3.0.2 chỉ truy vấn can_bo; nếu lỗi vẫn nhắc tới danh_sach.quyen_xep_loai, cần kiểm tra policy/view/function cũ trong Supabase.</div>`;
    return;
  }

  staffRows = data ?? [];
  if (!selectedMaCb && staffRows.length) selectedMaCb = staffRows[0].ma_cb;
  render(root);
}

export async function initPermissions(root) {
  await load(root);
}
