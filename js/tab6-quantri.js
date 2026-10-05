/*
  ==================================================
  DỰ ÁN: QUẢN LÝ NỀN NẾP & THI ĐƯA - THPT LÊ HỒNG PHONG
  FILE: js/tab6-quantri.js
  VERSION: v1.1
  ==================================================
*/

function initTab6QuanTri() {
    loadCanBoList();
    loadThoiGianHocConfig();
}

function switchQuantriSubtab(subtab) {
    const tabCanbo = document.getElementById('quantri-subtab-canbo');
    const tabThoigian = document.getElementById('quantri-subtab-thoigian');
    const btns = document.querySelectorAll('#quantri-tabs .nav-link');

    if (subtab === 'canbo') {
        tabCanbo.classList.remove('d-none');
        tabThoigian.classList.add('d-none');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        tabCanbo.classList.add('d-none');
        tabThoigian.classList.remove('d-none');
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

// ==========================================
// 1. QUẢN LÝ CÁN BỘ
// ==========================================
async function loadCanBoList() {
    const client = getSupabase();
    if (!client) return;

    const { data: list, error } = await client.from('can_bo').select('*').order('ma_cb');
    const tbody = document.getElementById('quantri-canbo-list');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Lỗi: ${error.message}</td></tr>`;
        return;
    }

    list.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.ma_cb}</strong></td>
                <td>${item.ho_ten}</td>
                <td><span class="badge bg-info text-dark">${item.vai_tro || 'Cán bộ'}</span></td>
                <td>${item.lop_quan_ly || '---'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteCanBo('${item.ma_cb}')">Xóa</button>
                </td>
            </tr>
        `;
    });
}

async function addCanBo() {
    const ma_cb = document.getElementById('quantri-macb').value.trim();
    const ho_ten = document.getElementById('quantri-hoten').value.trim();
    const mat_khau = document.getElementById('quantri-matkhau').value.trim();
    const vai_tro = document.getElementById('quantri-vaitro').value.trim() || 'Cán bộ';
    const lop_quan_ly = document.getElementById('quantri-lopquanly').value.trim();

    if (!ma_cb || !ho_ten || !mat_khau) {
        alert('Vui lòng nhập đầy đủ Mã CB, Họ tên và Mật khẩu!');
        return;
    }

    const client = getSupabase();
    const { error } = await client.from('can_bo').insert([{ ma_cb, ho_ten, mat_khau, vai_tro, lop_quan_ly }]);
    if (error) {
        alert('Lỗi thêm cán bộ: ' + error.message);
    } else {
        alert('Thêm cán bộ thành công!');
        loadCanBoList();
    }
}

async function deleteCanBo(ma_cb) {
    if (!confirm(`Bạn có chắc chắn muốn xóa cán bộ ${ma_cb}?`)) return;
    const client = getSupabase();
    const { error } = await client.from('can_bo').delete().eq('ma_cb', ma_cb);
    if (error) alert('Lỗi xóa cán bộ: ' + error.message);
    else loadCanBoList();
}

// ==========================================
// 2. CẤU HÌNH THỜI GIAN HỌC CHO CÁC LỚP
// ==========================================
async function loadThoiGianHocConfig() {
    const client = getSupabase();
    if (!client) return;

    // Lấy danh sách Lớp từ bảng lop
    const { data: dslop } = await client.from('lop').select('ten_lop').order('ten_lop');
    // Lấy cấu hình đã lưu trong thoi_gian_hoc
    const { data: dsThoiGian } = await client.from('thoi_gian_hoc').select('*');

    const tbody = document.getElementById('table-thoi-gian-hoc');
    if (!tbody) return;
    tbody.innerHTML = '';

    const listLop = (dslop && dslop.length > 0) 
        ? dslop.map(l => l.ten_lop) 
        : ['10A1', '10A2', '10A3', '11A1', '11A2', '12A1', '12A2'];

    // Nạp giờ tiết 1 và tiết 5 nếu đã thiết lập trước đó
    if (dsThoiGian && dsThoiGian.length > 0) {
        if (dsThoiGian[0].gio_tiet_1) document.getElementById('tg-gio-tiet1').value = dsThoiGian[0].gio_tiet_1;
        if (dsThoiGian[0].gio_tiet_5) document.getElementById('tg-gio-tiet5').value = dsThoiGian[0].gio_tiet_5;
    }

    listLop.forEach(tenLop => {
        const config = dsThoiGian ? dsThoiGian.find(t => t.lop === tenLop) : null;

        const sangTu = config ? (config.sang_tu_tiet !== undefined ? config.sang_tu_tiet : 1) : 1;
        const sangDen = config ? (config.sang_den_tiet !== undefined ? config.sang_den_tiet : 5) : 5;
        const chieuTu = config ? (config.chieu_tu_tiet !== undefined ? config.chieu_tu_tiet : 0) : 0;
        const chieuDen = config ? (config.chieu_den_tiet !== undefined ? config.chieu_den_tiet : 0) : 0;

        tbody.innerHTML += `
            <tr data-lop="${tenLop}">
                <td class="fw-bold text-center align-middle">${tenLop}</td>
                <td>
                    <input type="number" min="0" max="5" class="form-control text-center input-sang-tu" value="${sangTu}">
                </td>
                <td>
                    <input type="number" min="0" max="5" class="form-control text-center input-sang-den" value="${sangDen}">
                </td>
                <td>
                    <input type="number" min="0" max="5" class="form-control text-center input-chieu-tu" value="${chieuTu}">
                </td>
                <td>
                    <input type="number" min="0" max="5" class="form-control text-center input-chieu-den" value="${chieuDen}">
                </td>
            </tr>
        `;
    });
}

async function saveThoiGianHocConfig() {
    const client = getSupabase();
    if (!client) return;

    const rows = document.querySelectorAll('#table-thoi-gian-hoc tr');
    const gioTiet1 = document.getElementById('tg-gio-tiet1').value;
    const gioTiet5 = document.getElementById('tg-gio-tiet5').value;

    const payload = [];

    rows.forEach(row => {
        const lop = row.getAttribute('data-lop');
        const sang_tu_tiet = parseInt(row.querySelector('.input-sang-tu').value) || 0;
        const sang_den_tiet = parseInt(row.querySelector('.input-sang-den').value) || 0;
        const chieu_tu_tiet = parseInt(row.querySelector('.input-chieu-tu').value) || 0;
        const chieu_den_tiet = parseInt(row.querySelector('.input-chieu-den').value) || 0;

        payload.push({
            lop,
            sang_tu_tiet,
            sang_den_tiet,
            chieu_tu_tiet,
            chieu_den_tiet,
            gio_tiet_1: gioTiet1,
            gio_tiet_5: gioTiet5
        });
    });

    const { error } = await client.from('thoi_gian_hoc').upsert(payload, { onConflict: 'lop' });

    if (error) {
        alert('Lỗi khi lưu thời gian học: ' + error.message);
    } else {
        alert('Đã lưu thành công cấu hình thời gian học cho tất cả các lớp!');
    }
}
