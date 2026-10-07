# Quản trị hệ thống - Quản lý nề nếp & thi đua

## Cấu trúc
- `index.html`: giao diện Quản trị hệ thống.
- `js/config.js`: cấu hình Supabase + năm học + hàm xử lý tên lớp.
- `js/quantri-hocsinh.js`: CRUD bảng `danh_sach`.
- `js/quantri-import.js`: tải mẫu và import Excel hàng loạt.
- `js/quantri-canbo.js`: CRUD bảng `can_bo`, nhiều vai trò, lớp CN, lớp giảng dạy.
- `js/quantri-tkb.js`: cấu hình `cai_dat_thoi_gian`.
- `js/quantri-ketchuyen.js`: kết chuyển 10→11, 11→12 và TN khối 12.
- `js/quantri-tieuchi.js`: CRUD `danh_muc_diem`.
- `js/quantri-phanquyen.js`: quyền tab theo cán bộ/vai trò.
- `sql/quantri.sql`: SQL bổ sung cấu trúc.

## Cài đặt
1. Chạy `sql/quantri.sql` trên Supabase SQL Editor.
2. Mở `js/config.js`, điền `supabaseUrl` và `supabaseAnonKey`.
3. Nếu dự án hiện tại đã có `config.js`, giữ cách tạo client hiện tại nhưng bảo đảm các module export `supabase`, `appConfig`.
4. Deploy các file lên GitHub Pages cùng thư mục.
5. Với production nên bật RLS và tạo policy theo tài khoản Supabase Auth. Không dùng service_role key ở frontend.

## Lưu ý kết chuyển
Khuyến nghị sau khi chạy SQL nên chuyển nghiệp vụ kết chuyển sang RPC/transaction để tránh trạng thái dở dang nếu một nhóm update bị lỗi. Bản frontend cập nhật 10/11 sang `nam_hoc` kế tiếp và đánh dấu TN khối 12 sang năm học kế tiếp; học sinh lưu ban/rèn luyện lại không được chọn sẽ tiếp tục ở năm học hiện tại.

## Lưu ý năm học
Để lưu được lịch sử nhiều năm, `danh_sach.nam_hoc` là trường quan trọng. Không nên xóa vật lý học sinh tốt nghiệp. Hệ thống nên đánh dấu `Đã tốt nghiệp` và chuyển/archived theo năm học.
