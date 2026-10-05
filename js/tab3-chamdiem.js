// =======================================================
// FILE: js/tab3-chamdiem.js - TAB 3: CHẤM ĐIỂM THI ĐƯA
// =======================================================

function switchTab3Mode(mode) {
  if (mode === 'tieu-chi') {
    document.getElementById('tab3-mode-tieu-chi').classList.remove('hidden');
    document.getElementById('tab3-mode-sdb-diem-mieng').classList.add('hidden');
  } else {
    document.getElementById('tab3-mode-tieu-chi').classList.add('hidden');
    document.getElementById('tab3-mode-sdb-diem-mieng').classList.remove('hidden');
  }
}

async function onChamDiemLopChange() {
  const lopVal = document.getElementById('cd-lop').value;
  const selectHS = document.getElementById('cd-hs-select');
  selectHS.innerHTML = '<option value="">-- Tập thể Lớp --</option>';

  if (lopVal) {
    const { data } = await _supabase.from('hoc_sinh').select('*').eq('ten_lop', lopVal.trim());
    (data || []).forEach(s => {
      selectHS.innerHTML += `<option value="${s.ma_hs}">${s.ho_ten}</option>`;
    });
  }
}

async function submitChamDiem() {
  const lop = document.getElementById('cd-lop').value;
  const ghiChu = document.getElementById('cd-ghichu').value;
  const loaiDiem = document.querySelector('input[name="loai-diem"]:checked').value;

  if (!lop) return alert("Vui lòng chọn Lớp!");

  const rec = {
    lop: lop,
    ho_ten: 'Tập thể Lớp',
    ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
    buoi: getCurrentBuoi(),
    trang_thai: loaiDiem === 'tru' ? 'vi_pham' : 'khen_thuong',
    chi_tiet: ghiChu,
    diem: loaiDiem === 'tru' ? -2.0 : 2.0,
    ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'Cán bộ'
  };

  const { error } = await _supabase.from('diem_danh_master').insert([rec]);
  if (!error) alert("Đã lưu điểm thi đua!");
}
