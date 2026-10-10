QLNN V3.0.5.25.35 — THÔNG BÁO ĐẨY TỰ ĐỘNG CHO HỌC SINH/PHỤ HUYNH

PHẠM VI
- Báo vắng: gửi đến học sinh có tên trong lần ghi nhận vắng.
- Quét QR ghi nhận đi muộn/điểm cộng/điểm trừ: gửi đến học sinh được ghi nhận.
- Chấm điểm cá nhân: gửi đến học sinh được cập nhật.
- Chấm điểm tập thể, Sổ đầu bài, điểm học tập theo tuần: gửi đến học sinh trong lớp tương ứng.
- Sửa hồ sơ học sinh hoặc nhập Excel hồ sơ: gửi đến tài khoản đã đăng ký Push tương ứng.
- Cập nhật kết quả kiểm tra và trạng thái phúc khảo: gửi đến học sinh tương ứng.
- Mỗi tài khoản học sinh sẽ gửi đến mọi thiết bị có đăng ký vai trò student và parent.

CÁC TỆP CẦN CHÉP ĐÈ/THÊM
1. Chép đè js/qr.js
2. Chép đè js/baovang-v25.js
3. Chép đè js/chamdiem.js
4. Chép đè js/admin.js
5. Thêm mới js/push-events.js
6. Thêm mới supabase/functions/send-student-event/index.ts

SUPABASE CONFIG
Trong supabase/config.toml đang dùng ở dự án, hãy giữ nguyên cấu hình hiện có và bổ sung:

[functions.send-student-event]
verify_jwt = false

Không xóa cấu hình [functions.send-web-push] đã có. Hàm mới tự xác thực mã cán bộ/mật khẩu và kiểm tra vai trò/phạm vi lớp ở phía máy chủ. Không đặt QLNN_PUSH_SECRET hoặc SERVICE_ROLE_KEY trong JavaScript.

TRIỂN KHAI EDGE FUNCTION
Mở PowerShell tại thư mục dự án và chạy:

npx.cmd supabase@latest functions deploy send-student-event

Nếu CLI yêu cầu đăng nhập/link project, dùng cùng tài khoản và project đã triển khai send-web-push trước đó. Không cần tạo lại Secrets VAPID. Hàm dùng SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT đã cấu hình ở Supabase.

GITHUB PAGES
Commit/push 5 tệp JavaScript nêu trên vào đúng thư mục js/ và Edge Function chỉ triển khai bằng Supabase CLI. Nếu trình duyệt còn dùng bản cũ, đóng hẳn tab ứng dụng rồi mở lại; trên máy tính có thể Ctrl+F5.

KIỂM THỬ
1. Trên điện thoại học sinh/phụ huynh, đăng nhập, chọn Bật thông báo, cho phép thông báo.
2. Kiểm tra public.qlnn_push_subscriptions có bản ghi role student hoặc parent với account_id đúng mã học sinh.
3. Từ tài khoản có quyền, thử ghi nhận một lần điểm danh hoặc điểm nề nếp cho một học sinh đã đăng ký.
4. Mở Supabase Edge Functions > send-student-event > Logs nếu chưa nhận. Trong Network/console trình duyệt, lỗi gửi sẽ được ghi với tiền tố [QLNN WebPush].

LƯU Ý
- Push chỉ gửi sau khi thao tác lưu nghiệp vụ thành công; lỗi Push không hủy dữ liệu đã lưu.
- Điện thoại phải đăng ký Push và cho phép thông báo. Thiết bị chưa đăng ký không thể nhận thông báo hồi tố.
- Tài khoản phụ huynh và học sinh cần đăng ký riêng trên thiết bị nếu muốn cả hai nhận thông báo.
- Những thay đổi được thực hiện trực tiếp ngoài giao diện này (ví dụ sửa SQL thủ công trên Supabase) không được bao phủ bởi các hook frontend trong gói này.
