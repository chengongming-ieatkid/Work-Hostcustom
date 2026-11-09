# Database & Phân quyền

## Database
- Dữ liệu vận hành (dự án, việc, nhân viên, tài chính, audit, giao diện) lưu trong SQLite tại `data/tvq-workos.db` (server-side, qua API `/api/state`).
- Không còn phụ thuộc localStorage: đổi trình duyệt/máy vẫn thấy cùng dữ liệu khi chạy cùng server.
- File DB đã được thêm vào `.gitignore` — không commit dữ liệu thật/lương lên Git.

## Tài khoản mẫu (đổi mật khẩu trước khi dùng thật)
| Email | Mật khẩu | Vai trò | Quyền |
|---|---|---|---|
| admin@tvq.local | admin123 | Admin | Toàn quyền: xem/sửa mọi thứ, gồm lương, tạo tài khoản, reset dữ liệu |
| manager@tvq.local | manager123 | Manager | Sửa dự án/việc/nhân viên, tài chính dự án; KHÔNG thấy lương, không ghi đè được lương |
| member@tvq.local | member123 | Member | Chỉ xem; không thấy lương; API ghi trả 403 |

## Cơ chế bảo vệ lương
1. Server che (redact) salary/bonus/bank khỏi response cho non-admin.
2. Manager ghi dữ liệu: server tự khôi phục trường lương từ DB, không cho ghi đè.
3. Copilot API: bắt buộc đăng nhập (401 nếu chưa); với non-admin, server thay state client gửi lên bằng state DB đã che lương — không moi được lương qua prompt.
4. UI: khối Thù lao chỉ render với Admin; plan `set_member_pay` bị chặn ở client nếu không phải Admin và vẫn là L3 cần duyệt.

## Tạo thêm tài khoản
Đăng nhập Admin → Cài đặt & dữ liệu → Tài khoản & phân quyền → Tạo tài khoản.

## Thù lao mở rộng
- Mỗi nhân viên có thêm: số CCCD, ảnh CCCD (tải trực tiếp trong Company → Tài chính & thù lao, ảnh ≤ ~400KB), ngày thanh toán lương, và danh sách khoản chi theo dự án/đợt kèm deadline + trạng thái chờ chi/đã chi.
- CCCD, ảnh CCCD và khoản chi là dữ liệu Admin-only: bị che khỏi non-admin giống lương.
- Prompt Admin làm được: cập nhật CCCD/ngày trả lương (`set_member_pay`), thêm/sửa/xoá khoản chi (`add_pay_item` / `update_pay_item` / `delete_pay_item`) — tất cả L3 chờ duyệt.
