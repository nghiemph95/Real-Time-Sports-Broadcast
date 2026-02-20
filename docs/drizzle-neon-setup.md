# Neon + Drizzle ORM (JavaScript)

Dự án dùng **Neon WebSocket** driver: phù hợp server Node chạy lâu (Express), kết nối persistent.

## Đã cấu hình

- **Driver:** Neon WebSocket (`@neondatabase/serverless` + `ws`)
- **Schema:** `src/schema.js` (bảng `demo_users`)
- **DB client:** `src/db.js` (export `db`, `pool`)
- **CRUD demo:** `src/crud-demo.js`

## Các bước tiếp theo

1. **Tạo file `.env`** (đã có `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Sửa `.env`, điền **connection string** từ Neon Console (Project → Dashboard → Connect).

2. **Generate migration:**
   ```bash
   npm run db:generate
   ```

3. **Chạy migration lên Neon:**
   ```bash
   npm run db:migrate
   ```

4. **Chạy CRUD demo:**
   ```bash
   npm run demo
   ```

5. **(Tùy chọn)** Mở Drizzle Studio:
   ```bash
   npm run db:studio
   ```

## Scripts

| Script        | Mô tả                    |
|---------------|---------------------------|
| `npm run db:generate` | Tạo file migration từ schema |
| `npm run db:migrate`  | Áp dụng migration lên DB     |
| `npm run db:studio`   | Mở Drizzle Studio            |
| `npm run demo`        | Chạy CRUD demo (Create, Read, Update, Delete) |

## Đổi driver (nếu cần)

- **Neon Serverless (HTTP):** Vercel Edge / Lambda, mỗi query là một `fetch`.
- **Neon WebSocket:** Server Node chạy lâu (đang dùng).
- **node-postgres (`pg`):** Kết nối Postgres truyền thống.

Sửa `src/db.js` và cài đúng gói theo [Drizzle Neon docs](https://orm.drizzle.team/docs/get-started-postgresql#neon).
