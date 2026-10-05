/*
  ==================================================
  DỰ ÁN: QUẢN LÝ NỀN NẾP & THI ĐƯA - THPT LÊ HỒNG PHONG
  FILE: js/tab6-quantri.js
  VERSION: v1.4 (Bổ sung Sửa Cán Bộ, Lịch Thứ 2-6 & Subtab Chuyển Lớp)
  ==================================================
*/

let currentThuConfig = '2'; // Mặc định Thứ 2

// 1. KHỞI TẠO TAB 6
function initTab6QuanTri() {
    switchQuantriSubtab('canbo');
}

// 2. CHUYỂN SUBTAB TRONG TAB 6
function switchQuantriSubtab(subtabName) {
    const subCanbo = document.getElementById('quantri-subtab-canbo');
    const subThoigian = document.getElementById('quantri-subtab-thoigian');
    const subChuyenlop = document.getElementById('quantri-subtab-chuyenlop');

    const btnCanbo = document.getElementById('quantri-subtab-btn-canbo');
    const btnThoigian = document.getElementById('quantri-subtab-btn-thoigian');
    const btnChuyenlop = document.getElementById('quantri-subtab-btn-chuyenlop');

    if (subCanbo) subCanbo.classList.add('d-none');
    if (subThoigian) subThoigian.classList.add('d-none');
    if (subChuyenlop) subChuyenlop.classList.add('d-none');

    if (btnCanbo) btnCanbo.classList.remove('active');
    if (btnThoigian) btnThoigian.classList.remove('active');
    if (btnChuyenlop) btnChuyenlop.classList.remove('active');

    if (subtabName === 'canbo') {
        if (subCanbo) subCanbo.classList.remove('d-none');
        if (btnCanbo) btnCanbo.classList.add('active');
        loadCanBoList();
    } else if (subtabName === 'thoigian') {
        if (subThoigian) subThoigian.classList.remove('d-none');
        if (btnThoigian) btnThoigian.classList.add('active');
        onThuThoiGianChange();
    } else if (subtabName === 'chuyenlop') {
        if (subChuyenlop) subChuyenlop.classList.remove('d-none');
        if (btnChuyenlop) btnChuyenlop.classList.add('active');
        initChuyenLopSubtab();
    }
}

// ==================================================
// CHỨC NĂNG 1: QUẢN LÝ CÁN BỘ (XEM, THÊM, SỬA, XÓA)
// ==================================================

async function loadCanBoList() {
    const tbody = document.getElementById('quantri-canbo-list');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Đang tải danh sách cán bộ...</td></tr>';

    const client = getSupabase();
    if (!client) return;

    try {
        const { data, error } = await client.from('can_bo').select('*').order('ma_cb', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Lỗi CSDL: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có cán bộ nào trong hệ thống.</td></tr>';
            return;
        }

        let html = '';
        data.forEach((cb, idx) => {
            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong class="text-primary">${cb.ma_cb}</strong></td>
                    <td>${cb.ho_ten}</td>
                    <td><code>${cb.mat_khau || '******'}</code></td>
                    <td><span class="badge ${cb.vai_tro === 'Admin' ? 'bg-danger' : 'bg-success'}">${cb.vai_tro || 'Cán bộ'}</span></td>
                    <td>${cb.lop_quan_ly || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning fw-bold me-1" onclick="openEditCanBoModal('${cb.ma_cb}')">✏️ Sửa</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCanBo('${cb.ma_cb}')">🗑️ Xóa</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Lỗi: ${err.message}</td></tr>`;
    }
}

async function addCanBo() {
    const ma_cb = document.getElementById('quantri-macb').value.trim();
    const ho_ten = document.getElementById('quantri-hoten').value.trim();
    const mat_khau = document.getElementById('quantri-matkhau').value.trim();
    const vai_tro = document.getElementById('quantri-vaitro').value;
    const lop_quan_ly = document.getElementById('quantri-lopquanly').value.trim();

    if (!ma_cb || !ho_ten || !mat_khau) {
        alert('Vui lòng điền đầy đủ Mã Cán bộ, Họ tên và Mật khẩu!');
        return;
    }

    const client = getSupabase();
    if (!client) return;

    const { error } = await client.from('can_bo').insert([{ ma_cb, ho_ten, mat_khau, vai_tro, lop_quan_ly }]);

    if (error) {
        alert('Lỗi khi thêm Cán bộ: ' + error.message);
    } else {
        alert('Thêm Cán bộ thành công!');
        document.getElementById('quantri-macb').value = '';
        document.getElementById('quantri-hoten').value = '';
        document.getElementById('quantri-matkhau').value = '';
        document.getElementById('quantri-lopquanly').value = '';
        loadCanBoList();
    }
}

// SỬA THÔNG TIN & MẬT KHẨU CÁN BỘ
async function openEditCanBoModal(ma_cb) {
    const client = getSupabase();
    if (!client) return;

    const { data, error } = await client.from('can_bo').select('*').eq('ma_cb', ma_cb).maybeSingle();

    if (error || !data) {
        alert('Không tìm thấy thông tin cán bộ!');
        return;
    }

    document.getElementById('edit-cb-macb').value = data.ma_cb;
    document.getElementById('edit-cb-hoten').value = data.ho_ten || '';
    document.getElementById('edit-cb-matkhau').value = data.mat_khau || '';
    document.getElementById('edit-cb-vaitro').value = data.vai_tro || 'Cán bộ';
    document.getElementById('edit-cb-lopquanly').value = data.lop_quan_ly || '';

    const modalEl = document.getElementById('editCanBoModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function saveEditCanBo() {
    const ma_cb = document.getElementById('edit-cb-macb').value;
    const ho_ten = document.getElementById('edit-cb-hoten').value.trim();
    const mat_khau = document.getElementById('edit-cb-matkhau').value.trim();
    const vai_tro = document.getElementById('edit-cb-vaitro').value;
    const lop_quan_ly = document.getElementById('edit-cb-lopquanly').value.trim();

    if (!ho_ten || !mat_khau) {
        alert('Họ tên và Mật khẩu không được để trống!');
        return;
    }

    const client = getSupabase();
    if (!client) return;

    const { error } = await client.from('can_bo')
        .update({ ho_ten, mat_khau, vai_tro, lop_quan_ly })
        .eq('ma_cb', ma_cb);

    if (error) {
        alert('Lỗi khi cập nhật cán bộ: ' + error.message);
    } else {
        alert('Cập nhật thông tin Cán bộ thành công!');
        const modalEl = document.getElementById('editCanBoModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        loadCanBoList();
    }
}

async function deleteCanBo(ma_cb) {
    if (!confirm(`Bạn có chắc chắn muốn xóa Cán bộ có mã: ${ma_cb}?`)) return;

    const client = getSupabase();
    if (!client) return;

    const { error } = await client.from('can_bo').delete().eq('ma_cb', ma_cb);

    if (error) {
        alert('Lỗi xóa Cán bộ: ' + error.message);
    } else {
        alert('Đã xóa thành công!');
        loadCanBoList();
    }
}

// ==================================================
// CHỨC NĂNG 2: THỜI GIAN HỌC CÁC LỚP (THỨ 2 - THỨ 6)
// ==================================================

function onThuThoiGianChange() {
    const selectThu = document.getElementById('tg-select-thu');
    currentThuConfig = selectThu ? selectThu.value : '2';

    const headerTitle = document.getElementById('tg-header-thu-title');
    if (headerTitle) {
        headerTitle.textContent = `Phân công tiết học cho từng Lớp (Thứ ${currentThuConfig}):`;
    }

    loadThoiGianHocTable();
}

async function loadThoiGianHocTable() {
    const tbody = document.getElementById('table-thoi-gian-hoc');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3">Đang tải cấu hình thời gian...</td></tr>';

    const client = getSupabase();
    if (!client) return;

    try {
        // Lấy tất cả các Lớp từ bảng DanhSach
        let { data: lopData } = await client.from('DanhSach').select('lop');
        if (!lopData) {
            const res2 = await client.from('danh_sach').select('lop');
            lopData = res2.data;
        }

        let danhSachLop = [];
        if (lopData && lopData.length > 0) {
            danhSachLop = [...new Set(lopData.map(item => item.lop).filter(Boolean))].sort();
        }

        if (danhSachLop.length === 0) {
            danhSachLop = ['10A1', '10A2', '10A3', '11A1', '11A2', '12A1', '12A2'];
        }

        // Tải cấu hình thời gian theo Thứ đang chọn
        const { data: configData } = await client.from('thoi_gian_hoc')
            .select('*')
            .eq('thu', currentThuConfig);

        const configMap = {};
        if (configData) {
            configData.forEach(c => { configMap[c.lop] = c; });
        }

        let html = '';
        danhSachLop.forEach(lop => {
            const cfg = configMap[lop] || {};
            const sangTu = cfg.sang_tu_tiet !== undefined ? cfg.sang_tu_tiet : 1;
            const sangDen = cfg.sang_den_tiet !== undefined ? cfg.sang_den_tiet : 4;
            const chieuTu = cfg.chieu_tu_tiet !== undefined ? cfg.chieu_tu_tiet : 0;
            const chieuDen = cfg.chieu_den_tiet !== undefined ? cfg.chieu_den_tiet : 0;

            html += `
                <tr data-lop="${lop}">
                    <td class="fw-bold text-primary text-center">${lop}</td>
                    <td><input type="number" class="form-control form-control-sm tg-sang-tu" value="${sangTu}" min="0" max="5"></td>
                    <td><input type="number" class="form-control form-control-sm tg-sang-den" value="${sangDen}" min="0" max="5"></td>
                    <td><input type="number" class="form-control form-control-sm tg-chieu-tu" value="${chieuTu}" min="0" max="5"></td>
                    <td><input type="number" class="form-control form-control-sm tg-chieu-den" value="${chieuDen}" min="0" max="5"></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Lỗi: ${err.message}</td></tr>`;
    }
}

async function saveThoiGianHocConfig() {
    const client = getSupabase();
    if (!client) return;

    const rows = document.querySelectorAll('#table-thoi-gian-hoc tr[data-lop]');
    const records = [];

    rows.forEach(row => {
        const lop = row.getAttribute('data-lop');
        const sang_tu_tiet = parseInt(row.querySelector('.tg-sang-tu').value) || 0;
        const sang_den_tiet = parseInt(row.querySelector('.tg-sang-den').value) || 0;
        const chieu_tu_tiet = parseInt(row.querySelector('.tg-chieu-tu').value) || 0;
        const chieu_den_tiet = parseInt(row.querySelector('.tg-chieu-den').value) || 0;

        records.push({
            lop,
            thu: parseInt(currentThuConfig),
            sang_tu_tiet,
            sang_den_tiet,
            chieu_tu_tiet,
            chieu_den_tiet
        });
    });

    if (records.length === 0) {
        alert('Không có dữ liệu thời gian để lưu!');
        return;
    }

    try {
        const { error } = await client.from('thoi_gian_hoc').upsert(records, { onConflict: 'lop,thu' });

        if (error) {
            alert('Lỗi lưu thời gian học: ' + error.message);
        } else {
            alert(`Đã lưu cấu hình thời gian học cho Thứ ${currentThuConfig} thành công!`);
        }
    } catch (e) {
        alert('Lỗi phát sinh: ' + e.message);
    }
}

// ==================================================
// CHỨC NĂNG 3: SUBTAB CHUYỂN LỚP HỌC SINH (MỚI BỔ SUNG)
// ==================================================

async function initChuyenLopSubtab() {
    const selectLopCu = document.getElementById('chuyenlop-select-lopcu');
    const selectLopMoi = document.getElementById('chuyenlop-select-lopmoi');
    if (!selectLopCu || !selectLopMoi) return;

    const client = getSupabase();
    if (!client) return;

    try {
        let { data } = await client.from('DanhSach').select('lop');
        if (!data) {
            const res2 = await client.from('danh_sach').select('lop');
            data = res2.data;
        }

        let danhSachLop = [];
        if (data && data.length > 0) {
            danhSachLop = [...new Set(data.map(item => item.lop).filter(Boolean))].sort();
        }

        let optionsHtml = '<option value="">-- Chọn Lớp --</option>';
        danhSachLop.forEach(l => {
            optionsHtml += `<option value="${l}">${l}</option>`;
        });

        selectLopCu.innerHTML = optionsHtml;
        selectLopMoi.innerHTML = optionsHtml;

    } catch (e) {
        console.error('Lỗi nạp danh sách lớp chuyển:', e);
    }
}

async function loadHocSinhChuyenLop() {
    const lopCu = document.getElementById('chuyenlop-select-lopcu').value;
    const tbody = document.getElementById('chuyenlop-hocsinh-list');
    if (!tbody) return;

    if (!lopCu) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Vui lòng chọn Lớp Hiện Tại để xem danh sách.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Đang tải danh sách học sinh...</td></tr>';

    const client = getSupabase();
    if (!client) return;

    try {
        let { data } = await client.from('DanhSach').select('*').eq('lop', lopCu).order('ho_ten', { ascending: true });
        
        if (!data || data.length === 0) {
            const res2 = await client.from('danh_sach').select('*').eq('lop', lopCu).order('ho_ten', { ascending: true });
            data = res2.data;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Không có học sinh nào trong lớp ${lopCu}.</td></tr>`;
            return;
        }

        let html = '';
        data.forEach((hs, idx) => {
            const hoTen = hs.ho_ten || hs.ten_hs || hs.hoten || '';
            const ngaySinh = hs.ngay_sinh || hs.ns || '-';

            html += `
                <tr>
                    <td class="text-center"><input type="checkbox" class="form-check-input check-chuyenlop-item" value="${hs.ma_hs}"></td>
                    <td>${idx + 1}</td>
                    <td><strong class="text-primary">${hs.ma_hs}</strong></td>
                    <td>${hoTen}</td>
                    <td><span class="badge bg-secondary">${hs.lop}</span></td>
                    <td>${ngaySinh}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Lỗi: ${e.message}</td></tr>`;
    }
}

function toggleSelectAllChuyenLop(status) {
    document.querySelectorAll('.check-chuyenlop-item').forEach(cb => {
        cb.checked = status;
    });
}

async function executeChuyenLop() {
    const lopCu = document.getElementById('chuyenlop-select-lopcu').value;
    const lopMoi = document.getElementById('chuyenlop-select-lopmoi').value;

    if (!lopCu || !lopMoi) {
        alert('Vui lòng chọn đầy đủ Lớp Hiện Tại và Lớp Chuyển Đến!');
        return;
    }

    if (lopCu === lopMoi) {
        alert('Lớp chuyển đến phải khác Lớp hiện tại!');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.check-chuyenlop-item:checked');
    if (selectedCheckboxes.length === 0) {
        alert('Vui lòng tích chọn ít nhất 1 học sinh để chuyển lớp!');
        return;
    }

    const selectedMaHSList = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (!confirm(`Xác nhận chuyển ${selectedMaHSList.length} học sinh từ lớp ${lopCu} sang lớp ${lopMoi}?`)) {
        return;
    }

    const client = getSupabase();
    if (!client) return;

    try {
        let { error } = await client.from('DanhSach')
            .update({ lop: lopMoi })
            .in('ma_hs', selectedMaHSList);

        if (error) {
            const res2 = await client.from('danh_sach')
                .update({ lop: lopMoi })
                .in('ma_hs', selectedMaHSList);
            error = res2.error;
        }

        if (error) {
            alert('Lỗi khi thực hiện chuyển lớp: ' + error.message);
        } else {
            alert(`Đã chuyển thành công ${selectedMaHSList.length} học sinh sang lớp ${lopMoi}!`);
            loadHocSinhChuyenLop();
        }
    } catch (e) {
        alert('Lỗi hệ thống: ' + e.message);
    }
}
