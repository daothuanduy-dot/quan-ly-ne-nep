# Quản lý nề nếp & thi đua — V3.0.5.25.30

## Điểm mới
- Nhập kết quả theo từng đợt + môn + khối, cho phép tệp riêng từng môn/khối.
- Lưu điểm trắc nghiệm, điểm tự luận, điểm toàn bài và SBD theo bản ghi kết quả.
- Học sinh gửi phúc khảo riêng cho từng phần thi; không tải ảnh minh chứng lên.
- Admin xử lý phúc khảo, cập nhật điểm/ghi chú, đính kèm ảnh bài thi minh chứng và tải danh sách phúc khảo xuống Excel.
- Admin chủ động gửi một thông báo chung khi đã tải đủ kết quả của đợt; tránh thông báo lặp cho từng môn/điểm.

## Cập nhật CSDL
Chạy `sql/027_ket_qua_theo_mon_khoi_phuc_khao_phan.sql` sau migration 026.

## Mẫu Excel
`Mau_Excel_Ket_Qua_Theo_Mon_Khoi.xlsx` — mỗi file cho một môn + một khối + một đợt. Xóa các dòng ví dụ trước khi import.

## Kiểm thử
JavaScript đã được kiểm tra cú pháp bằng Node.js; ZIP được kiểm tra tính toàn vẹn. Các RPC/SQL cần chạy thử trên Supabase thực tế trước khi triển khai chính thức.


## PWA + Web Push (V3.0.5.25.33)
- Hướng dẫn cài PWA và cấu hình Web Push: `README_PWA_WEB_PUSH.md`.
- SQL đăng ký thiết bị nhận push: `sql/028_pwa_web_push.sql`.
- Supabase Edge Function gửi push: `supabase/functions/send-web-push/index.ts`.
- Web Push yêu cầu VAPID secrets và triển khai Edge Function; không đặt private key/service role trong frontend.
