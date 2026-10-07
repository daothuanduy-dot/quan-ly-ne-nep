# Quản lý nề nếp & thi đua — V3.0.2.2

## Trạng thái

V3.0.2.2 được xây dựng sau khi xác nhận trực tiếp schema Supabase:

```text
public.can_bo.quyen_tabs
data_type = jsonb
jsonb_typeof(quyen_tabs) = array
```

Dữ liệu thực tế đã xác nhận:
- Admin có `vai_tro = Admin`, `quyen_tabs = []` → hợp lệ, được toàn quyền theo vai trò.
- Cán bộ thường có thể có dạng `["qr","baovang","thongke"]` → hợp lệ.

## Kiến trúc

```text
index.html
   ↓
js/app.js
   ├── js/config.js
   ├── js/auth.js
   │     └── RPC login_can_bo()
   └── js/quantri-phanquyen.js
         └── public.can_bo.quyen_tabs (jsonb)
```

Không sử dụng:
- `api_login.php`
- `ma_can_bo`
- `window.supabaseClient`
- `window.CONFIG`
- `danh_sach.quyen_xep_loai`
- `array_agg()`
- `unnest()` trong cơ chế phân quyền.

## 6 tab chính

1. Quét QR Đi Muộn
2. Báo Vắng Học Sinh
3. Chấm Điểm Thi Đua
4. Thống Kê Biểu Đồ
5. Xếp Loại & Danh Hiệu
6. Quản Trị Hệ Thống

7 chức năng là sub-tab của Tab 6:

1. Quản lý học sinh
2. Nhập học sinh từ Excel
3. Quản lý cán bộ
4. TKB và TG học
5. Kết chuyển năm và TN
6. Quản lý tiêu chí
7. Phân quyền sử dụng chức năng

## Phân quyền

Mã quyền:

```text
qr
baovang
chamdiem
thongke
xeploai
quantri
```

### Admin

Nếu `vai_tro` hoặc `vai_tro_list` xác định tài khoản là Admin, hệ thống cấp toàn quyền. `quyen_tabs = []` vẫn hợp lệ.

### Cán bộ thường

Ví dụ:

```json
["qr","baovang","thongke"]
```

chỉ cho phép 3 chức năng tương ứng.

## Cài đặt SQL

Do `quyen_tabs` đã tồn tại và đúng kiểu `jsonb`, **không chạy ALTER TABLE**.

Mở:

```text
sql/003_v3_0_2_2.sql
```

và chạy trong Supabase SQL Editor.

Script:
- kiểm tra schema;
- kiểm tra JSONB;
- cập nhật RPC đăng nhập;
- kiểm tra RPC;
- tìm object cũ còn tham chiếu `quyen_xep_loai`.

Script không thêm cột và không thay đổi cấu trúc bảng.

## Cập nhật GitHub

Thay các file:

```text
index.html
js/config.js
js/auth.js
js/app.js
js/quantri-phanquyen.js
sql/003_v3_0_2_2.sql
README.md
```

`index.html` chỉ nạp:

```html
<script type="module" src="./js/app.js"></script>
```

Không giữ các script cũ của phiên bản trước.

## Kiểm thử

### 1. SQL

Chạy:

```sql
SELECT public.login_can_bo('3103016229','123456');
```

Không được trả `mat_khau`.

### 2. Admin

Đăng nhập:

```text
3103016229
```

Sau đó:

```text
Quản Trị Hệ Thống
→ Phân quyền sử dụng chức năng
```

Admin phải nhìn thấy toàn bộ quyền.

### 3. GVCN

Tài khoản:

```text
3123013067
```

đang có:

```json
["qr","baovang","thongke"]
```

Sau khi đăng nhập:
- thấy Quét QR;
- thấy Báo Vắng;
- thấy Thống Kê;
- không thấy Chấm Điểm;
- không thấy Xếp Loại;
- không thấy Quản Trị.

### 4. Lưu quyền

Trong Tab 6 → Phân quyền:
- chọn cán bộ;
- tích/bỏ quyền;
- bấm Lưu quyền.

Frontend cập nhật:

```text
public.can_bo.quyen_tabs
```

bằng JSONB.

## Nếu vẫn thấy lỗi

Nếu sau khi thay toàn bộ frontend mà trình duyệt vẫn báo:

```text
column danh_sach.quyen_xep_loai does not exist
```

thì lỗi không nằm trong module phân quyền V3.0.2.2.

Khi đó chạy phần 6 trong:

```text
sql/003_v3_0_2_2.sql
```

để tìm policy/view/function cũ có chứa `quyen_xep_loai`.

Đồng thời dùng:

```text
Ctrl + F5
```

hoặc cửa sổ ẩn danh để loại cache GitHub Pages.

## Phạm vi V3.0.2.2

V3.0.2.2 khóa nền tảng đăng nhập + phân quyền theo schema thực tế.

Các module nghiệp vụ khác được giữ trong shell để tránh đưa code cũ vào lại. Sau khi xác nhận phân quyền ổn định, từng module trong 7 sub-tab sẽ được tích hợp lại theo cùng kiến trúc module V3.
