// =======================================================
// FILE: js/tab1-baovang.js - XỬ LÝ TAB 1: BÁO VẮNG HỌC SINH
// =======================================================

let tab1Students = []; // Lưu danh sách học sinh của lớp đang chọn

// 1. KHI CHỌN KHỐI -> TRUY VẤN VÀ TẢI LẠI DANH SÁCH LỚP TƯƠNG ỨNG TỪ SUPABASE
async function onBaoVangKhoiChange() {
  const khoiVal = document.getElementById('bv-khoi').value;
  const lopSelect = document.getElementById('bv-lop');
  lopSelect.innerHTML = '<option value="">-- Đang tải Lớp... --</option>';
  tab1Students = [];
  renderBaoVangRows();

  try {
    let query = _supabase.from('lop').select('*');
    if (khoiVal) {
      query = query.eq('khoi_id', String(khoiVal));
    }
    const { data: lopData, error } = await query;
    if (error) throw error;

    let options = '<option value="">-- Chọn Lớp --</option>';
    if (lopData && lopData.length > 0) {
      lopData.sort((a, b) => (a.ten_lop || '').localeCompare(b.ten_lop || '', 'vi', { numeric: true }));
      lopData.forEach(l => {
        options += `<option value="${l.ten_lop}">${l.ten_lop}</option>`;
      });
    } else {
      options = '<option value="">-- Không có lớp nào --</option>';
    }
    lopSelect.innerHTML = options;
  } catch (err) {
    console.error("Lỗi lấy danh sách Lớp từ CSDL:", err);
    lopSelect.innerHTML = '<option value="">-- Lỗi tải Lớp từ CSDL --</option>';
  }
}

// 2. KHI CHỌN LỚP -> TRUY VẤN HỌC SINH TỪ BẢNG hoc_sinh
async function onBaoVangLopChange() {
  const lopVal = document.getElementById('bv-lop').value;
  tab1Students = [];

  if (!lopVal) {
    renderBaoVangRows();
    return;
  }

  try {
    const { data, error } = await _supabase
      .from('hoc_sinh')
      .select('*')
      .eq('ten_lop', lopVal.trim());

    if (error) throw error;

    tab1Students = (data || []).map(s => {
      let birth = s.ngay_sinh || s.ngaysinh || s.ngay_sinh_hs || '';
      if (birth && birth.includes('-')) {
        const parts = birth.split('-');
        if (parts.length === 3) birth = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return {
        ma_hs: String(s.ma_hs || s.id || '').trim(),
        ho_ten: String(s.ho_ten || s.ten || '').trim(),
        ngay_sinh: birth
      };
    });

    // Sắp xếp danh sách tên học sinh theo bảng chữ cái Việt Nam
    tab1Students.sort((a, b) => compareVietnameseNamesAsc(a.ho_ten, b.ho_ten));

  } catch (err) {
    console.error("Lỗi lấy danh sách học sinh:", err);
    alert("Không thể kết nối CSDL để lấy danh sách học sinh!");
  }

  renderBaoVangRows();
}

// 3. RENDER DANH SÁCH DROPDOWN CHỌN HỌC SINH
function renderBaoVangRows() {
  const lopVal = document.getElementById('bv-lop').value;
  const count = parseInt(document.getElementById('bv-soluong').value) || 0;
  const container = document.getElementById('bv-student-rows');
  container.innerHTML = '';

  if (!lopVal) {
    container.innerHTML = '<p class="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl border text-center">Vui lòng chọn Lớp để tải danh sách học sinh.</p>';
    return;
  }

  if (tab1Students.length === 0) {
    container.innerHTML = '<p class="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border text-center">Không tìm thấy học sinh nào thuộc lớp này trong CSDL!</p>';
    return;
  }

  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="bv-row bg-slate-50 p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <span class="font-bold text-blue-600 text-xs shrink-0">HS ${i + 1}</span>
          <select class="bv-student-select border p-2 rounded-lg text-sm w-full bg-white font-medium">
            ${getStudentOptionsHTML()}
          </select>
        </div>
        <div class="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border shrink-0">
          <label class="flex items-center gap-1.5 text-xs font-bold text-emerald-700 cursor-pointer">
            <input type="radio" name="bv_type_${i}" value="co_phep" checked class="w-4 h-4 text-emerald-600"> Có phép (-2đ)
          </label>
          <label class="flex items-center gap-1.5 text-xs font-bold text-red-600 cursor-pointer">
            <input type="radio" name="bv_type_${i}" value="khong_phep" class="w-4 h-4 text-red-600"> Không phép (-4đ)
          </label>
        </div>
      </div>`;
  }
}

function getStudentOptionsHTML() {
  let options = '<option value="">-- Chọn Học Sinh --</option>';
  tab1Students.forEach(s => {
    const birthStr = s.ngay_sinh ? ` (${s.ngay_sinh})` : '';
    options += `<option value="${s.ma_hs}">${s.ho_ten}${birthStr}</option>`;
  });
  return options;
}

// 4. LƯU BÁO VẮNG LÊN BẢNG diem_danh_master
async function submitBaoVang() {
  const lop = document.getElementById('bv-lop').value;
  const buoiVal = getCurrentBuoi(); // Tự động lấy Buổi (Sáng/Chiều) theo giờ máy tính

  if (!lop) return alert("Vui lòng chọn Lớp!");

  const rows = document.querySelectorAll('.bv-row');
  const recordsToInsert = [];
  const chosenSet = new Set();
  const khoi = lop.match(/\d+/)?.[0] || '10';

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const selectElem = row.querySelector('.bv-student-select');
    const maHS = selectElem.value;
    const typeRadio = row.querySelector(`input[name="bv_type_${index}"]:checked`);
    const typeVal = typeRadio ? typeRadio.value : 'co_phep';

    if (!maHS) {
      alert(`Vui lòng chọn học sinh ở vị trí thứ ${index + 1}!`);
      return;
    }
    if (chosenSet.has(maHS)) {
      alert(`Học sinh ở vị trí thứ ${index + 1} bị trùng lặp!`);
      return;
    }
    chosenSet.add(maHS);

    const hsObj = tab1Students.find(s => s.ma_hs === maHS);
    const hoTen = hsObj ? hsObj.ho_ten : maHS;
    const isCoPhep = typeVal === 'co_phep';

    recordsToInsert.push({
      ma_hs: String(maHS).slice(0, 30),
      ho_ten: String(hoTen).slice(0, 50),
      khoi: String(khoi),
      lop: String(lop).slice(0, 20),
      ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
      buoi: buoiVal,
      trang_thai: isCoPhep ? 'vang_co_phep' : 'vang_khong_phep',
      ma_hd: isCoPhep ? 'HD03a' : 'HD03b',
      chi_tiet: `Vắng ${isCoPhep ? 'Có phép (-2đ)' : 'Không phép (-4đ)'}`,
      diem: isCoPhep ? -2.0 : -4.0,
      ten_nguoi_cap_nhat: currentUser ? String(currentUser.ho_ten).slice(0, 50) : 'Admin'
    });
  }

  try {
    const { error } = await _supabase.from('diem_danh_master').insert(recordsToInsert);
    if (error) throw error;

    alert(`Đã lưu vắng thành công cho ${recordsToInsert.length} học sinh Lớp ${lop}!`);
    renderBaoVangRows();
  } catch (e) {
    alert("Lỗi lưu CSDL: " + e.message);
  }
}
