// =======================================================
// FILE: js/tab4-thongke.js - TAB 4: THỐNG KÊ & XẾP HẠNG
// =======================================================

async function renderFullStatistics() {
  const { data } = await _supabase.from('diem_danh_master').select('*');
  const lopMap = {};

  (data || []).forEach(r => {
    if (!lopMap[r.lop]) lopMap[r.lop] = { lop: r.lop, khoi: r.khoi, tong: 100 };
    lopMap[r.lop].tong += r.diem;
  });

  const list = Object.values(lopMap).sort((a, b) => b.tong - a.tong);
  const tbody = document.getElementById('lop-rank-table-body');
  tbody.innerHTML = '';

  list.forEach((l, idx) => {
    tbody.innerHTML += `
      <tr class="border-b text-center hover:bg-slate-50">
        <td class="p-2 font-bold">${idx + 1}</td>
        <td class="p-2 text-left font-bold text-blue-700">${l.lop}</td>
        <td class="p-2">${l.khoi || '10'}</td>
        <td class="p-2 font-bold">${l.tong}</td>
        <td class="p-2 font-semibold">${l.tong >= 90 ? 'Tốt' : 'Khá'}</td>
      </tr>`;
  });
}
