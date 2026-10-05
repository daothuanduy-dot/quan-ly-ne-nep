// =======================================================
// FILE: js/tab2-baovang.js - TAB 2: BÁO VẮNG HỌC SINH
// =======================================================

let tab2Students = [];

async function onBaoVangKhoiChange() {
  const khoiVal = document.getElementById('bv-khoi').value;
  const lopSelect = document.getElementById('bv-lop');
  lopSelect.innerHTML = '<option value="">-- Đang tải... --</option>';

  const { data: lopData } = await _supabase.from('lop').select('*');
  let options = '<option value="">-- Chọn Lớp --</option>';

  (lopData || []).forEach(l => {
    if (!khoiVal || String(l.khoi_id) === String(khoiVal)) {
      options += `<option value="${l.ten_lop}">${l.ten_lop}</option>`;
    }
  });
  lopSelect.innerHTML = options;
}

async function onBaoVangLopChange() {
  const lopVal = document.getElementById('bv-lop').value;
  tab2Students = [];

  if (lopVal) {
    const { data } = await _supabase.from('hoc_sinh').select('*').eq('ten_lop', lopVal.trim());
    tab2Students = (data || []).map(s => ({
      ma_hs: String(s.ma_hs || s.id).trim(),
      ho_ten: String(s.ho_ten || s.ten).trim(),
      ngay_sinh: s.ngay_sinh || ''
    }));
    tab2Students.sort((a, b) => compareVietnameseNamesAsc(a.ho_ten, b.ho_ten));
  }
  renderBaoVangRows();
}

function renderBaoVangRows() {
  const count = parseInt(document.getElementById('bv-soluong').value) || 0;
  const container = document.getElementById('bv-student-rows');
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    let opts = '<option value="">-- Chọn Học Sinh --</option>';
    tab2Students.forEach(s => {
      opts += `<option value="${s.ma_hs}">${s.ho_ten} (${s.ngay_sinh || 'N/A'})</option>`;
    });

    container.innerHTML += `
      <div class="bv-row bg-slate-50 p-3 rounded-xl border flex justify-between items-center gap-3">
        <select class="bv-student-select border p-2 rounded-lg text-sm w-full bg-white">${opts}</select>
        <div class="flex gap-3 shrink-0">
          <label class="text-xs font-bold text-emerald-700"><input type="radio" name="bv_type_${i}" value="co_phep" checked> Có phép (-2đ)</label>
          <label class="text-xs font-bold text-red-600"><input type="radio" name="bv_type_${i}" value="khong_phep"> Không phép (-4đ)</label>
        </div>
      </div>`;
  }
}

async function submitBaoVang() {
  const lop = document.getElementById('bv-lop').value;
  if (!lop) return alert("Vui lòng chọn Lớp!");

  const rows = document.querySelectorAll('.bv-row');
  const records = [];

  rows.forEach((row, i) => {
    const maHS = row.querySelector('.bv-student-select').value;
    const typeVal = row.querySelector(`input[name="bv_type_${i}"]:checked`).value;
    const isCoPhep = typeVal === 'co_phep';
    const hs = tab2Students.find(s => s.ma_hs === maHS);

    if (maHS) {
      records.push({
        ma_hs: maHS,
        ho_ten: hs ? hs.ho_ten : maHS,
        khoi: lop.match(/\d+/)?.[0] || '10',
        lop: lop,
        ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
        buoi: getCurrentBuoi(),
        trang_thai: isCoPhep ? 'vang_co_phep' : 'vang_khong_phep',
        diem: isCoPhep ? -2.0 : -4.0,
        ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'Cán bộ'
      });
    }
  });

  const { error } = await _supabase.from('diem_danh_master').insert(records);
  if (!error) {
    alert("Lưu vắng thành công!");
    renderBaoVangRows();
  }
}
