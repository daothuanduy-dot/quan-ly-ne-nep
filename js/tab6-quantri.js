// =======================================================
// FILE: js/tab5-quantri.js - XỬ LÝ TAB 5: QUẢN TRỊ HỆ THỐNG
// =======================================================

function switchAdminSubTab(subTab) {
  document.querySelectorAll('.admin-sub-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-sub-btn').forEach(el => el.classList.remove('bg-purple-600', 'text-white'));

  const target = document.getElementById(`admin-sub-${subTab}`);
  if (target) target.classList.remove('hidden');
}

// -------------------------------------------------------
// 1. QUẢN LÝ PHÂN QUYỀN ĐA VAI TRÒ (MULTI-ROLE)
// -------------------------------------------------------

async function loadCanBoRoleManager() {
  try {
    const { data, error } = await _supabase.from('can_bo').select('*');
    if (error) throw error;

    const tbody = document.getElementById('admin-role-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    (data || []).forEach(cb => {
      const userRoles = Array.isArray(cb.vai_tro) ? cb.vai_tro : (cb.vai_tro || '').split(',');
      
      let checkboxesHTML = '';
      Object.keys(ROLE_DEFINITIONS).forEach(roleKey => {
        const isChecked = userRoles.includes(roleKey) ? 'checked' : '';
        checkboxesHTML += `
          <label class="inline-flex items-center gap-1 text-xs mr-3 my-1">
            <input type="checkbox" class="cb-role-check" data-macb="${cb.ma_cb}" value="${roleKey}" ${isChecked}>
            ${ROLE_DEFINITIONS[roleKey]}
          </label>`;
      });

      tbody.innerHTML += `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-2.5 font-bold">${cb.ma_cb}</td>
          <td class="p-2.5 font-semibold text-blue-900">${cb.ho_ten}</td>
          <td class="p-2.5">${checkboxesHTML}</td>
          <td class="p-2.5 text-center">
            <button onclick="saveUserRoles('${cb.ma_cb}')" class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-emerald-700">Lưu quyền</button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error("Lỗi tải danh sách cán bộ:", err);
  }
}

async function saveUserRoles(maCB) {
  const checkboxes = document.querySelectorAll(`.cb-role-check[data-macb="${maCB}"]:checked`);
  const selectedRoles = Array.from(checkboxes).map(c => c.value);

  try {
    const { error } = await _supabase
      .from('can_bo')
      .update({ vai_tro: selectedRoles })
      .eq('ma_cb', maCB);

    if (error) throw error;
    alert(`Cập nhật thành công vai trò cho cán bộ [${maCB}]!`);
  } catch (err) {
    alert("Lỗi lưu phân quyền: " + err.message);
  }
}

// -------------------------------------------------------
// 2. QUẢN LÝ THIẾT LẬP LỊCH HỌC BUỔI SÁNG / BUỔI CHIỀU
// -------------------------------------------------------

async function loadLichHocConfig(tenLop) {
  if (!tenLop) return;

  try {
    const { data, error } = await _supabase
      .from('lich_hoc')
      .select('*')
      .eq('ten_lop', tenLop);

    if (error) throw error;

    // Render lưới chọn Lịch học từ Thứ 2 -> Thứ 7 cho Buổi Sáng & Chiều
    const container = document.getElementById('admin-lich-hoc-grid');
    if (!container) return;
    container.innerHTML = '';

    const days = [
      { id: 2, label: 'Thứ 2' },
      { id: 3, label: 'Thứ 3' },
      { id: 4, label: 'Thứ 4' },
      { id: 5, label: 'Thứ 5' },
      { id: 6, label: 'Thứ 6' },
      { id: 7, label: 'Thứ 7' }
    ];

    days.forEach(day => {
      const sangItem = (data || []).find(d => d.thu_trong_tuan === day.id && d.buoi === 'sang');
      const chieuItem = (data || []).find(d => d.thu_trong_tuan === day.id && d.buoi === 'chieu');

      const isSangHoc = sangItem ? sangItem.co_hoc : false;
      const isChieuHoc = chieuItem ? chieuItem.co_hoc : false;

      container.innerHTML += `
        <div class="bg-slate-50 p-3 rounded-xl border space-y-2">
          <strong class="text-blue-800 text-sm block border-b pb-1">${day.label}</strong>
          <div class="flex flex-col gap-1 text-xs">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="lh-check" data-thu="${day.id}" data-buoi="sang" ${isSangHoc ? 'checked' : ''}>
              <span>Học Buổi Sáng</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="lh-check" data-thu="${day.id}" data-buoi="chieu" ${isChieuHoc ? 'checked' : ''}>
              <span>Học Buổi Chiều</span>
            </label>
          </div>
        </div>`;
    });

  } catch (err) {
    alert("Lỗi tải lịch học: " + err.message);
  }
}

async function saveLichHocConfig() {
  const tenLop = document.getElementById('admin-lh-lop-select').value;
  if (!tenLop) return alert("Vui lòng chọn Lớp!");

  const checkboxes = document.querySelectorAll('.lh-check');
  const records = [];

  checkboxes.forEach(cb => {
    records.push({
      ten_lop: tenLop,
      thu_trong_tuan: parseInt(cb.getAttribute('data-thu')),
      buoi: cb.getAttribute('data-buoi'),
      co_hoc: cb.checked
    });
  });

  try {
    // Xóa lịch cũ và ghi nhận lịch học mới
    await _supabase.from('lich_hoc').delete().eq('ten_lop', tenLop);
    const { error } = await _supabase.from('lich_hoc').insert(records);

    if (error) throw error;
    alert(`Đã cập nhật Lịch học thành công cho lớp ${tenLop}!`);
  } catch (err) {
    alert("Lỗi cập nhật lịch học: " + err.message);
  }
}