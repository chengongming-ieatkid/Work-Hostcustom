# Hướng dẫn sử dụng TVQ Work Copilot với AWS zai.glm-5

## Bước 1: Chuẩn bị AWS Account

### 1.1. Tạo AWS Account (nếu chưa có)
1. Truy cập https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Điền thông tin và hoàn tất đăng ký

### 1.2. Kích hoạt AWS Bedrock
1. Đăng nhập vào AWS Console
2. Tìm kiếm "Bedrock" trong thanh tìm kiếm
3. Vào Bedrock console
4. Click "Get started" nếu được yêu cầu

## Bước 2: Tạo IAM User với quyền truy cập Bedrock

### 2.1. Tạo IAM User
1. Vào IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. Nhập tên user (ví dụ: "bedrock-copilot-user")
4. Click "Next"

### 2.2. Gán quyền
1. Chọn "Attach policies directly"
2. Click "Create policy"
3. Chọn "JSON" tab
4. Paste policy sau:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Click "Next", đặt tên policy (ví dụ: "BedrockInvokePolicy")
6. Click "Create policy"
7. Quay lại trang tạo user, tìm và chọn policy vừa tạo
8. Click "Next" → "Create user"

### 2.3. Tạo Access Keys
1. Click vào user vừa tạo
2. Vào "Security credentials" tab
3. Scroll xuống "Access keys" section
4. Click "Create access key"
5. Chọn "Application running outside AWS"
6. Click "Next"
7. (Tùy chọn) Điền description
8. Click "Create access key"
9. **QUAN TRỌNG**: Download file .csv hoặc copy Access key ID và Secret access key

## Bước 3: Cấu hình dự án

### 3.1. Clone/Copy dự án
```bash
cd /Users/admin/Downloads/tvq-work-copilot-proposal
```

### 3.2. Cài đặt dependencies
```bash
pnpm install
```

### 3.3. Cấu hình environment variables
1. Mở file `.env.local`
2. Điền thông tin AWS:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...  # Access key ID từ bước 2.3
AWS_SECRET_ACCESS_KEY=...  # Secret access key từ bước 2.3
```

**Lưu ý:**
- `AWS_REGION`: Chọn region có hỗ trợ zai.glm-5 model (us-east-1, us-west-2, eu-west-1, etc.)
- Không commit file `.env.local` vào git

## Bước 4: Chạy ứng dụng

### 4.1. Development mode
```bash
pnpm dev
```

Mở http://localhost:3000

### 4.2. Production mode
```bash
pnpm build
pnpm start
```

## Bước 5: Sử dụng Copilot

### 5.1. Bật chế độ AI
- Toggle "Chế độ AI (zai.glm-5)" ở trên panel Copilot
- Khi bật, Copilot sẽ gọi zai.glm-5 model qua AWS Bedrock
- Khi tắt, Copilot sử dụng local engine (không cần AWS)

### 5.2. Command Mode
Thử các câu lệnh:
- "Chia việc cho team IT, giao Minh backend, hạn thứ Sáu"
- "Tạo task review code cho dự án khách hàng A"
- "Chuyển việc này cho người phù hợp hơn"

### 5.3. Executive Copilot
Thử các yêu cầu phân tích:
- "Phân tích tình hình toàn công ty hôm nay"
- "Tổng hợp các việc cần xử lý gấp"
- "Xác định những việc tôi phải tự quyết định"

## Kiểm tra kết nối AWS

### API Health Check
```bash
curl http://localhost:3000/api/copilot
```

Response nếu AWS đã cấu hình:
```json
{
  "status": "ok",
  "model": "d4bc9dc0-fb29-4873-8e46-db4deada437a/zai.glm-5",
  "awsConfigured": true
}
```

Response nếu AWS chưa cấu hình:
```json
{
  "status": "ok",
  "model": "d4bc9dc0-fb29-4873-8e46-db4deada437a/zai.glm-5",
  "awsConfigured": false
}
```

## Troubleshooting

### Lỗi: "AWS credentials not configured"
**Nguyên nhân:** File `.env.local` không tồn tại hoặc thiếu credentials

**Giải pháp:**
1. Kiểm tra file `.env.local` tồn tại
2. Kiểm tra `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` đã điền
3. Restart dev server: `pnpm dev`

### Lỗi: "Bedrock API error: 403"
**Nguyên nhân:** IAM user không có quyền Bedrock

**Giải pháp:**
1. Kiểm tra IAM policy đã gán đúng chưa
2. Đợi 1-2 phút để policy propagate
3. Thử lại

### Lỗi: "Bedrock API error: 404"
**Nguyên nhân:** Model không tồn tại hoặc region không hỗ trợ

**Giải pháp:**
1. Kiểm tra region có hỗ trợ zai.glm-5 không
2. Thử region khác: `us-east-1`, `us-west-2`

### Lỗi: "Bedrock API error: 429"
**Nguyên nhân:** Vượt quá rate limit

**Giải pháp:**
1. Đợi vài giây
2. Giảm tần suất request
3. Liên hệ AWS để tăng quota

### Fallback về local engine
Nếu không có AWS credentials, ứng dụng sẽ tự động sử dụng local engine với mock responses. Bạn vẫn có thể test UI và các tính năng cơ bản.

## Chi phí AWS Bedrock

### Pricing (tham khảo)
- zai.glm-5: ~$0.0008 per 1K input tokens, ~$0.0024 per 1K output tokens
- Chi phí thực tế có thể thay đổi, kiểm tra AWS Bedrock pricing page

### Ước tính chi phí
- 100 requests/ngày với 500 tokens input + 200 tokens output
- ≈ $0.05/ngày ≈ $1.5/tháng

### Monitor chi phí
1. Vào AWS Billing Console
2. Setup Cost Alerts
3. Kiểm tra "Cost Explorer" để xem chi phí Bedrock

## Bảo mật

### Best Practices
1. **Không commit credentials**: File `.env.local` đã được thêm vào `.gitignore`
2. **Rotate keys thường xuyên**: Tạo access keys mới mỗi 90 ngày
3. **Sử dụng IAM roles**: Nếu deploy lên AWS, dùng IAM roles thay vì access keys
4. **Giới hạn quyền**: Chỉ cấp quyền cần thiết (principle of least privilege)

### Nếu credentials bị lộ
1. Vào IAM Console → Users → Security credentials
2. Vô hiệu hóa access key bị lộ
3. Tạo access key mới
4. Cập nhật `.env.local`
5. Restart ứng dụng

## Support

Nếu gặp vấn đề:
1. Kiểm tra AWS Console có lỗi gì không
2. Xem logs trong terminal
3. Thử với local engine trước (tắt AI toggle)
4. Kiểm tra network connection

## Next Steps

Sau khi cấu hình xong:
1. Test với các câu lệnh đơn giản
2. Thử cả Command Mode và Executive Copilot
3. Monitor chi phí trong AWS Console
4. Tùy chỉnh system prompt trong `app/api/copilot/route.ts` nếu cần
