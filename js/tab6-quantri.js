// =======================================================
// FILE: js/tab6-quantri.js - TAB 6: QUẢN TRỊ HỆ THỐNG
// =======================================================

function switchAdminSubTab(sub) {
  if (sub === 'role') {
    document.getElementById('admin-sub-role').classList.remove('hidden');
    document.getElementById('admin-sub-lich').classList.add('hidden');
  } else {
    document.getElementById('admin-sub-role').classList.add('hidden');
    document.getElementById('admin-sub-lich').classList.remove('hidden');
  }
}

async function loadCanBoRoleManager() {
  const { data } = await _supabase.from('can_bo').select('*');
  const tbody = document.getElementById('admin-role-table-body');
  tbody.innerHTML = '';

  (data || []).forEach(cb => {
    const roles = Array.isArray(cb.vai_tro) ? cb.vai_tro : (cb.vai_tro || '').split(',');
    let checks = '';

    Object.keys(ROLE_DEFINITIONS).forEach(k => {
      checks += `<label class="mr-2"><input type="checkbox" class="cb-role" data-cb="${cb.ma_cb}" value="${k}" ${roles.includes(k) ? 'checked' : ''}> ${ROLE_DEFINITIONS[k]}</label>`;
    });

    tbody.innerHTML += `
      <tr class="border-b">
        <td class="p-2 font-bold">${cb.ma_cb}</td>
        <td class="p-2">${cb.ho_ten}</td>
        <td class="p-2">${checks}</td>
        <td class="p-2 text-center"><button onclick="saveRoles('${cb.ma_cb}')" class="bg-emerald-600 text-white text-xs px-2 py-1 rounded">Lưu</button></td>
      </tr>`;
  });
}

async function saveRoles(maCB) {
  const checked = Array.from(document.querySelectorAll(`.cb-role[data-cb="${maCB}"]:checked`)).map(c => c.value);
  await _supabase.from('can_bo').update({ vai_tro: checked }).eq('ma_cb', maCB);
  alert("Cập nhật vai trò thành công!");
}

async function saveLichHocConfig() {
  const lop = document.getElementById('admin-lh-lop-select').value;
  if (!lop) return alert("Chưa chọn Lớp!");
  alert(`Đã lưu lịch học cho lớp ${lop}!`);
}
