// ==========================================
// TAB 4: THỐNG KÊ & XẾP HẠNG
// ==========================================

function initTab4ThongKe() {
    console.log('Khởi tạo Tab 4: Thống kê & Xếp hạng');
    
    const inputTuNgay = document.getElementById('thongke-tu-ngay');
    const inputDenNgay = document.getElementById('thongke-den-ngay');

    if (inputTuNgay) inputTuNgay.value = getTodayDDMMYYYY();
    if (inputDenNgay) inputDenNgay.value = getTodayDDMMYYYY();
}

/**
 * Thống kê điểm thi đua theo khoảng thời gian (từ ngày -> đến ngày ddmmyyyy)
 */
async function runThongKe() {
    const tuNgayStr = document.getElementById('thongke-tu-ngay').value;
    const denNgayStr = document.getElementById('thongke-den-ngay').value;

    const isoTuNgay = parseDDMMYYYYToISO(tuNgayStr);
    const isoDenNgay = parseDDMMYYYYToISO(denNgayStr);

    if (!isoTuNgay || !isoDenNgay) {
        alert('Vui lòng nhập ngày dạng ddmmyyyy (VD: 01/10/2026)');
        return;
    }

    // Truy vấn dữ liệu chấm điểm
    const { data: logs, error } = await supabase
        .from('diem_danh_master')
        .select('lop, diem, trang_thai')
        .gte('ngay_diem_danh', isoTuNgay)
        .lte('ngay_diem_danh', isoDenNgay);

    if (error) {
        alert('Lỗi truy vấn thống kê: ' + error.message);
        return;
    }

    // Tổng hợp điểm theo từng lớp (Điểm chuẩn mặc định: 100)
    const classScores = {};

    logs.forEach(row => {
        if (!row.lop) return;
        if (!classScores[row.lop]) {
            classScores[row.lop] = { lop: row.lop, tong_diem: 100, so_vi_pham: 0 };
        }
        if (row.diem) {
            classScores[row.lop].tong_diem += parseFloat(row.diem);
        }
        classScores[row.lop].so_vi_pham += 1;
    });

    // Chuyển sang mảng và sắp xếp thứ hạng
    const rankingList = Object.values(classScores).sort((a, b) => b.tong_diem - a.tong_diem);

    renderThongKeTable(rankingList, tuNgayStr, denNgayStr);
}

/**
 * Hiển thị bảng xếp hạng
 */
function renderThongKeTable(rankingList, tuNgay, denNgay) {
    const tableBody = document.getElementById('thongke-result-table');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    rankingList.forEach((item, index) => {
        tableBody.innerHTML += `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${item.lop}</td>
                <td>${item.so_vi_pham}</td>
                <td><span class="badge ${item.tong_diem >= 90 ? 'bg-success' : 'bg-warning'}">${item.tong_diem}</span></td>
                <td>Từ ${tuNgay} đến ${denNgay}</td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', initTab4ThongKe);
