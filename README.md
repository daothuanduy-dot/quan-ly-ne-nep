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


## V3.0.5.2 — Tối ưu giao diện chọn khối/lớp

- Khối không còn là dropdown.
- Các khối được hiển thị bằng radio button theo hàng ngang.
- Khi chọn khối, hệ thống tải và hiển thị ngay các lớp thuộc khối đó bằng các nút lựa chọn.
- Chọn lớp xong mới mở phần chọn **Tập thể / Cá nhân**.
- Bố cục khối/lớp nằm trên cùng một hàng ở màn hình rộng, tự chuyển thành một cột trên màn hình hẹp.
- Giữ nguyên cơ chế phân trang >1.000 học sinh và radio Điểm cộng/Điểm trừ của V3.0.5.1.


## V3.0.5.3 — Tối ưu giao diện chọn khối/lớp

- Không còn hiển thị radio khối/lớp theo từng dòng kéo dài xuống dưới.
- Khối được bố trí trong một cụm lựa chọn gọn, rõ ràng.
- Lớp được bố trí dạng lưới card/chip nhiều cột, tận dụng chiều ngang màn hình.
- Lớp được tự động thay đổi theo khối.
- Có hiển thị số lượng lớp thuộc khối đang chọn.
- Lớp được chọn có màu nổi bật và dấu ✓.
- Responsive: màn hình nhỏ tự giảm số cột.
- Không thay đổi logic CSDL, phân trang học sinh, tiêu chí hoặc phân quyền.


## V3.0.5.4 — Quản trị, thống kê và báo vắng

### Quản trị hệ thống
- Loại bỏ hàng sub-tab bị lặp trong `index.html`.
- Chỉ còn **một hàng** 7 chức năng quản trị, do `admin.js` quản lý.

### Thống kê
- Không còn giới hạn 1.000 học sinh.
- Thống kê học sinh và lịch sử được phân trang theo 1.000 dòng cho đến khi hết dữ liệu.
- Các chỉ số tổng số học sinh, lượt ghi nhận, điểm cộng, điểm trừ và đi muộn được tính trên toàn bộ dữ liệu đã tải.

### Báo vắng
Luồng mới:

`Ngày + Buổi → Khối → Lớp → Số vắng → Danh sách học sinh → Có phép/Không phép → Ghi CSDL`

- Chọn khối.
- Chọn lớp thuộc khối.
- Chọn số học sinh vắng.
- Hệ thống tự tạo đúng số dòng tương ứng.
- Mỗi dòng có một dropdown chọn học sinh, hiển thị **Họ tên + ngày sinh**, không hiển thị mã học sinh.
- Mỗi học sinh bắt buộc chọn một trong hai trạng thái:
  - Vắng có phép
  - Vắng không phép
- Không cho chọn trùng cùng một học sinh trong các dòng.
- Dữ liệu được ghi vào `diem_danh_master`.

## V3.0.5.5 — Quản lý vai trò và phạm vi lớp

### Vai trò chuẩn hóa
- Admin — toàn hệ thống.
- GVCN — giáo viên chủ nhiệm; có lớp chủ nhiệm; được cập nhật điểm/báo vắng lớp chủ nhiệm, xem thống kê toàn trường và lớp mình, đăng ký Tuần học tốt.
- Giáo viên — giáo viên giảng dạy; được gán nhiều lớp giảng dạy; chỉ cập nhật điểm/báo vắng trong các lớp được phân công và xem thống kê phạm vi đó.
- Cán bộ lớp — tài khoản học sinh; phải liên kết `ma_hs` và một lớp; chỉ chấm điểm cá nhân cho học sinh cùng lớp và xem thống kê lớp.

### CSDL
Chạy:
- `sql/008_v3_0_5_5_quan_ly_can_bo.sql`
- `sql/009_v3_0_5_5_so_dau_bai.sql`

Migration 008 thêm `can_bo.ma_hs` và `can_bo.loai_quan_ly_lop`.
Migration 009 chuẩn bị `tuan_hoc`, `tiet`, `mon_hoc`, `nguon_cham` cho lịch sử điểm và tạo bảng `tuan_hoc_tot` cho đăng ký của GVCN.


## V3.0.5.6 — Năm học và kiểm soát báo vắng

- Hiển thị năm học 2026-2027 trên giao diện.
- Sửa migration `tuan_hoc_tot`/`diem_danh_master`: dùng `ADD COLUMN IF NOT EXISTS` để xử lý CSDL đã tồn tại nhưng thiếu `nam_hoc`.
- Buổi báo vắng mặc định tự xác định theo thời gian hệ thống/cấu hình giờ điểm danh; chỉ mở lựa chọn Sáng/Chiều khi người dùng bật “Báo bổ sung / chọn lại buổi”.
- Mỗi lớp phải tạo bản ghi `bao_vang_lop`, kể cả `so_vang = 0`.
- Bổ sung vai trò `Trực`, có quyền theo dõi tình trạng báo vắng.
- Theo dõi: tổng số lớp có lịch, số lớp đã báo, số lớp chưa báo; nhấn “Chưa báo” để mở danh sách lớp chưa báo.
- Bổ sung bảng `thoi_khoa_bieu` để xác định lớp có lịch học theo thứ/ngày. Nếu TKB chưa nhập, hệ thống tạm fallback sang `cai_dat_thoi_gian`.


## V3.0.5.7
- Mảng, Loại và Đối tượng trong Quản lý tiêu chí được chuẩn hóa bằng dropdown.
- QR scanner hỗ trợ QR chứa mã học sinh thuần, chuỗi có nhãn "Mã HS:", URL, JSON hoặc chuỗi thẻ có kèm thông tin học sinh.
- Khi QR được đọc, hệ thống tự trích mã học sinh, tra cứu `ma_qr`/`ma_hs` và hiển thị hồ sơ học sinh; không dùng nguyên chuỗi QR làm mã tra cứu duy nhất.
- Giao diện chỉ hiển thị mã HS sau khi đã nhận diện thành công; không hiển thị nguyên payload QR dài.

## V3.0.5.8 — Sửa schema Báo vắng

Nếu xuất hiện lỗi `Could not find the table 'public.bao_vang_lop' in the schema cache` hoặc `Could not find the 'nam_hoc' column of 'diem_danh_master' in the schema cache`, hãy chạy **một lần** file:

`sql/011_v3_0_5_8_fix_bao_vang_schema.sql`

File này bổ sung các bảng/cột còn thiếu và gửi `NOTIFY pgrst, 'reload schema'` để PostgREST làm mới schema cache.

Sau khi SQL chạy thành công, tải lại GitHub Pages bằng `Ctrl + F5`.


## V3.0.5.9 — Quản lý người dùng & kích hoạt TKB

- Đổi tên phân hệ **Quản lý cán bộ** thành **Quản lý người dùng**.
- Bổ sung migration `012_v3_0_5_9_fix_nguoi_dung.sql` để tránh lỗi thiếu `can_bo.ma_hs` và `can_bo.loai_quan_ly_lop` nếu migration 008 chưa chạy.
- Kích hoạt phân hệ **TKB & TG học**:
  - Xem thời khóa biểu theo năm học.
  - Thêm/sửa/xóa tiết TKB.
  - Gán thứ, tiết, buổi, khối, lớp, môn học và giáo viên.
  - Kiểm tra nhanh lịch học hôm nay.
  - Giữ bảng `cai_dat_thoi_gian` cho cửa sổ điểm danh.
- Sửa theo dõi báo vắng để đọc cả cột `buoi` của TKB.
- TKB trở thành nguồn chính để xác định lớp có học; khi chưa có TKB thì Báo vắng vẫn dùng fallback `cai_dat_thoi_gian`.
