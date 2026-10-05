/**
 * Application Main Engine - Version 2.3.0
 * Quản lý khởi tạo ứng dụng, chuyển Tab, tích hợp phân quyền Cán bộ & điều phối Modules
 */

const App = {
    currentTab: 1,

    /**
     * Khởi tạo ứng dụng khi trang web tải xong
     */
    init() {
        console.log("Hệ thống Quản lý Nền nếp & Thi đua (v2.3.0) đã khởi tạo.");
        this.bindEvents();
        
        // Khởi tạo Module Xác thực Cán bộ
        if (window.Auth) {
            window.Auth.init();
        }
    },

    /**
     * Đăng ký các sự kiện toàn cục hệ thống
     */
    bindEvents() {
        // Tự động điều chỉnh layout khi thay đổi kích thước màn hình
        window.addEventListener('resize', this.handleResize.bind(this));
    },

    handleResize() {
        // Xử lý co giãn giao diện nếu cần
    },

    /**
     * Chuyển đổi giữa các Tab chức năng (1 - 6)
     * @param {number} tabIndex - Thứ tự Tab cần chuyển
     */
    switchTab(tabIndex) {
        // 1. Kiểm tra phân quyền truy cập Tab theo vai trò Cán bộ
        if (!this.checkTabPermission(tabIndex)) {
            alert("Tài khoản cán bộ của bạn không có quyền truy cập vào chức năng này!");
            return;
        }

        this.currentTab = tabIndex;

        // 2. Cập nhật trạng thái hiển thị UI của các Tab
        for (let i = 1; i <= 6; i++) {
            const content = document.getElementById(`tab-content-${i}`);
            const btn = document.getElementById(`tab-btn-${i}`);

            if (!content || !btn) continue;

            if (i === tabIndex) {
                // Hiển thị Tab active
                content.classList.remove('hidden');
                btn.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
                btn.classList.remove('border-transparent', 'text-gray-500');

                // Kích hoạt Module tương ứng
                this.onTabActive(i);
            } else {
                // Ẩn các Tab không chọn
                content.classList.add('hidden');
                btn.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        }
    },

    /**
     * Khung phân quyền truy cập các Tab dựa trên dữ liệu bảng can_bo
     * @param {number} tabIndex 
     * @returns {boolean}
     */
    checkTabPermission(tabIndex) {
        const user = window.Auth ? window.Auth.getCurrentUser() : null;
        if (!user) return false;

        const role = (user.vai_tro || '').toLowerCase();
        const chucVu = (user.chuc_vu || '').toLowerCase();

        // Cấu hình quy tắc phân quyền:
        // - Tab 6 (Quản trị): Chỉ Admin hoặc Ban Giám Hiệu được vào
        if (tabIndex === 6) {
            return role.includes('admin') || role.includes('ban giám hiệu') || chucVu.includes('bgh');
        }

        // - Tab 1, 2, 3, 4, 5: Cho phép Cán bộ / Đội cờ đỏ / GVCN sử dụng
        return true;
    },

    /**
     * Trigger kích hoạt logic riêng cho từng Tab khi mở
     * @param {number} tabIndex 
     */
    onTabActive(tabIndex) {
        switch (tabIndex) {
            case 1:
                // Mở lại Camera Quét QR nếu đang dừng
                if (window.Tab1QR) {
                    window.Tab1QR.initScanner();
                }
                break;
            case 2:
                if (window.Tab2BaoVang && typeof window.Tab2BaoVang.init === 'function') {
                    window.Tab2BaoVang.init();
                }
                break;
            case 3:
                if (window.Tab3ChamDiem && typeof window.Tab3ChamDiem.init === 'function') {
                    window.Tab3ChamDiem.init();
                }
                break;
            case 4:
                if (window.Tab4ThongKe && typeof window.Tab4ThongKe.init === 'function') {
                    window.Tab4ThongKe.init();
                }
                break;
            case 5:
                if (window.Tab5XepLoai && typeof window.Tab5XepLoai.init === 'function') {
                    window.Tab5XepLoai.init();
                }
                break;
            case 6:
                if (window.Tab6QuanTri && typeof window.Tab6QuanTri.init === 'function') {
                    window.Tab6QuanTri.init();
                }
                break;
        }
    }
};

/**
 * Hàm toàn cục hỗ trợ gọi trực tiếp từ sự kiện onclick="switchTab(x)" trên HTML
 */
function switchTab(tabIndex) {
    App.switchTab(tabIndex);
}

// Lắng nghe sự kiện DOM sẵn sàng để khởi chạy ứng dụng
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export ra window object
window.App = App;
