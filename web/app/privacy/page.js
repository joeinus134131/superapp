'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="login-page" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px' }}>
      <div className="card card-padding" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: 'var(--bg-card)' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', marginBottom: '16px' }}>
            <Shield size={32} />
          </div>
          <h1>Privacy Policy</h1>
          <p className="text-secondary">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="prose" style={{ lineHeight: '1.7' }}>
          <h3>1. Pengumpulan Data</h3>
          <p>
            SuperApp mengutamakan privasi Anda. Semua data yang Anda masukkan ke dalam aplikasi — termasuk tugas, kebiasaan, catatan jurnal, dan data keuangan — disimpan <strong>secara lokal di perangkat Anda (browser localStorage)</strong>.
          </p>

          <h3>2. Cloud Sync (Fitur Opsional)</h3>
          <p>
            Jika Anda menggunakan fitur <strong>Cloud Sync</strong> untuk mencadangkan atau menyinkronkan data antar perangkat:
          </p>
          <ul>
            <li>Data Anda akan diunggah ke server berbasis cloud yang aman secara terenkripsi.</li>
            <li>Akses ke data tersebut membutuhkan "Sync ID" yang unik untuk akun Anda.</li>
            <li>Kami tidak membagikan, menjual, atau menggunakan data sinkronisasi Anda untuk keperluan iklan.</li>
          </ul>

          <h3>3. Pembayaran & Token Premium</h3>
          <p>
            Transaksi pembelian Token Premium diproses oleh layanan pihak ketiga (Midtrans). Kami tidak menyimpan rincian kartu kredit atau data pembayaran sensitif Anda di server kami.
          </p>

          <h3>4. File & Gambar Lokal</h3>
          <p>
            Foto profil dan gambar avatar yang Anda unggah hanya diproses dan disimpan di memori perangkat lokal Anda.
          </p>

          <h3>5. Perubahan Kebijakan</h3>
          <p>
            Kebijakan privasi ini dapat diubah atau diperbarui sesuai dengan penambahan fitur. Kami menyarankan Anda untuk meninjaunya secara berkala.
          </p>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <p>&copy; {new Date().getFullYear()} SuperApp Personal Management. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
