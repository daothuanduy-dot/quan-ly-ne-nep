# Quản lý nề nếp & thi đua — V3.0.4

## Mục tiêu

V3.0.4 là bản **để kiểm tra giao diện + luồng nghiệp vụ thực tế** sau khi đã xác nhận schema Supabase.

### Luồng QR mới

```text
Quét QR / nhập mã
      ↓
Tìm danh_sach bằng ma_qr hoặc ma_hs
      ↓
Hiển thị thông tin học sinh (CHỈ ĐỌC)
      ↓
┌──────────────────────────────────┐
│ Đi muộn không phép               │
│ Đi muộn có phép                  │
│ Điểm cộng                        │
│ Điểm trừ                         │
└──────────────────────────────────┘
      ↓
Nếu cộng/trừ → dropdown danh_muc_diem
      ↓
Xác nhận
      ↓
INSERT diem_danh_master
```

**Không UPDATE dữ liệu gốc học sinh khi quét QR.**

## 6 tab chính

1. Quét QR Đi Muộn
2. Báo Vắng Học Sinh
3. Chấm Điểm Thi Đua
4. Thống Kê Biểu Đồ
5. Xếp Loại & Danh Hiệu
6. Quản Trị Hệ Thống

Tab 6 gồm 7 sub-tab:

- Quản lý học sinh
- Nhập học sinh từ Excel
- Quản lý cán bộ
- TKB và TG học
- Kết chuyển năm và TN
- Quản lý tiêu chí
- Phân quyền sử dụng chức năng

## Những chức năng có thể kiểm tra ngay

### Quét QR

- Camera QR nếu trình duyệt cho phép.
- Nhập mã QR thủ công.
- Tìm bằng `ma_qr` hoặc `ma_hs`.
- Hiển thị thông tin học sinh chỉ đọc.
- Đi muộn có phép/không phép.
- Điểm cộng/trừ.
- Dropdown tiêu chí lấy từ `danh_muc_diem`.
- Ghi lịch sử vào `diem_danh_master`.

### Báo vắng

- Tải học sinh Active.
- Chọn ngày/buổi.
- Chọn vắng có phép/không phép.
- Ghi vào `diem_danh_master`.

### Chấm điểm

- Tải học sinh.
- Chọn tiêu chí.
- Ghi điểm vào `diem_danh_master`.

### Thống kê

- Số học sinh.
- Số lượt ghi nhận.
- Điểm cộng/trừ.
- Lượt đi muộn.
- Quy mô theo khối.

### Xếp loại

Bản thử nghiệm tổng hợp điểm từ `diem_danh_master`, chưa ghi kết quả xếp loại vào `danh_sach`.

### Quản trị

Các module học sinh, cán bộ, tiêu chí và phân quyền có thao tác thật trên Supabase. TKB/kết chuyển được giữ ở chế độ an toàn cho đến khi chốt đầy đủ nghiệp vụ.

## Cài đặt

Không cần chạy SQL để dùng frontend nếu schema hiện tại đã đúng.

File:

```text
sql/005_v3_0_4_readonly_check.sql
```

chỉ để kiểm tra.

### GitHub Pages

Thay toàn bộ:

```text
index.html
css/
js/
```

Không cần chạy `ALTER TABLE`.

Sau khi deploy:

```text
Ctrl + F5
```

## Lưu ý

1. QR chỉ xác định học sinh.
2. Không sửa `danh_sach` khi ghi nhận sự kiện.
3. Quyền người dùng nằm tại `can_bo.quyen_tabs`.
4. Admin toàn quyền theo vai trò.
5. Điểm cộng/trừ lấy từ `danh_muc_diem`.
6. Lịch sử sự kiện ghi vào `diem_danh_master`.

## Hướng phát triển tiếp

Sau khi kiểm tra UI V3.0.4, khóa tiếp:
- nghiệp vụ cửa sổ thời gian QR;
- chống ghi trùng;
- báo vắng theo tiết;
- bảng tổng hợp tuần;
- thuật toán xếp loại;
- danh hiệu;
- kết chuyển hàng loạt;
- phân quyền chi tiết theo vai trò/lớp.


## V3.0.4.1 — Sửa giao diện đăng nhập

- Bổ sung nút 👁 hiển thị/ẩn mật khẩu.
- Bổ sung checkbox ghi nhớ mã cán bộ.
- Không lưu mật khẩu vào localStorage.
- Phiên đăng nhập dùng sessionStorage.
- Thêm cache-busting cho `app.css`.
- Khi cập nhật GitHub phải upload cả thư mục `css/`, đặc biệt `css/app.css`.


## V3.0.5 — Chấm điểm thi đua

Tab **Chấm Điểm Thi Đua** được thiết kế theo luồng:

```text
Chọn khối
   ↓
Chọn lớp
   ↓
┌─────────────────────┐
│ Chấm tập thể        │
│ Chấm cá nhân        │
└─────────────────────┘
```

### Tập thể
- Chỉ lấy tiêu chí có `doi_tuong` là `Tập thể`.
- Chọn điểm cộng/trừ.
- Chọn nội dung tương ứng.
- Ghi bản ghi cho lớp vào `diem_danh_master`.

### Cá nhân
- Chỉ lấy học sinh thuộc lớp đã chọn.
- Hiển thị thông tin học sinh dạng chỉ đọc.
- Chọn điểm cộng/trừ.
- Chọn nội dung tương ứng từ `danh_muc_diem`.
- Ghi bản ghi cho học sinh vào `diem_danh_master`.

SQL `006_v3_0_5_doi_tuong_diem.sql` thêm cột `doi_tuong` vào `diem_danh_master` nếu chưa có, để dữ liệu lịch sử phân biệt được tập thể/cá nhân.


## V3.0.5.1 — Sửa giới hạn 1.000 học sinh và giao diện điểm

### Đã sửa

- Không còn dùng `limit(1000)` cho danh sách học sinh.
- Dùng phân trang `.range()` theo từng 1.000 dòng, nên tổng dữ liệu >1.000 vẫn được tải đầy đủ.
- Danh sách học sinh chỉ hiển thị **Họ tên — Ngày sinh**, không hiển thị mã định danh.
- Điểm cộng/điểm trừ chuyển thành **radio button**.
- Chỉ hiển thị tiêu chí đúng với đối tượng `Cá nhân` hoặc `Tập thể`.
- Khi chấm tập thể, nếu CSDL chưa có tiêu chí `Tập thể`, giao diện báo rõ nguyên nhân thay vì để dropdown rỗng không giải thích.
- Bản ghi chấm tập thể/cá nhân gửi `doi_tuong` vào `diem_danh_master` nếu cột đã được tạo bởi SQL 006; nếu chưa tạo, frontend có fallback để vẫn ghi được dữ liệu cũ.
- Thêm SQL `007_v3_0_5_1_kiem_tra_tieu_chi_tap_the.sql` để kiểm tra chính xác các giá trị `danh_muc_diem.doi_tuong`.

### Kiểm tra tiêu chí tập thể

Chạy file SQL 007 để biết CSDL hiện có thực sự các giá trị:
- `Cá nhân`
- `Tập thể`
- `Tập thể lớp`
- hoặc giá trị khác.

Không tự động biến tiêu chí cá nhân thành tiêu chí tập thể.
