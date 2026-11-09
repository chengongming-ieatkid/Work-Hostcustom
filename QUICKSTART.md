# Quick Start Guide

## Chạy nhanh (không cần AWS)

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Chạy dev server
pnpm dev

# 3. Mở http://localhost:3000
```

Ứng dụng sẽ chạy với mock responses (không cần AWS credentials).

## Kích hoạt AI (với AWS Bedrock)

### Bước 1: Tạo file .env.local

```bash
cp .env.example .env.local
```

### Bước 2: Điền AWS credentials

Mở file `.env.local` và điền:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
```

### Bước 3: Restart dev server

```bash
# Stop server (Ctrl+C)
pnpm dev
```

### Bước 4: Bật AI mode

- Mở ứng dụng
- Toggle "Chế độ AI (zai.glm-5)" trong Copilot panel
- Bắt đầu chat!

## Test API

```bash
# Health check
curl http://localhost:3000/api/copilot

# Test request
curl -X POST http://localhost:3000/api/copilot \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Phân tích tình hình"}],"context":{"mode":"executive"}}'
```

## Troubleshooting

| Lỗi | Giải pháp |
|-----|-----------|
| AWS credentials not configured | Kiểm tra file `.env.local` |
| Bedrock API error: 403 | Kiểm tra IAM permissions |
| Model not found | Thử region khác (us-east-1) |

Xem thêm: [SETUP.md](./SETUP.md)
