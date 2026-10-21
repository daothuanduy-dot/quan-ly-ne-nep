# V3.0.5.25.48 — Sửa lỗi tải Công thức thi đua

Nguồn: V3.0.5.25.47_FULL.zip.

## Tệp sửa
- index.html
- js/admin.js
- js/login-bootstrap.js
- sw.js

- js/formula-admin.js

## Nguyên nhân
Thiếu dấu `}` đóng hàm `renderCriteria()` trong js/formula-admin.js, gây SyntaxError: Unexpected token '}'.

## Cải tiến
- Bắt lỗi tải module và hiển thị thông báo thay vì treo ở Đang tải.
- Service Worker clone response trước khi xử lý bất đồng bộ; tránh Response body is already used.
- Tăng phiên bản để làm mới cache.

## Không thay đổi
Mọi tệp khác giữ nguyên byte so với gói 25.47, ngoại trừ manifest mới. Không có SQL migration mới; không chạy lại SQL.

## Kiểm tra
node --check js/formula-admin.js, js/admin.js, js/formula-engine.js, sw.js thành công. Chưa kiểm thử trực tiếp với Supabase.
