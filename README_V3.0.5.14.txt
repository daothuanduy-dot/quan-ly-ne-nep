V3.0.5.14 - KHẮC PHỤC TRIỆT ĐỂ LUỒNG ĐĂNG NHẬP

1. Chạy sql/015_v3_0_5_14_fix_login.sql trên Supabase.
2. Kiểm tra: SELECT public.login_can_bo('3103016229','123456');
3. Upload đè toàn bộ thư mục/file lên GitHub Pages, đặc biệt index.html và js/login-bootstrap.js.
4. Ctrl+F5 hoặc mở cửa sổ ẩn danh.

Điểm chính: index.html không còn phụ thuộc vào app.js ES module để bắt sự kiện đăng nhập. login-bootstrap.js là JavaScript thường, gọi trực tiếp PostgREST RPC và hiển thị lỗi HTTP cụ thể. Chỉ sau khi RPC đăng nhập thành công mới tải app.js. app.js cũng đã chuyển các module chức năng sang lazy-load để một module chức năng lỗi không thể làm chết màn hình đăng nhập.
