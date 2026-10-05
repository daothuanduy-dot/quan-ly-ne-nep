// =======================================================
// FILE: js/config.js - CẤU HÌNH & HÀM BẢO MẬT/PHÂN QUYỀN
// =======================================================

// Danh sách tất cả vai trò trong hệ thống
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

// Ma trận cho phép truy cập Tab theo từng vai trò
const TAB_PERMISSIONS = {
  0: ['quan_tri', 'lanh_dao', 'bao_ve', 'co_do', 'gv_truc'],                 // Tab 0: Quét QR
  1: ['quan_tri', 'lanh_dao', 'gv_chu_nhiem', 'gv_truc'],                     // Tab 1: Báo vắng
  2: ['quan_tri', 'lanh_dao', 'co_do', 'gv_bo_mon', 'gv_truc', 'cb_lop'],     // Tab 2: Chấm điểm & SĐB
  3: ['quan_tri', 'lanh_dao', 'gv_chu_nhiem', 'gv_truc'],                     // Tab 3: Thống kê
  4: ['quan_tri', 'lanh_dao'],                                                 // Tab 4: Xếp loại
  5: ['quan_tri']                                                             // Tab 5: Quản trị
};

let currentUser = null; // Lớp thông tin cán bộ đăng nhập hiện tại

// Kiểm tra xem cán bộ hiện tại có ít nhất một trong các vai trò yêu cầu hay không
function hasAnyRole(requiredRoles) {
  if (!currentUser || !currentUser.roles) return false;
  const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [currentUser.roles];
  return requiredRoles.some(r => userRoles.includes(r));
}

// Kiểm tra quyền truy cập Tab
function canAccessTab(tabIndex) {
  const allowedRoles = TAB_PERMISSIONS[tabIndex] || [];
  return hasAnyRole(allowedRoles);
}

// Áp dụng ẩn/hiện nút chuyển Tab trên giao diện dựa theo phân quyền
function applyTabPermissionsUI() {
  for (let i = 0; i <= 5; i++) {
    const btn = document.getElementById(`btn-tab-${i}`);
    if (btn) {
      if (canAccessTab(i)) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }
  }
}

// Hàm lấy Buổi hiện tại theo giờ hệ thống (Sáng/Chiều)
function getCurrentBuoi() {
  const hour = new Date().getHours();
  return hour < 12 ? 'sang' : 'chieu';
}

// Hàm lấy Thứ trong tuần (2 -> 8)
function getCurrentThu() {
  const day = new Date().getDay(); // 0: Chủ nhật, 1: Thứ 2,...
  return day === 0 ? 8 : day + 1;
}

// Định dạng ngàyYYYY-MM-DD
function formatDateToDDMMYYYY(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// So sánh tên tiếng Việt phục vụ sắp xếp A-Z
function compareVietnameseNamesAsc(a, b) {
  const getLastName = (fullName) => {
    const parts = (fullName || '').trim().split(' ');
    return parts[parts.length - 1];
  };
  const lastNameA = getLastName(a);
  const lastNameB = getLastName(b);
  const cmp = lastNameA.localeCompare(lastNameB, 'vi');
  if (cmp !== 0) return cmp;
  return (a || '').localeCompare(b || '', 'vi');
}
