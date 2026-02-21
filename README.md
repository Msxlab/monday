# Designer Project Tracker

Tasarim ekibinin proje takibini, performans analizini ve is yuku yonetimini tek bir merkezi sistemden yoneten full-stack web uygulamasi.

## Tech Stack

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** MySQL 8.0
- **Auth:** JWT + Refresh Token (httpOnly cookie)
- **Validation:** Zod
- **Logging:** Winston

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod

## Kurulum

### 1. Backend

```bash
cd backend
cp .env.example .env
# .env dosyasini duzenleyin (DATABASE_URL, JWT secrets vb.)

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend `http://localhost:5000` adresinde calisir.

### 2. Seed (Super Admin olusturma)

```bash
cd backend
npx ts-node-dev src/seed.ts
```

Varsayilan giris bilgileri:
- **Email:** admin@designertracker.com
- **Sifre:** Admin@123456

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde calisir.

## API Endpoints

### Auth
- `POST /api/auth/login` — Giris
- `POST /api/auth/refresh` — Token yenileme
- `POST /api/auth/logout` — Cikis
- `GET /api/auth/me` — Mevcut kullanici bilgisi
- `POST /api/auth/change-password` — Sifre degistirme

### Users
- `GET /api/users` — Kullanici listesi (admin)
- `POST /api/users` — Kullanici olusturma (admin)
- `GET /api/users/:id` — Kullanici detay (admin)
- `PATCH /api/users/:id` — Kullanici guncelleme (admin)
- `POST /api/users/:id/reset-password` — Sifre sifirlama (admin)
- `GET /api/users/designers` — Tasarimci listesi

### Projects
- `GET /api/projects` — Proje listesi
- `POST /api/projects` — Proje olusturma (admin)
- `GET /api/projects/:id` — Proje detay
- `PATCH /api/projects/:id` — Proje guncelleme
- `PATCH /api/projects/:id/status` — Durum degistirme
- `GET /api/projects/stats` — Proje istatistikleri (admin)

### Health
- `GET /api/health` — API durum kontrolu

## Kullanici Rolleri

| Rol | Aciklama |
|-----|----------|
| super_admin | Tum sisteme tam erisim |
| admin | Yonetici paneli, proje atama, raporlar |
| senior_designer | Genis gorunum, sinirli duzenleme |
| designer | Sadece kendi projeleri |
| production | Sadece uretime gecmis projeler |

## Proje Durumu Akisi

```
new -> designing -> review -> approved -> in_production -> done
            |
         revision
            |
         designing (tekrar)
```

## Klasor Yapisi

```
monday/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── __tests__/
│   │   ├── seed.ts
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── admin/page.tsx
│   │   │   ├── projects/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── app-shell.tsx
│   │   │   │   ├── auth-guard.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── topbar.tsx
│   │   │   │   └── api-status-card.tsx
│   │   │   └── ui/
│   │   ├── config/routes.ts
│   │   └── lib/utils.ts
│   ├── components.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── .windsurfrules
└── DESIGNER_TRACKER_SYSTEM_PLAN.md
```
