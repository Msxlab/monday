# 🎨 DESIGNER PROJECT TRACKER — TAM SİSTEM PLANLAMA DOKÜMANI

> **Platform:** WHM/cPanel Shared/VPS Hosting  
> **IDE:** Windsurf + Claude Opus 4.6  
> **Tip:** Full-Stack Web Application (PWA)  
> **Sürüm:** v1.0 — Planlama Dökümanı  
> **Tarih:** Şubat 2026

---

## 📋 İÇİNDEKİLER

1. [Sistem Genel Bakış](#1-sistem-genel-bakış)
2. [Tech Stack](#2-tech-stack)
3. [Kullanıcı Rolleri & Yetki Matrisi](#3-kullanıcı-rolleri--yetki-matrisi)
4. [Field-Level Permission Sistemi](#4-field-level-permission-sistemi)
5. [Veritabanı Mimarisi](#5-veritabanı-mimarisi)
6. [Sayfa & Ekran Yapısı](#6-sayfa--ekran-yapısı)
7. [Admin Command Center](#7-admin-command-center)
8. [Tasarımcı Paneli](#8-tasarımcı-paneli)
9. [Üretim Ekibi Paneli](#9-üretim-ekibi-paneli)
10. [Proje Yönetimi & Akışı](#10-proje-yönetimi--akışı)
11. [Revizyon Takip Sistemi](#11-revizyon-takip-sistemi)
12. [Performans & Analitik Sistemi](#12-performans--analitik-sistemi)
13. [Net Çalışma Günü Hesaplama Motoru](#13-net-çalışma-günü-hesaplama-motoru)
14. [Bildirim Sistemi](#14-bildirim-sistemi)
15. [Monday.com Entegrasyonu](#15-mondaycom-entegrasyonu)
16. [Place Order Onay Akışı](#16-place-order-onay-akışı)
17. [Settings Modülü (Admin)](#17-settings-modülü-admin)
18. [Güvenlik Standartları](#18-güvenlik-standartları)
19. [Arayüz & Tasarım Sistemi](#19-arayüz--tasarım-sistemi)
20. [WHM/cPanel Deployment](#20-whmcpanel-deployment)
21. [Geliştirme Yol Haritası (Faz Planı)](#21-geliştirme-yol-haritası-faz-planı)
22. [Windsurf / Cursor Kuralları](#22-windsurf--cursor-kuralları)

---

## 1. SİSTEM GENEL BAKIŞ

### Amaç
Tasarım ekibinin proje takibini, performans analizini ve iş yükü yönetimini tek bir merkezi sistemden yönetmek. Monday.com veri kaynağı olarak çalışmaya devam eder ancak tüm operasyonel kontrol bu sistem üzerinden yürütülür.

### Temel Prensipler
- **Tek kaynak (Source of Truth):** Bu sistem. Monday.com ayna.
- **Field-Level Security:** Her alan için ayrı yetki tanımı.
- **Adil Performans:** İzin/tatil hesaplanmış net çalışma gününe göre ölçüm.
- **Şeffaflık:** Tasarımcı kendi verisini görür, başkasını göremez.
- **Admin Kontrolü:** Her ayar, her kural, her bildirim admin tarafından özelleştirilir.
- **Mobile First:** PWA — telefona uygulama gibi yüklenebilir.

### Kullanıcı Tipleri
| Rol | Açıklama |
|-----|----------|
| Super Admin | Tüm sisteme tam erişim, diğer adminleri yönetir |
| Admin | Yönetici paneli, proje atama, raporlar, settings |
| Senior Designer | Geniş görünüm, sınırlı düzenleme |
| Designer | Sadece kendi projeleri |
| Production | Sadece üretime geçmiş projeler |

---

## 2. TECH STACK

### Frontend
```
Framework     : Next.js 14 (App Router)
UI Library    : Tailwind CSS + shadcn/ui
State         : Zustand
Data Fetching : React Query (TanStack Query)
Charts        : Recharts
Drag & Drop   : @dnd-kit/core
PWA           : next-pwa
Icons         : Lucide React
Date          : date-fns
Forms         : React Hook Form + Zod
```

### Backend
```
Runtime       : Node.js 20 LTS
Framework     : Express.js
ORM           : Prisma
Database      : MySQL 8.0 (cPanel uyumlu)
Auth          : JWT + Refresh Token (httpOnly cookie)
File Upload   : Multer + cPanel File System
Cron Jobs     : node-cron
Email         : Nodemailer (cPanel SMTP)
Validation    : Zod
Logging       : Winston
```

### cPanel / WHM Uyumluluk
```
Node.js       : cPanel Node.js Selector (v20)
Database      : MySQL (cPanel MySQL Manager)
SSL           : Let's Encrypt (AutoSSL)
Domain        : Subdomain veya ana domain
PM2           : Process Manager (cPanel Terminal)
Cron          : cPanel Cron Jobs + node-cron
```

---

## 3. KULLANICI ROLLERI & YETKİ MATRİSİ

### Rol Hiyerarşisi
```
Super Admin
    └── Admin
         ├── Senior Designer
         ├── Designer
         └── Production
```

### Genel Yetki Matrisi

| Özellik | Super Admin | Admin | Senior Designer | Designer | Production |
|---------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| Tüm projeleri görme | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Kendi projelerini görme | ✅ | ✅ | ✅ | ✅ | ✅ |
| Proje oluşturma | ✅ | ✅ | ❌ | ❌ | ❌ |
| Proje atama | ✅ | ✅ | ❌ | ❌ | ❌ |
| Proje durumu güncelleme | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| Deadline değiştirme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Finansal verileri görme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Müşteri bilgisi görme | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Performans raporları | ✅ | ✅ | Sadece kendisi | Sadece kendisi | ❌ |
| Settings yönetimi | ✅ | ⚙️ | ❌ | ❌ | ❌ |
| Kullanıcı yönetimi | ✅ | ⚙️ | ❌ | ❌ | ❌ |
| Monday sync yönetimi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Place order onaylama | ✅ | ✅ | ❌ | ❌ | ✅ |
| Audit log görme | ✅ | ✅ | ❌ | ❌ | ❌ |
| İzin yönetimi | ✅ | ✅ | ❌ | ❌ | ❌ |

> ⚙️ = Admin tarafından açılıp kapatılabilir

### Super Admin vs Admin Farkı
- Super Admin, diğer admin hesaplarını oluşturur ve siler
- Super Admin, hangi admin'in hangi ayarlara erişeceğini belirler
- Super Admin silinip inonaktif yapılamaz
- Super Admin rolü devir edilebilir (tek kişi olma zorunluluğu yok)

---

## 4. FIELD-LEVEL PERMISSION SİSTEMİ

Her proje kartındaki her alan için bağımsız görünürlük ve düzenleme yetkisi tanımlanır.

### Alan Kategorileri

#### 📁 Proje Temel Bilgileri
| Alan | Super Admin | Admin | Senior Designer | Designer | Production |
|------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| NJ Numarası | Düzenle | Düzenle | Görür | Görür | Görür |
| Proje Adı | Düzenle | Düzenle | Görür | Görür | Görür |
| Proje Tipi | Düzenle | Düzenle | Görür | Görür | Görür |
| Atanan Tasarımcı | Düzenle | Düzenle | Görür | Görür | Görür |
| Başlangıç Tarihi | Düzenle | Düzenle | Görür | Görür | Görür |
| Deadline | Düzenle | Düzenle | Görür | Görür | Görür |
| Öncelik | Düzenle | Düzenle | Görür | Görür | Görür |
| Durum | Düzenle | Düzenle | Düzenle | Düzenle | Görür |

#### 💰 Finansal Alanlar (Tasarımcılara Gizli)
| Alan | Super Admin | Admin | Senior Designer | Designer | Production |
|------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| Proje Fiyatı | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Müşteri Bütçesi | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Kar Marjı | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Ödeme Durumu | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Fatura Bilgileri | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |

#### 👤 Müşteri Bilgileri
| Alan | Super Admin | Admin | Senior Designer | Designer | Production |
|------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| Müşteri Adı | Düzenle | Düzenle | ⚙️ | 🔒 | 🔒 |
| İletişim Bilgileri | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Şirket Detayları | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |

#### 🏭 Üretim Bilgileri
| Alan | Super Admin | Admin | Senior Designer | Designer | Production |
|------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| Tedarikçi Adı | Düzenle | Düzenle | 🔒 | 🔒 | Görür |
| Sipariş Fiyatı | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Geliş Tarihi | Düzenle | Düzenle | 🔒 | 🔒 | Düzenle |
| Ülke (Çin/Hindistan) | Düzenle | Düzenle | 🔒 | 🔒 | Görür |

#### 📝 Notlar
| Alan | Super Admin | Admin | Senior Designer | Designer | Production |
|------|:-----------:|:-----:|:---------------:|:--------:|:----------:|
| Proje Notu (Genel) | Düzenle | Düzenle | Görür | Görür | Görür |
| Admin İç Notu | Düzenle | Düzenle | 🔒 | 🔒 | 🔒 |
| Günlük Log | Düzenle | Düzenle | Kendi | Kendi | 🔒 |

> 🔒 = Gizli (API seviyesinde bloklanır, sadece UI'da değil)  
> ⚙️ = Admin'in Settings'ten açıp kapatabileceği alan

### Güvenlik Notu
Field-level permission sadece UI'da uygulanmaz. Backend API her response'ta kullanıcı rolünü kontrol eder ve yetkisiz alanları response'tan çıkarır. Frontend'de "gizle" mantığı yoktur — veri hiç gelmez.

---

## 5. VERİTABANI MİMARİSİ

### Ana Tablolar

```sql
-- Kullanıcılar
users
  id, email, password_hash, first_name, last_name,
  role (super_admin|admin|senior_designer|designer|production),
  country_code, timezone, avatar_url, is_active,
  created_at, updated_at, last_login_at

-- Projeler
projects
  id, nj_number (unique), title, project_type,
  assigned_designer_id (FK: users),
  priority (normal|urgent|critical),
  status (new|designing|revision|review|approved|in_production|done|cancelled),
  start_date, deadline, estimated_finish_date, actual_finish_date,
  country_target (china|india|both),
  monday_item_id, monday_board_id,
  created_by (FK: users), created_at, updated_at

-- Finansal Veriler (Ayrı Tablo - Ekstra Güvenlik)
project_financials
  id, project_id (FK: projects),
  client_budget, project_price, cost_price,
  profit_margin, payment_status, invoice_details,
  created_at, updated_at

-- Müşteri Bilgileri (Ayrı Tablo)
project_clients
  id, project_id (FK: projects),
  client_name, contact_info, company_name, company_details,
  created_at, updated_at

-- Revizyon Geçmişi
project_revisions
  id, project_id (FK: projects),
  revision_number, requested_by (FK: users),
  revision_type (client_change|internal_fix|technical_error),
  description, notes,
  started_at, completed_at, created_at

-- Proje Durumu Geçmişi
project_status_history
  id, project_id (FK: projects),
  from_status, to_status,
  changed_by (FK: users), reason, notes,
  changed_at

-- Günlük Log (Check-in/Check-out)
daily_logs
  id, user_id (FK: users), project_id (FK: projects),
  log_date, log_type (checkin|checkout|note|update),
  content, created_at

-- İzin Kayıtları
leaves
  id, user_id (FK: users),
  leave_type (annual|sick|excuse|remote),
  start_date, end_date, is_half_day, half_day_period (am|pm),
  status (pending|approved|rejected),
  approved_by (FK: users), notes,
  created_at, updated_at

-- Resmi Tatiller
public_holidays
  id, country_code, holiday_name, holiday_date,
  is_recurring, created_at

-- Çalışma Takvimi
work_schedules
  id, user_id (FK: users, nullable - null ise global),
  monday, tuesday, wednesday, thursday, friday, saturday, sunday,
  work_start_time, work_end_time, created_at

-- Bildirim Ayarları (Admin Konfigürasyonu)
notification_rules
  id, rule_name, rule_type, trigger_condition,
  threshold_value, threshold_unit (days|hours|count|percent),
  target_roles, is_active,
  created_by (FK: users), created_at, updated_at

-- Bildirimler
notifications
  id, user_id (FK: users), project_id (FK: projects, nullable),
  type, title, message, is_read, read_at,
  action_url, created_at

-- Place Order Akışı
production_orders
  id, project_id (FK: projects),
  country (china|india),
  order_status (pending_approval|approved|ordered|shipped|delivered),
  initiated_by (FK: users), approved_by (FK: users),
  order_date, estimated_arrival, actual_arrival,
  tracking_info, notes, created_at, updated_at

-- Audit Log
audit_logs
  id, user_id (FK: users), action,
  resource_type, resource_id,
  old_value (JSON), new_value (JSON),
  ip_address, user_agent, created_at

-- Monday Sync Log
monday_sync_logs
  id, project_id (FK: projects), monday_item_id,
  sync_direction (push|pull), sync_status (success|failed),
  payload (JSON), error_message, created_at

-- Permission Overrides (Field-Level)
permission_overrides
  id, role, field_name, resource_type,
  can_view, can_edit,
  set_by (FK: users), created_at, updated_at
```

---

## 6. SAYFA & EKRAN YAPISI

### URL Yapısı
```
/ ——————————————————————— Login
/dashboard ——————————————— Ana Dashboard (role'e göre yönlendirir)

/admin ——————————————————— Admin Command Center
/admin/projects ——————————— Tüm Projeler
/admin/projects/new ————————— Yeni Proje Oluştur
/admin/projects/:id ————————— Proje Detay (Admin görünümü)
/admin/designers ——————————— Tasarımcı Yönetimi
/admin/designers/:id ———————— Tasarımcı Profili & Performans
/admin/analytics ——————————— Analitik Dashboard
/admin/production ——————————— Üretim Yönetimi
/admin/leaves ——————————————— İzin Yönetimi
/admin/users ——————————————— Kullanıcı Yönetimi
/admin/settings ——————————— Sistem Ayarları
/admin/settings/permissions ——— Permission Yönetimi
/admin/settings/notifications ——— Bildirim Kuralları
/admin/settings/monday ————————— Monday Entegrasyon
/admin/settings/schedule ———————— Çalışma Takvimi
/admin/audit-log ——————————— Audit Log

/designer ———————————————— Designer Dashboard
/designer/projects ——————————— Kendi Projeleri
/designer/projects/:id ————————— Proje Detay (Designer görünümü)
/designer/performance ——————————— Kendi Performansı
/designer/leave ——————————————— İzin Talebi

/production ——————————————— Production Dashboard
/production/orders ——————————— Sipariş Listesi
/production/orders/:id ————————— Sipariş Detay

/notifications ——————————————— Tüm Bildirimler
/profile ——————————————————— Profil & Şifre
```

---

## 7. ADMİN COMMAND CENTER

### 7.1 Ana Dashboard (`/admin`)

**Üst Metrik Kartları (Tıklanabilir)**
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Bugün Teslim   │ │  Geciken Proje  │ │  Onay Bekleyen  │ │  Üretim Bekler  │
│      3          │ │      2 🔴       │ │       5         │ │       4         │
│  [Görüntüle]    │ │  [Görüntüle]    │ │  [Görüntüle]    │ │  [Görüntüle]    │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Tasarımcı Kapasitesi Şeridi**
Her tasarımcı için:
- Avatar + İsim
- Aktif proje sayısı
- Kapasite doluluk çubuğu (yeşil/sarı/kırmızı)
- "Bugün ne üzerinde çalışıyor" chip'leri
- İzinde mi? (Badge göster)
- Tıklayınca tasarımcı detayına gider

**Bugünkü Aktivite Akışı**
Son 4 saatteki tüm proje güncellemeleri, check-in'ler, tamamlamalar. Canlı güncellenir.

**Uyarı Paneli (Sağ sidebar)**
- Geciken projeler listesi
- Dengesiz iş yükü uyarıları
- Yaklaşan deadline'lar (24-48-72 saat)
- Revizyon patlaması uyarıları
- Onay bekleyenler

### 7.2 Proje Listesi (`/admin/projects`)

**Görünüm Seçenekleri**
- Tablo görünümü (Excel benzeri)
- Kart görünümü (Kanban)
- Zaman çizelgesi (Gantt benzeri)
- Tasarımcıya göre gruplu görünüm

**Filtreler (Çoklu Seçim)**
- Tasarımcı
- Durum
- Öncelik
- Tarih aralığı
- Proje tipi
- Gecikme durumu
- Ülke (Çin/Hindistan)
- Revizyon sayısı

**Hızlı Arama**
NJ numarası, proje adı, müşteri adı (admin için) ile anlık arama

**Toplu İşlemler**
- Seçilenleri başka tasarımcıya devret
- Seçilenlerin önceliğini değiştir
- Seçilenleri export et

**Tablo Sütunları (Özelleştirilebilir)**
NJ No | Tasarımcı | Durum | Öncelik | Başlangıç | Deadline | Net Gün | Revizyon | Eylemler

### 7.3 Proje Detay Kartı (`/admin/projects/:id`)

**Sol Panel — Zaman Çizelgesi**
```
[Başlangıç] ——→ [Designing] ——→ [Revision x2] ——→ [Review] ——→ [Done]
 1 Şub            1-5 Şub         6-10 Şub          11 Şub      12 Şub
 Net: 4 gün       Net: 3 gün      Net: 1 gün
```

**Orta Panel — Proje Bilgileri**
- Tüm alanlar (role'e göre görünür/gizli)
- Durum değiştirme butonu
- Tasarımcı değiştirme butonu
- Deadline güncelleme
- Öncelik değiştirme
- Notlar ekleme

**Sağ Panel — Finansal (Sadece Admin)**
- Proje fiyatı
- Maliyet
- Kar marjı
- Ödeme durumu

**Alt Panel — Aktivite Logu**
Tüm değişiklikler kronolojik sırayla. Kim, ne zaman, ne değiştirdi.

### 7.4 Zaman Çizelgesi Görünümü (Gantt)

- Yatay eksen: Tarihler
- Dikey eksen: Tasarımcılar
- Her proje bir çubuk (rengi önceliğe göre)
- Deadline çakışmaları görsel olarak belli
- Sürükle-bırak ile deadline değiştirilir
- Zoom: Günlük / Haftalık / Aylık

### 7.5 Karşılaştırma Görünümü

İki veya daha fazla tasarımcıyı yan yana:
- Aktif proje sayısı
- Ortalama teslim süresi
- Revizyon oranı
- Deadline başarı yüzdesi
- Bu ay tamamlanan projeler
- Kapasite doluluk oranı

### 7.6 Hızlı Arama (Global)

Klavye kısayolu: `Ctrl + K` / `Cmd + K`
- NJ numarası ile anında proje
- Tasarımcı adı ile kişi
- Tarih ile filtreleme
- Durum ile filtreleme

---

## 8. TASARIMCI PANELİ

### 8.1 Designer Dashboard (`/designer`)

**Hoşgeldin Kartı**
"İyi günler, [İsim]! Bugün [Tarih]. Aktif projen: 4. Bugün bitenler: 1."

**Aktif Projelerim**
Her proje kartında:
- NJ Numarası + Proje Adı
- Durum (renkli badge)
- Deadline (kaç gün kaldı)
- Revizyon sayısı
- Son güncelleme
- [Güncelle] butonu

**Günlük Check-in**
Her sabah küçük form:
- "Bugün ne üzerinde çalışacaksın?" (çoklu proje seçimi)
- Kısa not alanı (opsiyonel)

Her akşam otomatik hatırlatma:
- "Bugünkü çalışmanı loglamayı unutma"

**Benim Performansım (Özet)**
- Bu ay tamamlanan: X proje
- Ortalama süre: X gün
- Revizyon oranı: %X
- Deadline başarısı: %X
- Geçen aya göre: ↑ %X daha hızlı

### 8.2 Proje Detay (Designer Görünümü)

- Finansal alanlar yok
- Müşteri bilgisi yok (admin ayarına göre)
- Admin iç notları yok
- Durum güncelleme butonu
- Revizyon notu ekleme
- Kendi günlük logu
- Dosya yükleme

### 8.3 İzin Talebi

Basit form:
- İzin tipi seçimi
- Tarih aralığı
- Tam gün / Yarım gün
- Açıklama notu
- [Talep Gönder]

Durum takibi: Bekliyor / Onaylandı / Reddedildi

---

## 9. ÜRETİM EKİBİ PANELİ

### 9.1 Production Dashboard

**Onay Bekleyenler**
Tasarımı tamamlanmış, yönetici onaylı ama henüz sipariş verilmemiş projeler.
Her kart: NJ No | Proje Tipi | Ülke | [Sipariş Ver]

**Aktif Siparişler**
Sipariş verilmiş, henüz teslim alınmamış projeler.
Durum: Sipariş Verildi / Kargoda / Gümrükte / Teslim Alındı

**Ülke Filtresi**
- Tümü
- 🇨🇳 Çin
- 🇮🇳 Hindistan

**Teslim Alınan Bu Ay**
Özet kart.

### 9.2 Sipariş Detay

- Proje bilgisi (sınırlı)
- Tedarikçi bilgisi (admin ayarına göre)
- Kargo takip numarası girişi
- Tahmini ve gerçek varış tarihi
- Notlar
- Durum güncellemesi

---

## 10. PROJE YÖNETİMİ & AKIŞI

### 10.1 Proje Oluşturma (Sadece Admin)

**Form Alanları**
```
Zorunlu:
- NJ Numarası (unique, otomatik kontrol)
- Proje Tipi: single_unit | multi_unit | drawing | revision
- Atanan Tasarımcı (dropdown, kapasiteye göre renk)
- Öncelik: Normal | Urgent | Critical
- Tahmini Bitiş Tarihi
- Ülke: Çin | Hindistan | Her İkisi

Opsiyonel:
- Proje Notları
- Dosya Ekleme (brief, referans)
- Finansal Bilgiler (ayrı tab)
- Müşteri Bilgileri (ayrı tab)
- Monday Board Bağlantısı
```

**Kapasite Uyarısı**
Tasarımcı seçilirken anlık kontrol:
- "Victor'un 6 aktif projesi var — kapasite yüksek ⚠️"
- "Hamson önümüzdeki hafta 2 projesi bitiyor — uygun ✅"

**Kayıt Sonrası Otomatik İşlemler**
1. Monday.com'a proje push edilir
2. Atanan tasarımcıya bildirim gider
3. Audit log oluşur
4. Bildirim kuralları tetiklenir (eşikler kontrol edilir)

### 10.2 Proje Durumları & Geçişler

```
new ──→ designing ──→ review ──→ approved ──→ in_production ──→ done
              ↕
           revision
              ↓
           designing (tekrar)
```

**Durum Açıklamaları**
| Durum | Kim Değiştirir | Açıklama |
|-------|---------------|----------|
| new | Admin | Proje oluşturuldu |
| designing | Designer | Tasarım süreci başladı |
| revision | Admin/Designer | Revizyon talebi |
| review | Designer | Tasarımcı teslim etti |
| approved | Admin | Yönetici onayladı |
| in_production | Admin/Production | Üretime geçti |
| done | Admin/Production | Tamamlandı |
| cancelled | Admin | İptal edildi |

### 10.3 Proje Devir İşlemi

Admin sürükle-bırak veya "Devret" butonu ile:
1. Hangi tasarımcıya devredileceği seçilir
2. Sebep girilir (opsiyonel)
3. Orijinal log'da "devredildi" kaydı oluşur
4. Yeni tasarımcıda "devir alındı" kaydı oluşur
5. Her iki tasarımcıya bildirim gider
6. Monday güncellenir

### 10.4 Revision Bağlantısı

Revizyon projeleri (NJ252-3 gibi) orijinal projeye bağlıdır:
- "Orijinal Proje" seçimi zorunlu
- Otomatik revizyon sayacı
- Geçmiş revizyonların tümü görünür
- 3+ revizyon olursa admin'e otomatik uyarı

---

## 11. REVİZYON TAKİP SİSTEMİ

### Revizyon Kaydı
Her revizyon için:
- Revizyon numarası (otomatik)
- Revizyon tipi: Müşteri Değişikliği | İç Düzeltme | Teknik Hata
- Talep eden kim
- Açıklama / Ne değişecek
- Revizyon başlangıç tarihi
- Revizyon bitiş tarihi
- Net revizyon süresi (izinler hesaplanmış)

### Revizyon Uyarı Kuralları (Admin Ayarlı)
- 3+ revizyon → Admin'e anlık bildirim + kart kırmızı işaretle
- Revizyon süresi X günü aştı → Uyarı
- Müşteri kaynaklı revizyon oranı yüksekse → Aylık raporda vurgula

### Revizyon Analitik
- En çok revizyon alan proje tipleri
- Revizyon kaynağı dağılımı (müşteri/iç/teknik)
- Tasarımcı bazlı revizyon oranı
- Revizyon başına ortalama ekstra süre

---

## 12. PERFORMANS & ANALİTİK SİSTEMİ

### 12.1 Bireysel Performans Metrikleri

```
Temel Metrikler:
├── Teslim Hızı: Net çalışma günü / Proje
├── Deadline Başarısı: Zamanında teslim / Toplam teslim (%)
├── Revizyon Oranı: Revizyon alan proje / Toplam proje (%)
├── Kapasite Kullanımı: Aktif proje / Maks kapasite (%)
└── Performans Skoru: Beklenen süre / Gerçek süre

Detay Metrikler:
├── Proje tipi bazlı ortalama süre
├── Revizyon türü dağılımı
├── Günlük ortalama güncelleme sayısı
├── Check-in düzenliliği
└── Gecikme trendleri (son 3 ay)
```

### 12.2 Performans Skoru Formülü

```
Beklenen Süre = O proje tipinin ekip ortalaması (son 90 gün)
Net Süre      = Proje süresi - İzin günleri - Tatil günleri - Hafta sonları
Skor          = Beklenen Süre / Net Süre

Skor 1.0      = Tam ortalamada
Skor 1.2+     = %20+ hızlı (yeşil)
Skor 0.8-     = %20+ yavaş (sarı/kırmızı)

Ağırlıklı Ortalama: Son 90 gün, yakın tarih 2x ağırlık
```

### 12.3 Erken Uyarı Sinyalleri

Sistem aşağıdaki anomalileri 3 günlük trend olarak takip eder:

- Deadline kaçırma oranında artış (son 2 hafta)
- Revizyon sayısında artış
- Bir projede 5+ gün takılı kalma
- Check-in düzensizliği
- Kapasite aşımı (admin belirlediği eşik)

Uyarı amacı: Cezalandırma değil, destek ihtiyacını erken tespit etmek.

### 12.4 Admin Analitik Dashboard

**Ekip Genel Görünümü**
- Toplam aktif proje
- Bu hafta tamamlanan
- Geciken proje sayısı
- Ortalama teslim süresi
- En çok yük taşıyan tasarımcı

**Grafikler**
- Haftalık proje tamamlama çubuğu grafiği
- Tasarımcı bazlı kapasite doluluk çubuğu
- Revizyon kaynağı pasta grafiği
- Aylık proje hacmi çizgi grafiği
- Tasarımcı performans radar grafiği

**Kapasite Planlama**
"Önümüzdeki 2 hafta içinde kim kaç proje bitirecek?"
Yanıt: Tasarımcı bazlı boş kapasite tahmini

### 12.5 Tasarımcının Kendi Performansı

Kendi sayfasında görür, başkasını göremez:
- Bu ay tamamladığı proje sayısı
- Net çalışma günü sayısı
- Ortalama teslim süresi
- Revizyon oranı
- Geçen ay karşılaştırma
- Trend grafiği (son 3 ay)

---

## 13. NET ÇALIŞMA GÜNÜ HESAPLAMA MOTORU

### 13.1 Temel Formül

```
Net Çalışma Günü =
  (Bitiş Tarihi - Başlangıç Tarihi)
  - Hafta Sonu Günleri
  - Resmi Tatil Günleri (Ülkeye göre)
  - Onaylı İzin Günleri (Kişiye özel)
  - Yarım Gün İzinler × 0.5
```

### 13.2 Çalışma Takvimi

Admin tarafından belirlenir:
- Haftanın hangi günleri çalışılıyor (varsayılan: Pazartesi-Cuma)
- Çalışma saatleri (opsiyonel, bildirim zamanlaması için)
- Global veya kullanıcı bazlı tanımlama

### 13.3 Resmi Tatil Yönetimi

- Admin yıl başında tatilleri girer
- Ülke bazlı tanımlanabilir
- Tekrar eden tatiller (her yıl aynı tarih) otomatik yenilenir
- Kullanıcıya ülke atanır → o ülkenin tatilleri uygulanır

### 13.4 İzin Yönetim Akışı

```
Tasarımcı → İzin Talebi Gönderir
    ↓
Admin bildirim alır
    ↓
Admin Onaylar veya Reddeder
    ↓
Onaylanırsa:
  - İzin takvime işlenir
  - Aktif projeler için "Beklemede" veya "Devir" kararı istenir
  - Projelerin deadline'ı otomatik ötelenir (admin seçerse)
  ↓
Tasarımcıya bildirim gider
```

### 13.5 İzin Tipleri ve Hesaplama Etkisi

| İzin Tipi | Performans Hesabı | Görünürlük |
|-----------|:----------------:|:----------:|
| Yıllık İzin | Çıkarılır | Admin |
| Hastalık İzni | Çıkarılır | Admin (özel) |
| Mazeret İzni | Çıkarılır | Admin |
| Uzaktan Çalışma | Çıkarılmaz | Admin |

### 13.6 İzin Döneminde Projeler

**Seçenek A — Beklemede Modu**
- Proje sayacı durur
- Deadline otomatik ötelenir (izin süresi kadar)
- Monday'de "On Hold" yapılır

**Seçenek B — Devir Modu**
- Admin başka tasarımcıya aktarır
- Her iki tarafın logu güncellenir
- Her iki taraf da adil hesaplanır

---

## 14. BİLDİRİM SİSTEMİ

### 14.1 Bildirim Kanalları

- **In-App:** Uygulama içi bildirim zili + toast mesajları
- **Email:** cPanel SMTP üzerinden (Nodemailer)
- **Browser Push:** PWA push notification (web push API)

### 14.2 Admin Konfigürasyon Paneli (Settings > Bildirimler)

Admin her kural için şunları belirler:
- Kural adı
- Tetikleyici koşul (aşağıdan seçilir)
- Eşik değeri (gün / saat / adet / yüzde)
- Hedef roller (kim bildirim alsın)
- Kanal (in-app / email / her ikisi)
- Aktif/Pasif

### 14.3 Bildirim Kuralları (Örnekler)

**Admin Bildirimleri**
| Kural | Tetikleyici | Varsayılan Eşik |
|-------|-------------|-----------------|
| Geciken Proje | Deadline geçildi | 0 gün |
| Yaklaşan Deadline | Deadline yaklaşıyor | 2 gün |
| Uzun Süren Proje | Aynı durumda takılı | 5 gün |
| Dengesiz İş Yükü | Tasarımcılar arası proje farkı | 3 proje |
| Revizyon Uyarısı | Proje X+ revizyon aldı | 3 revizyon |
| Kapasite Aşımı | Tasarımcı X+ proje taşıyor | 6 proje |
| Onay Bekliyor | Review'da X günü geçti | 1 gün |
| İzin Başlıyor | Tasarımcı izne çıkıyor | 1 gün önce |
| Sabah Özeti | Her sabah otomatik | 09:00 |
| Akşam Özeti | Her akşam otomatik | 18:00 |

**Designer Bildirimleri**
| Kural | Tetikleyici |
|-------|-------------|
| Yeni Proje Atandı | Admin proje atadı |
| Deadline Yaklaşıyor | X gün kaldı (admin ayarlar) |
| İzin Onaylandı/Reddedildi | Admin karar verdi |
| Proje Devredildi | Proje başkasına geçti |
| Revizyon Talebi | Admin revizyon açtı |

**Production Bildirimleri**
| Kural | Tetikleyici |
|-------|-------------|
| Yeni Sipariş Bekliyor | Proje onaylandı |
| Sipariş Onaylandı | Admin onayladı |

### 14.4 Bildirim Merkezi

`/notifications` sayfasında:
- Tüm bildirimler kronolojik
- Okundu/okunmadı filtreleme
- Tipe göre filtreleme
- Toplu okundu işaretle
- Her bildirim ilgili sayfaya link

### 14.5 Sabah Özet Raporu (Admin)

Her sabah belirlenen saatte otomatik email:
```
📋 Günlük Özet — [Tarih]

Bugün Teslim Edilecek: 3 proje
Geciken: 2 proje (Victor: NJ349, Hamson: NJ403)
Onay Bekleyen: 5 proje
İzinli Bugün: 1 kişi (Khushi)

Dikkat Edilmesi Gerekenler:
⚠️ NJ252 — 5 revizyon aldı
⚠️ Brijesh — 7 aktif proje (kapasite eşiği aşıldı)
```

---

## 15. MONDAY.COM ENTEGRASYONU

### 15.1 Entegrasyon Mimarisi

```
Bizim Sistem (Source of Truth)
    ↕ API + Webhook
Monday.com (Ayna)
```

### 15.2 Monday'den İhtiyaç Duyulanlar

Admin'in Settings > Monday ekranından girmesi gerekenler:
- API Token (v2)
- Board ID (hangisi sync edilecek)
- Column Mapping (Monday kolonu ↔ Bizim alan)

### 15.3 Column Mapping Örneği

```
Monday Kolonu          ↔  Bizim Alan
─────────────────────────────────────
Status                 ↔  project.status
Person                 ↔  project.assigned_designer
Due Date               ↔  project.deadline
Priority               ↔  project.priority
Text (NJ Number)       ↔  project.nj_number
Numbers (Price)        ↔  project_financials.project_price [RESTRICTED]
```

### 15.4 Sync Akışı

**Push (Bizim Sistem → Monday)**
Tetikleyici: Proje oluşturma, durum değişimi, tasarımcı değişimi, deadline değişimi

```javascript
// Tetikleyiciler
onCreate → monday.createItem(mappedData)
onStatusChange → monday.updateColumn(itemId, 'status', newStatus)
onAssigneeChange → monday.updateColumn(itemId, 'person', designerId)
```

**Pull (Monday → Bizim Sistem)**
Tetikleyici: Monday Webhook

```javascript
// Monday Webhook alındığında:
1. Hangi item değişti?
2. Hangi kolon değişti?
3. Conflict var mı? (iki taraf da güncellendi)
4. Conflict resolution: Bizim sistem kazanır (timestamp bazlı)
5. Güncelle + sync_log yaz
```

**Conflict Resolution**
- Son güncelleme kazanır (timestamp bazlı)
- Ya da: "Bizim sistem her zaman kazanır" (ayarlanabilir)
- Conflict durumunda admin'e bildirim gider

### 15.5 Kısıtlı Alanlar

Finansal alanlar Monday'e push edilmez (veya Monday'den çekilmez). Bu alanlar sadece bizim veritabanımızda tutulur. Monday'deki financial kolon varsa mapping'e dahil edilmez.

### 15.6 Sync Log

Her sync işlemi loglanır:
- Yön (push/pull)
- Başarı/Hata
- Payload
- Hata mesajı
- Zaman damgası

Admin Settings > Monday ekranında son 100 sync log görünür.

---

## 16. PLACE ORDER ONAY AKIŞI

### 16.1 Tam Akış

```
[1] Tasarımcı → "Done" işaretler
         ↓ Otomatik
[2] Durum "Review" olur
         ↓ Admin bildirim alır
[3] Admin → Projeyi inceler → "Onayla" veya "Revizyon"
         ↓ Onaylarsa
[4] Durum "Approved" olur
         ↓ Production bildirim alır
[5] Production → Proje kartını görür
         ↓ "Sipariş Ver" butonuna basar
[6] Form açılır:
    - Ülke seçimi (Çin / Hindistan)
    - Tedarikçi seçimi
    - Tahmini varış tarihi
    - Notlar
         ↓
[7] Admin onayı (opsiyonel - ayarlanabilir)
         ↓
[8] Durum "In Production" → "Ordered"
         ↓ Monday güncellenir
[9] Takip: Kargoya verildi → Gümrükte → Teslim Alındı
         ↓
[10] Durum "Done" → Audit log kapanır
```

### 16.2 Production Order Formu

```
Proje: [NJ349 - Proje Adı]
Ülke: ○ Çin  ● Hindistan
Tedarikçi: [Dropdown]
Sipariş Tarihi: [Otomatik - Bugün]
Tahmini Varış: [Tarih Seçici]
Kargo Takip No: [Metin]
Notlar: [Textarea]
[İptal] [Sipariş Ver]
```

### 16.3 Üretim Takip Durumları

`pending_approval → approved → ordered → shipped → in_customs → delivered`

---

## 17. SETTINGS MODÜLÜ (ADMİN)

### 17.1 Ayarlar Ana Sayfası — Kategoriler

```
⚙️ Genel Ayarlar
👥 Kullanıcı Yönetimi
🔐 Permission Yönetimi
🔔 Bildirim Kuralları
📅 Çalışma Takvimi & Tatiller
🔗 Monday Entegrasyonu
📊 Raporlama Tercihleri
🎨 Arayüz Tercihleri
🔑 Güvenlik Ayarları
📋 Audit Log
```

### 17.2 Kullanıcı Yönetimi

**Kullanıcı Oluşturma**
- Ad, Soyad, Email
- Rol seçimi
- Ülke / Timezone
- Çalışma takvimi (global veya özel)
- Kapasite limiti (maks. kaç proje)
- Şifre otomatik oluşturulur, email ile gönderilir

**Kullanıcı Düzenleme**
- Rol değiştirme
- Aktif/Pasif yapma (silme yerine)
- Kapasite güncelleme
- Şifre sıfırlama

### 17.3 Permission Yönetimi

Visual tablo editörü:
- Satırlar: Alanlar
- Sütunlar: Roller
- Her hücre: Gizli / Görür / Düzenle
- Kaydet butonu → Anında aktif

### 17.4 Bildirim Kuralları

Her kural için:
- Kural adı
- Tetikleyici tip dropdown
- Eşik değeri + birim
- Hedef roller (multi-select)
- Kanal (in-app / email / ikisi)
- Aktif/Pasif toggle
- [Düzenle] [Sil] [Test Et]

"Test Et" butonu: Kuralı şu an manuel tetikle, test bildirimi gönder.

### 17.5 Çalışma Takvimi

**Global Takvim**
- Haftanın hangi günleri (checkbox)
- Çalışma saatleri (başlangıç-bitiş)

**Tatil Yönetimi**
- Ülke seçimi
- Tarih + Tatil Adı + Tekrar Eden mi?
- Yıllık toplu import (CSV)

**Kullanıcı Bazlı Override**
Belirli kullanıcı için farklı çalışma günleri tanımlanabilir.

### 17.6 Monday Entegrasyon Ayarları

- API Token (şifreli saklanır, görüntülenmez)
- Board ID
- Column Mapping arayüzü
- Sync Frekansı (webhook + manual trigger)
- Conflict Resolution kuralı
- Sync Log görünümü
- [Bağlantıyı Test Et] [Manuel Sync Başlat]

### 17.7 Güvenlik Ayarları

- Session timeout süresi
- Max. login denemesi
- IP whitelist (opsiyonel)
- 2FA zorunluluğu (rol bazlı)
- Şifre politikası (min uzunluk, karmaşıklık)
- Şifre değiştirme zorunluluk periyodu

---

## 18. GÜVENLİK STANDARTLARI

### 18.1 Kimlik Doğrulama

```
- JWT Access Token: 15 dakika ömür
- Refresh Token: 7 gün, httpOnly cookie, Secure flag
- Token rotation: Her refresh'te yeni token
- Logout: Tüm tokenlar server'da geçersiz kılınır
- 2FA: TOTP (Google Authenticator uyumlu) — admin için opsiyonel zorunlu
- Brute force: 5 başarısız denemede 15 dakika bekleme
- Rate limiting: IP bazlı (express-rate-limit)
```

### 18.2 API Güvenliği

```
- Her endpoint: JWT doğrulama
- Her endpoint: Rol kontrolü (middleware)
- Field-level: Response'tan unauthorized alanlar çıkarılır
- SQL Injection: Prisma ORM (parametreli sorgular)
- XSS: DOMPurify + CSP header
- CSRF: Double Submit Cookie
- CORS: Whitelist domain only
- Helmet.js: Güvenlik header'ları
- Input validation: Zod (tüm endpointlerde)
- File upload: Tip ve boyut kontrolü (max 10MB, beyaz liste)
```

### 18.3 Veri Güvenliği

```
- Şifreler: bcrypt (salt rounds: 12)
- Finansal veriler: Ayrı tablo + ekstra permission katmanı
- Monday API Token: Encrypt edilmiş saklanır (AES-256)
- Hassas loglar: PII maskeleme
- Database: Güçlü şifre, localhost bağlantısı (cPanel)
```

### 18.4 HTTPS & Transport

```
- SSL: Let's Encrypt (cPanel AutoSSL)
- HSTS: Strict-Transport-Security header
- TLS: Minimum 1.2
- Mixed content: Engellenir
```

### 18.5 Audit Log Kapsamı

Her kritik işlem loglanır:
- Kullanıcı giriş/çıkış
- Başarısız giriş denemeleri
- Proje oluşturma/güncelleme/silme
- Kullanıcı oluşturma/güncelleme
- Permission değişiklikleri
- Finansal veri görüntüleme
- Monday sync işlemleri
- Ayar değişiklikleri
- İzin onay/red

Log içeriği: `user_id | action | resource | old_value | new_value | ip | timestamp`

### 18.6 Erişim Kısıtlama

```
- Unauthorized URL erişimi: 403 (veri sızdırılmaz)
- Gizli alan API erişimi: Response'tan çıkarılır (404 değil, alan yok)
- Admin paneli: Non-admin rolü yönlendirilir
- cPanel: SSH key auth tercih edilir
- .env dosyaları: Web'den erişilemez (.htaccess)
```

### 18.7 Backup

```
- MySQL: Günlük otomatik backup (cPanel Backup)
- Uygulama dosyaları: Haftalık backup
- Backup retention: 30 gün
- Restore testi: Aylık manuel test
```

---

## 19. ARAYÜZ & TASARIM SİSTEMİ

### 19.1 Renk Paleti

```css
/* Ana Renkler */
--primary:       #6366F1    /* İndigo — ana aksiyon */
--primary-dark:  #4F46E5    /* Hover state */
--secondary:     #8B5CF6    /* Mor — secondary aksiyon */

/* Durum Renkleri */
--success:       #10B981    /* Yeşil — zamanında, tamamlandı */
--warning:       #F59E0B    /* Sarı — yaklaşan deadline, dikkat */
--danger:        #EF4444    /* Kırmızı — gecikmiş, kritik */
--info:          #3B82F6    /* Mavi — bilgi, senkron */

/* Proje Durum Renkleri */
--status-new:         #94A3B8   /* Gri */
--status-designing:   #6366F1   /* İndigo */
--status-revision:    #F59E0B   /* Sarı */
--status-review:      #3B82F6   /* Mavi */
--status-approved:    #10B981   /* Yeşil */
--status-production:  #8B5CF6   /* Mor */
--status-done:        #059669   /* Koyu Yeşil */

/* Öncelik Renkleri */
--priority-normal:    #94A3B8
--priority-urgent:    #F59E0B
--priority-critical:  #EF4444

/* Arka Plan */
--bg-primary:    #0F172A    /* Koyu lacivert (dark mod) */
--bg-secondary:  #1E293B
--bg-card:       #1E293B
--bg-hover:      #2D3748

/* Light Mod */
--bg-light:      #F8FAFC
--bg-card-light: #FFFFFF
```

### 19.2 Tipografi

```css
Font Family: Inter (Google Fonts)
Başlık: 24-32px, font-bold
Alt Başlık: 18-20px, font-semibold
Gövde: 14-16px, font-normal
Küçük: 12-13px, font-medium (label, badge)
```

### 19.3 Bileşen Tasarımı

**Proje Kartı**
```
┌─────────────────────────────────────────┐
│ 🟡 URGENT    NJ349           Designing  │
│ ─────────────────────────────────────── │
│ Victor Tasarımcı                        │
│ 📅 Deadline: 12 Şub — 2 gün kaldı ⚠️  │
│ 🔄 Revizyon: 0  |  ⏱ Net: 3 gün       │
│ ─────────────────────────────────────── │
│ [Detay Gör]  [Durum Güncelle]  [···]   │
└─────────────────────────────────────────┘
```

**Kapasite Çubuğu**
```
Victor ████████░░ 80%  (4/5 proje)  ⚠️
Hamson ████████████ 100% (6/6 proje) 🔴
Gargi  ████░░░░░░ 40%  (2/5 proje)  ✅
```

**Durum Badge'leri**
```
[🔵 Designing] [🟡 Revision] [🟢 Approved] [🔴 Gecikmiş]
```

### 19.4 Dark / Light Mod

- Sistem tercihini otomatik algılar (prefers-color-scheme)
- Toggle butonu her sayfada erişilebilir
- Seçim localStorage'da saklanır
- Default: Dark mod (tasarımcılar için göz dostu)

### 19.5 Responsive Tasarım

```
Desktop (1440px+): Tam sidebar, çoklu kolon
Tablet (768-1440): Daraltılmış sidebar
Mobile (< 768px):  Bottom navigation, tek kolon
PWA: Native app benzeri deneyim
```

### 19.6 PWA Kurulumu

- Web app manifest
- Service worker (offline cache)
- Push notification desteği
- Telefona "Uygulamayı Yükle" banner

### 19.7 Micro-interactions

- Proje durumu değişince smooth renk geçişi
- Bildirim sayacı animasyonu
- Loading skeleton (veri gelene kadar)
- Başarılı işlem toast (sağ alt köşe)
- Sürükle-bırak ghost preview
- Kapasite çubuğu dolum animasyonu

### 19.8 Klavye Kısayolları

| Kısayol | İşlem |
|---------|-------|
| Ctrl+K | Global arama |
| N | Yeni proje (admin) |
| Esc | Modal kapat |
| ←→ | Gantt görünümde gezinme |
| F | Filtreleri aç |
| R | Sayfayı yenile (data refresh) |

---

## 20. WHM/CPANEL DEPLOYMENT

### 20.1 Sunucu Gereksinimleri

```
- Node.js: 20 LTS (cPanel Node.js Selector)
- MySQL: 8.0
- PHP: Gerekmiyor (Node.js yeterli)
- RAM: Minimum 2GB (VPS önerilir)
- Disk: 10GB+ (dosya yüklemeleri için)
- SSL: AutoSSL (Let's Encrypt)
```

### 20.2 Klasör Yapısı

```
/home/cpanelusername/
├── public_html/              ← Frontend (Next.js export veya proxy)
│   └── .htaccess             ← Proxy ayarları
├── app/                      ← Backend (public dışında)
│   ├── backend/              ← Express.js
│   │   ├── src/
│   │   ├── .env              ← Gizli tutulur
│   │   ├── package.json
│   │   └── ecosystem.config.js  ← PM2
│   └── uploads/              ← Yüklenen dosyalar
└── logs/                     ← Uygulama logları
```

### 20.3 .htaccess (Frontend Proxy)

```apache
RewriteEngine On
RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule . /index.html [L]
```

### 20.4 PM2 Konfigürasyonu

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'designer-tracker',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
```

### 20.5 Çevre Değişkenleri (.env)

```env
# Database
DATABASE_URL=mysql://user:pass@localhost:3306/dbname

# JWT
JWT_SECRET=<güçlü-rastgele-string>
JWT_REFRESH_SECRET=<güçlü-rastgele-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Monday.com (Settings'ten alınır, .env değil DB'de)
MONDAY_WEBHOOK_SECRET=<webhook-doğrulama>

# SMTP (cPanel)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<email-sifresi>

# App
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
PORT=5000

# Encryption (Monday API token için)
ENCRYPTION_KEY=<32-byte-hex>
```

### 20.6 cPanel Cron Jobs

```bash
# PM2 otomatik başlat (sunucu restart sonrası)
@reboot /usr/local/nvm/versions/node/v20/bin/pm2 start /home/user/app/backend/ecosystem.config.js

# Günlük sabah özet raporu (09:00)
0 9 * * * curl -s http://localhost:5000/api/internal/cron/morning-report

# Monday sync (her 5 dakika)
*/5 * * * * curl -s http://localhost:5000/api/internal/cron/monday-sync

# Gecikme kontrolü (her saat)
0 * * * * curl -s http://localhost:5000/api/internal/cron/check-delays
```

---

## 21. GELİŞTİRME YOL HARİTASI (FAZ PLANI)

### Faz 1 — Temel Sistem (4-5 Hafta)
```
Hafta 1-2:
□ Proje kurulumu (Next.js + Express + Prisma + MySQL)
□ Auth sistemi (JWT, roller, middleware)
□ Kullanıcı CRUD
□ Proje CRUD (temel)
□ Field-level permission motoru

Hafta 3-4:
□ Admin dashboard (temel)
□ Designer paneli
□ Proje listeleri ve filtreler
□ Proje detay kartı
□ Durum güncellemesi

Hafta 5:
□ Test + bug fix
□ cPanel deployment
□ Super admin kullanıcı oluşturma
```

### Faz 2 — Gelişmiş Özellikler (3-4 Hafta)
```
Hafta 6-7:
□ Revizyon takip sistemi
□ Net çalışma günü hesaplama motoru
□ İzin yönetimi
□ Tatil takvimi

Hafta 8-9:
□ Bildirim sistemi (in-app + email)
□ Settings modülü (bildirim kuralları)
□ Audit log
□ Performance metrikler (temel)
```

### Faz 3 — Entegrasyon & Analitik (3 Hafta)
```
Hafta 10-11:
□ Monday.com webhook entegrasyonu
□ Column mapping arayüzü
□ Sync log
□ Conflict resolution

Hafta 12:
□ Analitik dashboard
□ Grafikler (Recharts)
□ Kapasite planlama
□ Performans karşılaştırma
```

### Faz 4 — Production & PWA (2 Hafta)
```
Hafta 13:
□ Place order onay akışı
□ Üretim paneli
□ Üretim tracking

Hafta 14:
□ PWA (service worker, manifest, push)
□ Zaman çizelgesi (Gantt)
□ Global arama (Ctrl+K)
□ Export (PDF/Excel)
□ Son testler + optimizasyon
```

**Toplam Tahmini Süre: 14 Hafta**

---

## 22. WINDSURF / CURSOR KURALLARI

### .windsurfrules veya .cursorrules

```markdown
# DESIGNER TRACKER — GELIŞTIRME KURALLARI

## Genel Prensipler
- Her component Typescript ile yazılmalı
- Tüm API endpointleri Zod ile validate edilmeli
- Her yeni endpoint için permission middleware eklenmeli
- Sensitive data (financial, client) asla log'a yazılmamalı
- Her DB sorgusu Prisma ORM üzerinden yapılmalı (raw SQL yasak)

## Klasör Yapısı (Backend)
src/
├── controllers/     ← Route handler'lar
├── services/        ← İş mantığı
├── middleware/       ← Auth, permission, validation
├── routes/          ← Express router
├── utils/           ← Yardımcı fonksiyonlar
├── jobs/            ← Cron job'lar
├── types/           ← TypeScript tipleri
└── index.ts

## Klasör Yapısı (Frontend)
app/
├── (auth)/          ← Login sayfaları
├── admin/           ← Admin sayfaları
├── designer/        ← Designer sayfaları
├── production/      ← Production sayfaları
components/
├── ui/              ← shadcn base components
├── shared/          ← Ortak bileşenler
├── admin/           ← Admin'e özel
└── designer/        ← Designer'a özel

## Güvenlik Kuralları
- JWT doğrulama: Her korumalı endpoint'te authenticate middleware
- Permission: Her endpoint'te authorize(roles[]) middleware
- Field filter: serializeForRole(data, userRole) ile response filtrele
- Input: Her endpoint başında validateBody(schema) kullan
- Financial data: Ayrı servis ve endpoint - finance.service.ts

## Naming Convention
- Dosyalar: kebab-case (project-service.ts)
- Fonksiyonlar: camelCase (getProjectById)
- Component: PascalCase (ProjectCard)
- DB field: snake_case (created_at)
- Env vars: UPPER_SNAKE_CASE

## Error Handling
- Tüm async fonksiyonlar try-catch
- Özel hata sınıfları: AppError, ValidationError, UnauthorizedError
- Production'da stack trace gösterilmez
- Tüm hatalar Winston logger ile loglanır

## Monday.com
- Monday işlemleri sadece monday.service.ts içinde
- Sync işlemleri queue'ya alınır (başarısızlık durumunda retry)
- API token .env'de değil, encrypted DB'de

## Cron Jobs
- jobs/ klasöründe ayrı dosyalar
- Cron trigger sadece internal endpoint ile (auth token ile korunur)
- Hata durumunda admin'e email

## Test
- Her service için unit test yazılmalı (Jest)
- API testleri Supertest ile
- Permission testleri: Her rol için ayrı test case

## cPanel Uyumluluk
- Absolute path kullanma, __dirname kullan
- Port 5000 (cPanel proxy)
- Graceful shutdown (PM2 ile uyumlu)
- File upload: /app/uploads/ (public dışında)
```

---

## 📊 ÖZET — SİSTEM ÖZELLİK LİSTESİ

### ✅ Temel Özellikler
- [x] Çok rollü kullanıcı sistemi (5 rol)
- [x] Field-level permission (alan bazlı gizlilik)
- [x] Proje CRUD (NJ numaraları)
- [x] Proje durumu akışı
- [x] Tasarımcı atama ve devir
- [x] Revizyon takibi ve sayacı
- [x] Günlük check-in/check-out
- [x] Dosya yükleme

### ✅ Yönetim Özellikleri
- [x] Admin Command Center dashboard
- [x] Gantt zaman çizelgesi
- [x] Tasarımcı karşılaştırma
- [x] Kapasite planlama
- [x] Sürükle-bırak atama
- [x] Toplu işlemler
- [x] Global arama (Ctrl+K)
- [x] Export (PDF/Excel)

### ✅ Performans & Analitik
- [x] Net çalışma günü hesaplama
- [x] Tatil & izin yönetimi
- [x] Performans skoru (adil formül)
- [x] Erken uyarı sinyalleri
- [x] Haftalık/aylık raporlar
- [x] Tasarımcı bazlı analitik
- [x] Proje tipi analitik

### ✅ Bildirim & Otomasyon
- [x] Özelleştirilebilir bildirim kuralları
- [x] In-app bildirimler
- [x] Email bildirimleri
- [x] Browser push (PWA)
- [x] Sabah/akşam özet raporları
- [x] Otomatik deadline uyarıları
- [x] Kapasite eşik bildirimleri

### ✅ Entegrasyon
- [x] Monday.com webhook senkronizasyonu
- [x] Column mapping arayüzü
- [x] Conflict resolution
- [x] Sync log & monitoring
- [x] Place order onay akışı
- [x] Üretim tracking (Çin/Hindistan)

### ✅ Güvenlik
- [x] JWT + Refresh Token
- [x] Role-based access control
- [x] Field-level API security
- [x] Audit log (tüm kritik işlemler)
- [x] Brute force koruması
- [x] Rate limiting
- [x] 2FA (opsiyonel)
- [x] SSL/HTTPS
- [x] Encrypted sensitive data

### ✅ Arayüz & UX
- [x] Dark/Light mod
- [x] Responsive (Mobile/Tablet/Desktop)
- [x] PWA (telefona yüklenebilir)
- [x] Türkçe arayüz
- [x] Renk kodlu durum sistemi
- [x] Klavye kısayolları
- [x] Loading skeleton
- [x] Toast bildirimleri

---

> **Son Güncelleme:** Şubat 2026  
> **Hazırlayan:** Claude Opus 4.6 — Sistem Planlama Asistanı  
> **Platform:** WHM/cPanel | **IDE:** Windsurf | **Versiyon:** 1.0

---
*Bu döküman geliştirilmeye devam edecektir. Her faz tamamlandığında güncellenmesi önerilir.*
