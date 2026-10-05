// =======================================================
// FILE: js/tab3-thongke.js - XỬ LÝ TAB 3: THỐNG KÊ & XẾP HẠNG
// =======================================================

async function renderFullStatistics() {
  const doiTuong = document.getElementById('tk-doituong').value;
  const dateVal = document.getElementById('tk-date-tuan').value || formatDateToYYYYMMDD(new Date());

  try {
    let query = _supabase.from('diem_danh_master').select('*');
    
    // Nếu là GVCN -> Tự động giới hạn xem lớp phụ trách
    if (hasAnyRole(['gv_chu_nhiem']) && !hasAnyRole(['quan_tri', 'lanh_dao'])) {
      query = query.eq('lop', currentUser.lop_phu_trach);
    }

    const { data, error } = await query;
    if (error) throw error;

    let totalVP = 0, totalCong = 0, totalTru = 0, totalVang = 0;
    const lopMap = {};

    (data || []).forEach(r => {
      if (r.diem < 0) { totalTru += r.diem; totalVP++; }
      if (r.diem > 0) { totalCong += r.diem; }
      if (r.trang_thai && r.trang_thai.includes('vang')) totalVang++;

      if (!lopMap[r.lop]) lopMap[r.lop] = { lop: r.lop, khoi: r.khoi, cong: 0, tru: 0, tong: 100 };
      if (r.diem > 0) lopMap[r.lop].cong += r.diem;
      if (r.diem < 0) lopMap[r.lop].tru += Math.abs(r.diem);
      lopMap[r.lop].tong += r.diem;
    });

    // Cập nhật thẻ hiển thị tổng
    document.getElementById('tk-stat-tong-vp').innerText = totalVP;
    document.getElementById('tk-stat-tong-cong').innerText = `+${totalCong}`;
    document.getElementById('tk-stat-tong-tru').innerText = `${totalTru}`;
    document.getElementById('tk-stat-tong-vang').innerText = totalVang;

    // Hiển thị bảng xếp hạng Lớp
    const lopList = Object.values(lopMap).sort((a, b) => b.tong - a.tong);
    const tbodyLop = document.getElementById('lop-rank-table-body');
    tbodyLop.innerHTML = '';

    lopList.forEach((l, idx) => {
      tbodyLop.innerHTML += `
        <tr class="border-b hover:bg-slate-50 text-center">
          <td class="p-2 font-bold">${idx + 1}</td>
          <td class="p-2 text-left font-bold text-blue-700">${l.lop}</td>
          <td class="p-2">${l.khoi}</td>
          <td class="p-2">100</td>
          <td class="p-2 text-green-600 font-bold">+${l.cong}</td>
          <td class="p-2 text-red-600 font-bold">-${l.tru}</td>
          <td class="p-2 font-bold text-blue-900">${l.tong}</td>
          <td class="p-2 font-semibold">${l.tong >= 90 ? 'Tốt' : 'Khá'}</td>
          <td class="p-2"><button onclick="viewLopDetail('${l.lop}')" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Chi tiết</button></td>
        </tr>`;
    });

  } catch (err) {
    console.error("Lỗi thống kê:", err);
  }
}

function viewLopDetail(tenLop) {
  document.getElementById('modal-detail-title').innerText = `Lịch sử Thi đua Lớp ${tenLop}`;
  document.getElementById('modal-drilldown-detail').classList.remove('hidden');
}

function closeDrilldownModal() {
  document.getElementById('modal-drilldown-detail').classList.add('hidden');
}