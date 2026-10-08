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


V3.0.5.25.2: Bổ sung vai trò Cờ đỏ (học sinh); sửa form Cán bộ lớp/Cờ đỏ để luôn hiển thị liên kết lớp + học sinh; giữ quyền chấm điểm cá nhân và thống kê lớp. Không thay đổi schema CSDL.
