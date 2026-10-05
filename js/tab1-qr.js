// =======================================================
// FILE: js/tab1-qr.js - TAB 1: QUÉT MÃ QR
// =======================================================

let html5QrcodeScanner = null;

function startQRScanner() {
  if (!canAccessTab(1)) return alert("Không có quyền sử dụng Quét QR!");
  if (html5QrcodeScanner) stopQRScanner();

  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => processQRCode(decodedText),
    () => {}
  ).catch(err => alert("Không mở được Camera: " + err));
}

function stopQRScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      document.getElementById('reader').innerHTML = '';
      html5QrcodeScanner = null;
    });
  }
}

function processManualQR() {
  const val = document.getElementById('manual-ma-hs').value.trim();
  if (val) processQRCode(val);
}

async function processQRCode(qrData) {
  try {
    const { data: hsData, error } = await _supabase
      .from('hoc_sinh')
      .select('*')
      .or(`ma_hs.eq.${qrData},id.eq.${qrData}`)
      .single();

    if (error || !hsData) return alert(`Không tìm thấy học sinh mã QR: ${qrData}`);

    const lopHS = hsData.ten_lop;
    const buoi = getCurrentBuoi();
    const thu = getCurrentThu();

    // Kiểm tra Lịch học
    const { data: lichData } = await _supabase
      .from('lich_hoc')
      .select('co_hoc')
      .eq('ten_lop', lopHS)
      .eq('thu_trong_tuan', thu)
      .eq('buoi', buoi)
      .single();

    if (!lichData || !lichData.co_hoc) {
      return alert(`KHÔNG GHI NHẬN: Lớp ${lopHS} không có lịch học buổi ${buoi === 'sang' ? 'Sáng' : 'Chiều'} hôm nay!`);
    }

    document.getElementById('modal-ma-hs').innerText = hsData.ma_hs;
    document.getElementById('modal-ho-ten').innerText = hsData.ho_ten;
    document.getElementById('modal-lop').innerText = hsData.ten_lop;

    const action = document.querySelector('input[name="qr-action"]:checked').value;
    document.getElementById('modal-hinh-thuc').innerText = action;
    document.getElementById('qr-modal').setAttribute('data-hs', JSON.stringify(hsData));
    document.getElementById('qr-modal').setAttribute('data-action', action);
    document.getElementById('qr-modal').classList.remove('hidden');

  } catch (err) {
    alert("Lỗi xử lý QR: " + err.message);
  }
}

async function confirmSaveQR() {
  const modal = document.getElementById('qr-modal');
  const hs = JSON.parse(modal.getAttribute('data-hs'));
  const action = modal.getAttribute('data-action');

  let diem = action === 'muon_co_phep' ? -2 : (action === 'muon_khong_phep' ? -3 : 2);

  const rec = {
    ma_hs: hs.ma_hs,
    ho_ten: hs.ho_ten,
    khoi: hs.khoi || '10',
    lop: hs.ten_lop,
    ngay_diem_danh: formatDateToYYYYMMDD(new Date()), // Lưu DB
    ngay_hien_thi: formatDateToDDMMYYYY(new Date()), // Hiển thị ddmmyyyy
    buoi: getCurrentBuoi(),
    trang_thai: action,
    ma_hd: 'QR01',
    chi_tiet: action,
    diem: diem,
    ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'Bảo vệ'
  };

  const { error } = await _supabase.from('diem_danh_master').insert([rec]);
  if (!error) {
    alert(`Đã lưu thành công cho ${hs.ho_ten}!`);
    closeQRModal();
  }
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.add('hidden');
}
