// ================================================================= //
// FILE: app.js                                                      //
// PHIÊN BẢN: v2.2.0                                                 //
// MÔ TẢ: Xử lý Đăng nhập, Truy vấn can_bo, Ghi nhớ & Sub-tabs       //
// ================================================================= //

// 1. TỰ ĐỘNG KIỂM TRA THÔNG TIN GHI NHỚ ĐĂNG NHẬP KHI TẢI TRANG
document.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('remembered_username');
  if (savedUsername) {
    const usernameInput = document.getElementById('username');
    const rememberCheckbox = document.getElementById('rememberMe');
    if (usernameInput && rememberCheckbox) {
      usernameInput.value = savedUsername;
      rememberCheckbox.checked = true;
    }
  }

  // Kiểm tra phiên đăng nhập hiện tại
  const currentUser = sessionStorage.getItem('currentUser');
  if (currentUser) {
    showDashboard(JSON.parse(currentUser));
  }
});

// 2. HÀM ẨN / HIỆN MẬT KHẨU
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.textContent = '🙈';
  } else {
    passwordInput.type = 'password';
    eyeIcon.textContent = '👁️';
  }
}

// 3. XỬ LÝ ĐĂNG NHẬP (TRUY VẤN BẢNG `can_bo`)
async function handleLogin(event) {
  event.preventDefault();

  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!usernameInput || !passwordInput) {
    alert('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu!');
    return;
  }

  try {
    // Gọi API Backend truy vấn bảng `can_bo`
    const response = await fetch('api_login.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: usernameInput,
        password: passwordInput
      })
    });

    const result = await response.json();

    if (result.success) {
      const user = result.user;

      // Xử lý Ghi nhớ đăng nhập
      if (rememberMe) {
        localStorage.setItem('remembered_username', usernameInput);
      } else {
        localStorage.removeItem('remembered_username');
      }

      // Lưu thông tin người dùng và vai trò vào Session
      sessionStorage.setItem('currentUser', JSON.stringify(user));

      alert(`Đăng nhập thành công! Vai trò của bạn: ${user.vai_tro}`);
      showDashboard(user);
    } else {
      alert(result.message || 'Tài khoản hoặc mật khẩu không chính xác!');
    }
  } catch (error) {
    console.error('Lỗi kết nối cơ sở dữ liệu:', error);
    alert('Không thể kết nối đến máy chủ! Vui lòng kiểm tra lại.');
  }
}

// 4. HIỂN THỊ MÀN HÌNH DASHBOARD
function showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';

  document.getElementById('display-user-name').textContent = `Xin chào, ${user.ho_ten}`;
  document.getElementById('display-user-role').textContent = user.vai_tro;
}

// 5. ĐĂNG XUẤT
function handleLogout() {
  sessionStorage.removeItem('currentUser');
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('password').value = '';
}

// 6. XỬ LÝ CHUYỂN SUB-TABS TRONG TAB 6 QUẢN TRỊ HỆ THỐNG
function switchSubTab(event, subTabId) {
  // Bỏ active tất cả các nút sub-tab
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  subTabButtons.forEach(btn => btn.classList.remove('active'));

  // Ẩn tất cả nội dung sub-tab
  const subTabPanes = document.querySelectorAll('.sub-tab-pane');
  subTabPanes.forEach(pane => pane.classList.remove('active'));

  // Kích hoạt sub-tab được chọn
  event.currentTarget.classList.add('active');
  const targetPane = document.getElementById(subTabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
}
