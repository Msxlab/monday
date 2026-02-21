# Token Hash Migration Strategy

Bu doküman, refresh token ve password reset token alanlarının **raw token** yerine **SHA-256 hash** saklayacak şekilde güvenli geçişini tanımlar.

## Hedef
- `refresh_tokens.token` → `refresh_tokens.token_hash`
- `users.password_reset_token` → `users.password_reset_token_hash`
- Uygulama akışlarında token doğrulama hash karşılaştırması ile yapılır.

## Aşamalı Geçiş Planı

### 1) Kod yayını (hash-first)
- Uygulama artık yeni ürettiği token’ları hashleyerek DB’ye yazar.
- Refresh ve reset akışları gelen raw token’ı SHA-256 ile hashleyip DB’deki hash ile karşılaştırır.
- Karşılaştırmada `timingSafeEqual` kullanılır (sabit zamanlı kıyas).

### 2) Veri migrasyonu
Migration SQL sırası:
1. Yeni hash kolonlarını ekle (`token_hash`, `password_reset_token_hash`).
2. Eski raw değerleri SQL tarafında `SHA2(..., 256)` ile hashleyip yeni kolonlara taşı.
3. Unique index’i `token_hash` üzerine al.
4. Raw token kolonlarını drop et.

Bu strateji ile aktif refresh session’ları migration sonrası da çalışmaya devam eder (token aynı, DB tarafında hash’e çevrilmiş olur).

### 3) Kontrollü aktif session invalidasyonu
İş gereksinimine göre iki seçenek:

- **Yumuşak geçiş (önerilen varsayılan):**
  - Backfill sonrası mevcut session’lar geçerli kalır.
  - Yalnızca doğal expiration veya logout/rotation ile temizlenir.

- **Sıkı geçiş (yüksek güvenlik):**
  - Deployment sonrası bakım penceresinde `refresh_tokens` tablosunu temizleyerek tüm cihazlardan yeniden login zorlanır.
  - Örnek kontrollü invalidasyon:
    - önce kritik kullanıcı gruplarında duyuru,
    - sonra: `DELETE FROM refresh_tokens WHERE created_at < '<cutoff>';`
  - İsterseniz yalnızca riskli segment (örn. eski cihazlar/IP) seçilerek kademeli invalidasyon uygulanır.

## Operasyonel Kontroller
- Migration öncesi DB snapshot alın.
- Migration sonrası doğrulamalar:
  - `refresh_tokens` tablosunda raw token kolonu kalmamalı.
  - `users` tablosunda raw reset token kolonu kalmamalı.
  - Login/refresh/forgot-password/reset-password endpoint’leri smoke test edilmeli.
- İzleme:
  - 401 artışı (refresh replay/invalid token) alarmı.
  - Password reset başarısızlık oranı.

## Rollback Notu
- Schema rollback için eski kolonları geri eklemek mümkündür; ancak güvenlik nedeniyle hash’ten raw token geri üretilemez.
- Bu yüzden rollback’te token tabanlı oturumlar yeniden oluşturulmalıdır (zorunlu relogin).
