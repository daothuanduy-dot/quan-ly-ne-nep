// js/attendance.js

async function fetchStudentsByClass(className) {
  if (!className) return [];
  try {
    let { data } = await _supabase.from('hoc_sinh').select('*').eq('ten_lop', className.trim());
    currentClassStudents = (data || []).map(s => {
      // Lấy linh hoạt trường ngày sinh trong CSDL Supabase
      const birthDate = s.ngay_sinh || s.ngaysinh || s.ngay_sinh_hs || '';
      return {
        ma_hs: String(s.ma_hs || s.ma_hoc_sinh || s.id || '').trim(),
        ho_ten: String(s.ho_ten || s.ten || '').trim(),
        ten_lop: className,
        ngay_sinh: birthDate
      };
    });
    currentClassStudents.sort((a, b) => compareVietnameseNamesAsc(a.ho_ten, b.ho_ten));
    return currentClassStudents;
  } catch (err) { 
    return []; 
  }
}

function renderBaoVangRows() {
  const lopVal = document.getElementById('bv-lop').value;
  const count = parseInt(document.getElementById('bv-soluong').value) || 0;
  const container = document.getElementById('bv-student-rows');
  container.innerHTML = '';
  if (!lopVal) { 
    container.innerHTML = '<p class="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl border text-center">Chọn Lớp để chọn học sinh vắng.</p>'; 
    return; 
  }

  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="bv-row bg-slate-50 p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <span class="font-bold text-blue-600 text-xs">HS ${i + 1}</span>
          <select class="bv-student-select border p-2 rounded text-sm w-full bg-white"></select>
        </div>
        <div class="flex items-center gap-4 bg-white px-3 py-1.5 rounded border">
          <label class="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <input type="radio" name="bv_type_${i}" value="co_phep" checked> Có phép
          </label>
          <label class="flex items-center gap-1.5 text-xs font-bold text-red-600">
            <input type="radio" name="bv_type_${i}" value="khong_phep"> Không phép
          </label>
        </div>
      </div>`;
  }
  updateBaoVangDropdowns();
}

function updateBaoVangDropdowns() {
  const selects = document.querySelectorAll('.bv-student-select');
  selects.forEach((selectElem) => {
    let optionsHTML = '<option value="">-- Chọn Học Sinh --</option>';
    currentClassStudents.forEach(s => {
      // Hiển thị dạng: Nguyễn Văn A (15/08/2008)
      const birthStr = s.ngay_sinh ? ` (${s.ngay_sinh})` : '';
      optionsHTML += `<option value="${s.ma_hs}">${s.ho_ten}${birthStr}</option>`;
    });
    selectElem.innerHTML = optionsHTML;
  });
}

async function submitBaoVang() {
  const lop = document.getElementById('bv-lop').value;
  // Hệ thống tự động ngầm định tính Buổi (Sáng/Chiều) theo thời điểm ghi nhận
  const buoiVal = getCurrentBuoi();
  
  if (!lop) return alert("Vui lòng chọn Lớp!");

  const rows = document.querySelectorAll('.bv-row');
  const recordsToInsert = [];
  let isValid = true;
  const chosenSet = new Set();
  const khoi = lop.match(/\d+/)?.[0] || '10';

  rows.forEach((row, index) => {
    const selectElem = row.querySelector('.bv-student-select');
    const maHS = selectElem.value;
    const typeRadio = row.querySelector(`input[name="bv_type_${index}"]:checked`);
    const typeVal = typeRadio ? typeRadio.value : 'co_phep';

    if (!maHS) { isValid = false; return; }
    if (chosenSet.has(maHS)) { alert(`Học sinh ở hàng ${index + 1} bị trùng!`); isValid = false; return; }
    chosenSet.add(maHS);

    const studentObj = studentFastMap.get(maHS);
    const hoTen = studentObj ? studentObj.ho_ten : maHS;
    const isCoPhep = typeVal === 'co_phep';

    recordsToInsert.push({
      ma_hs: String(maHS).slice(0, 30),
      ho_ten: String(hoTen).slice(0, 50),
      khoi: String(khoi),
      lop: String(lop).slice(0, 20),
      ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
      buoi: buoiVal, // Lưu ngầm định xuống CSDL
      trang_thai: isCoPhep ? 'vang_co_phep' : 'vang_khong_phep',
      ma_hd: isCoPhep ? 'HD03a' : 'HD03b',
      chi_tiet: `Vắng ${isCoPhep ? 'Có phép (-2đ)' : 'Không phép (-4đ)'}`,
      diem: isCoPhep ? -2.0 : -4.0,
      ten_nguoi_cap_nhat: currentUser ? String(currentUser.ho_ten).slice(0, 50) : 'Admin'
    });
  });

  if (!isValid) return alert("Vui lòng chọn đầy đủ tên học sinh vắng!");

  try {
    const { error } = await _supabase.from('diem_danh_master').insert(recordsToInsert);
    if (error) throw error;
    alert(`Đã lưu vắng cho ${recordsToInsert.length} học sinh Lớp ${lop}!`);
    renderBaoVangRows();
  } catch (e) { alert("Lỗi lưu CSDL: " + e.message); }
}
