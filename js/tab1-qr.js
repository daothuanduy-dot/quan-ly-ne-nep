// =======================================================
// FILE: js/tab0-qr.js - XỬ LÝ TAB 0: QUÉT MÃ QR NỀ NẾP
// =======================================================

let html5QrcodeScanner = null;

function startQRScanner() {
  if (!canAccessTab(0)) return alert("Bạn không có quyền sử dụng tính năng Quét QR!");
  if (html5QrcodeScanner) stopQRScanner();

  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    onScanSuccess,
    onScanFailure
  ).catch(err => alert("Không thể mở Camera: " + err));
}

function stopQRScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      document.getElementById('reader').innerHTML = '';
      html5QrcodeScanner = null;
    }).catch(err => console.error(err));
  }
}

function onScanSuccess(decodedText) {
  processQRCode(decodedText);
}

function onScanFailure(error) {
  // Bỏ qua lỗi khi chưa tìm thấy mã QR trong khung hình
}

function processManualQR() {
  const input = document.getElementById('manual-ma-hs').value.trim();
  if (!input) return alert("Vui lòng nhập Mã học sinh hoặc chuỗi QR!");
  processQRCode(input);
}

// Xử lý chuỗi QR và kiểm tra Lịch học
async function processQRCode(qrData) {
  try {
    // 1. Truy vấn thông tin học sinh từ mã QR
    const { data: hsData, error: hsErr } = await _supabase
      .from('hoc_sinh')
      .select('*')
      .or(`ma_hs.eq.${qrData},id.eq.${qrData}`)
      .single();

    if (hsErr || !hsData) {
      alert(`Không tìm thấy học sinh có mã QR: ${qrData}`);
      return;
    }

    const lopHS = hsData.ten_lop;
    const buoiHienTai = getCurrentBuoi();
    const thuHienTai = getCurrentThu();

    // 2. KIỂM TRA LỊCH HỌC TRONG CSDL (NGƯỢC LẠI NẾU KHÔNG CÓ LỊCH SẼ TỪ CHỐI GHI NHẬN)
    const { data: lichHocData, error: lichErr } = await _supabase
      .from('lich_hoc')
      .select('co_hoc')
      .eq('ten_lop', lopHS)
      .eq('thu_trong_tuan', thuHienTai)
      .eq('buoi', buoiHienTai)
      .single();

    // Trường hợp không thiết lập hoặc co_hoc == false
    if (lichErr || !lichHocData || !lichHocData.co_hoc) {
      const tenBuoiStr = buoiHienTai === 'sang' ? 'Sáng' : 'Chiều';
      alert(`KHÔNG GHI NHẬN: Lớp ${lopHS} không có lịch học buổi ${tenBuoiStr} (Thứ ${thuHienTai === 8 ? 'CN' : thuHienTai}) hôm nay!`);
      return;
    }

    // 3. Chuẩn bị Modal xác nhận thông tin
    document.getElementById('modal-ma-hs').innerText = hsData.ma_hs;
    document.getElementById('modal-ho-ten').innerText = hsData.ho_ten;
    document.getElementById('modal-lop').innerText = hsData.ten_lop;

    const actionVal = document.querySelector('input[name="qr-action"]:checked').value;
    let hinhThucText = "";
    if (actionVal === 'muon_co_phep') hinhThucText = "Đi muộn (Có phép -2đ)";
    else if (actionVal === 'muon_khong_phep') hinhThucText = "Đi muộn (Không phép -3đ)";
    else if (actionVal === 'diem_thuong') hinhThucText = "Khen thưởng (+2đ)";
    else if (actionVal === 'diem_tru') hinhThucText = "Vi phạm nề nếp (-2đ)";

    document.getElementById('modal-hinh-thuc').innerText = hinhThucText;
    document.getElementById('qr-modal').setAttribute('data-hs', JSON.stringify(hsData));
    document.getElementById('qr-modal').setAttribute('data-action', actionVal);
    document.getElementById('qr-modal').classList.remove('hidden');

  } catch (err) {
    alert("Lỗi xử lý quét QR: " + err.message);
  }
}

async function confirmSaveQR() {
  const modal = document.getElementById('qr-modal');
  const hsData = JSON.parse(modal.getAttribute('data-hs'));
  const actionVal = modal.getAttribute('data-action');
  const buoiHienTai = getCurrentBuoi();

  let diem = 0;
  let maHD = 'QR01';
  let chiTiet = '';

  if (actionVal === 'muon_co_phep') { diem = -2; chiTiet = 'Đi muộn (Có phép)'; }
  else if (actionVal === 'muon_khong_phep') { diem = -3; chiTiet = 'Đi muộn (Không phép)'; }
  else if (actionVal === 'diem_thuong') { diem = 2; chiTiet = 'Khen thưởng trực tiếp'; }
  else if (actionVal === 'diem_tru') { diem = -2; chiTiet = 'Vi phạm nề nếp trực tiếp'; }

  const record = {
    ma_hs: hsData.ma_hs,
    ho_ten: hsData.ho_ten,
    khoi: hsData.khoi || '10',
    lop: hsData.ten_lop,
    ngay_diem_danh: formatDateToYYYYMMDD(new Date()),
    buoi: buoiHienTai,
    trang_thai: actionVal,
    ma_hd: maHD,
    chi_tiet: chiTiet,
    diem: diem,
    ten_nguoi_cap_nhat: currentUser ? currentUser.ho_ten : 'Bảo vệ/Cờ đỏ'
  };

  try {
    const { error } = await _supabase.from('diem_danh_master').insert([record]);
    if (error) throw error;

    alert(`Đã ghi nhận thành công cho HS ${hsData.ho_ten} (${hsData.ten_lop})!`);
    closeQRModal();
    appendQRLog(record);
  } catch (err) {
    alert("Lỗi lưu dữ liệu: " + err.message);
  }
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.add('hidden');
}

function appendQRLog(rec) {
  const logBox = document.getElementById('qr-log-list');
  const item = document.createElement('div');
  item.className = "p-2 bg-white rounded border text-xs flex justify-between items-center";
  item.innerHTML = `
    <div>
      <strong>${rec.ho_ten}</strong> (${rec.lop}) - <span class="text-gray-500">${rec.chi_tiet}</span>
    </div>
    <span class="font-bold ${rec.diem >= 0 ? 'text-green-600' : 'text-red-600'}">${rec.diem >= 0 ? '+' : ''}${rec.diem}đ</span>
  `;
  logBox.prepend(item);
}