let selectedStudentTab2 = null;

document.addEventListener("DOMContentLoaded", async () => {
  await fetchDanhMucDiem();
});

function switchTab2Mode(mode) {
  document.getElementById('tab2-mode-tieu-chi').classList.toggle('hidden', mode !== 'tieu-chi');
  document.getElementById('tab2-mode-sdb-diem-mieng').classList.toggle('hidden', mode !== 'sdb-diem-mieng');
}

function toggleSearchSelect(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  const isVisible = dropdown.classList.contains('show');
  document.querySelectorAll('.search-select-dropdown').forEach(d => d.classList.remove('show'));
  if (!isVisible) dropdown.classList.add('show');
}

function filterSearchSelectItems(dropdownId, inputSearchId) {
  const kw = document.getElementById(inputSearchId).value;
  document.querySelectorAll(`#${dropdownId} .search-select-item`).forEach(item => {
    const txt = item.innerText || item.getAttribute('data-text') || '';
    item.style.display = matchSearchKeyword(txt, kw) ? 'block' : 'none';
  });
}

function onChamDiemKhoiChange() { populateLopDropdown('cd-khoi', 'cd-lop'); }

async function onChamDiemLopChange() {
  const lopVal = document.getElementById('cd-lop').value;
  const inputElem = document.getElementById('cd-hs-input');
  const listElem = document.getElementById('cd-hs-list');
  selectedStudentTab2 = null;

  if (!lopVal) {
    inputElem.value = "-- Chọn Lớp trước để hiển thị học sinh --";
    listElem.innerHTML = '';
    return;
  }

  inputElem.value = "-- Chọn Cá Nhân Học Sinh (Tùy chọn) --";
  const students = await fetchStudentsByClass(lopVal);
  listElem.innerHTML = '<div class="search-select-item text-gray-500 italic" onclick="selectStudentTab2(null)">-- Không chọn cá nhân (Chấm tập thể) --</div>';

  students.forEach(s => {
    const nsStr = s.ngay_sinh ? ` - NS: ${s.ngay_sinh}` : '';
    const displayTxt = `${s.ho_ten}${nsStr}`;
    listElem.innerHTML += `<div class="search-select-item font-medium" data-text="${displayTxt}" onclick="selectStudentTab2('${s.ma_hs}', '${s.ho_ten}')">${displayTxt}</div>`;
  });
}

function selectStudentTab2(maHS, hoTen) {
  if (!maHS) {
    selectedStudentTab2 = null;
    document.getElementById('cd-hs-input').value = "-- Không chọn cá nhân (Chấm tập thể) --";
  } else {
    selectedStudentTab2 = { ma_hs: maHS, ho_ten: hoTen };
    document.getElementById('cd-hs-input').value = hoTen;
  }
  document.getElementById('cd-hs-dropdown').classList.remove('show');
}

async function fetchDanhMucDiem() {
  try {
    let { data } = await _supabase.from('danh_muc_diem').select('*');
    allDanhMucDiem = data || [];
    filterDanhMucDiem();
  } catch(e){}
}

function filterDanhMucDiem() {
  const loaiSelected = document.querySelector('input[name="loai-diem"]:checked').value;
  const select = document.getElementById('list-danh-muc-diem');
  if (!select) return;

  const filtered = allDanhMucDiem.filter(item => {
    const itemLoai = String(item.loai || '').toLowerCase();
    const diemVal = parseFloat(item.diem) || 0;
    return loaiSelected === 'tru' ? (itemLoai.includes('tru') || diemVal < 0) : (itemLoai.includes('cong') || diemVal > 0);
  });

  select.innerHTML = `<option value="">-- Chọn Tiêu Chí (${filtered.length} tiêu chí) --</option>`;
  filtered.forEach(item => select.innerHTML += `<option value="${item.ma_hd}">[${item.ma_hd}] ${item.ten_hd} (${item.diem}đ)</option>`);
  select.innerHTML += `<option value="LINH_HOAT" class="font-bold text-amber-600">➕ [Nhập tiêu chí & điểm linh hoạt...]</option>`;
}

function toggleCustomPointInput() {
  const val = document.getElementById('list-danh-muc-diem').value;
  document.getElementById('custom-point-box').classList.toggle('hidden', val !== 'LINH_HOAT');
}

async function submitChamDiem() {
  const lop = document.getElementById('cd-lop').value;
  const buoiVal = getCurrentBuoi();
  const loaiDiem = document.querySelector('input[name="loai-diem"]:checked').value;
  const tcVal = document.getElementById('list-danh-muc-diem').value;
  const ghiChu = document.getElementById('cd-ghichu').value.trim();

  if (!lop) return alert("Vui lòng chọn Lớp!");
  if (!tcVal) return alert("Vui lòng chọn nội dung tiêu chí!");

  const khoi = lop.match(/\d+/)?.[0] || '10';
  let tenHD = '', diemSo = 0, maHD = tcVal;

  if (tcVal === 'LINH_HOAT') {
    tenHD = document.getElementById('custom-ten-hd').value.trim();
    diemSo = parseFloat(document.getElementById('custom-diem').value);
    maHD = 'LINH_HOAT';
    if (!tenHD || isNaN(diemSo)) return alert("Nhập đủ nội dung & số điểm linh hoạt!");
  } else {
    const found = allDanhMucDiem.find(d => String(d.ma_hd) === String(tcVal));
    if (found) { tenHD = found.ten_hd; diemSo = parseFloat(found.diem) || 0; } else { tenHD = tcVal; }
  }

  const chiTietStr = ghiChu ? `[${maHD}] ${tenHD} (${ghiChu})`.slice(0, 100) : `[${maHD}]${tenHD}`.slice(0, 100);
  const trangThaiVal = loaiDiem === 'cong' ? 'diem_thuong' : 'diem_tru';

  try {
    const targetRecord = !selectedStudentTab2 ? {
      ma_hs: `LOP_${lop}`, ho_ten: `Tập thể Lớp ${lop}`, khoi: String(khoi), lop: String(lop), ngay_diem_danh: formatDateToYYYYMMDD(new Date()), buoi: buoiVal, trang_thai: trangThaiVal, ma_hd: maHD, chi_tiet: chiTietStr, diem: diemSo, ten_nguoi_cap_nhat: currentUser.ho_ten
    } : {
      ma_hs: selectedStudentTab2.ma_hs, ho_ten: selectedStudentTab2.ho_ten, khoi: String(khoi), lop: String(lop), ngay_diem_danh: formatDateToYYYYMMDD(new Date()), buoi: buoiVal, trang_thai: trangThaiVal, ma_hd: maHD, chi_tiet: chiTietStr, diem: diemSo, ten_nguoi_cap_nhat: currentUser.ho_ten
    };

    const { error } = await _supabase.from('diem_danh_master').insert([targetRecord]);
    if (error) throw error;
    alert(`Đã lưu chấm điểm thành công!`);
    document.getElementById('cd-ghichu').value = '';
  } catch (e) { alert("Lỗi lưu CSDL: " + e.message); }
}

function calcSdbTotalPreview() {
  const n10 = parseInt(document.getElementById('sdb-sl-tiet10')?.value) || 0;
  const n9 = parseInt(document.getElementById('sdb-sl-tiet9')?.value) || 0;
  const n8 = parseInt(document.getElementById('sdb-sl-tiet8')?.value) || 0;
  const n7 = parseInt(document.getElementById('sdb-sl-tiet7')?.value) || 0;
  const nYeu = parseInt(document.getElementById('sdb-sl-tietyeu')?.value) || 0;

  const totalDiem = (n10 * 2) + (n9 * 1) + (n8 * 0) - (n7 * 2) - (nYeu * 5);
  const previewElem = document.getElementById('sdb-total-preview');
  if (previewElem) previewElem.innerText = `${totalDiem >= 0 ? '+' + totalDiem : totalDiem} điểm`;
  return { totalDiem, totalTiets: n10 + n9 + n8 + n7 + nYeu };
}

async function onSdbLopChange() {
  const lopVal = document.getElementById('sdb-lop').value;
  const grid = document.getElementById('sdb-student-grid');
  grid.innerHTML = '';
  if (!lopVal) return;

  const students = await fetchStudentsByClass(lopVal);
  students.forEach(s => {
    grid.innerHTML += `
      <label class="flex items-center gap-2 p-2 border rounded hover:bg-emerald-50 cursor-pointer text-xs font-semibold">
        <input type="checkbox" value="${s.ma_hs}" data-name="${s.ho_ten}" class="w-4 h-4 text-emerald-600 rounded">
        <span class="truncate">${s.ho_ten}</span>
      </label>
    `;
  });
}

async function submitSoDauBaiDiemMieng() {
  const lop = document.getElementById('sdb-lop').value;
  if (!lop) return alert("Vui lòng chọn Lớp!");

  const khoi = lop.match(/\d+/)?.[0] || '10';
  const buoiVal = getCurrentBuoi();
  const todayStr = formatDateToYYYYMMDD(new Date());
  const recordsToInsert = [];

  const { totalDiem: diemSdbLop, totalTiets } = calcSdbTotalPreview();
  if (totalTiets > 0) {
    recordsToInsert.push({
      ma_hs: `LOP_${lop}`, ho_ten: `Tập thể Lớp ${lop}`, khoi: String(khoi), lop: String(lop), ngay_diem_danh: todayStr, buoi: buoiVal, trang_thai: diemSdbLop >= 0 ? 'diem_thuong' : 'diem_tru', ma_hd: 'SDB_TONG_HOP_TUAN', chi_tiet: `[SỔ ĐẦU BÀI TUẦN] ${totalTiets} tiết`, diem: diemSdbLop, ten_nguoi_cap_nhat: currentUser.ho_ten
    });
  }

  const checkedBoxes = document.querySelectorAll('#sdb-student-grid input[type="checkbox"]:checked');
  const diemHsRaw = parseFloat(document.getElementById('sdb-diem-hs-val').value) || 10;
  const monNote = document.getElementById('sdb-mon-danh-gia')?.value.trim() || 'Điểm miệng';
  let diemThiDuaCaNhan = diemHsRaw >= 9 ? 1.0 : (diemHsRaw >= 8 ? 0.5 : (diemHsRaw < 5 ? -2.0 : 0));

  checkedBoxes.forEach(cb => {
    recordsToInsert.push({
      ma_hs: cb.value, ho_ten: cb.getAttribute('data-name'), khoi: String(khoi), lop: String(lop), ngay_diem_danh: todayStr, buoi: buoiVal, trang_thai: diemThiDuaCaNhan >= 0 ? 'diem_thuong' : 'diem_tru', ma_hd: 'SDB_DIEM_MIENG', chi_tiet: `[ĐIỂM MIỆNG] ${monNote}:${diemHsRaw}đ`, diem: diemThiDuaCaNhan, ten_nguoi_cap_nhat: currentUser.ho_ten
    });
  });

  if (recordsToInsert.length === 0) return alert("Vui lòng nhập số tiết SĐB hoặc tích chọn ít nhất 1 học sinh!");

  try {
    const { error } = await _supabase.from('diem_danh_master').insert(recordsToInsert);
    if (error) throw error;
    alert("Lưu SĐB & Điểm miệng thành công!");
  } catch (e) { alert("Lỗi lưu CSDL: " + e.message); }
}