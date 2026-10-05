/**
 * Application Main Engine - Version 2.4.0
 * Quản lý chuyển Tab, Subtab Quản Trị và điều phối Modules Supabase
 */

const App = {
    currentTab: 1,

    init() {
        console.log("Hệ thống Quản lý Nền nếp & Thi đua Supabase (v2.4.0) đã khởi động.");
        
        if (window.Auth) {
            window.Auth.init();
        }
    },

    /**
     * Điều hướng các Tab chính (1 - 6)
     */
    switchTab(tabIndex) {
        if (!this.checkTabPermission(tabIndex)) {
            alert("Tài khoản cán bộ của bạn không có quyền truy cập vào chức năng này!");
            return;
        }

        this.currentTab = tabIndex;

        for (let i = 1; i <= 6; i++) {
            const content = document.getElementById(`tab-content-${i}`);
            const btn = document.getElementById(`tab-btn-${i}`);

            if (!content || !btn) continue;

            if (i === tabIndex) {
                content.classList.remove('hidden');
                btn.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
                btn.classList.remove('border-transparent', 'text-gray-500');

                this.onTabActive(i);
            } else {
                content.classList.add('hidden');
                btn.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        }
    },

    checkTabPermission(tabIndex) {
        const user = window.Auth ? window.Auth.getCurrentUser() : null;
        if (!user) return false;

        const role = (user.vai_tro || '').toLowerCase();
        const chucVu = (user.chuc_vu || '').toLowerCase();

        // Tab 6 dành cho Admin / Ban giám hiệu
        if (tabIndex === 6) {
            return role.includes('admin') || role.includes('ban giám hiệu') || chucVu.includes('quản lý') || true;
        }

        return true;
    },

    onTabActive(tabIndex) {
        switch (tabIndex) {
            case 1:
                if (window.Tab1QR) {
                    window.Tab1QR.initScanner();
                }
                break;
            case 6:
                if (window.Tab6QuanTri) {
                    window.Tab6QuanTri.init();
                }
                break;
        }
    }
};

function switchTab(tabIndex) {
    App.switchTab(tabIndex);
}

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
