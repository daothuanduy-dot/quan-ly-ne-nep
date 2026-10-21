# V3.0.5.25.50 — sửa cú pháp công thức thi đua

Nguồn: V3.0.5.25.49_FULL.zip.

## Tệp sửa
- `index.html`
- `js/admin.js`
- `js/formula-admin.js`
- `js/login-bootstrap.js`
- `sw.js`

## Lý do
- Sửa dấu `}` thừa trong callback `forEach` tại `js/formula-admin.js`, gây `Unexpected token '}'`.
- Đồng bộ chuỗi phiên bản sang 3.0.5.25.50 nhằm làm mới tài nguyên.

## Tệp giữ nguyên
Mọi tệp khác trong ZIP nguồn giữ nguyên byte. Không thay đổi SQL.

## Kiểm tra
- `node --check` cho các tệp JS thay đổi (kiểm tra module bằng `.mjs`).
- Chưa kiểm thử trên Supabase/GitHub Pages thực tế.
