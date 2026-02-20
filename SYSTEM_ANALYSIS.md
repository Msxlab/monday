# 🔍 Designer Tracker Sistem Analiz Raporu

> **Tarih:** Şubat 2026  
> **Kapsam:** Backend mimarisi, veritabanı tasarımı, güvenlik, performans, iş mantığı, eksik özellikler ve öneriler  
> **Analiz Edilen:** `backend/src/` altındaki tüm modüller, Prisma şeması, middleware, servisler, route'lar, zamanlanmış işler

---

## 📑 İçindekiler

1. [Genel Sistem Özeti](#1-genel-sistem-özeti)
2. [Modül Bazlı Analiz](#2-modül-bazlı-analiz)
3. [Güvenlik Analizi](#3-güvenlik-analizi)
4. [Performans ve Verimlilik](#4-performans-ve-verimlilik)
5. [Veritabanı Tasarımı](#5-veritabanı-tasarımı)
6. [İş Mantığı ve Akış Sorunları](#6-iş-mantığı-ve-akış-sorunları)
7. [Eksik Sistemler ve Öneriler](#7-eksik-sistemler-ve-öneriler)
8. [Frontend Durumu](#8-frontend-durumu)
9. [Öncelik Sıralaması](#9-öncelik-sıralaması)

---

## 1. Genel Sistem Özeti

### Mevcut Mimari
| Katman | Teknoloji | Durum |
|--------|-----------|-------|
| Backend | Node.js 20 + Express + TypeScript | ✅ Aktif |
| ORM | Prisma + MySQL 8.0 | ✅ Aktif |
| Auth | JWT + Refresh Token + httpOnly Cookie | ✅ Aktif |
| Validation | Zod | ✅ Aktif |
| Logging | Winston | ✅ Aktif |
| Scheduling | node-cron | ✅ Aktif |
| Frontend | Next.js 14 (planlandı) | 🔴 Henüz yok |

### Modül Yetkinlik Haritası

| Modül | Fonksiyon Sayısı | Değerlendirme |
|-------|:----------------:|:-------------:|
| Auth | 10 | ✅ Kapsamlı |
| Projects | 10+ | ✅ Kapsamlı |
| Leave (İzin) | 9 | ✅ Kapsamlı |
| Settings | 11 | ✅ Kapsamlı |
| Users | 6+ | ✅ Yeterli |
| Production | 6 | ⚠️ Yetersiz |
| Analytics | 4 | ⚠️ Yetersiz |
| Finance | 4 | ⚠️ Yetersiz |
| Comments | 3 | ⚠️ Yetersiz |
| Notifications | 5 | ⚠️ Yetersiz |
| Daily Log | 3 | ⚠️ Yetersiz |
| Upload | 4 | ⚠️ Yetersiz |
| Audit | 2 | 🔴 Çok Yetersiz |
| Email | 5 | ⚠️ Yetersiz |

---

## 2. Modül Bazlı Analiz

### 2.1 Auth Modülü ✅
**Mevcut:** Login, logout, refresh token, session yönetimi, şifre değiştirme, hesap kilitleme (5 deneme/15dk), login geçmişi, cihaz takibi, audit logging.

**Eksik Özellikler:**
- [ ] İki faktörlü doğrulama (2FA/TOTP)
- [ ] Şifre sıfırlama (e-posta ile)
- [ ] IP bazlı şüpheli giriş algılama (farklı ülke/şehir)
- [ ] Oturum bazlı IP değişikliği uyarısı — refresh token kullanılırken IP değişirse uyarı yok
- [ ] Token süreleri ortam değişkeninden okunmalı (şu an hardcoded: 15dk access, 7gün refresh)
- [ ] "Beni hatırla" özelliği (uzun süreli token)
- [ ] Eşzamanlı oturum limiti (max 3 cihaz gibi)

---

### 2.2 User (Kullanıcı) Modülü ✅
**Mevcut:** CRUD işlemleri, profil güncelleme, rol yönetimi, arama/filtreleme.

**Eksik Özellikler:**
- [ ] Kullanıcı silme (soft delete) — route ve servis tamamen eksik
- [ ] Kullanıcı deaktif etme/dondurma özelliği
- [ ] Profil fotoğrafı yükleme
- [ ] Kullanıcı aktivite özeti (son giriş, son proje, toplam proje sayısı)
- [ ] Toplu kullanıcı işlemleri (bulk import/export)
- [ ] Şifre politikası kontrolü (min uzunluk, karmaşıklık doğrulaması)

---

### 2.3 Project (Proje) Modülü ✅
**Mevcut:** Tam yaşam döngüsü, durum makinesi (new→designing→review→approved→in_production→done), klonlama, deadline uzatma, toplu işlemler, CSV export, istatistikler.

**Eksik Özellikler:**
- [ ] Proje şablonları (sık kullanılan proje tipleri için)
- [ ] Proje arşivleme (soft delete)
- [ ] Proje önceliklendirme (priority: low/medium/high/urgent)
- [ ] Bağımlılık yönetimi (proje A, proje B'ye bağlı)
- [ ] Alt görev (subtask) sistemi
- [ ] Proje zaman çizelgesi (Gantt-benzeri veri yapısı)
- [ ] Proje etiketleme (tag/label sistemi)
- [ ] Dosya versiyonlama (aynı dosyanın farklı sürümleri)
- [ ] Proje ilerleme yüzdesi hesaplama

---

### 2.4 Production (Üretim) Modülü ⚠️
**Mevcut:** Temel CRUD, durum yönetimi, istatistikler, onaylanan projeleri listeleme.

**Eksik Özellikler:**
- [ ] Sipariş silme/iptal etme fonksiyonu
- [ ] Toplu durum güncelleme (bulk status update)
- [ ] Tedarikçi yönetimi (supplier bilgileri)
- [ ] Kargo/lojistik takibi (tracking number entegrasyonu)
- [ ] Üretim takvimi ve zaman planlaması
- [ ] Durum geçiş doğrulaması — şu an "delivered" → "ordered" geçişi engellenmiyor
- [ ] Üretim maliyeti takibi
- [ ] Kalite kontrol adımları
- [ ] Sipariş geçmişi (status history)

---

### 2.5 Analytics (Analitik) Modülü ⚠️
**Mevcut:** Genel bakış, tasarımcı performansı, aylık trend, revizyon analizi.

**Eksik Özellikler:**
- [ ] Gerçek zamanlı dashboard verileri (WebSocket/SSE ile)
- [ ] Özelleştirilebilir tarih aralıkları (tüm sorgularda)
- [ ] Karşılaştırmalı analiz (dönem bazlı: bu ay vs geçen ay)
- [ ] KPI tanımlama ve takibi
- [ ] Proje bazlı metrikler (ortalama tamamlanma süresi, revizyon oranı)
- [ ] Müşteri bazlı analitik (en çok sipariş veren, en çok revizyon isteyen)
- [ ] Verimlilik skorları (tasarımcı bazlı puan kartı)
- [ ] Rapor dışa aktarma (PDF/Excel)
- [ ] Öngörücü analitik (yapay zeka tabanlı süre tahmini)
- [ ] Analitik sorguları için önbellekleme (cache) — performans kritik

---

### 2.6 Finance (Finans) Modülü ⚠️
**Mevcut:** Proje bazlı finansal veri, ödeme durumu güncelleme, özet rapor.

**Eksik Özellikler:**
- [ ] Fatura oluşturma ve yönetimi
- [ ] Ödeme hatırlatıcıları (otomatik e-posta)
- [ ] Gelir/gider raporlama (aylık/yıllık)
- [ ] Kâr marjı analizi ve uyarıları
- [ ] Bütçe aşım kontrolü (maliyet > bütçe uyarısı)
- [ ] Döviz kuru desteği (çoklu para birimi)
- [ ] Toplu ödeme durumu güncelleme
- [ ] Finansal tahminleme (revenue forecasting)
- [ ] Negatif değer doğrulaması — şu an negatif fiyat girilebiliyor
- [ ] `cost_price ≤ project_price` kuralı zorlanmıyor
- [ ] Finansal veriler için sayfalama (pagination) — şu an tüm veriler yükleniyor

---

### 2.7 Comment (Yorum) Modülü ⚠️
**Mevcut:** Yorum oluşturma, proje bazlı listeleme (iç/dış ayrımı), silme.

**Eksik Özellikler:**
- [ ] Yorum düzenleme (update) — endpoint ve servis tamamen eksik
- [ ] Yorum yanıtlama (threading/nesting)
- [ ] @mention sistemi (kullanıcı etiketleme ve bildirim)
- [ ] Tepki (reaction) sistemi (👍, ✅, ❌)
- [ ] Yorum sayısı endpoint'i
- [ ] Soft-delete (silinmiş yorumları audit trail'de tutma)
- [ ] Yorum düzenleme geçmişi
- [ ] Dosya ekleme (yorum içi attachment)
- [ ] Yorum sabitleme (pin)

---

### 2.8 Notification (Bildirim) Modülü ⚠️
**Mevcut:** Listeleme, okunmamış sayısı, tekli/toplu okundu işaretleme, oluşturma.

**Kritik Sorun:** `create()` fonksiyonu hiçbir iş mantığı tarafından çağrılmıyor. Bildirimler fiilen oluşturulmuyor.

**Eksik Özellikler:**
- [ ] **Olay tabanlı bildirim tetikleme sistemi** (event-driven) — en kritik eksik
- [ ] Gerçek zamanlı bildirimler (WebSocket/SSE)
- [ ] Bildirim tercihleri (hangi olaylarda bildirim alınacağı)
- [ ] E-posta/SMS/push bildirim kanalları
- [ ] Bildirim şablonları
- [ ] Bildirim silme ve arşivleme
- [ ] Toplu bildirim gönderimi
- [ ] Okunmamış bildirim badge (anlık güncellenen)

---

### 2.9 Daily Log (Günlük Kayıt) Modülü ⚠️
**Mevcut:** Giriş/çıkış kaydı, listeleme, bugünkü durum kontrolü.

**Eksik Özellikler:**
- [ ] Kayıt güncelleme ve silme
- [ ] Çalışma saati hesaplama (günlük/haftalık/aylık)
- [ ] Proje bazlı zaman takibi (time tracking)
- [ ] Faturalanabilir saatler (billable hours)
- [ ] Haftalık/aylık zaman raporu
- [ ] Toplu kayıt oluşturma
- [ ] Checkout > checkin doğrulaması — şu an checkout zamanı checkin'den önce olabilir
- [ ] Tarih bazlı mükerrer giriş kontrolü hatalı — günün tamamını kapsamıyor

---

### 2.10 Upload (Dosya Yükleme) Modülü ⚠️
**Mevcut:** Dosya yükleme, proje bazlı listeleme, indirme, silme.

**Eksik Özellikler:**
- [ ] **Dosya tipi doğrulaması** — şu an her tür dosya yüklenebiliyor (güvenlik riski)
- [ ] **Dosya boyutu sınırı** — sınır tanımlı değil (DoS riski)
- [ ] Önizleme oluşturma (thumbnail/preview)
- [ ] Dosya versiyonlama
- [ ] Virüs taraması entegrasyonu
- [ ] Kullanıcı bazlı kota yönetimi
- [ ] Toplu dosya silme
- [ ] CDN entegrasyonu (büyük dosyalar için)
- [ ] Dosya sıkıştırma

---

### 2.11 Audit (Denetim) Modülü 🔴
**Mevcut:** Sadece listeleme ve CSV export — 2 endpoint.

**Eksik Özellikler:**
- [ ] Detaylı filtreleme (kullanıcı, tarih aralığı, aksiyon tipi, kaynak tipi)
- [ ] Veri saklama politikası (retention policy) — kayıtlar sınırsız büyüyor
- [ ] Otomatik temizleme (eski kayıtları arşivleme/silme)
- [ ] Adli analiz araçları (forensics: kim, ne zaman, ne değiştirdi)
- [ ] Gerçek zamanlı uyarılar (şüpheli aktivite tespiti)
- [ ] Audit dashboard (özet metrikler)
- [ ] Dışa aktarma formatları (PDF, JSON)
- [ ] Kaynak bazlı audit geçmişi (belirli bir projenin tüm değişiklikleri)

---

### 2.12 Email Servisi ⚠️
**Mevcut:** Deadline uyarısı, günlük özet, admin alarmı, hoş geldin e-postası, genel bildirim.

**Eksik Özellikler:**
- [ ] **HTML injection koruması** — kullanıcı girdileri doğrudan HTML'e ekleniyor (XSS riski)
- [ ] E-posta şablon motoru (template engine: Handlebars/EJS)
- [ ] E-posta kuyruğu (queue: Bull/BullMQ) — başarısız e-postaları yeniden deneme
- [ ] E-posta gönderim durumu takibi (sent, failed, bounced)
- [ ] E-posta şablonlarının yönetimi (admin panelden düzenlenebilir)
- [ ] Toplu e-posta gönderimi
- [ ] E-posta önizleme

---

### 2.13 Role Upgrade (Rol Yükseltme) Servisi ⚠️
**Mevcut:** Talep oluşturma, onaylama, listeleme.

**Eksik Özellikler:**
- [ ] Talep reddetme (reject) — sadece onay var
- [ ] Talep geçmişi ve detayları
- [ ] Otomatik yükseltme kuralları (X proje tamamlayan otomatik yükselt)
- [ ] Yükseltme talep gerekçesi (reason field)
- [ ] Bildirim entegrasyonu (talep oluşturulduğunda admin'e bildirim)

---

## 3. Güvenlik Analizi

### 3.1 🔴 Kritik Güvenlik Sorunları

#### 3.1.1 E-posta HTML Injection
**Dosya:** `services/email.service.ts`  
**Sorun:** Kullanıcı girdileri (`projectTitle`, `userName`, `message`) doğrudan HTML şablonlarına ekleniyor. Kötü niyetli kullanıcı proje adına `<script>` veya zararlı HTML kodu ekleyebilir.  
**Etki:** E-posta alıcılarında XSS, phishing saldırıları.  
**Çözüm:** Tüm kullanıcı girdileri HTML escape edilmeli veya şablon motoru (Handlebars gibi) kullanılmalı.

#### 3.1.2 Rate Limiting Bypass
**Dosya:** `middleware/user-rate-limit.ts`  
**Sorun:** Rate limiting sadece kimliği doğrulanmış kullanıcılara uygulanıyor. Kimlik doğrulaması yapılmamış istekler (login denemesi dahil) sınırlamadan muaf.  
**Etki:** Brute-force saldırıları, DoS.  
**Çözüm:** IP bazlı rate limiting eklenmeli (express-rate-limit veya benzeri).

#### 3.1.3 Dosya Yükleme Güvenliği
**Dosya:** `services/upload.service.ts`  
**Sorun:** Dosya tipi kontrolü yok, boyut sınırı yok. Herhangi bir dosya yüklenebilir (.exe, .php, .sh dahil).  
**Etki:** Sunucuda zararlı dosya çalıştırma, disk doldurma.  
**Çözüm:** MIME type whitelist, dosya boyutu limiti, dosya adı sanitization.

### 3.2 ⚠️ Orta Düzey Güvenlik Sorunları

#### 3.2.1 Authorization Fallback Davranışı
**Dosya:** `middleware/authorize.ts`  
**Sorun:** Veritabanı hatası durumunda yetkilendirme varsayılan rol izinlerine düşüyor (fail-open). Veritabanı kesintisinde saldırgan bunu kullanabilir.  
**Çözüm:** Veritabanı hatası durumunda erişim reddedilmeli (fail-closed).

#### 3.2.2 Token Revocation Kontrolü Eksik
**Dosya:** `middleware/authenticate.ts`  
**Sorun:** JWT doğrulanıyor ancak token iptal edilmiş mi kontrol edilmiyor. Bir kullanıcı logout olsa bile eski token geçerli kalabilir (token süresi dolana kadar).  
**Çözüm:** Token blacklist mekanizması (Redis veya veritabanı tabanlı).

#### 3.2.3 Kaynak Sahipliği Kontrolü Eksik
**Dosya:** `middleware/authorize.ts`  
**Sorun:** Yetkilendirme sadece rol bazlı yapılıyor. Bir tasarımcı, başka bir tasarımcının projesini güncelleyebilir.  
**Çözüm:** Kaynak sahipliği kontrolü eklenmeli (resource ownership check).

#### 3.2.4 Finansal Veri Doğrulaması
**Dosya:** `services/finance.service.ts`  
**Sorun:** Negatif fiyat/maliyet girilebilir, `cost_price ≤ project_price` kuralı zorlanmıyor.  
**Çözüm:** Zod şemalarında min(0) doğrulaması ve iş kuralı kontrolü.

### 3.3 🟡 Düşük Düzey Güvenlik Sorunları

| Sorun | Dosya | Açıklama |
|-------|-------|----------|
| Hardcoded token süreleri | auth.service.ts | Token süreleri ortam değişkeninden okunmalı |
| Audit log sessiz başarısızlık | utils/audit.ts | Audit kaydı oluşturulamadığında hata yutulıyor |
| In-memory rate limit | user-rate-limit.ts | Sunucu yeniden başlatmada sıfırlanır; cluster'da çalışmaz |
| String karşılaştırma | authorize.ts | Roller enum yerine string olarak karşılaştırılıyor |
| Nullable audit alanları | Prisma schema | `user_id` ve `resource_id` nullable — tam izlenebilirlik sağlanamaz |

### 3.4 ✅ İyi Olan Güvenlik Mekanizmaları

- Bcrypt ile şifre hashleme (12 salt round)
- JWT access + refresh token mimarisi
- httpOnly cookie ile refresh token saklama
- Hesap kilitleme mekanizması (5 başarısız deneme)
- Rol bazlı yetkilendirme (5 rol seviyesi)
- Alan seviyesi izin kontrolü (field-level permissions)
- Veritabanı bazlı izin geçersiz kılma (permission overrides)
- Zod ile girdi doğrulama
- Winston ile detaylı loglama
- Hata mesajlarında production'da stack trace gizleme

---

## 4. Performans ve Verimlilik

### 4.1 🔴 Kritik Performans Sorunları

#### 4.1.1 N+1 Sorgu Problemi — Analytics
**Dosya:** `services/analytics.service.ts`

| Fonksiyon | Sorun | Sorgu Sayısı |
|-----------|-------|:------------:|
| `getWeeklyCompletions()` | 8 hafta için döngüde 8 ayrı sorgu | 8 |
| `getMonthlyTrend()` | 6 ay için döngüde 12 ayrı sorgu (ayda 2) | 12 |
| `getDesignerPerformance()` | Tasarımcı başına 4 paralel sorgu | N×4 |

**Çözüm:** Tek bir GROUP BY sorgusu ile tüm veriler çekilebilir. Prisma `groupBy()` kullanılmalı.

#### 4.1.2 Sayfalama Eksikliği — Finance
**Dosya:** `services/finance.service.ts`  
**Sorun:** `getSummary()` fonksiyonu TÜM projeleri yüklüyor. Büyük veri setlerinde bellek taşması riski.  
**Çözüm:** Pagination eklenmeli veya aggregation query kullanılmalı.

### 4.2 ⚠️ Orta Düzey Performans Sorunları

| Sorun | Dosya | Açıklama | Çözüm |
|-------|-------|----------|-------|
| Önbellek eksikliği | analytics.service.ts | Her istekte ağır sorgular tekrar çalışıyor | Redis cache (TTL: 5-15dk) |
| İndeks eksikliği | schema.prisma | FK'lar ve sık sorgulanan alanlar indekslenmemiş | @@index eklenmeli |
| created_at/updated_at indeksi yok | schema.prisma | Tarih bazlı sorgular yavaş olabilir | İndeks eklenmeli |
| In-memory rate limit | user-rate-limit.ts | Cluster ortamında çalışmaz, bellek sızıntısı riski | Redis-based rate limit |
| Büyük dosya yükleme | upload.service.ts | Stream kullanılmıyor, bellek dolabilir | Multer stream + boyut limiti |

### 4.3 Veritabanı İndeks Önerileri

```prisma
// Project modeli
@@index([assigned_designer_id])
@@index([created_by_id])
@@index([status])
@@index([created_at])
@@index([deadline])

// ProjectRevision modeli
@@index([project_id])
@@index([created_at])

// DailyLog modeli
@@index([user_id, created_at])
@@index([project_id])

// Leave modeli
@@index([user_id])
@@index([start_date, end_date])

// Notification modeli
@@index([user_id, is_read])
@@index([created_at])

// AuditLog modeli
@@index([user_id])
@@index([resource_type, resource_id])
@@index([created_at])

// ProductionOrder modeli
@@index([project_id])
@@index([order_status])
```

---

## 5. Veritabanı Tasarımı

### 5.1 Şema Güçlü Yönleri ✅
- 18 model ile kapsamlı veri yapısı
- İlişkiler (1:1, 1:N) doğru tanımlanmış
- Enum kullanımı (ProjectStatus, UserRole, LeaveType, vb.)
- Zaman damgası (createdAt, updatedAt) tüm modellerde mevcut
- JSON alanları esnek veri saklama için (audit old_value/new_value)

### 5.2 Şema Sorunları ve Öneriler

#### 5.2.1 Eksik İndeksler
Yukarıdaki performans bölümünde detaylı listelendi. Tüm foreign key alanlarına ve sık filtrelenen alanlara `@@index` eklenmeli.

#### 5.2.2 Tip Güvenliği Eksiklikleri
| Model | Alan | Sorun | Çözüm |
|-------|------|-------|-------|
| ProjectStatusHistory | from_status, to_status | `String?` tanımlı, `ProjectStatus` enum kullanılmalı | Enum referansı |
| AuditLog | user_id, resource_id | Nullable — izlenebilirlik zayıflıyor | Sistem kullanıcısı ile doldurulmalı |
| ProductionOrder | order_status | String ise enum yapılmalı | Enum tanımla |

#### 5.2.3 Cascade Delete Eksikliği
- `ProjectStatusHistory` — Proje silindiğinde orphan kayıtlar kalır
- `ProjectComment` — Benzer durum
- `ProjectAttachment` — Dosya kayıtları yetim kalır
- **Çözüm:** `onDelete: Cascade` veya soft-delete stratejisi belirlenmeli

#### 5.2.4 Eksik Modeller (Önerilen)
| Model | Amaç |
|-------|------|
| `ProjectTemplate` | Tekrarlayan proje tipleri için şablon |
| `ProjectTag` | Proje etiketleme sistemi |
| `ProjectDependency` | Projeler arası bağımlılık |
| `Invoice` | Fatura yönetimi |
| `Supplier` | Tedarikçi bilgileri |
| `EmailQueue` | E-posta gönderim kuyruğu |
| `NotificationPreference` | Kullanıcı bildirim tercihleri |
| `ActivityFeed` | Merkezi aktivite akışı |
| `FileVersion` | Dosya versiyonlama |

---

## 6. İş Mantığı ve Akış Sorunları

### 6.1 Proje Durum Geçişleri
**Mevcut akış:** `new → designing → review → approved → in_production → done`

**Sorunlar:**
- [ ] Geri dönüş (rejected) durumu yok — review'dan designing'e nasıl dönülecek?
- [ ] "On hold" (beklemede) durumu yok — proje askıya alınabilmeli
- [ ] "Cancelled" (iptal) durumu yok — proje iptal edilebilmeli
- [ ] Durum geçiş kuralları servis katmanında, ancak merkezi bir state machine yok

**Önerilen Durum Makinesi:**
```
new → designing → review → approved → in_production → done
                    ↓                                    
                 revision (yeni durum)                   
                    ↓                                    
                 designing                               
                    
Herhangi bir durumdan → on_hold → önceki durum
Herhangi bir durumdan → cancelled (geri alınamaz)
```

### 6.2 Bildirim Tetikleme Sistemi Eksik
**Sorun:** `NotificationService.create()` hiçbir iş mantığı tarafından çağrılmıyor. Bildirimler fiilen oluşturulmuyor.

**Çözüm:** Event-driven mimari kurulmalı:
```typescript
// Olması gereken akış:
ProjectService.updateStatus() → EventEmitter.emit('project.statusChanged')
                               → NotificationService.handleProjectStatusChange()
                               → EmailService.sendStatusNotification()
```

**Tetiklenmesi Gereken Olaylar:**
| Olay | Bildirim Alıcısı |
|------|------------------|
| Proje atandı | Tasarımcı |
| Durum değişti | Proje sahibi, atanan kişi |
| Yeni yorum eklendi | Proje ilgilileri |
| Deadline yaklaşıyor | Atanan tasarımcı |
| İzin talebi oluşturuldu | Admin |
| İzin onaylandı/reddedildi | Talep eden |
| Üretim siparişi güncellendi | İlgili roller |
| Revizyon istendi | Tasarımcı |

### 6.3 İzin (Leave) Modülü Mantık Sorunları
- [ ] Aynı tarihlerde çakışan izin kontrolü yeterli mi? (half-day senaryoları)
- [ ] Yıllık izin bakiyesi negatife düşebilir mi?
- [ ] Takım kapasitesi kontrolü — tüm takım aynı anda izne çıkabilir mi?

### 6.4 Üretim Siparişi Durum Geçişleri
**Sorun:** Durum geçiş doğrulaması yok. "delivered" → "ordered" gibi mantıksız geçişler engellenmiyor.

**Çözüm:**
```
pending → ordered → shipped → delivered
pending → cancelled
```

### 6.5 Günlük Kayıt (Daily Log) Sorunları
- [ ] Checkout zamanı checkin zamanından önce olabilir — doğrulama eksik
- [ ] Mükerrer checkin kontrolü günün tamamını kapsamıyor (sadece `gte today` kullanılıyor)
- [ ] Çalışma saati otomatik hesaplama yok

---

## 7. Eksik Sistemler ve Öneriler

### 7.1 🔴 Acil Kurulması Gereken Sistemler

#### 7.1.1 Olay Yönetim Sistemi (Event Bus)
**Neden:** Modüller arası iletişim yok. Bildirimler tetiklenmiyor, e-postalar zamanında gönderilmiyor.  
**Çözüm:** Node.js EventEmitter veya Bull Queue tabanlı event sistemi.

```
Proje güncellendi → Event Bus → Bildirim oluştur
                              → Audit log yaz
                              → E-posta gönder
                              → Analytics güncelle
```

#### 7.1.2 Merkezi Hata İzleme
**Neden:** Hatalar sadece log dosyasına yazılıyor. Üretim ortamında hataları takip etmek zor.  
**Çözüm:** Sentry veya benzeri hata izleme entegrasyonu.

#### 7.1.3 API Rate Limiting (Global)
**Neden:** Mevcut rate limiting sadece authenticated kullanıcılar için çalışıyor.  
**Çözüm:** express-rate-limit ile IP bazlı global rate limiting.

#### 7.1.4 Sağlık Kontrolü Sistemi (Health Check)
**Neden:** Mevcut health endpoint temel kontrol yapıyor, ancak veritabanı bağlantısı, disk alanı, bellek kullanımı kontrol edilmiyor.  
**Çözüm:** Kapsamlı health check endpoint'i (DB, Redis, disk, memory).

### 7.2 ⚠️ Kısa Vadede Kurulması Gereken Sistemler

#### 7.2.1 Önbellekleme Katmanı (Cache Layer)
**Neden:** Analytics sorguları her istekte ağır sorgular çalıştırıyor.  
**Çözüm:** Redis veya node-cache ile sorgu sonuçlarını önbellekleme.

#### 7.2.2 E-posta Kuyruğu (Email Queue)
**Neden:** E-postalar senkron gönderiliyor. Başarısız gönderimler yeniden denenmiyor.  
**Çözüm:** Bull/BullMQ ile asenkron e-posta kuyruğu, retry mekanizması.

#### 7.2.3 Dosya Yönetim Sistemi
**Neden:** Dosya yükleme güvenlik kontrollerinden yoksun.  
**Çözüm:** Dosya tipi whitelist, boyut limiti, virüs tarama, CDN entegrasyonu.

#### 7.2.4 Raporlama Motoru
**Neden:** Analytics verilerini PDF/Excel olarak dışa aktarma özelliği yok.  
**Çözüm:** PDFKit/ExcelJS ile rapor oluşturma servisi.

#### 7.2.5 Arama Motoru
**Neden:** Projeler, kullanıcılar, yorumlar arasında tam metin araması yok.  
**Çözüm:** MySQL FULLTEXT index veya Elasticsearch entegrasyonu.

### 7.3 🟡 Orta Vadede Kurulması Gereken Sistemler

#### 7.3.1 WebSocket / SSE Altyapısı
**Amaç:** Gerçek zamanlı bildirimler, canlı dashboard güncellemeleri.  
**Teknoloji:** Socket.io veya Server-Sent Events.

#### 7.3.2 Yedekleme ve Kurtarma Sistemi
**Amaç:** Veritabanı ve dosya yedekleri, afet kurtarma planı.  
**Çözüm:** Otomatik MySQL dump (cron), dosya yedekleme, point-in-time recovery.

#### 7.3.3 API Versiyonlama
**Amaç:** Gelecekteki değişikliklerde geriye dönük uyumluluk.  
**Çözüm:** `/api/v1/`, `/api/v2/` yapısı.

#### 7.3.4 Çoklu Dil Desteği (i18n)
**Amaç:** E-posta şablonları ve hata mesajları için çoklu dil.  
**Çözüm:** i18next veya benzeri kütüphane.

#### 7.3.5 Entegrasyon Test Altyapısı
**Amaç:** Hiç test yok. Kod değişikliklerinin güvenliği sağlanamıyor.  
**Çözüm:** Jest + Supertest ile API testleri, Prisma test veritabanı.

### 7.4 🟢 Uzun Vadede Kurulması Gereken Sistemler

| Sistem | Açıklama |
|--------|----------|
| Monday.com Senkronizasyonu | MondaySyncLog modeli var ama entegrasyon henüz yok |
| Yapay Zeka Entegrasyonu | Proje süresi tahmini, otomatik atama önerisi |
| Mobil Uygulama API'si | React Native veya Flutter için optimize edilmiş API |
| Webhook Sistemi | Dış sistemlerin olayları dinlemesi için |
| Dashboard Builder | Özelleştirilebilir dashboard panelleri |
| Takvim Entegrasyonu | Google Calendar / Outlook senkronizasyonu |

---

## 8. Frontend Durumu

### 🔴 Frontend Tamamen Eksik

`frontend/` dizini boş. Plan belgesinde aşağıdaki yapı öngörülmüş ancak hiç uygulanmamış:

**Planlanan Teknolojiler:**
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- TanStack Query (veri çekme)
- Zustand (state yönetimi)

**Oluşturulması Gereken Sayfalar:**
| Sayfa | Açıklama |
|-------|----------|
| `/login` | Giriş sayfası |
| `/dashboard` | Rol bazlı ana panel |
| `/projects` | Proje listesi ve detay |
| `/projects/[id]` | Proje detay sayfası |
| `/team` | Takım yönetimi |
| `/analytics` | Analitik dashboard |
| `/production` | Üretim takibi |
| `/finance` | Finansal raporlar |
| `/settings` | Sistem ayarları |
| `/profile` | Kullanıcı profili |
| `/leaves` | İzin yönetimi |

**Oluşturulması Gereken Bileşenler:**
- Proje kartları ve Kanban board
- Gerçek zamanlı bildirim paneli
- Dosya yükleme/önizleme bileşeni
- Takvim görünümü (izinler, deadline'lar)
- Grafik/chart bileşenleri (Recharts/Chart.js)
- Form bileşenleri (react-hook-form + Zod)
- Tablo bileşeni (filtreleme, sıralama, pagination)
- Rol bazlı erişim kontrol bileşeni

---

## 9. Öncelik Sıralaması

### 🔴 P0 — Acil (Güvenlik & Kritik Hatalar)

| # | Görev | Etki |
|:-:|-------|------|
| 1 | E-posta HTML injection düzeltmesi | Güvenlik açığı |
| 2 | Dosya yükleme tip/boyut kontrolü | Güvenlik açığı |
| 3 | Global IP bazlı rate limiting | Güvenlik açığı |
| 4 | Authorization fail-closed davranışı | Güvenlik açığı |
| 5 | Bildirim tetikleme sistemi kurulması | İş mantığı bozuk |
| 6 | Analytics N+1 sorgu düzeltmesi | Performans |

### ⚠️ P1 — Yüksek Öncelik (Eksik Temel Özellikler)

| # | Görev | Etki |
|:-:|-------|------|
| 7 | Kullanıcı silme (soft delete) | Temel CRUD eksik |
| 8 | Yorum düzenleme | Temel CRUD eksik |
| 9 | Üretim sipariş durum doğrulaması | İş mantığı |
| 10 | Finance pagination ve doğrulama | Performans + veri bütünlüğü |
| 11 | Daily log doğrulamaları | Veri bütünlüğü |
| 12 | Veritabanı indeksleri ekleme | Performans |
| 13 | Token revocation mekanizması | Güvenlik |

### 🟡 P2 — Orta Öncelik (İyileştirmeler)

| # | Görev | Etki |
|:-:|-------|------|
| 14 | Event bus sistemi | Mimari iyileştirme |
| 15 | Redis cache katmanı | Performans |
| 16 | E-posta kuyruğu (queue) | Güvenilirlik |
| 17 | Raporlama motoru (PDF/Excel) | İş ihtiyacı |
| 18 | Arama motoru | Kullanılabilirlik |
| 19 | Proje şablonları | Verimlilik |
| 20 | 2FA (iki faktörlü doğrulama) | Güvenlik |

### 🟢 P3 — Düşük Öncelik (Gelişmiş Özellikler)

| # | Görev | Etki |
|:-:|-------|------|
| 21 | WebSocket/SSE altyapısı | UX iyileştirme |
| 22 | Test altyapısı (Jest + Supertest) | Kod kalitesi |
| 23 | API versiyonlama | Sürdürülebilirlik |
| 24 | Monday.com entegrasyonu | Dış entegrasyon |
| 25 | Mobil API optimizasyonu | Platform genişleme |
| 26 | AI-tabanlı özellikler | İleri düzey |

---

## Sonuç

Bu sistem, proje takibi ve tasarım ekibi yönetimi için sağlam bir temel üzerine kurulmuş. Auth, projeler, izin yönetimi ve ayarlar modülleri kapsamlı bir şekilde geliştirilmiş. Ancak:

1. **13 modülün 8'i yetersiz fonksiyona sahip** — özellikle Analytics, Finance, Production, Comments, Notifications, Daily Log, Upload ve Audit modülleri eksik.

2. **Güvenlik açıkları mevcut** — HTML injection, dosya yükleme güvenliği ve rate limiting en kritik olanlar.

3. **Performans sorunları var** — Analytics modülündeki N+1 sorguları ve eksik veritabanı indeksleri sistemin ölçeklenmesini engelliyor.

4. **İş mantığı boşlukları** — Bildirimler fiilen çalışmıyor, durum geçiş doğrulamaları eksik, veri doğrulama yetersiz.

5. **Frontend tamamen eksik** — Tüm backend API'leri hazır ancak kullanıcı arayüzü yok.

6. **Test altyapısı yok** — Hiçbir test dosyası bulunmuyor, kod güvenliği sağlanamıyor.

Bu rapordaki P0 ve P1 öğelerinin öncelikli olarak ele alınması, sistemin güvenli, verimli ve işlevsel hale gelmesi için kritik önem taşımaktadır.
