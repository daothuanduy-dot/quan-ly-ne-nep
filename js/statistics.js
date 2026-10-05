document.addEventListener("DOMContentLoaded", () => {
  if(document.getElementById('tk-date-tuan')) document.getElementById('tk-date-tuan').valueAsDate = new Date();
  if(document.getElementById('admin-edit-date')) document.getElementById('admin-edit-date').valueAsDate = new Date();
});

function onThongKeScopeChange() {
  const scope = document.getElementById('tk-doituong').value;
  document.getElementById('box-tk-khoi').classList.toggle('hidden', scope === 'toan_truong');
  document.getElementById('box-tk-lop').classList.toggle('hidden', scope !== 'theo_lop');
}

function onThongKeTimeTypeChange() {
  const timeType = document.getElementById('tk-time-type').value;
  document.getElementById('box-time-tuan').classList.toggle('hidden', timeType !== 'tuan');
}

async function renderFullStatistics() {
  const scope = document.getElementById('tk-doituong').value;
  const khoiVal = document.getElementById('tk-khoi').value;
  const lopVal = document.getElementById('tk-lop').value;

  const dateInputStr = document.getElementById('tk-date-tuan').value || formatDateToYYYYMMDD(new Date());
  const d = parseLocalDateStr(dateInputStr);
  const day = d.getDay();
  const diffMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffMon);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const start = formatDateToYYYYMMDD(mon), end = formatDateToYYYYMMDD(sun);

  document.getElementById('time-scope-banner').innerText = `Đang xem thống kê từ ${mon.toLocaleDateString('vi-VN')} đến ${sun.toLocaleDateString('vi-VN')}`;

  let query = _supabase.from('diem_danh_master').select('*').gte('ngay_diem_danh', start).lte('ngay_diem_danh', end);
  const { data: rawMasterData, error } = await query;
  if (error) return alert("Lỗi CSDL: " + error.message);

  activeFilteredMasterRecords = rawMasterData || [];
  let filteredRecords = activeFilteredMasterRecords;

  if (scope === 'theo_lop' && lopVal) filteredRecords = activeFilteredMasterRecords.filter(r => String(r.lop).trim() === lopVal.trim());
  else if (scope === 'theo_khoi' && khoiVal) filteredRecords = activeFilteredMasterRecords.filter(r => String(r.khoi) === khoiVal || (r.lop && r.lop.startsWith(khoiVal)));

  let totalVP = 0, totalCong = 0, totalTru = 0, totalVang = 0;
  filteredRecords.forEach(r => {
    const diem = parseFloat(r.diem) || 0;
    const trangThai = String(r.trang_thai || '').toLowerCase();
    if (diem > 0) totalCong += diem;
    if (diem < 0) totalTru += Math.abs(diem);
    if (trangThai.includes('muon') || diem < 0) totalVP += 1;
    if (trangThai.includes('vang')) totalVang += 1;
  });

  document.getElementById('tk-stat-tong-vp').innerText = totalVP;
  document.getElementById('tk-stat-tong-cong').innerText = `+${totalCong}`;
  document.getElementById('tk-stat-tong-tru').innerText = `-${totalTru}`;
  document.getElementById('tk-stat-tong-vang').innerText = totalVang;

  renderClassRanking(filteredRecords, scope, khoiVal, lopVal);
  renderStudentRanking(filteredRecords);
}

function renderClassRanking(records, scope, khoiVal, lopVal) {
  let targetClasses = allLopList;
  if (scope === 'theo_lop' && lopVal) targetClasses = allLopList.filter(l => l.ten_lop === lopVal);
  else if (scope === 'theo_khoi' && khoiVal) targetClasses = allLopList.filter(l => String(l.khoi_id) === khoiVal || l.ten_lop.startsWith(khoiVal));

  const classMap = new Map();
  targetClasses.forEach(c => classMap.set(c.ten_lop, { ten_lop: c.ten_lop, khoi: c.khoi_id, cong: 0, tru: 0 }));

  records.forEach(r => {
    const cLop = String(r.lop || '').trim();
    if (classMap.has(cLop)) {
      const item = classMap.get(cLop);
      const d = parseFloat(r.diem) || 0;
      if (d > 0) item.cong += d;
      if (d < 0) item.tru += Math.abs(d);
    }
  });

  const classStats = Array.from(classMap.values()).map(cs => {
    const tongDiem = 100 + cs.cong - cs.tru;
    let xepLoai = tongDiem >= 95 ? 'Lớp Xuất Sắc' : (tongDiem >= 85 ? 'Lớp Tiên Tiến' : 'Lớp Khá');
    return { ...cs, tongDiem, xepLoai };
  });

  classStats.sort((a, b) => b.tongDiem - a.tongDiem);

  const tbody = document.getElementById('lop-rank-table-body');
  tbody.innerHTML = '';

  classStats.forEach((cs, index) => {
    tbody.innerHTML += `
      <tr class="border-b clickable-row" onclick="openDrilldownModal('LOP', '${cs.ten_lop}')">
        <td class="p-2.5 text-center font-bold text-blue-600">${index + 1}</td>
        <td class="p-2.5 font-bold text-gray-800">${cs.ten_lop}</td>
        <td class="p-2.5 text-center">${cs.khoi}</td>
        <td class="p-2.5 text-center text-gray-500">100</td>
        <td class="p-2.5 text-center font-bold text-green-600">+${cs.cong}</td>
        <td class="p-2.5 text-center font-bold text-red-600">-${cs.tru}</td>
        <td class="p-2.5 text-center font-bold text-base text-blue-700">${cs.tongDiem}đ</td>
        <td class="p-2.5 text-center text-xs font-semibold text-amber-700">${cs.xepLoai}</td>
        <td class="p-2.5 text-center"><button class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Chi Tiết</button></td>
      </tr>
    `;
  });
}

function renderStudentRanking(records) {
  const studentMap = new Map();

  records.forEach(r => {
    const mHS = String(r.ma_hs || '').trim();
    if (!mHS || mHS.startsWith('LOP_')) return;

    const sObj = studentFastMap.get(mHS);
    if (!studentMap.has(mHS)) {
      studentMap.set(mHS, {
        ma_hs: mHS, ho_ten: sObj?.ho_ten || r.ho_ten || mHS, ten_lop: sObj?.ten_lop || r.lop || 'Chưa xếp lớp', cong: 0, tru: 0, soVang: 0, soMuon: 0
      });
    }

    const item = studentMap.get(mHS);
    const d = parseFloat(r.diem) || 0;
    const st = String(r.trang_thai || '').toLowerCase();
    if (d > 0) item.cong += d;
    if (d < 0) item.tru += Math.abs(d);
    if (st.includes('vang')) item.soVang += 1;
    if (st.includes('muon')) item.soMuon += 1;
  });

  const studentStats = Array.from(studentMap.values()).map(s => ({ ...s, tongDiem: 100 + s.cong - s.tru }));
  // Sắp xếp theo Tên -> Đệm -> Họ A-Z
  studentStats.sort((a, b) => compareVietnameseNamesAsc(a.ho_ten, b.ho_ten));

  const tbody = document.getElementById('hs-rank-table-body');
  tbody.innerHTML = '';

  studentStats.slice(0, 30).forEach((st, index) => {
    tbody.innerHTML += `
      <tr class="border-b clickable-row" onclick="openDrilldownModal('HOCSINH', '${st.ma_hs}', '${st.ho_ten}')">
        <td class="p-2.5 text-center font-bold text-emerald-700">${index + 1}</td>
        <td class="p-2.5 text-center font-mono font-bold text-blue-600">${st.ma_hs}</td>
        <td class="p-2.5 font-bold text-gray-800">${st.ho_ten}</td>
        <td class="p-2.5 text-center font-semibold">${st.ten_lop}</td>
        <td class="p-2.5 text-center font-bold text-red-600">${st.soVang}</td>
        <td class="p-2.5 text-center font-bold text-amber-600">${st.soMuon}</td>
        <td class="p-2.5 text-center font-bold text-green-600">+${st.cong}</td>
        <td class="p-2.5 text-center font-bold text-red-600">-${st.tru}</td>
        <td class="p-2.5 text-center font-bold text-emerald-700">${st.tongDiem}đ</td>
        <td class="p-2.5 text-center"><button class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Chi Tiết</button></td>
      </tr>
    `;
  });
}

function openDrilldownModal(type, targetId, extraName = '') {
  const modal = document.getElementById('modal-drilldown-detail');
  const title = document.getElementById('modal-detail-title');
  const tbody = document.getElementById('modal-detail-table-body');

  title.innerText = type === 'LOP' ? `Chi Tiết Điểm Lớp ${targetId}` : `Chi Tiết Học Sinh ${extraName}`;
  const matched = activeFilteredMasterRecords.filter(r => type === 'LOP' ? (r.lop === targetId || r.ma_hs === `LOP_${targetId}`) : r.ma_hs === targetId);

  tbody.innerHTML = '';
  matched.forEach((r, idx) => {
    tbody.innerHTML += `
      <tr class="border-b"><td class="p-2.5 text-center">${idx + 1}</td><td class="p-2.5 text-center">${r.ngay_diem_danh}</td><td class="p-2.5">${r.chi_tiet}</td><td class="p-2.5 text-center font-bold">${r.diem}đ</td></tr>
    `;
  });
  modal.classList.remove('hidden');
}

function closeDrilldownModal() { document.getElementById('modal-drilldown-detail').classList.add('hidden'); }
function renderXepLoai() { alert("Đã cập nhật bảng xếp loại thi đua!"); }

function switchAdminSubTab(subTabName) {
  document.querySelectorAll('.admin-sub-btn').forEach(b => b.classList.remove('active', 'bg-purple-600', 'text-white'));
  event.target.classList.add('active', 'bg-purple-600', 'text-white');
}

async function fetchAdminRecordsToEdit() {
  const dateVal = document.getElementById('admin-edit-date').value;
  let query = _supabase.from('diem_danh_master').select('*').limit(30);
  if (dateVal) query = query.eq('ngay_diem_danh', dateVal);

  const { data } = await query;
  const tbody = document.getElementById('admin-edit-table-body');
  tbody.innerHTML = '';
  (data || []).forEach(r => {
    tbody.innerHTML += `
      <tr class="border-b"><td class="p-2.5 text-center">${r.id}</td><td class="p-2.5">${r.ngay_diem_danh}</td><td class="p-2.5">${r.ho_ten} (${r.lop})</td><td class="p-2.5">${r.chi_tiet}</td><td class="p-2.5 text-center font-bold">${r.diem}đ</td><td class="p-2.5 text-center"><button onclick="deleteSingleRecord(${r.id})" class="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">Xóa</button></td></tr>
    `;
  });
}

async function deleteSingleRecord(id) {
  if (!confirm("Xóa bản ghi này?")) return;
  await _supabase.from('diem_danh_master').delete().eq('id', id);
  fetchAdminRecordsToEdit();
}