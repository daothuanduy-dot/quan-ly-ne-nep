# PWA + Web Push — V3.0.5.25.33

## Đã thêm trong gói này
- PWA manifest, icon 192/512, nút cài đặt và service worker tại `/quan-ly-ne-nep/`.
- Service worker chỉ cache vỏ giao diện/tài nguyên tĩnh; không cache JavaScript module hoặc dữ liệu Supabase của học sinh.
- Nút “Bật thông báo” cho cán bộ và tài khoản phụ huynh/học sinh sau khi đăng nhập.
- Đăng ký PushSubscription qua RPC xác thực tài khoản, lưu endpoint vào bảng riêng.
- Supabase Edge Function `send-web-push` để gửi Web Push bằng VAPID, có thống kê tổng/success/failure và dọn subscription hết hạn.
- Không thay đổi bảng điểm, danh sách học sinh, nề nếp hay logic phân quyền hiện có.

## 1. GitHub Pages
Repository URL hiện tại có đường dẫn `/quan-ly-ne-nep/`; manifest và service worker đã cấu hình theo đường dẫn này. Nếu đổi tên repository hoặc đường dẫn public, phải sửa `BASE` trong `js/pwa.js`, `sw.js`, `start_url`, `scope` và đường dẫn icon trong `manifest.webmanifest`.

Đưa toàn bộ nội dung gói lên repository, giữ đúng cấu trúc thư mục. Mở HTTPS của GitHub Pages. Sau khi deploy, thử mở:
- `/quan-ly-ne-nep/manifest.webmanifest`
- `/quan-ly-ne-nep/sw.js`

## 2. Tạo khóa VAPID
Trên máy phát triển có Node.js, chạy:

```bash
npx web-push generate-vapid-keys
```

Giữ **Private Key bí mật**, không commit vào GitHub và không đặt trong JavaScript. Điền Public Key vào `webPushPublicKey` trong `js/config.js`, sau đó deploy lại. Public Key được phép có trong frontend.

## 3. Supabase SQL
Chạy `sql/028_pwa_web_push.sql` trong SQL Editor. RPC đăng ký thiết bị xác thực mã/mật khẩu hiện có rồi mới lưu subscription. Bảng subscription không cấp quyền SELECT/INSERT trực tiếp cho anon/authenticated.

## 4. Cấu hình Edge Function
Triển khai function từ thư mục `supabase/functions/send-web-push` bằng Supabase CLI. Thiết lập secrets ở project Supabase, không đặt trong frontend:

```bash
supabase secrets set QLNN_PUSH_SECRET="<chuoi-bi-mat-ngau-nhien-dai>" \
  VAPID_PUBLIC_KEY="<vapid-public-key>" \
  VAPID_PRIVATE_KEY="<vapid-private-key>" \
  VAPID_SUBJECT="mailto:<email-quan-tri-hop-le>"
```

`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` phải có trong môi trường Edge Function. Nếu chưa có, đặt bằng `supabase secrets set`. Deploy:

```bash
supabase functions deploy send-web-push
```

Gọi endpoint chỉ từ máy chủ/automation tin cậy, với header `x-push-secret`; **không đưa `QLNN_PUSH_SECRET` hoặc `service_role` vào mã frontend**. Ví dụ body:

```json
{
  "title": "Đã có kết quả kiểm tra",
  "message": "Kết quả đợt khảo sát tháng 10 đã được công bố. Vui lòng đăng nhập để xem.",
  "url": "/quan-ly-ne-nep/",
  "account_ids": ["3194650112"],
  "roles": ["parent", "student"]
}
```

Nếu bỏ `account_ids` hoặc `roles`, function gửi tới toàn bộ subscription; hãy chỉ làm điều đó từ quy trình được Admin cho phép.

## 5. Giới hạn cần biết
- Nút bật Push chỉ hoạt động sau khi điền VAPID Public Key, chạy SQL và deploy Edge Function.
- Đây là nền tảng nhận/gửi Web Push; các sự kiện nghiệp vụ (đợt có kết quả, cập nhật phúc khảo, biến động nề nếp) vẫn phải gọi endpoint từ quy trình máy chủ tương ứng. Không gọi Edge Function trực tiếp từ frontend bằng secret.
- iPhone/iPad cần iOS/iPadOS hỗ trợ Web Push, mở trang bằng Safari, thêm vào Màn hình chính và cho phép thông báo. Android cần trình duyệt hỗ trợ Push.
- Service worker không lưu cache các dữ liệu riêng tư để tránh rò rỉ dữ liệu khi dùng chung thiết bị.
- Do ứng dụng hiện có cơ chế đăng nhập RPC riêng, không thay đổi sang Supabase Auth trong giai đoạn này.

## Kiểm thử
1. Cài PWA trên Android và iPhone.
2. Bật thông báo ở từng vai trò và xác nhận subscription được ghi trong `qlnn_push_subscriptions`.
3. Gửi push thử từ Edge Function với một `account_id` thử nghiệm; xác nhận đúng thiết bị nhận.
4. Thử endpoint sai secret (phải trả 401).
5. Thử subscription hết hạn và kiểm tra bản ghi 404/410 được dọn.
