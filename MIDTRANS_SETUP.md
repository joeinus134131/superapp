# 💳 MIDTRANS PAYMENT SETUP GUIDE

Panduan lengkap untuk setup Midtrans payment gateway di SuperApp.

## 🚀 Quick Start

### 1. Daftar Midtrans Account
- Kunjungi: https://midtrans.com
- Klik "Sign Up" dan pilih "Sandbox Account" untuk testing
- Verifikasi email Anda

### 2. Dapatkan API Keys
1. Login ke Midtrans Dashboard: https://dashboard.midtrans.com
2. Navigasi ke **Settings** → **Config Keys**
3. Pilih **Sandbox Environment** (untuk development)
4. Copy dua keys berikut:
   - **Server Key**: Digunakan di backend (RAHASIA, jangan share)
   - **Client Key**: Digunakan di frontend (aman untuk di-expose)

### 3. Update Environment Variables

Edit file `.env.local`:

```bash
# Development (Sandbox)
MIDTRANS_SERVER_KEY=SB-Mid-server-PASTE_YOUR_SANDBOX_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-PASTE_YOUR_SANDBOX_CLIENT_KEY
NEXT_PUBLIC_MIDTRANS_PRODUCTION=false
```

### 4. Restart Development Server

```bash
npm run dev
```

---

## 🧪 Testing Payments (Sandbox)

Gunakan kartu kredit test berikut untuk transaksi:

### ✅ Success Payment
- **Card Number**: 4811 1111 1111 1114
- **Expiry**: 12/25 atau lebih
- **CVV**: 123
- **Result**: Transaksi sukses langsung

### ⏳ Pending Payment
- **Card Number**: 4111 1111 1111 1111
- **Expiry**: 12/25 atau lebih
- **CVV**: 123
- **Result**: Transaksi pending (simulasi waiting payment)

### ❌ Failed Payment
- **Card Number**: 5555 5555 5555 4444
- **Expiry**: 12/25 atau lebih
- **CVV**: 123
- **Result**: Transaksi gagal

---

## 🔐 Production Deployment

Saat aplikasi siap untuk production:

### 1. Dapatkan Production Keys
1. Login ke Midtrans Dashboard
2. Navigasi ke **Settings** → **Config Keys**
3. Pilih **Production Environment**
4. Copy Production Server Key dan Client Key

### 2. Update Environment Variables

Edit file `.env.local` atau `.env.production`:

```bash
# Production
MIDTRANS_SERVER_KEY=Mid-server-PASTE_YOUR_PRODUCTION_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-PASTE_YOUR_PRODUCTION_KEY
NEXT_PUBLIC_MIDTRANS_PRODUCTION=true
```

### 3. Deploy
```bash
npm run build
npm run start
```

---

## 📊 Monitoring Transactions

1. Login ke Midtrans Dashboard
2. Navigasi ke **Transactions**
3. Lihat semua transaksi, status, dan detail pembayaran

---

## 🛠️ Architecture

### Frontend
- User memilih package di `/premium`
- Client mengirim request ke `/api/checkout`
- Server mengembalikan payment token
- Snap Widget (Midtrans) menampilkan payment form

### Backend
- Endpoint: `/api/checkout` (POST)
- Memverifikasi package valid (security)
- Membuat transaction di Midtrans
- Mengembalikan token untuk Snap Widget

### Client Integration (lib/premium.js)
- Use hook `usePremium()` untuk access token system
- `buyPackage(packageId)` untuk trigger checkout

---

## ⚙️ Configuration Modes

### Sandbox Mode (Development)
- Untuk testing dan development
- Tidak ada uang asli yang dipindahkan
- Gunakan test card numbers

### Production Mode (Live)
- Real payment processing
- Pelanggan dapat melakukan transaksi sebenarnya
- Gunakan production keys

---

## 🔗 Useful Links

- **Midtrans Dashboard**: https://dashboard.midtrans.com
- **API Documentation**: https://api-docs.midtrans.com
- **Snap Documentation**: https://snap.midtrans.com/
- **Test Card List**: https://docs.midtrans.com/en/technical-reference/sandbox-test-credentials

---

## 🆘 Troubleshooting

### Error: "Invalid Sandbox Server Key"
- Pastikan MIDTRANS_SERVER_KEY sudah dikopi dengan benar
- Gunakan Sandbox key (dimulai dengan `SB-Mid-server-`)
- Restart dev server setelah update .env.local

### Error: "Client Key not found"
- Pastikan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY sudah di .env.local
- Prefix NEXT_PUBLIC_ memungkinkan akses dari frontend
- Restart dev server

### Payment Form Not Showing
- Buka browser console (F12) untuk error messages
- Pastikan JavaScript enabled
- Cek apakah Midtrans script dimuat (jalangi payment flow)

### Transaction Status Not Updating
- Ada delay 5-10 detik untuk update status
- Refresh halaman jika status tidak berubah
- Check dashboard Midtrans untuk transaction status

---

## 💡 Best Practices

1. ✅ **Jangan commit .env.local ke repository**
   - Tambahkan ke `.gitignore`
   - Share API keys hanya via secure channel

2. ✅ **Validasi di Backend**
   - Always verify package di server
   - Don't trust client-side package data

3. ✅ **Monitor Transactions**
   - Regularly check Midtrans dashboard
   - Setup webhooks untuk automatic updates (advanced)

4. ✅ **Update Production Keys Regularly**
   - Rotate keys untuk security
   - Keep audit logs

---

**Version**: 1.0  
**Last Updated**: 2026-02-27  
**Maintained By**: SuperApp Team
