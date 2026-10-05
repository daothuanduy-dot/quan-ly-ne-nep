/*
  ==================================================
  DỰ ÁN: QUẢN LÝ NỀN NẾP & THI ĐƯA - THPT LÊ HỒNG PHONG
  FILE: js/tab1-qr.js
  VERSION: v1.1
  ==================================================
*/

let html5QrcodeScanner = null;
let isProcessingQR = false;

// TẠO TIẾNG BÍP KHI QUÉT THÀNH CÔNG
function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880; // 880Hz
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15); // 150ms
    } catch (e) {
        console.error('Không thể tạo tiếng bíp âm thanh:', e);
    }
}

// KHỞI TẠO MA TRẬN CAMERA QUÉT
function initTab1QR() {
    if (html5QrcodeScanner) return;

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// XỬ LÝ MÃ QR TRÍCH XUẤT ĐƯỢC
async function onScanSuccess(decodedText, decodedResult) {
    if (isProcessingQR) return;
    isProcessingQR = true;

    // Phát âm thanh ngay lập tức
    playBeepSound();

    // Trích xuất mã học sinh
    let maHS = decodedText.trim();
    if (maHS.includes('{')) {
        try {
            const parsed = JSON.parse(maHS);
            maHS = parsed.ma_hs || parsed.id || maHS;
        } catch (e) {}
    }

    const client = getSupabase();
    if (!client) {
        alert('Lỗi kết nối CSDL!');
        isProcessingQR = false;
        return;
    }

    try {
        // Tra cứu học sinh
        let student = null;
        const { data: hsData } = await client.from('hoc_sinh').select('*').eq('ma_hs', maHS).maybeSingle();
        if (hsData) {
            student = hsData;
        } else {
            const { data: dsData } = await client.from('danh_sach').select('*').eq('ma_hs', maHS).maybeSingle();
            if (dsData) student = dsData;
        }

        if (!student) {
            alert(`Không tìm thấy Học sinh có Mã QR: "${maHS}"`);
            isProcessingQR = false;
            return;
        }

        // Xác định buổi & giờ hiện tại
        const now = new Date();
        const currentHour = now.getHours();
        const buoiHienTai = currentHour < 12 ? 'Sáng' : 'Chiều';
        const gioQuetStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const ngayHienTai = getTodayDDMMYYYY();

        // Tra cứu lịch học của Lớp trong thoi_gian_hoc
        let trangThaiBuoiHoc = 'Có lịch học';
        const { data: tgHoc } = await client.from('thoi_gian_hoc').select('*').eq('lop', student.lop).maybeSingle();

        if (tgHoc) {
            if (buoiHienTai === 'Sáng' && (!tgHoc.sang_tu_tiet || tgHoc.sang_tu_tiet === 0)) {
                trangThaiBuoiHoc = 'Lớp không có lịch học Sáng';
            } else if (buoiHienTai === 'Chiều' && (!tgHoc.chieu_tu_tiet || tgHoc.chieu_tu_tiet === 0)) {
                trangThaiBuoiHoc = 'Lớp không có lịch học Chiều';
            } else {
                if (buoiHienTai === 'Sáng') {
                    trangThaiBuoiHoc = `Học Sáng (Tiết ${tgHoc.sang_tu_tiet} - ${tgHoc.sang_den_tiet})`;
                } else {
                    trangThaiBuoiHoc = `Học Chiều (Tiết ${tgHoc.chieu_tu_tiet} - ${tgHoc.chieu_den_tiet})`;
                }
            }
        }

        const currentUser = getCurrentUser();
        const nguoiQuet = currentUser ? `${currentUser.ho_ten} (${currentUser.ma_cb})` : 'Hệ thống';

        // Ghi dữ liệu điểm danh vào diem_danh_master
        const { error: insertErr } = await client.from('diem_danh_master').insert([{
            ma_hs: student.ma_hs,
            ho_ten: student.ho_ten,
            lop: student.lop,
            ngay: ngayHienTai,
            buoi: buoiHienTai,
            gio_quet: gioQuetStr,
            trang_thai: 'Có mặt',
            nguoi_quet: nguoiQuet
        }]);

        if (insertErr) {
            console.error('Lỗi insert diem_danh_master:', insertErr);
            alert('Lỗi lưu điểm danh: ' + insertErr.message);
            isProcessingQR = false;
            return;
        }

        // Đổ thông tin lên Modal Popup
        document.getElementById('qr-modal-hoten').textContent = student.ho_ten;
        document.getElementById('qr-modal-mahs').textContent = student.ma_hs;
        document.getElementById('qr-modal-lop').textContent = student.lop || 'N/A';
        document.getElementById('qr-modal-buoi').textContent = `Buổi ${buoiHienTai}`;
        document.getElementById('qr-modal-gio').textContent = gioQuetStr;
        document.getElementById('qr-modal-trangthai').textContent = trangThaiBuoiHoc;

        const modalEl = document.getElementById('qrResultModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

    } catch (err) {
        console.error('Lỗi quét QR:', err);
        alert('Đã xảy ra lỗi: ' + err.message);
        isProcessingQR = false;
    }
}

function onScanFailure(error) {
    // Luồng lắng nghe liên tục camera
}

function resumeQRScanner() {
    isProcessingQR = false;
}
