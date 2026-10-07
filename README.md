# QUẢN LÝ NỀ NẾP & THI ĐUA — v3.0.1

## Trạng thái
Đây là bản đồng bộ sau khi xác nhận trực tiếp Supabase RPC:
`public.login_can_bo('3103016229','123456')` đã trả về JSON cán bộ thành công.

## Cấu trúc
- `index.html`
- `js/config.js`
- `js/auth.js`
- `js/app.js`
- `sql/001_login_can_bo_v3_0_1.sql`

## Upload GitHub
Thay đồng bộ 4 file frontend. Không ghép file cũ.
`index.html` chỉ load:
`<script type="module" src="./js/app.js"></script>`

## Supabase
Nếu function hiện tại đã trả đúng như ảnh người dùng cung cấp thì không cần chạy SQL lại. Nếu muốn khóa lại đúng v3.0.1, chạy file SQL trong SQL Editor.

Test:
```sql
SELECT public.login_can_bo('3103016229','123456');
```

Kết quả không được chứa `mat_khau`.

## Đăng nhập
Frontend gọi duy nhất:
`supabase.rpc('login_can_bo', { p_ma_cb, p_mat_khau })`

Không dùng `api_login.php` và không query `mat_khau` trực tiếp từ frontend.

## Sau khi upload
- Commit tất cả file.
- Chờ GitHub Pages deploy.
- Ctrl+Shift+R.
- Nếu vẫn thấy phiên cũ: F12 -> Application -> Local Storage -> xóa `nenep_current_user_v3_0_1`.
- Console phải có `[Quản lý nề nếp] v3.0.1 started`.

## Lưu ý bảo mật
CSDL hiện vẫn có `mat_khau` dạng plaintext để tương thích hệ thống. Sau khi hệ thống ổn định nên chuyển sang Supabase Auth + RLS + password hashing.
