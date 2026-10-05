// ==========================================
// TAB 3: CHẤM ĐIỂM THI ĐƯA
// ==========================================

async function initTab3ChamDiem() {
    console.log('Khởi tạo Tab 3: Chấm điểm thi đua');
    await loadDanhMucDiemDropdown();
    
    const inputNgay = document.getElementById('chamdiem-ngay');
    if (inputNgay) {
        inputNgay.value = getTodayDDMMYYYY();
    }
}

/**
 * Nạp danh mục điểm từ bảng `danh_muc_diem`
 */
async function loadDanhMucDiemDropdown() {
    const selectHD = document.getElementById('chamdiem-select-hd');
    if (!selectHD) return;

    const { data: dsHD, error } = await supabase
        .from('danh_muc_diem')
        .select('*')
        .order('ma_hd', { ascending: true });

    if (error) {
        console.error('Lỗi tải danh mục điểm:', error);
        return;
    }

    selectHD.innerHTML = '<option value="">-- Chọn lỗi / tiêu chí thi đua --</option>';
    dsHD.forEach(item => {
        selectHD.innerHTML += `
            <option value="${item.ma_hd}" data-diem="${item.diem}">
                [${item.mang || 'Thi đua'}] ${item.ten_hd} (${item.diem > 0 ? '+' : ''}${item.diem}đ)
            </option>
        `;
    });
}

/**
 * Lưu điểm thi đua / lỗi vi phạm vào bảng `diem_danh_master`
 */
async function saveChamDiem() {
    const lop = document.getElementById('chamdiem-select-lop').value;
    const ma_hs = document.getElementById('chamdiem-ma-hs')?.value || '';
    const ho_ten = document.getElementById('chamdiem-ho-ten')?.value || '';
    const ma_hd = document.getElementById('chamdiem-select-hd').value;
    const ngayStr = document.getElementById('chamdiem-ngay').value;
    const chi_tiet = document.getElementById('chamdiem-chi-tiet').value;
    const currentUser = getCurrentUser();

    const isoDate = parseDDMMYYYYToISO(ngayStr);
    if (!isoDate) {
        alert('Định dạng ngày tháng phải là ddmmyyyy!');
        return;
    }

    const optionHD = document.querySelector(`#chamdiem-select-hd option[value="${ma_hd}"]`);
    const diem = optionHD ? parseFloat(optionHD.getAttribute('data-diem')) : 0;

    const { data, error } = await supabase
        .from('diem_danh_master')
        .insert([{
            lop: lop,
            ma_hs: ma_hs,
            ho_ten: ho_ten,
            ma_hd: ma_hd,
            diem: diem,
            chi_tiet: chi_tiet,
            ngay_diem_danh: isoDate,
            trang_thai: 'Chấm điểm thi đua',
            ma_nguoi_cap_nhat: currentUser?.ma_cb,
            ten_nguoi_cap_nhat: currentUser?.ho_ten
        }]);

    if (error) {
        alert('Lỗi ghi nhận điểm thi đua: ' + error.message);
    } else {
        alert('Cập nhật điểm thi đua thành công!');
        loadLichSuChamDiemToday();
    }
}

/**
 * Hiển thị lịch sử chấm điểm trong ngày dạng ddmmyyyy
 */
async function loadLichSuChamDiemToday() {
    const todayISO = parseDDMMYYYYToISO(getTodayDDMMYYYY());
    const tableBody = document.getElementById('chamdiem-lichsu-list');
    if (!tableBody) return;

    const { data, error } = await supabase
        .from('diem_danh_master')
        .select('*')
        .eq('ngay_diem_danh', todayISO)
        .order('created_at', { ascending: false });

    if (error) return;

    tableBody.innerHTML = '';
    data.forEach((item, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDateDDMMYYYY(item.ngay_diem_danh)}</td>
                <td>${item.lop}</td>
                <td>${item.ho_ten || 'Tập thể lớp'}</td>
                <td>${item.diem}</td>
                <td>${item.chi_tiet || ''}</td>
                <td>${item.ten_nguoi_cap_nhat || ''}</td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', initTab3ChamDiem);
