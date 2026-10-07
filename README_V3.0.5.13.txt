V3.0.5.13 - Bản sửa chuyên biệt cho đăng nhập

1. Chạy SQL: sql/015_v3_0_5_13_fix_login.sql trên Supabase.
2. Upload đè toàn bộ thư mục/file của ZIP lên đúng đường dẫn GitHub.
3. File index.html đã cache-bust app.js bằng ?v=3.0.5.13.
4. Đăng nhập gọi trực tiếp PostgREST RPC login_can_bo và hiển thị lỗi HTTP/Supabase rõ ràng.
5. Nếu đăng nhập thất bại, thông báo màu đỏ dưới nút Đăng nhập sẽ cho biết nguyên nhân.
