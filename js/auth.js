/**
 * Auth Module v2.3.0
 * Đảm nhận xác thực cán bộ từ bảng `can_bo` trong CSDL
 */
const Auth = {
    currentUser: null,

    init() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        this.checkAuthState();
    },

    checkAuthState() {
        const loginModal = document.getElementById('login-modal');
        const appContainer = document.getElementById('app-container');

        if (!this.currentUser) {
            if (loginModal) loginModal.classList.remove('hidden');
            if (appContainer) {
                appContainer.classList.add('hidden');
                appContainer.classList.remove('flex');
            }
        } else {
            if (loginModal) loginModal.classList.add('hidden');
            if (appContainer) {
                appContainer.classList.remove('hidden');
                appContainer.classList.add('flex');
            }

            // Hiển thị thông tin Cán bộ lên Header
            document.getElementById('display-fullname').textContent = this.currentUser.ho_ten || this.currentUser.ma_can_bo;
            document.getElementById('display-role').textContent = `${this.currentUser.vai_tro} (${this.currentUser.chuc_vu || 'Cán bộ'})`;

            // Khởi tạo Tab 1 Quét QR nếu đã vào màn hình
            if (window.Tab1QR) {
                window.Tab1QR.init();
            }
        }
    },

    /**
     * Hàm Đăng nhập - Truy vấn dữ liệu cán bộ từ CSDL / API
     */
    async handleLogin(event) {
        event.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');

        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang truy vấn CSDL...`;

        try {
            // TRUY VẤN BẢNG `can_bo` TỪ API/BACKEND
            // Nếu dùng Apps Script API / REST API: 
            // const response = await fetch(`${CONFIG.API_URL}?action=getCanBo&username=${usernameInput}&password=${passwordInput}`);
            // const canBoData = await response.json();

            // Mô phỏng hàm query CSDL bảng `can_bo`:
            const canBoData = await this.queryCanBoTable(usernameInput, passwordInput);

            if (canBoData && canBoData.success) {
                this.currentUser = {
                    ma_can_bo: canBoData.data.ma_can_bo,
                    ho_ten: canBoData.data.ho_ten,
                    vai_tro: canBoData.data.vai_tro, // Ví dụ: "Cờ đỏ", "GVCN", "Giám thị", "Admin"
                    chuc_vu: canBoData.data.chuc_vu,
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.checkAuthState();
            } else {
                throw new Error(canBoData.message || "Tài khoản hoặc mật khẩu không chính xác!");
            }
        } catch (err) {
            errorDiv.textContent = err.message || "Lỗi truy vấn bảng cán bộ trong CSDL!";
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập`;
        }
    },

    /**
     * Giả lập hàm truy vấn CSDL bảng `can_bo`
     * (Thay thế URL API thực tế trong file `config.js` của bạn)
     */
    async queryCanBoTable(username, password) {
        // Giả lập kết quả trả về từ DB cho đến khi cấu hình URL API thực tế
        return new Promise((resolve) => {
            setTimeout(() => {
                if (username && password) {
                    resolve({
                        success: true,
                        data: {
                            ma_can_bo: username,
                            ho_ten: username.toUpperCase() === 'ADMIN' ? 'Ban Giám Hiệu' : 'Cán Bộ ' + username,
                            vai_tro: username.toLowerCase().includes('codo') ? 'Đội Cờ Đỏ' : 'Giám Thị',
                            chuc_vu: 'Quản lý nền nếp'
                        }
                    });
                } else {
                    resolve({ success: false, message: "Vui lòng nhập đầy đủ thông tin!" });
                }
            }, 600);
        });
    },

    logout() {
        if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            if (window.Tab1QR) {
                window.Tab1QR.stopScanner();
            }
            this.checkAuthState();
        }
    },

    getCurrentUser() {
        return this.currentUser;
    }
};

window.Auth = Auth;
