/**
 * Hàm đăng nhập cán bộ dựa trên mã cán bộ (ma_cb) và mật khẩu (mat_khau)
 */
async function loginCanBo(ma_cb, mat_khau) {
    try {
        const { data, error } = await supabase
            .from('can_bo')
            .select('ma_cb, ho_ten, vai_tro, lop_quan_ly')
            .eq('ma_cb', ma_cb.trim())
            .eq('mat_khau', mat_khau.trim())
            .single();

        if (error || !data) {
            alert('Mã cán bộ hoặc mật khẩu không chính xác!');
            return false;
        }

        // Lưu thông tin người dùng vào localStorage
        localStorage.setItem('current_user', JSON.stringify(data));
        
        // Cập nhật UI Header
        updateHeaderUserUI(data);
        return true;
    } catch (err) {
        console.error('Lỗi kết nối Supabase:', err);
        alert('Đã xảy ra lỗi khi đăng nhập!');
        return false;
    }
}

/**
 * Cập nhật thông tin Người dùng và Vai trò trên thanh Header
 */
function updateHeaderUserUI(user) {
    if (!user) return;

    const elUser = document.getElementById('header-user-info');
    const elRole = document.getElementById('header-user-role');

    if (elUser) elUser.textContent = `${user.ho_ten} (${user.ma_cb})`;
    if (elRole) elRole.textContent = user.vai_tro || 'Cán bộ';
}

/**
 * Hàm đăng xuất
 */
function logout() {
    localStorage.removeItem('current_user');
    window.location.reload();
}

/**
 * Kiểm tra quyền đăng nhập khi tải trang
 */
function checkAuthOnLoad() {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        updateHeaderUserUI(user);
        return user;
    } else {
        // Mở modal/form đăng nhập nếu chưa đăng nhập
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthOnLoad();
});
