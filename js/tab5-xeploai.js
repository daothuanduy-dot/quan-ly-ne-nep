// ==========================================
// TAB 5: XẾP LOẠI & DANH HIỆU
// ==========================================

function initTab5XepLoai() {
    console.log('Khởi tạo Tab 5: Xếp loại & Danh hiệu');
    loadDangKyTuanHocTot();
}

/**
 * Đăng ký Tuần học tốt (Lưu vào bảng dang_ky_tuan_hoc_tot)
 */
async function registerTuanHocTot() {
    const lop = document.getElementById('tuanhoctot-lop').value;
    const ngayBatDauStr = document.getElementById('tuanhoctot-ngay-bd').value; // ddmmyyyy
    const ngayKetThucStr = document.getElementById('tuanhoctot-ngay-kt').value; // ddmmyyyy
    const currentUser = getCurrentUser();

    const isoBatDau = parseDDMMYYYYToISO(ngayBatDauStr);
    const isoKetThuc = parseDDMMYYYYToISO(ngayKetThucStr);

    if (!isoBatDau || !isoKetThuc) {
        alert('Nhập ngày bắt đầu và kết thúc định dạng ddmmyyyy!');
        return;
    }

    const { data, error } = await supabase
        .from('dang_ky_tuan_hoc_tot')
        .insert([{
            lop: lop,
            ngay_bat_dau: isoBatDau,
            ngay_ket_thuc: isoKetThuc,
            nguoi_dang_ky: currentUser?.ho_ten || 'GVCN'
        }]);

    if (error) {
        alert('Lỗi đăng ký Tuần học tốt: ' + error.message);
    } else {
        alert(`Đã đăng ký Tuần học tốt thành công cho lớp ${lop}!`);
        loadDangKyTuanHocTot();
    }
}

/**
 * Hiển thị danh sách Tuần học tốt đã đăng ký
 */
async function loadDangKyTuanHocTot() {
    const tableBody = document.getElementById('tuanhoctot-list');
    if (!tableBody) return;

    const { data, error } = await supabase
        .from('dang_ky_tuan_hoc_tot')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    tableBody.innerHTML = '';
    data.forEach((item, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.lop}</td>
                <td>${formatDateDDMMYYYY(item.ngay_bat_dau)}</td>
                <td>${formatDateDDMMYYYY(item.ngay_ket_thuc)}</td>
                <td>${item.nguoi_dang_ky || ''}</td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', initTab5XepLoai);
