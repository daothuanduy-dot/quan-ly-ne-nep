/*
  ==================================================
  DỰ ÁN: QUẢN LÝ NỀN NẾP & THI ĐƯA - THPT LÊ HỒNG PHONG
  FILE: js/tab1-qr.js
  VERSION: v1.4
  ==================================================
*/

let html5QrcodeScanner = null;
let isProcessingQR = false;

// 1. ÂM THANH BÍP KHI QUÉT THÀNH CÔNG
function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880; 
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15); 
    } catch (e) {
        console.error('Không thể phát âm thanh bíp:', e);
    }
}

// 2. BÓC TÁCH MÃ HỌC SINH TỪ CHUỖI QR TRÊN THẺ
function parseMaHS(decodedText) {
    if (!decodedText) return '';
    let text = decodedText.trim();

    // Dạng 1: JSON
    if (text.startsWith('{') && text.endsWith('}')) {
        try {
            const obj = JSON.parse(text);
            return obj.ma_hs || obj.maHS || obj.id || text;
        } catch (e) {}
    }

    // Dạng 2: "Mã HS: 3165617498 | Họ tên: Nguyễn Nam Khánh..."
    const matchPrefix = text.match(/(?:Mã\s*HS|Ma\s*HS|MSHS|Mã\s*số|Mã|ID)\s*:\s*([A-Za-z0-9_-]+)/i);
    if (matchPrefix && matchPrefix[1]) {
        return matchPrefix[1].trim();
    }

    // Dạng 3: Phân tách bằng '|'
    if (text.includes('|')) {
        const parts = text.split('|');
        for (let part of parts) {
            const m = part.match(/(?:Mã\s*HS|Ma\s*HS|MSHS|Mã|ID)\s*:\s*([A-Za-z0-9_-]+)/i);
            if (m && m[1]) return m[1].trim();
            const digits = part.replace(/\D/g, '');
            if (digits.length >= 6) return digits;
        }
    }

    // Dạng 4: Chuỗi số liên tiếp 6-12 chữ số
    const standaloneDigits = text.match(/\b\d{6,12}\b/);
    if (standaloneDigits) {
        return standaloneDigits[0];
    }

    return text;
}

// 3. KHỞI TẠO CAMERA QUÉT QR
function initTab1QR() {
    if (html5QrcodeScanner) return;

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// 4. XỬ LÝ QUÉT QR THÀNH CÔNG
async function onScanSuccess(decodedText, decodedResult) {
    if (isProcessingQR) return;
    isProcessingQR = true;

    playBeepSound();

    const maHS = parseMaHS(decodedText);

    if (!maHS) {
        alert('Không thể nhận diện Mã Học Sinh từ mã QR này!');
        isProcessingQR = false;
        return;
    }

    const client = getSupabase();
    if (!client) {
        alert('Lỗi kết nối CSDL Supabase!');
        isProcessingQR = false;
        return;
    }

    try {
        // Lấy trạng thái báo vắng đã chọn: "Có phép" hoặc "Không phép"
        const selectedRadio = document.querySelector('input[name="qr-status-select"]:checked');
        const trangThaiDiemDanh = selectedRadio ? selectedRadio.value : 'Có phép';

        // TRUY VẤN VÀO BẢNG DanhSach
        let student = null;
        let { data: dsData } = await client.from('DanhSach').select('*').eq('ma_hs', maHS).maybeSingle();
        
        if (!dsData) {
            const res2 = await client.from('danh_sach').select('*').eq('ma_hs', maHS).maybeSingle();
            dsData = res2.data;
        }

        if (!dsData) {
            const res3 = await client.from('hoc_sinh').select('*').eq('ma_hs', maHS).maybeSingle();
            dsData = res3.data;
        }

        student = dsData;

        if (!student) {
            alert(`Không tìm thấy Học sinh có Mã: "${maHS}" trong CSDL DanhSach!`);
            isProcessingQR = false;
            return;
        }

        const hoTenHS = student.ho_ten || student.ten_hs || student.hoten || 'Không rõ';
        const lopHS = student.lop || student.ten_lop || 'Chưa xếp lớp';

        const now = new Date();
        const currentHour = now.getHours();
        const buoiHienTai = currentHour < 12 ? 'Sáng' : 'Chiều';
        const gioQuetStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const ngayHienTai = getTodayDDMMYYYY();

        // Lấy thứ trong tuần (2 - 6)
        let thuHienTai = now.getDay() + 1; // 0=Sunday -> 1, 1=Monday -> 2

        // Kiểm tra lịch học trong bảng thoi_gian_hoc theo thứ
        let trangThaiLichHoc = 'Theo thời khóa biểu';
        const { data: tgHoc } = await client.from('thoi_gian_hoc')
            .select('*')
            .eq('lop', lopHS)
            .eq('thu', thuHienTai)
            .maybeSingle();

        if (tgHoc) {
            if (buoiHienTai === 'Sáng' && (!tgHoc.sang_tu_tiet || tgHoc.sang_tu_tiet === 0)) {
                trangThaiLichHoc = 'Lớp không có lịch học Sáng';
            } else if (buoiHienTai === 'Chiều' && (!tgHoc.chieu_tu_tiet || tgHoc.chieu_tu_tiet === 0)) {
                trangThaiLichHoc = 'Lớp không có lịch học Chiều';
            } else {
                if (buoiHienTai === 'Sáng') {
                    trangThaiLichHoc = `Học Sáng (Tiết ${tgHoc.sang_tu_tiet} - ${tgHoc.sang_den_tiet})`;
                } else {
                    trangThaiLichHoc = `Học Chiều (Tiết ${tgHoc.chieu_tu_tiet} - ${tgHoc.chieu_den_tiet})`;
                }
            }
        }

        const currentUser = getCurrentUser();
        const nguoiQuet = currentUser ? `${currentUser.ho_ten} (${currentUser.ma_cb})` : 'Hệ thống';

        // GHI KẾT QUẢ VÀO BẢNG DiemDanhMaster
        const record = {
            ma_hs: student.ma_hs || maHS,
            ho_ten: hoTenHS,
            lop: lopHS,
            ngay: ngayHienTai,
            buoi: buoiHienTai,
            gio_quet: gioQuetStr,
            trang_thai: trangThaiDiemDanh,
            nguoi_quet: nguoiQuet
        };

        let { error: insertErr } = await client.from('DiemDanhMaster').insert([record]);
        
        if (insertErr) {
            const resLower = await client.from('diem_danh_master').insert([record]);
            insertErr = resLower.error;
        }

        if (insertErr) {
            console.error('Lỗi lưu DiemDanhMaster:', insertErr);
            alert('Lỗi ghi kết quả điểm danh: ' + insertErr.message);
            isProcessingQR = false;
            return;
        }

        // ĐỔ DỮ LIỆU LÊN MODAL
        document.getElementById('qr-modal-hoten').textContent = hoTenHS;
        document.getElementById('qr-modal-mahs').textContent = student.ma_hs || maHS;
        document.getElementById('qr-modal-lop').textContent = lopHS;
        document.getElementById('qr-modal-buoi').textContent = `Buổi ${buoiHienTai}`;
        document.getElementById('qr-modal-gio').textContent = gioQuetStr;
        document.getElementById('qr-modal-trangthai-lich').textContent = trangThaiLichHoc;

        const elTT = document.getElementById('qr-modal-trangthai-diemdanh');
        const modalHeader = document.getElementById('qr-modal-header');
        const modalIcon = document.getElementById('qr-modal-icon');

        if (trangThaiDiemDanh === 'Có phép') {
            elTT.className = 'col-6 text-end fw-bold fs-6 text-warning';
            elTT.textContent = '🟡 Báo vắng: CÓ PHÉP';
            modalHeader.className = 'modal-header bg-warning text-dark';
            modalIcon.textContent = '⚠️';
        } else {
            elTT.className = 'col-6 text-end fw-bold fs-6 text-danger';
            elTT.textContent = '🔴 Báo vắng: KHÔNG PHÉP';
            modalHeader.className = 'modal-header bg-danger text-white';
            modalIcon.textContent = '❌';
        }

        const modalEl = document.getElementById('qrResultModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

    } catch (err) {
        console.error('Lỗi quét QR:', err);
        alert('Lỗi hệ thống: ' + err.message);
        isProcessingQR = false;
    }
}

function onScanFailure(error) {
    // Vòng lặp camera lắng nghe liên tục
}

function resumeQRScanner() {
    isProcessingQR = false;
}
