# Quản lý nề nếp & thi đua — V3.0.2

## Mục tiêu của V3.0.2

V3.0.2 khóa lại kiến trúc frontend theo một entry point duy nhất và xử lý dứt điểm lỗi:

> Không tải được phân quyền: column `danh_sach.quyen_xep_loai` does not exist

### Kiến trúc

```text
index.html
   │
   └── js/app.js  ← entry point duy nhất
        ├── js/config.js
        │     └── Supabase client
        ├── js/auth.js
        │     └── RPC public.login_can_bo()
        └── js/quantri-phanquyen.js
              └── can_bo.quyen_tabs
```

Không còn:
- `api_login.php`
- `ma_can_bo`
- `window.supabaseClient`
- `window.CONFIG`
- load `config.js` như classic script
- load đồng thời các module cũ và module mới
- quyền `quyen_xep_loai` trong `danh_sach`

## 6 tab chính

1. Quét QR Đi Muộn
2. Báo Vắng Học Sinh
3. Chấm Điểm Thi Đua
4. Thống Kê Biểu Đồ
5. Xếp Loại & Danh Hiệu
6. Quản Trị Hệ Thống

### 7 chức năng trong Tab 6

- Quản lý học sinh
- Nhập học sinh từ Excel
- Quản lý cán bộ
- TKB và TG học
- Kết chuyển năm và TN
- Quản lý tiêu chí
- Phân quyền sử dụng chức năng

## Cơ chế phân quyền

Quyền của cán bộ được lưu tại:

```text
public.can_bo.quyen_tabs
```

Các mã quyền:

```text
qr
baovang
chamdiem
thongke
xeploai
quantri
```

Tài khoản có vai trò `Admin` hoặc `Admin` trong `vai_tro_list` được coi là toàn quyền.

Ví dụ tài khoản thường:

```json
["qr", "baovang", "thongke"]
```

## Cài đặt

### Bước 1 — Supabase

Mở SQL Editor và chạy:

```text
sql/002_phan_quyen_v3_0_2.sql
```

Nếu `can_bo.quyen_tabs` đã tồn tại, script không đổi kiểu cột.

### Bước 2 — Kiểm tra RPC

Chạy:

```sql
SELECT public.login_can_bo('3103016229','123456');
```

Kết quả cần có dạng:

```json
{
  "ma_cb": "3103016229",
  "ho_ten": "Đào Thuận Duy",
  "vai_tro": "Admin",
  "quyen_tabs": [],
  "trang_thai": true
}
```

Không được có `mat_khau` trong kết quả.

### Bước 3 — GitHub

Thay các file:

```text
index.html
js/config.js
js/auth.js
js/app.js
js/quantri-phanquyen.js
sql/002_phan_quyen_v3_0_2.sql
README.md
```

Không giữ các `<script>` cũ của hệ thống trước đây trong `index.html`.

Đặc biệt, không được còn:

```html
<script src="./js/config.js"></script>
<script src="./js/auth.js"></script>
```

mà phải chỉ có:

```html
<script type="module" src="./js/app.js"></script>
```

## Kiểm thử lỗi `danh_sach.quyen_xep_loai`

Sau khi deploy:

1. Đăng nhập tài khoản Admin.
2. Chọn `Quản Trị Hệ Thống`.
3. Chọn `Phân quyền sử dụng chức năng`.
4. Danh sách cán bộ phải tải từ `can_bo`.
5. Không có truy vấn nào đến `danh_sach.quyen_xep_loai`.
6. Chọn cán bộ thường, đánh dấu quyền và lưu.
7. Kiểm tra lại:

```sql
SELECT ma_cb, ho_ten, quyen_tabs
FROM public.can_bo
ORDER BY ho_ten;
```

## Nếu vẫn xuất hiện `danh_sach.quyen_xep_loai`

Khi đó lỗi không còn nằm trong code V3.0.2 mà gần như chắc chắn còn một object cũ trong Supabase (policy/view/function) hoặc trình duyệt đang chạy bundle cũ.

Chạy 3 truy vấn ở cuối file:

```text
sql/002_phan_quyen_v3_0_2.sql
```

để tìm object còn chứa chuỗi `quyen_xep_loai`.

Sau khi deploy GitHub Pages, hãy hard refresh:

```text
Ctrl + F5
```

hoặc mở cửa sổ ẩn danh để loại cache.

## Lưu ý bảo mật

`supabaseAnonKey` là publishable/anon key và có thể xuất hiện ở frontend. Tuyệt đối không đưa `service_role` key vào GitHub Pages.

Tài khoản cán bộ hiện tại đang xác thực qua RPC và bảng `can_bo`. Đây là kiến trúc tương thích với hệ thống hiện tại; nếu triển khai xác thực production chuẩn hơn, có thể chuyển sang Supabase Auth ở phiên bản sau.

## Phạm vi V3.0.2

V3.0.2 ưu tiên ổn định nền tảng, đăng nhập và phân quyền. Các module nghiệp vụ khác được giữ dưới dạng shell để tránh tiếp tục trộn mã cũ với mã mới. Các module sẽ được đưa trở lại từng bước theo cùng kiến trúc module V3.0.2.
