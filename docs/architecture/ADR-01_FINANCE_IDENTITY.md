# ADR-01: Identitas Canonical Finance & Batas Kepercayaan

Tanggal: 16 Okt 2026. Status: **Accepted untuk MVP0**. Lokasi: `superapp/docs/architecture/`.
Rujukan: `SUPERAPP_FINLAB_N8N_INTEGRATION_PLAN_ID.md` §5, §9, §14, §22.11.

## 1. Konteks (hasil baca source lokal, branch `codex/web-postgres-migration`, HEAD `ad3d3d1f`)

- Verifikasi token: `backend/internal/middleware/auth.go` (`JWTMiddleware`) mendukung JWKS asimetris (Supabase ES256/RS256) + fallback HMAC. Klaim yang dipakai: `sub` → `c.Locals("user_id")`, `email` opsional. Tanpa `secret` dan `jwksURL`, semua request ditolak (fail closed). Resolver JWKS ada di `backend/internal/middleware/jwks.go` (cache 15 mnt, timeout 5 dtk).
- Provisioning: `backend/internal/middleware/provision.go` (`ProvisionUser`) mewajibkan `user_id` berupa UUID valid, lalu `EnsureUser`. `backend/internal/repository/user_repository.go` (`EnsureExists`) insert-if-absent; bila email kosong diisi placeholder `<uuid>@supabase.local`. `backend/internal/domain/user.go`: `users.id` UUID PK.
- Migrasi web: `docs/architecture/WEB_POSTGRES_MIGRATION.md` sudah mengunci bahwa identitas lokal browser (`user_<random>`) **bukan** identitas server. `POST /users/sync` dan storage API mengambil user ID hanya dari `sub` terverifikasi. Linking cloud via Settings → Akun Cloud (`shared/lib/cloudAuth.js`), web+mobile+API wajib menunjuk project Supabase yang sama.
- Routing: `backend/cmd/api/main.go`: grup `/api/v1` dilindungi `JWTMiddleware + ProvisionUser`. Finance ingestion (`finance.RegisterIntegration`) memakai opaque connection token terpisah; finance core/vault/research (`RegisterCore/Vault/Research`) di dalam grup protected. CORS mengizinkan `Idempotency-Key, X-Request-ID, X-Document-SHA256`.
- Delegasi ke FinLab: `backend/internal/finance/delegation.go` (`DelegateResearch`) cek `entity_memberships` live (`revoked_at IS NULL`, count==1) lalu terbitkan JWT HS256 berumur 3 menit (`iss=superapp, aud=finlab, sub=userID, entity_id, scope=research:submit|read, jti` random). Komentar kode: backend-only, jangan kembalikan ke browser/log.
- Ingestion dedup: `backend/internal/finance/store.go` (`PostgresStore.Connection/Accept`) — koneksi dicari via `token_sha256 + state='active'`; `Accept` mengunci baris koneksi (`FOR UPDATE`), cek `idempotency_key OR event_id OR provider_message_id`, tolak bila `body_sha256` beda (`ErrConflict`), insert `integration_events + durable_jobs` satu transaksi.
- Kontrak event: `backend/internal/finance/contracts.go` (`ImportEvent.Validate`) — `schema_version=="1"`, `event_id/connection_id` UUID canonical, `provider/provider_message_id/received_at/document.kind` wajib, hanya teks non-kosong (vault `storage_ref` ditolak sampai upload registry ada), `content_sha256` harus cocok dengan SHA256 teks.
- Parser saat ini: `backend/internal/finance/parser.go + bank_templates.go` — hanya `SyntheticParser` (`SYNTHETIC ONLY: ... IDR <amount>`). `BankTemplates` menolak registrasi tanpa manifest (`parser_id/version`, `sample_sha256`, `sample_class`, matcher eksplisit); katalog `BRI/BNI` berstatus `parser_ready:false, awaiting_anonymized_sample`. OTP/PIN (`OTP/PASSWORD/PIN RESET`) dikosongkan field-nya (`sensitive_content_manual_handling`).

## 2. Temuan lubang (wajib ditutup sebelum P1)

1. `web/lib/cloudSync.js` (`pushToCloud/pullFromCloud`): `user_id` dan `sync_id` diambil dari `localStorage` (`superapp_current_user`, `uniqueCode`). Snapshot dienkripsi client-side ke tabel `user_sync_data`. Ini **bukan** identitas server — jangan pernah dipakai sebagai otorisasi finance. Tetap boleh untuk backup non-finance, terisolasi.
2. `mobile/lib/syncService.ts` (`getBackendInsights`): masih mengirim `?userId=${userId}` dari storage lokal. Wajib migrasi ke token-derived (ambil `sub` di server, abaikan query param). `runSync` sudah benar (Bearer token, body hanya `items`).
3. Fallback HMAC (`JWT_SECRET`): selama masih diset, ada dua jalur verifikasi. Untuk prod finance, kosongkan `JWT_SECRET` dan hanya andalkan `SUPABASE_JWKS_URL/ISSUER/AUDIENCE`. HMAC hanya untuk dev lokal bila perlu.
4. Placeholder email (`<uuid>@supabase.local`): menandakan token tanpa klaim email. Jangan dipakai untuk matching rekening/koneksi; hanya untuk memenuhi constraint `users.email NOT NULL`.
5. `entity_memberships` adalah satu-satunya sumber otorisasi finance. Setiap query finance (rekening, dokumen, kandidat, jurnal, report, job) wajib filter `entity_id` + join membership aktif. Tidak ada pengecualian untuk admin/debug di MVP0.

## 3. Keputusan

1. **Canonical user = `sub` JWT Supabase (UUID) yang lolos JWKS, diprovisikan ke `users.id`.** Tidak ada `user_id`/`entity_id` dari body/query/header yang dipercaya. `email` hanya atribut display.
2. **Canonical entity access = `entity_memberships(entity_id, user_id, revoked_at IS NULL)`.** Owner/entitas untuk ingestion diambil dari `integration_connections` (via `token_sha256`) yang sudah terikat owner+entity saat registrasi koneksi; untuk UI diambil dari `sub` + membership. Payload `entity_id` dari klien hanya hint, diverifikasi ulang di server.
3. **Dua kredensial, dua jalur:**
   - User JWT (JWKS) → `/api/v1/finance/*` (UI/mobile).
   - Opaque connection token (SHA256 di DB, `state='active'`) → `POST /finance/import-events` (n8n). Token disimpan sebagai hash, dapat direvoke per-connection tanpa memengaruhi sesi user.
   - Delegasi Go→FinLab: JWT HS256 3-menit terpisah (`aud=finlab`), tidak pernah ke browser. Validasi `iss/aud/sub/entity_id/scope/exp/jti` di sisi FinLab.
4. **Legacy snapshot (`user_sync_data`, LocalForage, mobile AsyncStorage) bukan sumber saldo finance.** Finance canonical hanya Postgres Go (`journal_entries/lines` + `reconciliation_sessions`). Snapshot lama hanya untuk migrasi satu arah dengan checksum/read-back, lalu dinonaktifkan sebagai sumber saldo setelah cutover per-cohort.
5. **Prod finance = JWKS-only.** `JWT_SECRET` kosong di staging/prod. Kegagalan fetch JWKS = 401, bukan fallback diam-diam.

## 4. Konsekuensi

- Semua handler finance baru wajib menerima `userID` dari `c.Locals("user_id")` dan `entityID` dari membership/connection lookup, bukan dari JSON body. Pelanggaran = bug keamanan P0.
- Response cross-entity: kembalikan `404` (bukan `403` dengan pesan beda) agar tidak bisa enumerasi ID milik orang lain. Internal log boleh `403`, ke klien seragamkan `404`.
- `integration_connections.token` tidak pernah dibaca ulang plain-text setelah dibuat; yang disimpan hanya `token_sha256`. Rotasi = buat token baru + revoke lama.
- Uji wajib (gate MVP0): spoof `user_id/entity_id` di body ditolak; token expired/revoked ditolak; dua entity tidak bisa saling baca dokumen/kandidat/report; replay event sama idempotent; `body_sha256` beda → konflik.

## 5. Checklist implementasi P0 (0.5–1 hari)

- [ ] Kosongkan `JWT_SECRET` di env staging/prod contoh; pastikan boot tetap jalan dengan JWKS saja.
- [ ] Tambah test: `ProvisionUser` menolak `sub` non-UUID; `EnsureExists` dengan email kosong tidak merusak uniqueness.
- [ ] Refactor `getBackendInsights` hilangkan `?userId=`; server ambil dari token.
- [ ] Tambah middleware/hook finance: setiap query menyertakan `entity_id + membership` check; tambah test cross-entity 403/404.
- [ ] Dokumentasikan `SUPABASE_JWKS_URL/ISSUER/AUDIENCE` yang dipakai web+mobile+API (satu project) di `.env.example` masing-masing (sudah ada di backend, samakan di web/mobile).
- [ ] Catat keputusan ini di §22.11 butir ADR-01 sebagai DONE; lanjut ke ADR-02 (enkripsi/consent) sebelum `CORE-01`.

Tidak ada akses mailbox, pemindahan dana, atau perubahan workflow yang dilakukan saat menyusun ADR ini. Perubahan kode yang dirujuk di atas sudah ada di checkout lokal, bukan dibuat oleh dokumen ini.
