// ==========================================
// CẤU HÌNH KẾT NỐI SUPABASE
// ==========================================
// Địa chỉ URL đã khớp chính xác với mã ref trong ANON_KEY
const SUPABASE_URL = 'https://vbhtgkvvwfztswxlvnl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// CHUYỂN TAB GIAO DIỆN
// ==========================================
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

// ==========================================
// ĐỊNH DẠNG NGÀY THÁNG (DDMMYYYY)
// ==========================================
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

// ==========================================
// XỬ LÝ ĐĂNG NHẬP (KIỂM TRA BẢNG CAN_BO)
// ==========================================
async function handleLogin() {
    const maInput = document.getElementById('login-macb');
    const passInput = document.getElementById('login-matkhau');

    if (!maInput || !passInput) {
        alert('Lỗi: Không tìm thấy ô nhập liệu!');
        return;
    }

    const username = maInput.value.trim();
    const password = passInput.value.trim();

    if (!username || !password) {
        alert('Vui lòng nhập đầy đủ Mã cán bộ và Mật khẩu!');
        return;
    }

    const btnLogin = document.querySelector('#loginModal .btn-primary');
    if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Đang kiểm tra...';
    }

    try {
        // Truy vấn dữ liệu từ bảng can_bo
        const { data: canBoList, error } = await supabase
            .from('can_bo')
            .select('*')
            .eq('ma_cb', username);

        if (error) {
            console.error('Lỗi kết nối Supabase:', error);
            alert('Lỗi truy vấn CSDL: ' + error.message);
            return;
        }

        if (!canBoList || canBoList.length === 0) {
            alert(`Mã cán bộ "${username}" KHÔNG TỒN TẠI trong bảng can_bo!\n(Lưu ý: Bảng can_bo hiện chỉ có 3 tài khoản).`);
            return;
        }

        // Kiểm tra mật khẩu (loại bỏ khoảng trắng dư thừa)
        const user = canBoList.find(u => String(u.mat_khau).trim() === password);

        if (!user) {
            alert('Mã cán bộ chính xác nhưng MẬT KHẨU KHÔNG ĐÚNG!');
            return;
        }

        // Lưu thông tin người dùng
        const userResult = {
            ma_cb: user.ma_cb,
            ho_ten: user.ho_ten,
            vai_tro: user.vai_tro || 'Cán bộ',
            lop_quan_ly: user.lop_quan_ly || ''
        };

        localStorage.setItem('current_user', JSON.stringify(userResult));
        updateHeaderUserUI(userResult);

        // Ẩn Modal đăng nhập
        const modalEl = document.getElementById('loginModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();
        }

        alert(`Đăng nhập thành công! Chào mừng ${userResult.ho_ten}`);

    } catch (err) {
        console.error('Lỗi ngoại lệ:', err);
        alert('Đã xảy ra lỗi: ' + err.message);
    } finally {
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Đăng Nhập';
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
    switchTab(1);
});
