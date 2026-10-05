// =======================================================
// FILE: js/tab4-xeploai.js - XỬ LÝ TAB 4: XẾP LOẠI & DANH HIỆU
// =======================================================

async function renderXepLoai() {
  if (!canAccessTab(4)) return alert("Bạn không có quyền xem bảng Xếp loại Thi đua!");

  try {
    const { data, error } = await _supabase.from('diem_danh_master').select('*');
    if (error) throw error;

    const lopMap = {};
    (data || []).forEach(r => {
      if (!lopMap[r.lop]) lopMap[r.lop] = { lop: r.lop, khoi: r.khoi, diem: 100 };
      lopMap[r.lop].diem += r.diem;
    });

    const list = Object.values(lopMap).sort((a, b) => b.diem - a.diem);
    const tbody = document.getElementById('xl-table-body');
    tbody.innerHTML = '';

    list.forEach((l, idx) => {
      let danhHieu = "Cờ Nhì Thi Đua";
      if (idx === 0) danhHieu = "🏆 Cờ Nhất Thi Đua";
      else if (idx === 1) danhHieu = "🥈 Cờ Nhì Thi Đua";
      else if (idx === 2) danhHieu = "🥉 Cờ Ba Thi Đua";

      tbody.innerHTML += `
        <tr class="border-b text-center hover:bg-slate-50">
          <td class="p-3 font-bold">${idx + 1}</td>
          <td class="p-3 text-left font-bold text-blue-800">${l.lop}</td>
          <td class="p-3">${l.khoi}</td>
          <td class="p-3 font-bold text-emerald-700">${l.diem}</td>
          <td class="p-3 text-left font-bold text-amber-600">${danhHieu}</td>
        </tr>`;
    });
  } catch (err) {
    alert("Lỗi tổng hợp danh hiệu: " + err.message);
  }
}