// ==========================================
// TAB 2: BÁO VẮNG
// ==========================================

async function initTab2BaoVang() {
    console.log('Khởi tạo Tab 2: Báo vắng');
    await loadLopDropdown();
    
    // Gán ngày hiện tại dạng ddmmyyyy vào input
    const inputNgay = document.getElementById('baovang-ngay');
    if (inputNgay) {
        inputNgay.value = getTodayDDMMYYYY();
    }
}

/**
 * Nạp danh sách lớp từ bảng `lop`
 */
async function loadLopDropdown() {
    const selectLop = document.getElementById('baovang-select-lop');
    if (!selectLop) return;

    const { data: dslop, error } = await supabase
        .from('lop')
        .select('ten_lop')
        .order('ten_lop', { ascending: true });

    if (error) {
        console.error('Lỗi tải danh sách lớp:', error);
        return;
    }

    selectLop.innerHTML = '<option value="">-- Chọn Lớp --</option>';
    dslop.forEach(l => {
        selectLop.innerHTML += `<option value="${l.ten_lop}">${l.ten_lop}</option>`;
    });
}

/**
 * Tải danh sách học sinh theo lớp để báo vắng
 */
async function loadHocSinhForBaoVang() {
    const tenLop = document.getElementById('baovang-select-lop').value;
    const tableBody = document.getElementById('baovang-hocsinh-list');
    if (!tenLop || !tableBody) return;

    const { data: dsHocSinh, error } = await supabase
        .from('hoc_sinh')
        .select('*')
        .eq('ten_lop', tenLop)
        .order('ho_ten', { ascending: true });

    if (error) {
        alert('Lỗi tải danh sách học sinh!');
        return;
    }

    tableBody.innerHTML = '';
    dsHocSinh.forEach((hs, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${hs.ma_hs}</td>
                <td>${hs.ho_ten}</td>
                <td>
                    <select id="status-${hs.ma_hs}" class="form-select form-select-sm">
                        <option value="Có mặt">Có mặt</option>
                        <option value="Vắng có phép">Vắng có phép</option>
                        <option value="Vắng không phép">Vắng không phép</option>
                        <option value="Đi trễ">Đi trễ</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

/**
 * Lưu danh sách báo vắng vào bảng `diem_danh_master`
 */
async function submitBaoVang() {
    const tenLop = document.getElementById('baovang-select-lop').value;
    const ngayStr = document.getElementById('baovang-ngay').value; // dạng ddmmyyyy hoặc dd/mm/yyyy
    const buoi = document.getElementById('baovang-buoi')?.value || 'Sáng';
    const currentUser = getCurrentUser();

    const isoDate = parseDDMMYYYYToISO(ngayStr);
    if (!isoDate) {
        alert('Định dạng ngày không hợp lệ! Vui lòng nhập ddmmyyyy (VD: 25/10/2026 hoặc 25102026)');
        return;
    }

    const rows = document.querySelectorAll('#baovang-hocsinh-list tr');
    const records = [];

    rows.forEach(row => {
        const ma_hs = row.cells[1].textContent;
        const ho_ten = row.cells[2].textContent;
        const trang_thai = document.getElementById(`status-${ma_hs}`).value;

        if (trang_thai !== 'Có mặt') { // Chỉ lưu những trường hợp vắng/trễ
            records.push({
                ma_hs: ma_hs,
                ho_ten: ho_ten,
                lop: tenLop,
                ngay_diem_danh: isoDate,
                buoi: buoi,
                trang_thai: trang_thai,
                ma_nguoi_cap_nhat: currentUser?.ma_cb || 'ANONYMOUS',
                ten_nguoi_cap_nhat: currentUser?.ho_ten || 'Cán bộ'
            });
        }
    });

    if (records.length === 0) {
        alert('Tất cả học sinh đều có mặt!');
        return;
    }

    const { data, error } = await supabase
        .from('diem_danh_master')
        .insert(records);

    if (error) {
        alert('Lỗi khi lưu báo vắng: ' + error.message);
    } else {
        alert(`Đã lưu báo vắng thành công cho lớp ${tenLop} vào ngày ${formatDateDDMMYYYY(isoDate)}!`);
    }
}

document.addEventListener('DOMContentLoaded', initTab2BaoVang);
