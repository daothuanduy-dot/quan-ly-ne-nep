
## V3.0.5.25.23
Xem `README_V3.0.5.25.23.txt` và chạy SQL `sql/021_v3_0_5_25_23_portal_phu_huynh_phuc_khao.sql` trước khi sử dụng cổng phụ huynh/học sinh.

# Quản lý nề nếp & thi đua – V3.0.5.23

Bản này tập trung kích hoạt và sửa hoàn chỉnh luồng **Báo Vắng Học Sinh**.

## Cập nhật quan trọng
- `diem_danh_master`: frontend không còn gửi `nam_hoc`, tương thích cả CSDL cũ chưa có cột này; migration 018 vẫn bổ sung cột tùy chọn.
- `bao_vang_lop`: không còn phụ thuộc `upsert/onConflict`; tự tìm bản ghi theo năm học/ngày/buổi/lớp rồi UPDATE hoặc INSERT.
- Chuẩn hóa khối 10/11/12 và `Khối 10/11/12`.
- Không phụ thuộc cứng `trang_thai='Active'` khi đọc học sinh; trạng thái được chuẩn hóa ở frontend.
- Kiểm tra TKB theo thứ + buổi với ưu tiên lớp cụ thể → khối → toàn trường.
- Giữ quyền báo vắng theo phạm vi lớp của tài khoản.

## SQL bắt buộc
Chạy `sql/018_v3.0.5.23_kich_hoat_bao_vang.sql` trong Supabase SQL Editor, sau đó tải lại GitHub Pages bằng Ctrl+F5.


V3.0.5.25.13: Bổ sung vai trò Cờ đỏ (học sinh); sửa form Cán bộ lớp/Cờ đỏ để luôn hiển thị liên kết lớp + học sinh; giữ quyền chấm điểm cá nhân và thống kê lớp. Không thay đổi schema CSDL.


V3.0.5.25.13: Tại Quản lý học sinh > Sửa, bổ sung checkbox Cán bộ lớp. Khi tích chọn, hệ thống tự tạo/kích hoạt tài khoản Cán bộ lớp theo mã học sinh, gắn đúng lớp và học sinh, mặc định mật khẩu 123456 và quyền Chấm điểm. Khi bỏ chọn, tài khoản Cán bộ lớp hiện có sẽ được khóa, không xóa dữ liệu.


V3.0.5.25.13: Modern responsive UI refresh for all tabs; bright card-based layout, mobile optimization, and improved scoring selectors.

## V3.0.5.25.19
- Bổ sung popup chi tiết khi nhấn vào hàng tại Xếp loại & Thi đua thử nghiệm.
- Áp dụng cho 3 chế độ: Cá nhân, Tập thể lớp, Theo khối.
- Popup hiển thị thông tin đối tượng, điểm từng mảng, tổng điểm, phân bố điểm học tập và chi tiết các điểm đã chấm.
- Nhấn nền popup hoặc nút X để đóng.

## V3.0.5.25.25 — Thông báo chủ động và lịch sử phúc khảo
Chạy `sql/023_thong_bao_chu_dong_lich_su_phuc_khao.sql` sau migrations 021 và 022. Xem `README_V3.0.5.25.25.txt`.
