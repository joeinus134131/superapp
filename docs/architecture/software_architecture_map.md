# 🗺️ SuperApp Architecture Map

Dokumen ini memetakan arsitektur perangkat lunak dari aplikasi **SuperApp** (Monorepo) yang mencakup aplikasi **Web**, **Mobile**, **Shared Package**, dan **Go Backend**.

---

## 🏗️ Diagram Arsitektur

Berikut adalah diagram visual interaksi antarkomponen di dalam sistem SuperApp:

```mermaid
graph TD
    subgraph Clients["Frontend Clients"]
        Web["🌐 Web Client (@superapp/web - Next.js)"]
        Mobile["📱 Mobile Client (@superapp/mobile - React Native)"]
    end

    subgraph Shared["Core Shared Package"]
        SharedLib["🔄 Shared Core (@superapp/shared)\n- Auth & Gamification Logic\n- Storage Adapter\n- Cloud Sync Service"]
    end

    subgraph Backend["Backend Services"]
        GoBackend["⚡ Go Backend API (@superapp/backend - Fiber)"]
        Supabase["🔐 Supabase Backend\n- Auth Provider\n- User Database"]
        Postgres["🗄️ Postgres DB (GORM)\n- UserContext\n- Leaderboard\n- Squads"]
        AIServices["🤖 AI Analyser\n- Groq API (Finance)\n- Claude API (Health)"]
    end

    %% Client relations
    Web --> SharedLib
    Mobile --> SharedLib

    %% Interactions
    SharedLib -->|Auth & User Queries| Supabase
    SharedLib -->|Sync Data (HTTP API)| GoBackend

    %% Go Backend Architecture
    GoBackend -->|HTTP Handlers| Postgres
    GoBackend -->|Push to Channel| Observer["📡 Agentic Observer (Goroutine Worker)"]
    
    Observer -->|Finance Data| AIServices
    Observer -->|Health Data| AIServices
    Observer -->|Gamification XP| Leaderboard["🏆 Leaderboard Updater"]
    Leaderboard -->|Save Entry| Postgres
```

---

## 📦 Pembagian Komponen & Tanggung Jawab

Sistem ini diorganisasikan dalam satu monorepo dengan struktur workspace pnpm yang memisahkan tanggung jawab (separation of concerns):

### 1. Frontend Clients
*   **Web Client ([@superapp/web](file:///Users/user/superapp/web))**: 
    *   Dibangun dengan **Next.js** dan **React**.
    *   Menangani dashboard produktivitas berbasis web (Manajemen Tugas, Kalender, Jurnal, Keuangan, dll.).
    *   Responsif dan dioptimalkan untuk performa desktop/mobile browser.
*   **Mobile Client ([@superapp/mobile](file:///Users/user/superapp/mobile))**:
    *   Dibangun dengan **React Native** dan **Expo (Expo Router)**.
    *   Menangani aplikasi mobile asli (Android & iOS).
    *   Menggunakan fitur perangkat asli seperti Audio Player (`expo-av`) untuk ambient soundscapes dan push notifications.

### 2. Core Shared Package ([@superapp/shared](file:///Users/user/superapp/shared))
Paket ini berisi kode bersama yang digunakan oleh Web dan Mobile guna menghindari duplikasi kode (**mencapai ~66% reuse**):
*   **Authentication ([auth.js](file:///Users/user/superapp/shared/lib/auth.js))**: Logika login, register, dan logout.
*   **Gamification ([gamification.js](file:///Users/user/superapp/shared/lib/gamification.js))**: Algoritma kalkulasi XP, level, dan streaks.
*   **Cloud Sync ([cloudSync.js](file:///Users/user/superapp/shared/lib/cloudSync.js))**: Sinkronisasi data lokal ke cloud secara otomatis/berkala.
*   **Storage Adapter ([storage.js](file:///Users/user/superapp/shared/lib/storage.js))**: Abstraksi penyimpanan data (`localStorage` di web, `AsyncStorage` di mobile).
*   **Supabase Client ([supabaseClient.js](file:///Users/user/superapp/shared/lib/supabaseClient.js))**: Konfigurasi client Supabase untuk otentikasi dan interaksi DB langsung jika diperlukan.

### 3. Backend Services
*   **Go Backend ([@superapp/backend](file:///Users/user/superapp/backend))**:
    *   Dibangun menggunakan **Golang** dan framework **Fiber**.
    *   Berperan sebagai REST API berkecepatan tinggi yang menerima sinkronisasi data dari client.
    *   Menggunakan middleware JWT untuk memverifikasi token pengguna.
*   **Agentic Observer & AI Engine ([agentic_observer.go](file:///Users/user/superapp/backend/internal/usecase/agentic_observer.go))**:
    *   Berjalan sebagai *background worker* (Goroutine) yang mendengarkan event dari channel context.
    *   **Keuangan (FINANCE)**: Menggunakan **Groq API** untuk analisis angka cepat.
    *   **Kesehatan (HEALTH)**: Menggunakan **Claude API** untuk memberikan analisis dan saran emosional yang bijak.
    *   **Gamification**: Mengkalkulasi level terbaru pengguna berdasarkan XP dan memperbarui tabel Leaderboard secara real-time.
*   **Database PostgreSQL**:
    *   Menyimpan data persisten dari Go Backend (tabel `users`, `user_contexts`, `leaderboard_entries`, `squads`).
    *   Dihubungkan menggunakan GORM untuk kemudahan migrasi database otomatis (*AutoMigrate*).

---

## 🔄 Alur Kerja Utama (Data Flow)

### A. Sinkronisasi Data (Cloud Sync)
1. User melakukan perubahan data (misal: menyelesaikan tugas atau menambah pengeluaran uang) di Web/Mobile.
2. `@superapp/shared` menyimpan data ke penyimpanan lokal secara real-time.
3. [cloudSync.js](file:///Users/user/superapp/shared/lib/cloudSync.js) secara otomatis dipicu untuk mengirimkan payload ke Go Backend melalui route `/api/v1/context/sync`.
4. Go Backend menerima request, memverifikasi user menggunakan `JWTMiddleware`, menyimpan salinan mentah ke PostgreSQL, dan memasukkan data tersebut ke channel pemrosesan latar belakang (`ContextChan`).

### B. Analisis AI & Leaderboard
1. **Agentic Observer** di Go Backend mendeteksi adanya data baru di channel `ContextChan`.
2. Jika modul bertipe **FINANCE** atau **HEALTH**, data dikirim ke model AI (Groq/Claude) secara asinkron untuk menghasilkan insight pintar bagi user.
3. Jika modul bertipe **GAMIFICATION**, sistem menghitung level terbaru user dari total XP terkirim, lalu memperbarui tabel `leaderboard_entries` sehingga user lain bisa melihat posisi skor terkini di menu sosial.
