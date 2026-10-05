/*
  ==================================================
  DỰ ÁN: QUẢN LÝ NỀN NẾP & THI ĐƯA - THPT LÊ HỒNG PHONG
  FILE: js/config.js
  VERSION: v1.2
  ==================================================
*/

// CẤU HÌNH KẾT NỐI SUPABASE
const SUPABASE_URL = 'https://vbhtgkvvmwfztswxlvnl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo'; 

let _supabaseClient = null;

function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return _supabaseClient;
    }
    console.error("Thư viện Supabase CDN chưa sẵn sàng!");
    return null;
}

// CHUYỂN TAB GIAO DIỆN CHÍNH
function switchTab(tabIndex) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabIndex}`);
    if (activeTab) activeTab.classList.add('active');

    const activeBtn = document.querySelectorAll('.nav-btn')[tabIndex - 1];
    if (activeBtn) activeBtn.classList.add('active');

    switch (tabIndex) {
        case 1: if (typeof initTab1QR === 'function') initTab1QR(); break;
        case 2: if (typeof initTab2BaoVang === 'function') initTab2BaoVang(); break;
        case 3: if (typeof initTab3ChamDiem === 'function') initTab3ChamDiem(); break;
        case 4: if (typeof initTab4ThongKe === 'function') initTab4ThongKe(); break;
        case 5: if (typeof initTab5XepLoai === 'function') initTab5XepLoai(); break;
        case 6: if (typeof initTab6QuanTri === 'function') initTab6QuanTri(); break;
    }
}

// TIỆN ÍCH THỜI GIAN (DDMMYYYY)
function formatDateDDMMYYYY(dateInput, withSlash = true) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return withSlash ? `${day}/${month}/${year}` : `${day}${month}${year}`;
}

function parseDDMMYYYYToISO(strDate) {
    if (!strDate) return null;
    const cleanStr = strDate.replace(/\D/g, ''); 
    if (cleanStr.length !== 8) return null;

    const day = cleanStr.substring(0, 2);
    const month = cleanStr.substring(2, 4);
    const year = cleanStr.substring(4, 8);

    return `${year}-${month}-${day}`;
}

function getTodayDDMMYYYY(withSlash = true) {
    return formatDateDDMMYYYY(new Date(), withSlash);
}

// TIỆN ÍCH GIAO DIỆN ĐĂNG NHẬP
function toggleShowPassword() {
    const passInput = document.getElementById('login-matkhau');
    const btnToggle = document.getElementById('btn-toggle-password');
    if (!passInput) return;

    if (passInput.type === 'password') {
        passInput.type = 'text';
        if (btnToggle) btnToggle.innerHTML = '🙈';
    } else {
        passInput.type = 'password';
        if (btnToggle) btnToggle.innerHTML = '👁️';
    }
}

function loadRememberedUser() {
    hideLoginError();
    const saved = localStorage.getItem('remembered_login');
    if (saved) {
        try {
            const { ma_cb, mat_khau } = JSON.parse(saved);
            const maInput = document.getElementById('login-macb');
            const passInput = document.getElementById('login-matkhau');
            const rememberCheck = document.getElementById('remember-me');

            if (maInput) maInput.value = ma_cb || '';
            if (passInput) passInput.value = mat_khau || '';
            if (rememberCheck) rememberCheck.checked = true;
        } catch (e) {
            console.error('Lỗi đọc dữ liệu nhớ đăng nhập:', e);
        }
    }
}

function showLoginError(message) {
    const errDiv = document.getElementById('login-error-msg');
    if (errDiv) {
        errDiv.textContent = message;
        errDiv.classList.remove('d-none');
    }
}

function hideLoginError() {
    const errDiv = document.getElementById('login-error-msg');
    if (errDiv) errDiv.classList.add('d-none');
}

// XỬ LÝ XÁC THỰC ĐĂNG NHẬP
async function handleLogin() {
    hideLoginError();

    const maInput = document.getElementById('login-macb');
    const passInput = document.getElementById('login-matkhau');

    if (!maInput || !passInput) return;

    const username = maInput.value.trim();
    const password = passInput.value.trim();

    if (!username || !password) {
        showLoginError('Vui lòng nhập đầy đủ Mã cán bộ và Mật khẩu!');
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-login');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang kiểm tra...';
    }

    try {
        const client = getSupabase();
        if (!client) {
            showLoginError('Không thể kết nối Supabase! Vui lòng kiểm tra mạng.');
            return;
        }

        const { data: accounts, error } = await client
            .from('can_bo')
            .select('*');

        if (error) {
            console.error('Lỗi Supabase:', error);
            showLoginError('Lỗi CSDL: ' + error.message);
            return;
        }

        if (!accounts || accounts.length === 0) {
            showLoginError('Bảng can_bo chưa có dữ liệu!');
            return;
        }

        const user = accounts.find(a => 
            String(a.ma_cb).trim() === username && 
            String(a.mat_khau).trim() === password
        );

        if (!user) {
            showLoginError('Mã cán bộ hoặc Mật khẩu không chính xác!');
            return;
        }

        // Nhớ đăng nhập
        const rememberCheck = document.getElementById('remember-me');
        if (rememberCheck && rememberCheck.checked) {
            localStorage.setItem('remembered_login', JSON.stringify({ ma_cb: username, mat_khau: password }));
        } else {
            localStorage.removeItem('remembered_login');
        }

        // Phiên làm việc
        const currentUserData = {
            ma_cb: user.ma_cb,
            ho_ten: user.ho_ten,
            vai_tro: user.vai_tro || 'Cán bộ',
            lop_quan_ly: user.lop_quan_ly || ''
        };

        localStorage.setItem('current_user', JSON.stringify(currentUserData));
        updateHeaderUserUI(currentUserData);

        const modalEl = document.getElementById('loginModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();
        }

    } catch (err) {
        console.error('Lỗi ngoại lệ:', err);
        showLoginError('Đã xảy ra lỗi: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Đăng Nhập';
        }
    }
}

function updateHeaderUserUI(user) {
    const elUser = document.getElementById('header-user-info');
    const elRole = document.getElementById('header-user-role');
    const btnLogin = document.getElementById('btn-login-modal');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        if (elUser) elUser.textContent = `${user.ho_ten} (${user.ma_cb})`;
        if (elRole) elRole.textContent = user.vai_tro;
        if (btnLogin) btnLogin.classList.add('d-none');
        if (btnLogout) btnLogout.classList.remove('d-none');
    } else {
        if (elUser) elUser.textContent = 'Chưa đăng nhập';
        if (elRole) elRole.textContent = 'Khách';
        if (btnLogin) btnLogin.classList.remove('d-none');
        if (btnLogout) btnLogout.classList.add('d-none');
    }
}

function getCurrentUser() {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
}

function logout() {
    localStorage.removeItem('current_user');
    updateHeaderUserUI(null);
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    updateHeaderUserUI(user);
    loadRememberedUser();
    switchTab(1);
});
