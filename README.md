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

```bash
cd frontend
npm install

# Opsiyonel: API adresini belirtmek icin
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

npm run dev
```

Frontend varsayilan olarak `http://localhost:3000` adresinde calisir.

Production build adimlari:

```bash
cd frontend
npm install
npm run build
npm run start
```

## Frontend Route Yapisi ve Modul Kapsami

Frontend App Router yapi olarak 3 ana role-bazli panel uzerinden calisir:

### `/admin`
- Dashboard: `/admin`
- Proje yonetimi: `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]`, `/admin/projects/[id]/edit`
- Proje gorunumleri: `/admin/projects/kanban`, `/admin/projects/calendar`, `/admin/projects/gantt`
- Tasarimci yonetimi: `/admin/designers`, `/admin/designers/[id]`
- Operasyon modulleri: `/admin/analytics`, `/admin/production`, `/admin/leaves`, `/admin/finance`, `/admin/users`, `/admin/audit-log`, `/admin/role-upgrades`
- Ayarlar: `/admin/settings` ve altinda `monday`, `notifications`, `permissions`, `schedule`, `security`, `user-permissions`

### `/designer`
- Dashboard: `/designer`
- Projeler: `/designer/projects`, `/designer/projects/[id]`
- Kisisel operasyonlar: `/designer/daily-logs`, `/designer/performance`, `/designer/leave`, `/designer/role-upgrade`

### `/production`
- Dashboard: `/production`
- Siparis yonetimi: `/production/orders`

### Ortak ekranlar
- Giris: `/`
- Bildirimler: `/notifications`
- Profil: `/profile`

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

## Known Gaps

- **Backend API var, frontend ekrani henuz yok:** `tags`, `subtasks`, `comments`, `uploads`, `push`, `health` endpointleri icin frontend tarafinda dogrudan bir modul/sayfa tanimli degil.
- **Kapsamli rol/izin yonetimi eksigi:** `/api/user-permissions` ve detayli yetki konfigrasyonu backend'de mevcut olsa da, frontend'te tum senaryolari kapsayan merkezi bir izin yonetim akisi tamamlanmadi.
- **AI Assistant urunlesmesi:** Kod tabaninda AI ile ilgili componentler bulunsa da bu ozelligin uctan uca, urun seviyesinde aktif bir akisa baglandigi dokumante edilmis degil.
- **Multi-tenant mimari:** Tenant izolasyonu, tenant bazli onboarding ve tenant-level policy yonetimi henuz uygulanmamis durumda.

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

## Deploy (Backend)

```bash
cd backend
npm install
npm run build
npm run prisma:deploy
npm run start
```
