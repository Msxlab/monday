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

### Frontend (Durum: planned / in-progress)
> Bu repoda su anda calisir bir frontend implementasyonu yoktur. `frontend/` klasoru mevcut ancak kaynak kod bulunmamaktadir.

Planlanan teknoloji secimleri:
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
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend `http://localhost:5000` adresinde calisir.

### 2. Seed (Super Admin olusturma)

```bash
cd backend
npx ts-node-dev --transpile-only src/seed.ts
```

Varsayilan giris bilgileri:
- **Email:** admin@designertracker.com
- **Sifre:** Admin@123456

### 3. Frontend

Frontend uygulamasi henuz bu repoda yoktur (planned / in-progress). Bu nedenle calistirilabilir bir frontend kurulum komutu bulunmamaktadir.

## Mevcut Endpoint Listesi (`/api` alti)

`backend/src/routes/index.ts` ile birebir uyumlu route prefix listesi:

- `/api/auth`
- `/api/users`
- `/api/projects`
- `/api/leaves`
- `/api/notifications`
- `/api/production-orders`
- `/api/analytics`
- `/api/settings`
- `/api/audit-logs`
- `/api/finance`
- `/api/daily-logs`
- `/api/comments`
- `/api/uploads`
- `/api/user-permissions`
- `/api/role-upgrades`
- `/api/monday`
- `/api/push`
- `/api/tags`
- `/api/subtasks`
- `/api/health`

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

## Eksik Moduller / Roadmap

- **UI (Frontend Uygulamasi):** Login, dashboard, rol bazli ekranlar ve ortak component sistemi implementasyonu.
- **Multi-tenant:** Tenant izolasyonu, tenant bazli yetkilendirme ve tenant onboarding akisi.
- **AI Assistant:** Gorev/yorum ozetleme, onceliklendirme yardimi ve operasyonel copilot senaryolari.
- **Theme System:** Acik/koyu tema, brand bazli tema tokenlari ve merkezi tema konfigrasyonu.

## Klasor Yapisi

```
monday/
├── backend/
│   ├── prisma/schema.prisma       # Veritabani semasi
│   ├── src/
│   │   ├── controllers/           # Route handler'lar
│   │   ├── services/              # Is mantigi
│   │   ├── middleware/            # Auth, permission, validation
│   │   ├── routes/                # Express router
│   │   ├── utils/                 # Logger, Prisma, errors, permissions, audit
│   │   ├── types/                 # TypeScript tipleri
│   │   ├── seed.ts                # DB seed (super admin)
│   │   └── index.ts               # Entry point
│   ├── .env                       # Cevre degiskenleri
│   └── package.json
├── frontend/                      # Planned/in-progress (su anda bos)
├── .windsurfrules                 # Gelistirme kurallari
└── DESIGNER_TRACKER_SYSTEM_PLAN.md
```

## Deploy (Backend)

```bash
cd backend
npm install
npm run build
npm run prisma:deploy
npm run start
```
