// ==========================================
// CẤU HÌNH KẾT NỐI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://vbhtgkvmwfztswxlvnl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaHRna3Z2bXdmenRzd3hsdm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjE2MzgsImV4cCI6MjEwNjU5NzYzOH0.CqsEoBOVB4CS9UphogsIRtR1syY82kx5uzvcz_K_luo'; // Nhớ điền key thực tế từ Supabase Dashboard

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// XỬ LÝ CHUYỂN TAB VÀ ĐIỀU HƯỚNG SỰ KIỆN
// ==========================================
function switchTab(tabIndex) {
    // 1. Ẩn tất cả các Tab Content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // 2. Hiển thị Tab chọn
    const activeTab = document.getElementById(`tab-${tabIndex}`);
    if (activeTab) activeTab.classList.add('active');

    // Active button style
    const activeBtn = document.querySelectorAll('.nav-btn')[tabIndex - 1];
    if (activeBtn) activeBtn.classList.add('active');

    // 3. Khởi tạo dữ liệu riêng từng Tab khi được mở
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
// ĐĂNG NHẬP & PHIÊN LÀM VIỆC
// ==========================================
async function handleLogin() {
    const ma_cb = document.getElementById('login-macb').value;
    const mat_khau = document.getElementById('login-matkhau').value;

    if (!ma_cb || !mat_khau) {
        alert('Vui lòng nhập đầy đủ Mã cán bộ và Mật khẩu');
        return;
    }

    const user = await loginCanBo(ma_cb, mat_khau);
    if (user) {
        const modalEl = document.getElementById('loginModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

async function loginCanBo(ma_cb, mat_khau) {
    try {
        const { data, error } = await supabase
            .from('can_bo')
            .select('*')
            .eq('ma_cb', ma_cb.trim())
            .eq('mat_khau', mat_khau.trim())
            .single();

        if (error || !data) {
            alert('Mã cán bộ hoặc mật khẩu không chính xác!');
            return null;
        }

        localStorage.setItem('current_user', JSON.stringify(data));
        updateHeaderUserUI(data);
        return data;
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        alert('Không thể kết nối CSDL Supabase!');
        return null;
    }
}

function updateHeaderUserUI(user) {
    const elUser = document.getElementById('header-user-info');
    const elRole = document.getElementById('header-user-role');
    const btnLogin = document.getElementById('btn-login-modal');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        if (elUser) elUser.textContent = `${user.ho_ten} (${user.ma_cb})`;
        if (elRole) elRole.textContent = user.vai_tro || 'Cán bộ';
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
    switchTab(1); // Mặc định mở Tab 1 khi tải trang
});
