// =======================================================
// FILE: js/config.js - CẤU HÌNH, ĐĂNG NHẬP & PHÂN QUYỀN
// =======================================================

const ROLE_DEFINITIONS = {
  bao_ve: "Bảo vệ",
  co_do: "Cờ đỏ",
  gv_chu_nhiem: "Giáo viên chủ nhiệm",
  gv_bo_mon: "Giáo viên bộ môn",
  gv_truc: "Giáo viên trực",
  lanh_dao: "Lãnh đạo",
  quan_tri: "Quản trị",
  cb_lop: "Cán bộ lớp"
};

// Phân quyền cho Tab 1 đến Tab 6
const TAB_PERMISSIONS = {
  1: ['quan_tri', 'lanh_dao', 'bao_ve', 'co_do', 'gv_truc'],         // Tab 1: Quét QR
  2: ['quan_tri', 'lanh_dao', 'gv_chu_nhiem', 'gv_truc'],           // Tab 2: Báo vắng
  3: ['quan_tri', 'lanh_dao', 'co_do', 'gv_bo_mon', 'gv_truc', 'cb_lop'],     // Tab 3: Chấm điểm & SĐB
  4: ['quan_tri', 'lanh_dao', 'gv_chu_nhiem', 'gv_truc'],           // Tab 4: Thống kê
  5: ['quan_tri', 'lanh_dao'],                                       // Tab 5: Xếp loại
  6: ['quan_tri']                                                   // Tab 6: Quản trị
};

let currentUser = null;

// HÀM HIỆN / ẨN MẬT KHẨU
function togglePasswordVisibility() {
  const pwdInput = document.getElementById('login-password-input');
  const eyeIcon = document.getElementById('eye-icon');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    eyeIcon.className = 'fa-solid fa-eye-slash';
  } else {
    pwdInput.type = 'password';
    eyeIcon.className = 'fa-solid fa-eye';
  }
}

// XỬ LÝ ĐĂNG NHẬP VÀ GHI NHỚ THÔNG TIN
async function performCanBoLogin() {
  const userVal = document.getElementById('login-user-input').value.trim();
  const passVal = document.getElementById('login-password-input').value.trim();
  const rememberVal = document.getElementById('login-remember').checked;

  if (!userVal || !passVal) return alert("Vui lòng nhập đầy đủ Tài khoản và Mật khẩu!");

  try {
    let cbUser = null;

    // 1. Kiểm tra tài khoản Quản trị ngầm định dự phòng
    if (userVal.toUpperCase() === 'ADMIN' && passVal === 'admin123') {
      cbUser = {
        ma_cb: 'ADMIN',
        ho_ten: 'Đào Thuận Duy (Admin)',
        roles: ['quan_tri', 'lanh_dao', 'gv_chu_nhiem', 'gv_truc', 'co_do', 'bao_ve']
      };
    } else {
      // 2. Truy vấn từ Supabase
      const { data, error } = await _supabase
        .from('can_bo')
        .select('*')
        .eq('ma_cb', userVal)
        .eq('mat_khau', passVal)
        .single();

      if (error || !data) {
        alert("Tài khoản hoặc mật khẩu không chính xác!");
        return;
      }

      let parsedRoles = [];
      if (Array.isArray(data.vai_tro)) parsedRoles = data.vai_tro;
      else if (typeof data.vai_tro === 'string') parsedRoles = data.vai_tro.split(',').map(s => s.trim());

      cbUser = {
        ma_cb: data.ma_cb,
        ho_ten: data.ho_ten,
        roles: parsedRoles,
        lop_phu_trach: data.lop_phu_trach || ''
      };
    }

    currentUser = cbUser;

    // Xử lý Ghi nhớ thông tin
    if (rememberVal) {
      localStorage.setItem('lhp_saved_user', userVal);
      localStorage.setItem('lhp_saved_pass', passVal);
      localStorage.setItem('lhp_remember', 'true');
    } else {
      localStorage.removeItem('lhp_saved_user');
      localStorage.removeItem('lhp_saved_pass');
      localStorage.removeItem('lhp_remember');
    }

    // Cập nhật giao diện
    document.getElementById('user-name').innerText = currentUser.ho_ten;
    document.getElementById('user-role').innerText = currentUser.roles.map(r => ROLE_DEFINITIONS[r] || r).join(', ');
    document.getElementById('login-overlay').classList.add('hidden');

    applyTabPermissionsUI();
    // Tự động chuyển đến tab đầu tiên có quyền truy cập
    for (let i = 1; i <= 6; i++) {
      if (canAccessTab(i)) { switchTab(i); break; }
    }

  } catch (err) {
    alert("Lỗi kết nối máy chủ đăng nhập: " + err.message);
  }
}

function handleLogout() {
  currentUser = null;
  document.getElementById('login-overlay').classList.remove('hidden');
}

function hasAnyRole(requiredRoles) {
  if (!currentUser || !currentUser.roles) return false;
  return requiredRoles.some(r => currentUser.roles.includes(r));
}

function canAccessTab(tabIndex) {
  const allowed = TAB_PERMISSIONS[tabIndex] || [];
  return hasAnyRole(allowed);
}

function applyTabPermissionsUI() {
  for (let i = 1; i <= 6; i++) {
    const btn = document.getElementById(`btn-tab-${i}`);
    if (btn) {
      if (canAccessTab(i)) btn.classList.remove('hidden');
      else btn.classList.add('hidden');
    }
  }
}

function switchTab(tabIndex) {
  if (!canAccessTab(tabIndex)) return alert("Bạn không có quyền truy cập Tab này!");

  for (let i = 1; i <= 6; i++) {
    const content = document.getElementById(`content-tab-${i}`);
    const btn = document.getElementById(`btn-tab-${i}`);
    if (content) content.classList.add('hidden');
    if (btn) btn.classList.remove('active', 'bg-blue-600', 'text-white');
  }

  const activeContent = document.getElementById(`content-tab-${tabIndex}`);
  const activeBtn = document.getElementById(`btn-tab-${tabIndex}`);
  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
}

// XỬ LÝ ĐỊNH DẠNG NGÀY ddmmyyyy (DD/MM/YYYY)
function formatDateToDDMMYYYY(dateObj) {
  const date = dateObj || new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatDateToYYYYMMDD(dateObj) {
  const date = dateObj || new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function getCurrentBuoi() {
  return new Date().getHours() < 12 ? 'sang' : 'chieu';
}

function getCurrentThu() {
  const day = new Date().getDay();
  return day === 0 ? 8 : day + 1;
}

function compareVietnameseNamesAsc(a, b) {
  const getLastName = (fullName) => {
    const parts = (fullName || '').trim().split(' ');
    return parts[parts.length - 1];
  };
  const cmp = getLastName(a).localeCompare(getLastName(b), 'vi');
  return cmp !== 0 ? cmp : (a || '').localeCompare(b || '', 'vi');
}

// KHÔI PHỤC THÔNG TIN ĐĂNG NHẬP NẾU CÓ GHI NHỚ
window.onload = function() {
  if (localStorage.getItem('lhp_remember') === 'true') {
    document.getElementById('login-user-input').value = localStorage.getItem('lhp_saved_user') || '';
    document.getElementById('login-password-input').value = localStorage.getItem('lhp_saved_pass') || '';
    document.getElementById('login-remember').checked = true;
  }
};
