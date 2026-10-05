// ==========================================
// TAB 1: QUÉT MÃ QR
// ==========================================

let html5QrCodeScanner = null;

function initTab1QR() {
    console.log('Khởi tạo Tab 1: Quét mã QR');
    setupQRScanner();
}

/**
 * Khởi tạo camera quét mã QR (sử dụng thư viện html5-qrcode)
 */
function setupQRScanner() {
    const qrContainer = document.getElementById('reader');
    if (!qrContainer) return;

    if (html5QrCodeScanner) {
        html5QrCodeScanner.clear();
    }

    html5QrCodeScanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    });

    html5QrCodeScanner.render(onScanSuccess, onScanError);
}

/**
 * Xử lý khi quét mã QR thành công
 */
async function onScanSuccess(decodedText, decodedResult) {
    console.log("Mã QR quét được:", decodedText);
    
    // Tìm kiếm thông tin học sinh theo ma_hs hoặc ma_qr
    const { data: hocSinh, error } = await supabase
        .from('hoc_sinh')
        .select('*')
        .eq('ma_hs', decodedText.trim())
        .single();

    if (error || !hocSinh) {
        alert(`Không tìm thấy học sinh với mã: ${decodedText}`);
        return;
    }

    // Hiển thị thông tin học sinh
    displayScannedStudent(hocSinh);
}

function onScanError(errorMessage) {
    // Không cần log liên tục
}

/**
 * Hiển thị chi tiết học sinh & ghi nhận nền nếp
 */
function displayScannedStudent(student) {
    const currentUser = getCurrentUser();
    const todayFormatted = getTodayDDMMYYYY();
    const todayISO = parseDDMMYYYYToISO(todayFormatted);

    const resultDiv = document.getElementById('qr-scan-result');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div class="card p-3 border-success">
                <h5>Thông tin học sinh</h5>
                <p><strong>Mã HS:</strong> ${student.ma_hs}</p>
                <p><strong>Họ tên:</strong> ${student.ho_ten}</p>
                <p><strong>Lớp:</strong> ${student.ten_lop}</p>
                <p><strong>Ngày quét:</strong> ${todayFormatted}</p>
                <button onclick="saveQRCheckin('${student.ma_hs}', '${student.ho_ten}', '${student.ten_lop}')" class="btn btn-success">Ghi nhận điểm danh</button>
            </div>
        `;
    }
}

/**
 * Lưu kết quả quét QR vào bảng diem_danh_master
 */
async function saveQRCheckin(ma_hs, ho_ten, lop) {
    const currentUser = getCurrentUser() || { ma_cb: 'SYSTEM', ho_ten: 'Hệ thống' };
    const todayISO = parseDDMMYYYYToISO(getTodayDDMMYYYY());

    const { data, error } = await supabase
        .from('diem_danh_master')
        .insert([{
            ma_hs: ma_hs,
            ho_ten: ho_ten,
            lop: lop,
            ngay_diem_danh: todayISO,
            buoi: 'Sáng',
            trang_thai: 'Có mặt (Quét QR)',
            ma_nguoi_cap_nhat: currentUser.ma_cb,
            ten_nguoi_cap_nhat: currentUser.ho_ten
        }]);

    if (error) {
        alert('Lỗi ghi nhận điểm danh: ' + error.message);
    } else {
        alert(`Đã điểm danh thành công cho học sinh ${ho_ten}!`);
    }
}

document.addEventListener('DOMContentLoaded', initTab1QR);
