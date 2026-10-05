// =======================================================
// FILE: js/tab5-xeploai.js - TAB 5: XẾP LOẠI & DANH HIỆU
// =======================================================

async function renderXepLoai() {
  const { data } = await _supabase.from('diem_danh_master').select('*');
  const lopMap = {};

  (data || []).forEach(r => {
    if (!lopMap[r.lop]) lopMap[r.lop] = { lop: r.lop, diem: 100 };
    lopMap[r.lop].diem += r.diem;
  });

  const list = Object.values(lopMap).sort((a, b) => b.diem - a.diem);
  const tbody = document.getElementById('xl-table-body');
  tbody.innerHTML = '';

  list.forEach((l, idx) => {
    tbody.innerHTML += `
      <tr class="border-b text-center hover:bg-slate-50">
        <td class="p-3 font-bold">${idx + 1}</td>
        <td class="p-3 text-left font-bold text-blue-800">${l.lop}</td>
        <td class="p-3 font-bold text-emerald-700">${l.diem}</td>
        <td class="p-3 text-left font-bold text-amber-600">${idx === 0 ? '🏆 Cờ Nhất' : '🥈 Cờ Nhì'}</td>
      </tr>`;
  });
}
