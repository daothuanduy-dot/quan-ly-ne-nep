// ==========================================
// TAB 6: QUẢN TRỊ HỆ THỐNG
// ==========================================

function initTab6QuanTri() {
    console.log('Khởi tạo Tab 6: Quản trị');
    loadDanhSachCanBo();
    loadDanhSachDanhMucDiem();
}

/**
 * Quản lý danh sách Cán bộ (Bảng can_bo)
 */
async function loadDanhSachCanBo() {
    const tableBody = document.getElementById('quantri-canbo-list');
    if (!tableBody) return;

    const { data, error } = await supabase
        .from('can_bo')
        .select('*')
        .order('ma_cb', { ascending: true });

    if (error) {
        console.error('Lỗi tải danh sách cán bộ:', error);
        return;
    }

    tableBody.innerHTML = '';
    data.forEach((cb, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${cb.ma_cb}</td>
                <td>${cb.ho_ten}</td>
                <td>${cb.vai_tro || ''}</td>
                <td>${cb.lop_quan_ly || ''}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editCanBo('${cb.ma_cb}')">Sửa</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCanBo('${cb.ma_cb}')">Xóa</button>
                </td>
            </tr>
        `;
    });
}

/**
 * Thêm mới Cán bộ vào bảng `can_bo`
 */
async function addCanBo() {
    const ma_cb = document.getElementById('quantri-macb').value;
    const ho_ten = document.getElementById('quantri-hoten').value;
    const mat_khau = document.getElementById('quantri-matkhau').value;
    const vai_tro = document.getElementById('quantri-vaitro').value;
    const lop_quan_ly = document.getElementById('quantri-lopquanly').value;

    if (!ma_cb || !ho_ten || !mat_khau) {
        alert('Mã cán bộ, Họ tên và Mật khẩu không được để trống!');
        return;
    }

    const { data, error } = await supabase
        .from('can_bo')
        .insert([{
            ma_cb: ma_cb,
            ho_ten: ho_ten,
            mat_khau: mat_khau,
            vai_tro: vai_tro,
            lop_quan_ly: lop_quan_ly
        }]);

    if (error) {
        alert('Lỗi thêm cán bộ: ' + error.message);
    } else {
        alert('Thêm cán bộ thành công!');
        loadDanhSachCanBo();
    }
}

/**
 * Xóa cán bộ
 */
async function deleteCanBo(ma_cb) {
    if (!confirm(`Bạn có chắc chắn muốn xóa cán bộ ${ma_cb}?`)) return;

    const { error } = await supabase
        .from('can_bo')
        .delete()
        .eq('ma_cb', ma_cb);

    if (error) {
        alert('Lỗi xóa cán bộ: ' + error.message);
    } else {
        alert('Đã xóa cán bộ!');
        loadDanhSachCanBo();
    }
}

/**
 * Quản lý danh mục điểm (Bảng danh_muc_diem)
 */
async function loadDanhSachDanhMucDiem() {
    const tableBody = document.getElementById('quantri-danhmucdiem-list');
    if (!tableBody) return;

    const { data, error } = await supabase
        .from('danh_muc_diem')
        .select('*')
        .order('ma_hd', { ascending: true });

    if (error) return;

    tableBody.innerHTML = '';
    data.forEach((item, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.ma_hd}</td>
                <td>${item.ten_hd}</td>
                <td>${item.mang || ''}</td>
                <td>${item.diem}</td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', initTab6QuanTri);
