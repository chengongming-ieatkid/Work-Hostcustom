# TVQ Work Copilot

**The Self-Adaptive AI Workspace**

*Work smarter. Live healthier. Grow together.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org) [![Status](https://img.shields.io/badge/Status-Ho%E1%BA%A1t%20%C4%91%E1%BB%99ng%20th%E1%BA%ADt-brightgreen)](#)

TVQ Work Copilot là nền tảng quản lý và điều hành công việc thế hệ mới, phát triển theo định hướng **AI-native Workspace**. Người dùng chỉ cần nói điều mình muốn — AI hiểu yêu cầu, tạo hoặc điều chỉnh giao diện, tổ chức dữ liệu và thực hiện những công việc được cấp quyền.

> **Triết lý sản phẩm:** Technology serves people. Work should fit life, not the other way around.

---

## Bốn trụ cột sản phẩm

| Trụ cột | Vai trò |
|---|---|
| **People** | Hiểu con người — hồ sơ, vai trò, kỹ năng, khối lượng công việc, tình trạng phối hợp |
| **Work in Progress** | Hiểu công việc — projects, tasks, Kanban, timeline, deadline, điểm nghẽn |
| **Team Pulse** | Hiểu nhịp độ tổ chức — workload, capacity, project health, phát hiện quá tải |
| **AI Copilot** | Hỗ trợ và thực thi — natural language command, phân tích, thực thi trực tiếp có kiểm soát |

## Điểm đột phá: Dynamic UI Manipulation

TVQ Work Copilot không phải một chatbot nằm cạnh phần mềm quản lý. AI có khả năng **trực tiếp thay đổi chính môi trường làm việc**:

- Tạo dashboard, biểu đồ, bảng theo yêu cầu bằng ngôn ngữ tự nhiên
- Đổi giao diện (theme, accent, mật độ, layout) ngay trong hội thoại
- Giao việc, tạo dự án, gán người — thực thi trực tiếp (L1/L2), thao tác nhạy cảm chờ duyệt
- AI tạo các hành động có cấu trúc qua **JSON Schema plan** — frontend render trực tiếp, không cho phép model thực thi HTML/JS tùy ý

## Phân quyền & Kiểm soát con người

| Cấp độ | Quyền |
|---|---|
| **L1** | Xem dữ liệu, phân tích, đề xuất |
| **L2** | Tạo và chỉnh sửa công việc trong phạm vi được cấp |
| **L3** | Thực hiện hành động quản trị được ủy quyền |

Nguyên tắc bắt buộc: kiểm tra quyền trước mỗi hành động · xác nhận trước thao tác quan trọng · lưu lại người yêu cầu và hành động AI thực hiện · audit log đầy đủ · tôn trọng quyền riêng tư và thời gian nghỉ.

**Bảo mật dữ liệu:** dữ liệu nhạy cảm (lương, tài khoản ngân hàng) được redact **server-side** theo vai trò — member không thể xem hay lấy dữ liệu lương của người khác qua API, kể cả qua Copilot context.

## Design System — Paper · Stone · Sage · Forest · Ink

Bản sắc thị giác tự nhiên, ấm áp, con người-centered:

- **Paper** — nền sáng mặc định, warm neutral
- **Stone** — chữ phụ, muted
- **Sage** — accent mặc định (xanh xám dịu)
- **Forest** — màu hành động chính
- **Ink** — chữ chính

Nguyên tắc: không neon, không gradient tím-xanh, không robot mascot, không chatbot chiếm toàn màn hình, không quá nhiều card/shadow/glassmorphism. **AI xuất hiện đúng lúc, đúng ngữ cảnh.** Hỗ trợ light/dark theme, 4 accent (sage/forest/amber/rose), 3 mật độ, và design tokens tự do (hex, radius, font scale, custom CSS) cho người dùng nâng cao.

## Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│  TVQ Workspace — Next.js · Responsive Desktop/Mobile│
├─────────────────────────────────────────────────────┤
│  AI Provider Layer (configurable)                   │
│  AWS Bedrock (zai.glm-5) · Muse Spark · Custom      │
├─────────────────────────────────────────────────────┤
│  Copilot Engine — Intent · Plan · Execute · Audit   │
├─────────────────────────────────────────────────────┤
│  People Intelligence · Team Pulse · Work Management │
├─────────────────────────────────────────────────────┤
│  Enterprise Data & Security Layer                   │
│  SQLite · RBAC (admin/manager/member) · Audit Logs  │
└─────────────────────────────────────────────────────┘
```

## Cài đặt

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Cấu hình AI Provider (2 cách)

**Cách A — trong app (khuyến nghị, chỉ Admin):**
Mở app → Cài đặt → Cấu hình AI Provider → chọn provider (Bedrock / Muse Spark / Custom), điền Base URL, API Key, tên Model → Lưu. Đổi provider bất cứ lúc nào, không cần restart.

**Cách B — qua file `.env.local`:**

```env
AI_PROVIDER=bedrock
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
# Legacy Bedrock:
AWS_REGION=us-east-1
AWS_BEARER_KEY=ABSK...your_key_here
```

### 3. Chạy ứng dụng

```bash
pnpm dev
```

Mở http://localhost:3000

Tài khoản mặc định: `admin@tvq.local / admin123`, `manager@tvq.local / manager123`, `member@tvq.local / member123`.

## API Endpoints

### POST /api/copilot

Gọi AI provider đã cấu hình với messages và context (context được redact theo vai trò trước khi gửi).

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Phân tích tình hình"}
  ],
  "context": {
    "mode": "executive"
  }
}
```

**Response:**
```json
{
  "success": true,
  "content": "Phân tích tình hình toàn công ty...",
  "model": "muse-spark-1.3-contributor",
  "provider": "muse-spark",
  "timestamp": "2026-10-22T10:29:42.574Z"
}
```

### GET /api/copilot

Kiểm tra trạng thái provider hiện tại (provider, model, đã cấu hình key hay chưa).

### GET / PUT /api/ai-provider (chỉ Admin)

Xem / lưu cấu hình AI provider (provider, baseUrl, model; key được mask, để trống để giữ nguyên).

## Cấu trúc dự án

```
├── app/
│   ├── api/copilot/route.ts      # API route gọi AI provider (redact context theo role)
│   ├── api/ai-provider/route.ts  # API lưu cấu hình provider (admin)
│   ├── globals.css               # Design system Paper/Stone/Sage/Forest/Ink
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Shell + hero + views
├── components/
│   ├── ai-provider-panel.tsx     # Panel cấu hình provider
│   ├── data-manager.tsx          # Theme/accent/density/design tokens
│   ├── login-screen.tsx          # Đăng nhập
│   ├── sidebar.tsx               # Điều hướng 4 trụ cột
│   ├── views/                    # My Work, Projects, Members, Team Pulse...
│   └── copilot/
│       ├── copilot-panel.tsx     # Copilot UI panel
│       ├── plan-card.tsx         # Plan approval card
│       └── analysis-card.tsx     # Analysis display card
├── lib/
│   ├── ai-provider.ts           # Resolve provider + gọi chat/completions
│   ├── copilot-ai.ts            # AI integration logic
│   ├── copilot-engine.ts        # Local engine (fallback)
│   ├── db.ts                    # SQLite (node:sqlite) + redactStateForRole
│   ├── store.tsx                # State management
│   └── types.ts                 # TypeScript types
└── .env.local                   # AI credentials (không commit)
```

## AI Provider

Mặc định: **AWS Bedrock** (`zai.glm-5`) qua endpoint `https://bedrock-mantle.{region}.api.aws/v1/chat/completions` với ABSK key. Đổi sang **Muse Spark** hoặc endpoint **Custom** tương thích OpenAI chat/completions bất cứ lúc nào trong Cài đặt — không cần sửa code hay restart server.

## Roadmap

| Giai đoạn | Hạng mục | Ưu tiên |
|---|---|---|
| Phase 1 | Core Workspace, People, Projects, Tasks | ✅ Hoàn thành |
| Phase 2 | AI Provider integration (Bedrock/Muse Spark/Custom) | ✅ Hoàn thành |
| Phase 3 | Dynamic UI Engine | ✅ Hoàn thành |
| Phase 4 | AI Workflow Execution (L1/L2/L3) | ✅ Hoàn thành |
| Phase 5 | Team Pulse & Executive Intelligence | ✅ Hoàn thành |
| Phase 6 | Mobile App / Responsive Experience | 🔄 Đang phát triển |
| Phase 7 | Lifestyle, Workation, Retreat features | 📋 Mở rộng |

## Định vị

**Primary Theme:** Push the Frontier · **Secondary:** Build for Your World

TVQ Work Copilot không chỉ cạnh tranh về tính năng quản lý công việc — nó tạo ra một định nghĩa mới: **một hệ điều hành cho phong cách làm việc hiện đại** — nơi AI thích nghi với con người, con người kết nối với nhau và công việc không còn giới hạn trong một văn phòng.

---

*Private project for TVQ Work Copilot.*
