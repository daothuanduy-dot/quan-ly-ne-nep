// =======================================================
// FILE: js/tab2-chamdiem.js - XỬ LÝ TAB 2: CHẤM ĐIỂM & SỔ ĐẦU BÀI
// =======================================================

function switchTab2Mode(mode) {
  if (mode === 'tieu-chi') {
    document.getElementById('tab2-mode-tieu-chi').classList.remove('hidden');
    document.getElementById('tab2-mode-sdb-diem-mieng').classList.add('hidden');
    document.getElementById('btn-mode-tc').className = "px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white";
    document.getElementById('btn-mode-sdb').className = "px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-700";
  } else {
    document.getElementById('tab2-mode-tieu-chi').classList.add('hidden');
    document.getElementById('tab2-mode-sdb-diem-mieng').classList.remove('hidden');
    document.getElementById('btn-mode-tc').className = "px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-700";
    document.getElementById('btn-mode-sdb').className = "px-4 py-2 rounded-lg font-bold text-sm bg-indigo-600 text-white";
  }
}

async function submitChamDiem() {
  const lop = document.getElementById('cd-lop').value;
  const maHS = document.getElementById('cd-hs-input').getAttribute('data-val') || '';
  const ghiChu = document.getElementById('cd-ghichu').value;
  const loaiDiem = document.querySelector('input[name="loai-diem"]:checked').value;
  const selectDanhMuc = document.getElementById('list-danh-muc-diem').value;

  if (!lop) return alert("Vui lòng chọn Lớp!");

  let diem = 0;
  let chiTiet = ghiChu;

  if (selectDanhMuc === 'khac') {
    chiTiet = document.getElementById('custom-ten-hd').value;
    diem = parseFloat(document.getElementById('custom-diem').value) || 0;
  } else {
    diem = loaiDiem === 'tru' ? -2.0 : 2.0;
  }

  const record = {
    ma_hs: maHS,
    ho_ten: document.getElementById('cd-hs-input').value || 'Tập thể Lớp',
    khoi: lop.match(/\d+/)?.[0] || '10',
    lop: lop,
    ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
    buoi: getCurrentBuoi(),
    trang_thai: loaiDiem === 'tru' ? 'vi_pham' : 'khen_thuong',
    ma_hd: 'CD01',
    chi_tiet: chiTiet,
    diem: diem,
    ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'Chấm điểm viên'
  };

  try {
    const { error } = await _supabase.from('diem_danh_master').insert([record]);
    if (error) throw error;
    alert("Đã lưu kết quả chấm điểm thi đua!");
  } catch (err) {
    alert("Lỗi kết nối CSDL: " + err.message);
  }
}

async function submitSoDauBaiDiemMieng() {
  const lop = document.getElementById('sdb-lop').value;
  if (!lop) return alert("Vui lòng chọn Lớp!");

  const t10 = parseInt(document.getElementById('sdb-sl-tiet10').value) || 0;
  const t9 = parseInt(document.getElementById('sdb-sl-tiet9').value) || 0;
  const t7 = parseInt(document.getElementById('sdb-sl-tiet7').value) || 0;
  const tYeu = parseInt(document.getElementById('sdb-sl-tietyeu').value) || 0;

  const tongDiemSDB = (t10 * 2) + (t9 * 1) + (t7 * -2) + (tYeu * -5);

  const record = {
    ma_hs: '',
    ho_ten: 'Sổ Đầu Bài Lớp',
    khoi: lop.match(/\d+/)?.[0] || '10',
    lop: lop,
    ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
    buoi: getCurrentBuoi(),
    trang_thai: 'so_dau_bai',
    ma_hd: 'SDB',
    chi_tiet: `T10:${t10}, T9:${t9}, T7:${t7}, T.Yếu:${tYeu}`,
    diem: tongDiemSDB,
    ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'GVBM'
  };

  try {
    const { error } = await _supabase.from('diem_danh_master').insert([record]);
    if (error) throw error;
    alert("Đã lưu Sổ Đầu Bài tuần này!");
  } catch (err) {
    alert("Lỗi lưu dữ liệu: " + err.message);
  }
}