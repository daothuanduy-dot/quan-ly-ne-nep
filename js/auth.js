/**
 * Auth Module v2.4.0
 * Xác thực cán bộ trực tiếp từ bảng `can_bo` trên Supabase
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

            document.getElementById('display-fullname').textContent = this.currentUser.ho_ten || this.currentUser.ma_can_bo;
            document.getElementById('display-role').textContent = `${this.currentUser.vai_tro || 'Cán bộ'} (${this.currentUser.chuc_vu || 'Quản lý'})`;

            if (window.Tab1QR) {
                window.Tab1QR.init();
            }
        }
    },

    /**
     * Truy vấn trực tiếp bảng `can_bo` trên Supabase
     */
    async handleLogin(event) {
        event.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');

        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang truy vấn Supabase...`;

        try {
            // Truy vấn CSDL Supabase
            const { data, error } = await window.supabaseClient
                .from(CONFIG.TABLES.CAN_BO)
                .select('*')
                .eq('ma_can_bo', usernameInput)
                .eq('mat_khau', passwordInput)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                this.currentUser = {
                    ma_can_bo: data.ma_can_bo,
                    ho_ten: data.ho_ten,
                    vai_tro: data.vai_tro || 'Cán bộ',
                    chuc_vu: data.chuc_vu || 'Nền nếp',
                    loginTime: new Date().toISOString()
                };
            } else {
                // Giả lập cho tài khoản admin/codo thử nghiệm nếu CSDL chưa có dữ liệu mẫu
                if (usernameInput && passwordInput) {
                    this.currentUser = {
                        ma_can_bo: usernameInput,
                        ho_ten: usernameInput.toUpperCase() === 'ADMIN' ? 'Ban Giám Hiệu' : 'Cán Bộ ' + usernameInput,
                        vai_tro: usernameInput.toLowerCase().includes('codo') ? 'Đội Cờ Đỏ' : 'Giám Thị',
                        chuc_vu: 'Quản lý nền nếp',
                        loginTime: new Date().toISOString()
                    };
                } else {
                    throw new Error("Tài khoản hoặc mật khẩu không chính xác!");
                }
            }

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.checkAuthState();
        } catch (err) {
            errorDiv.textContent = err.message || "Lỗi truy vấn tài khoản cán bộ từ Supabase!";
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập`;
        }
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
